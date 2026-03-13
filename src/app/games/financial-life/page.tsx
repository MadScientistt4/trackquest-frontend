'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import Sidebar from '@/components/layout/Sidebar'

const SCENARIOS = [
  {
    id: 1, title: "Your First Salary — ₹50,000/month",
    question: "You just got your first job. What do you do with ₹50,000 salary?",
    options: [
      { text: "Spend it all — YOLO, I'm young!", impact: { wealth: -200000 }, outcome: "Fun now, zero savings at 30. The compounding opportunity cost is massive." },
      { text: "Save 20% in FD, spend the rest", impact: { wealth: 120000 }, outcome: "Safe but FD returns barely beat inflation. Consider better instruments." },
      { text: "50/30/20 rule: needs/wants/ELSS SIP", impact: { wealth: 400000 }, outcome: "Excellent! ELSS gives 80C benefit + market returns. Smart starter move." },
      { text: "Invest 50% in SIP, live frugally", impact: { wealth: 800000 }, outcome: "Great wealth but lifestyle burnout is real. Balance is key." },
    ]
  },
  {
    id: 2, title: "Market Dips 20% — What Do You Do?",
    question: "Your ₹1L portfolio is now worth ₹80,000 after a market correction.",
    options: [
      { text: "Panic sell everything — cut losses", impact: { wealth: -20000 }, outcome: "Classic mistake. You locked in losses and missed the recovery." },
      { text: "Hold and wait", impact: { wealth: 50000 }, outcome: "Good. Markets recover historically. Patience rewards investors." },
      { text: "Buy more at lower prices (average down)", impact: { wealth: 150000 }, outcome: "Excellent! Dollar cost averaging is powerful when you believe in fundamentals." },
      { text: "Switch to gold and FD", impact: { wealth: 10000 }, outcome: "Safety-first but gold underperforms equities over 10+ years." },
    ]
  },
  {
    id: 3, title: "₹5 Lakh Windfall — Invest or Spend?",
    question: "You received ₹5L as a bonus. What is your move?",
    options: [
      { text: "Buy the latest iPhone, MacBook, and travel", impact: { wealth: -500000 }, outcome: "Fun but ₹5L compounding at 12% for 20 years = ₹48L. Just saying." },
      { text: "Lump sum into Nifty index fund", impact: { wealth: 2000000 }, outcome: "Solid. Index funds beat 80% of active funds over 15 years." },
      { text: "SIP it over 12 months to reduce timing risk", impact: { wealth: 1800000 }, outcome: "Smart. Rupee cost averaging works well in volatile markets." },
      { text: "Split: pay off home loan + invest rest", impact: { wealth: 1500000 }, outcome: "Balanced. Debt freedom + investment = financial peace." },
    ]
  },
]

export default function FinancialLifePage() {
  const { isAuthenticated, loadFromStorage } = useAuthStore()
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [wealth, setWealth] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => { loadFromStorage() }, [loadFromStorage])
  useEffect(() => { if (!isAuthenticated) router.push('/auth') }, [isAuthenticated, router])

  const scenario = SCENARIOS[idx]

  const handleChoice = (i: number) => {
    if (chosen !== null) return
    setChosen(i)
    setWealth(w => w + scenario.options[i].impact.wealth)
  }

  const next = () => {
    if (idx < SCENARIOS.length - 1) { setIdx(i => i + 1); setChosen(null) }
    else setDone(true)
  }

  const restart = () => { setIdx(0); setChosen(null); setWealth(0); setDone(false) }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="mb-6">
            <p className="label mb-1">Game Mode</p>
            <h1 className="font-display font-black text-2xl text-text-primary">🏠 Financial Life Simulator</h1>
            <p className="text-text-secondary text-sm mt-1">Make real-life financial decisions and see how they impact your wealth</p>
          </div>

          <div className="card p-4 mb-5 flex items-center justify-between">
            <div>
              <div className="label mb-1">Scenario {Math.min(idx + 1, SCENARIOS.length)} of {SCENARIOS.length}</div>
              <div className="flex gap-2">
                {SCENARIOS.map((_, i) => (
                  <div key={i} className={`h-1.5 w-12 rounded-full ${i < idx ? 'bg-accent-green' : i === idx ? 'bg-accent-gold' : 'bg-bg-border'}`} />
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="label">Wealth Delta</div>
              <div className={`font-display font-bold text-lg ${wealth >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                {wealth >= 0 ? '+' : ''}₹{Math.abs(wealth).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {!done ? (
            <div className="card p-6">
              <h2 className="font-display font-bold text-lg text-text-primary mb-1">{scenario.title}</h2>
              <p className="text-text-secondary mb-6">{scenario.question}</p>
              <div className="space-y-3">
                {scenario.options.map((opt, i) => {
                  const isChosen = chosen === i
                  return (
                    <button key={i} onClick={() => handleChoice(i)} disabled={chosen !== null}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                        isChosen
                          ? opt.impact.wealth > 0 ? 'border-accent-green bg-accent-green/10' : 'border-accent-red bg-accent-red/10'
                          : 'border-bg-border hover:border-accent-green/40 disabled:opacity-60'
                      }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-primary">{opt.text}</span>
                        {chosen !== null && isChosen && (
                          <span className={`font-mono text-sm font-bold ${opt.impact.wealth > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                            {opt.impact.wealth > 0 ? '+' : ''}₹{opt.impact.wealth.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      {isChosen && <p className="text-xs text-text-secondary mt-2 leading-relaxed">{opt.outcome}</p>}
                    </button>
                  )
                })}
              </div>
              {chosen !== null && (
                <button onClick={next} className="btn-primary w-full mt-5">
                  {idx < SCENARIOS.length - 1 ? 'Next Scenario →' : 'See Results →'}
                </button>
              )}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <div className="text-5xl mb-4">{wealth > 500000 ? '🎉' : wealth > 0 ? '👍' : '😅'}</div>
              <h2 className="font-display font-black text-2xl text-text-primary mb-2">Simulation Complete!</h2>
              <p className="text-text-secondary mb-4">Your virtual wealth after {SCENARIOS.length} life decisions:</p>
              <div className={`font-display font-black text-4xl mb-6 ${wealth > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                {wealth > 0 ? '+' : ''}₹{Math.abs(wealth).toLocaleString('en-IN')}
              </div>
              <p className="text-sm text-text-secondary max-w-sm mx-auto mb-8">
                {wealth > 1000000 ? 'Excellent decisions! You are on track to financial freedom.' :
                  wealth > 0 ? 'Good instincts! A few tweaks and you will maximize your wealth.' :
                  'Every mistake is a lesson. Try again with better decisions!'}
              </p>
              <button onClick={restart} className="btn-primary px-8 py-3">Play Again →</button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
