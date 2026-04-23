'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type UserRole = 'admin' | 'manager' | 'developer' | 'tester'

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const MOCK_USERS = [
  { id: '1', name: 'Alex Chen', email: 'alex@blockbug.dev', password: 'demo123', role: 'admin' as UserRole },
  { id: '2', name: 'Sarah Dev', email: 'sarah@blockbug.dev', password: 'demo123', role: 'developer' as UserRole },
  { id: '3', name: 'Mike Tester', email: 'mike@blockbug.dev', password: 'demo123', role: 'tester' as UserRole },
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
    } else {
      throw new Error('Invalid email or password')
    }
    setIsLoading(false)
  }

  const signup = async (name: string, email: string, password: string) => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      role: 'developer',
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
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, isAuthenticated: !!user }}>
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
