'use client'

import { useState, useEffect } from 'react'
import { supabase, type Headline } from '@/lib/supabase'
import { formatSentiment, getSentimentColor, formatTimeAgo } from '@/lib/utils'

export default function HeadlinesTable() {
  const [headlines, setHeadlines] = useState<Headline[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [mounted, setMounted] = useState(false)
  const [sentimentFilter, setSentimentFilter] = useState<string>('all')

  const fetchHeadlines = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sentiment_analysis')
        .select('*')
        .order('scraped_at', { ascending: false })
        .limit(30)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      setHeadlines(data || [])
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching headlines:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchHeadlines()
    // Refresh every 2 minutes
    const interval = setInterval(fetchHeadlines, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const filteredHeadlines = headlines.filter(headline => {
    if (sentimentFilter === 'all') return true
    return headline.classification === sentimentFilter
  })

  const filterButtons = [
    { key: 'all', label: 'All', emoji: '📊' },
    { key: 'positive', label: 'Positive', emoji: '📈' },
    { key: 'neutral', label: 'Neutral', emoji: '➖' },
    { key: 'negative', label: 'Negative', emoji: '📉' }
  ]

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-300 rounded w-32"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Latest Headlines</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {filteredHeadlines.length} headlines
          </span>
          <button
            onClick={fetchHeadlines}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            {loading ? '🌀' : '🔄'}
          </button>
        </div>
      </div>

      {/* Sentiment Filter */}
      <div className="mb-4">
        <div className="flex gap-2 flex-wrap">
          {filterButtons.map(filter => (
            <button
              key={filter.key}
              onClick={() => setSentimentFilter(filter.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                sentimentFilter === filter.key
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">{filter.emoji}</span>
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-900">Headline</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">Source</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">Sentiment</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">Score</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredHeadlines.map((headline, index) => (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="max-w-md">
                    <p className="text-sm text-gray-900 line-clamp-2">
                      {headline.headline}
                    </p>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-600">
                    {headline.source}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSentimentColor(headline.sentiment_compound)}`}>
                    {formatSentiment(headline.sentiment_compound)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-600">
                    {headline.sentiment_compound.toFixed(3)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-500">
                    {formatTimeAgo(Math.floor((new Date().getTime() - new Date(headline.scraped_at).getTime()) / (1000 * 60)))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredHeadlines.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {headlines.length === 0 ? 'No headlines available' : `No ${sentimentFilter} headlines found`}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">
        {mounted && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
      </div>
    </div>
  )
} 