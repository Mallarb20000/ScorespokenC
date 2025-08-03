import './globals.css'
import type { Metadata } from 'next'
import Navbar from './components/Navbar'
import ClientLayout from './ClientLayout'

export const metadata: Metadata = {
  title: 'ScoreSpoken - IELTS Speaking Practice',
  description: 'AI-powered IELTS Speaking practice platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>
          <Navbar />
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}