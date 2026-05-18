'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { getAppInitial, useSystemSettings } from '@/lib/system-settings-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function SignupPage() {
  const [organizationName, setOrganizationName] = useState('')
  const [organizationEmail, setOrganizationEmail] = useState('')
  const [organizationPassword, setOrganizationPassword] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { signup } = useAuth()
  const { settings } = useSystemSettings()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!settings.allow_signup) {
      setError('Public signup is currently disabled. Ask an administrator to create your account.')
      return
    }
    setLoading(true)

    try {
      await signup(
        organizationName,
        organizationEmail,
        organizationPassword,
        adminName,
        adminEmail,
        adminPassword,
      )
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">{getAppInitial(settings.app_name)}</span>
          </div>
          <span className="font-bold text-xl text-foreground">{settings.app_name}</span>
        </div>

        <Card className="p-8 border border-border">
          <h1 className="text-2xl font-bold mb-2">Create Organization</h1>
          <p className="text-muted-foreground mb-6">
            {settings.allow_signup
              ? 'Set up a new organization workspace. We will create the first administrator account for it.'
              : 'Public signup is currently disabled. Ask an administrator to create your account.'}
          </p>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Organization Name</label>
              <Input
                type="text"
                placeholder="Deepixel"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
                disabled={!settings.allow_signup}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Organization ID</label>
              <Input
                type="email"
                placeholder="deepixel@whatever"
                value={organizationEmail}
                onChange={(e) => setOrganizationEmail(e.target.value)}
                required
                disabled={!settings.allow_signup}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Organization Password</label>
              <Input
                type="password"
                placeholder="Create an organization password"
                value={organizationPassword}
                onChange={(e) => setOrganizationPassword(e.target.value)}
                required
                disabled={!settings.allow_signup}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Administrator Name</label>
              <Input
                type="text"
                placeholder="Alex Chen"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                disabled={!settings.allow_signup}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Administrator Email</label>
              <Input
                type="email"
                placeholder="admin@deepixel.dev"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                disabled={!settings.allow_signup}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Administrator Password</label>
              <Input
                type="password"
                placeholder="Create a strong admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                disabled={!settings.allow_signup}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !settings.allow_signup}>
              {settings.allow_signup ? (loading ? 'Creating account...' : 'Sign Up') : 'Signup Disabled'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing up, you agree to our Terms of Service
        </p>
      </div>
    </div>
  )
}
