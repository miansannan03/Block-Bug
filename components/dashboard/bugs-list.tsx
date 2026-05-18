'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api, type BlockchainBugEvent, type Bug, type BugAttachment, type Comment, type Project, type SystemSettings, type User } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { formatDateWithSettings } from '@/lib/system-settings-context'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, ArrowLeft, FolderKanban, Rows3, UserRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useForm } from 'react-hook-form'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface NewBugFormData {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  severity: 'minor' | 'major' | 'critical'
  projectId: string
  assignedTo?: string
  verificationTesterEmail?: string
  stepsToReproduce?: string
  expectedResult?: string
  actualResult?: string
  environment?: string
}

interface BugsListProps {
  initialSelectedBugId?: string | null
  onNotificationTargetHandled?: () => void
}

const UNASSIGNED_VALUE = '__unassigned__'

export function BugsList({ initialSelectedBugId, onNotificationTargetHandled }: BugsListProps) {
  const { user } = useAuth()
  const bugDefaults: Pick<SystemSettings, 'default_bug_priority' | 'default_bug_severity'> = {
    default_bug_priority: 'medium',
    default_bug_severity: 'major',
  }
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [managerView, setManagerView] = useState<'flow' | 'list'>('list')
  const [isNewBugDialogOpen, setIsNewBugDialogOpen] = useState(false)
  const [bugs, setBugs] = useState<Bug[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [testerMembers, setTesterMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [attachments, setAttachments] = useState<BugAttachment[]>([])
  const [blockchainEvents, setBlockchainEvents] = useState<BlockchainBugEvent[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null)
  const [defaults, setDefaults] = useState(bugDefaults)
  const [assignmentValue, setAssignmentValue] = useState('')
  const [verificationTesterValue, setVerificationTesterValue] = useState('')
  const [statusValue, setStatusValue] = useState<Bug['status']>('open')
  const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false)
  const [isUpdatingVerificationTester, setIsUpdatingVerificationTester] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const canAssignBugs = user?.role === 'manager' || user?.role === 'admin'
  const canCreateBug = user?.role === 'manager' || user?.role === 'tester'
  const hasFlowView = user?.role === 'manager' || user?.role === 'admin'
  const hasDeveloperView = user?.role === 'developer'
  const canUpdateStatus = user?.role === 'developer'
  const isDeveloperAssignedToBug = user?.role === 'developer' && !!selectedBug && selectedBug.assignedTo === user.email
  const isTesterVerificationOwner = user?.role === 'tester' && !!selectedBug && (
    selectedBug.verificationTesterEmail === user.email || selectedBug.reportedBy === user.email
  )

  const form = useForm<NewBugFormData>({
    defaultValues: {
      title: '',
      description: '',
      priority: bugDefaults.default_bug_priority,
      severity: bugDefaults.default_bug_severity,
      projectId: '',
      assignedTo: '',
      verificationTesterEmail: '',
      stepsToReproduce: '',
      expectedResult: '',
      actualResult: '',
      environment: '',
    },
  })

  useEffect(() => {
    Promise.all([
      api.getBugs(user?.email ? { actorRole: user.role, actorEmail: user.email } : undefined),
      api.getProjects(),
      api.getUsers(),
      api.getSystemSettings().catch(() => ({ settings: bugDefaults as Partial<SystemSettings> })),
    ])
      .then(([bugsData, projectsData, usersData, settingsData]) => {
        setBugs(bugsData)
        setProjects(projectsData)
        setAllUsers(usersData)
        setTeamMembers(usersData.filter((member) => member.status === 'active' && member.role === 'developer'))
        setTesterMembers(usersData.filter((member) => member.status === 'active' && member.role === 'tester'))
        const nextDefaults = {
          default_bug_priority: settingsData.settings.default_bug_priority || bugDefaults.default_bug_priority,
          default_bug_severity: settingsData.settings.default_bug_severity || bugDefaults.default_bug_severity,
        }
        setDefaults(nextDefaults)
        form.setValue('priority', nextDefaults.default_bug_priority)
        form.setValue('severity', nextDefaults.default_bug_severity)
        if (projectsData[0]) {
          form.setValue('projectId', projectsData[0].id)
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load bugs'))
      .finally(() => setLoading(false))
  }, [form, user?.email, user?.role])

  useEffect(() => {
    if (!selectedBug) {
      setComments([])
      setAttachments([])
      setBlockchainEvents([])
      setAssignmentValue('')
      setVerificationTesterValue('')
      return
    }
    setAssignmentValue(selectedBug.assignedTo || '')
    setVerificationTesterValue(selectedBug.verificationTesterEmail || '')
    setStatusValue(selectedBug.status)
    api.getComments(selectedBug.id).then(setComments).catch(() => setComments([]))
    api.getBugAttachments(selectedBug.id).then(setAttachments).catch(() => setAttachments([]))
    api.getBugBlockchainEvents(selectedBug.id).then(setBlockchainEvents).catch(() => setBlockchainEvents([]))
  }, [selectedBug])

  useEffect(() => {
    if (hasFlowView) {
      setManagerView('flow')
    }
  }, [hasFlowView])

  useEffect(() => {
    if (!initialSelectedBugId || bugs.length === 0) return
    const matchingBug = bugs.find((bug) => bug.id === initialSelectedBugId)
    if (matchingBug) {
      setSelectedBug(matchingBug)
      onNotificationTargetHandled?.()
    }
  }, [bugs, initialSelectedBugId, onNotificationTargetHandled])

  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.id, project.name])),
    [projects],
  )

  const threadedComments = useMemo(() => {
    const roots = comments.filter((comment) => !comment.parentCommentId)
    const repliesByParent = comments.reduce<Record<string, Comment[]>>((acc, comment) => {
      if (comment.parentCommentId) {
        if (!acc[comment.parentCommentId]) {
          acc[comment.parentCommentId] = []
        }
        acc[comment.parentCommentId].push(comment)
      }
      return acc
    }, {})

    return roots.map((comment) => ({
      ...comment,
      replies: repliesByParent[comment.id] || [],
    }))
  }, [comments])

  const searchScopedBugs = bugs.filter((bug) => {
    const matchesSearch = bug.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProject = projectFilter === 'all' || bug.projectId === projectFilter
    return matchesSearch && matchesProject
  })

  const assignedDeveloperBugs = useMemo(() => {
    if (!hasDeveloperView || !user?.email) {
      return searchScopedBugs
    }

    return searchScopedBugs.filter((bug) => bug.assignedTo === user.email)
  }, [hasDeveloperView, searchScopedBugs, user?.email])

  const workflowScopedBugs = useMemo(() => {
    if (!hasDeveloperView) {
      return searchScopedBugs
    }

    return [...assignedDeveloperBugs].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }, [assignedDeveloperBugs, hasDeveloperView, searchScopedBugs])

  const filteredBugs = workflowScopedBugs.filter((bug) => statusFilter === 'all' || bug.status === statusFilter)

  const flowColumns: Array<{ key: Bug['status']; label: string; tone: string; accent: string }> = [
    { key: 'open', label: 'Open', tone: 'bg-red-50/80 dark:bg-red-950/20', accent: 'bg-red-500' },
    { key: 'in-progress', label: 'In Progress', tone: 'bg-blue-50/80 dark:bg-blue-950/20', accent: 'bg-blue-500' },
    { key: 'resolved', label: 'Resolved', tone: 'bg-emerald-50/80 dark:bg-emerald-950/20', accent: 'bg-emerald-500' },
    { key: 'closed', label: 'Closed', tone: 'bg-slate-100/80 dark:bg-slate-900/50', accent: 'bg-slate-500' },
  ]

  const flowSummary = useMemo(() => {
    const total = searchScopedBugs.length
    const unassigned = searchScopedBugs.filter((bug) => !bug.assignedTo).length
    const critical = searchScopedBugs.filter((bug) => bug.priority === 'critical').length
    const active = searchScopedBugs.filter((bug) => bug.status === 'open' || bug.status === 'in-progress').length
    return { total, unassigned, critical, active }
  }, [searchScopedBugs])

  const developerSummary = useMemo(() => {
    if (!user?.email) {
      return { assigned: 0, inProgress: 0, readyToVerify: 0, open: 0 }
    }

    const assigned = assignedDeveloperBugs
    return {
      assigned: assigned.length,
      open: assigned.filter((bug) => bug.status === 'open').length,
      inProgress: assigned.filter((bug) => bug.status === 'in-progress').length,
      readyToVerify: assigned.filter((bug) => bug.status === 'resolved').length,
    }
  }, [assignedDeveloperBugs, user?.email])

  const isTesterLoggedBug = useMemo(() => {
    if (!selectedBug) return false
    return allUsers.some((account) => account.email === selectedBug.reportedBy && account.role === 'tester')
  }, [allUsers, selectedBug])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800'
      case 'in-progress':
        return 'bg-blue-100 text-blue-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const onSubmitNewBug = async (data: NewBugFormData) => {
    const result = await api.createBug({
      ...data,
      assignedTo: data.assignedTo === UNASSIGNED_VALUE ? '' : data.assignedTo,
      reportedBy: user?.email || 'unknown@blockbug.dev',
      verificationTesterEmail: user?.role === 'tester'
        ? (user.email || '')
        : (data.verificationTesterEmail === UNASSIGNED_VALUE ? '' : data.verificationTesterEmail),
    }, attachmentFile)
    setBugs(prev => [result.bug, ...prev])
    window.dispatchEvent(new Event('blockbug:notifications-updated'))
    setIsNewBugDialogOpen(false)
    setAttachmentFile(null)
    form.reset({
      title: '',
      description: '',
      priority: defaults.default_bug_priority,
      severity: defaults.default_bug_severity,
      projectId: projects[0]?.id || '',
      assignedTo: '',
      verificationTesterEmail: '',
      stepsToReproduce: '',
      expectedResult: '',
      actualResult: '',
      environment: '',
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600'
      case 'high':
        return 'text-orange-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const getBlockchainActionLabel = (action: string) => {
    switch (action) {
      case 'bug_created':
        return 'Bug created'
      case 'bug_status_changed':
        return 'Status changed'
      case 'bug_verified':
        return 'Bug verified'
      case 'bug_verification_rejected':
        return 'Verification rejected'
      default:
        return action.replace(/_/g, ' ')
    }
  }

  const formatTxHash = (value?: string | null) => {
    if (!value) return 'Not available'
    if (value.length <= 18) return value
    return `${value.slice(0, 10)}...${value.slice(-8)}`
  }

  const getBlockchainEventStatus = (event: BlockchainBugEvent) => {
    if (!event.metadataJson) return null
    try {
      const parsed = JSON.parse(event.metadataJson)
      const value = parsed?.toStatus ?? parsed?.status ?? null
      return typeof value === 'string' ? value : null
    } catch {
      return null
    }
  }

  const updateAssignment = async () => {
    if (!selectedBug || !canAssignBugs) return
    setIsUpdatingAssignment(true)
    try {
      const updatedBug = await api.updateBug(selectedBug.id, {
        assignedTo: assignmentValue || null,
        userEmail: user?.email,
        userName: user?.name,
      })
      setSelectedBug(updatedBug)
      setBugs((prev) => prev.map((bug) => bug.id === updatedBug.id ? updatedBug : bug))
      window.dispatchEvent(new Event('blockbug:notifications-updated'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update assignment')
    } finally {
      setIsUpdatingAssignment(false)
    }
  }

  const updateVerificationTester = async () => {
    if (!selectedBug || !canAssignBugs) return
    setIsUpdatingVerificationTester(true)
    try {
      const updatedBug = await api.updateBug(selectedBug.id, {
        verificationTesterEmail: verificationTesterValue || null,
        userEmail: user?.email,
        userName: user?.name,
      })
      setSelectedBug(updatedBug)
      setBugs((prev) => prev.map((bug) => bug.id === updatedBug.id ? updatedBug : bug))
      window.dispatchEvent(new Event('blockbug:notifications-updated'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update verification tester')
    } finally {
      setIsUpdatingVerificationTester(false)
    }
  }

  const updateStatus = async () => {
    if (!selectedBug || !isDeveloperAssignedToBug) return
    setIsUpdatingStatus(true)
    try {
      const updatedBug = await api.updateBug(selectedBug.id, {
        status: statusValue,
        userEmail: user?.email,
        userName: user?.name,
      })
      setSelectedBug(updatedBug)
      setBugs((prev) => prev.map((bug) => bug.id === updatedBug.id ? updatedBug : bug))
      window.dispatchEvent(new Event('blockbug:notifications-updated'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const submitComment = async () => {
    if (!selectedBug || !newComment.trim()) return
    const comment = await api.createComment(selectedBug.id, {
      comment: newComment,
      userEmail: user?.email || 'unknown@blockbug.dev',
      userName: user?.name || 'Unknown User',
      parentCommentId: replyToCommentId,
    })
    setComments(prev => [comment, ...prev])
    setNewComment('')
    setReplyToCommentId(null)
    window.dispatchEvent(new Event('blockbug:notifications-updated'))
  }

  const verifyResolvedBug = async (nextStatus: Bug['status']) => {
    if (!selectedBug || !isTesterVerificationOwner) return
    setIsUpdatingStatus(true)
    try {
      const updatedBug = await api.updateBug(selectedBug.id, {
        status: nextStatus,
        userEmail: user?.email,
        userName: user?.name,
      })
      setSelectedBug(updatedBug)
      setBugs((prev) => prev.map((bug) => bug.id === updatedBug.id ? updatedBug : bug))
      window.dispatchEvent(new Event('blockbug:notifications-updated'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const moveBugForward = async (nextStatus: Bug['status']) => {
    if (!selectedBug || !canUpdateStatus) return
    setStatusValue(nextStatus)
    setIsUpdatingStatus(true)
    try {
      const updatedBug = await api.updateBug(selectedBug.id, {
        status: nextStatus,
        userEmail: user?.email,
        userName: user?.name,
      })
      setSelectedBug(updatedBug)
      setBugs((prev) => prev.map((bug) => bug.id === updatedBug.id ? updatedBug : bug))
      window.dispatchEvent(new Event('blockbug:notifications-updated'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      {error && (
        <Card className="p-4 border border-destructive text-destructive">{error}</Card>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Bug Reports</h2>
          <p className="text-muted-foreground">
            {hasFlowView
              ? `Monitor backlog, ownership, and movement across ${searchScopedBugs.length} bugs`
              : hasDeveloperView
                ? `Stay focused on the bugs assigned to you and the progress you need to move forward`
                : `Manage & track all reported bugs (${filteredBugs.length})`}
          </p>
        </div>
        {canCreateBug && (
          <Dialog open={isNewBugDialogOpen} onOpenChange={setIsNewBugDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg hover:shadow-xl transition-shadow">
                <Plus className="w-4 h-4" />
                New Bug Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Report New Bug</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitNewBug)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      rules={{ required: 'Bug title is required' }}
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Bug Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Brief description of the bug" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectId"
                      rules={{ required: 'Project is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select project" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      rules={{ required: 'Priority is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low - Minor inconvenience</SelectItem>
                              <SelectItem value="medium">Medium - Affects functionality</SelectItem>
                              <SelectItem value="high">High - Major feature broken</SelectItem>
                              <SelectItem value="critical">Critical - System unusable</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="severity"
                      rules={{ required: 'Severity is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Severity</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select severity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="minor">Minor - Cosmetic issue</SelectItem>
                              <SelectItem value="major">Major - Functional issue</SelectItem>
                              <SelectItem value="critical">Critical - Data loss or security</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {canAssignBugs && (
                      <FormField
                        control={form.control}
                        name="assignedTo"
                        rules={{ required: 'Developer assignment is required' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assign To</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select developer" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {teamMembers.map((member) => (
                                  <SelectItem key={member.id} value={member.email}>
                                    {member.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {canAssignBugs && (
                      <FormField
                        control={form.control}
                        name="verificationTesterEmail"
                        rules={{ required: 'Tester assignment is required' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assign Tester</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select tester" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {testerMembers.map((member) => (
                                  <SelectItem key={member.id} value={member.email}>
                                    {member.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    rules={{ required: 'Bug description is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Detailed description of the bug..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stepsToReproduce"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Steps to Reproduce</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={'1. Go to...\n2. Click on...\n3. Observe...'}
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="expectedResult"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Result</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="What should happen..."
                              className="min-h-[60px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="actualResult"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actual Result</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="What actually happens..."
                              className="min-h-[60px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="environment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Environment</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Production, Testing, or Development"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Attachment (Optional)</label>
                    <Input
                      type="file"
                      accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.csv,.zip,.log"
                      onChange={(event) => setAttachmentFile(event.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground">Supported: images, PDF, text, CSV, ZIP. Max 10 MB.</p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsNewBugDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Submit Bug Report</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters - Only show when no bug is selected */}
      {!selectedBug && (
        <>
          {hasDeveloperView && (
            <Card className="border border-border">
              <div className="px-6 py-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned to Me</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{developerSummary.assigned}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">In Progress</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{developerSummary.inProgress}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ready to Verify</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{developerSummary.readyToVerify}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Open</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{developerSummary.open}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {hasFlowView && (
            <Card className="border border-border">
              <div className="px-6 py-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total in View</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{flowSummary.total}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active Flow</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{flowSummary.active}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unassigned</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{flowSummary.unassigned}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Critical</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{flowSummary.critical}</p>
                    </div>
                  </div>
                  <Tabs value={managerView} onValueChange={(value) => setManagerView(value as 'flow' | 'list')} className="shrink-0">
                    <TabsList className="w-full xl:w-auto">
                      <TabsTrigger value="flow" className="min-w-28">
                        <FolderKanban className="h-4 w-4" />
                        Flow
                      </TabsTrigger>
                      <TabsTrigger value="list" className="min-w-28">
                        <Rows3 className="h-4 w-4" />
                        List
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </Card>
          )}

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div className="relative flex-1 xl:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/60" />
              <Input
                placeholder="Search bugs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-border/80 bg-card text-foreground placeholder:text-muted-foreground pl-10 shadow-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              />
            </div>

            <div className="w-full xl:w-64">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="border-border/80 bg-card text-foreground shadow-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
                  <SelectValue placeholder="Filter by project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(!hasFlowView || managerView === 'list') && (
              <div className="flex flex-wrap gap-2">
                {['all', 'open', 'in-progress', 'resolved', 'closed'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      statusFilter === status
                        ? 'border border-ring bg-card text-foreground shadow-sm ring-[3px] ring-ring/40'
                        : 'border border-border/70 bg-card text-foreground hover:border-ring/70 hover:bg-muted/80'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Bugs List or Detail */}
      {loading ? (
        <Card className="p-8 border border-border text-muted-foreground">Loading bug reports...</Card>
      ) : selectedBug ? (
        <Card className="border border-border/70 bg-card p-8 shadow-sm">
          <button
            onClick={() => setSelectedBug(null)}
            className="mb-6 inline-flex w-fit max-w-fit shrink-0 items-center gap-2 self-start rounded-2xl border border-primary/20 bg-slate-100 px-4 py-2 text-sm font-semibold text-primary shadow-[0_2px_10px_rgba(37,99,235,0.08)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-slate-50 hover:text-primary hover:shadow-[0_6px_18px_rgba(37,99,235,0.12)] dark:bg-slate-900/70 dark:hover:bg-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </button>
          
          <div className="mb-6 rounded-2xl border border-border/70 bg-muted/20 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Developer Workspace</p>
                <h3 className="mt-3 text-3xl font-bold tracking-tight text-foreground">{selectedBug.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">Bug #{selectedBug.id.substring(0, 8)}</p>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-border/70 bg-gradient-to-b from-muted/30 to-muted/15 p-6">
            <div className="mb-5">
              <p className="text-sm font-semibold text-foreground">Current Snapshot</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A quick read on the current stage, urgency, ownership, and timing before you dive into the details.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-background/90 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                <Badge className={`${getStatusColor(selectedBug.status)} capitalize`}>
                  {selectedBug.status}
                </Badge>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/90 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Priority</p>
                <span className={`mt-2 inline-block text-base font-semibold capitalize ${getPriorityColor(selectedBug.priority)}`}>
                  {selectedBug.priority}
                </span>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/90 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Assigned To</p>
                <p className="mt-2 text-sm font-medium text-foreground">{selectedBug.assignedTo || '—'}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/90 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Created</p>
                <p className="mt-2 text-sm font-medium text-foreground">{formatDateWithSettings(selectedBug.createdAt, defaults)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {isTesterVerificationOwner && selectedBug.status === 'resolved' && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Tester Verification</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      The developer marked this as resolved. Verify the fix here, then close it or send it back to in progress.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void verifyResolvedBug('closed')} disabled={isUpdatingStatus}>
                      {isUpdatingStatus ? 'Saving...' : 'Verify Fix & Close'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void verifyResolvedBug('in-progress')} disabled={isUpdatingStatus}>
                      {isUpdatingStatus ? 'Saving...' : 'Send Back to In Progress'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {isDeveloperAssignedToBug && (
              <div className="rounded-lg border border-border bg-primary/5 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Move This Bug Forward</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Update your progress as you work, then mark it resolved when it is ready for tester verification.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedBug.status === 'open' && (
                      <Button type="button" onClick={() => void moveBugForward('in-progress')} disabled={isUpdatingStatus}>
                        {isUpdatingStatus ? 'Saving...' : 'Start Work'}
                      </Button>
                    )}
                    {selectedBug.status === 'in-progress' && (
                      <Button type="button" onClick={() => void moveBugForward('resolved')} disabled={isUpdatingStatus}>
                        {isUpdatingStatus ? 'Saving...' : 'Mark Resolved'}
                      </Button>
                    )}
                    {selectedBug.status === 'resolved' && (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        Waiting for tester verification
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-5">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 shadow-sm">
                <div className="border-b border-border/60 pb-3">
                  <p className="text-sm font-semibold text-foreground">Description</p>
                  <p className="mt-1 text-xs text-muted-foreground">A short overview of the issue before the deeper reproduction notes.</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-foreground whitespace-pre-wrap">
                  {selectedBug.description}
                </p>
              </div>

              {(selectedBug.stepsToReproduce || selectedBug.expectedResult || selectedBug.actualResult || selectedBug.environment || attachments.length > 0) && (
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 shadow-sm">
                  <div className="mb-4 border-b border-border/60 pb-3">
                    <p className="text-sm font-semibold text-foreground">Reproduction & Validation</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      These blocks capture how the issue appears, where it happens, and what outcome we expect after the fix.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedBug.stepsToReproduce && (
                      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                        <p className="text-sm font-semibold text-foreground mb-2">Steps to Reproduce</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{selectedBug.stepsToReproduce}</p>
                      </div>
                    )}
                    {selectedBug.environment && (
                      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                        <p className="text-sm font-semibold text-foreground mb-2">Environment</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{selectedBug.environment}</p>
                      </div>
                    )}
                    {selectedBug.expectedResult && (
                      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                        <p className="text-sm font-semibold text-foreground mb-2">Expected Result</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{selectedBug.expectedResult}</p>
                      </div>
                    )}
                    {selectedBug.actualResult && (
                      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                        <p className="text-sm font-semibold text-foreground mb-2">Actual Result</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{selectedBug.actualResult}</p>
                      </div>
                    )}
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-4 md:col-span-2">
                      <p className="text-sm font-semibold text-foreground mb-2">Attachments</p>
                      {attachments.length > 0 ? (
                        <div className="space-y-2">
                          {attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between rounded-lg border border-border bg-background/80 px-4 py-3 text-sm hover:bg-muted/40"
                            >
                              <span className="font-medium text-foreground">{attachment.originalName}</span>
                              <span className="text-xs text-muted-foreground">{Math.max(1, Math.round(attachment.fileSize / 1024))} KB</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No attachments added.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 shadow-sm">
                <div className="mb-4 border-b border-border/60 pb-3">
                  <p className="text-sm font-semibold text-foreground">Ownership & Routing</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Keep the project and responsibility details separate from the reproduction notes above.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{projectNameById[selectedBug.projectId] || 'Unknown project'}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned To</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{selectedBug.assignedTo || 'Not assigned yet'}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reported By</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{selectedBug.reportedBy}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Verification Tester</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{selectedBug.verificationTesterEmail || 'Not assigned yet'}</p>
                  </div>
                </div>
              </div>
            </div>
            {canAssignBugs && (
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-foreground mb-2">Assign Bug</label>
                    <select
                      value={assignmentValue}
                      onChange={(event) => setAssignmentValue(event.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.email}>
                          {member.name} ({member.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    onClick={updateAssignment}
                    disabled={isUpdatingAssignment || assignmentValue === (selectedBug.assignedTo || '')}
                  >
                    {isUpdatingAssignment ? 'Saving...' : 'Save Assignment'}
                  </Button>
                </div>
                {!isTesterLoggedBug && (
                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-foreground mb-2">Assign Tester for Verification</label>
                      <select
                        value={verificationTesterValue}
                        onChange={(event) => setVerificationTesterValue(event.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Unassigned</option>
                        {testerMembers.map((member) => (
                          <option key={member.id} value={member.email}>
                            {member.name} ({member.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      onClick={updateVerificationTester}
                      disabled={isUpdatingVerificationTester || verificationTesterValue === (selectedBug.verificationTesterEmail || '')}
                    >
                      {isUpdatingVerificationTester ? 'Saving...' : 'Save Tester'}
                    </Button>
                  </div>
                )}
              </div>
            )}
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground mb-3">Blockchain Proof</p>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sync Status</p>
                    <div className="mt-2">
                      <Badge
                        variant="outline"
                        className={selectedBug.blockchainLastSyncStatus === 'synced'
                          ? 'border-emerald-300 text-emerald-700'
                          : selectedBug.blockchainLastSyncStatus === 'failed'
                            ? 'border-red-300 text-red-700'
                            : 'border-border text-muted-foreground'}
                      >
                        {selectedBug.blockchainLastSyncStatus || 'Not synced yet'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latest Tx</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{formatTxHash(selectedBug.blockchainLastTxHash)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bug Chain Id</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {formatTxHash(selectedBug.blockchainBugChainId)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latest Event Id</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {selectedBug.blockchainLastEventId != null ? selectedBug.blockchainLastEventId : 'Not available'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last Synced</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {selectedBug.blockchainLastSyncedAt ? formatDateWithSettings(selectedBug.blockchainLastSyncedAt, defaults, true) : 'Not available'}
                    </p>
                  </div>
                </div>

                {blockchainEvents.length > 0 ? (
                  <div className="space-y-2">
                    {blockchainEvents.map((event) => (
                      <div key={event.id} className="rounded-lg border border-border bg-background px-4 py-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">{getBlockchainActionLabel(event.action)}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{event.createdByEmail || 'system'} • {formatDateWithSettings(event.createdAt, defaults, true)}</span>
                              {getBlockchainEventStatus(event) && (
                                <Badge variant="secondary" className="h-5 rounded-full px-2 text-[11px] capitalize">
                                  {getBlockchainEventStatus(event)?.replace('-', ' ')}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge
                              variant="outline"
                              className={event.syncStatus === 'synced' ? 'border-emerald-300 text-emerald-700' : 'border-red-300 text-red-700'}
                            >
                              {event.syncStatus}
                            </Badge>
                            <span className="text-muted-foreground">event #{event.blockchainEventId ?? '—'}</span>
                            <span className="font-medium text-foreground">{formatTxHash(event.transactionHash)}</span>
                          </div>
                        </div>
                        {event.errorMessage && (
                          <p className="mt-2 text-xs text-red-600">{event.errorMessage}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No blockchain audit events are recorded for this bug yet.</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 shadow-sm">
              <div className="border-b border-border/60 pb-3">
                <p className="text-sm font-semibold text-foreground">Comments ({comments.length})</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use this space to leave implementation notes, follow-ups, and handoff context.
                </p>
              </div>
              <div className="mb-4 space-y-3">
                {replyToCommentId && (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Replying to a comment</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setReplyToCommentId(null)}>
                      Cancel reply
                    </Button>
                  </div>
                )}
                <Textarea
                  placeholder={replyToCommentId ? 'Write your reply...' : 'Add a comment...'}
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                />
                <Button type="button" size="sm" onClick={submitComment}>
                  {replyToCommentId ? 'Post Reply' : 'Add Comment'}
                </Button>
              </div>
              <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                {threadedComments.map((comment) => (
                  <div key={comment.id} className="space-y-3 border-l-2 border-primary pl-4">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{comment.userName}</p>
                          <p className="text-xs text-muted-foreground mb-1">{formatDateWithSettings(comment.createdAt, defaults, true)}</p>
                        </div>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setReplyToCommentId(comment.id)}>
                          Reply
                        </Button>
                      </div>
                      <p className="text-sm text-foreground">{comment.comment}</p>
                    </div>
                    {comment.replies.length > 0 && (
                      <div className="space-y-3 pl-4">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                            <p className="text-sm font-medium text-foreground">{reply.userName}</p>
                            <p className="text-xs text-muted-foreground mb-1">{formatDateWithSettings(reply.createdAt, defaults, true)}</p>
                            <p className="text-sm text-foreground">{reply.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      ) : hasFlowView && managerView === 'flow' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {flowColumns.map((column) => {
            const columnBugs = searchScopedBugs.filter((bug) => bug.status === column.key)
            return (
              <Card key={column.key} className={`border border-border ${column.tone} py-0 gap-0`}>
                <div className="border-b border-border/70 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${column.accent}`} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{column.label}</p>
                        <p className="text-xs text-muted-foreground">{columnBugs.length} bug{columnBugs.length === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="max-h-[64vh] space-y-3 overflow-y-auto px-4 py-4">
                  {columnBugs.map((bug) => (
                    <button
                      key={bug.id}
                      type="button"
                      onClick={() => setSelectedBug(bug)}
                      className="w-full rounded-lg border border-border bg-background px-4 py-4 text-left shadow-sm transition hover:border-primary/40 hover:bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold text-foreground">{bug.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{projectNameById[bug.projectId] || 'Unknown project'}</p>
                        </div>
                        <span className={`shrink-0 text-xs font-semibold capitalize ${getPriorityColor(bug.priority)}`}>
                          {bug.priority}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5" />
                          {bug.assignedTo || 'Unassigned'}
                        </span>
                        <span className="truncate">Logged by {bug.reportedBy}</span>
                        <span>{formatDateWithSettings(bug.createdAt, defaults)}</span>
                      </div>
                    </button>
                  ))}
                  {columnBugs.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border bg-background/60 px-4 py-8 text-center text-sm text-muted-foreground">
                      No bugs in this stage.
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Title</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Priority</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Assigned To</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Logged By</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredBugs.length > 0 ? (
                  filteredBugs.map((bug) => (
                    <tr
                      key={bug.id}
                      onClick={() => setSelectedBug(bug)}
                      className="border-b border-border hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition group"
                    >
                      <td className="px-6 py-4 text-foreground font-medium group-hover:text-primary transition">{bug.title}</td>
                      <td className="px-6 py-4">
                        <Badge className={`${getStatusColor(bug.status)} capitalize`}>
                          {bug.status.replace('-', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold capitalize ${getPriorityColor(bug.priority)}`}>
                          {bug.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{bug.assignedTo || '—'}</td>
                      <td className="px-6 py-4 text-muted-foreground">{bug.reportedBy}</td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">{formatDateWithSettings(bug.createdAt, defaults)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No bugs found. Try adjusting your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

