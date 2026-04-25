'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { api, type BugStats, type DashboardData, type ReportData } from '@/lib/api'
import { getAppInitial, useSystemSettings } from '@/lib/system-settings-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRight, BarChart3, CheckCircle2, Shield, Users } from 'lucide-react'

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const { settings } = useSystemSettings()
  const [stats, setStats] = useState<BugStats | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [reports, setReports] = useState<ReportData | null>(null)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    Promise.all([api.getStats(), api.getDashboard(), api.getReports()])
      .then(([statsData, dashboardData, reportsData]) => {
        setStats(statsData)
        setDashboard(dashboardData)
        setReports(reportsData)
      })
      .catch(() => {
        setStats(null)
        setDashboard(null)
        setReports(null)
      })
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">{getAppInitial(settings.app_name)}</span>
            </div>
            <span className="font-bold text-lg text-foreground">{settings.app_name}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-foreground hover:text-primary transition">Login</Link>
            {settings.allow_signup && (
              <Link href="/signup">
                <Button variant="default" size="sm">Get Started</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              {settings.app_name} bug tracking powered by your live workspace data
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Track reports, team activity, project load, and resolution status directly from the backend.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              {settings.allow_signup && (
                <Link href="/signup">
                  <Button size="lg" className="gap-2">
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
              <Link href="/login">
                <Button size="lg" variant="outline">Sign In</Button>
              </Link>
            </div>
          </div>

          <Card className="p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4">Current Workspace</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">Total Bugs</p>
                <p className="text-3xl font-bold">{stats?.total ?? 0}</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">Open Bugs</p>
                <p className="text-3xl font-bold">{stats?.open ?? 0}</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">Active Projects</p>
                <p className="text-3xl font-bold">{reports?.summary.activeProjects ?? 0}</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">Active Team</p>
                <p className="text-3xl font-bold">{dashboard?.quickActions.teamMembers ?? 0}</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 border border-border">
            <BarChart3 className="w-8 h-8 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Live Analytics</h3>
            <p className="text-muted-foreground">Reports and charts use bug, project, and resolution data from MySQL.</p>
          </Card>
          <Card className="p-6 border border-border">
            <Users className="w-8 h-8 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Team Management</h3>
            <p className="text-muted-foreground">Users, roles, statuses, preferences, and API keys are stored in the backend.</p>
          </Card>
          <Card className="p-6 border border-border">
            <Shield className="w-8 h-8 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Tracked Workflow</h3>
            <p className="text-muted-foreground">Bug creation, status changes, comments, activities, and notifications persist through the API.</p>
          </Card>
        </section>

        <section>
          <Card className="p-8 border border-border">
            <h2 className="text-2xl font-bold mb-6">Backend Status</h2>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                ['In Progress', stats?.inProgress ?? 0],
                ['Resolved', stats?.resolved ?? 0],
                ['Closed', stats?.closed ?? 0],
                ['High Priority', stats?.high ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center gap-3 rounded-lg bg-muted p-4">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-xl font-bold">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </main>
    </div>
  )
}
