import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Stead — Your Family\'s Home Base',
  description: 'Health, home, vehicles, and family schedules — all in one place.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
