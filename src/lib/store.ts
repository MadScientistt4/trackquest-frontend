import { create } from 'zustand'

export interface UserStats {
  candlePrediction: { played: number; correct: number; accuracy: number }
  patternRecognition: { played: number; correct: number; accuracy: number }
  tradeSimulation: { played: number; profitableTrades: number; totalPnL: number }
  taxSimulator: { completed: number; taxSaved: number }
  supportResistance: { played: number; correct: number; accuracy: number }
  stockPrediction: { played: number; correct: number; accuracy: number }
  cryptoPrediction: { played: number; correct: number; accuracy: number }
}

export interface User {
  id: string
  username: string
  email: string
  level: number
  xp: number
  xpToNextLevel: number
  coins: number
  rank: string
  streak: number
  badges: string[]
  stats: UserStats
  createdAt: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User, token: string) => void
  updateUser: (updates: Partial<User>) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  loadFromStorage: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user, token) => {
    localStorage.setItem('tq_token', token)
    localStorage.setItem('tq_user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true, isLoading: false })
  },
  updateUser: (updates) => {
    const current = get().user
    if (!current) return
    const updated = { ...current, ...updates }
    localStorage.setItem('tq_user', JSON.stringify(updated))
    set({ user: updated })
  },
  logout: () => {
    localStorage.removeItem('tq_token')
    localStorage.removeItem('tq_user')
    set({ user: null, token: null, isAuthenticated: false })
  },
  setLoading: (loading) => set({ isLoading: loading }),
  loadFromStorage: () => {
    try {
      const token = localStorage.getItem('tq_token')
      const userStr = localStorage.getItem('tq_user')
      if (token && userStr) {
        const user = JSON.parse(userStr)
        set({ user, token, isAuthenticated: true, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },
}))

export const useStore = useAuthStore
