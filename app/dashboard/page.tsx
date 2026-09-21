'use client'

import { useAuth } from '@/lib/auth-context'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import DashboardContent from '@/components/dashboard/dashboard-content'

export default function DashboardPage() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true })
    } else if (!isLoading && user?.role === 'super_admin') {
      navigate('/super-admin', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate, user?.role])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated || user?.role === 'super_admin') {
    return null
  }

  return <DashboardContent />
}
