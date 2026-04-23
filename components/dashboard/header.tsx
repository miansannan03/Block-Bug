'use client'

import { User } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { LogOut, Bell, Settings, HelpCircle, User as UserIcon } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  user: User | null
  onLogout: () => void
  onNavigateToPage: (page: string) => void
}

export function Header({ user, onLogout, onNavigateToPage }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className="bg-card border-b border-border px-8 py-4 flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Welcome back! 👋</p>
      </div>

      {user && (
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications)
                setShowUserMenu(false)
              }}
              className="relative p-2 hover:bg-muted rounded-lg transition"
            >
              <Bell className="w-5 h-5 text-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-xl p-0 z-50">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {[
                    { title: 'Bug #123 assigned to you', time: '5 min ago', icon: '🐛' },
                    { title: 'Sarah approved your comment', time: '1 hour ago', icon: '✓' },
                    { title: 'New bug reported in Mobile App', time: '2 hours ago', icon: '📱' },
                  ].map((notif, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b border-border/50 last:border-0 transition"
                    >
                      <p className="text-sm font-medium text-foreground">{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu)
                setShowNotifications(false)
              }}
              className="flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-lg transition"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-xl p-0 z-50">
                <div className="p-4 border-b border-border">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{user.role}</p>
                  <p className="text-xs text-muted-foreground mt-2">demo@blockbug.com</p>
                </div>
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => {
                      onNavigateToPage('settings')
                      setShowUserMenu(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted rounded transition"
                  >
                    <UserIcon className="w-4 h-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      onNavigateToPage('settings')
                      setShowUserMenu(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted rounded transition"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted rounded transition"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Help
                  </button>
                </div>
                <div className="p-2 border-t border-border">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-500/10 rounded transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
