'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api, type RoleDefinition, type User, type UserRole } from '@/lib/api'
import { Shield, Users } from 'lucide-react'

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-blue-100 text-blue-800',
  developer: 'bg-purple-100 text-purple-800',
  tester: 'bg-green-100 text-green-800',
}

export function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [roles, setRoles] = useState<Record<UserRole, RoleDefinition> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.getUsers(), api.getRoles()])
      .then(([users, roleDefinitions]) => {
        setTeamMembers(users)
        setRoles(roleDefinitions)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load team'))
  }, [])

  const updateMember = async (member: User, updates: Partial<Pick<User, 'role' | 'status'>>) => {
    const { user } = await api.updateUser(member.id, updates)
    setTeamMembers(prev => prev.map(item => item.id === user.id ? user : item))
  }

  return (
    <div className="p-8 space-y-8">
      {error && <Card className="p-4 border border-destructive text-destructive">{error}</Card>}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Team Members</h2>
          <p className="text-muted-foreground">Manage your team and assign roles</p>
        </div>
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
                        {member.name[0]}
                      </div>
                      <span className="font-medium text-foreground">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-sm">{member.email}</td>
                  <td className="px-6 py-4">
                    <select
                      value={member.role}
                      onChange={(event) => updateMember(member, { role: event.target.value as UserRole })}
                      className="rounded-md border border-border bg-background px-2 py-1 text-sm capitalize"
                    >
                      {['admin', 'manager', 'developer', 'tester'].map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={`${member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} capitalize`}>
                      {member.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateMember(member, { status: member.status === 'active' ? 'inactive' : 'active' })}
                    >
                      {member.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {roles && (Object.entries(roles) as Array<[UserRole, RoleDefinition]>).map(([role, definition]) => (
          <Card key={role} className="p-5 border border-border">
            <Badge className={`${roleColors[role]} capitalize mb-3`}>{definition.label}</Badge>
            <p className="text-sm text-muted-foreground mb-4">{definition.description}</p>
            <div className="space-y-2">
              {definition.permissions.map((permission) => (
                <p key={permission} className="text-sm text-foreground">{permission}</p>
              ))}
            </div>
          </Card>
        ))}
      </div>

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
              <span className="w-6 h-6 text-green-600 flex items-center justify-center font-bold">OK</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Active</p>
              <p className="text-2xl font-bold text-foreground">{teamMembers.filter(member => member.status === 'active').length}</p>
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
              <p className="text-2xl font-bold text-foreground">{teamMembers.filter(member => member.role === 'admin').length}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
