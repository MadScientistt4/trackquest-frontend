'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { gamesApi } from '@/lib/api'
import Sidebar from '@/components/layout/Sidebar'
import toast from 'react-hot-toast'

interface TaxResult {
  breakdown: {
    grossIncome: number; totalDeductions: number; taxableIncome: number
    incomeTax: number; stcgTax: number; ltcgTax: number
    totalTax: number; effectiveRate: number; taxSaved: number
  }
  tips: string[]
  xpEarned: number
  coinsEarned: number
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

export default function TaxSimulatorPage() {
  const { isAuthenticated, loadFromStorage, updateUser } = useAuthStore()
  const router = useRouter()
  const [form, setForm] = useState({ income: '', stcgGains: '', ltcgGains: '', section80C: '', section80D: '', hra: '' })
  const [result, setResult] = useState<TaxResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadFromStorage() }, [loadFromStorage])
  useEffect(() => { if (!isAuthenticated) router.push('/auth') }, [isAuthenticated, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.income) return toast.error('Enter your annual income')
    setLoading(true)
    try {
      const res = await gamesApi.calculateTax({
        income: parseFloat(form.income) || 0,
        stcgGains: parseFloat(form.stcgGains) || 0,
        ltcgGains: parseFloat(form.ltcgGains) || 0,
        section80C: parseFloat(form.section80C) || 0,
        section80D: parseFloat(form.section80D) || 0,
        hra: parseFloat(form.hra) || 0,
      })
      setResult(res.data)
      updateUser({ coins: res.data.coinsEarned })
    } catch { toast.error('Calculation failed') }
    finally { setLoading(false) }
  }

  const FIELDS = [
    { name: 'income', label: 'Annual Salary / Income', placeholder: '1200000', required: true, note: 'Gross salary before any deductions' },
    { name: 'stcgGains', label: 'Short-Term Capital Gains (STCG)', placeholder: '50000', note: 'Taxed at 15% under Sec 111A' },
    { name: 'ltcgGains', label: 'Long-Term Capital Gains (LTCG)', placeholder: '150000', note: 'First ₹1L exempt; 10% above that' },
    { name: 'section80C', label: 'Section 80C Investments', placeholder: '150000', note: 'ELSS, PPF, EPF, LIC — max ₹1.5L' },
    { name: 'section80D', label: 'Section 80D (Health Insurance)', placeholder: '25000', note: 'Medical insurance premium — max ₹25K' },
    { name: 'hra', label: 'HRA Claimed', placeholder: '240000', note: 'House Rent Allowance exemption' },
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-6">
            <p className="label mb-1">Game Mode</p>
            <h1 className="font-display font-black text-2xl text-text-primary">🧾 Tax Saving Simulator</h1>
            <p className="text-text-secondary text-sm mt-1">Learn how to legally minimize your Indian tax liability</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="card p-6">
              <h2 className="font-display font-bold text-text-primary mb-1">Your Financial Details</h2>
              <p className="text-xs text-text-muted font-mono mb-5">FY 2024–25 · Old Tax Regime</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                {FIELDS.map(f => (
                  <div key={f.name}>
                    <label className="label block mb-1">{f.label} {f.required && <span className="text-accent-red">*</span>}</label>
                    <input name={f.name} type="number" value={form[f.name as keyof typeof form]}
                      onChange={handleChange} placeholder={f.placeholder}
                      className="input-field" required={f.required} min="0" />
                    <p className="text-[11px] text-text-muted mt-1 font-mono">{f.note}</p>
                  </div>
                ))}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
                  {loading ? 'Calculating...' : 'Calculate Tax & Savings →'}
                </button>
              </form>
            </div>

            {/* Results */}
            <div className="space-y-4">
              {!result && (
                <div className="card p-8 text-center border-dashed">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-text-secondary font-mono text-sm">Fill in your details to see a complete tax breakdown with saving tips.</p>
                  <div className="mt-6 space-y-2 text-left">
                    {['Section 80C deductions', 'STCG & LTCG tax on investments', 'HRA exemption calculation', 'Personalized tax-saving tips'].map(t => (
                      <div key={t} className="flex items-center gap-2 text-sm text-text-muted">
                        <span className="text-accent-green">✓</span> {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result && (
                <>
                  {/* Tax breakdown */}
                  <div className="card p-5">
                    <h3 className="font-display font-bold text-text-primary mb-4">Tax Breakdown</h3>
                    <div className="space-y-2">
                      {[
                        { label: 'Gross Income', value: result.breakdown.grossIncome, color: 'text-text-primary' },
                        { label: 'Total Deductions', value: -result.breakdown.totalDeductions, color: 'text-accent-green' },
                        { label: 'Taxable Income', value: result.breakdown.taxableIncome, color: 'text-text-primary', bold: true },
                      ].map(row => (
                        <div key={row.label} className={`flex justify-between py-1 ${row.bold ? 'border-t border-bg-border mt-2 pt-2' : ''}`}>
                          <span className="text-sm text-text-secondary">{row.label}</span>
                          <span className={`font-mono text-sm font-semibold ${row.color}`}>
                            {row.value < 0 ? '-' + fmt(Math.abs(row.value)) : fmt(row.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-bg-border mt-3 pt-3 space-y-2">
                      {[
                        { label: 'Income Tax', value: result.breakdown.incomeTax },
                        { label: 'STCG Tax (15%)', value: result.breakdown.stcgTax },
                        { label: 'LTCG Tax (10%)', value: result.breakdown.ltcgTax },
                      ].filter(r => r.value > 0).map(row => (
                        <div key={row.label} className="flex justify-between">
                          <span className="text-sm text-text-secondary">{row.label}</span>
                          <span className="font-mono text-sm text-accent-red">{fmt(row.value)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-bg-border pt-2 mt-2">
                        <span className="font-semibold text-text-primary">Total Tax</span>
                        <span className="font-mono font-bold text-accent-red text-lg">{fmt(result.breakdown.totalTax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-text-muted">Effective Rate</span>
                        <span className="font-mono text-sm text-text-secondary">{result.breakdown.effectiveRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Savings highlight */}
                  <div className="card p-4 border border-accent-green/30 bg-accent-green/5">
                    <div className="flex items-center justify-between">
                      <span className="text-text-primary font-semibold">💰 Tax Saved via Deductions</span>
                      <span className="value-green text-xl font-display font-black">{fmt(result.breakdown.taxSaved)}</span>
                    </div>
                    <div className="flex gap-4 mt-2">
                      <span className="text-xs font-mono text-accent-gold">+{result.xpEarned} XP</span>
                      <span className="text-xs font-mono text-accent-gold">+{result.coinsEarned} 🪙</span>
                    </div>
                  </div>

                  {/* Tips */}
                  {result.tips.length > 0 && (
                    <div className="card p-5">
                      <h3 className="font-display font-bold text-text-primary mb-3">💡 Tax Saving Tips</h3>
                      <div className="space-y-3">
                        {result.tips.map((tip, i) => (
                          <div key={i} className="flex gap-3 text-sm">
                            <span className="text-accent-gold mt-0.5 shrink-0">→</span>
                            <span className="text-text-secondary leading-relaxed">{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={() => setResult(null)} className="btn-secondary w-full">
                    Recalculate
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
