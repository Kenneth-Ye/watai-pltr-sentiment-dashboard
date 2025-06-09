import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Headline {
  id: number
  headline: string
  source: string
  scraped_at: string
  sentiment_compound: number
  classification: string
  minutes_ago: number
}

export interface HourlySummary {
  hour: string
  total_headlines: number
  avg_sentiment: number
  positive_count: number
  negative_count: number
  neutral_count: number
  max_sentiment: number
  min_sentiment: number
}

export interface DailySummary {
  id: number
  date: string
  total_headlines: number
  positive_count: number
  negative_count: number
  neutral_count: number
  avg_sentiment: number
  most_positive_headline: string
  most_negative_headline: string
  most_positive_score: number
  most_negative_score: number
} 