'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, Trash2, Edit2, Plus, Users, Mail } from 'lucide-react'

export function TeamPage() {
  const teamMembers = [
    { id: 1, name: 'Sarah Chen', email: 'sarah@blockbug.com', role: 'admin', status: 'active', avatar: 'S' },
    { id: 2, name: 'Mike Johnson', email: 'mike@blockbug.com', role: 'manager', status: 'active', avatar: 'M' },
    { id: 3, name: 'Emma Davis', email: 'emma@blockbug.com', role: 'developer', status: 'active', avatar: 'E' },
    { id: 4, name: 'John Smith', email: 'john@blockbug.com', role: 'tester', status: 'inactive', avatar: 'J' },
    { id: 5, name: 'Lisa Anderson', email: 'lisa@blockbug.com', role: 'developer', status: 'active', avatar: 'L' },
  ]

  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-800',
    manager: 'bg-blue-100 text-blue-800',
    developer: 'bg-purple-100 text-purple-800',
    tester: 'bg-green-100 text-green-800',
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Team Members</h2>
          <p className="text-muted-foreground">Manage your team and assign roles</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Invite Member
        </Button>
      </div>

      <Card className="border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Role</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.id} className="border-b border-border hover:bg-muted/50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
                        {member.avatar}
                      </div>
                      <span className="font-medium text-foreground">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-sm">{member.email}</td>
                  <td className="px-6 py-4">
                    <Badge className={`${roleColors[member.role]} capitalize`}>
                      {member.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-2 text-sm font-medium ${
                      member.status === 'active' ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        member.status === 'active' ? 'bg-green-600' : 'bg-gray-600'
                      }`} />
                      {member.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-muted rounded transition">
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-2 hover:bg-red-500/10 rounded transition">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Total Members</p>
              <p className="text-2xl font-bold text-foreground">{teamMembers.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 text-green-600 flex items-center justify-center font-bold">✓</div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Active</p>
              <p className="text-2xl font-bold text-foreground">{teamMembers.filter(m => m.status === 'active').length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Admins</p>
              <p className="text-2xl font-bold text-foreground">{teamMembers.filter(m => m.role === 'admin').length}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
