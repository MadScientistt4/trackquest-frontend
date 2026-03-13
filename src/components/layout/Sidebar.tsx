'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

const NAV_ITEMS = [
  { href: '/dashboard', icon: '⬡', label: 'Dashboard' },
  { href: '/games/candle-prediction', icon: '🕯️', label: 'Candle Prediction' },
  { href: '/games/pattern-recognition', icon: '🔍', label: 'Pattern Recognition' },
  { href: '/games/trade-simulation', icon: '⚖️', label: 'Trade Simulation' },
  { href: '/games/market-replay', icon: '📺', label: 'Market Replay' },
  { href: '/games/tax-simulator', icon: '🧾', label: 'Tax Simulator' },
  { href: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
  { href: '/profile', icon: '👤', label: 'Profile' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  return (
    <aside className="w-60 bg-bg-secondary border-r border-bg-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-bg-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent-green rounded-lg flex items-center justify-center text-bg-primary font-display font-black text-sm">TQ</div>
          <span className="font-display font-bold text-text-primary">TradeQuest</span>
        </div>
      </div>

      {/* User Card */}
      {user && (
        <div className="px-4 py-3 border-b border-bg-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-green/20 border border-accent-green/30 flex items-center justify-center text-accent-green font-display font-bold text-sm">
              {user.username[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text-primary truncate">{user.username}</div>
              <div className="text-xs text-text-muted font-mono">Lv.{user.level} · {user.rank}</div>
            </div>
          </div>
          {/* XP bar */}
          <div className="mt-2">
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: `${Math.min(100, ((user.xp % 100) / user.xpToNextLevel) * 100)}%` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] font-mono text-text-muted">{user.xp} XP</span>
              <span className="text-[10px] font-mono text-text-muted">{user.xpToNextLevel} to next</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick stats */}
      {user && (
        <div className="px-4 py-2 border-b border-bg-border flex gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-accent-gold text-sm">🪙</span>
            <span className="text-xs font-mono value-gold">{user.coins}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-accent-red text-sm">🔥</span>
            <span className="text-xs font-mono text-text-secondary">{user.streak}d</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard')
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-all duration-150 mb-0.5 ${
                active
                  ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`}>
              <span className="text-base">{item.icon}</span>
              <span className={`font-medium ${active ? 'font-semibold' : ''}`}>{item.label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-green" />}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-3 border-t border-bg-border">
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-all">
          <span>⬡</span> Sign Out
        </button>
      </div>
    </aside>
  )
}
