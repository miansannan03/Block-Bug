'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, type Invitation, type RoleDefinition, type User, type UserRole } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Copy, Shield, Users } from 'lucide-react'

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-blue-100 text-blue-800',
  developer: 'bg-purple-100 text-purple-800',
  tester: 'bg-green-100 text-green-800',
}

export function TeamPage() {
  const { user } = useAuth()
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [roles, setRoles] = useState<Record<UserRole, RoleDefinition> | null>(null)
  const [newMember, setNewMember] = useState({
    email: '',
    role: 'tester' as Exclude<UserRole, 'super_admin'>,
  })
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [generatedLink, setGeneratedLink] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isCreatingMember, setIsCreatingMember] = useState(false)
  const isAdmin = user?.role === 'admin'
  const visibleTeamMembers = isAdmin ? teamMembers : teamMembers.filter((member) => member.role !== 'admin')

  useEffect(() => {
    Promise.all([api.getUsers(), api.getRoles(), isAdmin ? api.getUserInvitations() : Promise.resolve({ invitations: [] })])
      .then(([users, roleDefinitions, inviteResult]) => {
        setTeamMembers(users)
        setRoles(roleDefinitions)
        setInvitations(inviteResult.invitations)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load team'))
  }, [])

  const updateMember = async (member: User, updates: Partial<Pick<User, 'role' | 'status'>>) => {
    if (!isAdmin) return
    const { user: updatedUser } = await api.updateUser(member.id, { ...updates, actorRole: user?.role })
    setTeamMembers(prev => prev.map(item => item.id === updatedUser.id ? updatedUser : item))
  }

  const createMember = async () => {
    if (!isAdmin) return
    if (!newMember.email) {
      setError('Enter the email address for the new team member.')
      setSuccessMessage('')
      return
    }

    setIsCreatingMember(true)
    setError('')
    setSuccessMessage('')
    try {
      const result = await api.inviteUser(newMember.email, newMember.role)
      setGeneratedLink(`${window.location.origin}/i#${result.token}`)
      setInvitations((prev) => [result.invitation, ...prev])
      setNewMember({ email: '', role: 'tester' })
      setSuccessMessage(`Invitation created for ${result.invitation.email}. Copy and share the secure link.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add team member.')
    } finally {
      setIsCreatingMember(false)
    }
  }

  return (
    <div className="p-8 space-y-8">
      {error && <Card className="p-4 border border-destructive text-destructive">{error}</Card>}
      {successMessage && <Card className="p-4 border border-green-200 text-green-700">{successMessage}</Card>}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Team Members</h2>
          <p className="text-muted-foreground">{isAdmin ? 'Manage your team and assign roles' : 'View your team and role coverage'}</p>
        </div>
      </div>

      {isAdmin && (
        <Card className="p-6 border border-border">
          <p className="text-sm font-semibold text-foreground mb-1">Invite Team Member</p>
          <p className="mb-4 text-sm text-muted-foreground">The recipient chooses their name and password from a single-use link.</p>
          <div className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
            <Input
              type="email"
              placeholder="Email address"
              value={newMember.email}
              onChange={(event) => setNewMember({ ...newMember, email: event.target.value })}
            />
            <select
              value={newMember.role}
              onChange={(event) => setNewMember({ ...newMember, role: event.target.value as Exclude<UserRole, 'super_admin'> })}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm capitalize"
            >
              {(['admin', 'manager', 'developer', 'tester'] as UserRole[]).map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <Button type="button" onClick={createMember} disabled={isCreatingMember}>{isCreatingMember ? 'Generating…' : 'Generate Link'}</Button>
          </div>
          {generatedLink && <div className="mt-4 flex items-center gap-2 rounded-lg border bg-muted/30 p-3"><code className="min-w-0 flex-1 truncate text-xs">{generatedLink}</code><Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(generatedLink)}><Copy className="mr-2 h-4 w-4" />Copy Link</Button></div>}
        </Card>
      )}

      {isAdmin && invitations.length > 0 && <Card className="overflow-hidden border border-border"><div className="border-b px-6 py-4"><h3 className="font-semibold">Pending Invitations</h3></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/40 text-left"><tr><th className="px-6 py-3">Email</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Expires</th><th className="px-6 py-3">Actions</th></tr></thead><tbody>{invitations.map((invite) => <tr key={invite.id} className="border-t"><td className="px-6 py-4">{invite.email}</td><td className="px-6 py-4 capitalize">{invite.role === 'admin' ? 'Organization Admin' : invite.role}</td><td className="px-6 py-4 capitalize">{invite.status}</td><td className="px-6 py-4">{new Date(invite.expiresAt).toLocaleString()}</td><td className="px-6 py-4"><div className="flex gap-2"><Button size="sm" variant="outline" disabled={invite.status === 'accepted'} onClick={async () => { const result = await api.regenerateInvitation(invite.id); setGeneratedLink(`${window.location.origin}/i#${result.token}`); setInvitations((prev) => prev.map((item) => item.id === invite.id ? result.invitation : item)) }}>Regenerate</Button><Button size="sm" variant="outline" disabled={invite.status !== 'pending'} onClick={async () => { await api.revokeInvitation(invite.id); setInvitations((prev) => prev.map((item) => item.id === invite.id ? { ...item, status: 'revoked' } : item)) }}>Revoke</Button></div></td></tr>)}</tbody></table></div></Card>}

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
              {visibleTeamMembers.map((member) => (
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
                    {isAdmin ? (
                      <select
                        value={member.role}
                        onChange={(event) => updateMember(member, { role: event.target.value as UserRole })}
                        className="rounded-md border border-border bg-background px-2 py-1 text-sm capitalize"
                      >
                        {['admin', 'manager', 'developer', 'tester'].map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    ) : (
                      <Badge className={`${roleColors[member.role]} capitalize`}>{member.role}</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={`${member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} capitalize`}>
                      {member.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {isAdmin ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateMember(member, { status: member.status === 'active' ? 'inactive' : 'active' })}
                      >
                        {member.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">View only</span>
                    )}
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
              <p className="text-2xl font-bold text-foreground">{visibleTeamMembers.length}</p>
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
              <p className="text-2xl font-bold text-foreground">{visibleTeamMembers.filter(member => member.status === 'active').length}</p>
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
              <p className="text-2xl font-bold text-foreground">{visibleTeamMembers.filter(member => member.role === 'admin').length}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
