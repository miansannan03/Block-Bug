'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { api, type Organization, type User, type UserRole } from '@/lib/api'
import { useSystemSettings } from '@/lib/system-settings-context'

export type { User, UserRole }

export interface RoleDefinition {
  label: string
  description: string
  permissions: string[]
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  super_admin: {
    label: 'Super Admin',
    description: 'Platform-level administration outside customer organizations.',
    permissions: ['Manage organizations', 'View platform metrics', 'Review platform logs'],
  },
  admin: {
    label: 'Administrator',
    description: 'Full system access with user management and settings control.',
    permissions: [
      'Full system access',
      'Manage users',
      'Configure settings',
    ],
  },
  manager: {
    label: 'Manager',
    description: 'Reviews bug pipelines, assigns work, and monitors reporting.',
    permissions: [
      'Review pipelines',
      'Assign bugs',
      'View reports',
    ],
  },
  developer: {
    label: 'Developer',
    description: 'Fixes assigned bugs and keeps reports updated through the workflow.',
    permissions: [
      'Fix bugs',
      'Comment on bug reports',
      'Update bug status',
    ],
  },
  tester: {
    label: 'Tester',
    description: 'Reports bugs, tracks submitted reports, and verifies completed fixes.',
    permissions: [
      'Report bugs',
      'Track their reports',
      'Verify fixes',
    ],
  },
}

interface AuthContextType {
  user: User | null
  organization: Organization | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  updateProfile: (name: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  availableUsers: User[]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const { settings } = useSystemSettings()

  const rememberOrganizationFromUser = (nextUser: User) => {
    if (!nextUser.organizationId || !nextUser.organizationName || !nextUser.organizationEmail) {
      return
    }

    const nextOrganization: Organization = {
      id: nextUser.organizationId,
      name: nextUser.organizationName,
      loginEmail: nextUser.organizationEmail,
      status: 'active',
    }

    setOrganization(nextOrganization)
    localStorage.setItem('blockbug_organization', JSON.stringify(nextOrganization))
  }

  useEffect(() => {
    const token = localStorage.getItem('blockbug_token')
    if (!token) {
      setIsLoading(false)
      return
    }
    api.me()
      .then(({ user: currentUser }) => {
        setUser(currentUser)
        rememberOrganizationFromUser(currentUser)
        localStorage.setItem('blockbug_user', JSON.stringify(currentUser))
        if (currentUser.role !== 'super_admin') return api.getUsers().then(setAvailableUsers)
      })
      .catch(() => {
        localStorage.removeItem('blockbug_token')
        localStorage.removeItem('blockbug_user')
        localStorage.removeItem('blockbug_organization')
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return

    const storageKey = 'blockbug_last_active_at'
    const timeoutMs = Math.max(15, Number(settings.session_timeout_minutes) || 120) * 60 * 1000

    const bumpActivity = () => {
      localStorage.setItem(storageKey, String(Date.now()))
    }

    const checkSession = () => {
      const lastActive = Number(localStorage.getItem(storageKey) || 0)
      if (lastActive > 0 && Date.now() - lastActive > timeoutMs) {
        logout()
      }
    }

    bumpActivity()
    const intervalId = window.setInterval(checkSession, 30000)
    window.addEventListener('pointerdown', bumpActivity)
    window.addEventListener('keydown', bumpActivity)
    window.addEventListener('scroll', bumpActivity, true)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('pointerdown', bumpActivity)
      window.removeEventListener('keydown', bumpActivity)
      window.removeEventListener('scroll', bumpActivity, true)
    }
  }, [settings.session_timeout_minutes, user])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const { user, token } = await api.login(email, password)
      localStorage.setItem('blockbug_token', token)
      setUser(user)
      if (user.role === 'super_admin') {
        setOrganization(null)
        localStorage.removeItem('blockbug_organization')
      }
      rememberOrganizationFromUser(user)
      localStorage.setItem('blockbug_user', JSON.stringify(user))
      localStorage.setItem('blockbug_last_active_at', String(Date.now()))
      if (user.role !== 'super_admin') try {
        setAvailableUsers(await api.getUsers())
      } catch {
        setAvailableUsers([])
      }
      window.dispatchEvent(new Event('blockbug:auth-changed'))
      return user
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    void api.logout().catch(() => undefined)
    setUser(null)
    setOrganization(null)
    setAvailableUsers([])
    localStorage.removeItem('blockbug_token')
    localStorage.removeItem('blockbug_user')
    localStorage.removeItem('blockbug_organization')
    localStorage.removeItem('blockbug_last_active_at')
    window.dispatchEvent(new Event('blockbug:auth-changed'))
  }

  const updateProfile = async (name: string) => {
    if (!user) return
    const { user: updatedUser } = await api.updateUser(user.id, { name })
    setUser(updatedUser)
    localStorage.setItem('blockbug_user', JSON.stringify(updatedUser))
    localStorage.setItem('blockbug_last_active_at', String(Date.now()))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isLoading,
        login,
        updateProfile,
        logout,
        isAuthenticated: !!user,
        availableUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
