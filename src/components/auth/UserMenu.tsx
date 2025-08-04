/**
 * =============================================================================
 * USER MENU COMPONENT
 * =============================================================================
 * 
 * Dropdown menu for authenticated users showing profile info and logout option.
 * Displays user avatar, name, and authentication status.
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const UserMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { user, signOut, loading } = useAuth()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    setIsOpen(false)
    await signOut()
  }

  if (loading || !user) {
    return null
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'User'
  const avatar = user.photoURL

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="user-menu-button"
      >
        {avatar ? (
          <img
            src={avatar}
            alt="Profile"
            className="user-avatar"
          />
        ) : (
          <div className="user-avatar-fallback">
            <span>
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span className="text-secondary text-sm font-medium hidden sm:block">
          {displayName}
        </span>
        <svg
          className={`user-menu-arrow ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ 
            width: '1rem', 
            height: '1rem', 
            color: 'var(--color-muted)',
            transition: 'transform 0.15s ease'
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <p className="text-sm font-medium text-primary">{displayName}</p>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
          
          <div>
            <button
              onClick={() => {
                setIsOpen(false)
                // TODO: Add profile/settings navigation
                console.log('Navigate to profile')
              }}
              className="user-menu-item"
            >
              Profile Settings
            </button>
            
            <button
              onClick={() => {
                setIsOpen(false)
                // TODO: Add test history navigation
                console.log('Navigate to test history')
              }}
              className="user-menu-item"
            >
              Test History
            </button>
            
            <div className="user-menu-divider"></div>
            
            <button
              onClick={handleSignOut}
              className="user-menu-item danger"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserMenu