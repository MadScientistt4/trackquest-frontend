import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-bg-primary flex items-center justify-center text-center px-6">
      <div>
        <div className="font-mono text-8xl font-black text-bg-border mb-4">404</div>
        <h1 className="font-display font-black text-2xl text-text-primary mb-2">Page Not Found</h1>
        <p className="text-text-secondary mb-8">This chart doesn't exist in our market data.</p>
        <Link href="/" className="btn-primary px-8 py-3">Back to Home</Link>
      </div>
    </main>
  )
}
