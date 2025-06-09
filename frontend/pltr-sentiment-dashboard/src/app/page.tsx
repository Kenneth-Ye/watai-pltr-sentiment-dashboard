import StockPrice from '@/components/StockPrice'
import HeadlinesTable from '@/components/HeadlinesTable'
import DailySummary from '@/components/DailySummary'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PLTR Sentiment Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time sentiment analysis of Palantir Technologies news and headlines
          </p>
        </div>

        {/* Stock Price Card */}
        <div className="mb-8">
          <StockPrice />
        </div>

        {/* Daily Summary */}
        <div className="mb-8">
          <DailySummary />
        </div>

        {/* Headlines Table */}
        <div className="mb-8">
          <HeadlinesTable />
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 mt-12 pb-8">
          <p>Data updates every 30 minutes • Built with Next.js and Supabase</p>
        </footer>
      </div>
    </main>
  )
}
