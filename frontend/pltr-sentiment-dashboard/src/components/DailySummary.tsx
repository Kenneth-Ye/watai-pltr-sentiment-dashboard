'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatSentiment, getSentimentColor } from '@/lib/utils'

interface DailySummaryData {
  id: string
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
  created_at: string
}

export default function DailySummary() {
  const [summary, setSummary] = useState<DailySummaryData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDailySummary = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error fetching daily summary:', error)
        throw error
      }
      
      setSummary(data?.[0] || null)
    } catch (error) {
      console.error('Error fetching daily summary:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDailySummary()
  }, [])

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-40 mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-300 rounded w-16"></div>
                <div className="h-6 bg-gray-300 rounded w-12"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="text-center py-8 text-gray-500">
          No daily summary available
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const positivePercent = ((summary.positive_count / summary.total_headlines) * 100).toFixed(1)
  const negativePercent = ((summary.negative_count / summary.total_headlines) * 100).toFixed(1)
  const neutralPercent = ((summary.neutral_count / summary.total_headlines) * 100).toFixed(1)

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Daily Summary</h2>
        <span className="text-sm text-gray-500">{formatDate(summary.date)}</span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{summary.total_headlines}</div>
          <div className="text-sm text-gray-600">Total Headlines</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{summary.positive_count}</div>
          <div className="text-sm text-gray-600">Positive ({positivePercent}%)</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{summary.negative_count}</div>
          <div className="text-sm text-gray-600">Negative ({negativePercent}%)</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-600">{summary.neutral_count}</div>
          <div className="text-sm text-gray-600">Neutral ({neutralPercent}%)</div>
        </div>
      </div>

      {/* Average Sentiment */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Average Sentiment</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSentimentColor(summary.avg_sentiment)}`}>
            {formatSentiment(summary.avg_sentiment)} ({summary.avg_sentiment.toFixed(3)})
          </span>
        </div>
      </div>

      {/* Most Extreme Headlines */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 bg-green-50 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 mb-2">
            Most Positive (Score: {summary.most_positive_score.toFixed(3)})
          </h4>
          <p className="text-sm text-gray-700 line-clamp-3">
            {summary.most_positive_headline}
          </p>
        </div>
        <div className="p-4 bg-red-50 rounded-lg">
          <h4 className="text-sm font-medium text-red-800 mb-2">
            Most Negative (Score: {summary.most_negative_score.toFixed(3)})
          </h4>
          <p className="text-sm text-gray-700 line-clamp-3">
            {summary.most_negative_headline}
          </p>
        </div>
      </div>
    </div>
  )
} 