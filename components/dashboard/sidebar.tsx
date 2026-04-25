'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BarChart3, Bug, FolderOpen, Settings, Home, Moon, Sun, HelpCircle, Users, Plug } from 'lucide-react'
import type { UserRole } from '@/lib/api'
import { getAppInitial, useSystemSettings } from '@/lib/system-settings-context'
import { useTheme } from 'next-themes'

interface SidebarProps {
  currentPage: string
  onPageChange: (page: any) => void
  userRole?: UserRole
}

export function Sidebar({ currentPage, onPageChange, userRole }: SidebarProps) {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const { settings } = useSystemSettings()

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentTheme = mounted ? resolvedTheme : 'light'

  const getMenuItems = () => {
    if (userRole === 'tester') {
      return [
        { id: 'overview', label: 'My Dashboard', icon: Home },
        { id: 'bugs', label: 'Bug Reports', icon: Bug },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]
    }

    const baseItems = [
      { id: 'overview', label: 'Overview', icon: Home },
      { id: 'bugs', label: 'Bug Reports', icon: Bug },
      { id: 'reports', label: 'Analytics', icon: BarChart3 },
      { id: 'projects', label: 'Projects', icon: FolderOpen },
      { id: 'team', label: 'Team', icon: Users },
      { id: 'settings', label: 'Settings', icon: Settings },
    ]

    if (userRole === 'admin') {
      return baseItems
    }

    return [
      ...baseItems.slice(0, 5),
      { id: 'integrations', label: 'Integrations', icon: Plug },
      baseItems[5],
    ]
  }

  const menuItems = getMenuItems()

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-sidebar-primary-foreground font-bold text-lg">{getAppInitial(settings.app_name)}</span>
          </div>
          <div>
            <span className="font-bold text-lg text-sidebar-foreground block">{settings.app_name}</span>
            <span className="text-xs text-muted-foreground">Team Edition</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
                isActive
                  ? 'bg-gradient-to-r from-primary/20 to-accent/20 text-primary border border-primary/20 shadow-sm'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
        <button
          onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-sidebar-accent/50 rounded-lg transition"
        >
          <span className="text-xs font-medium text-sidebar-foreground">Theme</span>
          {currentTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-sidebar-foreground" />
          ) : (
            <Moon className="w-4 h-4 text-sidebar-foreground" />
          )}
        </button>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{settings.app_name} v1.0</span>
          <button className="hover:text-primary transition">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
