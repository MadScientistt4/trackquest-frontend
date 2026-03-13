'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import Sidebar from '@/components/layout/Sidebar'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Candle {
  date: string
  open: number; high: number; low: number; close: number
  volume: number
  newsEvent?: string
}

interface ReplayEvent {
  id: string
  name: string
  subtitle: string
  emoji: string
  period: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  description: string
  lesson: string
  startPrice: number
  candles: Candle[]
  checkpoints: Checkpoint[]
  finalSummary: string
}

interface Checkpoint {
  candleIndex: number
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  xp: number
}

type Phase = 'select' | 'briefing' | 'replay' | 'checkpoint' | 'summary'

// ─── Utility ─────────────────────────────────────────────────────────────────
const rnd = (min: number, max: number) => Math.random() * (max - min) + min
const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 })

function makeCandle(prev: number, open: number, drift: number, volatility: number, date: string, news?: string): Candle {
  const close = open * (1 + drift + rnd(-volatility, volatility))
  const bodyH = Math.abs(close - open)
  const high = Math.max(open, close) + bodyH * rnd(0.1, 0.6)
  const low  = Math.min(open, close) - bodyH * rnd(0.1, 0.6)
  return {
    date,
    open:   +open.toFixed(2),
    high:   +high.toFixed(2),
    low:    +low.toFixed(2),
    close:  +close.toFixed(2),
    volume: Math.floor(rnd(800_000, 4_000_000)),
    newsEvent: news,
  }
}

function dateStr(base: Date, addDays: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + addDays)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
}

// ─── Scenario Builders ────────────────────────────────────────────────────────
function buildCovidCrash(): Candle[] {
  const base = new Date('2020-01-15')
  const candles: Candle[] = []
  let p = 12430; let d = 0

  // Pre-crash calm (Jan)
  for (let i = 0; i < 14; i++, d++) {
    const c = makeCandle(p, p * (1 + rnd(-0.003, 0.003)), rnd(0, 0.005), 0.009, dateStr(base, d),
      i === 7 ? '🦠 First COVID cases reported in China' : undefined)
    candles.push(c); p = c.close
  }
  // Early concern (Feb 1–14)
  for (let i = 0; i < 10; i++, d++) {
    const c = makeCandle(p, p * (1 + rnd(-0.004, 0.002)), -0.008, 0.012, dateStr(base, d),
      i === 3 ? '⚠️ WHO declares global health emergency' : undefined)
    candles.push(c); p = c.close
  }
  // Panic begins (Feb 15 – Mar 5) — gradual slide
  for (let i = 0; i < 12; i++, d++) {
    const c = makeCandle(p, p * (1 + rnd(-0.005, 0.002)), -0.016, 0.018, dateStr(base, d),
      i === 6 ? '📉 Global markets start falling sharply' : undefined)
    candles.push(c); p = c.close
  }
  // Full crash (Mar 6 – 23) — -30% in 3 weeks
  for (let i = 0; i < 13; i++, d++) {
    const intensity = 0.024 + i * 0.002
    const c = makeCandle(p, p * (1 + rnd(-0.008, 0.002)), -intensity, 0.025, dateStr(base, d),
      i === 2  ? '🚨 India records first COVID death' :
      i === 6  ? '🔒 India announces national lockdown' :
      i === 10 ? '🏦 SEBI halts circuit breakers triggered' : undefined)
    candles.push(c); p = c.close
  }
  // Dead-cat bounce + more drop
  for (let i = 0; i < 5; i++, d++) {
    const c = makeCandle(p, p * (1 + rnd(-0.003, 0.006)), i < 2 ? 0.012 : -0.018, 0.02, dateStr(base, d),
      i === 1 ? '💊 "V-shaped recovery" hopes emerge' : undefined)
    candles.push(c); p = c.close
  }
  // Bottom & stabilisation
  for (let i = 0; i < 6; i++, d++) {
    const c = makeCandle(p, p * (1 + rnd(-0.003, 0.005)), rnd(-0.004, 0.008), 0.014, dateStr(base, d),
      i === 2 ? '🏛️ RBI emergency rate cut announced' : undefined)
    candles.push(c); p = c.close
  }
  return candles
}

function buildCovidRecovery(): Candle[] {
  const base = new Date('2020-04-01')
  const candles: Candle[] = []
  let p = 7511; let d = 0

  // Initial bounce (Apr)
  for (let i = 0; i < 18; i++, d++) {
    const c = makeCandle(p, p * (1 + rnd(-0.003, 0.005)), 0.009, 0.015, dateStr(base, d),
      i === 3  ? '💰 RBI cuts repo rate to 4.4%' :
      i === 10 ? '📦 Govt announces ₹20L Cr stimulus package' : undefined)
    candles.push(c); p = c.close
  }
  // Uncertainty & consolidation (May–Jun)
  for (let i = 0; i < 20; i++, d++) {
    const c = makeCandle(p, p * (1 + rnd(-0.004, 0.004)), rnd(-0.003, 0.006), 0.013, dateStr(base, d),
      i === 8 ? '😰 Q1 GDP contracts -23.9%' :
      i === 16 ? '💉 Vaccine trials show promising results' : undefined)
    candles.push(c); p = c.close
  }
  // Strong rally begins (Jul–Dec)
  for (let i = 0; i < 28; i++, d++) {
    const drift = 0.008 + (i / 28) * 0.006
    const c = makeCandle(p, p * (1 + rnd(-0.003, 0.005)), drift, 0.012, dateStr(base, d),
      i === 5  ? '📱 Reliance-Facebook deal boosts sentiment' :
      i === 14 ? '💉 Pfizer vaccine 90% effective — markets surge' :
      i === 22 ? '🎯 NIFTY crosses pre-COVID levels' : undefined)
    candles.push(c); p = c.close
  }
  // 2021 continuation
  for (let i = 0; i < 16; i++, d++) {
    const c = makeCandle(p, p * (1 + rnd(-0.003, 0.006)), 0.012, 0.014, dateStr(base, d),
      i === 6 ? '🇮🇳 India begins world\'s largest vaccine drive' :
      i === 13 ? '📈 NIFTY hits all-time high 18,000' : undefined)
    candles.push(c); p = c.close
  }
  return candles
}

function buildAdaniCrash(): Candle[] {
  const base = new Date('2023-01-02')
  const candles: Candle[] = []
  let p = 3890; let d = 0

  // Pre-crash stable
  for (let i = 0; i < 16; i++, d++) {
    const c = makeCandle(p, p * (1 + rnd(-0.003, 0.004)), rnd(0, 0.005), 0.01, dateStr(base, d))
    candles.push(c); p = c.close
  }
  // Hindenburg report drop
  for (let i = 0; i < 4; i++, d++) {
    const c = makeCandle(p, p * (1 + rnd(-0.005, 0.001)), -0.045, 0.02, dateStr(base, d),
      i === 0 ? '💣 Hindenburg Research releases short-seller report' :
      i === 2 ? '📰 Adani denies all allegations' : undefined)
    candles.push(c); p = c.close
  }
  // FPO drama + continuous fall
  for (let i = 0; i < 8; i++, d++) {
    const c = makeCandle(p, p * (1 + rnd(-0.006, 0.002)), -0.038, 0.022, dateStr(base, d),
      i === 1 ? '🚫 Adani pulls ₹20,000 Cr FPO amid rout' :
      i === 5 ? '🏦 Foreign investors exit positions' : undefined)
    candles.push(c); p = c.close
  }
  // Bounce attempt
  for (let i = 0; i < 5; i++, d++) {
    const c = makeCandle(p, p * (1 + rnd(-0.003, 0.006)), i < 2 ? 0.015 : -0.02, 0.02, dateStr(base, d),
      i === 0 ? '💰 GQG Partners buys ₹15,446 Cr stake' : undefined)
    candles.push(c); p = c.close
  }
  // Further slide + stabilisation
  for (let i = 0; i < 12; i++, d++) {
    const c = makeCandle(p, p * (1 + rnd(-0.004, 0.004)), rnd(-0.008, 0.004), 0.016, dateStr(base, d),
      i === 8 ? '📋 SEBI begins investigation' : undefined)
    candles.push(c); p = c.close
  }
  return candles
}

function buildNiftyBullRun2023(): Candle[] {
  const base = new Date('2023-03-15')
  const candles: Candle[] = []
  let p = 16800; let d = 0

  for (let i = 0; i < 12; i++, d++) {
    const c = makeCandle(p, p * (1 + rnd(-0.003, 0.004)), rnd(0.002, 0.007), 0.011, dateStr(base, d),
      i === 4 ? '🇮🇳 India becomes world\'s most populous nation' : undefined)
    candles.push(c); p = c.close
  }
  for (let i = 0; i < 16; i++, d++) {
    const c = makeCandle(p, p * (1 + rnd(-0.003, 0.005)), 0.006, 0.012, dateStr(base, d),
      i === 3  ? '💹 FII inflows turn positive — ₹12,000 Cr' :
      i === 11 ? '🏦 RBI pauses rate hikes' : undefined)
    candles.push(c); p = c.close
  }
  for (let i = 0; i < 14; i++, d++) {
    const c = makeCandle(p, p * (1 + rnd(-0.002, 0.005)), 0.009, 0.01, dateStr(base, d),
      i === 5  ? '📦 GST collections hit record ₹1.87L Cr' :
      i === 12 ? '🎯 NIFTY breaches 20,000 for first time' : undefined)
    candles.push(c); p = c.close
  }
  for (let i = 0; i < 10; i++, d++) {
    const c = makeCandle(p, p * (1 + rnd(-0.003, 0.004)), rnd(0.003, 0.01), 0.011, dateStr(base, d),
      i === 7 ? '🌟 India GDP growth 7.8% — fastest major economy' : undefined)
    candles.push(c); p = c.close
  }
  return candles
}

// ─── Scenarios ────────────────────────────────────────────────────────────────
const SCENARIOS: ReplayEvent[] = [
  {
    id: 'covid-crash',
    name: 'COVID-19 Market Crash',
    subtitle: 'NIFTY50 · Jan–Apr 2020',
    emoji: '🦠',
    period: 'Jan – Apr 2020',
    difficulty: 'Medium',
    description: 'NIFTY50 fell 38% in just 6 weeks — one of the fastest market crashes in history. Panic selling, circuit breakers triggered, and global uncertainty.',
    lesson: 'Markets can fall far faster than they rise. Staying calm and understanding that crashes are temporary is the key lesson.',
    startPrice: 12430,
    candles: buildCovidCrash(),
    checkpoints: [
      {
        candleIndex: 13,
        question: 'Markets are starting to fall on COVID fears. What should you do?',
        options: ['Sell everything immediately', 'Hold — could be temporary noise', 'Buy more — "buy the dip"', 'Invest in pharma stocks only'],
        correctIndex: 1,
        explanation: 'Early in a scare, it\'s impossible to know the scale. Panic selling locks in losses. Holding while monitoring was the rational move.',
        xp: 30,
      },
      {
        candleIndex: 30,
        question: 'Markets down 20%. Lockdown announced. What now?',
        options: ['Stop SIPs immediately', 'Increase SIP amount if possible', 'Withdraw all mutual funds', 'Short the market'],
        correctIndex: 1,
        explanation: 'Market crashes are the best time to accumulate if you have a long horizon. Increasing SIP during a crash buys more units at lower prices.',
        xp: 40,
      },
      {
        candleIndex: 48,
        question: 'NIFTY has bottomed and is bouncing. What\'s the lesson here?',
        options: ['Always keep cash to buy dips', 'Timing the market is easy', 'Crashes last forever', 'FDs are better than equities'],
        correctIndex: 0,
        explanation: 'Having 10–20% cash reserve lets you deploy capital during extreme fear. The investors who bought in March 2020 saw 3x returns by 2021.',
        xp: 35,
      },
    ],
    finalSummary: 'NIFTY fell from 12,430 to 7,511 (-38%) in 6 weeks. Investors who held or bought during the crash saw 150%+ returns by Oct 2021. The crash taught millions about market psychology and the power of staying invested.',
  },
  {
    id: 'covid-recovery',
    name: 'Post-COVID Bull Run',
    subtitle: 'NIFTY50 · Apr 2020 – Sep 2021',
    emoji: '🚀',
    period: 'Apr 2020 – Sep 2021',
    difficulty: 'Easy',
    description: 'The fastest recovery in Indian market history. NIFTY went from 7,511 to 18,000 — a 140% rally in 18 months fuelled by stimulus, vaccine hopes, and FII inflows.',
    lesson: 'Staying invested during uncertainty and panic beats trying to time the perfect re-entry. The best days often follow the worst.',
    startPrice: 7511,
    candles: buildCovidRecovery(),
    checkpoints: [
      {
        candleIndex: 15,
        question: 'Market is recovering but COVID cases are still rising. You\'re nervous. What do you do?',
        options: ['Wait for "all clear" before investing', 'Continue SIPs regardless', 'Buy only large-cap blue chips', 'Exit equities entirely'],
        correctIndex: 1,
        explanation: 'Markets price in the future, not the present. By the time the news is "all clear", prices are already much higher. Continuing SIPs was the optimal strategy.',
        xp: 25,
      },
      {
        candleIndex: 40,
        question: 'NIFTY has recovered to pre-COVID levels. Is it "too late" to invest?',
        options: ['Yes — the rally is over', 'No — India\'s growth story is long-term', 'Partially correct — wait for correction', 'Switch to gold instead'],
        correctIndex: 1,
        explanation: 'Investors said the same thing at NIFTY 8000, 10000, 12000, 15000. India\'s long-term structural growth story means there is rarely a "too late" for patient investors.',
        xp: 30,
      },
      {
        candleIndex: 58,
        question: 'NIFTY hits all-time high 18,000. What\'s your action?',
        options: ['Take all profits — ATH is scary', 'Rebalance: take partial profits and hold rest', 'Invest more aggressively', 'Nothing — stay the course with SIPs'],
        correctIndex: 1,
        explanation: 'At ATHs, rebalancing is wise — take some profits from equity, rebalance to your target allocation. Neither full exit nor ignoring valuations is optimal.',
        xp: 35,
      },
    ],
    finalSummary: 'NIFTY surged from 7,511 to 18,000 — a 140% gain in 18 months. Investors who stayed invested through the crash and recovery saw life-changing returns. This is the power of staying the course.',
  },
  {
    id: 'adani-crash',
    name: 'Adani Group Crisis',
    subtitle: 'Adani Enterprises · Jan–Mar 2023',
    emoji: '💥',
    period: 'Jan – Mar 2023',
    difficulty: 'Hard',
    description: 'Hindenburg Research published a damning short-seller report on the Adani Group, wiping out $120 billion in market cap in days and forcing a massive FPO cancellation.',
    lesson: 'Concentration risk is real. Understanding corporate governance, debt levels, and promoter pledging matters before investing in any single stock.',
    startPrice: 3890,
    candles: buildAdaniCrash(),
    checkpoints: [
      {
        candleIndex: 17,
        question: 'A credible short-seller drops a 100-page report alleging fraud. Stock falls 15% instantly. What do you do?',
        options: ['Buy the dip immediately — it\'ll recover', 'Sell everything before it falls more', 'Read the report before deciding', 'Ignore it — it\'s just short sellers'],
        correctIndex: 2,
        explanation: 'Never buy or sell based on panic. Reading the primary document (the 106-page Hindenburg report) and understanding the allegations is essential before acting.',
        xp: 40,
      },
      {
        candleIndex: 28,
        question: 'Stock down 40%. The company cancels its ₹20,000 Cr FPO. What does this signal?',
        options: ['Great time to buy — huge discount', 'Serious underlying problems', 'Temporary panic — nothing fundamental', 'Government will bail them out'],
        correctIndex: 1,
        explanation: 'A cancelled FPO signals that institutional investors lost confidence. When a company withdraws a capital raise, it is a serious warning sign about the health of the business.',
        xp: 45,
      },
      {
        candleIndex: 38,
        question: 'Warren Buffett\'s GQG Partners buys a $1.87B stake. Stock bounces 20%. What\'s the lesson?',
        options: ['GQG buying confirms the stock is safe now', 'One investor\'s view doesn\'t validate a thesis', 'Always follow what institutions do', 'The bottom is confirmed — go all in'],
        correctIndex: 1,
        explanation: 'GQG has a different risk tolerance, time horizon, and portfolio than you. Their buying does not validate the investment for retail investors. Do your own analysis.',
        xp: 50,
      },
    ],
    finalSummary: 'Adani Enterprises fell from ₹3,890 to ₹1,017 (-74%) in 4 weeks. Key lessons: never concentrate more than 5% in one stock, understand debt and promoter pledging, and always read primary documents before investing.',
  },
  {
    id: 'nifty-2023',
    name: 'NIFTY 20,000 Milestone',
    subtitle: 'NIFTY50 · Mar – Sep 2023',
    emoji: '🎯',
    period: 'Mar – Sep 2023',
    difficulty: 'Easy',
    description: 'India\'s NIFTY50 crossed the historic 20,000 mark for the first time, driven by strong GDP growth, FII inflows, and India becoming the world\'s most populous nation.',
    lesson: 'Secular bull markets in growing economies reward patience. India\'s structural growth story makes it one of the most compelling long-term investment destinations.',
    startPrice: 16800,
    candles: buildNiftyBullRun2023(),
    checkpoints: [
      {
        candleIndex: 10,
        question: 'FIIs are pouring money into Indian markets. What does this signal?',
        options: ['Always follow FII flows blindly', 'Global confidence in India\'s growth story', 'Time to sell — foreigners are taking over', 'Only buy Nifty50 stocks FIIs are buying'],
        correctIndex: 1,
        explanation: 'FII inflows reflect global conviction in India\'s macroeconomic fundamentals — GDP growth, demographics, and policy stability. It is a positive signal, not a trigger to blindly copy.',
        xp: 25,
      },
      {
        candleIndex: 28,
        question: 'NIFTY approaching 20,000 — a psychological barrier. Many say "it\'s overvalued." What do you do?',
        options: ['Exit — ATHs always reverse', 'Check P/E ratios before deciding', 'Invest more — momentum is strong', 'Switch to international funds'],
        correctIndex: 1,
        explanation: 'Valuation matters more than round numbers. NIFTY P/E above 24 signals caution; below 20 signals value. Always check fundamentals, not just price levels.',
        xp: 35,
      },
      {
        candleIndex: 42,
        question: 'India\'s GDP grows 7.8% — fastest major economy. How does this affect your investment horizon?',
        options: ['Short-term trading is better now', 'Confirms long-term equity allocation is right', 'Move to debt funds — economy is peaking', 'GDP growth doesn\'t affect markets'],
        correctIndex: 1,
        explanation: 'GDP growth translates to corporate earnings growth over time. A 7-8% GDP growth supports a long-term equity allocation in Indian markets for patient investors.',
        xp: 30,
      },
    ],
    finalSummary: 'NIFTY50 rallied from 16,800 to 20,200 (+20%) in 6 months. More importantly, it crossed a historic milestone that reinforced India\'s position as a global investment destination. Long-term SIP investors continued to be rewarded.',
  },
]

// ─── Canvas Chart Component ───────────────────────────────────────────────────
function ReplayChart({
  allCandles, visibleCount, width = 700, height = 320,
}: {
  allCandles: Candle[]; visibleCount: number; width?: number; height?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const visible = allCandles.slice(0, visibleCount)
    if (visible.length === 0) return

    const W = canvas.width, H = canvas.height
    const PAD = { top: 28, right: 80, bottom: 36, left: 64 }
    const chartW = W - PAD.left - PAD.right
    const chartH = H - PAD.top - PAD.bottom

    ctx.clearRect(0, 0, W, H)

    const highs = visible.map(c => c.high)
    const lows  = visible.map(c => c.low)
    const maxP  = Math.max(...highs) * 1.01
    const minP  = Math.min(...lows)  * 0.99
    const range = maxP - minP || 1

    // Show max 60 candles at once; scroll window
    const windowSize = Math.min(visible.length, 60)
    const windowStart = Math.max(0, visible.length - windowSize)
    const windowCandles = visible.slice(windowStart)

    const toY = (p: number) => PAD.top + ((maxP - p) / range) * chartH
    const toX = (i: number) => PAD.left + (i + 0.5) * (chartW / windowSize)
    const cw   = Math.max(3, (chartW / windowSize) * 0.62)

    // Background
    ctx.fillStyle = '#0f1419'
    ctx.fillRect(0, 0, W, H)

    // Grid
    for (let i = 0; i <= 5; i++) {
      const y = PAD.top + (i / 5) * chartH
      ctx.strokeStyle = '#1a2332'; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke()
      ctx.fillStyle = '#445566'; ctx.font = '9px JetBrains Mono, monospace'; ctx.textAlign = 'right'
      ctx.fillText(fmt(maxP - (i / 5) * range), PAD.left - 5, y + 3)
    }

    // Candles
    windowCandles.forEach((c, i) => {
      const x = toX(i)
      const isBull = c.close >= c.open
      const color = isBull ? '#00d084' : '#ff4757'

      ctx.strokeStyle = color; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, toY(c.high)); ctx.lineTo(x, toY(c.low)); ctx.stroke()

      const top = toY(Math.max(c.open, c.close))
      const bh  = Math.max(1.5, Math.abs(toY(c.open) - toY(c.close)))
      ctx.fillStyle = color
      ctx.fillRect(x - cw / 2, top, cw, bh)
    })

    // News event markers on last visible candle
    const last = windowCandles[windowCandles.length - 1]
    if (last?.newsEvent) {
      const lx = toX(windowCandles.length - 1)
      ctx.strokeStyle = '#f5c842'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3])
      ctx.beginPath(); ctx.moveTo(lx, PAD.top); ctx.lineTo(lx, PAD.top + chartH); ctx.stroke()
      ctx.setLineDash([])
    }

    // Current price label
    if (windowCandles.length > 0) {
      const last = windowCandles[windowCandles.length - 1]
      const y = toY(last.close)
      ctx.fillStyle = last.close >= last.open ? '#00d084' : '#ff4757'
      ctx.fillRect(W - PAD.right + 4, y - 9, 68, 16)
      ctx.fillStyle = '#0a0d0f'; ctx.font = 'bold 9px JetBrains Mono, monospace'; ctx.textAlign = 'left'
      ctx.fillText(`₹${fmt(last.close)}`, W - PAD.right + 7, y + 4)
    }

    // Date labels at bottom
    const labelStep = Math.max(1, Math.floor(windowSize / 6))
    ctx.fillStyle = '#445566'; ctx.font = '9px JetBrains Mono, monospace'; ctx.textAlign = 'center'
    windowCandles.forEach((c, i) => {
      if (i % labelStep === 0 || i === windowCandles.length - 1) {
        ctx.fillText(c.date, toX(i), H - 6)
      }
    })
  }, [allCandles, visibleCount])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full rounded-lg"
      style={{ imageRendering: 'crisp-edges', height: `${height}px` }}
    />
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function MarketReplayPage() {
  const { user, isAuthenticated, loadFromStorage, updateUser } = useAuthStore()
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('select')
  const [selected, setSelected] = useState<ReplayEvent | null>(null)
  const [visibleCount, setVisibleCount] = useState(1)
  const [speed, setSpeed] = useState(300) // ms per candle
  const [playing, setPlaying] = useState(false)
  const [activeCheckpoint, setActiveCheckpoint] = useState<Checkpoint | null>(null)
  const [chosenAnswer, setChosenAnswer] = useState<number | null>(null)
  const [totalXP, setTotalXP] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [shownCheckpoints, setShownCheckpoints] = useState<Set<number>>(new Set())
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => { loadFromStorage() }, [loadFromStorage])
  useEffect(() => { if (!isAuthenticated) router.push('/auth') }, [isAuthenticated, router])

  const startScenario = (ev: ReplayEvent) => {
    setSelected(ev)
    setVisibleCount(1)
    setPlaying(false)
    setTotalXP(0)
    setCorrectAnswers(0)
    setShownCheckpoints(new Set())
    setActiveCheckpoint(null)
    setChosenAnswer(null)
    setPhase('briefing')
  }

  const tick = useCallback(() => {
    if (!selected) return
    setVisibleCount(v => {
      const next = v + 1
      // Check for checkpoint
      const cp = selected.checkpoints.find(c => c.candleIndex === next)
      if (cp) {
        setShownCheckpoints(prev => {
          if (prev.has(cp.candleIndex)) return prev
          clearInterval(intervalRef.current)
          setPlaying(false)
          setActiveCheckpoint(cp)
          setChosenAnswer(null)
          setPhase('checkpoint')
          return new Set([...prev, cp.candleIndex])
        })
      }
      if (next >= selected.candles.length) {
        clearInterval(intervalRef.current)
        setPlaying(false)
        setPhase('summary')
        return selected.candles.length
      }
      return next
    })
  }, [selected])

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(tick, speed)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [playing, speed, tick])

  const handleAnswer = (idx: number) => {
    if (!activeCheckpoint || chosenAnswer !== null) return
    setChosenAnswer(idx)
    const correct = idx === activeCheckpoint.correctIndex
    if (correct) {
      setTotalXP(x => x + activeCheckpoint.xp)
      setCorrectAnswers(c => c + 1)
      updateUser({ xp: (user?.xp ?? 0) + activeCheckpoint.xp, coins: (user?.coins ?? 0) + 15 })
    }
  }

  const resumeReplay = () => {
    setActiveCheckpoint(null)
    setChosenAnswer(null)
    setPhase('replay')
    setPlaying(true)
  }

  const currentCandle = selected && visibleCount > 0
    ? selected.candles[visibleCount - 1] : null

  const priceChange = selected && visibleCount > 1
    ? ((selected.candles[visibleCount - 1].close - selected.candles[0].open) / selected.candles[0].open * 100)
    : 0

  const SPEEDS = [
    { label: '0.5×', ms: 600 },
    { label: '1×', ms: 300 },
    { label: '2×', ms: 150 },
    { label: '4×', ms: 75 },
  ]

  const diffColor = (d: string) =>
    d === 'Easy' ? 'border-accent-green/30 text-accent-green bg-accent-green/5' :
    d === 'Medium' ? 'border-accent-gold/30 text-accent-gold bg-accent-gold/5' :
    'border-accent-red/30 text-accent-red bg-accent-red/5'

  // ── SELECT SCREEN ──
  if (phase === 'select') {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="mb-8">
              <p className="label mb-1">Game Mode</p>
              <h1 className="font-display font-black text-2xl text-text-primary">📺 Market Replay</h1>
              <p className="text-text-secondary text-sm mt-1">
                Relive historic Indian market events candle by candle. Answer questions at key moments to earn XP.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SCENARIOS.map(ev => (
                <button key={ev.id} onClick={() => startScenario(ev)}
                  className="card p-6 text-left hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200 border border-bg-border hover:border-purple-400/40 group">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-4xl">{ev.emoji}</span>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${diffColor(ev.difficulty)}`}>
                      {ev.difficulty}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-text-primary text-lg mb-0.5 group-hover:text-purple-300 transition-colors">
                    {ev.name}
                  </h3>
                  <p className="text-xs font-mono text-text-muted mb-3">{ev.period}</p>
                  <p className="text-sm text-text-secondary leading-relaxed mb-4">{ev.description}</p>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-text-muted">{ev.candles.length} candles · {ev.checkpoints.length} questions</span>
                    <span className="text-purple-400">
                      {ev.checkpoints.reduce((s, c) => s + c.xp, 0)} XP possible
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── BRIEFING SCREEN ──
  if (phase === 'briefing' && selected) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-12">
            <div className="card p-10 text-center">
              <div className="text-6xl mb-5">{selected.emoji}</div>
              <span className={`inline-block text-xs font-mono px-3 py-1 rounded-full border mb-4 ${diffColor(selected.difficulty)}`}>
                {selected.difficulty}
              </span>
              <h2 className="font-display font-black text-2xl text-text-primary mb-1">{selected.name}</h2>
              <p className="text-text-muted font-mono text-sm mb-6">{selected.period}</p>
              <p className="text-text-secondary leading-relaxed max-w-lg mx-auto mb-8">{selected.description}</p>

              <div className="bg-bg-secondary rounded-xl p-5 mb-8 text-left max-w-md mx-auto">
                <div className="label mb-2">What you will learn</div>
                <p className="text-sm text-text-secondary leading-relaxed">{selected.lesson}</p>
              </div>

              <div className="flex items-center justify-center gap-6 text-xs font-mono text-text-muted mb-8">
                <span>📊 {selected.candles.length} candles</span>
                <span>❓ {selected.checkpoints.length} decision points</span>
                <span>⚡ up to {selected.checkpoints.reduce((s, c) => s + c.xp, 0)} XP</span>
              </div>

              <div className="flex gap-3 justify-center">
                <button onClick={() => { setPhase('replay'); setPlaying(true) }} className="btn-primary px-10 py-3">
                  Start Replay →
                </button>
                <button onClick={() => setPhase('select')} className="btn-secondary px-6 py-3">
                  ← Back
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── REPLAY SCREEN ──
  if ((phase === 'replay' || phase === 'checkpoint') && selected) {
    const progressPct = Math.round((visibleCount / selected.candles.length) * 100)

    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-6">

            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <button onClick={() => { clearInterval(intervalRef.current); setPhase('select') }}
                  className="text-xs font-mono text-text-muted hover:text-text-primary mb-1 flex items-center gap-1">
                  ← All Scenarios
                </button>
                <h2 className="font-display font-bold text-lg text-text-primary">{selected.emoji} {selected.name}</h2>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {totalXP > 0 && <span className="stat-pill value-gold">⚡ {totalXP} XP</span>}
                <span className={`font-mono font-bold text-base ${priceChange >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs font-mono text-text-muted mb-1">
                <span>Candle {visibleCount} / {selected.candles.length}</span>
                <span>{currentCandle?.date}</span>
              </div>
              <div className="h-1 bg-bg-border rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all duration-200"
                  style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            {/* Price stats */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Open', value: currentCandle ? `₹${fmt(currentCandle.open)}` : '—', color: 'text-text-primary' },
                { label: 'High', value: currentCandle ? `₹${fmt(currentCandle.high)}` : '—', color: 'text-accent-green' },
                { label: 'Low',  value: currentCandle ? `₹${fmt(currentCandle.low)}` : '—',  color: 'text-accent-red' },
                { label: 'Close', value: currentCandle ? `₹${fmt(currentCandle.close)}` : '—',
                  color: currentCandle && currentCandle.close >= currentCandle.open ? 'text-accent-green' : 'text-accent-red' },
              ].map(s => (
                <div key={s.label} className="card p-3 text-center">
                  <div className="label mb-1">{s.label}</div>
                  <div className={`font-mono font-bold text-sm ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="card p-3 mb-4 bg-bg-secondary">
              <ReplayChart allCandles={selected.candles} visibleCount={visibleCount} height={320} />
            </div>

            {/* News event */}
            {currentCandle?.newsEvent && (
              <div className="card p-3 mb-4 border border-accent-gold/30 bg-accent-gold/5 flex items-center gap-3">
                <span className="text-xl shrink-0">📰</span>
                <span className="text-sm text-accent-gold font-mono">{currentCandle.newsEvent}</span>
              </div>
            )}

            {/* Controls */}
            {phase === 'replay' && (
              <div className="card p-4 flex items-center gap-4 flex-wrap">
                <button onClick={() => setPlaying(p => !p)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold transition-all border ${
                    playing
                      ? 'bg-accent-red/10 border-accent-red/40 text-accent-red hover:bg-accent-red/20'
                      : 'bg-accent-green/10 border-accent-green/40 text-accent-green hover:bg-accent-green/20'
                  }`}>
                  {playing ? '⏸' : '▶'}
                </button>

                <button
                  onClick={() => setVisibleCount(v => Math.max(1, v - 1))}
                  disabled={playing || visibleCount <= 1}
                  className="w-10 h-10 rounded-lg border border-bg-border text-text-secondary hover:border-accent-green/40 hover:text-text-primary disabled:opacity-30 flex items-center justify-center text-lg transition-all">
                  ◀
                </button>

                <button
                  onClick={() => tick()}
                  disabled={playing}
                  className="w-10 h-10 rounded-lg border border-bg-border text-text-secondary hover:border-accent-green/40 hover:text-text-primary disabled:opacity-30 flex items-center justify-center text-lg transition-all">
                  ▶
                </button>

                <div className="flex items-center gap-2 ml-2">
                  <span className="label">Speed:</span>
                  {SPEEDS.map(s => (
                    <button key={s.ms} onClick={() => setSpeed(s.ms)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                        speed === s.ms
                          ? 'border-purple-400 bg-purple-400/10 text-purple-300'
                          : 'border-bg-border text-text-muted hover:border-purple-400/40'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="ml-auto flex items-center gap-2">
                  {selected.checkpoints.map((cp, i) => (
                    <div key={i} className={`w-2.5 h-2.5 rounded-full border ${
                      shownCheckpoints.has(cp.candleIndex)
                        ? (correctAnswers > i ? 'bg-accent-green border-accent-green' : 'bg-accent-red border-accent-red')
                        : 'border-bg-border bg-transparent'
                    }`} title={`Checkpoint ${i + 1}`} />
                  ))}
                  <span className="text-xs font-mono text-text-muted ml-1">checkpoints</span>
                </div>
              </div>
            )}

            {/* Checkpoint overlay */}
            {phase === 'checkpoint' && activeCheckpoint && (
              <div className="card p-6 border-2 border-accent-gold/40 bg-accent-gold/5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">❓</span>
                  <span className="font-display font-bold text-text-primary text-lg">Decision Point</span>
                  <span className="text-xs font-mono text-accent-gold ml-auto">+{activeCheckpoint.xp} XP if correct</span>
                </div>
                <p className="text-text-primary font-medium mb-5">{activeCheckpoint.question}</p>

                <div className="grid grid-cols-1 gap-2 mb-4">
                  {activeCheckpoint.options.map((opt, i) => {
                    const isChosen  = chosenAnswer === i
                    const isCorrect = i === activeCheckpoint.correctIndex
                    let cls = 'border-bg-border hover:border-accent-green/40 text-text-secondary hover:text-text-primary'
                    if (chosenAnswer !== null) {
                      if (isCorrect) cls = 'border-accent-green bg-accent-green/10 text-accent-green'
                      else if (isChosen) cls = 'border-accent-red bg-accent-red/10 text-accent-red'
                      else cls = 'border-bg-border opacity-40 text-text-muted'
                    }
                    return (
                      <button key={i} onClick={() => handleAnswer(i)}
                        disabled={chosenAnswer !== null}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left text-sm ${cls}`}>
                        <span>{opt}</span>
                        {chosenAnswer !== null && (
                          <span className="text-base ml-3">{isCorrect ? '✅' : isChosen ? '❌' : ''}</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {chosenAnswer !== null && (
                  <div className="bg-bg-secondary rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <span className="text-accent-gold shrink-0">💡</span>
                      <p className="text-sm text-text-secondary leading-relaxed">{activeCheckpoint.explanation}</p>
                    </div>
                    {chosenAnswer === activeCheckpoint.correctIndex && (
                      <div className="mt-2 text-xs font-mono text-accent-green">+{activeCheckpoint.xp} XP earned!</div>
                    )}
                  </div>
                )}

                {chosenAnswer !== null && (
                  <button onClick={resumeReplay} className="btn-primary w-full py-3">
                    Continue Replay →
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  // ── SUMMARY SCREEN ──
  if (phase === 'summary' && selected) {
    const maxXP   = selected.checkpoints.reduce((s, c) => s + c.xp, 0)
    const pct     = maxXP > 0 ? Math.round((totalXP / maxXP) * 100) : 0
    const grade   = pct >= 90 ? 'A+' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : 'D'
    const gradeColor = { 'A+': 'text-accent-green', A: 'text-accent-green', B: 'text-accent-blue', C: 'text-accent-gold', D: 'text-accent-red' }[grade]

    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-12">
            <div className="card p-10">
              {/* Grade */}
              <div className="text-center mb-8">
                <div className="text-5xl mb-3">{selected.emoji}</div>
                <h2 className="font-display font-black text-2xl text-text-primary mb-1">Replay Complete!</h2>
                <p className="text-text-muted font-mono text-sm">{selected.name}</p>
              </div>

              <div className="flex items-center justify-center gap-10 mb-8">
                <div className="text-center">
                  <div className={`font-display font-black text-5xl ${gradeColor}`}>{grade}</div>
                  <div className="label mt-1">Grade</div>
                </div>
                <div className="text-center">
                  <div className="value-gold font-display font-black text-3xl">{totalXP}/{maxXP}</div>
                  <div className="label mt-1">XP Earned</div>
                </div>
                <div className="text-center">
                  <div className="value-green font-display font-black text-3xl">{correctAnswers}/{selected.checkpoints.length}</div>
                  <div className="label mt-1">Correct</div>
                </div>
              </div>

              {/* Final price */}
              <div className="bg-bg-secondary rounded-xl p-5 mb-6">
                <div className="label mb-1">What actually happened</div>
                <p className="text-sm text-text-secondary leading-relaxed">{selected.finalSummary}</p>
              </div>

              {/* Lesson */}
              <div className="bg-accent-green/5 border border-accent-green/20 rounded-xl p-4 mb-8">
                <div className="flex items-start gap-2">
                  <span className="text-accent-green text-lg shrink-0">📖</span>
                  <div>
                    <div className="text-sm font-semibold text-accent-green mb-1">Key Lesson</div>
                    <p className="text-sm text-text-secondary leading-relaxed">{selected.lesson}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setPhase('select')} className="btn-primary flex-1 py-3">
                  Try Another Scenario →
                </button>
                <button onClick={() => startScenario(selected)} className="btn-secondary flex-1 py-3">
                  Replay Again
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return null
}