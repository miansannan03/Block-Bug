export type UserRole = 'super_admin' | 'admin' | 'manager' | 'developer' | 'tester'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  platformRole?: 'SUPER_ADMIN' | null
  organizationRole?: 'ORGANIZATION_ADMIN' | 'MANAGER' | 'DEVELOPER' | 'TESTER' | null
  organizationId?: string | null
  organizationName?: string | null
  organizationEmail?: string | null
  status?: 'active' | 'inactive'
  avatar?: string
}

export interface Organization {
  id: string
  name: string
  loginEmail?: string
  status: 'active' | 'inactive'
  createdAt?: Date
  updatedAt?: Date
}

export interface RoleDefinition {
  label: string
  description: string
  permissions: string[]
}

export interface Project {
  id: string
  name: string
  description: string
  key: string
  status: 'active' | 'archived'
  teamSize: number
  createdAt: Date
  updatedAt?: Date
}

export interface Invitation {
  id: string
  type: 'organization' | 'user'
  email: string
  role: 'admin' | 'manager' | 'developer' | 'tester'
  organizationId?: string | null
  organizationName?: string | null
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  expiresAt: string
  acceptedAt?: string | null
  createdAt: string
}

export interface PlatformOrganization {
  id: string
  name: string
  status: 'active' | 'inactive'
  primaryAdminEmail?: string | null
  userCount: number
  adminCount: number
  bugCount: number
  projectCount: number
  createdAt: string
  lastActivityAt?: string | null
}

export interface PlatformMetrics {
  totalOrganizations: number
  activeOrganizations: number
  suspendedOrganizations: number
  totalUsers: number
  totalAdmins: number
  totalBugs: number
  totalProjects: number
  pendingInvitations: number
}

export interface AuditLog {
  id: number
  organizationId?: string | null
  actorRole?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  succeeded: boolean
  metadata?: Record<string, unknown> | null
  ipAddress?: string | null
  requestId?: string | null
  createdAt: string
}

export interface ApplicationErrorLog {
  id: number
  organizationId?: string | null
  userId?: string | null
  level: string
  errorType: string
  message: string
  module?: string | null
  httpStatus?: number | null
  requestId?: string | null
  createdAt: string
}

export interface Sprint {
  id: string
  projectId: string
  name: string
  goal?: string | null
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  startDate: Date
  endDate: Date
  createdBy?: string | null
  completedAt?: Date | null
  createdAt: Date
  updatedAt?: Date
}

export interface Bug {
  id: string
  title: string
  description: string
  status: 'open' | 'in-progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  severity: 'minor' | 'major' | 'critical'
  projectId: string
  sprintId?: string | null
  assignedTo?: string | null
  reportedBy: string
  verificationTesterEmail?: string | null
  stepsToReproduce?: string | null
  expectedResult?: string | null
  actualResult?: string | null
  environment?: string | null
  createdAt: Date
  updatedAt: Date
  verifiedAt?: Date | null
  blockchainLastTxHash?: string | null
  blockchainLastSyncStatus?: 'synced' | 'failed' | null
  blockchainLastEventId?: number | null
  blockchainBugChainId?: string | null
  blockchainLastSyncedAt?: Date | null
}

export interface BlockchainBugEvent {
  id: string
  bugId: string
  action: string
  syncStatus: 'pending' | 'synced' | 'failed'
  transactionHash?: string | null
  blockchainEventId?: number | null
  bugChainId?: string | null
  contractAddress?: string | null
  createdByEmail?: string | null
  metadataJson?: string | null
  serviceResponse?: string | null
  errorMessage?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Activity {
  id: string
  bugId: string | null
  type: 'created' | 'status_changed' | 'assigned' | 'commented' | 'verified'
  userId: string
  userName: string
  message: string
  timestamp: Date
}

export interface Comment {
  id: string
  bugId: string
  parentCommentId?: string | null
  userEmail: string
  userName: string
  comment: string
  createdAt: Date
}

export interface BugAttachment {
  id: string
  bugId: string
  originalName: string
  storedName: string
  filePath: string
  mimeType: string
  fileSize: number
  uploadedBy: string
  url: string
  createdAt: Date
}

export interface Notification {
  id: string
  userEmail?: string | null
  title: string
  body?: string | null
  type: string
  entityType?: string | null
  entityId?: string | null
  targetPage?: string | null
  isRead: boolean
  createdAt: Date
}

export interface BugStats {
  total: number
  open: number
  inProgress: number
  resolved: number
  closed: number
  critical: number
  high: number
}

export interface ReportData {
  priorities: Record<'critical' | 'high' | 'medium' | 'low', number>
  summary: {
    totalBugs: number
    activeProjects: number
    totalProjects: number
    avgBugsPerProject: number
  }
  resolutionTimes: Array<{ name: string; days: number }>
}

export interface DashboardData {
  weeklyBugs: {
    categories: string[]
    data: number[]
  }
  weekDelta: {
    current: number
    previous: number
    percent: number
  }
  activeUsers: User[]
  quickActions: {
    openBugs: number
    analyticsReports: number
    pendingVerification: number
    teamMembers: number
  }
}

export interface ApiKey {
  id: string
  userId: string
  keyLabel: string
  keyPrefix: string
  createdAt: Date
  lastUsedAt?: Date | null
  revokedAt?: Date | null
}

export interface Integration {
  id: string
  name: string
  description: string
  icon: string
  status: 'connected' | 'available'
  createdAt: Date
  updatedAt: Date
}

export interface SystemSettings {
  default_bug_status: Bug['status']
  default_bug_priority: Bug['priority']
  default_bug_severity: Bug['severity']
  default_assignee_rule: string
  app_name: string
  timezone: string
  date_format: string
  dashboard_default_view: string
  session_timeout_minutes: number
  allow_signup: boolean
}

export interface NewBugPayload {
  title: string
  description: string
  priority: Bug['priority']
  severity: Bug['severity']
  projectId: string
  sprintId?: string
  reportedBy: string
  assignedTo?: string
  verificationTesterEmail?: string
  stepsToReproduce?: string
  expectedResult?: string
  actualResult?: string
  environment?: string
}

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'http://127.0.0.1:8000/api'
).replace(/\/+$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData
  const headers = new Headers(init?.headers ?? {})
  headers.set('Accept', 'application/json')
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('blockbug_token')
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data as T
}

function parseDate(value?: string | null): Date | null {
  return value ? new Date(value.replace(' ', 'T')) : null
}

function normalizeProject(project: any): Project {
  return {
    ...project,
    createdAt: parseDate(project.createdAt) || new Date(),
    updatedAt: parseDate(project.updatedAt) || undefined,
  }
}

function normalizeSprint(sprint: any): Sprint {
  return {
    ...sprint,
    startDate: parseDate(sprint.startDate) || new Date(sprint.startDate),
    endDate: parseDate(sprint.endDate) || new Date(sprint.endDate),
    completedAt: parseDate(sprint.completedAt),
    createdAt: parseDate(sprint.createdAt) || new Date(),
    updatedAt: parseDate(sprint.updatedAt) || undefined,
  }
}

function normalizeBug(bug: any): Bug {
  return {
    ...bug,
    createdAt: parseDate(bug.createdAt) || new Date(),
    updatedAt: parseDate(bug.updatedAt) || new Date(),
    verifiedAt: parseDate(bug.verifiedAt),
    blockchainLastEventId: bug.blockchainLastEventId != null ? Number(bug.blockchainLastEventId) : null,
    blockchainLastSyncedAt: parseDate(bug.blockchainLastSyncedAt),
  }
}

function normalizeBlockchainBugEvent(event: any): BlockchainBugEvent {
  return {
    ...event,
    blockchainEventId: event.blockchainEventId != null ? Number(event.blockchainEventId) : null,
    createdAt: parseDate(event.createdAt) || new Date(),
    updatedAt: parseDate(event.updatedAt) || new Date(),
  }
}

function normalizeActivity(activity: any): Activity {
  return {
    ...activity,
    timestamp: parseDate(activity.timestamp) || new Date(),
  }
}

function normalizeComment(comment: any): Comment {
  return {
    ...comment,
    createdAt: parseDate(comment.createdAt) || new Date(),
  }
}

function normalizeBugAttachment(attachment: any): BugAttachment {
  return {
    ...attachment,
    createdAt: parseDate(attachment.createdAt) || new Date(),
  }
}

function normalizeNotification(notification: any): Notification {
  return {
    ...notification,
    isRead: Boolean(Number(notification.isRead)),
    createdAt: parseDate(notification.createdAt) || new Date(),
  }
}

function normalizeApiKey(apiKey: any): ApiKey {
  return {
    ...apiKey,
    createdAt: parseDate(apiKey.createdAt) || new Date(),
    lastUsedAt: parseDate(apiKey.lastUsedAt),
    revokedAt: parseDate(apiKey.revokedAt),
  }
}

function normalizeIntegration(integration: any): Integration {
  return {
    ...integration,
    createdAt: parseDate(integration.createdAt) || new Date(),
    updatedAt: parseDate(integration.updatedAt) || new Date(),
  }
}

export const api = {
  async getPublicSettings() {
    return request<{ settings: Partial<SystemSettings> }>('/public-settings')
  },

  async login(email: string, password: string) {
    return request<{ user: User; token: string; expiresAt: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  async me() {
    return request<{ user: User }>('/auth/me')
  },

  async logout() {
    return request<{ ok: boolean }>('/auth/logout', { method: 'POST' })
  },

  async inspectInvitation(token: string) {
    return request<{ invitation: Invitation }>('/invitations/inspect', { method: 'POST', body: JSON.stringify({ token }) })
  },

  async acceptInvitation(token: string, payload: { name: string; organizationName?: string; password: string; password_confirmation: string }) {
    return request<{ ok: boolean; userId: string; organizationId: string }>('/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ ...payload, token }),
    })
  },

  async getPlatformDashboard() {
    return request<{ metrics: PlatformMetrics; recentOrganizations: PlatformOrganization[]; recentActivity: AuditLog[] }>('/super-admin/dashboard')
  },

  async getOrganizations() {
    return request<{ organizations: PlatformOrganization[] }>('/super-admin/organizations')
  },

  async updateOrganizationStatus(id: string, status: 'active' | 'inactive') {
    return request<{ organization: PlatformOrganization }>(`/super-admin/organizations/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
  },

  async deleteOrganization(id: string) {
    return request<{ ok: boolean }>(`/super-admin/organizations/${id}`, { method: 'DELETE' })
  },

  async getOrganizationInvitations() {
    return request<{ invitations: Invitation[] }>('/super-admin/invitations')
  },

  async inviteOrganization(email: string) {
    return request<{ invitation: Invitation; token: string }>('/super-admin/invitations', { method: 'POST', body: JSON.stringify({ email }) })
  },

  async getUserInvitations() {
    return request<{ invitations: Invitation[] }>('/user-invitations')
  },

  async inviteUser(email: string, role: Exclude<UserRole, 'super_admin'>) {
    return request<{ invitation: Invitation; token: string }>('/user-invitations', { method: 'POST', body: JSON.stringify({ email, role }) })
  },

  async regenerateInvitation(id: string, platform = false) {
    const base = platform ? '/super-admin/invitations' : '/user-invitations'
    return request<{ invitation: Invitation; token: string }>(`${base}/${id}/regenerate`, { method: 'POST' })
  },

  async revokeInvitation(id: string, platform = false) {
    const base = platform ? '/super-admin/invitations' : '/user-invitations'
    return request<{ ok: boolean }>(`${base}/${id}/revoke`, { method: 'POST' })
  },

  async getPlatformAuditLogs() {
    return request<{ logs: AuditLog[] }>('/super-admin/audit-logs')
  },

  async getPlatformErrorLogs() {
    return request<{ logs: ApplicationErrorLog[] }>('/super-admin/error-logs')
  },

  async getUsers() {
    const data = await request<{ users: User[] }>('/users')
    return data.users
  },

  async getRoles() {
    const data = await request<{ roles: Record<UserRole, RoleDefinition> }>('/roles')
    return data.roles
  },

  async updateUser(id: string, payload: Partial<Pick<User, 'name' | 'role' | 'status'>> & { actorRole?: UserRole }) {
    return request<{ user: User }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  async deleteUser(id: string, actorRole?: UserRole) {
    const query = actorRole ? `?actor_role=${encodeURIComponent(actorRole)}` : ''
    return request<{ ok: boolean }>(`/users/${id}${query}`, {
      method: 'DELETE',
    })
  },

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    return request<{ ok: boolean }>(`/users/${id}/password`, {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  },

  async getProjects() {
    const data = await request<{ projects: any[] }>('/projects')
    return data.projects.map(normalizeProject)
  },

  async createProject(payload: { name: string; description: string; key: string; teamSize?: number; status?: Project['status']; actorRole?: UserRole }) {
    const data = await request<{ project: any }>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return normalizeProject(data.project)
  },

  async deleteProject(id: string, actorRole?: UserRole) {
    const query = actorRole ? `?actor_role=${encodeURIComponent(actorRole)}` : ''
    return request<{ ok: boolean }>(`/projects/${id}${query}`, {
      method: 'DELETE',
    })
  },

  async getProjectSprints(projectId: string) {
    const data = await request<{ sprints: any[] }>(`/projects/${projectId}/sprints`)
    return data.sprints.map(normalizeSprint)
  },

  async createSprint(
    projectId: string,
    payload: {
      name: string
      goal?: string
      startDate: string
      endDate: string
      status?: Sprint['status']
      actorRole?: UserRole
      userEmail?: string
      userName?: string
    },
  ) {
    const data = await request<{ sprint: any }>(`/projects/${projectId}/sprints`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return normalizeSprint(data.sprint)
  },

  async updateSprint(
    sprintId: string,
    payload: Partial<Pick<Sprint, 'name' | 'goal' | 'status'>> & {
      startDate?: string
      endDate?: string
      actorRole?: UserRole
      userEmail?: string
      userName?: string
    },
  ) {
    const data = await request<{ sprint: any }>(`/sprints/${sprintId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return normalizeSprint(data.sprint)
  },

  async completeSprint(
    sprintId: string,
    payload: {
      completionAction?: 'backlog' | 'another_sprint'
      targetSprintId?: string | null
      actorRole?: UserRole
      userEmail?: string
      userName?: string
    },
  ) {
    const data = await request<{ sprint: any; movedBugIds: string[] }>(`/sprints/${sprintId}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return {
      sprint: normalizeSprint(data.sprint),
      movedBugIds: data.movedBugIds ?? [],
    }
  },

  async getBugs(options?: { reportedBy?: string; actorRole?: UserRole; actorEmail?: string }) {
    const params = new URLSearchParams()
    if (options?.reportedBy) {
      params.set('reported_by', options.reportedBy)
    }
    if (options?.actorRole) {
      params.set('actor_role', options.actorRole)
    }
    if (options?.actorEmail) {
      params.set('actor_email', options.actorEmail)
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    const data = await request<{ bugs: any[] }>(`/bugs${query}`)
    return data.bugs.map(normalizeBug)
  },

  async createBug(payload: NewBugPayload, attachment?: File | null) {
    const body = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        body.append(key, String(value))
      }
    })
    if (attachment) {
      body.append('attachment', attachment)
    }
    const data = await request<{ bug: any; attachment?: any | null }>('/bugs', {
      method: 'POST',
      body,
    })
    return {
      bug: normalizeBug(data.bug),
      attachment: data.attachment ? normalizeBugAttachment(data.attachment) : null,
    }
  },

  async getBugAttachments(bugId: string) {
    const data = await request<{ attachments: any[] }>(`/bugs/${bugId}/attachments`)
    return data.attachments.map(normalizeBugAttachment)
  },

  async downloadAttachment(id: string, filename: string) {
    const token = window.localStorage.getItem('blockbug_token')
    const response = await fetch(`${API_BASE_URL}/attachments/${encodeURIComponent(id)}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'Attachment download failed')
    }
    const objectUrl = URL.createObjectURL(await response.blob())
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  },

  async getBugBlockchainEvents(bugId: string) {
    const data = await request<{ events: any[] }>(`/bugs/${bugId}/blockchain-events`)
    return data.events.map(normalizeBlockchainBugEvent)
  },

  async updateBug(
    id: string,
    payload: Partial<Pick<Bug, 'status' | 'assignedTo' | 'verificationTesterEmail' | 'sprintId'>> & {
      userEmail?: string
      userName?: string
      actorRole?: UserRole
    },
  ) {
    const data = await request<{ bug: any }>(`/bugs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return normalizeBug(data.bug)
  },

  async getComments(bugId: string) {
    const data = await request<{ comments: any[] }>(`/bugs/${bugId}/comments`)
    return data.comments.map(normalizeComment)
  },

  async createComment(bugId: string, payload: { comment: string; userEmail: string; userName: string; parentCommentId?: string | null }) {
    const data = await request<{ comment: any }>(`/bugs/${bugId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return normalizeComment(data.comment)
  },

  async getActivities() {
    const data = await request<{ activities: any[] }>('/activities')
    return data.activities.map(normalizeActivity)
  },

  async getStats() {
    const data = await request<{ stats: BugStats }>('/stats')
    return data.stats
  },

  async getDashboard() {
    return request<DashboardData>('/dashboard')
  },

  async getReports() {
    return request<ReportData>('/reports')
  },

  async getNotifications(userEmail?: string) {
    const query = userEmail ? `?user_email=${encodeURIComponent(userEmail)}` : ''
    const data = await request<{ notifications: any[] }>(`/notifications${query}`)
    return data.notifications.map(normalizeNotification)
  },

  async getPreferences(userId: string) {
    return request<{ preferences: Record<string, boolean> }>(`/preferences?user_id=${encodeURIComponent(userId)}`)
  },

  async updatePreferences(userId: string, preferences: Record<string, boolean>) {
    return request<{ preferences: Record<string, boolean> }>('/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ userId, preferences }),
    })
  },

  async getSystemSettings() {
    return request<{ settings: SystemSettings }>('/system-settings')
  },

  async updateSystemSettings(settings: Partial<SystemSettings>, actorRole?: UserRole) {
    return request<{ settings: SystemSettings }>('/system-settings', {
      method: 'PATCH',
      body: JSON.stringify({ settings, actorRole }),
    })
  },

  async getApiKeys(userId: string) {
    const data = await request<{ apiKeys: any[] }>(`/api-keys?user_id=${encodeURIComponent(userId)}`)
    return data.apiKeys.map(normalizeApiKey)
  },

  async createApiKey(userId: string) {
    const data = await request<{ apiKey: any; plainKey: string }>('/api-keys', {
      method: 'POST',
      body: JSON.stringify({ userId, label: 'Generated key' }),
    })
    return { apiKey: normalizeApiKey(data.apiKey), plainKey: data.plainKey }
  },

  async revokeApiKey(id: string) {
    return request<{ ok: boolean }>(`/api-keys/${id}`, { method: 'DELETE' })
  },

  async getIntegrations() {
    const data = await request<{ integrations: any[] }>('/integrations')
    return data.integrations.map(normalizeIntegration)
  },

  async updateIntegration(id: string, status: Integration['status'], actorRole?: UserRole) {
    const data = await request<{ integration: any }>(`/integrations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, actorRole }),
    })
    return normalizeIntegration(data.integration)
  },

  async exportMaintenanceData(actorRole?: UserRole) {
    const query = actorRole ? `?actor_role=${encodeURIComponent(actorRole)}` : ''
    return request<any>(`/maintenance/export${query}`)
  },

  async clearMaintenanceData(target: 'notifications' | 'activity' | 'all', actorRole?: UserRole) {
    return request<{ ok: boolean }>('/maintenance/clear-data', {
      method: 'POST',
      body: JSON.stringify({ target, actorRole }),
    })
  },

  async resetDemoData(actorRole?: UserRole) {
    return request<{ ok: boolean }>('/maintenance/reset-demo', {
      method: 'POST',
      body: JSON.stringify({ actorRole }),
    })
  },
}

export function getProjectStats(projectId: string, bugs: Bug[]) {
  const projectBugs = bugs.filter((bug) => bug.projectId === projectId)
  return {
    total: projectBugs.length,
    open: projectBugs.filter((bug) => bug.status === 'open').length,
    inProgress: projectBugs.filter((bug) => bug.status === 'in-progress').length,
    resolved: projectBugs.filter((bug) => bug.status === 'resolved').length,
    closed: projectBugs.filter((bug) => bug.status === 'closed').length,
  }
}
