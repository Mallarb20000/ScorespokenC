'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import UserMenu from '@/components/auth/UserMenu'
import LoginModal from '@/components/auth/LoginModal'

export default function Navbar() {
  const pathname = usePathname()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const { user, loading } = useAuth()

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/quick-drill', label: 'Quick Drill', icon: '⚡' },
    { href: '/part1-drill', label: 'Part 1', icon: '👤' },
    { href: '/part2-drill', label: 'Part 2', icon: '📝' },
    { href: '/part3-drill', label: 'Part 3', icon: '💭' },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          {/* Logo */}
          <Link href="/" className="navbar-logo">
            <span className="navbar-logo-icon">🎙️</span>
            <span className="navbar-logo-text">ScoreSpoken</span>
          </Link>

          {/* Navigation Links */}
          <div className="navbar-nav">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`navbar-link ${isActive(item.href) ? 'navbar-link-active' : ''}`}
              >
                <span className="navbar-link-icon">{item.icon}</span>
                <span className="navbar-link-text">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Auth Section */}
          <div className="navbar-auth">
            {loading ? (
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : user ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        mode="login"
      />
    </>
  )
}