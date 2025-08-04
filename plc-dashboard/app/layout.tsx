import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'داشبورد نظارت اتوکلاو',
  description: 'داشبورد نظارت بر سیستم‌های اتوکلاو در زمان واقعی',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="preload" href="/fonts/Vazir-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Vazir-Bold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Vazir-Medium.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="font-vazir">{children}</body>
    </html>
  )
}
