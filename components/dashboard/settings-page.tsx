'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api, type Notification, type RoleDefinition, type SystemSettings, type User, type UserRole } from '@/lib/api'
import { defaultSystemSettings, formatDateWithSettings } from '@/lib/system-settings-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const preferenceLabels = [
  { key: 'email_notifications', name: 'Email notifications', description: 'Keep update alerts on for assignments, comments, and summaries' },
  { key: 'bug_assigned', name: 'Bug assigned', description: 'Show an alert when work is assigned to your account' },
  { key: 'comment_notifications', name: 'Comment notifications', description: 'Show comment updates on bugs you reported or own' },
  { key: 'daily_digest', name: 'Daily digest', description: 'Show one short summary of the last 24 hours' },
]

export function SettingsPage() {
  const { user, logout, updateProfile } = useAuth()
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || '',
  })
  const [preferences, setPreferences] = useState<Record<string, boolean>>({})
  const [roles, setRoles] = useState<Record<UserRole, RoleDefinition> | null>(null)
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [auditNotifications, setAuditNotifications] = useState<Notification[]>([])
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSystemSettings)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [activeAction, setActiveAction] = useState<string>('')
  const [openAuditSections, setOpenAuditSections] = useState<Record<string, boolean>>({
    admin: true,
    roles: false,
    projects: false,
    security: false,
  })
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!user) return
    setFormData({ name: user.name, email: user.email, role: user.role })

    const requests: Promise<any>[] = [
      api.getPreferences(user.id).then((data) => setPreferences(data.preferences)).catch(() => setPreferences({})),
      api.getRoles().then(setRoles).catch(() => setRoles(null)),
    ]

    if (isAdmin) {
      requests.push(api.getUsers().then(setTeamMembers).catch(() => setTeamMembers([])))
      requests.push(api.getSystemSettings().then((data) => setSystemSettings({ ...defaultSystemSettings, ...data.settings })).catch(() => setSystemSettings(defaultSystemSettings)))
      requests.push(api.getNotifications(user.email).then(setAuditNotifications).catch(() => setAuditNotifications([])))
    }

    void Promise.all(requests)
  }, [isAdmin, user])

  const currentRoleDefinition = useMemo(() => {
    if (!user || !roles) return null
    return roles[user.role]
  }, [roles, user])

  const recentAdminActions = useMemo(() => {
    return auditNotifications.filter((notification) =>
      ['system_settings_updated', 'maintenance_action', 'demo_reset', 'preferences_updated', 'integration_updated', 'user_updated', 'project_created'].includes(notification.type)
    ).slice(0, 6)
  }, [auditNotifications])

  const userRoleChanges = useMemo(() => {
    return auditNotifications.filter((notification) => notification.type === 'user_updated').slice(0, 6)
  }, [auditNotifications])

  const projectChanges = useMemo(() => {
    return auditNotifications.filter((notification) =>
      ['project_created', 'bug_created', 'bug_assigned', 'status_changed', 'comment_added'].includes(notification.type)
    ).slice(0, 6)
  }, [auditNotifications])

  const securityEvents = useMemo(() => {
    return auditNotifications.filter((notification) =>
      ['user_login', 'password_changed', 'api_key_created', 'api_key_revoked'].includes(notification.type)
    ).slice(0, 6)
  }, [auditNotifications])

  const showSuccess = (message: string) => {
    setSavedMessage(message)
    setErrorMessage('')
    setTimeout(() => setSavedMessage(''), 2500)
  }

  const showError = (message: string) => {
    setErrorMessage(message)
    setSavedMessage('')
  }

  const isBusy = (action: string) => activeAction === action

  const refreshAdminAudit = async () => {
    if (!isAdmin || !user) return
    try {
      const notifications = await api.getNotifications(user.email)
      setAuditNotifications(notifications)
    } catch {
      setAuditNotifications([])
    }
  }

  const handleProfileSave = async () => {
    setActiveAction('profile')
    try {
      await updateProfile(formData.name)
      showSuccess('Profile updated.')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not update profile.')
    } finally {
      setActiveAction('')
    }
  }

  const handlePasswordChange = async () => {
    if (!user) return
    if (!currentPassword || !newPassword) {
      showError('Enter your current and new password.')
      return
    }
    if (newPassword !== confirmPassword) {
      showError('New password confirmation does not match.')
      return
    }

    setActiveAction('password')
    try {
      await api.changePassword(user.id, currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showSuccess('Password updated.')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not change password.')
    } finally {
      setActiveAction('')
    }
  }

  const handlePreferenceSave = async () => {
    if (!user) return
    setActiveAction('preferences')
    try {
      const result = await api.updatePreferences(user.id, preferences)
      setPreferences(result.preferences)
      window.dispatchEvent(new Event('blockbug:notifications-updated'))
      showSuccess('Notification preferences saved.')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not save preferences.')
    } finally {
      setActiveAction('')
    }
  }

  const handleSystemSettingsSave = async () => {
    setActiveAction('project-defaults')
    try {
      const result = await api.updateSystemSettings(systemSettings, user?.role)
      setSystemSettings({ ...defaultSystemSettings, ...result.settings })
      window.dispatchEvent(new Event('blockbug:system-settings-updated'))
      await refreshAdminAudit()
      showSuccess('System settings saved.')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not save system settings.')
    } finally {
      setActiveAction('')
    }
  }

  const updateMember = async (member: User, updates: Partial<Pick<User, 'role' | 'status'>>) => {
    try {
      const { user: updatedUser } = await api.updateUser(member.id, { ...updates, actorRole: user?.role })
      setTeamMembers((prev) => prev.map((item) => item.id === updatedUser.id ? updatedUser : item))
      await refreshAdminAudit()
      showSuccess(`${updatedUser.name} updated.`)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not update user.')
    }
  }

  const deleteMember = async (member: User) => {
    if (member.id === user?.id) {
      showError('Use the Danger Zone to manage your own account.')
      return
    }

    try {
      await api.deleteUser(member.id, user?.role)
      setTeamMembers((prev) => prev.filter((item) => item.id !== member.id))
      await refreshAdminAudit()
      showSuccess(`${member.name} deleted.`)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not delete user.')
    }
  }

  const exportWorkspaceData = async () => {
    setActiveAction('export')
    try {
      const data = await api.exportMaintenanceData(user?.role)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'blockbug-export.json'
      anchor.click()
      URL.revokeObjectURL(url)
      showSuccess('Workspace export prepared.')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not export workspace data.')
    } finally {
      setActiveAction('')
    }
  }

  const clearMaintenanceData = async (target: 'notifications' | 'activity' | 'all') => {
    setActiveAction(`clear-${target}`)
    try {
      await api.clearMaintenanceData(target, user?.role)
      if (target === 'notifications' || target === 'all') {
        window.dispatchEvent(new Event('blockbug:notifications-updated'))
        setAuditNotifications([])
      } else {
        await refreshAdminAudit()
      }
      showSuccess(`${target === 'all' ? 'Notifications and activity' : target} cleared.`)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not clear data.')
    } finally {
      setActiveAction('')
    }
  }

  const resetDemoData = async () => {
    setActiveAction('reset-demo')
    try {
      await api.resetDemoData(user?.role)
      if (user) {
        const preferencesResult = await api.getPreferences(user.id)
        setPreferences(preferencesResult.preferences)
      }
      if (isAdmin) {
        const [usersResult, settingsResult] = await Promise.all([
          api.getUsers(),
          api.getSystemSettings(),
        ])
        setTeamMembers(usersResult)
        setSystemSettings({ ...defaultSystemSettings, ...settingsResult.settings })
        await refreshAdminAudit()
      }
      window.dispatchEvent(new Event('blockbug:notifications-updated'))
      showSuccess('Demo data reset.')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not reset demo data.')
    } finally {
      setActiveAction('')
    }
  }

  const deactivateAccount = async () => {
    if (!user) return
    try {
      await api.updateUser(user.id, { status: 'inactive', actorRole: user?.role })
      logout()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not deactivate account.')
    }
  }

  const renderAuditList = (items: Notification[], emptyMessage: string) => {
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
    }

    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                {item.body && <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>}
              </div>
              <p className="shrink-0 text-[11px] text-muted-foreground">{formatDateWithSettings(item.createdAt, systemSettings, true)}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const toggleAuditSection = (key: 'admin' | 'roles' | 'projects' | 'security') => {
    setOpenAuditSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground">
          {isAdmin ? 'Manage system configuration, people, defaults, and maintenance controls.' : 'Manage your account and personal preferences.'}
        </p>
      </div>

      {(savedMessage || errorMessage) && (
        <Card className={`p-4 border ${errorMessage ? 'border-destructive text-destructive' : 'border-green-200 text-green-700'}`}>
          {errorMessage || savedMessage}
        </Card>
      )}

      {activeAction && (
        <Card className="p-4 border border-blue-200 bg-blue-50 text-blue-700">
          Saving changes...
        </Card>
      )}

      <Card className="p-8 border border-border">
        <h3 className="text-xl font-semibold mb-6 text-foreground">Profile</h3>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <Input type="email" name="email" value={formData.email} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Role</label>
              <Input type="text" value={formData.role} disabled className="bg-muted capitalize" />
            </div>
            <Button onClick={handleProfileSave} disabled={isBusy('profile')}>
              {isBusy('profile') ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Current Password</label>
              <Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
              <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Confirm New Password</label>
              <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </div>
            <Button variant="outline" onClick={handlePasswordChange} disabled={isBusy('password')}>
              {isBusy('password') ? 'Saving...' : 'Change Password'}
            </Button>
          </div>
        </div>

        {currentRoleDefinition && (
          <div className="mt-5 rounded-md border border-border/70 bg-muted/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role Summary</p>
            <p className="mt-1 text-sm font-medium text-foreground">{currentRoleDefinition.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{currentRoleDefinition.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {currentRoleDefinition.permissions.map((permission) => (
                <span key={permission} className="rounded-sm border border-border/60 bg-background/70 px-2.5 py-1 text-xs text-muted-foreground">
                  {permission}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {isAdmin && (
        <>
          <Card className="p-8 border border-border">
            <h3 className="text-xl font-semibold mb-6 text-foreground">User Management</h3>
            <div className="mb-6 rounded-lg border border-border bg-muted/20 p-5">
              <p className="text-sm font-semibold text-foreground">New accounts use secure invitations</p>
              <p className="mt-1 text-sm text-muted-foreground">Open Team to invite members, choose their role, and copy a single-use onboarding link. Passwords are never chosen by an administrator.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border text-left text-sm text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4">User</th>
                    <th className="py-3 pr-4">Email</th>
                    <th className="py-3 pr-4">Role</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Actions</th>
                    <th className="py-3 bg-red-500/10 text-red-700 px-3 rounded-sm">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="border-b border-border/60 last:border-0">
                      <td className="py-4 pr-4 font-medium text-foreground">{member.name}</td>
                      <td className="py-4 pr-4 text-sm text-muted-foreground">{member.email}</td>
                      <td className="py-4 pr-4">
                        <select
                          value={member.role}
                          onChange={(event) => updateMember(member, { role: event.target.value as UserRole })}
                          className="rounded-md border border-border bg-background px-2 py-1 text-sm capitalize"
                        >
                          {(['admin', 'manager', 'developer', 'tester'] as UserRole[]).map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 pr-4 text-sm capitalize">{member.status}</td>
                      <td className="py-4 pr-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateMember(member, { status: member.status === 'active' ? 'inactive' : 'active' })}
                        >
                          {member.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                      <td className="py-4 px-3 bg-red-500/5">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMember(member)}
                          disabled={member.id === user?.id}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-8 border border-border">
            <h3 className="text-xl font-semibold mb-6 text-foreground">Role & Permissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {roles && (Object.entries(roles) as Array<[UserRole, RoleDefinition]>).map(([role, definition]) => (
                <div key={role} className="rounded-lg border border-border bg-muted/30 p-5">
                  <p className="font-semibold text-foreground mb-2">{definition.label}</p>
                  <p className="text-sm text-muted-foreground mb-4">{definition.description}</p>
                  <div className="space-y-2">
                    {definition.permissions.map((permission) => (
                      <p key={permission} className="text-sm text-foreground">{permission}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-8 border border-border">
            <h3 className="text-xl font-semibold mb-6 text-foreground">Project Defaults</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Default Bug Status</label>
                <select
                  value={systemSettings.default_bug_status}
                  onChange={(event) => setSystemSettings({ ...systemSettings, default_bug_status: event.target.value as SystemSettings['default_bug_status'] })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {['open', 'in-progress', 'resolved', 'closed'].map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Default Priority</label>
                <select
                  value={systemSettings.default_bug_priority}
                  onChange={(event) => setSystemSettings({ ...systemSettings, default_bug_priority: event.target.value as SystemSettings['default_bug_priority'] })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="low">Low - Minor inconvenience</option>
                  <option value="medium">Medium - Affects functionality</option>
                  <option value="high">High - Major feature broken</option>
                  <option value="critical">Critical - System unusable</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Default Severity</label>
                <select
                  value={systemSettings.default_bug_severity}
                  onChange={(event) => setSystemSettings({ ...systemSettings, default_bug_severity: event.target.value as SystemSettings['default_bug_severity'] })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="minor">Minor - Cosmetic issue</option>
                  <option value="major">Major - Functional issue</option>
                  <option value="critical">Critical - Data loss or security</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Default Assignee Rule</label>
                <select
                  value={systemSettings.default_assignee_rule}
                  onChange={(event) => setSystemSettings({ ...systemSettings, default_assignee_rule: event.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="unassigned">Leave unassigned</option>
                  <option value="reporter">Assign to reporter</option>
                  <option value="project-lead">Assign to project lead</option>
                </select>
              </div>
            </div>
            <Button className="mt-6" onClick={handleSystemSettingsSave} disabled={isBusy('project-defaults')}>
              {isBusy('project-defaults') ? 'Saving...' : 'Save Project Defaults'}
            </Button>
          </Card>
        </>
      )}

      <Card className="p-8 border border-border">
        <h3 className="text-xl font-semibold mb-6 text-foreground">Notification Settings</h3>
        <p className="mb-4 text-sm text-muted-foreground">These settings control which update alerts appear in your notification feed.</p>
        <div className="space-y-4">
          {preferenceLabels.map((pref) => (
            <label key={pref.key} className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition">
              <input
                type="checkbox"
                checked={Boolean(preferences[pref.key])}
                onChange={(event) => setPreferences({ ...preferences, [pref.key]: event.target.checked })}
                className="w-4 h-4 rounded"
              />
              <div className="flex-1">
                <p className="font-medium text-foreground">{pref.name}</p>
                <p className="text-xs text-muted-foreground">{pref.description}</p>
              </div>
            </label>
          ))}
          <Button className="mt-4" onClick={handlePreferenceSave} disabled={isBusy('preferences')}>
            {isBusy('preferences') ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </Card>

      {isAdmin && (
        <>
          <Card className="p-8 border border-border">
            <h3 className="text-xl font-semibold mb-6 text-foreground">System Configuration</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">App Name</label>
                <Input value={systemSettings.app_name} onChange={(event) => setSystemSettings({ ...systemSettings, app_name: event.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Timezone</label>
                <Input value={systemSettings.timezone} onChange={(event) => setSystemSettings({ ...systemSettings, timezone: event.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Date Format</label>
                <Input value={systemSettings.date_format} onChange={(event) => setSystemSettings({ ...systemSettings, date_format: event.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Default Dashboard View</label>
                <select
                  value={systemSettings.dashboard_default_view}
                  onChange={(event) => setSystemSettings({ ...systemSettings, dashboard_default_view: event.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="overview">Overview</option>
                  <option value="bugs">Bugs</option>
                  <option value="reports">Reports</option>
                  <option value="projects">Projects</option>
                  <option value="team">Team</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Session Timeout (minutes)</label>
                <Input
                  type="number"
                  min={15}
                  value={systemSettings.session_timeout_minutes}
                  onChange={(event) => setSystemSettings({ ...systemSettings, session_timeout_minutes: Number(event.target.value) })}
                />
              </div>
            </div>
            <Button className="mt-6" onClick={handleSystemSettingsSave} disabled={isBusy('project-defaults')}>
              {isBusy('project-defaults') ? 'Saving...' : 'Save System Configuration'}
            </Button>
          </Card>

          <Card className="p-8 border border-border">
            <h3 className="text-xl font-semibold mb-6 text-foreground">Data & Maintenance</h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Button variant="outline" onClick={exportWorkspaceData} disabled={isBusy('export')}>{isBusy('export') ? 'Preparing...' : 'Export Workspace Data'}</Button>
              <Button variant="outline" onClick={() => clearMaintenanceData('notifications')} disabled={isBusy('clear-notifications')}>{isBusy('clear-notifications') ? 'Clearing...' : 'Clear Notifications'}</Button>
              <Button variant="outline" onClick={() => clearMaintenanceData('activity')} disabled={isBusy('clear-activity')}>{isBusy('clear-activity') ? 'Clearing...' : 'Clear Activity Log'}</Button>
              <Button variant="outline" onClick={resetDemoData} disabled={isBusy('reset-demo')}>{isBusy('reset-demo') ? 'Resetting...' : 'Reset Demo Data'}</Button>
            </div>
          </Card>

          <Card className="p-8 border border-border">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Audit / Activity</h3>
                <p className="text-sm text-muted-foreground mt-1">Review admin actions, role updates, project movement, and security-related events.</p>
              </div>
              <Button variant="outline" size="sm" onClick={refreshAdminAudit}>Refresh</Button>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/20">
                <button
                  type="button"
                  onClick={() => toggleAuditSection('admin')}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-foreground">Recent Admin Actions</span>
                  <span className="text-xs text-muted-foreground">{openAuditSections.admin ? 'Hide' : 'Show'}</span>
                </button>
                {openAuditSections.admin && (
                  <div className="border-t border-border px-4 py-4">
                    {renderAuditList(recentAdminActions, 'No recent admin actions yet.')}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-muted/20">
                <button
                  type="button"
                  onClick={() => toggleAuditSection('roles')}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-foreground">User Role Changes</span>
                  <span className="text-xs text-muted-foreground">{openAuditSections.roles ? 'Hide' : 'Show'}</span>
                </button>
                {openAuditSections.roles && (
                  <div className="border-t border-border px-4 py-4">
                    {renderAuditList(userRoleChanges, 'No user role changes recorded yet.')}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-muted/20">
                <button
                  type="button"
                  onClick={() => toggleAuditSection('projects')}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-foreground">Project Changes</span>
                  <span className="text-xs text-muted-foreground">{openAuditSections.projects ? 'Hide' : 'Show'}</span>
                </button>
                {openAuditSections.projects && (
                  <div className="border-t border-border px-4 py-4">
                    {renderAuditList(projectChanges, 'No project changes recorded yet.')}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-muted/20">
                <button
                  type="button"
                  onClick={() => toggleAuditSection('security')}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-foreground">Security-Related Events</span>
                  <span className="text-xs text-muted-foreground">{openAuditSections.security ? 'Hide' : 'Show'}</span>
                </button>
                {openAuditSections.security && (
                  <div className="border-t border-border px-4 py-4">
                    {renderAuditList(securityEvents, 'No security-related events recorded yet.')}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </>
      )}

      <Card className="p-8 border border-destructive bg-destructive/5">
        <h3 className="text-xl font-semibold mb-6 text-destructive">Danger Zone</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium text-foreground mb-2">Deactivate My Account</h4>
            <p className="text-sm text-muted-foreground mb-4">This will disable your account until another administrator reactivates it.</p>
            <Button variant="destructive" onClick={deactivateAccount}>Deactivate Account</Button>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">Sign Out</h4>
            <p className="text-sm text-muted-foreground mb-4">End the current session on this device.</p>
            <Button onClick={logout} variant="outline">Sign Out</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
