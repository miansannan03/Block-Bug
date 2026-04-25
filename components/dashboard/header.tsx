'use client'

import { useEffect, useRef, useState } from 'react'
import { User } from '@/lib/auth-context'
import { api, type Notification } from '@/lib/api'
import { formatDateWithSettings, useSystemSettings } from '@/lib/system-settings-context'
import { LogOut, Bell, Settings, HelpCircle, User as UserIcon } from 'lucide-react'

interface HeaderProps {
  user: User | null
  onLogout: () => void
  onNavigateToPage: (page: string) => void
  onOpenNotification: (notification: Notification) => void
}

export function Header({ user, onLogout, onNavigateToPage, onOpenNotification }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const notificationsRef = useRef<HTMLDivElement | null>(null)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const { settings } = useSystemSettings()

  const refreshNotifications = async () => {
    if (!user) return
    try {
      const nextNotifications = await api.getNotifications(user.email)
      setNotifications(nextNotifications.filter((notification) => notification.type !== 'preferences_updated'))
    } catch {
      setNotifications([])
    }
  }

  useEffect(() => {
    if (!user) return
    void refreshNotifications()
  }, [user])

  useEffect(() => {
    if (showNotifications) {
      void refreshNotifications()
    }
  }, [showNotifications])

  useEffect(() => {
    if (!user) return

    const intervalId = window.setInterval(() => {
      void refreshNotifications()
    }, 10000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [user])

  useEffect(() => {
    function handleNotificationsUpdated() {
      void refreshNotifications()
    }

    window.addEventListener('blockbug:notifications-updated', handleNotificationsUpdated)
    return () => {
      window.removeEventListener('blockbug:notifications-updated', handleNotificationsUpdated)
    }
  }, [user])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node

      if (showNotifications && notificationsRef.current && !notificationsRef.current.contains(target)) {
        setShowNotifications(false)
      }

      if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowNotifications(false)
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showNotifications, showUserMenu])

  return (
    <header className="bg-card border-b border-border px-8 py-4 flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Welcome back, {user?.name || 'team member'}</p>
      </div>

      {user && (
        <div className="flex items-center gap-4">
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications)
                setShowUserMenu(false)
              }}
              className="relative p-2 hover:bg-muted rounded-lg transition"
            >
              <Bell className="w-5 h-5 text-foreground" />
              {notifications.some((notification) => !notification.isRead) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-xl p-0 z-50">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => {
                        onOpenNotification(notification)
                        setShowNotifications(false)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b border-border/50 last:border-0 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{notification.title}</p>
                          {notification.body && (
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{notification.body}</p>
                          )}
                        </div>
                        {!notification.isRead && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2">{formatDateWithSettings(notification.createdAt, settings, true)}</p>
                    </button>
                  ))}
                  {notifications.length === 0 && (
                    <div className="px-4 py-6 text-sm text-muted-foreground">No notifications yet.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
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
                  <p className="text-xs text-muted-foreground mt-2">{user.email}</p>
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
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted rounded transition">
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
