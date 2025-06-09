# Palantir Sentiment Analysis Backend

This backend system automatically scrapes Yahoo Finance for Palantir (PLTR) news headlines, analyzes their sentiment using VADER, and stores the results in Supabase. It runs hourly via GitHub Actions.

## Architecture Overview

```
Yahoo Finance → Python Scraper → VADER Analysis → Supabase Database → Frontend
     ↑              ↑                  ↑             ↑
 Web Scraping   GitHub Actions    Sentiment     PostgreSQL
 (BeautifulSoup)   (Cron Job)     Classification   (Free Tier)
```

## Features

- ✅ **Automated scraping** of Yahoo Finance headlines
- ✅ **VADER sentiment analysis** optimized for social media text
- ✅ **Duplicate detection** to avoid storing the same headline twice
- ✅ **PostgreSQL storage** with proper indexing and RLS
- ✅ **Daily summaries** for aggregated insights
- ✅ **Automatic cleanup** of old data to stay within limits
- ✅ **Health monitoring** and error notifications
- ✅ **Respectful scraping** with delays and rotating user agents

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully initialized
3. Go to **Settings → API** and copy:
   - **Project URL** (starts with `https://your-project.supabase.co`)
   - **Service Role Key** (starts with `eyJ...`) - **NOT the anon key!**

### 2. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `schema.sql` and run it
3. Verify the tables were created: `sentiment_analysis` and `daily_summaries`

### 3. Configure GitHub Secrets

In your GitHub repository:

1. Go to **Settings → Secrets and variables → Actions**
2. Add these secrets:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_KEY`: Your service role key (not anon key!)

### 4. Enable GitHub Actions

1. Ensure the workflow file exists at `.github/workflows/scrape.yml`
2. The workflow will automatically run:
   - **Every hour** at 15 minutes past the hour
   - **On push** to main branch (for testing)
   - **Manually** via workflow dispatch

## Local Development

### Prerequisites

- Python 3.11+
- pip package manager

### Setup

1. **Clone and navigate:**
   ```bash
   git clone <your-repo>
   cd backend/
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Test the scraper:**
   ```bash
   python scraper.py
   ```

### Manual Testing

```bash
# Test just the scraping (no database)
python -c "
from scraper import PalantirSentimentAnalyzer
analyzer = PalantirSentimentAnalyzer()
headlines = analyzer.scrape_yahoo_headlines()
print(f'Found {len(headlines)} headlines')
"

# Test sentiment analysis
python -c "
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
analyzer = SentimentIntensityAnalyzer()
result = analyzer.polarity_scores('Palantir reports strong earnings')
print(result)
"

# Test database connection
python -c "
from supabase_client import SupabaseClient
client = SupabaseClient()
health = client.get_health_status()
print(health)
"
```

## Database Schema

### `sentiment_analysis` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `headline` | TEXT | The news headline |
| `source` | VARCHAR(50) | Always 'yahoo_finance' |
| `source_url` | TEXT | URL of the article |
| `scraped_at` | TIMESTAMPTZ | When we scraped it |
| `sentiment_compound` | DECIMAL(6,4) | VADER compound score (-1 to 1) |
| `sentiment_positive` | DECIMAL(6,4) | Positive component (0 to 1) |
| `sentiment_negative` | DECIMAL(6,4) | Negative component (0 to 1) |
| `sentiment_neutral` | DECIMAL(6,4) | Neutral component (0 to 1) |
| `classification` | VARCHAR(10) | 'positive', 'negative', or 'neutral' |
| `created_at` | TIMESTAMPTZ | Database insertion time |

### `daily_summaries` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `date` | DATE | The date being summarized |
| `total_headlines` | INTEGER | Total headlines that day |
| `positive_count` | INTEGER | Number of positive headlines |
| `negative_count` | INTEGER | Number of negative headlines |
| `neutral_count` | INTEGER | Number of neutral headlines |
| `avg_sentiment` | DECIMAL(6,4) | Average sentiment score |
| `most_positive_headline` | TEXT | Best headline of the day |
| `most_negative_headline` | TEXT | Worst headline of the day |

## VADER Sentiment Analysis

VADER (Valence Aware Dictionary and sEntiment Reasoner) is perfect for this use case because:

- **Social Media Optimized**: Handles informal text, capitalization, punctuation
- **No Training Required**: Works out of the box
- **Emoji Support**: Understands emoticons and emojis
- **Contextual**: Handles negations, intensifiers, and contrastive conjunctions

### Sentiment Classification

- **Positive**: compound score ≥ 0.05
- **Negative**: compound score ≤ -0.05  
- **Neutral**: -0.05 < compound score < 0.05

### Example Scores

| Headline | Compound Score | Classification |
|----------|----------------|----------------|
| "Palantir beats earnings expectations!" | 0.6588 | Positive |
| "PLTR stock crashes on disappointing guidance" | -0.5994 | Negative |
| "Palantir announces new contract" | 0.0000 | Neutral |

## Monitoring & Maintenance

### Automatic Features

- **Duplicate Prevention**: Won't store the same headline twice in 24h
- **Data Cleanup**: Removes data older than 30 days (configurable)
- **Error Notifications**: Creates GitHub issues on scraping failures
- **Health Checks**: Monitors system status after each run

### Manual Monitoring

```bash
# Check recent data
python -c "
from supabase_client import SupabaseClient
client = SupabaseClient()
data = client.get_recent_data(hours=24)
print(f'Headlines in last 24h: {len(data)}')
"

# Get health status
python -c "
from supabase_client import SupabaseClient
client = SupabaseClient()
health = client.get_health_status()
print(health)
"

# Manual cleanup
python -c "
from supabase_client import SupabaseClient
client = SupabaseClient()
client.cleanup_old_data(days=30)
"
```

## Frontend Integration

The frontend connects **directly to Supabase** - no API server needed! This is more efficient and cost-effective.

### Why No FastAPI Middleware?

- ✅ **Simpler**: Fewer moving parts, less to maintain
- ✅ **Faster**: Direct database connection, no extra network hop
- ✅ **Cheaper**: No server costs, only database
- ✅ **Real-time**: Built-in subscriptions and live queries
- ✅ **Secure**: Row Level Security (RLS) policies protect data

### Security

- **Row Level Security**: Public can only read, service role can write
- **API Key Rotation**: Easy to rotate keys in Supabase dashboard
- **Rate Limiting**: Supabase handles this automatically

## Troubleshooting

### Common Issues

**"No headlines found"**
- Yahoo Finance changed their HTML structure
- Network issues or rate limiting
- Check the selectors in `scraper.py`

**"Supabase connection failed"**
- Check your environment variables
- Verify the service key (not anon key!)
- Ensure your IP isn't blocked

**"Duplicate key violation"**
- This is expected - means duplicate detection is working
- Headlines are deduplicated within 24h windows

### Debug Mode

Enable debug logging by running the workflow manually with debug=true, or locally:

```bash
DEBUG=true python scraper.py
```

## Performance

- **Scraping**: ~30-60 seconds per run
- **Storage**: ~10-50 headlines per hour
- **Database**: Well under 500MB free tier limit
- **GitHub Actions**: ~2-3 minutes of the 2000 free minutes/month

## License

This project is for educational purposes. Respect Yahoo Finance's robots.txt and terms of service. 