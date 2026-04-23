'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockBugs, mockProjects, type Bug } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'
import { Plus, Bug, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/lib/auth-context'

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
  const [isNewBugDialogOpen, setIsNewBugDialogOpen] = useState(false)
  const [bugs, setBugs] = useState(mockBugs)
  const { user } = useAuth()

  const form = useForm<NewBugFormData>({
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      severity: 'minor',
      projectId: mockProjects[0]?.id || '',
      stepsToReproduce: '',
      expectedResult: '',
      actualResult: '',
      environment: '',
    },
  })

  const myReportedBugs = bugs.filter(bug => bug.reportedBy === user?.email)

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
        return <Bug className="w-4 h-4 text-gray-500" />
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

  const onSubmitNewBug = (data: NewBugFormData) => {
    const newBug: Bug = {
      id: `bug-${Date.now()}`,
      title: data.title,
      description: data.description,
      status: 'open',
      priority: data.priority,
      severity: data.severity,
      projectId: data.projectId,
      reportedBy: user?.email || 'unknown',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setBugs(prev => [newBug, ...prev])
    setIsNewBugDialogOpen(false)
    form.reset()
  }

  const stats = {
    totalReported: myReportedBugs.length,
    open: myReportedBugs.filter(b => b.status === 'open').length,
    resolved: myReportedBugs.filter(b => b.status === 'resolved' || b.status === 'closed').length,
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
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
                            {mockProjects.map((project) => (
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
                          placeholder="Browser, OS, device, version..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bug className="w-6 h-6 text-blue-600" />
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
              <p className="text-sm text-muted-foreground">Resolved</p>
            </div>
          </div>
        </Card>
      </div>

      {/* My Reported Bugs */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">My Bug Reports</h2>
        <div className="space-y-4">
          {myReportedBugs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bug className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>You haven't reported any bugs yet.</p>
              <p className="text-sm">Click "Report New Bug" to get started!</p>
            </div>
          ) : (
            myReportedBugs.map((bug) => (
              <div key={bug.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition">
                <div className="flex items-center gap-4">
                  {getStatusIcon(bug.status)}
                  <div>
                    <h3 className="font-medium">{bug.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={getPriorityColor(bug.priority)}>
                        {bug.priority}
                      </Badge>
                      <Badge variant="outline">
                        {bug.severity}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {bug.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="capitalize">
                    {bug.status.replace('-', ' ')}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}