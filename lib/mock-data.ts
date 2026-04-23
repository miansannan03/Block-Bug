export interface Project {
  id: string
  name: string
  description: string
  key: string
  status: 'active' | 'archived'
  teamSize: number
  createdAt: Date
}

export interface Bug {
  id: string
  title: string
  description: string
  status: 'open' | 'in-progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  severity: 'minor' | 'major' | 'critical'
  projectId: string
  assignedTo?: string
  reportedBy: string
  createdAt: Date
  updatedAt: Date
  verifiedAt?: Date
}

export interface Activity {
  id: string
  bugId: string
  type: 'created' | 'status_changed' | 'assigned' | 'commented' | 'verified'
  userId: string
  userName: string
  message: string
  timestamp: Date
}

export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Mobile App',
    description: 'iOS and Android mobile application',
    key: 'MA',
    status: 'active',
    teamSize: 8,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'proj-2',
    name: 'Web Platform',
    description: 'Main web application and dashboard',
    key: 'WP',
    status: 'active',
    teamSize: 12,
    createdAt: new Date('2023-06-20'),
  },
  {
    id: 'proj-3',
    name: 'API Services',
    description: 'Backend API and microservices',
    key: 'API',
    status: 'active',
    teamSize: 6,
    createdAt: new Date('2023-11-10'),
  },
]

export const mockBugs: Bug[] = [
  {
    id: 'bug-1',
    title: 'Login button not responsive on mobile',
    description: 'The login button does not respond to touch events on iOS devices',
    status: 'open',
    priority: 'high',
    severity: 'major',
    projectId: 'proj-1',
    reportedBy: 'mike@blockbug.dev',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'bug-2',
    title: 'Crash on app launch in offline mode',
    description: 'Application crashes immediately when launched without internet connection',
    status: 'in-progress',
    priority: 'critical',
    severity: 'critical',
    projectId: 'proj-1',
    assignedTo: 'sarah@blockbug.dev',
    reportedBy: 'mike@blockbug.dev',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: 'bug-3',
    title: 'Dashboard charts not rendering',
    description: 'Charts on dashboard page show as blank after data load',
    status: 'resolved',
    priority: 'medium',
    severity: 'major',
    projectId: 'proj-2',
    assignedTo: 'sarah@blockbug.dev',
    reportedBy: 'alex@blockbug.dev',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    verifiedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'bug-4',
    title: 'Typo in welcome message',
    description: 'Welcome message has spelling error in French translation',
    status: 'closed',
    priority: 'low',
    severity: 'minor',
    projectId: 'proj-2',
    reportedBy: 'mike@blockbug.dev',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'bug-5',
    title: 'API timeout on large requests',
    description: 'API endpoint returns 504 timeout for requests with >10000 records',
    status: 'open',
    priority: 'high',
    severity: 'major',
    projectId: 'proj-3',
    reportedBy: 'sarah@blockbug.dev',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'bug-6',
    title: 'Database connection pool exhaustion',
    description: 'Connection pool exhausts under high load, causing request failures',
    status: 'in-progress',
    priority: 'critical',
    severity: 'critical',
    projectId: 'proj-3',
    assignedTo: 'sarah@blockbug.dev',
    reportedBy: 'alex@blockbug.dev',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    id: 'bug-7',
    title: 'Missing validation on user input',
    description: 'Form accepts invalid email addresses and special characters',
    status: 'open',
    priority: 'medium',
    severity: 'major',
    projectId: 'proj-2',
    reportedBy: 'mike@blockbug.dev',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
  {
    id: 'bug-8',
    title: 'Performance issue with large file uploads',
    description: 'Uploading files larger than 100MB causes memory leak',
    status: 'resolved',
    priority: 'high',
    severity: 'major',
    projectId: 'proj-1',
    assignedTo: 'sarah@blockbug.dev',
    reportedBy: 'mike@blockbug.dev',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    verifiedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
]

export const mockActivities: Activity[] = [
  {
    id: 'act-1',
    bugId: 'bug-2',
    type: 'status_changed',
    userId: 'sarah@blockbug.dev',
    userName: 'Sarah Dev',
    message: 'Changed status to in-progress',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: 'act-2',
    bugId: 'bug-2',
    type: 'assigned',
    userId: 'alex@blockbug.dev',
    userName: 'Alex Chen',
    message: 'Assigned to Sarah Dev',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: 'act-3',
    bugId: 'bug-3',
    type: 'verified',
    userId: 'mike@blockbug.dev',
    userName: 'Mike Tester',
    message: 'Verified fix in v2.1.0',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'act-4',
    bugId: 'bug-6',
    type: 'commented',
    userId: 'alex@blockbug.dev',
    userName: 'Alex Chen',
    message: 'Identified root cause: connection timeout settings',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    id: 'act-5',
    bugId: 'bug-1',
    type: 'created',
    userId: 'mike@blockbug.dev',
    userName: 'Mike Tester',
    message: 'Created new bug report',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
]

export function getBugStats() {
  return {
    total: mockBugs.length,
    open: mockBugs.filter(b => b.status === 'open').length,
    inProgress: mockBugs.filter(b => b.status === 'in-progress').length,
    resolved: mockBugs.filter(b => b.status === 'resolved').length,
    closed: mockBugs.filter(b => b.status === 'closed').length,
    critical: mockBugs.filter(b => b.priority === 'critical').length,
    high: mockBugs.filter(b => b.priority === 'high').length,
  }
}

export function getProjectStats(projectId: string) {
  const bugs = mockBugs.filter(b => b.projectId === projectId)
  return {
    total: bugs.length,
    open: bugs.filter(b => b.status === 'open').length,
    inProgress: bugs.filter(b => b.status === 'in-progress').length,
    resolved: bugs.filter(b => b.status === 'resolved').length,
  }
}
