'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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

interface GameState {
  phase: 'loading' | 'briefing' | 'drawing' | 'results'
  candles: Candle[]
  drawnSupports: number[]
  drawnResistances: number[]
  difficulty: 'easy' | 'medium' | 'hard'
  timeLimit: number
  timeRemaining: number
  isDrawing: boolean
  drawMode: 'support' | 'resistance' | null
  selectedPointIndex: number | null
  results: any | null
  startTime: number
}

function CandlestickChart({
  candles,
  drawnSupports,
  drawnResistances,
  onCanvasReady,
  onLineDrawn,
  drawMode,
}: {
  candles: Candle[]
  drawnSupports: number[]
  drawnResistances: number[]
  onCanvasReady: (canvas: HTMLCanvasElement) => void
  onLineDrawn: (price: number, mode: 'support' | 'resistance') => void
  drawMode: 'support' | 'resistance' | null
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || candles.length === 0) return

    // Set canvas size to match container
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    setCanvasSize({ width: canvas.width, height: canvas.height })

    onCanvasReady(canvas)

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

    // Draw support lines
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 3
    ctx.setLineDash([5, 5])
    for (const support of drawnSupports) {
      const y = canvas.height - padding - (support - minPrice) * priceScale
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(canvas.width - padding, y)
      ctx.stroke()
    }

    // Draw resistance lines
    ctx.strokeStyle = '#f87171'
    ctx.lineWidth = 3
    for (const resistance of drawnResistances) {
      const y = canvas.height - padding - (resistance - minPrice) * priceScale
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(canvas.width - padding, y)
      ctx.stroke()
    }
    ctx.setLineDash([])

    // Draw price axis labels
    ctx.fillStyle = '#9ca3af'
    ctx.font = '12px monospace'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange / 5) * i
      const y = canvas.height - padding - (price - minPrice) * priceScale
      ctx.fillText(`₹${price.toFixed(0)}`, padding - 10, y + 4)
    }
  }, [candles, drawnSupports, drawnResistances, onCanvasReady])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawMode || candles.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const y = e.clientY - rect.top

    // Calculate price from canvas Y coordinate
    const padding = 50
    const chartHeight = canvas.height - padding * 2
    const prices = candles.flatMap(c => [c.high, c.low])
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice
    const priceScale = chartHeight / priceRange

    const price = minPrice + ((canvas.height - padding - y) / priceScale)

    // Ensure price is within range
    if (price >= minPrice && price <= maxPrice) {
      onLineDrawn(Math.round(price * 100) / 100, drawMode)
    }
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      className={`w-full bg-white border-2 rounded-lg cursor-crosshair ${
        drawMode ? 'border-accent-green' : 'border-bg-border'
      }`}
      style={{ minHeight: '400px' }}
    />
  )
}

export default function SupportResistancePage() {
  const { user, isAuthenticated, loadFromStorage, updateUser } = useAuthStore()
  const router = useRouter()
  const [gameState, setGameState] = useState<GameState>({
    phase: 'loading',
    candles: [],
    drawnSupports: [],
    drawnResistances: [],
    difficulty: 'easy',
    timeLimit: 120,
    timeRemaining: 120,
    isDrawing: false,
    drawMode: null,
    selectedPointIndex: null,
    results: null,
    startTime: 0,
  })

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth')
  }, [isAuthenticated, router])

  // Load challenge on mount
  useEffect(() => {
    const loadChallenge = async () => {
      try {
        const res = await gamesApi.getSupportResistanceChallenge(gameState.difficulty)
        setGameState(prev => ({
          ...prev,
          phase: 'briefing',
          candles: res.data.candles,
          difficulty: res.data.difficulty,
          timeLimit: res.data.timeLimit,
          timeRemaining: res.data.timeLimit,
        }))
      } catch {
        toast.error('Failed to load challenge')
        router.push('/dashboard')
      }
    }

    if (gameState.phase === 'loading' && isAuthenticated) {
      loadChallenge()
    }
  }, [gameState.phase, isAuthenticated, router])

  // Timer
  useEffect(() => {
    if (gameState.phase !== 'drawing') return

    const interval = setInterval(() => {
      setGameState(prev => {
        const remaining = prev.timeRemaining - 1
        if (remaining <= 0) {
          clearInterval(interval)
          handleSubmit(true)
          return prev
        }
        return { ...prev, timeRemaining: remaining }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [gameState.phase])

  const startDrawing = () => {
    setGameState(prev => ({
      ...prev,
      phase: 'drawing',
      startTime: Date.now(),
      timeRemaining: prev.timeLimit,
    }))
  }

  const toggleDrawMode = (mode: 'support' | 'resistance') => {
    setGameState(prev => ({
      ...prev,
      drawMode: prev.drawMode === mode ? null : mode,
    }))
  }

  const handleLineDrawn = (price: number, mode: 'support' | 'resistance') => {
    setGameState(prev => {
      if (mode === 'support') {
        return {
          ...prev,
          drawnSupports: [...prev.drawnSupports, price],
        }
      } else {
        return {
          ...prev,
          drawnResistances: [...prev.drawnResistances, price],
        }
      }
    })
  }

  const removeLine = (index: number, mode: 'support' | 'resistance') => {
    setGameState(prev => {
      if (mode === 'support') {
        return {
          ...prev,
          drawnSupports: prev.drawnSupports.filter((_, i) => i !== index),
        }
      } else {
        return {
          ...prev,
          drawnResistances: prev.drawnResistances.filter((_, i) => i !== index),
        }
      }
    })
  }

  const clearAll = () => {
    setGameState(prev => ({
      ...prev,
      drawnSupports: [],
      drawnResistances: [],
    }))
  }

  const handleSubmit = async (timedOut: boolean = false) => {
    if (gameState.candles.length === 0) return

    const timeSpent = Math.floor((Date.now() - gameState.startTime) / 1000)

    try {
      const res = await gamesApi.submitSupportResistance({
        candles: gameState.candles,
        drawnSupports: gameState.drawnSupports,
        drawnResistances: gameState.drawnResistances,
        difficulty: gameState.difficulty,
        timeSpent,
      })

      setGameState(prev => ({
        ...prev,
        phase: 'results',
        results: res.data,
      }))

      if (res.data.xpEarned > 0) {
        updateUser({
          xp: user!.xp + res.data.xpEarned,
          coins: user!.coins + res.data.coinsEarned,
          level: res.data.newStats.level,
          xpToNextLevel: res.data.newStats.xpToNextLevel,
        })
      }

      if (timedOut) {
        toast('Time\'s up! Submit your final answer.', { icon: '⏱️' })
      } else {
        toast.success(`Score: ${res.data.score}%`)
      }
    } catch {
      toast.error('Failed to submit challenge')
    }
  }

  if (gameState.phase === 'loading') {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin">⏳</div>
            <p className="mt-4 text-text-secondary">Loading challenge...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-6">
            <p className="label mb-1">Game Mode</p>
            <h1 className="font-display font-black text-2xl text-text-primary">📊 Support/Resistance Challenge</h1>
            <p className="text-text-secondary text-sm mt-1">Draw support levels at price lows and resistance levels at price highs</p>
          </div>

          {gameState.phase === 'briefing' && (
            <div className="card p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-lg text-text-primary mb-2">How to Play</h2>
                  <ul className="text-sm text-text-secondary space-y-1">
                    <li>🟢 Click the green button to draw <strong>support levels</strong> (where price tends to bounce up)</li>
                    <li>🔴 Click the red button to draw <strong>resistance levels</strong> (where price tends to bounce down)</li>
                    <li>📍 Click on the chart at the price level where you want to draw the line</li>
                    <li>⏱️ Aim for accuracy - you have {gameState.timeLimit} seconds</li>
                  </ul>
                </div>
                <div className="text-right">
                  <p className="label mb-2">Difficulty</p>
                  <p className="text-lg font-bold text-accent-green capitalize">
                    {gameState.difficulty}
                  </p>
                </div>
              </div>
              <button
                onClick={startDrawing}
                className="mt-6 w-full px-4 py-3 bg-accent-green text-black font-bold rounded-lg hover:bg-green-500 transition-all"
              >
                Start Challenge →
              </button>
            </div>
          )}

          {gameState.phase === 'drawing' && (
            <>
              {/* Timer and Stats */}
              <div className="card p-4 mb-6 flex items-center justify-between">
                <div className="flex gap-8">
                  <div>
                    <p className="label text-xs">Time</p>
                    <p className={`font-display font-black text-xl ${
                      gameState.timeRemaining < 10 ? 'text-accent-red' : 'text-accent-green'
                    }`}>
                      {Math.floor(gameState.timeRemaining / 60)}:{String(gameState.timeRemaining % 60).padStart(2, '0')}
                    </p>
                  </div>
                  <div>
                    <p className="label text-xs">Support Lines</p>
                    <p className="font-display font-black text-xl text-green-500">{gameState.drawnSupports.length}</p>
                  </div>
                  <div>
                    <p className="label text-xs">Resistance Lines</p>
                    <p className="font-display font-black text-xl text-red-500">{gameState.drawnResistances.length}</p>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="card p-6 mb-6">
                <CandlestickChart
                  candles={gameState.candles}
                  drawnSupports={gameState.drawnSupports}
                  drawnResistances={gameState.drawnResistances}
                  onCanvasReady={() => {}}
                  onLineDrawn={handleLineDrawn}
                  drawMode={gameState.drawMode}
                />
              </div>

              {/* Drawing Controls */}
              <div className="card p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <button
                    onClick={() => toggleDrawMode('support')}
                    className={`px-4 py-3 rounded-lg font-bold transition-all border-2 ${
                      gameState.drawMode === 'support'
                        ? 'border-green-500 bg-green-500/20 text-green-500'
                        : 'border-bg-border text-text-secondary hover:border-green-500/50'
                    }`}
                  >
                    🟢 Draw Support (Green)
                  </button>
                  <button
                    onClick={() => toggleDrawMode('resistance')}
                    className={`px-4 py-3 rounded-lg font-bold transition-all border-2 ${
                      gameState.drawMode === 'resistance'
                        ? 'border-red-500 bg-red-500/20 text-red-500'
                        : 'border-bg-border text-text-secondary hover:border-red-500/50'
                    }`}
                  >
                    🔴 Draw Resistance (Red)
                  </button>
                </div>

                {/* Drawn Lines List */}
                {(gameState.drawnSupports.length > 0 || gameState.drawnResistances.length > 0) && (
                  <div className="mb-4 p-4 bg-bg-secondary rounded-lg">
                    <p className="label mb-2">Drawn Levels</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {gameState.drawnSupports.map((price, i) => (
                        <div
                          key={`support-${i}`}
                          className="flex items-center justify-between bg-bg-primary p-2 rounded text-green-500"
                        >
                          <span>Support: ₹{price.toFixed(2)}</span>
                          <button
                            onClick={() => removeLine(i, 'support')}
                            className="text-xs hover:text-red-500 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {gameState.drawnResistances.map((price, i) => (
                        <div
                          key={`resistance-${i}`}
                          className="flex items-center justify-between bg-bg-primary p-2 rounded text-red-500"
                        >
                          <span>Resistance: ₹{price.toFixed(2)}</span>
                          <button
                            onClick={() => removeLine(i, 'resistance')}
                            className="text-xs hover:text-red-500 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={clearAll}
                    className="flex-1 px-4 py-2 border-2 border-bg-border text-text-secondary rounded-lg hover:border-accent-red transition-all font-bold"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => handleSubmit()}
                    className="flex-1 px-4 py-3 bg-accent-green text-black rounded-lg hover:bg-green-500 transition-all font-bold"
                  >
                    Submit Answer ✓
                  </button>
                </div>
              </div>
            </>
          )}

          {gameState.phase === 'results' && gameState.results && (
            <div className="space-y-6">
              {/* Score Card */}
              <div className="card p-6 text-center">
                <p className="label mb-2">Score</p>
                <div className="font-display font-black text-5xl text-accent-gold mb-2">
                  {gameState.results.score}%
                </div>
                <p className="text-lg font-bold text-text-secondary mb-4">
                  Grade: <span className={
                    gameState.results.grade === 'A+' ? 'text-accent-gold' :
                    gameState.results.grade.startsWith('A') ? 'text-accent-green' :
                    'text-accent-red'
                  }>{gameState.results.grade}</span>
                </p>
              </div>

              {/* Accuracy Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-6">
                  <p className="label mb-2">Support Accuracy</p>
                  <p className="font-display font-black text-3xl text-green-500 mb-2">
                    {gameState.results.supportAccuracy}%
                  </p>
                  <div className="w-full bg-bg-secondary rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${gameState.results.supportAccuracy}%` }}
                    />
                  </div>
                </div>
                <div className="card p-6">
                  <p className="label mb-2">Resistance Accuracy</p>
                  <p className="font-display font-black text-3xl text-red-500 mb-2">
                    {gameState.results.resistanceAccuracy}%
                  </p>
                  <div className="w-full bg-bg-secondary rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ width: `${gameState.results.resistanceAccuracy}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Feedback */}
              <div className="card p-6">
                <p className="label mb-4">Feedback</p>
                <div className="space-y-2">
                  {gameState.results.feedback.map((msg: string, i: number) => (
                    <p key={i} className="text-text-secondary font-mono text-sm">
                      {msg}
                    </p>
                  ))}
                </div>
              </div>

              {/* XP/Coins Earned */}
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

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setGameState({
                      phase: 'loading',
                      candles: [],
                      drawnSupports: [],
                      drawnResistances: [],
                      difficulty: 'easy',
                      timeLimit: 120,
                      timeRemaining: 120,
                      isDrawing: false,
                      drawMode: null,
                      selectedPointIndex: null,
                      results: null,
                      startTime: 0,
                    })
                  }}
                  className="flex-1 px-4 py-3 bg-accent-green text-black rounded-lg hover:bg-green-500 transition-all font-bold"
                >
                  Try Again
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
