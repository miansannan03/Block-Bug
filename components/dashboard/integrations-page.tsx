'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api, type Integration } from '@/lib/api'
import { CheckCircle2, Plus } from 'lucide-react'

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.getIntegrations().then(setIntegrations).catch((err) => setError(err instanceof Error ? err.message : 'Could not load integrations'))
  }, [])

  const toggleIntegration = async (integration: Integration) => {
    const updated = await api.updateIntegration(integration.id, integration.status === 'connected' ? 'available' : 'connected')
    setIntegrations(prev => prev.map(item => item.id === updated.id ? updated : item))
  }

  return (
    <div className="p-8 space-y-8">
      {error && <Card className="p-4 border border-destructive text-destructive">{error}</Card>}
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Integrations</h2>
        <p className="text-muted-foreground">Connect BlockBug with your favorite tools and services</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id} className="p-6 border border-border hover:border-primary hover:shadow-lg transition">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  {integration.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{integration.name}</h3>
                  {integration.status === 'connected' && (
                    <div className="flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-600 font-medium">Connected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{integration.description}</p>
            {integration.status === 'connected' ? (
              <Button variant="outline" size="sm" onClick={() => toggleIntegration(integration)}>
                Disconnect
              </Button>
            ) : (
              <Button size="sm" className="gap-1 w-full" onClick={() => toggleIntegration(integration)}>
                <Plus className="w-4 h-4" />
                Connect
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
