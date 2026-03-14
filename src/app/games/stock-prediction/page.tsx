'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { gamesApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { useStore } from '@/lib/store'

interface CandleData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface Stock {
  symbol: string
  name: string
}

const CandleChart = ({ candles, width = 800, height = 400 }: { candles: CandleData[]; width?: number; height?: number }) => {
  useEffect(() => {
    if (!candles || candles.length === 0) return

    const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prices = candles.map((c) => [c.low, c.high]).flat()
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice
    const padding = 50

    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, width, height)

    const candleWidth = (width - padding * 2) / candles.length
    const candleSpacing = candleWidth * 0.1

    candles.forEach((candle, index) => {
      const x = padding + index * candleWidth + candleSpacing / 2
      const topY = height - padding - ((candle.high - minPrice) / priceRange) * (height - padding * 2)
      const bottomY = height - padding - ((candle.low - minPrice) / priceRange) * (height - padding * 2)
      const openY = height - padding - ((candle.open - minPrice) / priceRange) * (height - padding * 2)
      const closeY = height - padding - ((candle.close - minPrice) / priceRange) * (height - padding * 2)

      const isGreen = candle.close >= candle.open
      ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444'
      ctx.fillStyle = isGreen ? '#10b981' : '#ef4444'

      // Wick
      ctx.beginPath()
      ctx.moveTo(x + candleWidth / 2 - candleSpacing, topY)
      ctx.lineTo(x + candleWidth / 2 - candleSpacing, bottomY)
      ctx.stroke()

      // Body
      const bodyTop = Math.min(openY, closeY)
      const bodyBottom = Math.max(openY, closeY)
      const bodyHeight = Math.max(bodyBottom - bodyTop, 2)

      ctx.fillRect(x, bodyTop, candleWidth - candleSpacing * 2, bodyHeight)
    })

    // Draw gridlines
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 1
    for (let i = 0; i < 5; i++) {
      const y = padding + (i * (height - padding * 2)) / 4
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Labels
    ctx.fillStyle = '#9ca3af'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'

    const minPriceLabel = minPrice.toFixed(2)
    const maxPriceLabel = maxPrice.toFixed(2)
    const midPriceLabel = ((minPrice + maxPrice) / 2).toFixed(2)

    ctx.textAlign = 'right'
    ctx.fillText(maxPriceLabel, padding - 10, height - padding + 30)
    ctx.fillText(midPriceLabel, padding - 10, height / 2 + 10)
    ctx.fillText(minPriceLabel, padding - 10, padding - 10)
  }, [candles, width, height])

  return <canvas id="chart-canvas" width={width} height={height} className="w-full border border-gray-700 rounded-lg" />
}

export default function StockPredictionPage() {
  const router = useRouter()
  const user = useStore((state) => state.user)
  const [stocks, setStocks] = useState<Stock[]>([])
  const [selectedStock, setSelectedStock] = useState<string>('AAPL')
  const [difficulty, setDifficulty] = useState('easy')
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'results'>('loading')
  const [candles, setCandles] = useState<CandleData[]>([])
  const [prediction, setPrediction] = useState<string>('')
  const [timeLeft, setTimeLeft] = useState(60)
  const [results, setResults] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadStocks()
    if (!user) router.push('/auth')
  }, [user, router])

  const loadStocks = async () => {
    try {
      const res = await gamesApi.getAvailableStocks()
      setStocks(res.data.stocks)
    } catch (error) {
      toast.error('Failed to load stocks')
    }
  }

  const startGame = async () => {
    try {
      setGameState('loading')
      const res = await gamesApi.getStockChallenge(selectedStock, difficulty)
      setCandles(res.data.candles)
      setTimeLeft(res.data.timeLimit)
      setPrediction('')
      setGameState('playing')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load challenge')
      setGameState('loading')
    }
  }

  useEffect(() => {
    if (gameState !== 'playing') return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameState('results')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState])

  const submitPrediction = async () => {
    if (!prediction) {
      toast.error('Select a prediction')
      return
    }

    setIsSubmitting(true)
    try {
      const timeSpent = difficulty === 'easy' ? 60 - timeLeft : difficulty === 'medium' ? 45 - timeLeft : 30 - timeLeft
      const res = await gamesApi.submitStockPrediction({
        prediction,
        correctAnswer: (results?.correctAnswer as string) || 'bullish',
        ticker: selectedStock,
        difficulty,
        timeSpent,
      })
      setResults(res.data)
      setGameState('results')
      useStore.setState({ user: res.data.newStats })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit prediction')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">📈 Stock Prediction</h1>
          <p className="text-gray-400">Predict the next candle direction using real stock data from Polygon.io</p>
        </div>

        {gameState === 'loading' && (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <label className="block text-sm font-semibold mb-3">Select Stock</label>
              <select
                value={selectedStock}
                onChange={(e) => setSelectedStock(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 px-4 py-3 rounded-lg text-white hover:bg-gray-600"
              >
                {stocks.map((stock) => (
                  <option key={stock.symbol} value={stock.symbol}>
                    {stock.symbol} - {stock.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <label className="block text-sm font-semibold mb-3">Difficulty</label>
              <div className="grid grid-cols-3 gap-4">
                {['easy', 'medium', 'hard'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`py-3 px-4 rounded-lg font-semibold transition ${
                      difficulty === level ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full bg-green-600 hover:bg-green-700 py-3 px-4 rounded-lg font-bold text-lg transition"
            >
              Start Game
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg">
              <span className="text-lg font-semibold">{selectedStock}</span>
              <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-green-500'}`}>{timeLeft}s</div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <CandleChart candles={candles} />
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <label className="block text-sm font-semibold mb-3">What will the next candle do?</label>
              <div className="grid grid-cols-3 gap-4">
                {['bullish', 'bearish', 'consolidation'].map((pred) => (
                  <button
                    key={pred}
                    onClick={() => setPrediction(pred)}
                    className={`py-4 px-6 rounded-lg font-bold text-lg transition ${
                      prediction === pred
                        ? pred === 'bullish'
                          ? 'bg-green-600 text-white'
                          : pred === 'bearish'
                            ? 'bg-red-600 text-white'
                            : 'bg-yellow-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {pred === 'bullish' && '📈 Bullish'}
                    {pred === 'bearish' && '📉 Bearish'}
                    {pred === 'consolidation' && '➡️ Consolidation'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={submitPrediction}
              disabled={!prediction || isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 py-3 px-4 rounded-lg font-bold text-lg transition"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Prediction'}
            </button>
          </div>
        )}

        {gameState === 'results' && results && (
          <div className="space-y-6">
            <div className={`text-center p-8 rounded-lg ${results.isCorrect ? 'bg-green-900 border-2 border-green-600' : 'bg-red-900 border-2 border-red-600'}`}>
              <h2 className="text-3xl font-bold mb-3">{results.isCorrect ? '✅ Correct!' : '❌ Incorrect'}</h2>
              <p className="text-xl mb-2">You predicted: <span className="font-bold">{results.prediction}</span></p>
              <p className="text-xl">Actual: <span className="font-bold">{results.correctAnswer}</span></p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-bold mb-3">Rewards</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 p-4 rounded">
                  <span className="text-gray-400">XP Earned</span>
                  <p className="text-2xl font-bold text-blue-400">+{results.xpEarned}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded">
                  <span className="text-gray-400">Coins Earned</span>
                  <p className="text-2xl font-bold text-yellow-400">+{results.coinsEarned}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-bold mb-3">Your Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-400">Level:</span> <span className="font-bold">{results.newStats.level}</span></div>
                <div><span className="text-gray-400">XP:</span> <span className="font-bold">{results.newStats.xp}</span></div>
                <div><span className="text-gray-400">Coins:</span> <span className="font-bold">{results.newStats.coins}</span></div>
                <div><span className="text-gray-400">Accuracy:</span> <span className="font-bold">{results.newStats.accuracy}%</span></div>
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 px-4 rounded-lg font-bold text-lg transition"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
