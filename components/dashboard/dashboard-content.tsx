'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { DashboardOverview } from './dashboard-overview'
import { BugsList } from './bugs-list'
import { ReportsPage } from './reports-page'
import { ProjectsPage } from './projects-page'
import { SettingsPage } from './settings-page'

type PageType = 'overview' | 'bugs' | 'reports' | 'projects' | 'settings'

export default function DashboardContent() {
  const [currentPage, setCurrentPage] = useState<PageType>('overview')
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onLogout={handleLogout} />

        <main className="flex-1 overflow-auto">
          <div className="h-full">
            {currentPage === 'overview' && <DashboardOverview />}
            {currentPage === 'bugs' && <BugsList />}
            {currentPage === 'reports' && <ReportsPage />}
            {currentPage === 'projects' && <ProjectsPage />}
            {currentPage === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>
    </div>
  )
}
