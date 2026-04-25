'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, type SystemSettings } from '@/lib/api'

export const defaultSystemSettings: SystemSettings = {
  default_bug_status: 'open',
  default_bug_priority: 'medium',
  default_bug_severity: 'major',
  default_assignee_rule: 'unassigned',
  app_name: 'BlockBug',
  timezone: 'Asia/Karachi',
  date_format: 'Y-m-d',
  dashboard_default_view: 'overview',
  session_timeout_minutes: 120,
  allow_signup: true,
}

interface SystemSettingsContextType {
  settings: SystemSettings
  isLoading: boolean
  refreshSettings: () => Promise<void>
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined)

function normalizeDateOptions(format: string, withTime: boolean): Intl.DateTimeFormatOptions {
  const options: Intl.DateTimeFormatOptions = {}

  if (format === 'd/m/Y') {
    options.day = '2-digit'
    options.month = '2-digit'
    options.year = 'numeric'
  } else if (format === 'm/d/Y') {
    options.month = '2-digit'
    options.day = '2-digit'
    options.year = 'numeric'
  } else {
    options.year = 'numeric'
    options.month = '2-digit'
    options.day = '2-digit'
  }

  if (withTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
  }

  return options
}

export function formatDateWithSettings(
  date: Date,
  settings: Pick<SystemSettings, 'date_format' | 'timezone'> | Partial<SystemSettings>,
  withTime = false
) {
  return new Intl.DateTimeFormat('en-US', {
    ...normalizeDateOptions(settings.date_format || defaultSystemSettings.date_format, withTime),
    timeZone: settings.timezone || defaultSystemSettings.timezone,
  }).format(date)
}

export function getAppInitial(appName: string) {
  const trimmed = appName.trim()
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : 'B'
}

export function SystemSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSystemSettings)
  const [isLoading, setIsLoading] = useState(true)

  const refreshSettings = async () => {
    const result = await api.getSystemSettings()
    setSettings({ ...defaultSystemSettings, ...result.settings })
  }

  useEffect(() => {
    refreshSettings()
      .catch(() => setSettings(defaultSystemSettings))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    function handleSettingsUpdated() {
      void refreshSettings()
    }

    window.addEventListener('blockbug:system-settings-updated', handleSettingsUpdated)
    return () => {
      window.removeEventListener('blockbug:system-settings-updated', handleSettingsUpdated)
    }
  }, [])

  const value = useMemo(() => ({ settings, isLoading, refreshSettings }), [settings, isLoading])

  return <SystemSettingsContext.Provider value={value}>{children}</SystemSettingsContext.Provider>
}

export function useSystemSettings() {
  const context = useContext(SystemSettingsContext)
  if (!context) {
    throw new Error('useSystemSettings must be used within SystemSettingsProvider')
  }
  return context
}
