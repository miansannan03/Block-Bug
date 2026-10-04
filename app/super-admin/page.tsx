'use client'

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, AlertTriangle, Building2, Bug, Check, Copy, LayoutDashboard, RefreshCw, Shield, Users } from 'lucide-react'
import { api, type ApplicationErrorLog, type AuditLog, type AuditLogPagination, type AuditOrganizationOption, type AuditResultFilter, type Invitation, type PlatformMetrics, type PlatformOrganization, type TablePagination } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SuperAdminHeader } from '@/components/super-admin-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Section = 'overview' | 'organizations' | 'invitations' | 'audit' | 'errors'

const emptyPagination: TablePagination = {
  currentPage: 1,
  lastPage: 1,
  perPage: 25,
  total: 0,
  hasNextPage: false,
  hasPreviousPage: false,
}

export default function SuperAdminPage() {
  const { user, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('overview')
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [organizations, setOrganizations] = useState<PlatformOrganization[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [organizationPagination, setOrganizationPagination] = useState<TablePagination>(emptyPagination)
  const [invitationPagination, setInvitationPagination] = useState<TablePagination>(emptyPagination)
  const [organizationLoading, setOrganizationLoading] = useState(true)
  const [invitationLoading, setInvitationLoading] = useState(true)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([])
  const [auditEventCount, setAuditEventCount] = useState<number | null>(null)
  const [auditResult, setAuditResult] = useState<AuditResultFilter>('all')
  const [auditOrganization, setAuditOrganization] = useState('')
  const [auditOrganizations, setAuditOrganizations] = useState<AuditOrganizationOption[]>([])
  const [auditPage, setAuditPage] = useState(1)
  const [auditPagination, setAuditPagination] = useState<AuditLogPagination>({
    currentPage: 1,
    lastPage: 1,
    perPage: 25,
    total: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const [auditLoading, setAuditLoading] = useState(false)
  const [errorLogs, setErrorLogs] = useState<ApplicationErrorLog[]>([])
  const [email, setEmail] = useState('')
  const [generatedLink, setGeneratedLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshConfirmed, setRefreshConfirmed] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [linkGenerated, setLinkGenerated] = useState(false)
  const [invitationAction, setInvitationAction] = useState<{ id: string; phase: 'regenerating' | 'regenerated' | 'revoking' | 'revoked' } | null>(null)
  const [organizationAction, setOrganizationAction] = useState<{ id: string; phase: 'updating' | 'activated' | 'suspended' } | null>(null)
  const refreshFeedbackTimer = useRef<number | null>(null)

  const sectionLoading = section === 'organizations' ? organizationLoading : section === 'invitations' ? invitationLoading : section === 'audit' ? auditLoading : false

  const load = async (invitationPage = invitationPagination.currentPage) => {
    setError('')
    setOrganizationLoading(true)
    setInvitationLoading(true)
    setAuditLoading(true)
    try {
      const [dashboard, orgs, invites, audits, errors] = await Promise.all([
        api.getPlatformDashboard(), api.getOrganizations({ page: organizationPagination.currentPage }), api.getOrganizationInvitations({ page: invitationPage }), api.getPlatformAuditLogs({ page: auditPage, result: auditResult, organizationId: auditOrganization }), api.getPlatformErrorLogs(),
      ])
      setMetrics(dashboard.metrics)
      setRecentActivity(dashboard.recentActivity)
      setOrganizations(orgs.organizations)
      setOrganizationPagination(orgs.pagination)
      setInvitations(invites.invitations)
      setInvitationPagination(invites.pagination)
      setAuditLogs(audits.logs)
      setAuditOrganizations(audits.filters.organizations)
      setAuditPagination(audits.pagination)
      setAuditEventCount(audits.totalAuditEvents)
      setAuditPage(audits.pagination.currentPage)
      setErrorLogs(errors.logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Platform data could not be loaded.')
    } finally {
      setOrganizationLoading(false)
      setInvitationLoading(false)
      setAuditLoading(false)
    }
  }

  const refreshCurrentSection = async () => {
    if (refreshing || sectionLoading) return

    setRefreshing(true)
    setRefreshConfirmed(false)
    setError('')

    try {
      switch (section) {
        case 'overview': {
          const dashboard = await api.getPlatformDashboard()
          setMetrics(dashboard.metrics)
          setRecentActivity(dashboard.recentActivity)
          setAuditEventCount(dashboard.metrics.totalAuditEvents)
          break
        }
        case 'organizations': {
          const result = await api.getOrganizations({ page: organizationPagination.currentPage })
          setOrganizations(result.organizations)
          setOrganizationPagination(result.pagination)
          break
        }
        case 'invitations': {
          const result = await api.getOrganizationInvitations({ page: invitationPagination.currentPage })
          setInvitations(result.invitations)
          setInvitationPagination(result.pagination)
          break
        }
        case 'audit': {
          const result = await api.getPlatformAuditLogs({ page: auditPage, result: auditResult, organizationId: auditOrganization })
          setAuditLogs(result.logs)
          setAuditOrganizations(result.filters.organizations)
          setAuditPagination(result.pagination)
          setAuditEventCount(result.totalAuditEvents)
          setAuditPage(result.pagination.currentPage)
          break
        }
        case 'errors': {
          const result = await api.getPlatformErrorLogs()
          setErrorLogs(result.logs)
          break
        }
      }

      setRefreshConfirmed(true)
      if (refreshFeedbackTimer.current !== null) window.clearTimeout(refreshFeedbackTimer.current)
      refreshFeedbackTimer.current = window.setTimeout(() => setRefreshConfirmed(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This section could not be refreshed.')
    } finally {
      setRefreshing(false)
    }
  }

  const copyGeneratedLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink)
      setLinkCopied(true)
    } catch {
      setError('The invitation link could not be copied. Please select and copy it manually.')
    }
  }

  const loadOrganizationPage = async (page: number) => {
    if (organizationLoading || refreshing) return
    setOrganizationLoading(true)
    setError('')
    try {
      const response = await api.getOrganizations({ page })
      setOrganizations(response.organizations)
      setOrganizationPagination(response.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Organizations could not be loaded.')
    } finally {
      setOrganizationLoading(false)
    }
  }

  const loadInvitationPage = async (page: number) => {
    if (invitationLoading || refreshing) return
    setInvitationLoading(true)
    setError('')
    try {
      const response = await api.getOrganizationInvitations({ page })
      setInvitations(response.invitations)
      setInvitationPagination(response.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invitations could not be loaded.')
    } finally {
      setInvitationLoading(false)
    }
  }

  const loadAuditPage = async (page: number, result: AuditResultFilter = auditResult, organizationId = auditOrganization) => {
    if (auditLoading || refreshing) return

    setAuditLoading(true)
    setError('')
    try {
      const response = await api.getPlatformAuditLogs({ page, result, organizationId })
      setAuditLogs(response.logs)
      setAuditOrganizations(response.filters.organizations)
      setAuditPagination(response.pagination)
      setAuditEventCount(response.totalAuditEvents)
      setAuditPage(response.pagination.currentPage)
      setAuditResult(result)
      setAuditOrganization(organizationId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit logs could not be loaded.')
    } finally {
      setAuditLoading(false)
    }
  }

  const changeAuditResult = (result: AuditResultFilter) => {
    void loadAuditPage(1, result)
  }

  const changeAuditOrganization = (organizationId: string) => {
    void loadAuditPage(1, auditResult, organizationId)
  }

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'super_admin')) navigate('/login', { replace: true })
    if (user?.role === 'super_admin') void load()
  }, [isLoading, navigate, user])

  useEffect(() => () => {
    if (refreshFeedbackTimer.current !== null) window.clearTimeout(refreshFeedbackTimer.current)
  }, [])

  useEffect(() => {
    if (!linkCopied) return
    const timer = window.setTimeout(() => setLinkCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [linkCopied])

  useEffect(() => {
    if (!linkGenerated) return
    const timer = window.setTimeout(() => setLinkGenerated(false), 2000)
    return () => window.clearTimeout(timer)
  }, [linkGenerated])

  useEffect(() => {
    if (!invitationAction || !['regenerated', 'revoked'].includes(invitationAction.phase)) return
    const timer = window.setTimeout(() => setInvitationAction(null), 2000)
    return () => window.clearTimeout(timer)
  }, [invitationAction])

  useEffect(() => {
    if (!organizationAction || organizationAction.phase === 'updating') return
    const timer = window.setTimeout(() => setOrganizationAction(null), 2000)
    return () => window.clearTimeout(timer)
  }, [organizationAction])

  const createInvitation = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setLinkGenerated(false); setError('')
    try {
      const result = await api.inviteOrganization(email)
      setGeneratedLink(`${window.location.origin}/i#${result.token}`)
      setLinkCopied(false)
      setLinkGenerated(true)
      setEmail('')
      await load(1)
    } catch (err) { setError(err instanceof Error ? err.message : 'Invitation could not be created.') } finally { setBusy(false) }
  }

  const regenerate = async (id: string) => {
    setBusy(true)
    setInvitationAction({ id, phase: 'regenerating' })
    setError('')
    try {
      const result = await api.regenerateInvitation(id, true)
      setGeneratedLink(`${window.location.origin}/i#${result.token}`)
      setLinkCopied(false)
      await load()
      setInvitationAction({ id, phase: 'regenerated' })
    } catch (err) {
      setInvitationAction(null)
      setError(err instanceof Error ? err.message : 'The invitation could not be regenerated.')
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (id: string) => {
    setInvitationAction({ id, phase: 'revoking' })
    setError('')
    try {
      await api.revokeInvitation(id, true)
      await load()
      setInvitationAction({ id, phase: 'revoked' })
    } catch (err) {
      setInvitationAction(null)
      setError(err instanceof Error ? err.message : 'The invitation could not be revoked.')
    }
  }

  const setStatus = async (organization: PlatformOrganization) => {
    const next = organization.status === 'active' ? 'inactive' : 'active'
    if (!window.confirm(`${next === 'inactive' ? 'Suspend' : 'Reactivate'} ${organization.name}?`)) return
    setOrganizationAction({ id: organization.id, phase: 'updating' })
    setError('')
    try {
      await api.updateOrganizationStatus(organization.id, next)
      await load()
      setOrganizationAction({ id: organization.id, phase: next === 'active' ? 'activated' : 'suspended' })
    } catch (err) {
      setOrganizationAction(null)
      setError(err instanceof Error ? err.message : 'The organization status could not be updated.')
    }
  }

  const remove = async (organization: PlatformOrganization) => {
    if (!window.confirm(`Soft-delete ${organization.name}? Users will lose access, but organization data will be retained.`)) return
    setOrganizationLoading(true)
    setError('')
    try {
      await api.deleteOrganization(organization.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The organization could not be deleted.')
    } finally {
      setOrganizationLoading(false)
    }
  }

  if (isLoading || !user || user.role !== 'super_admin') return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading platform administration…</div>

  const nav = [
    ['overview', 'Overview', LayoutDashboard], ['organizations', 'Organizations', Building2], ['invitations', 'Invitations', Users], ['audit', 'Audit Logs', Activity], ['errors', 'Error Logs', AlertTriangle],
  ] as const
  const metricCards = metrics ? [
    ['Organizations', metrics.totalOrganizations, Building2], ['Active', metrics.activeOrganizations, Shield], ['Suspended', metrics.suspendedOrganizations, AlertTriangle], ['Users', metrics.totalUsers, Users], ['Admins', metrics.totalAdmins, Shield], ['Bugs', metrics.totalBugs, Bug],
  ] as const : []

  return (
    <div className="min-h-screen bg-muted/20">
      <SuperAdminHeader
        user={user}
        activity={recentActivity}
        auditEventCount={auditEventCount}
        onOpenAudit={() => setSection('audit')}
        onLogout={() => { logout(); navigate('/login') }}
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">{nav.map(([id, label, Icon]) => <button key={id} onClick={() => setSection(id)} className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${section === id ? 'primary-neon-control' : 'border-transparent hover:bg-muted'}`}><Icon className="h-4 w-4" />{label}</button>)}</aside>
        <main className="min-w-0">
          <div className="mb-7 flex items-start justify-between"><div><h1 className="text-3xl font-bold capitalize">{section === 'audit' ? 'Audit logs' : section === 'errors' ? 'Error logs' : section}</h1><p className="mt-1 text-muted-foreground">Platform-wide administration and high-level visibility.</p></div><Button variant="outline" size="sm" disabled={refreshing || sectionLoading} aria-live="polite" onClick={() => void refreshCurrentSection()}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />{refreshing ? 'Refreshing...' : refreshConfirmed ? 'Updated' : 'Refresh'}</Button></div>
          {error && <Card className="mb-5 border-destructive p-4 text-sm text-destructive">{error}</Card>}
          {section === 'overview' && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metricCards.map(([label, value, Icon]) => <Card key={label} className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon className="h-5 w-5 text-primary" /></div><p className="mt-3 text-3xl font-bold">{value}</p></Card>)}</div>}
          {section === 'organizations' && (
            <Card className="overflow-hidden" aria-busy={organizationLoading || refreshing}>
              <div className="border-b px-4 py-3 text-sm text-muted-foreground">
                {organizationLoading ? 'Loading organizations...' : `${organizationPagination.total} organization${organizationPagination.total === 1 ? '' : 's'}`}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30 text-left"><tr>{['Organization', 'Primary admin', 'Users', 'Status', 'Created', 'Actions'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                  <tbody>{organizations.map((org) => {
                    const action = organizationAction?.id === org.id ? organizationAction.phase : null
                    return (
                      <tr key={org.id} className="border-b last:border-0">
                        <td className="px-4 py-4 font-medium">{org.name}</td>
                        <td className="px-4 py-4 text-muted-foreground">{org.primaryAdminEmail || '—'}</td>
                        <td className="px-4 py-4">{org.userCount}</td>
                        <td className="px-4 py-4"><Badge variant={org.status === 'active' ? 'default' : 'secondary'}>{org.status}</Badge></td>
                        <td className="px-4 py-4">{new Date(org.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <Button className="action-feedback-button" data-complete={action && action !== 'updating' ? 'true' : undefined} size="sm" variant="outline" disabled={organizationLoading || refreshing || organizationAction?.phase === 'updating'} onClick={() => void setStatus(org)}>
                              {action && action !== 'updating' && <Check className="h-4 w-4" />}
                              {action === 'updating'
                                ? org.status === 'active' ? 'Suspending…' : 'Activating…'
                                : action === 'suspended' ? 'Suspended!' : action === 'activated' ? 'Activated!' : org.status === 'active' ? 'Suspend' : 'Activate'}
                            </Button>
                            <Button size="sm" variant="destructive" disabled={organizationLoading || refreshing || organizationAction?.phase === 'updating'} onClick={() => void remove(org)}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}</tbody>
                </table>
                {!organizationLoading && organizations.length === 0 && <p className="p-8 text-center text-muted-foreground">No organizations yet.</p>}
              </div>
              <PaginationFooter
                label="Organizations"
                pagination={organizationPagination}
                loading={organizationLoading || refreshing || organizationAction?.phase === 'updating'}
                onPageChange={(page) => void loadOrganizationPage(page)}
              />
            </Card>
          )}
          {section === 'invitations' && (
            <div className="space-y-5">
              <Card className="p-6">
                <h2 className="text-lg font-semibold">Invite organization</h2>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">Enter the first Organization Admin’s email. Share the generated link manually.</p>
                <form className="flex gap-3" onSubmit={createInvitation}>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@company.com" required />
                  <Button className="action-feedback-button" data-complete={linkGenerated ? 'true' : undefined} disabled={busy || invitationLoading || refreshing} aria-live="polite">
                    {linkGenerated && <Check className="h-4 w-4" />}
                    {busy && !invitationAction ? 'Generating…' : linkGenerated ? 'Generated!' : 'Generate link'}
                  </Button>
                </form>
                {generatedLink && <div className="mt-4 flex gap-2 rounded-lg border bg-muted/30 p-3"><code className="min-w-0 flex-1 truncate text-xs">{generatedLink}</code><Button type="button" size="sm" variant="outline" aria-live="polite" onClick={() => void copyGeneratedLink()}>{linkCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{linkCopied ? 'Copied!' : 'Copy Link'}</Button></div>}
              </Card>
              <Card className="overflow-hidden" aria-busy={invitationLoading || refreshing}>
                <div className="border-b px-4 py-3 text-sm text-muted-foreground">
                  {invitationLoading ? 'Loading invitations...' : `${invitationPagination.total} invitation${invitationPagination.total === 1 ? '' : 's'}`}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30 text-left"><tr>{['Email', 'Status', 'Expires', 'Created', 'Actions'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                    <tbody>{invitations.map((invite) => {
                      const action = invitationAction?.id === invite.id ? invitationAction.phase : null
                      const actionRunning = action === 'regenerating' || action === 'revoking'
                      return (
                        <tr key={invite.id} className="border-b last:border-0">
                          <td className="px-4 py-4">{invite.email}</td>
                          <td className="px-4 py-4"><Badge variant="secondary">{invite.status}</Badge></td>
                          <td className="px-4 py-4">{new Date(invite.expiresAt).toLocaleString()}</td>
                          <td className="px-4 py-4">{new Date(invite.createdAt).toLocaleString()}</td>
                          <td className="px-4 py-4">
                            <div className="flex gap-2">
                              <Button className="action-feedback-button" data-complete={action === 'regenerated' ? 'true' : undefined} size="sm" variant="outline" disabled={invite.status === 'accepted' || busy || actionRunning || invitationLoading || refreshing} onClick={() => void regenerate(invite.id)}>
                                {action === 'regenerated' && <Check className="h-4 w-4" />}
                                {action === 'regenerating' ? 'Regenerating…' : action === 'regenerated' ? 'Regenerated!' : 'Regenerate'}
                              </Button>
                              <Button className="action-feedback-button" data-complete={action === 'revoked' ? 'true' : undefined} size="sm" variant="destructive-outline" disabled={invite.status !== 'pending' || busy || actionRunning || action === 'revoked' || invitationLoading || refreshing} onClick={() => void revoke(invite.id)}>
                                {action === 'revoked' && <Check className="h-4 w-4" />}
                                {action === 'revoking' ? 'Revoking…' : action === 'revoked' ? 'Revoked!' : 'Revoke'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}</tbody>
                  </table>
                  {!invitationLoading && invitations.length === 0 && <p className="p-8 text-center text-muted-foreground">No organization invitations yet.</p>}
                </div>
                <PaginationFooter
                  label="Invitations"
                  pagination={invitationPagination}
                  loading={invitationLoading || refreshing || busy || invitationAction?.phase === 'regenerating' || invitationAction?.phase === 'revoking'}
                  onPageChange={(page) => void loadInvitationPage(page)}
                />
              </Card>
            </div>
          )}
          {section === 'audit' && (
            <LogTable
              logs={auditLogs}
              filter={auditResult}
              organizationFilter={auditOrganization}
              organizations={auditOrganizations}
              pagination={auditPagination}
              loading={auditLoading || refreshing}
              onFilterChange={changeAuditResult}
              onOrganizationChange={changeAuditOrganization}
              onPageChange={(page) => void loadAuditPage(page)}
            />
          )}
          {section === 'errors' && <Card className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-muted/30 text-left"><tr>{['Time', 'Level', 'Module', 'Status', 'Message', 'Request ID'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{errorLogs.map((log) => <tr key={log.id} className="border-b last:border-0"><td className="px-4 py-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td><td className="px-4 py-4"><Badge variant="destructive">{log.level}</Badge></td><td className="px-4 py-4">{log.module || '—'}</td><td className="px-4 py-4">{log.httpStatus || '—'}</td><td className="max-w-sm truncate px-4 py-4" title={log.message}>{log.message}</td><td className="px-4 py-4 font-mono text-xs">{log.requestId || '—'}</td></tr>)}</tbody></table>{errorLogs.length === 0 && <p className="p-8 text-center text-muted-foreground">No application errors recorded.</p>}</Card>}
        </main>
      </div>
    </div>
  )
}

function LogTable({
  logs,
  filter,
  organizationFilter,
  organizations,
  pagination,
  loading,
  onFilterChange,
  onOrganizationChange,
  onPageChange,
}: {
  logs: AuditLog[]
  filter: AuditResultFilter
  organizationFilter: string
  organizations: AuditOrganizationOption[]
  pagination: AuditLogPagination
  loading: boolean
  onFilterChange: (filter: AuditResultFilter) => void
  onOrganizationChange: (organizationId: string) => void
  onPageChange: (page: number) => void
}) {
  const filters: Array<{ value: AuditResultFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'success', label: 'Success' },
    { value: 'failed', label: 'Failed' },
  ]
  const organizationNames = new Map(organizations.map((organization) => [organization.id, organization.name]))

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {pagination.total} audit {pagination.total === 1 ? 'event' : 'events'}
        </p>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Select value={organizationFilter || '__all_organizations__'} disabled={loading} onValueChange={(value) => onOrganizationChange(value === '__all_organizations__' ? '' : value)}>
            <SelectTrigger aria-label="Filter audit logs by organization" className="w-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all_organizations__">All organizations</SelectItem>
              {organizations.map((organization) => (
                <SelectItem key={organization.id} value={organization.id}>{organization.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="inline-flex rounded-lg border bg-muted/20 p-1" role="group" aria-label="Filter audit logs by result">
            {filters.map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={filter === value ? 'default' : 'ghost'}
                disabled={loading}
                aria-pressed={filter === value}
                onClick={() => onFilterChange(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left"><tr>{['Time', 'Action', 'Role', 'Organization', 'Resource', 'Result'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>{logs.map((log) => (
            <tr key={log.id} className="border-b last:border-0">
              <td className="whitespace-nowrap px-4 py-4">{new Date(log.createdAt).toLocaleString()}</td>
              <td className="px-4 py-4">
                <p className="font-medium">{log.action}</p>
                {typeof log.metadata?.message === 'string' && <p className="mt-1 text-xs text-muted-foreground">{log.metadata.message}</p>}
                {['seeded_activity_backfill', 'seeded_bug_population'].includes(String(log.metadata?.source)) && <p className="mt-1 text-xs text-muted-foreground">Seeded history</p>}
              </td>
              <td className="whitespace-nowrap px-4 py-4">{log.actorRole || 'system'}</td>
              <td className="px-4 py-4">
                <p>{log.organizationId ? organizationNames.get(log.organizationId) || log.organizationId : 'Platform'}</p>
                {log.organizationId && <p className="mt-1 font-mono text-xs text-muted-foreground">{log.organizationId}</p>}
              </td>
              <td className="px-4 py-4">{log.entityType ? `${log.entityType}:${log.entityId || ''}` : '—'}</td>
              <td className="px-4 py-4"><Badge variant={log.succeeded ? 'default' : 'destructive'}>{log.succeeded ? 'Success' : 'Failed'}</Badge></td>
            </tr>
          ))}</tbody>
        </table>
        {logs.length === 0 && <p className="p-8 text-center text-muted-foreground">No {filter === 'all' ? '' : `${filter} `}audit activity found.</p>}
      </div>

      <PaginationFooter label="Audit logs" pagination={pagination} loading={loading} onPageChange={onPageChange} />
    </Card>
  )
}

function PaginationFooter({
  label,
  pagination,
  loading,
  onPageChange,
}: {
  label: string
  pagination: TablePagination
  loading: boolean
  onPageChange: (page: number) => void
}) {
  return (
    <nav aria-label={`${label} pagination`} className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">Page {pagination.currentPage} of {pagination.lastPage}</p>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" disabled={loading || !pagination.hasPreviousPage} onClick={() => onPageChange(pagination.currentPage - 1)}>Previous</Button>
        <Button type="button" size="sm" variant="outline" disabled={loading || !pagination.hasNextPage} onClick={() => onPageChange(pagination.currentPage + 1)}>Next</Button>
      </div>
    </nav>
  )
}
