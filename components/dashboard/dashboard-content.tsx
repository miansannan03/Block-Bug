'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
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

type PageType = 'overview' | 'bugs' | 'reports' | 'projects' | 'team' | 'integrations' | 'settings'

function fallbackTargetPage(notification: Notification, role?: string): PageType {
  if (notification.targetPage === 'bugs' || notification.targetPage === 'projects' || notification.targetPage === 'team' || notification.targetPage === 'integrations' || notification.targetPage === 'settings' || notification.targetPage === 'reports' || notification.targetPage === 'overview') {
    if (notification.targetPage === 'integrations') {
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
      return 'settings'
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

function resolveDefaultPage(): PageType {
  return 'overview'
}

export default function DashboardContent() {
  const [currentPage, setCurrentPage] = useState<PageType>('overview')
  const [pageRefreshNonce, setPageRefreshNonce] = useState(0)
  const [notificationBugId, setNotificationBugId] = useState<string | null>(null)
  const [notificationProjectId, setNotificationProjectId] = useState<string | null>(null)
  const mainScrollRef = useRef<HTMLElement | null>(null)
  const { user, logout } = useAuth()

  useEffect(() => {
    if (!user?.role) return
    setCurrentPage(resolveDefaultPage())
  }, [user?.role])

  useEffect(() => {
    if (!user?.role) return

    if (currentPage === 'integrations') {
      setCurrentPage('overview')
      return
    }

    if (user.role === 'developer' && (currentPage === 'reports' || currentPage === 'team')) {
      setCurrentPage('overview')
    }
  }, [currentPage, user?.role])

  const handleLogout = () => {
    logout()
  }

  const handlePageChange = (page: PageType) => {
    setNotificationBugId(null)
    setNotificationProjectId(null)
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' })
    if (page === currentPage) {
      setPageRefreshNonce((prev) => prev + 1)
      return
    }
    setCurrentPage(page)
  }

  const handleOpenNotification = (notification: Notification) => {
    const targetPage = fallbackTargetPage(notification, user?.role)
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' })
    setCurrentPage(targetPage)
    setPageRefreshNonce((prev) => prev + 1)

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

  const handleOpenBug = (bugId: string) => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' })
    setNotificationProjectId(null)
    setNotificationBugId(bugId)
    setCurrentPage('bugs')
    setPageRefreshNonce((prev) => prev + 1)
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar currentPage={currentPage} onPageChange={(page) => handlePageChange(page as PageType)} userRole={user?.role} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          onLogout={handleLogout}
          onNavigateToPage={(page) => handlePageChange(page as PageType)}
          onOpenNotification={handleOpenNotification}
        />

        <main ref={mainScrollRef} className="flex-1 overflow-auto">
          <div className="h-full">
            {user?.role === 'tester' && currentPage === 'overview' ? (
              <TesterBugReporter key={`tester-${currentPage}-${pageRefreshNonce}`} />
            ) : (
              <>
                {currentPage === 'overview' && (
                  <DashboardOverview
                    key={`overview-${pageRefreshNonce}`}
                    onNavigateToPage={(page) => handlePageChange(page as PageType)}
                    onOpenBug={handleOpenBug}
                  />
                )}
                {currentPage === 'bugs' && (
                  <BugsList
                    key={`bugs-${pageRefreshNonce}`}
                    initialSelectedBugId={notificationBugId}
                    onNotificationTargetHandled={() => setNotificationBugId(null)}
                  />
                )}
                {currentPage === 'reports' && user?.role !== 'developer' && <ReportsPage key={`reports-${pageRefreshNonce}`} />}
                {currentPage === 'projects' && (
                  <ProjectsPage
                    key={`projects-${pageRefreshNonce}`}
                    initialSelectedProjectId={notificationProjectId}
                    onNotificationTargetHandled={() => setNotificationProjectId(null)}
                  />
                )}
                {currentPage === 'team' && <TeamPage key={`team-${pageRefreshNonce}`} />}
                {currentPage === 'settings' && <SettingsPage key={`settings-${pageRefreshNonce}`} />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
