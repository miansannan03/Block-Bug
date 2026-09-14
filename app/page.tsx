'use client'

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { api, type BugStats, type DashboardData, type ReportData } from '@/lib/api'
import { getAppInitial, useSystemSettings } from '@/lib/system-settings-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  FileCheck2,
  GitBranch,
  Layers3,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react'

const packageTiers = [
  {
    name: 'Starter',
    price: '$29',
    cadence: '/month',
    description: 'A clean starting point for small teams getting bug reporting and verification under one roof.',
    badge: 'For small teams',
    accent: 'border-border/70 bg-card',
    features: ['1 organization workspace', 'Core bug workflow', 'Project tracking', 'Email-based member access'],
  },
  {
    name: 'Growth',
    price: '$79',
    cadence: '/month',
    description: 'Balanced for growing product teams that need sprint planning, cleaner routing, and reporting.',
    badge: 'Most popular',
    accent: 'border-primary/30 bg-primary/5 shadow-[0_18px_50px_rgba(59,130,246,0.10)]',
    features: ['Everything in Starter', 'Sprint planning', 'Verification routing', 'Blockchain proof layer'],
  },
  {
    name: 'Scale',
    price: '$149',
    cadence: '/month',
    description: 'For larger organizations that want deeper visibility, tighter audit trails, and cleaner handoffs.',
    badge: 'Advanced control',
    accent: 'border-border/70 bg-card',
    features: ['Everything in Growth', 'Multi-team organization flow', 'Operational reporting', 'Priority support'],
  },
]

const productHighlights = [
  {
    icon: Building2,
    title: 'Organization-first access',
    body: 'Start at the organization gate, then enter through role-based member accounts.',
  },
  {
    icon: GitBranch,
    title: 'Sprint-aware project flow',
    body: 'Plan sprints, keep backlog clean, and decide where unfinished work moves at completion.',
  },
  {
    icon: ShieldCheck,
    title: 'Verification and proof',
    body: 'Tester decisions and lifecycle events stay visible, including blockchain proof records.',
  },
]

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth()
  const { settings } = useSystemSettings()
  const [stats, setStats] = useState<BugStats | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [reports, setReports] = useState<ReportData | null>(null)

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

  const workspaceNumbers = useMemo(
    () => [
      { label: 'Tracked Bugs', value: stats?.total ?? 0 },
      { label: 'Active Projects', value: reports?.summary.activeProjects ?? 0 },
      { label: 'Pending Verification', value: dashboard?.quickActions.pendingVerification ?? 0 },
      { label: 'Active Team Members', value: dashboard?.quickActions.teamMembers ?? 0 },
    ],
    [dashboard, reports, stats],
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 shadow-sm">
              <span className="text-lg font-bold text-primary">{getAppInitial(settings.app_name)}</span>
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">{settings.app_name}</p>
              <p className="text-xs text-muted-foreground">Organization-based bug tracking workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button className="gap-2 rounded-xl px-5">
                  Open Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="font-medium">
                    Organization Login
                  </Button>
                </Link>
                {settings.allow_signup && (
                  <Link to="/signup">
                    <Button className="gap-2 rounded-xl px-5">
                      Sign Up Organization
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-border/60 bg-muted/10">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.94fr_1.06fr] lg:items-center lg:py-20">
            <div>
              <Badge variant="outline" className="rounded-full border-primary/20 bg-background/80 px-3 py-1 text-primary">
                Organization-first issue management
              </Badge>
              <h1 className="mt-6 text-5xl font-semibold tracking-tight text-balance text-foreground md:text-6xl lg:text-7xl">
                BlockBug
              </h1>
              <p className="mt-4 max-w-2xl text-2xl font-medium leading-9 text-foreground">
                A polished workspace for bug reporting, sprint planning, tester verification, and audit proof.
              </p>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
                Each organization gets its own workspace. Managers plan and assign, developers move work forward,
                testers verify fixes, and teams keep the full lifecycle visible without messy handoffs.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {isAuthenticated ? (
                  <Link to="/dashboard">
                    <Button size="lg" className="rounded-xl px-6">
                      Open Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login">
                      <Button size="lg" className="rounded-xl px-6">
                        Log In to Organization
                      </Button>
                    </Link>
                    {settings.allow_signup && (
                      <Link to="/signup">
                        <Button size="lg" variant="outline" className="rounded-xl px-6">
                          Create Organization
                        </Button>
                      </Link>
                    )}
                  </>
                )}
              </div>

              <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
                {[
                  ['Role Based', 'Manager, dev, tester'],
                  ['Sprint Ready', 'Backlog to close'],
                  ['Audit Proof', 'Blockchain records'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
              <div className="rounded-2xl border border-border/70 bg-background p-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Live workspace command center</p>
                    <p className="mt-1 text-xs text-muted-foreground">A preview of the workflow your teams operate every day.</p>
                  </div>
                  <Badge variant="outline" className="rounded-full bg-emerald-500/5 text-emerald-700">
                    Synced
                  </Badge>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  {workspaceNumbers.map((item) => (
                    <div key={item.label} className="rounded-xl border border-border/70 bg-muted/15 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
                  <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <p className="text-sm font-semibold text-foreground">Sprint Flow</p>
                      <GitBranch className="h-4 w-4 text-primary" />
                    </div>
                    <div className="mt-4 space-y-3">
                      {[
                        { label: 'Open', value: stats?.open ?? 0, icon: CircleDot, tone: 'text-red-500' },
                        { label: 'In Progress', value: stats?.inProgress ?? 0, icon: Clock3, tone: 'text-blue-500' },
                        { label: 'Resolved', value: stats?.resolved ?? 0, icon: CheckCircle2, tone: 'text-emerald-500' },
                      ].map((item) => {
                        const Icon = item.icon
                        return (
                          <div key={item.label} className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-3 py-3">
                            <div className="flex items-center gap-3">
                              <Icon className={`h-4 w-4 ${item.tone}`} />
                              <span className="text-sm font-medium text-foreground">{item.label}</span>
                            </div>
                            <span className="text-sm font-semibold text-foreground">{item.value}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <p className="text-sm font-semibold text-foreground">Verification Queue</p>
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Pending Verification</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            Resolved bugs waiting for a tester decision.
                          </p>
                        </div>
                        <p className="text-3xl font-semibold text-foreground">{dashboard?.quickActions.pendingVerification ?? 0}</p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl border border-blue-400/20 bg-blue-500/5 p-4">
                      <div className="flex items-start gap-3">
                        <WalletCards className="mt-0.5 h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">Package-ready organization billing</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            Plan tiers sit on the landing page while workspace access stays organization-first.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-border/70 bg-muted/15 p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { icon: Building2, title: 'Organization login', body: 'Workspace first, member second.' },
                      { icon: Users, title: 'Role routing', body: 'Admin, manager, developer, tester.' },
                      { icon: BarChart3, title: 'Reports', body: 'Projects, bugs, sprints, verification.' },
                    ].map((item) => {
                      const Icon = item.icon
                      return (
                        <div key={item.title} className="rounded-xl border border-border/60 bg-background p-4">
                          <Icon className="h-5 w-5 text-primary" />
                          <p className="mt-3 text-sm font-semibold text-foreground">{item.title}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {productHighlights.map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.title} className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="mt-5 text-lg font-semibold text-foreground">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </Card>
              )
            })}
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/10">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Subscription Packages</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
                  Choose the workspace shape that fits your team.
                </h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  Start lean, grow into sprint planning and verification structure, and keep the same organization-first workflow.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {packageTiers.map((tier) => (
                  <Card key={tier.name} className={`rounded-2xl p-5 transition hover:-translate-y-1 hover:shadow-lg ${tier.accent}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xl font-semibold text-foreground">{tier.name}</p>
                      <Badge variant="outline" className="rounded-full bg-background/80 text-[11px]">
                        {tier.badge}
                      </Badge>
                    </div>

                    <p className="mt-3 min-h-16 text-sm leading-6 text-muted-foreground">{tier.description}</p>

                    <div className="mt-5 flex items-end gap-1">
                      <span className="text-4xl font-semibold text-foreground">{tier.price}</span>
                      <span className="pb-1 text-sm text-muted-foreground">{tier.cadence}</span>
                    </div>

                    <div className="mt-5 space-y-3">
                      {tier.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          <p className="text-sm text-foreground">{feature}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-7 rounded-xl border border-border/70 bg-background/70 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Best For
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {tier.name === 'Starter'
                          ? 'New teams validating the workflow'
                          : tier.name === 'Growth'
                            ? 'Teams running sprints and tester reviews'
                            : 'Organizations needing stronger audit visibility'}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="rounded-3xl border border-border/70 bg-card p-7 shadow-sm">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Operational Flow</p>
                <h3 className="mt-3 text-3xl font-semibold text-foreground">From bug report to verified closure.</h3>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                  BlockBug keeps each handoff visible: managers route the issue, developers move it through the fix,
                  testers confirm the outcome, and the audit layer records the important moments.
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  {
                    icon: Building2,
                    title: 'Workspace boundary',
                    body: 'Organization access keeps every team, project, sprint, and member inside the right company space.',
                  },
                  {
                    icon: GitBranch,
                    title: 'Sprint movement',
                    body: 'Open work can be planned into a sprint, started by the assigned developer, and carried over when needed.',
                  },
                  {
                    icon: FileCheck2,
                    title: 'Tester decision',
                    body: 'Resolved bugs move to verification, where the tester can close the fix or return it to progress.',
                  },
                  {
                    icon: ShieldCheck,
                    title: 'Proof trail',
                    body: 'Lifecycle events can be connected to blockchain proof records without changing the user workflow.',
                  },
                ].map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div key={item.title} className="flex gap-4 rounded-2xl border border-border/70 bg-background/70 p-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full bg-card text-[11px]">
                            Step {index + 1}
                          </Badge>
                          <p className="font-semibold text-foreground">{item.title}</p>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
