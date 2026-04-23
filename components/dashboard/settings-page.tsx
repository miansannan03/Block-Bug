'use client'

import { useAuth } from '@/lib/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

export function SettingsPage() {
  const { user, logout } = useAuth()
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || '',
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile Settings */}
      <Card className="p-8 border border-border">
        <h3 className="text-xl font-semibold mb-6 text-foreground">Profile Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email</label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              disabled
            />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Role</label>
            <Input
              type="text"
              value={formData.role}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">Role is assigned by administrators</p>
          </div>
          {saved && <p className="text-sm text-green-600">Changes saved successfully!</p>}
          <Button onClick={handleSave} className="mt-4">
            Save Changes
          </Button>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-8 border border-border">
        <h3 className="text-xl font-semibold mb-6 text-foreground">Notification Preferences</h3>
        <div className="space-y-4">
          {[
            { name: 'Email notifications', description: 'Receive email updates about bug assignments and changes' },
            { name: 'Bug assigned', description: 'Get notified when a bug is assigned to you' },
            { name: 'Comment notifications', description: 'Receive updates when someone comments on your bugs' },
            { name: 'Daily digest', description: 'Get a daily summary of activity' },
          ].map((pref, i) => (
            <label key={i} className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition">
              <input
                type="checkbox"
                defaultChecked={i < 2}
                className="w-4 h-4 rounded"
              />
              <div className="flex-1">
                <p className="font-medium text-foreground">{pref.name}</p>
                <p className="text-xs text-muted-foreground">{pref.description}</p>
              </div>
            </label>
          ))}
          <Button className="mt-4">Save Preferences</Button>
        </div>
      </Card>

      {/* API Keys */}
      <Card className="p-8 border border-border">
        <h3 className="text-xl font-semibold mb-6 text-foreground">API Keys</h3>
        <p className="text-muted-foreground mb-4">Manage your API keys for integrations</p>
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-mono text-muted-foreground">api_key_abc123def456...</p>
            <p className="text-xs text-muted-foreground mt-2">Created 3 months ago</p>
          </div>
          <Button variant="outline">+ Generate New Key</Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-8 border border-destructive bg-destructive/5">
        <h3 className="text-xl font-semibold mb-6 text-destructive">Danger Zone</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground mb-2">Sign Out</h4>
            <p className="text-sm text-muted-foreground mb-4">This will sign you out of your BlockBug account</p>
            <Button
              onClick={logout}
              variant="destructive"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
