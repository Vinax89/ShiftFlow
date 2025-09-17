import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Shift Flow',
  description: 'Personal finance for shift workers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">{children}</body>
    </html>
  )
}
