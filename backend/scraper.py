import requests
from bs4 import BeautifulSoup
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from datetime import datetime, timedelta
import logging
import time
import random
from dotenv import load_dotenv
from supabase_client import SupabaseClient

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PalantirSentimentAnalyzer:
    def __init__(self):
        self.analyzer = SentimentIntensityAnalyzer()
        self.supabase = SupabaseClient()
        self.session = requests.Session()
        
        # Rotate user agents to avoid detection
        self.user_agents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
        ]
    
    def get_random_headers(self):
        """Get randomized headers to avoid detection"""
        return {
            'User-Agent': random.choice(self.user_agents),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
    
    def scrape_yahoo_headlines(self):
        """Scrape Palantir headlines from Yahoo Finance"""
        urls = [
            'https://finance.yahoo.com/quote/PLTR/?tab=news',
        ]
        
        all_headlines = []
        
        for url in urls:
            try:
                logger.info(f"Scraping {url}")
                
                headers = self.get_random_headers()
                logger.info(f"🌐 Using headers: {headers['User-Agent'][:50]}...")
                
                response = self.session.get(url, headers=headers, timeout=30)
                
                # Debug response details
                logger.info(f"📡 Response Status: {response.status_code}")
                logger.info(f"📡 Response Headers: {dict(list(response.headers.items())[:5])}")
                logger.info(f"📡 Response URL: {response.url}")
                logger.info(f"📡 Content Length: {len(response.content)} bytes")
                
                if response.url != url:
                    logger.warning(f"🔄 Redirected from {url} to {response.url}")
                
                if response.status_code == 429:
                    logger.warning(f"⚠️ Rate limited by {url}. Waiting longer...")
                    time.sleep(30)  # Wait 30 seconds if rate limited
                    continue
                elif response.status_code == 403:
                    logger.warning(f"⚠️ Access forbidden for {url}. Trying next URL...")
                    continue
                elif response.status_code != 200:
                    logger.warning(f"⚠️ Unexpected status code {response.status_code} for {url}")
                    continue
                
                soup = BeautifulSoup(response.content, 'html.parser')
                headlines_found = []

                selectors = [
                    'div.stream-item h3',
                ]
                
                for selector in selectors:
                    try:
                        elements = soup.select(selector)
                        logger.info(f"🎯 Selector '{selector}' found {len(elements)} elements")
                        
                        for element in elements:
                            text = element.get_text().strip()
                            if text and len(text) > 10:  # Filter out very short text
                                # Check if it's Palantir-related
                                text_lower = text.lower()
                                if any(keyword in text_lower for keyword in ['palantir', 'pltr', 'karp', 'foundry', 'gotham', 'aip']):
                                    logger.info(f"   ✅ PALANTIR MATCH: {text}")
                                    
                                    # Try to get the link
                                    link_element = element.find('a') or element.find_parent('a')
                                    source_url = link_element.get('href') if link_element else url
                                    logger.info(f"   🔗 Source URL: {source_url}")
                                    
                                    headline = {
                                        'text': text,
                                        'timestamp': datetime.now().isoformat(),
                                        'source': 'yahoo_finance',
                                        'source_url': source_url
                                    }
                                    headlines_found.append(headline)
                    except Exception as selector_error:
                        logger.debug(f"Selector {selector} failed: {selector_error}")
                        continue
                
                all_headlines.extend(headlines_found)
                logger.info(f"Found {len(headlines_found)} headlines from {url}")
                
            except requests.RequestException as e:
                logger.error(f"Request error for {url}: {e}")
                continue
            except Exception as e:
                logger.error(f"Unexpected error scraping {url}: {e}")
                continue
        
        # Remove duplicates based on headline text
        seen = set()
        unique_headlines = []
        for headline in all_headlines:
            if headline['text'] not in seen:
                seen.add(headline['text'])
                unique_headlines.append(headline)
        
        logger.info(f"Total unique headlines: {len(unique_headlines)}")
        return unique_headlines
    
    def analyze_sentiment(self, headlines):
        """Run VADER sentiment analysis on headlines"""
        results = []
        
        for headline in headlines:
            try:
                # Get VADER sentiment scores
                sentiment = self.analyzer.polarity_scores(headline['text'])
                
                # Classify sentiment based on compound score
                if sentiment['compound'] >= 0.05:
                    classification = 'positive'
                elif sentiment['compound'] <= -0.05:
                    classification = 'negative'
                else:
                    classification = 'neutral'
                
                result = {
                    **headline,
                    'sentiment_scores': sentiment,
                    'classification': classification
                }
                results.append(result)
                logger.info(f"✅ Analyzed sentiment for headline: {headline['text'][:50]}... Sentiment: {classification}")
                
            except Exception as e:
                logger.error(f"Error analyzing sentiment for headline: {headline['text'][:50]}... Error: {e}")
                continue
        
        return results
    
    def run_analysis(self):
        """Main execution function"""
        try:
            logger.info("🔍 Starting Palantir sentiment analysis...")
            
            # Scrape headlines
            headlines = self.scrape_yahoo_headlines()
            if not headlines:
                logger.warning("No headlines found, skipping analysis")
                return
            
            logger.info(f"📰 Found {len(headlines)} unique headlines")
            
            # Analyze sentiment
            logger.info("🧠 Analyzing sentiment with VADER...")
            results = self.analyze_sentiment(headlines)
            
            if not results:
                logger.warning("No valid sentiment results, skipping save")
                return
            
            # Save to Supabase
            logger.info("💾 Saving results to Supabase...")
            saved_count = self.supabase.save_sentiment_data(results)
            
            # Generate and save daily summary if needed
            self.supabase.create_daily_summary()
            
            # Get summary for logging
            summary = self.supabase.get_latest_summary(hours=1)
            logger.info(f"✅ Analysis complete! Saved {saved_count} headlines. Average sentiment: {summary.get('average_sentiment', 'N/A')}")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Error in analysis: {e}")
            # Re-raise to trigger GitHub Actions failure notification
            raise

if __name__ == "__main__":
    analyzer = PalantirSentimentAnalyzer()
    analyzer.run_analysis() 