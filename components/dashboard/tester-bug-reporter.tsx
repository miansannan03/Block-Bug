'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api, type BlockchainBugEvent, type Bug, type Project, type SystemSettings } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Plus, Bug as BugIcon, CheckCircle2, AlertTriangle, XCircle, Clock, RotateCcw, ArrowLeft } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/lib/auth-context'
import { formatDateWithSettings } from '@/lib/system-settings-context'

interface NewBugFormData {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  severity: 'minor' | 'major' | 'critical'
  projectId: string
  stepsToReproduce?: string
  expectedResult?: string
  actualResult?: string
  environment?: string
}

export function TesterBugReporter() {
  const bugDefaults: Pick<SystemSettings, 'default_bug_priority' | 'default_bug_severity'> = {
    default_bug_priority: 'medium',
    default_bug_severity: 'major',
  }
  const [isNewBugDialogOpen, setIsNewBugDialogOpen] = useState(false)
  const [bugs, setBugs] = useState<Bug[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [defaults, setDefaults] = useState(bugDefaults)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [updatingBugId, setUpdatingBugId] = useState<string | null>(null)
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null)
  const [blockchainEvents, setBlockchainEvents] = useState<BlockchainBugEvent[]>([])
  const { user } = useAuth()

  const form = useForm<NewBugFormData>({
    defaultValues: {
      title: '',
      description: '',
      priority: bugDefaults.default_bug_priority,
      severity: bugDefaults.default_bug_severity,
      projectId: '',
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
      api.getSystemSettings().catch(() => ({ settings: bugDefaults as Partial<SystemSettings> })),
    ])
      .then(([bugsData, projectsData, settingsData]) => {
        setBugs(bugsData)
        setProjects(projectsData)
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
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your bug reports'))
      .finally(() => setLoading(false))
  }, [form, user?.email])

  useEffect(() => {
    if (!selectedBug) {
      setBlockchainEvents([])
      return
    }

    api.getBugBlockchainEvents(selectedBug.id).then(setBlockchainEvents).catch(() => setBlockchainEvents([]))
  }, [selectedBug])

  const testerVisibleBugs = bugs.filter((bug) => bug.reportedBy === user?.email || bug.verificationTesterEmail === user?.email)
  const myReportedBugs = testerVisibleBugs.filter(bug => bug.reportedBy === user?.email)
  const pendingVerificationBugs = testerVisibleBugs.filter((bug) => bug.status === 'resolved' && bug.verificationTesterEmail === user?.email)
  const activeReportedBugs = testerVisibleBugs.filter((bug) => !(bug.status === 'resolved' && bug.verificationTesterEmail === user?.email))
  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.id, project.name])),
    [projects],
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-500" />
      case 'resolved':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'closed':
        return <XCircle className="w-4 h-4 text-gray-500" />
      default:
        return <BugIcon className="w-4 h-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const onSubmitNewBug = async (data: NewBugFormData) => {
    const result = await api.createBug({
      ...data,
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
      stepsToReproduce: '',
      expectedResult: '',
      actualResult: '',
      environment: '',
    })
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

  const stats = {
    totalReported: testerVisibleBugs.length,
    open: testerVisibleBugs.filter(b => b.status === 'open').length,
    resolved: pendingVerificationBugs.length,
    closed: testerVisibleBugs.filter(b => b.status === 'closed').length,
  }

  const updateReportedBugStatus = async (bug: Bug, status: Bug['status']) => {
    setUpdatingBugId(bug.id)
    setError('')
    try {
      const updatedBug = await api.updateBug(bug.id, {
        status,
        userEmail: user?.email,
        userName: user?.name,
      })
      setBugs((prev) => prev.map((item) => item.id === updatedBug.id ? updatedBug : item))
      setSelectedBug((prev) => prev?.id === updatedBug.id ? updatedBug : prev)
      window.dispatchEvent(new Event('blockbug:notifications-updated'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update bug status')
    } finally {
      setUpdatingBugId(null)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {error && (
        <Card className="p-4 border border-destructive text-destructive">{error}</Card>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bug Reporter</h1>
          <p className="text-muted-foreground mt-1">Report and track bugs you've discovered</p>
        </div>
        <Dialog open={isNewBugDialogOpen} onOpenChange={setIsNewBugDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Report New Bug
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
                          placeholder="1. Go to...&#10;2. Click on...&#10;3. Observe..."
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BugIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalReported}</p>
              <p className="text-sm text-muted-foreground">Bugs Reported</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.open}</p>
              <p className="text-sm text-muted-foreground">Open Bugs</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.resolved}</p>
              <p className="text-sm text-muted-foreground">Waiting for Verification</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <XCircle className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.closed}</p>
              <p className="text-sm text-muted-foreground">Verified & Closed</p>
            </div>
          </div>
        </Card>
      </div>

      {selectedBug ? (
        <Card className="border border-border/70 bg-card p-8 shadow-sm">
          <button
            onClick={() => setSelectedBug(null)}
            className="mb-6 inline-flex w-fit max-w-fit shrink-0 items-center gap-2 self-start rounded-2xl border border-primary/20 bg-slate-100 px-4 py-2 text-sm font-semibold text-primary shadow-[0_2px_10px_rgba(37,99,235,0.08)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-slate-50 hover:text-primary hover:shadow-[0_6px_18px_rgba(37,99,235,0.12)] dark:bg-slate-900/70 dark:hover:bg-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Reports
          </button>

          <div className="mb-6 rounded-2xl border border-border/70 bg-muted/10 px-6 py-5">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tester Workspace</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">{selectedBug.title}</h2>
                <Badge variant="outline" className="capitalize">{selectedBug.status.replace('-', ' ')}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Bug #{selectedBug.id.substring(0, 8)}</p>
            </div>

            {selectedBug.status === 'resolved' ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <p className="text-sm font-semibold text-foreground">Tester Verification</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Confirm the fix here. Close it if it is fixed, or return it to the developer if more work is needed.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => void updateReportedBugStatus(selectedBug, 'closed')}
                    disabled={updatingBugId === selectedBug.id}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {updatingBugId === selectedBug.id ? 'Saving...' : 'Verify Fix & Close'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void updateReportedBugStatus(selectedBug, 'in-progress')}
                    disabled={updatingBugId === selectedBug.id}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Send Back to In Progress
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Current Flow</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedBug.status === 'closed'
                    ? 'This bug has already been verified and closed.'
                    : selectedBug.status === 'in-progress'
                      ? 'A developer is actively working on this report.'
                      : 'This report is waiting for the assigned developer to move it forward.'}
                </p>
              </div>
            )}
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-border/70 bg-gradient-to-b from-muted/30 to-muted/15 p-6">
            <div className="mb-5">
              <p className="text-sm font-semibold text-foreground">Current Snapshot</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A quick read on the current stage, severity, ownership, and reporting context before reviewing the full bug details.
              </p>
            </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-border/70 bg-background/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project</p>
              <p className="mt-2 text-sm font-medium text-foreground">{projectNameById[selectedBug.projectId] || 'Unknown project'}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned To</p>
              <p className="mt-2 text-sm font-medium text-foreground">{selectedBug.assignedTo || 'Not assigned yet'}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logged By</p>
              <p className="mt-2 text-sm font-medium text-foreground">{selectedBug.reportedBy}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority</p>
              <p className="mt-2 text-sm font-medium text-foreground capitalize">{selectedBug.priority}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Severity</p>
              <p className="mt-2 text-sm font-medium text-foreground capitalize">{selectedBug.severity}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/90 p-4 md:col-span-2 xl:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created</p>
              <p className="mt-2 text-sm font-medium text-foreground">{formatDateWithSettings(selectedBug.createdAt, defaults)}</p>
            </div>
          </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 shadow-sm">
              <div className="border-b border-border/60 pb-3">
                <p className="text-sm font-semibold text-foreground">Description</p>
                <p className="mt-1 text-xs text-muted-foreground">A short overview of the issue before the deeper reproduction notes.</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-foreground whitespace-pre-wrap">{selectedBug.description}</p>
            </div>

            {(selectedBug.stepsToReproduce || selectedBug.expectedResult || selectedBug.actualResult || selectedBug.environment) && (
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 shadow-sm">
                <div className="mb-4 border-b border-border/60 pb-3">
                  <p className="text-sm font-semibold text-foreground">Reproduction & Validation</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    These blocks capture how the issue appears, where it happens, and what outcome we expect after the fix.
                  </p>
                </div>
              <div className="grid gap-4 md:grid-cols-2">
                {selectedBug.stepsToReproduce && (
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-5">
                    <p className="text-sm font-semibold text-foreground mb-2">Steps to Reproduce</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{selectedBug.stepsToReproduce}</p>
                  </div>
                )}
                {selectedBug.environment && (
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-5">
                    <p className="text-sm font-semibold text-foreground mb-2">Environment</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{selectedBug.environment}</p>
                  </div>
                )}
                {selectedBug.expectedResult && (
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-5">
                    <p className="text-sm font-semibold text-foreground mb-2">Expected Result</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{selectedBug.expectedResult}</p>
                  </div>
                )}
                {selectedBug.actualResult && (
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-5">
                    <p className="text-sm font-semibold text-foreground mb-2">Actual Result</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{selectedBug.actualResult}</p>
                  </div>
                )}
              </div>
              </div>
            )}

            <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 shadow-sm">
              <div className="border-b border-border/60 pb-3">
                <p className="text-sm font-semibold text-foreground">Ownership & Routing</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Keep the project and assignment details separate from the reproduction notes above.
                </p>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{projectNameById[selectedBug.projectId] || 'Unknown project'}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned To</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{selectedBug.assignedTo || 'Not assigned yet'}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logged By</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{selectedBug.reportedBy}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Verification Tester</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{selectedBug.verificationTesterEmail || 'Not assigned yet'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground mb-3">Blockchain Proof</p>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
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
                  <p className="mt-2 text-sm font-medium text-foreground">{formatTxHash(selectedBug.blockchainBugChainId)}</p>
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

              <div className="mt-4 space-y-2">
                {blockchainEvents.length > 0 ? blockchainEvents.map((event) => (
                  <div key={event.id} className="rounded-lg border border-border bg-muted/10 px-4 py-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{getBlockchainActionLabel(event.action)}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{event.createdByEmail || 'system'} â€¢ {formatDateWithSettings(event.createdAt, defaults, true)}</span>
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
                        <span className="text-muted-foreground">event #{event.blockchainEventId ?? 'â€”'}</span>
                        <span className="font-medium text-foreground">{formatTxHash(event.transactionHash)}</span>
                      </div>
                    </div>
                    {event.errorMessage && (
                      <p className="mt-2 text-xs text-red-600">{event.errorMessage}</p>
                    )}
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No blockchain audit events are recorded for this bug yet.</p>
                )}
              </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
      <>
      <Card className="p-6 border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Pending Verification</h2>
            <p className="text-sm text-muted-foreground mt-1">
              These resolved bugs are waiting for you to confirm the fix and either close them or send them back.
            </p>
          </div>
          <Badge variant="outline" className="border-emerald-300 bg-background/80 text-emerald-700">
            {pendingVerificationBugs.length} waiting
          </Badge>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading pending verification...</div>
        ) : pendingVerificationBugs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-emerald-300/70 bg-background/60 px-4 py-8 text-center text-sm text-muted-foreground">
            No resolved bugs are waiting for verification right now.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingVerificationBugs.map((bug) => (
              <div
                key={bug.id}
                className="rounded-lg border border-emerald-200 bg-background p-4 dark:border-emerald-900/30"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <button
                      type="button"
                      onClick={() => setSelectedBug(bug)}
                      className="w-full rounded-md p-1 text-left transition hover:bg-muted/40"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-foreground">{bug.title}</h3>
                        <Badge variant="outline" className={getPriorityColor(bug.priority)}>
                          {bug.priority}
                        </Badge>
                        <Badge variant="outline">{bug.severity}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{bug.description}</p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Reported on {formatDateWithSettings(bug.createdAt, defaults)}
                      </p>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => void updateReportedBugStatus(bug, 'closed')}
                      disabled={updatingBugId === bug.id}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {updatingBugId === bug.id ? 'Saving...' : 'Verify Fix & Close'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void updateReportedBugStatus(bug, 'in-progress')}
                      disabled={updatingBugId === bug.id}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Send Back to In Progress
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* My Reported Bugs */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">My Bug Reports</h2>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading your reports...</div>
          ) : myReportedBugs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BugIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>You haven't reported any bugs yet.</p>
              <p className="text-sm">Click "Report New Bug" to get started!</p>
            </div>
          ) : activeReportedBugs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              All of your current resolved bugs are shown above in Pending Verification.
            </div>
          ) : (
            activeReportedBugs.map((bug) => (
              <button
                key={bug.id}
                type="button"
                onClick={() => setSelectedBug(bug)}
                className="w-full rounded-lg border border-border p-4 text-left transition hover:bg-muted/50"
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5">{getStatusIcon(bug.status)}</div>
                    <div>
                      <h3 className="font-medium">{bug.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className={getPriorityColor(bug.priority)}>
                          {bug.priority}
                        </Badge>
                        <Badge variant="outline">
                          {bug.severity}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {bug.status.replace('-', ' ')}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDateWithSettings(bug.createdAt, defaults)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{bug.description}</p>
                    </div>
                  </div>

                  {bug.status === 'resolved' ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                      <p className="text-sm font-semibold text-foreground">Tester Verification</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Confirm the fix, then close it. If it still fails, send it back to the developer.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => void updateReportedBugStatus(bug, 'closed')}
                          disabled={updatingBugId === bug.id}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {updatingBugId === bug.id ? 'Saving...' : 'Verify Fix & Close'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void updateReportedBugStatus(bug, 'in-progress')}
                          disabled={updatingBugId === bug.id}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Send Back to In Progress
                        </Button>
                      </div>
                    </div>
                  ) : bug.status === 'closed' ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                      <p className="text-sm font-semibold text-foreground">Verification Complete</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        This fix has been verified and closed by testing.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">Current Flow</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {bug.status === 'open'
                          ? 'This report is waiting for a developer to start work.'
                          : 'A developer is currently working on this bug.'}
                      </p>
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </Card>
      </>
      )}
    </div>
  )
}


