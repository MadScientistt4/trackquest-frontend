import type { Metadata } from 'next'
import { Syne, JetBrains_Mono, Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'TradeQuest — Gamified Financial Education',
  description: 'Learn how markets work by playing them. Master trading, risk management, and Indian tax planning through interactive gameplay.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${jetbrainsMono.variable} ${inter.variable}`}>
      <body className="bg-bg-primary text-text-primary font-body antialiased">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#131920',
              color: '#e8f4fd',
              border: '1px solid #1e2d3d',
              fontFamily: 'var(--font-body)',
            },
            success: { iconTheme: { primary: '#00d084', secondary: '#0a0d0f' } },
            error: { iconTheme: { primary: '#ff4757', secondary: '#0a0d0f' } },
          }}
        />
        {children}
      </body>
    </html>
  )
}
