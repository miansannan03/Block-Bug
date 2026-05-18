'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { api, getProjectStats, type Bug, type Project } from '@/lib/api'
import { formatDateWithSettings, useSystemSettings } from '@/lib/system-settings-context'
import { useAuth } from '@/lib/auth-context'
import { Users, FolderOpen, AlertCircle, Trash2 } from 'lucide-react'

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
  const [newProject, setNewProject] = useState({ name: '', description: '', key: '', teamSize: 1 })
  const isAdmin = user?.role === 'admin'

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
    setNewProject({ name: '', description: '', key: '', teamSize: 1 })
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
                <Input
                  type="number"
                  min={1}
                  value={newProject.teamSize}
                  onChange={(event) => setNewProject({ ...newProject, teamSize: Number(event.target.value) })}
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
        <Card className="p-8 border border-border">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setSelectedProject(null)}
              className="text-primary hover:underline text-sm font-medium"
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

          <div className="mb-8">
            <h3 className="text-2xl font-bold text-foreground mb-2">{selectedProject.name}</h3>
            <p className="text-muted-foreground">{selectedProject.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Total Bugs</p>
              <p className="text-2xl font-bold text-foreground">
                {bugs.filter((bug) => bug.projectId === selectedProject.id).length}
              </p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Team Size</p>
              <p className="text-2xl font-bold text-foreground">{selectedProject.teamSize}</p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Project Key</p>
              <p className="text-2xl font-bold text-foreground">{selectedProject.key}</p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Created</p>
              <p className="text-lg font-bold text-foreground">{formatDateWithSettings(selectedProject.createdAt, settings)}</p>
            </div>
          </div>

          <h4 className="text-lg font-semibold mb-4 text-foreground">Bug Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['open', 'in-progress', 'resolved', 'closed'].map((status) => {
              const count = bugs.filter((bug) => bug.projectId === selectedProject.id && bug.status === status).length
              return (
                <Card key={status} className="p-4 border border-border">
                  <p className="text-sm text-muted-foreground capitalize">{status.replace('-', ' ')}</p>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                </Card>
              )
            })}
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
                className="p-6 border border-border hover:border-primary cursor-pointer transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-1 rounded capitalize">
                    {project.status}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2">{project.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{project.description}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Team Size</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Users className="w-4 h-4" /> {project.teamSize}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Bugs</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {stats.total}
                    </span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-border">
                    <div className="flex justify-between text-xs">
                      <span>Open: {stats.open}</span>
                      <span>In Progress: {stats.inProgress}</span>
                      <span>Resolved: {stats.resolved}</span>
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
