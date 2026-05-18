'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { api, type Activity, type Bug, type BugStats, type DashboardData } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { AlertCircle, CheckCircle2, Clock, FolderOpen, RefreshCcw, UserRound } from 'lucide-react'
import HighchartsReact from 'highcharts-react-official'
import Highcharts from 'highcharts'

interface DashboardOverviewProps {
  onNavigateToPage: (page: string) => void
  onOpenBug?: (bugId: string) => void
}

export function DashboardOverview({ onNavigateToPage, onOpenBug }: DashboardOverviewProps) {
  const { user } = useAuth()
  const [stats, setStats] = useState<BugStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    critical: 0,
    high: 0,
  })
  const [recentActivity, setRecentActivity] = useState<Activity[]>([])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [bugs, setBugs] = useState<Bug[]>([])
  const [error, setError] = useState('')
  const [updatingBugId, setUpdatingBugId] = useState<string | null>(null)
  const isDeveloper = user?.role === 'developer'

  useEffect(() => {
    Promise.all([api.getStats(), api.getActivities(), api.getDashboard(), api.getBugs()])
      .then(([statsData, activitiesData, dashboardData, bugsData]) => {
        setStats(statsData)
        setRecentActivity(activitiesData.slice(0, 5))
        setDashboard(dashboardData)
        setBugs(bugsData)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load dashboard data'))
  }, [])

  const developerBugs = useMemo(() => {
    if (!user?.email) return []
    return bugs.filter((bug) => bug.assignedTo === user.email)
  }, [bugs, user?.email])

  const developerBugIds = useMemo(() => new Set(developerBugs.map((bug) => bug.id)), [developerBugs])

  const bugsById = useMemo(() => {
    return new Map(bugs.map((bug) => [bug.id, bug]))
  }, [bugs])

  const developerSummary = useMemo(() => {
    const assigned = developerBugs.length
    const open = developerBugs.filter((bug) => bug.status === 'open').length
    const inProgress = developerBugs.filter((bug) => bug.status === 'in-progress').length
    const resolved = developerBugs.filter((bug) => bug.status === 'resolved').length
    return { assigned, open, inProgress, resolved }
  }, [bugs, developerBugs])

  const openAssignedBugs = useMemo(() => {
    return developerBugs.filter((bug) => bug.status === 'open')
  }, [developerBugs])

  const developerRecentActivity = useMemo(() => {
    return recentActivity.filter((activity) => activity.bugId && developerBugIds.has(activity.bugId)).slice(0, 5)
  }, [developerBugIds, recentActivity])

  const displayedActivity = isDeveloper ? developerRecentActivity : recentActivity

  const formatActivityTypeLabel = (type: Activity['type']) => {
    switch (type) {
      case 'status_changed':
        return 'Status Change'
      case 'assigned':
        return 'Assignment'
      case 'verified':
        return 'Verification'
      case 'commented':
        return 'Comment'
      default:
        return 'Activity'
    }
  }

  const formatStatusLabel = (status: Bug['status']) => {
    switch (status) {
      case 'in-progress':
        return 'In Progress'
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const getActivityAgeLabel = (timestamp: Date) => {
    const elapsedHours = Math.max(0, Math.floor((Date.now() - timestamp.getTime()) / (1000 * 60 * 60)))
    return `${elapsedHours} hour${elapsedHours === 1 ? '' : 's'} ago`
  }

  const handleStartDeveloperBug = async (bug: Bug) => {
    if (!user?.email || updatingBugId) return

    setUpdatingBugId(bug.id)
    setError('')
    try {
      const updatedBug = await api.updateBug(bug.id, {
        status: 'in-progress',
        userEmail: user.email,
        userName: user.name,
      })

      setBugs((prev) => prev.map((item) => (item.id === updatedBug.id ? updatedBug : item)))
      setRecentActivity((prev) => [
        {
          id: `local-${updatedBug.id}-${Date.now()}`,
          bugId: updatedBug.id,
          type: 'status_changed' as const,
          userId: user.email,
          userName: user.name,
          message: `${user.name} moved ${updatedBug.id} to in progress`,
          timestamp: new Date(),
        },
        ...prev,
      ].slice(0, 5))
      window.dispatchEvent(new Event('blockbug:notifications-updated'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not move the bug into progress')
    } finally {
      setUpdatingBugId(null)
    }
  }

  // Line chart options for bugs reported
  const lineChartOptions: Highcharts.Options = {
    chart: {
      type: 'line',
      backgroundColor: 'transparent',
      style: {
        fontFamily: 'var(--font-sans)',
      },
      height: 300,
      borderWidth: 0,
      plotBorderWidth: 0,
    },
    title: {
      text: undefined,
    },
    xAxis: {
      categories: dashboard?.weeklyBugs.categories || [],
      lineColor: '#e5e7eb',
      crosshair: true,
      labels: {
        style: {
          color: '#888888',
          fontSize: '12px',
        },
      },
    },
    yAxis: {
      title: {
        text: undefined,
      },
      gridLineColor: '#e5e7eb',
      labels: {
        style: {
          color: '#888888',
          fontSize: '12px',
        },
      },
    },
    legend: {
      enabled: false,
    },
    plotOptions: {
      line: {
        dataLabels: {
          enabled: false,
        },
        enableMouseTracking: true,
      },
      series: {
        lineWidth: 3,
      },
    },
    series: [
      {
        name: 'Bugs Reported',
        data: dashboard?.weeklyBugs.data || [],
        type: 'line',
        color: '#7c3aed',
        lineWidth: 3,
        marker: {
          enabled: true,
          radius: 5,
          fillColor: '#7c3aed',
          lineColor: '#ffffff',
          lineWidth: 2,
        },
        states: {
          hover: {
            lineWidth: 4,
            marker: {
              radius: 6,
            },
          },
        },
      } as any,
    ],
    tooltip: {
      enabled: true,
      shared: false,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      borderColor: 'hsl(var(--border))',
      borderRadius: 4,
      style: {
        color: '#FFFFFF',
      },
      headerFormat: '<b>{point.key}</b><br/>',
      pointFormat: '{series.name}: <b>{point.y}</b> bugs',
    },
    credits: {
      enabled: false,
    },
    responsive: {
      rules: [
        {
          condition: {
            maxWidth: 500,
          },
          chartOptions: {
            chart: {
              height: 250,
            },
          },
        },
      ],
    },
  }

  // Pie chart options for bug status
  const pieChartOptions: Highcharts.Options = {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      style: {
        fontFamily: 'var(--font-sans)',
      },
      height: 300,
      borderWidth: 0,
      plotBorderWidth: 0,
    },
    title: {
      text: undefined,
    },
    plotOptions: {
      pie: {
        innerSize: '60%',
        dataLabels: {
          enabled: true,
          style: {
            color: '#1f2937',
            fontSize: '11px',
            fontWeight: 'bold',
          },
          format: '{point.name}',
        },
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    },
    series: [
      {
        type: 'pie',
        name: 'Bug Status',
        data: [
          { name: 'Open', y: stats.open, color: '#8b5cf6' },
          { name: 'In Progress', y: stats.inProgress, color: '#6366f1' },
          { name: 'Resolved', y: stats.resolved, color: '#3b82f6' },
          { name: 'Closed', y: stats.closed, color: '#10b981' },
        ],
      },
    ],
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      borderColor: '#d1d5db',
      borderRadius: 4,
      style: {
        color: '#FFFFFF',
      },
      headerFormat: '',
      pointFormat: '<b>{point.name}</b><br/>Bugs: {point.y}<br/>Percentage: {point.percentage:.1f}%',
    },
    credits: {
      enabled: false,
    },
    responsive: {
      rules: [
        {
          condition: {
            maxWidth: 500,
          },
          chartOptions: {
            chart: {
              height: 250,
            },
          },
        },
      ],
    },
  }

  return (
    <div className="p-8 space-y-8">
      {error && (
        <Card className="p-4 border border-destructive text-destructive">{error}</Card>
      )}
      {isDeveloper ? (
        <>
          <div>
            <h2 className="text-3xl font-bold text-foreground">My Work</h2>
            <p className="text-muted-foreground mt-1">Stay focused on your assigned bugs and what needs your attention next.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <UserRound className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{developerSummary.assigned}</p>
                  <p className="text-sm text-muted-foreground">Assigned Bugs</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{developerSummary.open}</p>
                  <p className="text-sm text-muted-foreground">Open Assigned</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{developerSummary.inProgress}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{developerSummary.resolved}</p>
                  <p className="text-sm text-muted-foreground">Waiting for Verification</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="border border-amber-200/70 bg-amber-50/30 p-6 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/10">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Ready to Start</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  These open bugs are already assigned to you and are waiting for you to move them into progress.
                </p>
              </div>
              <span className="rounded-full border border-amber-300/70 bg-background/90 px-3 py-1 text-sm font-medium text-amber-700 dark:border-amber-800 dark:text-amber-300">
                {openAssignedBugs.length} waiting
              </span>
            </div>

            {openAssignedBugs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-300/70 bg-background/70 px-6 py-10 text-center text-muted-foreground dark:border-amber-800/60">
                No open assigned bugs are waiting for you right now.
              </div>
            ) : (
              <div className="space-y-3">
                {openAssignedBugs.map((bug) => (
                  <div
                    key={bug.id}
                    className="rounded-xl border border-amber-200/70 bg-background/80 p-4 shadow-sm dark:border-amber-900/40"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <button
                        type="button"
                        onClick={() => onOpenBug?.(bug.id)}
                        className="min-w-0 flex-1 rounded-xl p-1 text-left transition hover:bg-muted/20"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold text-foreground">{bug.title}</p>
                          <span className="rounded-full border border-border/70 bg-muted/20 px-2 py-1 text-[11px] font-medium text-foreground/80">
                            {bug.id}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="rounded-full border border-border/70 bg-background/90 px-2 py-1 font-medium text-foreground/80">
                            Open
                          </span>
                          <span className="rounded-full border border-border/70 bg-background/90 px-2 py-1 font-medium text-foreground/80 capitalize">
                            {bug.priority} priority
                          </span>
                          <span className="rounded-full border border-border/70 bg-background/90 px-2 py-1 font-medium text-foreground/80 capitalize">
                            {bug.severity} severity
                          </span>
                          {bug.environment && (
                            <span className="rounded-full border border-border/70 bg-background/90 px-2 py-1 font-medium text-foreground/80 capitalize">
                              {bug.environment}
                            </span>
                          )}
                        </div>
                      </button>

                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleStartDeveloperBug(bug)}
                          disabled={updatingBugId === bug.id}
                        >
                          {updatingBugId === bug.id ? 'Saving...' : 'Start Work'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="border border-border/70 bg-card p-6 shadow-sm">
            <div className="mb-4 border-b border-border/60 pb-3">
              <h3 className="text-xl font-semibold text-foreground">Recent Activity On My Bugs</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                A focused stream of updates tied only to the bugs currently assigned to you.
              </p>
            </div>
            <div className="space-y-4">
              {displayedActivity.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 py-10 text-center text-muted-foreground">
                  No recent activity is tied to your assigned bugs yet.
                </div>
              ) : (
                displayedActivity.map((activity) => (
                  <div key={activity.id} className="rounded-xl border border-border/70 bg-muted/10 p-4 shadow-sm transition hover:bg-muted/20">
                    <div className="flex items-start gap-4">
                      <div className={`mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                        activity.type === 'status_changed' ? 'bg-blue-500' :
                        activity.type === 'assigned' ? 'bg-purple-500' :
                        activity.type === 'verified' ? 'bg-green-500' :
                        activity.type === 'commented' ? 'bg-orange-500' :
                        'bg-primary'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{activity.userName}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground/70">
                              {formatActivityTypeLabel(activity.type)}
                            </p>
                          </div>
                          <span className="rounded-full border border-border/70 bg-background/90 px-2 py-1 text-[11px] text-muted-foreground">
                            {getActivityAgeLabel(activity.timestamp)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{activity.message}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                          {activity.bugId && bugsById.get(activity.bugId)?.title && (
                            <span className="max-w-full truncate rounded-full border border-border/70 bg-background/90 px-2 py-1 font-medium text-foreground/85">
                              {bugsById.get(activity.bugId)?.title}
                            </span>
                          )}
                          {activity.bugId && (
                            <span className="rounded-full border border-border/70 bg-background/90 px-2 py-1 font-medium text-foreground/80">
                              {activity.bugId}
                            </span>
                          )}
                          {activity.bugId && bugsById.get(activity.bugId)?.status && (
                            <span className="rounded-full border border-border/70 bg-background/90 px-2 py-1 font-medium text-foreground/80">
                              {formatStatusLabel(bugsById.get(activity.bugId)!.status)}
                            </span>
                          )}
                          {activity.bugId && bugsById.get(activity.bugId)?.priority && (
                            <span className="rounded-full border border-border/70 bg-background/90 px-2 py-1 font-medium text-foreground/80">
                              {bugsById.get(activity.bugId)?.priority} priority
                            </span>
                          )}
                          <span className="uppercase tracking-wide text-muted-foreground/80">
                            Logged {getActivityAgeLabel(activity.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      ) : (
      <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 border border-border hover:border-primary hover:shadow-lg transition group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Bugs</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.total}</p>
              <p className={`text-xs mt-2 ${(dashboard?.weekDelta.percent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {dashboard
                  ? `${dashboard.weekDelta.percent >= 0 ? '+' : ''}${dashboard.weekDelta.percent}% from last week`
                  : 'Loading trend'}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center group-hover:bg-red-500/20 transition">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-border hover:border-primary hover:shadow-lg transition group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Open Issues</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.open}</p>
              <p className="text-xs text-red-600 mt-2">-8% from last week</p>
            </div>
            <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center group-hover:bg-orange-500/20 transition">
              <AlertCircle className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-border hover:border-primary hover:shadow-lg transition group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.inProgress}</p>
              <p className="text-xs text-blue-600 mt-2">On track</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-border hover:border-primary hover:shadow-lg transition group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Resolved</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.resolved}</p>
              <p className="text-xs text-green-600 mt-2">+23% from last week</p>
            </div>
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20 transition">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 border border-border lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Bugs Reported (Last 7 Days)</h3>
          <HighchartsReact highcharts={Highcharts} options={lineChartOptions} />
        </Card>

        <Card className="p-6 border border-border">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Bug Status</h3>
          <HighchartsReact highcharts={Highcharts} options={pieChartOptions} />
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 border border-border lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-border last:border-0 hover:bg-muted/30 -mx-2 px-2 py-1 rounded transition">
                <div className={`w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 ${
                  activity.type === 'created' ? 'bg-red-500' :
                  activity.type === 'status_changed' ? 'bg-blue-500' :
                  activity.type === 'assigned' ? 'bg-purple-500' :
                  activity.type === 'verified' ? 'bg-green-500' :
                  'bg-primary'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activity.userName}
                    {' '}
                    <span className="text-muted-foreground">
                      {activity.type === 'status_changed' && 'changed status'}
                      {activity.type === 'assigned' && 'assigned bug'}
                      {activity.type === 'verified' && 'verified fix'}
                      {activity.type === 'commented' && 'commented'}
                      {activity.type === 'created' && 'reported'}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">{activity.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.floor((Date.now() - activity.timestamp.getTime()) / (1000 * 60 * 60))} hours ago
                  </p>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent activity yet.</p>
            )}
          </div>
        </Card>

        <Card className="p-6 border border-border">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Quick Actions</h3>
          <div className="space-y-3">
            <button onClick={() => onNavigateToPage('bugs')} className="w-full px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition font-medium text-sm text-left">
              New bug report ({dashboard?.quickActions.openBugs ?? 0} open)
            </button>
            <button onClick={() => onNavigateToPage('reports')} className="w-full px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-lg transition font-medium text-sm text-left">
              View analytics ({dashboard?.quickActions.analyticsReports ?? 0} reports)
            </button>
            <button onClick={() => onNavigateToPage('bugs')} className="w-full px-4 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-600 rounded-lg transition font-medium text-sm text-left">
              Verify fixes ({dashboard?.quickActions.pendingVerification ?? 0} pending)
            </button>
            <button onClick={() => onNavigateToPage('team')} className="w-full px-4 py-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 rounded-lg transition font-medium text-sm text-left">
              Manage team ({dashboard?.quickActions.teamMembers ?? 0} active)
            </button>
            <div className="pt-3 mt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Active Team Members</p>
              <div className="flex gap-2">
                {(dashboard?.activeUsers || []).map((member) => (
                  <div key={member.id} className="flex items-center gap-1" title={member.name}>
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs font-semibold text-primary">
                      {member.name[0]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
      </>
      )}
    </div>
  )
}
