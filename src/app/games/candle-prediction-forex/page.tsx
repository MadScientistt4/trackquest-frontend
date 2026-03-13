'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { gamesApi } from '@/lib/api'
import Sidebar from '@/components/layout/Sidebar'
import toast from 'react-hot-toast'

interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface ForexPair {
  index: number
  symbol: string
  label: string
  from: string
  to: string
}

type Prediction = 'bullish' | 'bearish' | 'consolidation'
type Difficulty = 'easy' | 'medium' | 'hard'
type Phase = 'loading' | 'asset-select' | 'briefing' | 'game' | 'results'

interface GameState {
  phase: Phase
  candles: Candle[]
  difficulty: Difficulty
  timeLimit: number
  timeRemaining: number
  prediction: Prediction | null
  correctAnswer: Prediction | null
  results: any | null
  startTime: number
  selectedPair: ForexPair | null
  forexPairs: ForexPair[]
  usingRealData: boolean
}

function CandleChart({ candles }: { candles: Candle[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || candles.length === 0) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#0f0f0f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    ctx.strokeStyle = '#1e1e1e'
    ctx.lineWidth = 1
    for (let i = 0; i < 10; i++) {
      const y = (canvas.height / 10) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Calculate chart dimensions
    const padding = 50
    const chartWidth = canvas.width - padding * 2
    const chartHeight = canvas.height - padding * 2

    // Find price range
    const prices = candles.flatMap(c => [c.high, c.low])
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice
    const priceScale = chartHeight / priceRange

    // Draw candlesticks
    const candleWidth = chartWidth / (candles.length + 1)

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i]
      const x = padding + (i + 1) * candleWidth - candleWidth * 0.4

      // Normalize prices to canvas coordinates
      const openY = canvas.height - padding - (candle.open - minPrice) * priceScale
      const closeY = canvas.height - padding - (candle.close - minPrice) * priceScale
      const highY = canvas.height - padding - (candle.high - minPrice) * priceScale
      const lowY = canvas.height - padding - (candle.low - minPrice) * priceScale

      const isBullish = candle.close >= candle.open

      // Draw wick
      ctx.strokeStyle = isBullish ? '#10b981' : '#ef4444'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + candleWidth * 0.2, highY)
      ctx.lineTo(x + candleWidth * 0.2, lowY)
      ctx.stroke()

      // Draw body
      ctx.fillStyle = isBullish ? '#10b981' : '#ef4444'
      ctx.fillRect(x, Math.min(openY, closeY), candleWidth * 0.4, Math.abs(closeY - openY) || 2)
    }

    // Draw price axis labels
    ctx.fillStyle = '#9ca3af'
    ctx.font = '12px monospace'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange / 5) * i
      const y = canvas.height - padding - (price - minPrice) * priceScale
      ctx.fillText(`${price.toFixed(4)}`, padding - 10, y + 4)
    }
  }, [candles])

  return (
    <canvas
      ref={canvasRef}
      className="w-full bg-white border-2 border-bg-border rounded-lg"
      style={{ minHeight: '400px' }}
    />
  )
}

export default function CandleChallengeForexPage() {
  const { user, isAuthenticated, loadFromStorage, updateUser } = useAuthStore()
  const router = useRouter()
  const [gameState, setGameState] = useState<GameState>({
    phase: 'loading',
    candles: [],
    difficulty: 'easy',
    timeLimit: 60,
    timeRemaining: 60,
    prediction: null,
    correctAnswer: null,
    results: null,
    startTime: 0,
    selectedPair: null,
    forexPairs: [],
    usingRealData: false,
  })

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth')
  }, [isAuthenticated, router])

  // Load forex pairs on mount
  useEffect(() => {
    const loadPairs = async () => {
      try {
        const res = await gamesApi.getForexPairs()
        setGameState(prev => ({
          ...prev,
          phase: 'asset-select',
          forexPairs: res.data.pairs,
        }))
      } catch {
        toast.error('Failed to load forex pairs')
        router.push('/dashboard')
      }
    }

    if (gameState.phase === 'loading' && isAuthenticated) {
      loadPairs()
    }
  }, [gameState.phase, isAuthenticated, router])

  // Timer
  useEffect(() => {
    if (gameState.phase !== 'game') return

    const interval = setInterval(() => {
      setGameState(prev => {
        const remaining = prev.timeRemaining - 1
        if (remaining <= 0) {
          clearInterval(interval)
          if (prev.prediction) handleSubmitPrediction(true)
          return prev
        }
        return { ...prev, timeRemaining: remaining }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [gameState.phase])

  const selectPair = async (pair: ForexPair) => {
    try {
      const res = await gamesApi.getCandleChallengeForex(gameState.difficulty, pair.index)
      setGameState(prev => ({
        ...prev,
        phase: 'briefing',
        selectedPair: pair,
        candles: res.data.candles,
        timeLimit: res.data.timeLimit,
        timeRemaining: res.data.timeLimit,
        correctAnswer: res.data._correctAnswer,
        usingRealData: !res.data.warning,
      }))
      if (res.data.warning) {
        toast(`Using demo API key. ${res.data.warning}`, { duration: 5 })
      }
    } catch {
      toast.error('Failed to load challenge')
    }
  }

  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      phase: 'game',
      startTime: Date.now(),
      timeRemaining: prev.timeLimit,
    }))
  }

  const handlePrediction = (prediction: Prediction) => {
    setGameState(prev => ({ ...prev, prediction }))
  }

  const handleSubmitPrediction = async (timedOut: boolean = false) => {
    if (!gameState.prediction || !gameState.correctAnswer) return

    const timeSpent = Math.floor((Date.now() - gameState.startTime) / 1000)
    const isCorrect = gameState.prediction === gameState.correctAnswer

    // Calculate rewards
    const baseXP = gameState.difficulty === 'easy' ? 15 : gameState.difficulty === 'medium' ? 25 : 40
    const baseCoins = gameState.difficulty === 'easy' ? 10 : gameState.difficulty === 'medium' ? 20 : 35
    const xpEarned = isCorrect ? baseXP : Math.floor(baseXP * 0.1)
    const coinsEarned = isCorrect ? baseCoins : 0
    const score = isCorrect ? (timeSpent < 10 ? 100 : timeSpent < 20 ? 80 : 60) : 0

    setGameState(prev => ({
      ...prev,
      phase: 'results',
      results: {
        isCorrect,
        prediction: gameState.prediction,
        correctAnswer: gameState.correctAnswer,
        xpEarned,
        coinsEarned,
        score,
        explanation: isCorrect
          ? '🎯 Excellent prediction! You correctly identified the price movement.'
          : `📊 The correct answer was "${gameState.correctAnswer}". Study the trend indicators more carefully.`,
        pair: gameState.selectedPair?.symbol,
      },
    }))

    if (xpEarned > 0) {
      updateUser({
        xp: user!.xp + xpEarned,
        coins: user!.coins + coinsEarned,
      })
    }

    if (timedOut) {
      toast.success('Time\'s up!')
    } else {
      toast.success(`Score: ${score}%`)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-6">
            <p className="label mb-1">Real Market Data</p>
            <h1 className="font-display font-black text-2xl text-text-primary">💱 Forex Candle Prediction</h1>
            <p className="text-text-secondary text-sm mt-1">Trade real forex pairs with Alpha Vantage market data</p>
          </div>

          {/* Asset Selection */}
          {gameState.phase === 'asset-select' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="font-display font-bold text-lg text-text-primary mb-4">Select a Forex Pair</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {gameState.forexPairs.map((pair) => (
                    <button
                      key={pair.index}
                      onClick={() => selectPair(pair)}
                      className="p-4 border-2 border-bg-border rounded-lg hover:border-accent-green hover:bg-accent-green/5 transition-all text-left"
                    >
                      <div className="font-bold text-text-primary">{pair.symbol}</div>
                      <div className="text-xs text-text-muted">{pair.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card p-4 bg-accent-blue/10 border border-accent-blue/20">
                <p className="text-sm text-text-secondary flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>Real-time data from <strong>Alpha Vantage</strong>. Free tier included. <a href="https://www.alphavantage.co/api/" target="_blank" rel="noopener noreferrer" className="text-accent-green hover:underline">Get your own API key</a></span>
                </p>
              </div>
            </div>
          )}

          {/* Briefing */}
          {gameState.phase === 'briefing' && gameState.selectedPair && (
            <div className="card p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display font-bold text-text-primary mb-1">📊 {gameState.selectedPair.symbol}</h2>
                  <p className="text-text-secondary text-sm">{gameState.selectedPair.label}</p>
                  {gameState.usingRealData && (
                    <p className="text-xs text-accent-green mt-2">✅ Using live market data</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="label mb-2">Difficulty</p>
                  <p className="text-lg font-bold text-accent-green capitalize">
                    {gameState.difficulty}
                  </p>
                </div>
              </div>
              <div className="mb-6">
                <p className="label mb-2">Instructions</p>
                <p className="text-text-secondary text-sm">
                  Look at the chart showing {gameState.candles.length} hourly candles. Choose whether the next candle will be bullish 📈, bearish 📉, or consolidating ➖.
                </p>
              </div>
              <button
                onClick={startGame}
                className="w-full px-4 py-3 bg-accent-green text-black font-bold rounded-lg hover:bg-green-500 transition-all"
              >
                Start Challenge →
              </button>
            </div>
          )}

          {/* Game */}
          {gameState.phase === 'game' && (
            <>
              {/* Timer */}
              <div className="card p-4 mb-6 flex items-center justify-between">
                <div>
                  <p className="label text-xs">Time</p>
                  <p className={`font-display font-black text-xl ${
                    gameState.timeRemaining < 10 ? 'text-accent-red' : 'text-accent-green'
                  }`}>
                    {Math.floor(gameState.timeRemaining / 60)}:{String(gameState.timeRemaining % 60).padStart(2, '0')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="label text-xs">{gameState.selectedPair?.symbol}</p>
                  <p className="font-bold text-text-primary">{gameState.selectedPair?.label}</p>
                </div>
              </div>

              {/* Chart */}
              <div className="card p-6 mb-6">
                <CandleChart candles={gameState.candles} />
              </div>

              {/* Prediction Buttons */}
              <div className="card p-6 space-y-4">
                <p className="label mb-3">What will the next candle be?</p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handlePrediction('bullish')}
                    className={`px-4 py-3 rounded-lg font-bold transition-all ${
                      gameState.prediction === 'bullish'
                        ? 'bg-green-500 text-black'
                        : 'border-2 border-bg-border text-text-secondary hover:border-green-500/50'
                    }`}
                  >
                    📈 Bullish
                  </button>
                  <button
                    onClick={() => handlePrediction('bearish')}
                    className={`px-4 py-3 rounded-lg font-bold transition-all ${
                      gameState.prediction === 'bearish'
                        ? 'bg-red-500 text-black'
                        : 'border-2 border-bg-border text-text-secondary hover:border-red-500/50'
                    }`}
                  >
                    📉 Bearish
                  </button>
                  <button
                    onClick={() => handlePrediction('consolidation')}
                    className={`px-4 py-3 rounded-lg font-bold transition-all ${
                      gameState.prediction === 'consolidation'
                        ? 'bg-accent-gold text-black'
                        : 'border-2 border-bg-border text-text-secondary hover:border-yellow-500/50'
                    }`}
                  >
                    ➖ Consolidation
                  </button>
                </div>

                <button
                  onClick={() => handleSubmitPrediction()}
                  disabled={!gameState.prediction}
                  className="w-full px-4 py-3 bg-accent-green text-black font-bold rounded-lg hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Prediction ✓
                </button>
              </div>
            </>
          )}

          {/* Results */}
          {gameState.phase === 'results' && gameState.results && (
            <div className="space-y-6">
              {/* Score */}
              <div className="card p-6 text-center">
                <p className="label mb-2">{gameState.results.isCorrect ? '🎉 Correct!' : '❌ Incorrect'}</p>
                <p className="font-display font-black text-5xl text-accent-gold mb-4">
                  {gameState.results.score}%
                </p>
                <p className="text-text-secondary mb-4">{gameState.results.explanation}</p>
                <p className="text-sm font-mono text-text-muted">
                  Your prediction: <strong>{gameState.results.prediction}</strong> | Correct answer: <strong>{gameState.results.correctAnswer}</strong>
                </p>
              </div>

              {/* Rewards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-6 text-center border-2 border-accent-green/30">
                  <p className="text-2xl mb-2">⚡</p>
                  <p className="label mb-1">XP Earned</p>
                  <p className="font-display font-black text-2xl text-accent-green">
                    +{gameState.results.xpEarned}
                  </p>
                </div>
                <div className="card p-6 text-center border-2 border-accent-gold/30">
                  <p className="text-2xl mb-2">🪙</p>
                  <p className="label mb-1">Coins Earned</p>
                  <p className="font-display font-black text-2xl text-accent-gold">
                    +{gameState.results.coinsEarned}
                  </p>
                </div>
              </div>

              {/* Data Source */}
              <div className="card p-4 bg-accent-blue/10 border border-accent-blue/20">
                <p className="text-sm text-text-secondary">
                  📊 Market data from <strong>{gameState.results.pair}</strong> via Alpha Vantage API
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setGameState({
                      phase: 'asset-select',
                      candles: [],
                      difficulty: 'easy',
                      timeLimit: 60,
                      timeRemaining: 60,
                      prediction: null,
                      correctAnswer: null,
                      results: null,
                      startTime: 0,
                      selectedPair: null,
                      forexPairs: gameState.forexPairs,
                      usingRealData: false,
                    })
                  }}
                  className="flex-1 px-4 py-3 bg-accent-green text-black rounded-lg hover:bg-green-500 transition-all font-bold"
                >
                  Play Again
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 px-4 py-3 border-2 border-bg-border text-text-secondary rounded-lg hover:border-accent-green transition-all font-bold"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
