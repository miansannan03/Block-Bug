'use client'

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api, type Organization } from '@/lib/api'
import { getAppInitial, useSystemSettings } from '@/lib/system-settings-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function LoginPage() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [organizationEmail, setOrganizationEmail] = useState('')
  const [organizationPassword, setOrganizationPassword] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()
  const { settings } = useSystemSettings()

  useEffect(() => {
    const storedOrganization = window.localStorage.getItem('blockbug_organization')
    if (!storedOrganization) return
    try {
      const parsedOrganization = JSON.parse(storedOrganization) as Organization
      setOrganization(parsedOrganization)
      setOrganizationEmail(parsedOrganization.loginEmail)
    } catch {
      window.localStorage.removeItem('blockbug_organization')
    }
  }, [])

  const handleOrganizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const validatedOrganization = await api.validateOrganization(organizationEmail, organizationPassword)
      setOrganization(validatedOrganization)
      window.localStorage.setItem('blockbug_organization', JSON.stringify(validatedOrganization))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Organization login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!organization?.id) {
        throw new Error('Organization session is missing. Please sign in to the organization again.')
      }
      await login(organization.id, email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const resetOrganizationStep = () => {
    setOrganization(null)
    setOrganizationEmail('')
    setOrganizationPassword('')
    setEmail('')
    setPassword('')
    setError('')
    window.localStorage.removeItem('blockbug_organization')
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
          <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground mb-6">
            {organization
              ? 'Now sign in with a member account from this organization.'
              : 'Start by signing in to your organization workspace.'}
          </p>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!organization ? (
            <form onSubmit={handleOrganizationSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Organization ID</label>
                <Input
                  type="email"
                  placeholder="deepixel@whatever"
                  value={organizationEmail}
                  onChange={(e) => setOrganizationEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Organization Password</label>
                <Input
                  type="password"
                  placeholder="Enter your organization password"
                  value={organizationPassword}
                  onChange={(e) => setOrganizationPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Checking organization...' : 'Continue'}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card/40 px-4 py-3">
                <p className="text-sm font-medium text-foreground">{organization.name}</p>
                <p className="text-sm text-muted-foreground">{organization.loginEmail}</p>
              </div>

              <form onSubmit={handleMemberSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Member Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Member Password</label>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <Button type="button" variant="ghost" className="w-full" onClick={resetOrganizationStep} disabled={loading}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Use a different organization
              </Button>
            </div>
          )}

          {settings.allow_signup ? (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          ) : (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              New accounts are created by an administrator.
            </div>
          )}
        </Card>

      </div>
    </div>
  )
}
