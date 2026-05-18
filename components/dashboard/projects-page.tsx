'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { api, getProjectStats, type Bug, type Project } from '@/lib/api'
import { formatDateWithSettings, useSystemSettings } from '@/lib/system-settings-context'
import { useAuth } from '@/lib/auth-context'
import { Users, FolderOpen, AlertCircle, Trash2, ArrowLeft, Clock3, CheckCircle2, CircleDot, Layers3 } from 'lucide-react'

interface ProjectsPageProps {
  initialSelectedProjectId?: string | null
  onNotificationTargetHandled?: () => void
}

export function ProjectsPage({ initialSelectedProjectId, onNotificationTargetHandled }: ProjectsPageProps) {
  const { settings } = useSystemSettings()
  const { user } = useAuth()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [bugs, setBugs] = useState<Bug[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [newProject, setNewProject] = useState({ name: '', description: '', key: '' })
  const isAdmin = user?.role === 'admin'
  const showAssignedToYou = user?.role === 'developer' || user?.role === 'tester'

  useEffect(() => {
    Promise.all([api.getProjects(), api.getBugs()])
      .then(([projectsData, bugsData]) => {
        setProjects(projectsData)
        setBugs(bugsData)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load projects'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!initialSelectedProjectId || projects.length === 0) return
    const matchingProject = projects.find((project) => project.id === initialSelectedProjectId)
    if (matchingProject) {
      setSelectedProject(matchingProject)
      onNotificationTargetHandled?.()
    }
  }, [initialSelectedProjectId, onNotificationTargetHandled, projects])

  const createProject = async (event: React.FormEvent) => {
    event.preventDefault()
    const project = await api.createProject({ ...newProject, actorRole: user?.role })
    setProjects((prev) => [project, ...prev])
    setNewProject({ name: '', description: '', key: '' })
    setIsDialogOpen(false)
  }

  const deleteProject = async (project: Project) => {
    setError('')
    setDeletingProjectId(project.id)
    try {
      await api.deleteProject(project.id, user?.role)
      setProjects((prev) => prev.filter((item) => item.id !== project.id))
      setBugs((prev) => prev.filter((bug) => bug.projectId !== project.id))
      if (selectedProject?.id === project.id) {
        setSelectedProject(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete project')
    } finally {
      setDeletingProjectId(null)
    }
  }

  const selectedProjectBugs = useMemo(() => {
    if (!selectedProject) return []
    return bugs.filter((bug) => bug.projectId === selectedProject.id)
  }, [bugs, selectedProject])

  const assignedToYouBugs = useMemo(() => {
    if (!selectedProject || !user?.email) return []
    return selectedProjectBugs.filter((bug) => bug.assignedTo === user.email)
  }, [selectedProject, selectedProjectBugs, user?.email])

  const stageMeta: Array<{ key: Bug['status']; label: string; icon: typeof CircleDot; tone: string }> = [
    { key: 'open', label: 'Open', icon: CircleDot, tone: 'text-red-500' },
    { key: 'in-progress', label: 'In Progress', icon: Clock3, tone: 'text-blue-500' },
    { key: 'resolved', label: 'Resolved', icon: CheckCircle2, tone: 'text-emerald-500' },
    { key: 'closed', label: 'Closed', icon: Layers3, tone: 'text-slate-500' },
  ]

  const selectedProjectStats = useMemo(() => {
    const total = selectedProjectBugs.length
    const open = selectedProjectBugs.filter((bug) => bug.status === 'open').length
    const inProgress = selectedProjectBugs.filter((bug) => bug.status === 'in-progress').length
    const resolved = selectedProjectBugs.filter((bug) => bug.status === 'resolved').length
    const closed = selectedProjectBugs.filter((bug) => bug.status === 'closed').length
    const critical = selectedProjectBugs.filter((bug) => bug.priority === 'critical').length
    return { total, open, inProgress, resolved, closed, critical }
  }, [selectedProjectBugs])

  const assignedToYouStats = useMemo(() => {
    const total = assignedToYouBugs.length
    const open = assignedToYouBugs.filter((bug) => bug.status === 'open').length
    const inProgress = assignedToYouBugs.filter((bug) => bug.status === 'in-progress').length
    const resolved = assignedToYouBugs.filter((bug) => bug.status === 'resolved').length
    const closed = assignedToYouBugs.filter((bug) => bug.status === 'closed').length
    return { total, open, inProgress, resolved, closed }
  }, [assignedToYouBugs])

  return (
    <div className="p-8 space-y-6">
      {error && (
        <Card className="p-4 border border-destructive text-destructive">{error}</Card>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Projects</h2>
          <p className="text-muted-foreground">Manage your projects and view their bugs</p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">+ New Project</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={createProject} className="space-y-4">
                <Input
                  placeholder="Project name"
                  value={newProject.name}
                  onChange={(event) => setNewProject({ ...newProject, name: event.target.value })}
                  required
                />
                <Input
                  placeholder="Project key"
                  value={newProject.key}
                  onChange={(event) => setNewProject({ ...newProject, key: event.target.value })}
                  required
                />
                <Textarea
                  placeholder="Project description"
                  value={newProject.description}
                  onChange={(event) => setNewProject({ ...newProject, description: event.target.value })}
                  required
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Create Project</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {selectedProject ? (
        <Card className="border border-border/70 bg-card p-8 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setSelectedProject(null)}
              className="group inline-flex items-center gap-2.5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/12 via-primary/8 to-accent/12 px-4 py-2.5 text-sm font-semibold text-primary shadow-sm ring-1 ring-primary/8 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:from-primary/18 hover:via-primary/12 hover:to-accent/18 hover:shadow-md hover:ring-primary/15"
            >
              ← Back to Projects
            </button>
            {isAdmin && (
              <Button
                variant="outline"
                className="border-red-500/30 text-red-600 hover:bg-red-500/10"
                onClick={() => void deleteProject(selectedProject)}
                disabled={deletingProjectId === selectedProject.id}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deletingProjectId === selectedProject.id ? 'Deleting...' : 'Delete Project'}
              </Button>
            )}
          </div>

          <div className="mb-6 rounded-2xl border border-border/70 bg-muted/10 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Project Workspace</p>
            <h3 className="mt-3 text-3xl font-bold tracking-tight text-foreground">{selectedProject.name}</h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{selectedProject.description}</p>
          </div>

          <div className="mb-6 rounded-2xl border border-border/70 bg-gradient-to-b from-muted/30 to-muted/15 p-6">
            <div className="mb-5">
              <p className="text-sm font-semibold text-foreground">Project Snapshot</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Key project information and the current workload shape at a glance.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
              <div className="rounded-xl border border-border/70 bg-background/90 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total Bugs</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{selectedProjectStats.total}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/90 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Critical Bugs</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{selectedProjectStats.critical}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/90 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Team Size</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{selectedProject.teamSize}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/90 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Project Key</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{selectedProject.key}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/90 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Created</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{formatDateWithSettings(selectedProject.createdAt, settings)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 shadow-sm">
              <div className="mb-4 border-b border-border/60 pb-3">
                <p className="text-sm font-semibold text-foreground">Total Bug Stages</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  See how the project backlog is distributed across the full bug lifecycle.
                </p>
              </div>
              <div className="mb-4 rounded-xl border border-border/70 bg-background/90 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Project Total Bugs</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{selectedProjectStats.total}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {stageMeta.map((stage) => {
                  const Icon = stage.icon
                  const value = selectedProjectStats[stage.key === 'in-progress' ? 'inProgress' : stage.key]
                  return (
                    <div key={stage.key} className="rounded-xl border border-border/70 bg-background/90 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stage.label}</p>
                          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
                        </div>
                        <Icon className={`h-5 w-5 ${stage.tone}`} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {showAssignedToYou && (
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 shadow-sm">
                <div className="mb-4 border-b border-border/60 pb-3">
                  <p className="text-sm font-semibold text-foreground">Assigned to You</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your personal slice of this project, broken down by the same workflow stages.
                  </p>
                </div>
                <div className="mb-4 rounded-xl border border-border/70 bg-background/90 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your Total Assigned Bugs</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{assignedToYouStats.total}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {stageMeta.map((stage) => {
                    const Icon = stage.icon
                    const value = assignedToYouStats[stage.key === 'in-progress' ? 'inProgress' : stage.key]
                    return (
                      <div key={stage.key} className="rounded-xl border border-border/70 bg-background/90 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stage.label}</p>
                            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
                          </div>
                          <Icon className={`h-5 w-5 ${stage.tone}`} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>
      ) : loading ? (
        <Card className="p-8 border border-border text-muted-foreground">Loading projects...</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const stats = getProjectStats(project.id, bugs)
            return (
              <Card
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className="cursor-pointer border border-border/70 bg-card p-6 shadow-sm transition hover:border-primary/40 hover:bg-muted/10 hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <FolderOpen className="w-6 h-6 text-primary" />
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">
                    {project.status}
                  </span>
                </div>

                <h3 className="mb-2 text-lg font-semibold text-foreground">{project.name}</h3>
                <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
                    <span className="text-muted-foreground">Team Size</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Users className="w-4 h-4" /> {project.teamSize}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
                    <span className="text-muted-foreground">Total Bugs</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {stats.total}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bug Stages</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-background/90 px-2 py-2 text-center">
                        <p className="text-muted-foreground">Open</p>
                        <p className="mt-1 font-semibold text-foreground">{stats.open}</p>
                      </div>
                      <div className="rounded-lg bg-background/90 px-2 py-2 text-center">
                        <p className="text-muted-foreground">In Progress</p>
                        <p className="mt-1 font-semibold text-foreground">{stats.inProgress}</p>
                      </div>
                      <div className="rounded-lg bg-background/90 px-2 py-2 text-center">
                        <p className="text-muted-foreground">Resolved</p>
                        <p className="mt-1 font-semibold text-foreground">{stats.resolved}</p>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-red-500/30 text-red-600 hover:bg-red-500/10"
                        onClick={(event) => {
                          event.stopPropagation()
                          void deleteProject(project)
                        }}
                        disabled={deletingProjectId === project.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deletingProjectId === project.id ? 'Deleting...' : 'Delete Project'}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
