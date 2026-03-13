'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'

const TICKER_ITEMS = [
  { symbol: 'NIFTY50', value: '24,386.20', change: '+1.42%', up: true },
  { symbol: 'SENSEX', value: '80,248.73', change: '+1.18%', up: true },
  { symbol: 'BANKNIFTY', value: '52,140.50', change: '-0.34%', up: false },
  { symbol: 'RELIANCE', value: '2,847.35', change: '+2.10%', up: true },
  { symbol: 'TCS', value: '4,102.80', change: '-0.67%', up: false },
  { symbol: 'HDFCBANK', value: '1,678.45', change: '+0.89%', up: true },
  { symbol: 'INFY', value: '1,924.60', change: '-1.23%', up: false },
]

const FEATURES = [
  {
    icon: '🕯️',
    title: 'Candle Prediction',
    desc: 'Analyze charts and predict the next price movement. Build trend recognition instincts.',
    tag: 'Most Popular',
    tagColor: 'text-accent-green',
    href: '/games/candle-prediction',
  },
  {
    icon: '🔍',
    title: 'Pattern Recognition',
    desc: 'Identify Double Tops, Head & Shoulders, and engulfing patterns in real chart data.',
    tag: 'Intermediate',
    tagColor: 'text-accent-blue',
    href: '/games/pattern-recognition',
  },
  {
    icon: '⚖️',
    title: 'Trade Simulation',
    desc: 'Place trades with entry, stop loss, and target. Get graded on your risk management.',
    tag: 'Risk Management',
    tagColor: 'text-accent-gold',
    href: '/games/trade-simulation',
  },
  {
    icon: '📺',
    title: 'Market Replay',
    desc: 'Relive COVID crash, bull runs, and crypto mania. React candle by candle in real time.',
    tag: 'Historical',
    tagColor: 'text-purple-400',
    href: '/games/market-replay',
  },
  {
    icon: '🏠',
    title: 'Financial Life Sim',
    desc: 'Manage a virtual financial life. SIPs, spending, savings — see how decisions compound.',
    tag: 'India Focus',
    tagColor: 'text-orange-400',
    href: '/games/financial-life',
  },
  {
    icon: '🧾',
    title: 'Tax Saving Simulator',
    desc: 'Learn 80C, LTCG, STCG and legal tax-saving strategies used by expert investors.',
    tag: 'Tax Planning',
    tagColor: 'text-accent-green',
    href: '/games/tax-simulator',
  },
]

export default function HomePage() {
  const { isAuthenticated, loadFromStorage } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard')
  }, [isAuthenticated, router])

  return (
    <main className="min-h-screen bg-bg-primary overflow-hidden">
      {/* Ticker tape */}
      <div className="border-b border-bg-border bg-bg-secondary overflow-hidden">
        <div className="flex animate-[ticker_30s_linear_infinite] whitespace-nowrap py-2">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 mx-6 font-mono text-xs">
              <span className="text-text-muted">{item.symbol}</span>
              <span className="text-text-primary">{item.value}</span>
              <span className={item.up ? 'text-accent-green' : 'text-accent-red'}>{item.change}</span>
              <span className="text-bg-border">|</span>
            </span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-bg-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent-green rounded-lg flex items-center justify-center text-bg-primary font-display font-black text-sm">TQ</div>
          <span className="font-display font-bold text-lg text-text-primary">TradeQuest</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth?tab=login" className="btn-secondary py-2 px-4 text-sm">Log In</Link>
          <Link href="/auth?tab=register" className="btn-primary py-2 px-4 text-sm">Start Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-8 pt-20 pb-16 text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-accent-green/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-accent-green/10 border border-accent-green/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
            <span className="text-xs font-mono text-accent-green">India's first gamified market education platform</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-black text-text-primary leading-tight mb-6">
            Learn how markets<br />
            <span className="text-gradient-green">work by playing</span><br />
            them.
          </h1>

          <p className="text-text-secondary text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop learning from Telegram tips and Instagram reels. TradeQuest teaches you real market skills
            through interactive challenges, chart analysis, and trade simulations — zero real money at risk.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/auth?tab=register" className="btn-primary text-base px-8 py-4">
              Start Playing Free →
            </Link>
            <Link href="#features" className="btn-secondary text-base px-8 py-4">
              See All Challenges
            </Link>
          </div>

          <div className="flex items-center justify-center gap-8 mt-12 text-text-muted">
            <div className="text-center">
              <div className="font-display font-black text-2xl text-text-primary">7+</div>
              <div className="text-xs font-mono">Game Modes</div>
            </div>
            <div className="w-px h-8 bg-bg-border" />
            <div className="text-center">
              <div className="font-display font-black text-2xl text-accent-green">100%</div>
              <div className="text-xs font-mono">Risk Free</div>
            </div>
            <div className="w-px h-8 bg-bg-border" />
            <div className="text-center">
              <div className="font-display font-black text-2xl text-text-primary">₹0</div>
              <div className="text-xs font-mono">Required</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="px-8 pb-20 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="label mb-3">Game Modes</p>
          <h2 className="font-display font-black text-3xl text-text-primary">
            7 Ways to Master the Markets
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <Link key={f.href} href="/auth?tab=register" className="game-card p-6 group">
              <div className="flex items-start justify-between mb-4">
                <span className="text-3xl">{f.icon}</span>
                <span className={`text-xs font-mono ${f.tagColor} bg-current/10 px-2 py-0.5 rounded-full`}
                  style={{ backgroundColor: 'currentColor', color: 'inherit' }}>
                  <span className={f.tagColor}>{f.tag}</span>
                </span>
              </div>
              <h3 className="font-display font-bold text-lg text-text-primary mb-2 group-hover:text-accent-green transition-colors">{f.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-bg-border px-8 py-20 text-center">
        <h2 className="font-display font-black text-3xl text-text-primary mb-4">
          Stop Guessing. Start Learning.
        </h2>
        <p className="text-text-secondary mb-8 max-w-md mx-auto">
          Millions of Indians invest without education. Be different. Build real market skills before you invest real money.
        </p>
        <Link href="/auth?tab=register" className="btn-primary text-base px-10 py-4">
          Create Free Account
        </Link>
      </section>
    </main>
  )
}
