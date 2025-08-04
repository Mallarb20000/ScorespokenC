import './globals.css'
import type { Metadata } from 'next'
import Navbar from './components/Navbar'
import ClientLayout from './ClientLayout'
import { AuthProvider } from '@/contexts/AuthContext'

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
        <AuthProvider>
          <ClientLayout>
            <Navbar />
            {children}
          </ClientLayout>
        </AuthProvider>
      </body>
    </html>
  )
}