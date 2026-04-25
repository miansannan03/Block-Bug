'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api, type Bug, type Comment, type Project, type SystemSettings } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { formatDateWithSettings } from '@/lib/system-settings-context'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, X, ArrowLeft, AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useForm } from 'react-hook-form'

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

export function BugsList({ initialSelectedBugId, onNotificationTargetHandled }: BugsListProps) {
  const { user } = useAuth()
  const bugDefaults: Pick<SystemSettings, 'default_bug_priority' | 'default_bug_severity'> = {
    default_bug_priority: 'medium',
    default_bug_severity: 'major',
  }
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isNewBugDialogOpen, setIsNewBugDialogOpen] = useState(false)
  const [bugs, setBugs] = useState<Bug[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [defaults, setDefaults] = useState(bugDefaults)

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
    Promise.all([api.getBugs(), api.getProjects(), api.getSystemSettings().catch(() => ({ settings: bugDefaults as Partial<SystemSettings> }))])
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
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load bugs'))
      .finally(() => setLoading(false))
  }, [form])

  useEffect(() => {
    if (!selectedBug) {
      setComments([])
      return
    }
    api.getComments(selectedBug.id).then(setComments).catch(() => setComments([]))
  }, [selectedBug])

  useEffect(() => {
    if (!initialSelectedBugId || bugs.length === 0) return
    const matchingBug = bugs.find((bug) => bug.id === initialSelectedBugId)
    if (matchingBug) {
      setSelectedBug(matchingBug)
      onNotificationTargetHandled?.()
    }
  }, [bugs, initialSelectedBugId, onNotificationTargetHandled])

  const filteredBugs = bugs.filter((bug) => {
    const matchesSearch = bug.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || bug.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
    const newBug = await api.createBug({
      ...data,
      reportedBy: user?.email || 'unknown@blockbug.dev',
    })
    setBugs(prev => [newBug, ...prev])
    window.dispatchEvent(new Event('blockbug:notifications-updated'))
    setIsNewBugDialogOpen(false)
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

  const closeSelectedBug = async () => {
    if (!selectedBug) return
    const updatedBug = await api.updateBug(selectedBug.id, {
      status: 'closed',
      userEmail: user?.email,
      userName: user?.name,
    })
    setSelectedBug(updatedBug)
    setBugs(prev => prev.map(bug => bug.id === updatedBug.id ? updatedBug : bug))
    window.dispatchEvent(new Event('blockbug:notifications-updated'))
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
          <p className="text-muted-foreground">Manage & track all reported bugs ({filteredBugs.length})</p>
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
                      <FormControl>
                        <Input placeholder="Enter assignee email..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search bugs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
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
        </div>
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
            <Button variant="outline" size="sm" className="gap-2" onClick={closeSelectedBug}>
              <X className="w-4 h-4" />
              Close
            </Button>
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
