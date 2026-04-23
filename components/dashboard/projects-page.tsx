'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockProjects, getProjectStats, mockBugs } from '@/lib/mock-data'
import { Users, FolderOpen, AlertCircle } from 'lucide-react'
import { useState } from 'react'

export function ProjectsPage() {
  const [selectedProject, setSelectedProject] = useState<typeof mockProjects[0] | null>(null)

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Projects</h2>
          <p className="text-muted-foreground">Manage your projects and view their bugs</p>
        </div>
        <Button className="gap-2">+ New Project</Button>
      </div>

      {selectedProject ? (
        <Card className="p-8 border border-border">
          <button
            onClick={() => setSelectedProject(null)}
            className="text-primary hover:underline mb-4 text-sm font-medium"
          >
            ← Back to Projects
          </button>

          <div className="mb-8">
            <h3 className="text-2xl font-bold text-foreground mb-2">{selectedProject.name}</h3>
            <p className="text-muted-foreground">{selectedProject.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Total Bugs</p>
              <p className="text-2xl font-bold text-foreground">
                {mockBugs.filter(b => b.projectId === selectedProject.id).length}
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
              <p className="text-lg font-bold text-foreground">{selectedProject.createdAt.toLocaleDateString()}</p>
            </div>
          </div>

          <h4 className="text-lg font-semibold mb-4 text-foreground">Bug Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['open', 'in-progress', 'resolved', 'closed'].map((status) => {
              const count = mockBugs.filter(b => b.projectId === selectedProject.id && b.status === status).length
              return (
                <Card key={status} className="p-4 border border-border">
                  <p className="text-sm text-muted-foreground capitalize">{status.replace('-', ' ')}</p>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                </Card>
              )
            })}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockProjects.map((project) => {
            const stats = getProjectStats(project.id)
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
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
