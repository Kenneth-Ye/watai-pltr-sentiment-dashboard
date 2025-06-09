import { clsx, type ClassValue } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatSentiment(score: number): string {
  if (score >= 0.05) return 'Positive'
  if (score <= -0.05) return 'Negative'
  return 'Neutral'
}

export function getSentimentColor(score: number): string {
  if (score >= 0.05) return 'text-green-600'
  if (score <= -0.05) return 'text-red-600'
  return 'text-gray-600'
}

export function getSentimentBgColor(score: number): string {
  if (score >= 0.05) return 'bg-green-100 text-green-800'
  if (score <= -0.05) return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-800'
}

export function formatTimeAgo(minutes: number): string {
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${Math.round(minutes)}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100)
}

export async function fetchPLTRPrice() {
  try {
    const API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY!
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=PLTR&token=${API_KEY}`
    )
    const data = await response.json()
    
    return {
      price: data.c,           // Current price
      previousClose: data.pc,  // Previous close
      change: data.d,          // Change (absolute)
      changePercent: data.dp   // Change percent
    }
  } catch (error) {
    console.error('Error fetching PLTR price:', error)
    // Fallback data
    return {
      price: 132.05,
      previousClose: 127.72,
      change: 4.33,
      changePercent: 3.39
    }
  }
} 