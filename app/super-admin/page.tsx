'use client'

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, AlertTriangle, Building2, Bug, Copy, LayoutDashboard, RefreshCw, Shield, Users } from 'lucide-react'
import { api, type ApplicationErrorLog, type AuditLog, type Invitation, type PlatformMetrics, type PlatformOrganization } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SuperAdminHeader } from '@/components/super-admin-header'

type Section = 'overview' | 'organizations' | 'invitations' | 'audit' | 'errors'

export default function SuperAdminPage() {
  const { user, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('overview')
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [organizations, setOrganizations] = useState<PlatformOrganization[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [errorLogs, setErrorLogs] = useState<ApplicationErrorLog[]>([])
  const [email, setEmail] = useState('')
  const [generatedLink, setGeneratedLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const [dashboard, orgs, invites, audits, errors] = await Promise.all([
        api.getPlatformDashboard(), api.getOrganizations(), api.getOrganizationInvitations(), api.getPlatformAuditLogs(), api.getPlatformErrorLogs(),
      ])
      setMetrics(dashboard.metrics)
      setOrganizations(orgs.organizations)
      setInvitations(invites.invitations)
      setAuditLogs(audits.logs)
      setErrorLogs(errors.logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Platform data could not be loaded.')
    }
  }

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'super_admin')) navigate('/login', { replace: true })
    if (user?.role === 'super_admin') void load()
  }, [isLoading, navigate, user])

  const createInvitation = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const result = await api.inviteOrganization(email)
      setGeneratedLink(`${window.location.origin}/i#${result.token}`)
      setEmail('')
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Invitation could not be created.') } finally { setBusy(false) }
  }

  const regenerate = async (id: string) => {
    setBusy(true)
    try { const result = await api.regenerateInvitation(id, true); setGeneratedLink(`${window.location.origin}/i#${result.token}`); await load() } finally { setBusy(false) }
  }

  const setStatus = async (organization: PlatformOrganization) => {
    const next = organization.status === 'active' ? 'inactive' : 'active'
    if (!window.confirm(`${next === 'inactive' ? 'Suspend' : 'Reactivate'} ${organization.name}?`)) return
    await api.updateOrganizationStatus(organization.id, next); await load()
  }

  const remove = async (organization: PlatformOrganization) => {
    if (!window.confirm(`Soft-delete ${organization.name}? Users will lose access, but organization data will be retained.`)) return
    await api.deleteOrganization(organization.id); await load()
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
        activity={auditLogs}
        onOpenAudit={() => setSection('audit')}
        onLogout={() => { logout(); navigate('/login') }}
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">{nav.map(([id, label, Icon]) => <button key={id} onClick={() => setSection(id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${section === id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}><Icon className="h-4 w-4" />{label}</button>)}</aside>
        <main className="min-w-0">
          <div className="mb-7 flex items-start justify-between"><div><h1 className="text-3xl font-bold capitalize">{section === 'audit' ? 'Audit logs' : section === 'errors' ? 'Error logs' : section}</h1><p className="mt-1 text-muted-foreground">Platform-wide administration and high-level visibility.</p></div><Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
          {error && <Card className="mb-5 border-destructive p-4 text-sm text-destructive">{error}</Card>}
          {section === 'overview' && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metricCards.map(([label, value, Icon]) => <Card key={label} className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon className="h-5 w-5 text-primary" /></div><p className="mt-3 text-3xl font-bold">{value}</p></Card>)}</div>}
          {section === 'organizations' && <Card className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-muted/30 text-left"><tr>{['Organization', 'Primary admin', 'Users', 'Status', 'Created', 'Last activity', 'Actions'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{organizations.map((org) => <tr key={org.id} className="border-b last:border-0"><td className="px-4 py-4 font-medium">{org.name}</td><td className="px-4 py-4 text-muted-foreground">{org.primaryAdminEmail || '—'}</td><td className="px-4 py-4">{org.userCount}</td><td className="px-4 py-4"><Badge variant={org.status === 'active' ? 'default' : 'secondary'}>{org.status}</Badge></td><td className="px-4 py-4">{new Date(org.createdAt).toLocaleDateString()}</td><td className="px-4 py-4">{org.lastActivityAt ? new Date(org.lastActivityAt).toLocaleString() : '—'}</td><td className="px-4 py-4"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void setStatus(org)}>{org.status === 'active' ? 'Suspend' : 'Activate'}</Button><Button size="sm" variant="destructive" onClick={() => void remove(org)}>Delete</Button></div></td></tr>)}</tbody></table>{organizations.length === 0 && <p className="p-8 text-center text-muted-foreground">No organizations yet.</p>}</Card>}
          {section === 'invitations' && <div className="space-y-5"><Card className="p-6"><h2 className="text-lg font-semibold">Invite organization</h2><p className="mt-1 mb-4 text-sm text-muted-foreground">Enter the first Organization Admin’s email. Share the generated link manually.</p><form className="flex gap-3" onSubmit={createInvitation}><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@company.com" required /><Button disabled={busy}>Generate link</Button></form>{generatedLink && <div className="mt-4 flex gap-2 rounded-lg border bg-muted/30 p-3"><code className="min-w-0 flex-1 truncate text-xs">{generatedLink}</code><Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(generatedLink)}><Copy className="mr-2 h-4 w-4" />Copy Link</Button></div>}</Card><Card className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-muted/30 text-left"><tr>{['Email', 'Status', 'Expires', 'Created', 'Actions'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{invitations.map((invite) => <tr key={invite.id} className="border-b last:border-0"><td className="px-4 py-4">{invite.email}</td><td className="px-4 py-4"><Badge variant="secondary">{invite.status}</Badge></td><td className="px-4 py-4">{new Date(invite.expiresAt).toLocaleString()}</td><td className="px-4 py-4">{new Date(invite.createdAt).toLocaleString()}</td><td className="px-4 py-4"><div className="flex gap-2"><Button size="sm" variant="outline" disabled={invite.status === 'accepted' || busy} onClick={() => void regenerate(invite.id)}>Regenerate</Button><Button size="sm" variant="outline" disabled={invite.status !== 'pending'} onClick={async () => { await api.revokeInvitation(invite.id, true); await load() }}>Revoke</Button></div></td></tr>)}</tbody></table></Card></div>}
          {section === 'audit' && <LogTable logs={auditLogs} />}
          {section === 'errors' && <Card className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-muted/30 text-left"><tr>{['Time', 'Level', 'Module', 'Status', 'Message', 'Request ID'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{errorLogs.map((log) => <tr key={log.id} className="border-b last:border-0"><td className="px-4 py-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td><td className="px-4 py-4"><Badge variant="destructive">{log.level}</Badge></td><td className="px-4 py-4">{log.module || '—'}</td><td className="px-4 py-4">{log.httpStatus || '—'}</td><td className="max-w-sm truncate px-4 py-4" title={log.message}>{log.message}</td><td className="px-4 py-4 font-mono text-xs">{log.requestId || '—'}</td></tr>)}</tbody></table>{errorLogs.length === 0 && <p className="p-8 text-center text-muted-foreground">No application errors recorded.</p>}</Card>}
        </main>
      </div>
    </div>
  )
}

function LogTable({ logs }: { logs: AuditLog[] }) {
  return <Card className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-muted/30 text-left"><tr>{['Time', 'Action', 'Role', 'Organization', 'Resource', 'Result'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-b last:border-0"><td className="whitespace-nowrap px-4 py-4">{new Date(log.createdAt).toLocaleString()}</td><td className="px-4 py-4 font-medium">{log.action}</td><td className="px-4 py-4">{log.actorRole || 'system'}</td><td className="px-4 py-4 font-mono text-xs">{log.organizationId || 'platform'}</td><td className="px-4 py-4">{log.entityType ? `${log.entityType}:${log.entityId || ''}` : '—'}</td><td className="px-4 py-4"><Badge variant={log.succeeded ? 'default' : 'destructive'}>{log.succeeded ? 'Success' : 'Failed'}</Badge></td></tr>)}</tbody></table>{logs.length === 0 && <p className="p-8 text-center text-muted-foreground">No audit activity yet.</p>}</Card>
}
