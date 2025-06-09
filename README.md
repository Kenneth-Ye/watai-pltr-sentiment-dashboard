# PLTR Sentiment Dashboard

A real-time sentiment analysis dashboard for Palantir Technologies (PLTR) news and headlines. This tool automatically scrapes financial news, analyzes sentiment using NLP, and presents the data through an intuitive web dashboard.

## 🎯 Purpose & Goals

**Primary Goal**: Provide investors and analysts with real-time sentiment insights about Palantir Technologies to help inform investment decisions.

**Key Objectives**:
- Monitor news sentiment trends for PLTR in real-time
- Identify positive/negative sentiment patterns
- Track sentiment changes over time
- Provide easily digestible sentiment analytics
- Enable filtering and analysis of news by sentiment categories

## 🏗️ Architecture Overview

### Backend Architecture (`/backend`)

```
┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cron Job      │───▶│   News Sources  │───▶│  Sentiment       │───▶│   Supabase      │
│   Scheduler     │    │  (Yahoo Finance)│    │  Analysis        │    │   Database      │
└─────────────────┘    └─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Components**:

1. **News Scraper** (`news_scraper.py`)
   - Scrapes PLTR-related headlines from Yahoo Finance
   - Handles rate limiting and duplicate detection
   - Extracts headline text, source, and timestamps

2. **Sentiment Analysis Engine** (`sentiment_analyzer.py`)
   - Uses VADER sentiment analysis
   - Classifies headlines as positive, negative, or neutral
   - Generates compound sentiment scores (-1 to +1)

3. **Database Client** (`supabase_client.py`)
   - Manages all database operations
   - Handles data persistence and retrieval
   - Creates daily summaries and aggregations

4. **Cron Job Scheduler**
   - Orchestrates the scraping and analysis pipeline
   - Runs automatically every 30 minutes via scheduled cron job
   - Handles error recovery and logging
   - Manages data cleanup and maintenance tasks

## 🛠️ Technology Stack

### Backend
- **Python 3.8+** - Core language
- **VADER Sentiment** - NLP sentiment analysis
- **Supabase** - PostgreSQL database with real-time features
- **Requests** - HTTP client for web scraping
- **BeautifulSoup4** - HTML parsing
- **Cron Jobs** - Automated task scheduling
- **APScheduler** - Python-based job scheduling

### Frontend
- **Next.js 15** - React framework with SSR
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Supabase JS** - Database client

### Database
- **PostgreSQL** (via Supabase)
- **Row Level Security** - Data access controls
- **Real-time subscriptions** - Live data updates

## 📊 Data Flow

1. **Cron Job Trigger**: Automated scheduler runs every 30 minutes
2. **Scraping**: Backend scrapes Yahoo Finance for PLTR headlines
3. **Analysis**: Each headline is analyzed for sentiment (-1 to +1 scale)
4. **Storage**: Results stored in `sentiment_analysis` table
5. **Aggregation**: Daily summaries created in `daily_summaries` table
6. **Display**: Frontend fetches and displays real-time data

## 🚀 Quick Start

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your Supabase credentials to .env
python main.py
```

### Setting up Cron Job (Production)
```bash
# Add to crontab for automated execution every 30 minutes
*/30 * * * * cd /path/to/backend && python main.py
```

### Frontend Setup
```bash
cd frontend/pltr-sentiment-dashboard
npm install
cp .env.example .env.local
# Add your Supabase credentials to .env.local
npm run dev
```

### Database Setup
Run the SQL schema in `backend/schema.sql` in your Supabase project.

## 📈 Features

- **Automated data collection** via cron job scheduling
- **Real-time sentiment tracking** for PLTR news
- **Historical sentiment analysis** with daily summaries  
- **Interactive filtering** by sentiment categories
- **Live stock price integration** with Finnhub API
- **Scalable backend architecture** with error handling

## 🔧 Configuration

- **Cron schedule**: Configurable interval (default: every 30 minutes)
- **Data retention**: Auto-cleanup of old records
- **Rate limiting**: Built-in request throttling
- **Error handling**: Comprehensive logging and recovery
- **Duplicate detection**: Prevents duplicate headline storage

## 📝 Database Schema

- `sentiment_analysis`: Raw headline data with sentiment scores
- `daily_summaries`: Aggregated daily statistics
- Views and functions for data analysis and cleanup

---

*Built for educational and research purposes. Not financial advice.*