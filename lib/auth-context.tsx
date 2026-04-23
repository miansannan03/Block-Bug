'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type UserRole = 'admin' | 'manager' | 'developer' | 'tester'

export interface RoleDefinition {
  label: string
  description: string
  permissions: string[]
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  admin: {
    label: 'Administrator',
    description: 'Full system access, user management, and configuration control.',
    permissions: [
      'manage-users',
      'view-all-reports',
      'edit-projects',
      'assign-bugs',
      'configure-settings',
    ],
  },
  manager: {
    label: 'Manager',
    description: 'Oversees bug pipelines, assigns work, and tracks team progress.',
    permissions: [
      'view-reports',
      'assign-bugs',
      'review-bug-status',
      'approve-resolutions',
    ],
  },
  developer: {
    label: 'Developer',
    description: 'Fixes bugs, comments on reports, and updates status through the workflow.',
    permissions: [
      'view-assigned-bugs',
      'comment-on-bugs',
      'change-bug-status',
      'update-resolution-details',
    ],
  },
  tester: {
    label: 'Tester',
    description: 'Reports bugs, verifies fixes, and tracks bug resolution status.',
    permissions: [
      'create-bug-report',
      'view-my-bug-reports',
      'add-bug-comments',
      'verify-fixes',
    ],
  },
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  availableUsers: User[]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type StoredUser = User & { password: string }

const MOCK_USERS: StoredUser[] = [
  { id: '1', name: 'Alex Chen', email: 'alex@blockbug.dev', password: 'demo123', role: 'admin' },
  { id: '2', name: 'Nina Park', email: 'nina@blockbug.dev', password: 'demo123', role: 'manager' },
  { id: '3', name: 'Sarah Dev', email: 'sarah@blockbug.dev', password: 'demo123', role: 'developer' },
  { id: '4', name: 'Mike Tester', email: 'mike@blockbug.dev', password: 'demo123', role: 'tester' },
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('blockbug_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('blockbug_user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const mockUser = MOCK_USERS.find(u => u.email === email && u.password === password)
    if (mockUser) {
      const user: User = { id: mockUser.id, name: mockUser.name, email: mockUser.email, role: mockUser.role }
      setUser(user)
      localStorage.setItem('blockbug_user', JSON.stringify(user))
      setIsLoading(false)
      return
    }

    setIsLoading(false)
    throw new Error('Invalid email or password')
  }

  const signup = async (name: string, email: string, password: string) => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      role: 'tester',
    }
    setUser(newUser)
    localStorage.setItem('blockbug_user', JSON.stringify(newUser))
    setIsLoading(false)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('blockbug_user')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
        availableUsers: MOCK_USERS.map(({ password, ...userData }) => userData),
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
