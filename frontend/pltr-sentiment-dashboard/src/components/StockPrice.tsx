'use client'

import { useState, useEffect } from 'react'
import { fetchPLTRPrice, formatCurrency, formatPercentage } from '@/lib/utils'

interface StockData {
  price: number
  previousClose: number
  change: number
  changePercent: number
}

export default function StockPrice() {
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [mounted, setMounted] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const data = await fetchPLTRPrice()
      setStockData(data)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching stock data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchData()
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
          <div className="h-8 bg-gray-300 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-20"></div>
        </div>
      </div>
    )
  }

  if (!stockData) return null

  const isPositive = stockData.change >= 0
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600'
  const bgColor = isPositive ? 'bg-green-50' : 'bg-red-50'

  return (
    <div className={`p-6 rounded-lg shadow-md ${bgColor}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">PLTR Stock Price</h2>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <span className={`text-sm ${loading ? 'animate-spin' : ''}`}>🔄</span>
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="text-3xl font-bold text-gray-900">
          {formatCurrency(stockData.price)}
        </div>
        
        <div className={`flex items-center gap-2 ${changeColor}`}>
          <span className="text-lg">
            {isPositive ? '📈' : '📉'}
          </span>
          <span className="font-medium">
            {isPositive ? '+' : ''}{formatCurrency(stockData.change)} 
            ({isPositive ? '+' : ''}{formatPercentage(stockData.changePercent)})
          </span>
        </div>
        
        <div className="text-sm text-gray-500">
          Previous close: {formatCurrency(stockData.previousClose)}
        </div>
        
        <div className="text-xs text-gray-400">
          {mounted && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
        </div>
      </div>
    </div>
  )
} 