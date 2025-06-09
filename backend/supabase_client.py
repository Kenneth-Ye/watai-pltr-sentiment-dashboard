import os
from supabase import create_client
from datetime import datetime, date, timedelta
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class SupabaseClient:
    def __init__(self):
        self.url = os.getenv('SUPABASE_URL')
        self.key = os.getenv('SUPABASE_SERVICE_KEY')  # Service key for backend operations
        
        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set")
        
        self.client = create_client(self.url, self.key)
        logger.info("Supabase client initialized successfully")
    
    def save_sentiment_data(self, results: List[Dict]) -> int:
        """Save sentiment analysis results to Supabase"""
        if not results:
            logger.warning("No results to save")
            return 0
        
        try:
            # Prepare data for insertion
            rows = []
            for result in results:
                # Check if headline already exists to avoid duplicates
                existing = self.client.table('sentiment_analysis')\
                    .select('id')\
                    .eq('headline', result['text'])\
                    .gte('scraped_at', (datetime.now() - timedelta(hours=24)).isoformat())\
                    .execute()
                
                if existing.data:
                    logger.debug(f"Skipping duplicate headline: {result['text'][:50]}...")
                    continue
                
                row = {
                    'headline': result['text'][:1000],  # Truncate if too long
                    'source': result.get('source', 'yahoo_finance'),
                    'source_url': result.get('source_url', ''),
                    'scraped_at': result['timestamp'],
                    'sentiment_compound': float(result['sentiment_scores']['compound']),
                    'sentiment_positive': float(result['sentiment_scores']['pos']),
                    'sentiment_negative': float(result['sentiment_scores']['neg']),
                    'sentiment_neutral': float(result['sentiment_scores']['neu']),
                    'classification': result['classification']
                }
                rows.append(row)
            
            if not rows:
                logger.info("All headlines were duplicates, nothing to save")
                return 0
            
            # Insert data in batches of 100
            batch_size = 100
            total_inserted = 0
            
            for i in range(0, len(rows), batch_size):
                batch = rows[i:i + batch_size]
                response = self.client.table('sentiment_analysis').insert(batch).execute()
                
                if response.data:
                    total_inserted += len(response.data)
                    logger.info(f"Inserted batch {i//batch_size + 1}: {len(response.data)} records")
                else:
                    logger.error(f"Failed to insert batch {i//batch_size + 1}")
            
            logger.info(f"Successfully saved {total_inserted} new records to Supabase")
            return total_inserted
            
        except Exception as e:
            logger.error(f"Error saving to Supabase: {e}")
            raise
    
    def get_recent_data(self, hours: int = 24) -> List[Dict]:
        """Get recent sentiment data from Supabase"""
        try:
            start_time = (datetime.now() - timedelta(hours=hours)).isoformat()
            
            response = self.client.table('sentiment_analysis')\
                .select('*')\
                .gte('scraped_at', start_time)\
                .order('scraped_at', desc=True)\
                .execute()
            
            return response.data if response.data else []
            
        except Exception as e:
            logger.error(f"Error getting recent data: {e}")
            return []
    
    def get_latest_summary(self, hours: int = 5) -> Dict:
        """Get summary of sentiment data from last N hours"""
        try:
            data = self.get_recent_data(hours)
            
            if not data:
                return {'error': 'No recent data found'}
            
            # Calculate summary statistics
            total = len(data)
            positive = sum(1 for r in data if r['classification'] == 'positive')
            negative = sum(1 for r in data if r['classification'] == 'negative')
            neutral = total - positive - negative
            
            avg_sentiment = sum(r['sentiment_compound'] for r in data) / total
            
            # Find most extreme headlines
            most_positive = max(data, key=lambda x: x['sentiment_compound'])
            most_negative = min(data, key=lambda x: x['sentiment_compound'])
            
            return {
                'timestamp': datetime.now().isoformat(),
                'period_hours': hours,
                'total_headlines': total,
                'sentiment_distribution': {
                    'positive': positive,
                    'negative': negative,
                    'neutral': neutral
                },
                'sentiment_percentages': {
                    'positive': round(positive/total*100, 1),
                    'negative': round(negative/total*100, 1),
                    'neutral': round(neutral/total*100, 1)
                },
                'average_sentiment': round(avg_sentiment, 4),
                'most_positive_headline': most_positive['headline'],
                'most_negative_headline': most_negative['headline'],
                'most_positive_score': round(most_positive['sentiment_compound'], 4),
                'most_negative_score': round(most_negative['sentiment_compound'], 4)
            }
            
        except Exception as e:
            logger.error(f"Error getting summary: {e}")
            return {'error': str(e)}
    
    def create_daily_summary(self, target_date: Optional[date] = None) -> Optional[Dict]:
        """Create and save daily summary"""
        if target_date is None:
            target_date = date.today()
        
        try:
            # Check if summary already exists for this date
            existing = self.client.table('daily_summaries')\
                .select('id')\
                .eq('date', target_date.isoformat())\
                .execute()
            
            if existing.data:
                logger.info(f"Daily summary for {target_date} already exists")
                return None
            
            # Get all data for the day
            start_time = datetime.combine(target_date, datetime.min.time())
            end_time = datetime.combine(target_date, datetime.max.time())
            
            response = self.client.table('sentiment_analysis')\
                .select('*')\
                .gte('scraped_at', start_time.isoformat())\
                .lte('scraped_at', end_time.isoformat())\
                .execute()
            
            data = response.data
            
            if not data:
                logger.info(f"No data found for {target_date}")
                return None
            
            # Calculate daily summary
            total = len(data)
            positive = sum(1 for r in data if r['classification'] == 'positive')
            negative = sum(1 for r in data if r['classification'] == 'negative')
            neutral = total - positive - negative
            
            avg_sentiment = sum(r['sentiment_compound'] for r in data) / total
            most_positive = max(data, key=lambda x: x['sentiment_compound'])
            most_negative = min(data, key=lambda x: x['sentiment_compound'])
            
            summary = {
                'date': target_date.isoformat(),
                'total_headlines': total,
                'positive_count': positive,
                'negative_count': negative,
                'neutral_count': neutral,
                'avg_sentiment': round(avg_sentiment, 4),
                'most_positive_headline': most_positive['headline'][:500],  # Truncate
                'most_negative_headline': most_negative['headline'][:500],
                'most_positive_score': round(most_positive['sentiment_compound'], 4),
                'most_negative_score': round(most_negative['sentiment_compound'], 4)
            }
            
            # Save summary
            response = self.client.table('daily_summaries').insert(summary).execute()
            
            if response.data:
                logger.info(f"Created daily summary for {target_date}")
                return summary
            else:
                logger.error(f"Failed to create daily summary for {target_date}")
                return None
            
        except Exception as e:
            logger.error(f"Error creating daily summary: {e}")
            return None
    
    def get_daily_summaries(self, days: int = 7) -> List[Dict]:
        """Get daily summaries for the last N days"""
        try:
            start_date = (date.today() - timedelta(days=days)).isoformat()
            
            response = self.client.table('daily_summaries')\
                .select('*')\
                .gte('date', start_date)\
                .order('date', desc=True)\
                .execute()
            
            return response.data if response.data else []
            
        except Exception as e:
            logger.error(f"Error getting daily summaries: {e}")
            return []
    
    def cleanup_old_data(self, days: int = 30):
        """Remove old data to keep database size reasonable"""
        try:
            cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            # Delete old sentiment analysis records
            response = self.client.table('sentiment_analysis')\
                .delete()\
                .lt('scraped_at', cutoff_date)\
                .execute()
            
            logger.info(f"Cleaned up old sentiment data older than {days} days")
            
            # Keep daily summaries for longer (90 days)
            summary_cutoff = (date.today() - timedelta(days=90)).isoformat()
            self.client.table('daily_summaries')\
                .delete()\
                .lt('date', summary_cutoff)\
                .execute()
            
            logger.info(f"Cleaned up old daily summaries older than 90 days")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
    
    def get_health_status(self) -> Dict:
        """Get database health status"""
        try:
            # Check recent data
            recent_data = self.get_recent_data(hours=24)
            last_update = None
            
            if recent_data:
                last_update = max(recent_data, key=lambda x: x['scraped_at'])['scraped_at']
            
            # Get table counts
            sentiment_count = self.client.table('sentiment_analysis')\
                .select('id', count='exact')\
                .execute()
            
            summary_count = self.client.table('daily_summaries')\
                .select('id', count='exact')\
                .execute()
            
            return {
                'status': 'healthy',
                'last_update': last_update,
                'total_headlines': sentiment_count.count if sentiment_count.count else 0,
                'daily_summaries': summary_count.count if summary_count.count else 0,
                'recent_headlines_24h': len(recent_data),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting health status: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            } 