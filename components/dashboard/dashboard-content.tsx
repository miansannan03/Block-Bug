'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useSystemSettings } from '@/lib/system-settings-context'
import { type Notification } from '@/lib/api'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { DashboardOverview } from './dashboard-overview'
import { BugsList } from './bugs-list'
import { ReportsPage } from './reports-page'
import { ProjectsPage } from './projects-page'
import { TesterBugReporter } from './tester-bug-reporter'
import { SettingsPage } from './settings-page'
import { TeamPage } from './team-page'
import { IntegrationsPage } from './integrations-page'

type PageType = 'overview' | 'bugs' | 'reports' | 'projects' | 'team' | 'integrations' | 'settings'

function fallbackTargetPage(notification: Notification, role?: string): PageType {
  if (notification.targetPage === 'bugs' || notification.targetPage === 'projects' || notification.targetPage === 'team' || notification.targetPage === 'integrations' || notification.targetPage === 'settings' || notification.targetPage === 'reports' || notification.targetPage === 'overview') {
    if (notification.targetPage === 'integrations' && role !== 'developer') {
      return 'settings'
    }
    return notification.targetPage
  }

  switch (notification.type) {
    case 'bug_created':
    case 'bug_assigned':
    case 'status_changed':
    case 'comment_added':
      return 'bugs'
    case 'project_created':
      return 'projects'
    case 'user_created':
    case 'user_updated':
    case 'user_login':
      return 'team'
    case 'integration_updated':
      return role === 'developer' ? 'integrations' : 'settings'
    default:
      return 'settings'
  }
}

function fallbackBugId(notification: Notification): string | null {
  if (notification.entityType === 'bug' && notification.entityId) {
    return notification.entityId
  }

  const match = notification.body?.match(/\bBUG-(\d+)\b/i)
  return match ? `bug-${match[1]}` : null
}

function resolveDefaultPage(configuredPage: string, role?: string): PageType {
  if (role === 'tester') {
    return configuredPage === 'bugs' || configuredPage === 'settings' ? configuredPage : 'overview'
  }

  if (configuredPage === 'integrations') {
    return role === 'developer' ? 'integrations' : 'overview'
  }

  if (configuredPage === 'overview' || configuredPage === 'bugs' || configuredPage === 'reports' || configuredPage === 'projects' || configuredPage === 'team' || configuredPage === 'settings') {
    return configuredPage
  }

  return 'overview'
}

export default function DashboardContent() {
  const [currentPage, setCurrentPage] = useState<PageType>('overview')
  const [notificationBugId, setNotificationBugId] = useState<string | null>(null)
  const [notificationProjectId, setNotificationProjectId] = useState<string | null>(null)
  const { user, logout } = useAuth()
  const { settings, isLoading: settingsLoading } = useSystemSettings()

  useEffect(() => {
    if (settingsLoading || !user?.role) return
    setCurrentPage(resolveDefaultPage(settings.dashboard_default_view, user.role))
  }, [settingsLoading, settings.dashboard_default_view, user?.role])

  useEffect(() => {
    if (user?.role !== 'developer' && currentPage === 'integrations') {
      setCurrentPage('overview')
    }
  }, [currentPage, user?.role])

  const handleLogout = () => {
    logout()
  }

  const handleOpenNotification = (notification: Notification) => {
    const targetPage = fallbackTargetPage(notification, user?.role)
    setCurrentPage(targetPage)

    if (targetPage === 'bugs') {
      setNotificationBugId(fallbackBugId(notification))
      setNotificationProjectId(null)
      return
    }

    if (targetPage === 'projects') {
      setNotificationProjectId(notification.entityType === 'project' ? (notification.entityId ?? null) : null)
      setNotificationBugId(null)
      return
    }

    setNotificationBugId(null)
    setNotificationProjectId(null)
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} userRole={user?.role} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          onLogout={handleLogout}
          onNavigateToPage={(page) => setCurrentPage(page as PageType)}
          onOpenNotification={handleOpenNotification}
        />

        <main className="flex-1 overflow-auto">
          <div className="h-full">
            {user?.role === 'tester' && currentPage !== 'settings' && currentPage !== 'bugs' ? (
              <TesterBugReporter />
            ) : (
              <>
                {currentPage === 'overview' && <DashboardOverview onNavigateToPage={(page) => setCurrentPage(page as PageType)} />}
                {currentPage === 'bugs' && (
                  <BugsList
                    initialSelectedBugId={notificationBugId}
                    onNotificationTargetHandled={() => setNotificationBugId(null)}
                  />
                )}
                {currentPage === 'reports' && <ReportsPage />}
                {currentPage === 'projects' && (
                  <ProjectsPage
                    initialSelectedProjectId={notificationProjectId}
                    onNotificationTargetHandled={() => setNotificationProjectId(null)}
                  />
                )}
                {currentPage === 'team' && <TeamPage />}
                {currentPage === 'integrations' && user?.role === 'developer' && <IntegrationsPage />}
                {currentPage === 'settings' && <SettingsPage />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
