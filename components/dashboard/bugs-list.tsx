'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api, type Bug, type BugAttachment, type Comment, type Project, type SystemSettings, type User } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { formatDateWithSettings } from '@/lib/system-settings-context'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, ArrowLeft, AlertCircle, Clock, CheckCircle2, FolderKanban, Rows3, UserRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useForm } from 'react-hook-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface NewBugFormData {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  severity: 'minor' | 'major' | 'critical'
  projectId: string
  assignedTo?: string
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
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [attachments, setAttachments] = useState<BugAttachment[]>([])
  const [newComment, setNewComment] = useState('')
  const [defaults, setDefaults] = useState(bugDefaults)
  const [assignmentValue, setAssignmentValue] = useState('')
  const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const canAssignBugs = user?.role === 'manager' || user?.role === 'admin'
  const hasFlowView = user?.role === 'manager'

  const form = useForm<NewBugFormData>({
    defaultValues: {
      title: '',
      description: '',
      priority: bugDefaults.default_bug_priority,
      severity: bugDefaults.default_bug_severity,
      projectId: '',
      assignedTo: '',
    },
  })

  useEffect(() => {
    Promise.all([api.getBugs(), api.getProjects(), api.getUsers(), api.getSystemSettings().catch(() => ({ settings: bugDefaults as Partial<SystemSettings> }))])
      .then(([bugsData, projectsData, usersData, settingsData]) => {
        setBugs(bugsData)
        setProjects(projectsData)
        setTeamMembers(usersData.filter((member) => member.status === 'active' && member.role === 'developer'))
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
  }, [form])

  useEffect(() => {
    if (!selectedBug) {
      setComments([])
      setAttachments([])
      setAssignmentValue('')
      return
    }
    setAssignmentValue(selectedBug.assignedTo || '')
    api.getComments(selectedBug.id).then(setComments).catch(() => setComments([]))
    api.getBugAttachments(selectedBug.id).then(setAttachments).catch(() => setAttachments([]))
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

  const projectScopedBugs = bugs.filter((bug) => {
    const matchesSearch = bug.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProject = projectFilter === 'all' || bug.projectId === projectFilter
    return matchesSearch && matchesProject
  })

  const filteredBugs = projectScopedBugs.filter((bug) => statusFilter === 'all' || bug.status === statusFilter)

  const flowColumns: Array<{ key: Bug['status']; label: string; tone: string; accent: string }> = [
    { key: 'open', label: 'Open', tone: 'bg-red-50/80 dark:bg-red-950/20', accent: 'bg-red-500' },
    { key: 'in-progress', label: 'In Progress', tone: 'bg-blue-50/80 dark:bg-blue-950/20', accent: 'bg-blue-500' },
    { key: 'resolved', label: 'Resolved', tone: 'bg-emerald-50/80 dark:bg-emerald-950/20', accent: 'bg-emerald-500' },
    { key: 'closed', label: 'Closed', tone: 'bg-slate-100/80 dark:bg-slate-900/50', accent: 'bg-slate-500' },
  ]

  const flowSummary = useMemo(() => {
    const total = projectScopedBugs.length
    const unassigned = projectScopedBugs.filter((bug) => !bug.assignedTo).length
    const critical = projectScopedBugs.filter((bug) => bug.priority === 'critical').length
    const active = projectScopedBugs.filter((bug) => bug.status === 'open' || bug.status === 'in-progress').length
    return { total, unassigned, critical, active }
  }, [projectScopedBugs])

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

  const submitComment = async () => {
    if (!selectedBug || !newComment.trim()) return
    const comment = await api.createComment(selectedBug.id, {
      comment: newComment,
      userEmail: user?.email || 'unknown@blockbug.dev',
      userName: user?.name || 'Unknown User',
    })
    setComments(prev => [comment, ...prev])
    setNewComment('')
    window.dispatchEvent(new Event('blockbug:notifications-updated'))
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
              ? `Monitor backlog, ownership, and movement across ${projectScopedBugs.length} bugs`
              : `Manage & track all reported bugs (${filteredBugs.length})`}
          </p>
        </div>
        <Dialog open={isNewBugDialogOpen} onOpenChange={setIsNewBugDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg hover:shadow-xl transition-shadow">
              <Plus className="w-4 h-4" />
              New Bug Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Bug Report</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitNewBug)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  rules={{ required: 'Title is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter bug title..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  rules={{ required: 'Description is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the bug in detail..."
                          className="min-h-[100px]"
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
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
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
                            <SelectItem value="minor">Minor</SelectItem>
                            <SelectItem value="major">Major</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || UNASSIGNED_VALUE}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select developer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
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

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Attachment (Optional)</label>
                  <Input
                    type="file"
                    accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.csv,.zip,.log"
                    onChange={(event) => setAttachmentFile(event.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">Supported: images, PDF, text, CSV, ZIP. Max 10 MB.</p>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewBugDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create Bug Report</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters - Only show when no bug is selected */}
      {!selectedBug && (
        <>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search bugs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="w-full xl:w-64">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
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
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground hover:bg-muted/80'
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
        <Card className="p-8 border border-border">
          <button
            onClick={() => setSelectedBug(null)}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition mb-6 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </button>
          
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-3xl font-bold text-foreground">{selectedBug.title}</h3>
              <p className="text-muted-foreground mt-1">Bug #{selectedBug.id.substring(0, 8)}</p>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-6 mb-6 border border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2 font-semibold">Status</p>
                <Badge className={`${getStatusColor(selectedBug.status)} capitalize`}>
                  {selectedBug.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2 font-semibold">Priority</p>
                <span className={`font-bold capitalize ${getPriorityColor(selectedBug.priority)}`}>
                  {selectedBug.priority}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2 font-semibold">Assigned To</p>
                <p className="text-foreground font-medium">{selectedBug.assignedTo || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2 font-semibold">Created</p>
                <p className="text-foreground font-medium">{formatDateWithSettings(selectedBug.createdAt, defaults)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Description</p>
              <p className="text-foreground leading-relaxed">
                {selectedBug.description}
              </p>
            </div>
            {canAssignBugs && (
              <div className="rounded-lg border border-border bg-muted/20 p-4">
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
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Attachments</p>
              {attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm hover:bg-muted/40"
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
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Comments ({comments.length})</p>
              <div className="mb-4 space-y-3">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                />
                <Button type="button" size="sm" onClick={submitComment}>Add Comment</Button>
              </div>
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="border-l-2 border-primary pl-4">
                    <p className="text-sm font-medium text-foreground">{comment.userName}</p>
                    <p className="text-xs text-muted-foreground mb-1">{formatDateWithSettings(comment.createdAt, defaults, true)}</p>
                    <p className="text-sm text-foreground">{comment.comment}</p>
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
            const columnBugs = projectScopedBugs.filter((bug) => bug.status === column.key)
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
                      <td className="px-6 py-4 text-muted-foreground text-sm">{formatDateWithSettings(bug.createdAt, defaults)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
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
