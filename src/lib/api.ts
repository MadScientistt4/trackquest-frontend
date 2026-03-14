import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('tq_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('tq_token')
      localStorage.removeItem('tq_user')
      if (!window.location.pathname.includes('/auth')) {
        window.location.href = '/auth'
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
}

export const gamesApi = {
  getCandleChallenge: (difficulty?: string) =>
    api.get('/games/candle-challenge', { params: { difficulty } }),
  submitCandlePrediction: (data: { prediction: string; correctAnswer: string; difficulty: string; timeSpent: number }) =>
    api.post('/games/candle-challenge/submit', data),
  getCandleChallengeForex: (difficulty?: string, pairIndex?: number) =>
    api.get('/games/candle-challenge-forex', { params: { difficulty, pairIndex } }),
  getSupportResistanceChallenge: (difficulty?: string) =>
    api.get('/games/support-resistance', { params: { difficulty } }),
  submitSupportResistance: (data: { candles: any[]; drawnSupports: number[]; drawnResistances: number[]; difficulty: string; timeSpent: number }) =>
    api.post('/games/support-resistance/submit', data),
  getSupportResistanceForex: (difficulty?: string, pairIndex?: number) =>
    api.get('/games/support-resistance-forex', { params: { difficulty, pairIndex } }),
  getForexPairs: () =>
    api.get('/games/forex-pairs'),
  getStockChallenge: (ticker?: string, difficulty?: string) =>
    api.get('/games/stock-challenge', { params: { ticker, difficulty } }),
  submitStockPrediction: (data: { prediction: string; correctAnswer: string; ticker: string; difficulty: string; timeSpent: number }) =>
    api.post('/games/stock-challenge/submit', data),
  getAvailableStocks: () =>
    api.get('/games/stocks'),
  getCryptoChallenge: (symbol?: string, difficulty?: string) =>
    api.get('/games/crypto-challenge', { params: { symbol, difficulty } }),
  submitCryptoPrediction: (data: { prediction: string; correctAnswer: string; symbol: string; difficulty: string; timeSpent: number }) =>
    api.post('/games/crypto-challenge/submit', data),
  getAvailableCryptos: () =>
    api.get('/games/cryptos'),
  getTradeScenario: () => api.get('/games/trade-scenario'),
  submitTrade: (data: { entryPrice: number; stopLoss: number; targetPrice: number; direction: string }) =>
    api.post('/games/trade-scenario/submit', data),
  calculateTax: (data: { income: number; stcgGains?: number; ltcgGains?: number; section80C?: number; section80D?: number; hra?: number }) =>
    api.post('/games/tax-calculate', data),
  getHistory: (params?: { page?: number; limit?: number; gameType?: string }) =>
    api.get('/games/history', { params }),
}

export const leaderboardApi = {
  get: (type?: string, limit?: number) =>
    api.get('/leaderboard', { params: { type, limit } }),
}

export const usersApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: Partial<{ username: string; avatar: string }>) =>
    api.patch('/users/profile', data),
  getStats: () => api.get('/users/stats'),
}
