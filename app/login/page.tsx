'use client'

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, LockKeyhole } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useSystemSettings } from '@/lib/system-settings-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BlockBugLogo } from '@/components/blockbug-logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login, user, isLoading } = useAuth()
  const { settings } = useSystemSettings()

  useEffect(() => {
    if (!isLoading && user) navigate(user.role === 'super_admin' ? '/super-admin' : '/dashboard', { replace: true })
  }, [isLoading, navigate, user])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const authenticatedUser = await login(email, password)
      navigate(authenticatedUser.role === 'super_admin' ? '/super-admin' : '/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex justify-center" aria-label={`${settings.app_name} home`}>
          <BlockBugLogo appName={settings.app_name} className="h-16" />
        </Link>
        <Card className="border border-border p-8 shadow-xl shadow-primary/5">
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold">Sign in to BlockBug</h1>
          <p className="mt-2 mb-6 text-sm text-muted-foreground">Use your account once. We’ll open the correct platform or organization workspace automatically.</p>
          {error && <Alert variant="destructive" className="mb-6"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Email</label>
              <Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Password</label>
              <Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">Need an account? Ask your organization admin for an invitation link.</p>
        </Card>
      </div>
    </div>
  )
}
