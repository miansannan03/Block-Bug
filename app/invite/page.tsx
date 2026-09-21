'use client'

import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react'
import { api, type Invitation } from '@/lib/api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BlockBugLogo } from '@/components/blockbug-logo'

export default function AcceptInvitationPage() {
  const { hash } = useLocation()
  const token = hash.replace(/^#/, '')
  const navigate = useNavigate()
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [name, setName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    api.inspectInvitation(token).then(({ invitation: value }) => setInvitation(value)).catch((err) => setError(err instanceof Error ? err.message : 'Invitation could not be loaded.')).finally(() => setLoading(false))
  }, [token])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (password !== confirmation) return setError('Passwords do not match.')
    setLoading(true)
    try {
      await api.acceptInvitation(token, { name, organizationName: invitation?.type === 'organization' ? organizationName : undefined, password, password_confirmation: confirmation })
      setAccepted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invitation could not be accepted.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <Link to="/" className="mb-8 flex justify-center"><BlockBugLogo appName="BlockBug" className="h-14" /></Link>
        <Card className="p-8">
          {loading && !invitation ? <p className="text-center text-muted-foreground">Validating your invitation…</p> : accepted ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
              <h1 className="text-2xl font-bold">Your account is ready</h1>
              <p className="mt-2 text-muted-foreground">The invitation is now used and cannot be opened again.</p>
              <Button className="mt-6" onClick={() => navigate('/login')}>Continue to Login</Button>
            </div>
          ) : error && !invitation ? (
            <div className="text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
              <h1 className="text-2xl font-bold">Invitation unavailable</h1>
              <p className="mt-2 text-muted-foreground">{error}</p>
              <Button variant="outline" className="mt-6" onClick={() => navigate('/login')}>Back to Login</Button>
            </div>
          ) : invitation && (
            <>
              <h1 className="text-2xl font-bold">Complete your account</h1>
              <p className="mt-2 mb-6 text-muted-foreground">Set your password to join {invitation.organizationName || 'BlockBug'}.</p>
              {error && <Alert variant="destructive" className="mb-5"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="mb-5 flex items-center gap-3 rounded-lg border bg-muted/30 p-3"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{invitation.email}</span></div>
              <form onSubmit={submit} className="space-y-4">
                {invitation.type === 'organization' && <div><label className="mb-2 block text-sm font-medium">Organization name</label><Input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} required /></div>}
                <div><label className="mb-2 block text-sm font-medium">Your name</label><Input value={name} onChange={(event) => setName(event.target.value)} required /></div>
                <div><label className="mb-2 block text-sm font-medium">Password</label><Input type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
                <div><label className="mb-2 block text-sm font-medium">Confirm password</label><Input type="password" minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>
                <Button className="w-full" disabled={loading}>{loading ? 'Creating account…' : 'Create Account'}</Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
