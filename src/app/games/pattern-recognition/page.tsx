'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import Sidebar from '@/components/layout/Sidebar'

// ─── Types ──────────────────────────────────────────────────────────────────
interface Candle {
  open: number; high: number; low: number; close: number
}

type PatternId =
  | 'double-top' | 'double-bottom' | 'head-and-shoulders'
  | 'bullish-engulfing' | 'bearish-engulfing' | 'doji' | 'hammer' | 'shooting-star'

interface PatternDef {
  id: PatternId
  name: string
  emoji: string
  signal: string
  signalColor: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  desc: string
  tip: string
}

interface Challenge {
  candles: Candle[]
  correctId: PatternId
  options: PatternDef[]
  patternStartIndex: number
}

// ─── Pattern Definitions ────────────────────────────────────────────────────
const PATTERNS: PatternDef[] = [
  {
    id: 'double-top', name: 'Double Top', emoji: '🏔️', signal: 'Bearish Reversal', signalColor: 'text-accent-red',
    difficulty: 'Easy', desc: 'Two peaks at roughly the same price level after an uptrend.',
    tip: 'Look for two rounded peaks at similar highs — the second peak failing to break higher is the key signal.',
  },
  {
    id: 'double-bottom', name: 'Double Bottom', emoji: '⛰️', signal: 'Bullish Reversal', signalColor: 'text-accent-green',
    difficulty: 'Easy', desc: 'Two troughs at roughly the same price level after a downtrend.',
    tip: 'Two lows at similar prices form a "W" shape — strong support being confirmed twice.',
  },
  {
    id: 'head-and-shoulders', name: 'Head & Shoulders', emoji: '👤', signal: 'Bearish Reversal', signalColor: 'text-accent-red',
    difficulty: 'Medium', desc: 'Left shoulder, higher head, right shoulder — forms a neckline.',
    tip: 'The middle peak (head) is highest. Both shoulders are at similar lower levels. Neckline break = sell signal.',
  },
  {
    id: 'bullish-engulfing', name: 'Bullish Engulfing', emoji: '📈', signal: 'Bullish Signal', signalColor: 'text-accent-green',
    difficulty: 'Easy', desc: 'A large green candle completely engulfs the body of the prior red candle.',
    tip: 'The green candle opens below and closes above the previous red candle\'s body. Strong buying reversal signal.',
  },
  {
    id: 'bearish-engulfing', name: 'Bearish Engulfing', emoji: '📉', signal: 'Bearish Signal', signalColor: 'text-accent-red',
    difficulty: 'Easy', desc: 'A large red candle completely engulfs the body of the prior green candle.',
    tip: 'The red candle opens above and closes below the previous green candle\'s body. Strong selling reversal signal.',
  },
  {
    id: 'doji', name: 'Doji', emoji: '➕', signal: 'Indecision', signalColor: 'text-accent-gold',
    difficulty: 'Easy', desc: 'Open and close prices are virtually equal, forming a cross shape.',
    tip: 'Neither bulls nor bears won the session. Context matters — a Doji after an uptrend signals possible reversal.',
  },
  {
    id: 'hammer', name: 'Hammer', emoji: '🔨', signal: 'Bullish Reversal', signalColor: 'text-accent-green',
    difficulty: 'Medium', desc: 'Small body near the top, long lower wick at least 2× the body size.',
    tip: 'Price was pushed down hard but buyers stepped in and drove it back up. Found at the bottom of downtrends.',
  },
  {
    id: 'shooting-star', name: 'Shooting Star', emoji: '⭐', signal: 'Bearish Reversal', signalColor: 'text-accent-red',
    difficulty: 'Medium', desc: 'Small body near the bottom, long upper wick at least 2× the body size.',
    tip: 'Price rallied high but sellers crushed it back down. Found at the top of uptrends — the inverse of a hammer.',
  },
]

// ─── Pattern Candle Generators ───────────────────────────────────────────────
const rnd = (min: number, max: number) => Math.random() * (max - min) + min

function trendCandles(count: number, startPrice: number, dir: 1 | -1, volatility = 0.018): Candle[] {
  const out: Candle[] = []
  let p = startPrice
  for (let i = 0; i < count; i++) {
    const bias = dir * rnd(0.005, 0.012)
    const open = p * (1 + rnd(-0.004, 0.004))
    const close = open * (1 + bias + rnd(-0.006, 0.006))
    const high = Math.max(open, close) * (1 + rnd(0.002, volatility * 0.6))
    const low  = Math.min(open, close) * (1 - rnd(0.002, volatility * 0.6))
    out.push({ open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2) })
    p = close
  }
  return out
}

function flatCandles(count: number, basePrice: number): Candle[] {
  return Array.from({ length: count }, () => {
    const open  = basePrice * (1 + rnd(-0.005, 0.005))
    const close = basePrice * (1 + rnd(-0.005, 0.005))
    const high  = Math.max(open, close) * (1 + rnd(0.001, 0.008))
    const low   = Math.min(open, close) * (1 - rnd(0.001, 0.008))
    return { open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2) }
  })
}

const GENERATORS: Record<PatternId, (base: number) => Candle[]> = {
  'double-top': (base) => {
    const peak = base * 1.06
    const valley = base * 1.02
    return [
      ...trendCandles(5, base, 1),            // uptrend
      ...trendCandles(3, base * 1.04, 1),     // rally to first top
      ...trendCandles(2, peak, -1),           // pullback
      ...flatCandles(2, valley),              // consolidation
      ...trendCandles(3, valley, 1),          // rally to second top (similar)
      ...trendCandles(2, peak * 0.99, -1),    // rejection & decline
      ...trendCandles(3, base * 1.01, -1),    // confirmed breakdown
    ]
  },
  'double-bottom': (base) => {
    const trough = base * 0.94
    const midBounce = base * 0.97
    return [
      ...trendCandles(5, base, -1),           // downtrend
      ...trendCandles(3, base * 0.97, -1),    // drop to first bottom
      ...trendCandles(2, trough, 1),          // bounce
      ...flatCandles(2, midBounce),           // consolidation
      ...trendCandles(3, midBounce, -1),      // second dip to similar low
      ...trendCandles(2, trough * 1.01, 1),   // bounce from support
      ...trendCandles(3, base * 0.98, 1),     // confirmed breakout
    ]
  },
  'head-and-shoulders': (base) => {
    const neckline = base * 1.01
    const leftShoulder = base * 1.05
    const head = base * 1.10
    const rightShoulder = base * 1.05
    return [
      ...trendCandles(4, base, 1),
      ...trendCandles(2, base * 1.03, 1),     // rise to left shoulder
      ...trendCandles(2, leftShoulder, -1),   // pull back to neckline
      ...trendCandles(2, neckline * 0.99, 1), // rise to head
      ...trendCandles(2, head, -1),           // drop to neckline
      ...trendCandles(2, neckline, 1),        // right shoulder rise
      ...trendCandles(2, rightShoulder, -1),  // drop, break neckline
      ...trendCandles(2, neckline * 0.97, -1),
    ]
  },
  'bullish-engulfing': (base) => {
    const downBase = base * 1.04
    const bearCandle: Candle = {
      open: +(downBase * 1.005).toFixed(2),
      close: +(downBase * 0.988).toFixed(2),
      high: +(downBase * 1.010).toFixed(2),
      low: +(downBase * 0.984).toFixed(2),
    }
    const bullCandle: Candle = {
      open: +(downBase * 0.982).toFixed(2),
      close: +(downBase * 1.012).toFixed(2),
      high: +(downBase * 1.016).toFixed(2),
      low: +(downBase * 0.979).toFixed(2),
    }
    return [
      ...trendCandles(6, base, -1),
      bearCandle,
      bullCandle,
      ...trendCandles(3, downBase * 1.01, 1),
    ]
  },
  'bearish-engulfing': (base) => {
    const upBase = base * 0.96
    const bullCandle: Candle = {
      open: +(upBase * 0.995).toFixed(2),
      close: +(upBase * 1.012).toFixed(2),
      high: +(upBase * 1.016).toFixed(2),
      low: +(upBase * 0.990).toFixed(2),
    }
    const bearCandle: Candle = {
      open: +(upBase * 1.016).toFixed(2),
      close: +(upBase * 0.984).toFixed(2),
      high: +(upBase * 1.020).toFixed(2),
      low: +(upBase * 0.980).toFixed(2),
    }
    return [
      ...trendCandles(6, base, 1),
      bullCandle,
      bearCandle,
      ...trendCandles(3, upBase * 0.99, -1),
    ]
  },
  'doji': (base) => {
    const price = base * 1.02
    const dojiCandle: Candle = {
      open: +(price).toFixed(2),
      close: +(price * 1.0008).toFixed(2),
      high: +(price * 1.018).toFixed(2),
      low:  +(price * 0.982).toFixed(2),
    }
    return [
      ...trendCandles(7, base, 1),
      dojiCandle,
      ...trendCandles(3, price, -1),
    ]
  },
  'hammer': (base) => {
    const downBase = base * 0.96
    const hammerCandle: Candle = {
      open:  +(downBase * 1.004).toFixed(2),
      close: +(downBase * 1.008).toFixed(2),
      high:  +(downBase * 1.010).toFixed(2),
      low:   +(downBase * 0.968).toFixed(2), // long lower wick
    }
    return [
      ...trendCandles(7, base, -1),
      hammerCandle,
      ...trendCandles(3, downBase * 1.005, 1),
    ]
  },
  'shooting-star': (base) => {
    const upBase = base * 1.04
    const starCandle: Candle = {
      open:  +(upBase * 0.996).toFixed(2),
      close: +(upBase * 0.992).toFixed(2),
      high:  +(upBase * 1.032).toFixed(2), // long upper wick
      low:   +(upBase * 0.989).toFixed(2),
    }
    return [
      ...trendCandles(7, base, 1),
      starCandle,
      ...trendCandles(3, upBase * 0.995, -1),
    ]
  },
}

// ─── Challenge Generator ─────────────────────────────────────────────────────
function generateChallenge(): Challenge {
  const correct = PATTERNS[Math.floor(Math.random() * PATTERNS.length)]
  const basePrice = 1000 + Math.random() * 2000

  const patternCandles = GENERATORS[correct.id](basePrice)
  const prefix = trendCandles(4, basePrice * (correct.id.includes('bottom') || correct.id === 'hammer' || correct.id === 'bullish-engulfing' ? 1.04 : 0.97), 1)
  const allCandles = [...prefix, ...patternCandles]
  const patternStartIndex = prefix.length

  // Pick 3 wrong options
  const otherPatterns = PATTERNS.filter(p => p.id !== correct.id)
  const shuffled = otherPatterns.sort(() => Math.random() - 0.5).slice(0, 3)
  const options = [...shuffled, correct].sort(() => Math.random() - 0.5)

  return { candles: allCandles, correctId: correct.id, options, patternStartIndex }
}

// ─── Canvas Chart Component ──────────────────────────────────────────────────
function PatternChart({ candles, patternStartIndex, revealed }: {
  candles: Candle[]
  patternStartIndex: number
  revealed: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || candles.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const PAD = { top: 24, right: 24, bottom: 32, left: 64 }
    const chartW = W - PAD.left - PAD.right
    const chartH = H - PAD.top - PAD.bottom

    ctx.clearRect(0, 0, W, H)

    // Price range with padding
    const highs = candles.map(c => c.high)
    const lows  = candles.map(c => c.low)
    const maxP = Math.max(...highs) * 1.008
    const minP = Math.min(...lows)  * 0.992
    const range = maxP - minP

    const toX = (i: number) => PAD.left + (i + 0.5) * (chartW / candles.length)
    const toY = (p: number) => PAD.top + ((maxP - p) / range) * chartH
    const cw  = Math.max(3, (chartW / candles.length) * 0.58)

    // Background pattern highlight zone
    if (revealed) {
      const x0 = PAD.left + patternStartIndex * (chartW / candles.length)
      const x1 = W - PAD.right
      ctx.fillStyle = 'rgba(0, 208, 132, 0.06)'
      ctx.fillRect(x0, PAD.top, x1 - x0, chartH)
      ctx.strokeStyle = 'rgba(0, 208, 132, 0.25)'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 4])
      ctx.beginPath()
      ctx.moveTo(x0, PAD.top)
      ctx.lineTo(x0, PAD.top + chartH)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Grid lines + price labels
    for (let i = 0; i <= 5; i++) {
      const y = PAD.top + (i / 5) * chartH
      ctx.strokeStyle = '#1e2d3d'
      ctx.lineWidth = 0.5
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
      const x     = toX(i)
      const isBull = c.close >= c.open
      const color  = isBull ? '#00d084' : '#ff4757'
      const isPattern = i >= patternStartIndex

      // Slightly brighter in pattern zone
      ctx.globalAlpha = isPattern ? 1 : 0.55
      ctx.strokeStyle = color
      ctx.lineWidth = 1.2

      // Wick
      ctx.beginPath()
      ctx.moveTo(x, toY(c.high))
      ctx.lineTo(x, toY(c.low))
      ctx.stroke()

      // Body
      const bodyTop = toY(Math.max(c.open, c.close))
      const bodyH   = Math.max(1.5, Math.abs(toY(c.open) - toY(c.close)))
      ctx.fillStyle = color
      ctx.fillRect(x - cw / 2, bodyTop, cw, bodyH)
    })

    ctx.globalAlpha = 1

    // Last close label
    const last = candles[candles.length - 1]
    ctx.fillStyle = '#00d084'
    ctx.font = 'bold 10px JetBrains Mono, monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`₹${last.close.toFixed(0)}`, PAD.left + chartW + 4, toY(last.close) + 4)

    // Pattern label when revealed
    if (revealed) {
      const labelX = PAD.left + patternStartIndex * (chartW / candles.length) + 6
      ctx.fillStyle = 'rgba(0, 208, 132, 0.9)'
      ctx.font = 'bold 10px JetBrains Mono, monospace'
      ctx.textAlign = 'left'
      ctx.fillText('PATTERN →', labelX, PAD.top + 14)
    }
  }, [candles, patternStartIndex, revealed])

  return (
    <canvas
      ref={canvasRef}
      width={700}
      height={300}
      className="w-full h-full"
      style={{ imageRendering: 'crisp-edges' }}
    />
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
type GameState = 'idle' | 'playing' | 'result'
type TabState = 'game' | 'library'

const TIMER_SECONDS = 45
const XP_TABLE = { Easy: 20, Medium: 35, Hard: 55 }
const COINS_TABLE = { Easy: 15, Medium: 25, Hard: 40 }

export default function PatternRecognitionPage() {
  const { user, isAuthenticated, loadFromStorage, updateUser } = useAuthStore()
  const router = useRouter()

  const [tab, setTab] = useState<TabState>('game')
  const [gameState, setGameState] = useState<GameState>('idle')
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [selected, setSelected] = useState<PatternId | null>(null)
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [roundsPlayed, setRoundsPlayed] = useState(0)
  const [totalXP, setTotalXP] = useState(0)
  const timerRef = useRef<NodeJS.Timeout>()

  useEffect(() => { loadFromStorage() }, [loadFromStorage])
  useEffect(() => { if (!isAuthenticated) router.push('/auth') }, [isAuthenticated, router])

  const startRound = useCallback(() => {
    clearInterval(timerRef.current)
    const ch = generateChallenge()
    setChallenge(ch)
    setSelected(null)
    setGameState('playing')
    setTimeLeft(TIMER_SECONDS)
  }, [])

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          setGameState('result')
          setStreak(0) // break streak on timeout
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [gameState])

  const handleAnswer = (id: PatternId) => {
    if (gameState !== 'playing' || selected) return
    clearInterval(timerRef.current)
    setSelected(id)
    setGameState('result')

    if (!challenge) return
    const correct = id === challenge.correctId
    const patternDef = PATTERNS.find(p => p.id === challenge.correctId)!
    const diff = patternDef.difficulty

    if (correct) {
      const timeBonus = Math.floor((timeLeft / TIMER_SECONDS) * 10)
      const newStreak = streak + 1
      const streakBonus = Math.min(newStreak - 1, 4) * 5
      const xp = XP_TABLE[diff] + timeBonus + streakBonus
      const coins = COINS_TABLE[diff]

      setScore(s => s + xp)
      setStreak(newStreak)
      setTotalXP(x => x + xp)
      updateUser({ xp: (user?.xp ?? 0) + xp, coins: (user?.coins ?? 0) + coins })
    } else {
      setStreak(0)
    }
    setRoundsPlayed(r => r + 1)
  }

  const correctDef = challenge ? PATTERNS.find(p => p.id === challenge.correctId) : null
  const isCorrect = selected === challenge?.correctId
  const timerPct = (timeLeft / TIMER_SECONDS) * 100
  const timerColor = timerPct > 55 ? 'bg-accent-green' : timerPct > 25 ? 'bg-accent-gold' : 'bg-accent-red'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="label mb-1">Game Mode</p>
              <h1 className="font-display font-black text-2xl text-text-primary">🔍 Pattern Recognition</h1>
              <p className="text-text-secondary text-sm mt-1">Identify chart patterns before the timer runs out</p>
            </div>
            {roundsPlayed > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <span className="stat-pill">🎯 {roundsPlayed} played</span>
                <span className="stat-pill">⚡ {totalXP} XP earned</span>
                {streak >= 2 && <span className="stat-pill text-accent-red">🔥 {streak} streak</span>}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {(['game', 'library'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg font-display font-semibold text-sm capitalize transition-all border ${
                  tab === t
                    ? 'border-accent-green bg-accent-green/10 text-accent-green'
                    : 'border-bg-border text-text-secondary hover:border-accent-green/30'
                }`}>
                {t === 'game' ? '🎮 Play Game' : '📚 Pattern Library'}
              </button>
            ))}
          </div>

          {/* ── GAME TAB ── */}
          {tab === 'game' && (
            <div className="space-y-4">

              {/* Idle / Start screen */}
              {gameState === 'idle' && (
                <div className="card p-10 text-center">
                  <div className="text-6xl mb-4">🔍</div>
                  <h2 className="font-display font-black text-2xl text-text-primary mb-2">Pattern Recognition</h2>
                  <p className="text-text-secondary text-sm max-w-md mx-auto mb-6">
                    A candlestick chart will appear. The right half of the chart contains a hidden pattern.
                    Identify it from 4 options before the {TIMER_SECONDS}s timer runs out.
                  </p>
                  <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
                    {[
                      { label: 'Easy', xp: '20–30 XP', color: 'text-accent-green' },
                      { label: 'Medium', xp: '35–50 XP', color: 'text-accent-gold' },
                      { label: 'Hard', xp: '55–70 XP', color: 'text-accent-red' },
                    ].map(d => (
                      <div key={d.label} className="card p-3 text-center">
                        <div className={`font-mono font-bold ${d.color}`}>{d.label}</div>
                        <div className="text-xs text-text-muted mt-0.5">{d.xp}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-text-muted font-mono mb-6">Speed bonus + streak bonus apply</p>
                  <button onClick={startRound} className="btn-primary px-12 py-4 text-base">
                    Start Game →
                  </button>
                </div>
              )}

              {/* Playing / Result */}
              {(gameState === 'playing' || gameState === 'result') && challenge && correctDef && (
                <>
                  {/* Timer bar */}
                  <div className="card p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="label">Time Remaining</span>
                      <span className={`font-mono font-bold ${timeLeft <= 10 ? 'text-accent-red' : 'text-text-primary'}`}>
                        {timeLeft}s
                      </span>
                    </div>
                    <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
                      <div className={`h-full ${timerColor} rounded-full transition-all duration-1000`}
                        style={{ width: `${timerPct}%` }} />
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="label">
                        {gameState === 'result' ? `Pattern: ${correctDef.name}` : 'Identify the pattern in the highlighted zone →'}
                      </span>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
                        correctDef.difficulty === 'Easy' ? 'border-accent-green/40 text-accent-green' :
                        correctDef.difficulty === 'Medium' ? 'border-accent-gold/40 text-accent-gold' :
                        'border-accent-red/40 text-accent-red'
                      }`}>{correctDef.difficulty}</span>
                    </div>
                    <div className="h-72 bg-bg-secondary rounded-lg overflow-hidden">
                      <PatternChart
                        candles={challenge.candles}
                        patternStartIndex={challenge.patternStartIndex}
                        revealed={gameState === 'result'}
                      />
                    </div>
                  </div>

                  {/* Options grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {challenge.options.map(opt => {
                      const isSelected = selected === opt.id
                      const isRight = opt.id === challenge.correctId

                      let borderClass = 'border-bg-border hover:border-accent-green/40'
                      if (gameState === 'result') {
                        if (isRight) borderClass = 'border-accent-green bg-accent-green/10'
                        else if (isSelected && !isRight) borderClass = 'border-accent-red bg-accent-red/10'
                        else borderClass = 'border-bg-border opacity-50'
                      }

                      return (
                        <button key={opt.id} onClick={() => handleAnswer(opt.id)}
                          disabled={gameState === 'result'}
                          className={`flex items-center gap-4 p-4 rounded-xl border bg-transparent transition-all duration-200 text-left ${borderClass}`}>
                          <span className="text-3xl shrink-0">{opt.emoji}</span>
                          <div className="min-w-0">
                            <div className="font-display font-bold text-text-primary text-sm">{opt.name}</div>
                            <div className={`text-xs font-mono ${opt.signalColor}`}>{opt.signal}</div>
                            {gameState === 'result' && isRight && (
                              <div className="text-xs text-text-muted mt-1 leading-snug">{opt.tip}</div>
                            )}
                          </div>
                          {gameState === 'result' && (
                            <span className="ml-auto shrink-0 text-lg">
                              {isRight ? '✅' : isSelected ? '❌' : ''}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Result panel */}
                  {gameState === 'result' && (
                    <div className={`card p-5 border-2 ${isCorrect ? 'border-accent-green/50' : timeLeft === 0 ? 'border-accent-gold/50' : 'border-accent-red/50'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-2xl">
                              {timeLeft === 0 ? '⏰' : isCorrect ? '🎯' : '📖'}
                            </span>
                            <span className={`font-display font-black text-lg ${
                              isCorrect ? 'text-accent-green' : timeLeft === 0 ? 'text-accent-gold' : 'text-accent-red'
                            }`}>
                              {timeLeft === 0 ? "Time's Up!" : isCorrect ? 'Correct!' : 'Not Quite'}
                            </span>
                            {streak >= 2 && isCorrect && (
                              <span className="text-xs font-mono text-accent-red bg-accent-red/10 px-2 py-0.5 rounded-full border border-accent-red/20">
                                🔥 {streak}× streak
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-text-secondary">
                            {isCorrect
                              ? `That's a ${correctDef.name} — ${correctDef.signal} pattern.`
                              : `It was a ${correctDef.name}. ${correctDef.desc}`}
                          </p>
                        </div>
                        {isCorrect && (
                          <div className="text-right shrink-0 ml-4">
                            <div className="value-gold font-display font-black text-xl">+{XP_TABLE[correctDef.difficulty]} XP</div>
                            <div className="text-xs text-text-muted font-mono">+{COINS_TABLE[correctDef.difficulty]} 🪙</div>
                          </div>
                        )}
                      </div>

                      <button onClick={startRound} className="btn-primary w-full mt-4">
                        Next Pattern →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── LIBRARY TAB ── */}
          {tab === 'library' && (
            <div>
              <p className="text-text-secondary text-sm mb-5">
                Study these patterns before playing. Each one appears in the game with a realistic chart.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PATTERNS.map(p => (
                  <div key={p.id} className="card p-5 border border-bg-border hover:border-accent-blue/40 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{p.emoji}</span>
                        <div>
                          <div className="font-semibold text-text-primary">{p.name}</div>
                          <div className={`text-xs font-mono ${p.signalColor}`}>{p.signal}</div>
                        </div>
                      </div>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-full border shrink-0 ${
                        p.difficulty === 'Easy' ? 'border-accent-green/30 text-accent-green' :
                        p.difficulty === 'Medium' ? 'border-accent-gold/30 text-accent-gold' :
                        'border-accent-red/30 text-accent-red'
                      }`}>{p.difficulty}</span>
                    </div>
                    <p className="text-sm text-text-secondary mb-2">{p.desc}</p>
                    <div className="bg-bg-secondary rounded-lg p-3 flex gap-2 items-start">
                      <span className="text-accent-gold text-sm shrink-0 mt-0.5">💡</span>
                      <p className="text-xs text-text-muted leading-relaxed">{p.tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}