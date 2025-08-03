'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/quick-drill', label: 'Quick Drill', icon: '⚡' },
    { href: '/part1-drill', label: 'Part 1', icon: '👤' },
    { href: '/part2-drill', label: 'Part 2', icon: '📝' },
    { href: '/part3-drill', label: 'Part 3', icon: '💭' },
  ]

  const isActive = (href: string) => pathname === href

  return (
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
      </div>
    </nav>
  )
}