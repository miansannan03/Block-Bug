'use client'

import { Activity, LogOut, ShieldCheck } from 'lucide-react'
import type { AuditLog } from '@/lib/api'
import type { User } from '@/lib/auth-context'

interface SuperAdminHeaderProps {
  user: User | null
  activity: AuditLog[]
  onOpenAudit: () => void
  onLogout: () => void
}

export function SuperAdminHeader({ user, activity, onOpenAudit, onLogout }: SuperAdminHeaderProps) {
  const latestActivity = activity[0]

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Platform</p>
            <h1 className="text-xl font-bold text-foreground">Super Admin</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            onClick={onOpenAudit}
          >
            <Activity className="h-4 w-4" />
            {activity.length} audit events
          </button>

          <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-foreground">{user?.name || 'Administrator'}</p>
              <p className="text-xs text-muted-foreground">{user?.email || 'platform@blockbug.io'}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground transition hover:opacity-90"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {latestActivity && (
        <div className="border-t border-border bg-muted/30 px-6 py-2 text-xs text-muted-foreground">
          Latest activity: {latestActivity.action} • {new Date(latestActivity.createdAt).toLocaleString()}
        </div>
      )}
    </header>
  )
}
