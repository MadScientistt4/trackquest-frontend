'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

type Prediction = 'bullish' | 'bearish' | 'consolidation'
type Difficulty = 'easy' | 'medium' | 'hard'

interface ChallengeData {
  challengeId: string
  candles: Candle[]
  difficulty: Difficulty
  timeLimit: number
  hint?: string
  _correctAnswer: Prediction
}

interface ResultData {
  isCorrect: boolean
  prediction: Prediction
  correctAnswer: Prediction
  xpEarned: number
  coinsEarned: number
  score: number
  explanation: string
  newStats: { level: number; xp: number; xpToNextLevel: number; coins: number; accuracy: number }
}

function CandleChart({ candles }: { candles: Candle[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || candles.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const PAD = { top: 20, right: 20, bottom: 40, left: 60 }
    const chartW = W - PAD.left - PAD.right
    const chartH = H - PAD.top - PAD.bottom

    ctx.clearRect(0, 0, W, H)

    const allHighs = candles.map(c => c.high)
    const allLows = candles.map(c => c.low)
    const maxP = Math.max(...allHighs) * 1.005
    const minP = Math.min(...allLows) * 0.995
    const range = maxP - minP

    const toY = (price: number) => PAD.top + ((maxP - price) / range) * chartH
    const candleW = Math.max(4, (chartW / candles.length) * 0.65)
    const spacing = chartW / candles.length

    // Grid lines
    ctx.strokeStyle = '#1e2d3d'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 5; i++) {
      const y = PAD.top + (i / 5) * chartH
      ctx.beginPath()
      ctx.moveTo(PAD.left, y)
      ctx.lineTo(W - PAD.right, y)
      ctx.stroke()
      const price = maxP - (i / 5) * range
      ctx.fillStyle = '#445566'
      ctx.font = '10px JetBrains Mono, monospace'
      ctx.textAlign = 'right'
      ctx.fillText(price.toFixed(0), PAD.left - 6, y + 4)
    }

    // Candles
    candles.forEach((c, i) => {
      const x = PAD.left + i * spacing + spacing / 2
      const isBull = c.close >= c.open
      const color = isBull ? '#00d084' : '#ff4757'

      // Wick
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, toY(c.high))
      ctx.lineTo(x, toY(c.low))
      ctx.stroke()

      // Body
      ctx.fillStyle = color
      const bodyTop = toY(Math.max(c.open, c.close))
      const bodyH = Math.max(1, Math.abs(toY(c.open) - toY(c.close)))
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH)
    })

    // "?" candle placeholder
    const lastX = PAD.left + candles.length * spacing + spacing / 2
    ctx.strokeStyle = '#445566'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.strokeRect(lastX - candleW / 2, PAD.top + chartH * 0.2, candleW, chartH * 0.6)
    ctx.setLineDash([])
    ctx.fillStyle = '#445566'
    ctx.font = 'bold 14px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('?', lastX, PAD.top + chartH * 0.55)

    // Last price label
    const lastClose = candles[candles.length - 1].close
    ctx.fillStyle = '#00d084'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`₹${lastClose.toFixed(2)}`, W - PAD.right, toY(lastClose) - 4)

  }, [candles])

  return (
    <canvas
      ref={canvasRef}
      width={720}
      height={320}
      className="w-full h-full rounded-lg"
      style={{ imageRendering: 'crisp-edges' }}
    />
  )
}

export default function CandlePredictionPage() {
  const { user, isAuthenticated, loadFromStorage, updateUser } = useAuthStore()
  const router = useRouter()
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [challenge, setChallenge] = useState<ChallengeData | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ResultData | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [startTime, setStartTime] = useState<number>(0)
  const timerRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth')
  }, [isAuthenticated, router])

  const loadChallenge = useCallback(async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await gamesApi.getCandleChallenge(difficulty)
      setChallenge(res.data)
      setTimeLeft(res.data.timeLimit)
      setStartTime(Date.now())
    } catch {
      toast.error('Failed to load challenge')
    } finally {
      setLoading(false)
    }
  }, [difficulty])

  // Timer countdown
  useEffect(() => {
    if (!challenge || result || timeLeft <= 0) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          toast.error("Time's up!")
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [challenge, result])

  const handlePredict = async (prediction: Prediction) => {
    if (!challenge || submitting) return
    clearInterval(timerRef.current)
    setSubmitting(true)
    const timeSpent = Math.round((Date.now() - startTime) / 1000)
    try {
      const res = await gamesApi.submitCandlePrediction({
        prediction,
        correctAnswer: challenge._correctAnswer,
        difficulty,
        timeSpent,
      })
      setResult(res.data)
      if (res.data.newStats) {
        updateUser({
          level: res.data.newStats.level,
          xp: res.data.newStats.xp,
          xpToNextLevel: res.data.newStats.xpToNextLevel,
          coins: res.data.newStats.coins,
        })
      }
    } catch {
      toast.error('Failed to submit prediction')
    } finally {
      setSubmitting(false)
    }
  }

  const timerPercent = challenge ? (timeLeft / challenge.timeLimit) * 100 : 100
  const timerColor = timerPercent > 50 ? 'bg-accent-green' : timerPercent > 25 ? 'bg-accent-gold' : 'bg-accent-red'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="label mb-1">Game Mode</p>
              <h1 className="font-display font-black text-2xl text-text-primary">🕯️ Candle Prediction</h1>
            </div>
            {user && (
              <div className="flex items-center gap-4 text-sm">
                <span className="stat-pill">🎯 {user.stats.candlePrediction.accuracy}% accuracy</span>
                <span className="stat-pill">🎮 {user.stats.candlePrediction.played} played</span>
              </div>
            )}
          </div>

          {/* Difficulty selector */}
          {!challenge && !loading && (
            <div className="card p-8 text-center">
              <h2 className="font-display font-bold text-xl text-text-primary mb-2">Select Difficulty</h2>
              <p className="text-text-secondary text-sm mb-8">
                Analyze the chart and predict whether the next candle will be bullish, bearish, or sideways.
              </p>
              <div className="flex gap-4 justify-center flex-wrap mb-8">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`px-8 py-4 rounded-xl border font-display font-bold capitalize transition-all ${
                      difficulty === d
                        ? 'border-accent-green bg-accent-green/10 text-accent-green'
                        : 'border-bg-border text-text-secondary hover:border-accent-green/40'
                    }`}>
                    {d}
                    <div className="text-xs font-mono font-normal mt-1 text-text-muted">
                      {d === 'easy' ? '60s · 15 XP' : d === 'medium' ? '45s · 25 XP' : '30s · 40 XP'}
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={loadChallenge} className="btn-primary px-12 py-4 text-base">
                Start Challenge →
              </button>
            </div>
          )}

          {loading && (
            <div className="card p-16 text-center">
              <div className="w-8 h-8 border-2 border-bg-border border-t-accent-green rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-secondary font-mono text-sm">Loading market data...</p>
            </div>
          )}

          {challenge && !loading && (
            <div className="space-y-4">
              {/* Timer */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="label">Time Remaining</span>
                  <span className={`font-mono font-bold text-lg ${timeLeft < 10 ? 'text-accent-red' : 'text-text-primary'}`}>
                    {timeLeft}s
                  </span>
                </div>
                <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
                  <div className={`h-full ${timerColor} rounded-full transition-all duration-1000`}
                    style={{ width: `${timerPercent}%` }} />
                </div>
              </div>

              {/* Chart */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="label">Price Chart — Predict the Next Candle</span>
                  <span className="stat-pill capitalize">{difficulty}</span>
                </div>
                <div className="h-72 bg-bg-secondary rounded-lg">
                  <CandleChart candles={challenge.candles} />
                </div>
                {challenge.hint && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-accent-gold font-mono">
                    <span>💡</span> <span>{challenge.hint}</span>
                  </div>
                )}
              </div>

              {/* Prediction buttons */}
              {!result && (
                <div className="card p-6">
                  <p className="label mb-4 text-center">What happens next?</p>
                  <div className="grid grid-cols-3 gap-4">
                    {([
                      { value: 'bullish' as Prediction, icon: '📈', color: 'border-accent-green hover:bg-accent-green/10 hover:border-accent-green', label: 'Bullish', sub: 'Price goes up' },
                      { value: 'bearish' as Prediction, icon: '📉', color: 'border-accent-red hover:bg-accent-red/10 hover:border-accent-red', label: 'Bearish', sub: 'Price goes down' },
                      { value: 'consolidation' as Prediction, icon: '➡️', color: 'border-accent-blue hover:bg-accent-blue/10 hover:border-accent-blue', label: 'Sideways', sub: 'Price consolidates' },
                    ]).map(p => (
                      <button key={p.value} onClick={() => handlePredict(p.value)} disabled={submitting || timeLeft === 0}
                        className={`flex flex-col items-center gap-2 p-5 rounded-xl border bg-transparent transition-all duration-200 disabled:opacity-40 ${p.color}`}>
                        <span className="text-3xl">{p.icon}</span>
                        <span className="font-display font-bold text-text-primary">{p.label}</span>
                        <span className="text-xs text-text-muted font-mono">{p.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className={`card p-6 border-2 ${result.isCorrect ? 'border-accent-green/50' : 'border-accent-red/50'}`}>
                  <div className="text-center mb-4">
                    <div className="text-5xl mb-3">{result.isCorrect ? '🎯' : '📊'}</div>
                    <h3 className={`font-display font-black text-2xl ${result.isCorrect ? 'text-accent-green' : 'text-accent-red'}`}>
                      {result.isCorrect ? 'Correct Prediction!' : 'Not Quite Right'}
                    </h3>
                    <p className="text-text-secondary text-sm mt-2">{result.explanation}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="value-gold text-xl font-display font-bold">+{result.xpEarned}</div>
                      <div className="label">XP Earned</div>
                    </div>
                    <div className="text-center">
                      <div className="value-green text-xl font-display font-bold">{result.score}</div>
                      <div className="label">Score</div>
                    </div>
                    <div className="text-center">
                      <div className="value-gold text-xl font-display font-bold">+{result.coinsEarned}🪙</div>
                      <div className="label">Coins</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={loadChallenge} className="btn-primary flex-1">
                      Next Challenge →
                    </button>
                    <button onClick={() => { setChallenge(null); setResult(null) }} className="btn-secondary flex-1">
                      Change Difficulty
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
