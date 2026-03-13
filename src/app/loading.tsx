export default function Loading() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-bg-border border-t-accent-green rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-muted font-mono text-sm">Loading market data...</p>
      </div>
    </div>
  )
}
