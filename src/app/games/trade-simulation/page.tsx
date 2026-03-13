'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { gamesApi } from '@/lib/api'
import Sidebar from '@/components/layout/Sidebar'
import toast from 'react-hot-toast'

interface Candle {
  timestamp: number; open: number; high: number; low: number; close: number; volume: number
}

interface ScenarioData {
  scenario: {
    symbol: string; sector: string; volatility: string
    candles: Candle[]; entryPrice: number
  }
}

interface ResultData {
  score: number; riskRewardRatio: number; stopLossPercent: number
  feedback: string[]; xpEarned: number; coinsEarned: number; grade: string
  newStats: { level: number; xp: number; xpToNextLevel: number; coins: number }
}

function MiniChart({ candles, entryPrice, stopLoss, targetPrice }: {
  candles: Candle[]; entryPrice: number; stopLoss: number; targetPrice: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || candles.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width, H = canvas.height
    const PAD = { top: 20, right: 20, bottom: 30, left: 55 }
    const chartW = W - PAD.left - PAD.right
    const chartH = H - PAD.top - PAD.bottom

    const allPrices = candles.flatMap(c => [c.high, c.low])
    if (stopLoss > 0) allPrices.push(stopLoss)
    if (targetPrice > 0) allPrices.push(targetPrice)
    const maxP = Math.max(...allPrices) * 1.01
    const minP = Math.min(...allPrices) * 0.99
    const range = maxP - minP

    ctx.clearRect(0, 0, W, H)
    const toY = (p: number) => PAD.top + ((maxP - p) / range) * chartH
    const spacing = chartW / candles.length
    const cw = Math.max(4, spacing * 0.6)

    // Grid
    ctx.strokeStyle = '#1e2d3d'; ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + (i / 4) * chartH
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke()
      const p = maxP - (i / 4) * range
      ctx.fillStyle = '#445566'; ctx.font = '9px monospace'; ctx.textAlign = 'right'
      ctx.fillText(p.toFixed(0), PAD.left - 4, y + 3)
    }

    // Candles
    candles.forEach((c, i) => {
      const x = PAD.left + i * spacing + spacing / 2
      const isBull = c.close >= c.open
      const color = isBull ? '#00d084' : '#ff4757'
      ctx.strokeStyle = color; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, toY(c.high)); ctx.lineTo(x, toY(c.low)); ctx.stroke()
      ctx.fillStyle = color
      const top = toY(Math.max(c.open, c.close))
      const bh = Math.max(1, Math.abs(toY(c.open) - toY(c.close)))
      ctx.fillRect(x - cw / 2, top, cw, bh)
    })

    // Level lines
    const drawLevel = (price: number, color: string, label: string) => {
      if (price <= 0) return
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4])
      ctx.beginPath(); ctx.moveTo(PAD.left, toY(price)); ctx.lineTo(W - PAD.right, toY(price)); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = color; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'right'
      ctx.fillText(`${label}: ${price.toFixed(0)}`, W - PAD.right - 2, toY(price) - 3)
    }

    if (entryPrice > 0) drawLevel(entryPrice, '#4dabf7', 'Entry')
    if (stopLoss > 0) drawLevel(stopLoss, '#ff4757', 'SL')
    if (targetPrice > 0) drawLevel(targetPrice, '#00d084', 'Target')

  }, [candles, entryPrice, stopLoss, targetPrice])

  return <canvas ref={canvasRef} width={680} height={280} className="w-full h-full rounded-lg" />
}

export default function TradeSimulationPage() {
  const { user, isAuthenticated, loadFromStorage, updateUser } = useAuthStore()
  const router = useRouter()
  const [scenario, setScenario] = useState<ScenarioData | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ResultData | null>(null)
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy')
  const [stopLoss, setStopLoss] = useState('')
  const [targetPrice, setTargetPrice] = useState('')

  useEffect(() => { loadFromStorage() }, [loadFromStorage])
  useEffect(() => { if (!isAuthenticated) router.push('/auth') }, [isAuthenticated, router])

  const loadScenario = async () => {
    setLoading(true); setResult(null); setStopLoss(''); setTargetPrice('')
    try {
      const res = await gamesApi.getTradeScenario()
      setScenario(res.data)
    } catch { toast.error('Failed to load scenario') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scenario || submitting) return
    const entry = scenario.scenario.entryPrice
    const sl = parseFloat(stopLoss)
    const tp = parseFloat(targetPrice)
    if (isNaN(sl) || isNaN(tp)) return toast.error('Enter valid price levels')
    setSubmitting(true)
    try {
      const res = await gamesApi.submitTrade({ entryPrice: entry, stopLoss: sl, targetPrice: tp, direction })
      setResult(res.data)
      if (res.data.newStats) updateUser(res.data.newStats)
    } catch { toast.error('Failed to evaluate trade') }
    finally { setSubmitting(false) }
  }

  const entry = scenario?.scenario.entryPrice || 0
  const rr = entry && stopLoss && targetPrice
    ? (Math.abs(parseFloat(targetPrice) - entry) / Math.abs(entry - parseFloat(stopLoss))).toFixed(2)
    : '—'

  const gradeColor = (g: string) => ({
    'A+': 'text-accent-green', A: 'text-accent-green', B: 'text-accent-blue',
    C: 'text-accent-gold', D: 'text-accent-red',
  }[g] || 'text-text-secondary')

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="label mb-1">Game Mode</p>
              <h1 className="font-display font-black text-2xl text-text-primary">⚖️ Trade Simulation</h1>
            </div>
            {user && <span className="stat-pill">📈 {user.stats.tradeSimulation.profitableTrades} profitable trades</span>}
          </div>

          {!scenario && !loading && (
            <div className="card p-10 text-center">
              <div className="text-5xl mb-4">⚖️</div>
              <h2 className="font-display font-bold text-xl text-text-primary mb-2">Trade Simulation</h2>
              <p className="text-text-secondary text-sm max-w-md mx-auto mb-8">
                You'll see a chart with an entry price. Set your Stop Loss and Target Price, then get graded on your risk management skills.
              </p>
              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8 text-center">
                <div><div className="text-accent-green font-mono font-bold">R:R ≥ 2</div><div className="text-xs text-text-muted">Risk:Reward</div></div>
                <div><div className="text-accent-blue font-mono font-bold">SL ≤ 2%</div><div className="text-xs text-text-muted">Stop Loss</div></div>
                <div><div className="text-accent-gold font-mono font-bold">A–D</div><div className="text-xs text-text-muted">Trade Grade</div></div>
              </div>
              <button onClick={loadScenario} className="btn-primary px-12 py-4">Load Trade Scenario →</button>
            </div>
          )}

          {loading && (
            <div className="card p-16 text-center">
              <div className="w-8 h-8 border-2 border-bg-border border-t-accent-green rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-secondary font-mono text-sm">Generating market scenario...</p>
            </div>
          )}

          {scenario && !loading && (
            <div className="space-y-4">
              {/* Scenario info */}
              <div className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="font-display font-black text-xl text-text-primary">{scenario.scenario.symbol}</span>
                    <span className="ml-2 text-xs font-mono text-text-muted">{scenario.scenario.sector}</span>
                  </div>
                  <div className="stat-pill capitalize">Volatility: {scenario.scenario.volatility}</div>
                </div>
                <div className="text-right">
                  <div className="label">Entry Price</div>
                  <div className="value-blue text-lg font-display font-bold">₹{entry.toFixed(2)}</div>
                </div>
              </div>

              {/* Chart */}
              <div className="card p-4">
                <div className="label mb-3">Price Chart — Blue: Entry | Red: Stop Loss | Green: Target</div>
                <div className="h-64 bg-bg-secondary rounded-lg">
                  <MiniChart
                    candles={scenario.scenario.candles}
                    entryPrice={entry}
                    stopLoss={parseFloat(stopLoss) || 0}
                    targetPrice={parseFloat(targetPrice) || 0}
                  />
                </div>
              </div>

              {/* Trade setup form */}
              {!result && (
                <form onSubmit={handleSubmit} className="card p-6">
                  <h3 className="font-display font-bold text-text-primary mb-4">Set Your Trade Levels</h3>

                  {/* Direction */}
                  <div className="flex gap-3 mb-4">
                    {(['buy', 'sell'] as const).map(d => (
                      <button key={d} type="button" onClick={() => setDirection(d)}
                        className={`flex-1 py-3 rounded-lg font-display font-bold capitalize transition-all border ${
                          direction === d
                            ? d === 'buy' ? 'bg-accent-green/10 border-accent-green text-accent-green' : 'bg-accent-red/10 border-accent-red text-accent-red'
                            : 'border-bg-border text-text-secondary hover:border-bg-border'
                        }`}>
                        {d === 'buy' ? '📈 Buy / Long' : '📉 Sell / Short'}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="label block mb-2">Stop Loss (₹)</label>
                      <input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)}
                        placeholder={direction === 'buy' ? `< ${entry.toFixed(0)}` : `> ${entry.toFixed(0)}`}
                        className="input-field" step="0.01" />
                    </div>
                    <div>
                      <label className="label block mb-2">Target Price (₹)</label>
                      <input type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
                        placeholder={direction === 'buy' ? `> ${entry.toFixed(0)}` : `< ${entry.toFixed(0)}`}
                        className="input-field" step="0.01" />
                    </div>
                  </div>

                  {/* Live R:R */}
                  <div className="bg-bg-secondary rounded-lg p-3 mb-4 flex items-center justify-between">
                    <span className="text-sm text-text-secondary font-mono">Risk:Reward Ratio</span>
                    <span className={`font-mono font-bold text-lg ${parseFloat(rr) >= 2 ? 'text-accent-green' : parseFloat(rr) >= 1 ? 'text-accent-gold' : 'text-accent-red'}`}>
                      {rr} : 1
                    </span>
                  </div>

                  <button type="submit" disabled={submitting || !stopLoss || !targetPrice} className="btn-primary w-full py-3">
                    {submitting ? 'Evaluating...' : 'Evaluate My Trade →'}
                  </button>
                </form>
              )}

              {/* Result */}
              {result && (
                <div className={`card p-6 border-2 ${result.score >= 70 ? 'border-accent-green/40' : 'border-accent-red/40'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-bold text-lg text-text-primary">Trade Evaluation</h3>
                    <div className={`font-display font-black text-4xl ${gradeColor(result.grade)}`}>{result.grade}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-bg-secondary rounded-lg p-3 text-center">
                      <div className="value-gold font-bold text-lg">{result.score}/100</div>
                      <div className="label">Score</div>
                    </div>
                    <div className="bg-bg-secondary rounded-lg p-3 text-center">
                      <div className={`font-mono font-bold text-lg ${result.riskRewardRatio >= 2 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {result.riskRewardRatio}:1
                      </div>
                      <div className="label">R:R Ratio</div>
                    </div>
                    <div className="bg-bg-secondary rounded-lg p-3 text-center">
                      <div className="value-gold font-bold text-lg">+{result.xpEarned} XP</div>
                      <div className="label">Earned</div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    {result.feedback.map((f, i) => (
                      <div key={i} className="text-sm font-mono text-text-secondary">{f}</div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={loadScenario} className="btn-primary flex-1">Next Scenario →</button>
                    <button onClick={() => { setScenario(null); setResult(null) }} className="btn-secondary flex-1">Back</button>
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
