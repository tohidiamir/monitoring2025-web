import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PLC Dashboard',
  description: 'Real-time PLC monitoring dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
