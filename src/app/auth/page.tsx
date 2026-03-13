'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { authApi } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

function AuthForm() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'login' | 'register'>(
    searchParams.get('tab') === 'register' ? 'register' : 'login'
  )
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const router = useRouter()
  const { setUser, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard')
  }, [isAuthenticated, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = tab === 'login'
        ? await authApi.login({ email: form.email, password: form.password })
        : await authApi.register(form)
      setUser(res.data.user, res.data.token)
      toast.success(res.data.message)
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Something went wrong'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-bg-primary flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent-green/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-accent-green rounded-xl flex items-center justify-center text-bg-primary font-display font-black">TQ</div>
          <span className="font-display font-bold text-xl text-text-primary">TradeQuest</span>
        </Link>

        {/* Card */}
        <div className="card p-8">
          {/* Tabs */}
          <div className="flex bg-bg-secondary rounded-lg p-1 mb-8">
            {(['login', 'register'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-md font-display font-semibold text-sm transition-all capitalize ${
                  tab === t ? 'bg-accent-green text-bg-primary' : 'text-text-secondary hover:text-text-primary'
                }`}>
                {t === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="label block mb-2">Username</label>
                <input name="username" value={form.username} onChange={handleChange}
                  placeholder="market_wizard" className="input-field" required
                  minLength={3} maxLength={20} />
              </div>
            )}
            <div>
              <label className="label block mb-2">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                placeholder="trader@example.com" className="input-field" required />
            </div>
            <div>
              <label className="label block mb-2">Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange}
                placeholder="••••••••" className="input-field" required minLength={6} />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
                  {tab === 'login' ? 'Logging in...' : 'Creating account...'}
                </span>
              ) : (
                tab === 'login' ? 'Log In →' : 'Start Your Journey →'
              )}
            </button>
          </form>

          {tab === 'register' && (
            <p className="text-xs text-text-muted text-center mt-4">
              By signing up, you agree to learn responsibly and never risk real money without proper education.
            </p>
          )}
        </div>

        <p className="text-center text-text-muted text-sm mt-4">
          {tab === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setTab(tab === 'login' ? 'register' : 'login')}
            className="text-accent-green hover:underline">
            {tab === 'login' ? 'Sign up free' : 'Log in'}
          </button>
        </p>
      </div>
    </main>
  )
}

export default function AuthPage() {
  return <Suspense><AuthForm /></Suspense>
}
