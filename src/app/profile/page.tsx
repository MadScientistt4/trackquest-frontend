'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import Sidebar from '@/components/layout/Sidebar'

export default function ProfilePage() {
  const { user, isAuthenticated, loadFromStorage, logout } = useAuthStore()
  const router = useRouter()
  useEffect(() => { loadFromStorage() }, [loadFromStorage])
  useEffect(() => { if (!isAuthenticated) router.push('/auth') }, [isAuthenticated, router])
  if (!user) return null

  const statGroups = [
    {
      title: '🕯️ Candle Prediction',
      stats: [
        { label: 'Games Played', value: user.stats.candlePrediction.played },
        { label: 'Correct', value: user.stats.candlePrediction.correct },
        { label: 'Accuracy', value: `${user.stats.candlePrediction.accuracy}%` },
      ]
    },
    {
      title: '⚖️ Trade Simulation',
      stats: [
        { label: 'Trades Placed', value: user.stats.tradeSimulation.played },
        { label: 'Profitable', value: user.stats.tradeSimulation.profitableTrades },
        { label: 'Win Rate', value: user.stats.tradeSimulation.played > 0 ? `${Math.round((user.stats.tradeSimulation.profitableTrades / user.stats.tradeSimulation.played) * 100)}%` : '—' },
      ]
    },
    {
      title: '🧾 Tax Simulator',
      stats: [
        { label: 'Simulations', value: user.stats.taxSimulator.completed },
        { label: 'Tax Saved', value: `₹${(user.stats.taxSimulator.taxSaved || 0).toLocaleString('en-IN')}` },
      ]
    },
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <p className="label mb-1">Account</p>
          <h1 className="font-display font-black text-2xl text-text-primary mb-6">👤 Profile</h1>

          {/* User hero */}
          <div className="card p-6 mb-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-accent-green/20 border border-accent-green/30 flex items-center justify-center text-accent-green font-display font-black text-2xl">
                {user.username[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-display font-black text-xl text-text-primary">{user.username}</div>
                <div className="text-text-muted text-sm">{user.email}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-accent-gold font-mono text-sm">🏅 {user.rank}</span>
                  <span className="text-text-muted">·</span>
                  <span className="text-accent-green font-mono text-sm">Lv.{user.level}</span>
                  <span className="text-text-muted">·</span>
                  <span className="text-accent-red font-mono text-sm">🔥 {user.streak} day streak</span>
                </div>
              </div>
              <div className="text-right">
                <div className="value-gold font-display font-black text-2xl">🪙 {user.coins.toLocaleString()}</div>
                <div className="label mt-1">{user.xp} XP total</div>
              </div>
            </div>

            {/* XP bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs font-mono text-text-muted mb-1.5">
                <span>Level {user.level}</span>
                <span>{user.xpToNextLevel} XP to Level {user.level + 1}</span>
              </div>
              <div className="xp-bar">
                <div className="xp-fill" style={{ width: `${Math.min(100, (user.xp / (user.xp + user.xpToNextLevel)) * 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Stats */}
          <h2 className="font-display font-bold text-lg text-text-primary mb-4">Performance Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {statGroups.map(group => (
              <div key={group.title} className="card p-5">
                <h3 className="font-semibold text-text-primary mb-3 text-sm">{group.title}</h3>
                <div className="space-y-2">
                  {group.stats.map(stat => (
                    <div key={stat.label} className="flex justify-between">
                      <span className="text-xs text-text-muted">{stat.label}</span>
                      <span className="text-xs font-mono font-semibold text-text-primary">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-text-secondary">Member since</div>
                <div className="font-mono text-text-primary">{new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
              <button onClick={() => { logout(); router.push('/') }} className="text-sm text-accent-red hover:underline font-mono">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
