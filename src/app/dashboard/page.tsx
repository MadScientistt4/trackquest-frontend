'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import Sidebar from '@/components/layout/Sidebar'
import Link from 'next/link'

const GAME_CARDS = [
  {
    href: '/games/candle-prediction',
    icon: '🕯️',
    title: 'Candle Prediction',
    desc: 'Predict bullish, bearish or consolidation',
    xp: '15–40 XP',
    difficulty: 'Easy → Hard',
    color: 'border-accent-green/30 hover:border-accent-green/60',
    accent: 'text-accent-green',
    tag: 'Most Popular',
  },
  {
    href: '/games/pattern-recognition',
    icon: '🔍',
    title: 'Pattern Recognition',
    desc: 'Identify classic chart patterns',
    xp: '20–50 XP',
    difficulty: 'Intermediate',
    color: 'border-accent-blue/30 hover:border-accent-blue/60',
    accent: 'text-accent-blue',
    tag: 'Chart Skills',
  },
  {
    href: '/games/trade-simulation',
    icon: '⚖️',
    title: 'Trade Simulation',
    desc: 'Place trades with proper risk management',
    xp: '25–60 XP',
    difficulty: 'Intermediate',
    color: 'border-accent-gold/30 hover:border-accent-gold/60',
    accent: 'text-accent-gold',
    tag: 'Risk Mgmt',
  },
  {
    href: '/games/market-replay',
    icon: '📺',
    title: 'Market Replay',
    desc: 'Relive historical market events',
    xp: '30–75 XP',
    difficulty: 'Advanced',
    color: 'border-purple-500/30 hover:border-purple-500/60',
    accent: 'text-purple-400',
    tag: 'Historical',
  },
  {
    href: '/games/tax-simulator',
    icon: '🧾',
    title: 'Tax Simulator',
    desc: 'Master Indian tax concepts & planning',
    xp: '30 XP',
    difficulty: 'All Levels',
    color: 'border-orange-500/30 hover:border-orange-500/60',
    accent: 'text-orange-400',
    tag: 'India Focus',
  },
]

export default function DashboardPage() {
  const { user, isAuthenticated, loadFromStorage } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth')
  }, [isAuthenticated, router])

  if (!user) return null

  const xpPercent = Math.min(100, Math.round((user.xp / (user.xp + user.xpToNextLevel)) * 100))

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="label mb-1">Welcome back</p>
              <h1 className="font-display font-black text-3xl text-text-primary">
                Hey, {user.username} 👋
              </h1>
              <p className="text-text-secondary mt-1">
                <span className="text-accent-green font-mono">{user.rank}</span> ·{' '}
                {user.streak > 0 && <span className="text-accent-red">🔥 {user.streak} day streak</span>}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-text-muted font-mono mb-1">COINS</div>
              <div className="value-gold text-2xl font-display font-black">🪙 {user.coins.toLocaleString()}</div>
            </div>
          </div>

          {/* Level Progress Card */}
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent-gold/20 border border-accent-gold/30 flex items-center justify-center">
                  <span className="font-display font-black text-lg text-accent-gold">{user.level}</span>
                </div>
                <div>
                  <div className="text-text-primary font-semibold">Level {user.level}</div>
                  <div className="text-xs text-text-muted font-mono">{user.xp} XP total</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-muted font-mono">{xpPercent}% to next level</div>
                <div className="text-xs text-accent-green font-mono mt-0.5">{user.xpToNextLevel} XP remaining</div>
              </div>
            </div>
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: `${xpPercent}%` }} />
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Accuracy', value: `${user.stats?.candlePrediction?.accuracy ?? 0}%`, icon: '🎯', color: 'text-accent-green' },
              { label: 'Games Played', value: (user.stats?.candlePrediction?.played ?? 0) + (user.stats?.tradeSimulation?.played ?? 0), icon: '🎮', color: 'text-accent-blue' },
              { label: 'Profitable Trades', value: user.stats?.tradeSimulation?.profitableTrades ?? 0, icon: '📈', color: 'text-accent-gold' },
              { label: 'Tax Saved', value: `₹${(user.stats?.taxSimulator?.taxSaved ?? 0).toLocaleString('en-IN')}`, icon: '🧾', color: 'text-orange-400' },
            ].map(stat => (
              <div key={stat.label} className="card p-4">
                <div className="text-xl mb-2">{stat.icon}</div>
                <div className={`font-display font-bold text-xl ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-text-muted font-mono mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Game Modes */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-xl text-text-primary">Choose Your Challenge</h2>
              <Link href="/leaderboard" className="text-xs text-accent-green font-mono hover:underline">View Leaderboard →</Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {GAME_CARDS.map(card => (
                <Link key={card.href} href={card.href}
                  className={`card p-5 border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover group ${card.color}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{card.icon}</span>
                    <span className={`text-xs font-mono ${card.accent} bg-current/10 px-2 py-0.5 rounded-full border border-current/20`}>
                      {card.tag}
                    </span>
                  </div>
                  <h3 className={`font-display font-bold text-base text-text-primary group-hover:${card.accent} transition-colors mb-1`}>
                    {card.title}
                  </h3>
                  <p className="text-text-secondary text-xs mb-3">{card.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-accent-green">{card.xp}</span>
                    <span className="text-xs font-mono text-text-muted">{card.difficulty}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
