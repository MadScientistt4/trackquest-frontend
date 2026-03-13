'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { leaderboardApi } from '@/lib/api'
import Sidebar from '@/components/layout/Sidebar'
import toast from 'react-hot-toast'

interface LeaderboardEntry {
  rank: number; username: string; level: number; xp: number; coins: number; streak: number; playerRank: string; accuracy: number
}

const TABS = [
  { key: 'xp', label: 'Total XP', icon: '⚡' },
  { key: 'accuracy', label: 'Accuracy', icon: '🎯' },
  { key: 'streak', label: 'Streak', icon: '🔥' },
  { key: 'coins', label: 'Coins', icon: '🪙' },
]

export default function LeaderboardPage() {
  const { user, isAuthenticated, loadFromStorage } = useAuthStore()
  const router = useRouter()
  const [tab, setTab] = useState('xp')
  const [data, setData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadFromStorage() }, [loadFromStorage])
  useEffect(() => { if (!isAuthenticated) router.push('/auth') }, [isAuthenticated, router])

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await leaderboardApi.get(tab, 20)
        setData(res.data.leaderboard)
      } catch { toast.error('Failed to load leaderboard') }
      finally { setLoading(false) }
    }
    if (isAuthenticated) fetch()
  }, [tab, isAuthenticated])

  const getDisplayValue = (entry: LeaderboardEntry) => {
    if (tab === 'xp') return `${entry.xp.toLocaleString()} XP`
    if (tab === 'accuracy') return `${entry.accuracy}%`
    if (tab === 'streak') return `${entry.streak} days`
    return `${entry.coins.toLocaleString()} 🪙`
  }

  const rankStyle = (rank: number) => {
    if (rank === 1) return 'text-accent-gold text-xl'
    if (rank === 2) return 'text-gray-300 text-lg'
    if (rank === 3) return 'text-orange-600 text-lg'
    return 'text-text-muted text-sm font-mono'
  }

  const rankIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="mb-6">
            <p className="label mb-1">Global Rankings</p>
            <h1 className="font-display font-black text-2xl text-text-primary">🏆 Leaderboard</h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all border ${
                  tab === t.key ? 'border-accent-green bg-accent-green/10 text-accent-green' : 'border-bg-border text-text-secondary hover:border-accent-green/30'
                }`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="card p-16 text-center">
              <div className="w-8 h-8 border-2 border-bg-border border-t-accent-green rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <div className="card overflow-hidden">
              {data.filter(e => e?.username).map((entry, idx) => {
                const isMe = entry.username === user?.username
                return (
                  <div key={entry.username ?? idx}
                    className={`flex items-center gap-4 px-5 py-3.5 border-b border-bg-border last:border-b-0 transition-colors ${
                      isMe ? 'bg-accent-green/5 border-l-2 border-l-accent-green' : 'hover:bg-bg-elevated'
                    }`}>
                    {/* Rank */}
                    <div className={`w-8 text-center font-bold ${rankStyle(entry.rank)}`}>
                      {rankIcon(entry.rank)}
                    </div>

                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm shrink-0 ${
                      isMe ? 'bg-accent-green/20 border border-accent-green text-accent-green' : 'bg-bg-elevated border border-bg-border text-text-secondary'
                    }`}>
                      {entry.username?.[0]?.toUpperCase() ?? '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm truncate ${isMe ? 'text-accent-green' : 'text-text-primary'}`}>
                          {entry.username}
                        </span>
                        {isMe && <span className="text-xs font-mono text-accent-green bg-accent-green/10 px-1.5 py-0.5 rounded">you</span>}
                      </div>
                      <div className="text-xs font-mono text-text-muted">{entry.playerRank} · Lv.{entry.level}</div>
                    </div>

                    {/* Streak */}
                    {entry.streak > 0 && (
                      <div className="text-xs font-mono text-text-muted hidden md:block">🔥 {entry.streak}d</div>
                    )}

                    {/* Value */}
                    <div className={`font-mono font-bold text-sm ${isMe ? 'text-accent-green' : 'text-text-primary'}`}>
                      {getDisplayValue(entry)}
                    </div>
                  </div>
                )
              })}

              {data.length === 0 && (
                <div className="p-12 text-center text-text-muted font-mono text-sm">No data yet. Be the first!</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}