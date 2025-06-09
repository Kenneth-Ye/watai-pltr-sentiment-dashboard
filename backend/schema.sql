-- =================================================================
-- Palantir Sentiment Analysis Database Schema
-- =================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =================================================================
-- Main sentiment analysis table
-- =================================================================
CREATE TABLE sentiment_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    headline TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'yahoo_finance',
    source_url TEXT,
    scraped_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sentiment_compound DECIMAL(6,4) NOT NULL,
    sentiment_positive DECIMAL(6,4) NOT NULL,
    sentiment_negative DECIMAL(6,4) NOT NULL,
    sentiment_neutral DECIMAL(6,4) NOT NULL,
    classification VARCHAR(10) NOT NULL CHECK (classification IN ('positive', 'negative', 'neutral')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- Daily summaries table for aggregated data
-- =================================================================
CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE NOT NULL,
    total_headlines INTEGER NOT NULL,
    positive_count INTEGER NOT NULL,
    negative_count INTEGER NOT NULL,
    neutral_count INTEGER NOT NULL,
    avg_sentiment DECIMAL(6,4) NOT NULL,
    most_positive_headline TEXT,
    most_negative_headline TEXT,
    most_positive_score DECIMAL(6,4),
    most_negative_score DECIMAL(6,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- Indexes for better query performance
-- =================================================================

-- For time-based queries (most common)
CREATE INDEX idx_sentiment_scraped_at ON sentiment_analysis(scraped_at DESC);

-- For classification filtering
CREATE INDEX idx_sentiment_classification ON sentiment_analysis(classification);

-- For daily summaries
CREATE INDEX idx_daily_summaries_date ON daily_summaries(date DESC);

-- =================================================================
-- Row Level Security (RLS) Policies
-- =================================================================

-- Enable RLS on both tables
ALTER TABLE sentiment_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

-- Allow public read access to sentiment data (for frontend)
CREATE POLICY "Allow public read access to sentiment_analysis" 
ON sentiment_analysis FOR SELECT 
TO PUBLIC 
USING (true);

-- Allow public read access to daily summaries
CREATE POLICY "Allow public read access to daily_summaries" 
ON daily_summaries FOR SELECT 
TO PUBLIC 
USING (true);

-- Allow service role to insert/update/delete (for backend scraper)
CREATE POLICY "Allow service role full access to sentiment_analysis" 
ON sentiment_analysis FOR ALL 
TO service_role 
USING (true);

CREATE POLICY "Allow service role full access to daily_summaries" 
ON daily_summaries FOR ALL 
TO service_role 
USING (true);

-- =================================================================
-- Views for common queries
-- =================================================================

-- View for latest 24 hours with computed metrics
CREATE VIEW latest_sentiment_24h AS
SELECT 
    *,
    CASE 
        WHEN sentiment_compound >= 0.05 THEN 'positive'
        WHEN sentiment_compound <= -0.05 THEN 'negative'
        ELSE 'neutral'
    END as computed_classification
FROM sentiment_analysis 
WHERE scraped_at >= NOW() - INTERVAL '24 hours'
ORDER BY scraped_at DESC;

CREATE VIEW frontend_realtime AS
SELECT 
    id,
    headline,
    source,
    scraped_at,
    sentiment_compound,
    classification,
    EXTRACT(EPOCH FROM (NOW() - scraped_at))/60 as minutes_ago
FROM sentiment_analysis 
WHERE scraped_at >= NOW() - INTERVAL '30 minutes'
ORDER BY scraped_at DESC;

-- View for hourly aggregations
CREATE VIEW hourly_sentiment_summary AS
SELECT 
    DATE_TRUNC('hour', scraped_at) as hour,
    COUNT(*) as total_headlines,
    AVG(sentiment_compound) as avg_sentiment,
    COUNT(*) FILTER (WHERE classification = 'positive') as positive_count,
    COUNT(*) FILTER (WHERE classification = 'negative') as negative_count,
    COUNT(*) FILTER (WHERE classification = 'neutral') as neutral_count,
    MAX(sentiment_compound) as max_sentiment,
    MIN(sentiment_compound) as min_sentiment
FROM sentiment_analysis 
WHERE scraped_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', scraped_at)
ORDER BY hour DESC;

-- =================================================================
-- Functions for data management
-- =================================================================

-- Function to clean up old data automatically
CREATE OR REPLACE FUNCTION cleanup_old_sentiment_data(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old sentiment analysis records
    DELETE FROM sentiment_analysis 
    WHERE scraped_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    RAISE NOTICE 'Cleaned up % old sentiment analysis records', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to generate daily summary
CREATE OR REPLACE FUNCTION generate_daily_summary(target_date DATE DEFAULT CURRENT_DATE)
RETURNS BOOLEAN AS $$
DECLARE
    summary_exists BOOLEAN;
    total_count INTEGER;
    pos_count INTEGER;
    neg_count INTEGER;
    neu_count INTEGER;
    avg_sent DECIMAL(6,4);
    most_pos_headline TEXT;
    most_neg_headline TEXT;
    most_pos_score DECIMAL(6,4);
    most_neg_score DECIMAL(6,4);
BEGIN
    -- Check if summary already exists
    SELECT EXISTS(SELECT 1 FROM daily_summaries WHERE date = target_date) INTO summary_exists;
    
    IF summary_exists THEN
        RAISE NOTICE 'Daily summary for % already exists', target_date;
        RETURN FALSE;
    END IF;
    
    -- Get aggregated data for the day
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE classification = 'positive'),
        COUNT(*) FILTER (WHERE classification = 'negative'),
        COUNT(*) FILTER (WHERE classification = 'neutral'),
        AVG(sentiment_compound)
    INTO total_count, pos_count, neg_count, neu_count, avg_sent
    FROM sentiment_analysis 
    WHERE DATE(scraped_at) = target_date;
    
    -- If no data for this day, skip
    IF total_count = 0 THEN
        RAISE NOTICE 'No data found for %', target_date;
        RETURN FALSE;
    END IF;
    
    -- Get most extreme headlines
    SELECT headline, sentiment_compound 
    INTO most_pos_headline, most_pos_score
    FROM sentiment_analysis 
    WHERE DATE(scraped_at) = target_date 
    ORDER BY sentiment_compound DESC 
    LIMIT 1;
    
    SELECT headline, sentiment_compound 
    INTO most_neg_headline, most_neg_score
    FROM sentiment_analysis 
    WHERE DATE(scraped_at) = target_date 
    ORDER BY sentiment_compound ASC 
    LIMIT 1;
    
    -- Insert the summary
    INSERT INTO daily_summaries (
        date, total_headlines, positive_count, negative_count, neutral_count,
        avg_sentiment, most_positive_headline, most_negative_headline,
        most_positive_score, most_negative_score
    ) VALUES (
        target_date, total_count, pos_count, neg_count, neu_count,
        avg_sent, most_pos_headline, most_neg_headline,
        most_pos_score, most_neg_score
    );
    
    RAISE NOTICE 'Generated daily summary for % with % headlines', target_date, total_count;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- Triggers for automatic maintenance
-- =================================================================

-- Trigger to automatically update created_at
CREATE OR REPLACE FUNCTION update_created_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to both tables
CREATE TRIGGER trigger_update_sentiment_created_at
    BEFORE UPDATE ON sentiment_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_created_at();

CREATE TRIGGER trigger_update_daily_summaries_created_at
    BEFORE UPDATE ON daily_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_created_at();

-- =================================================================
-- Initial setup complete
-- =================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Create a test record to verify setup
INSERT INTO sentiment_analysis (
    headline, 
    source, 
    scraped_at, 
    sentiment_compound, 
    sentiment_positive, 
    sentiment_negative, 
    sentiment_neutral, 
    classification
) VALUES (
    'Palantir Technologies reports strong quarterly results',
    'test_data',
    NOW(),
    0.5,
    0.7,
    0.1,
    0.2,
    'positive'
);

-- Verify the test record
SELECT 'Schema setup completed successfully! Test record created.' as status; 