'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ExternalLink, Plus } from 'lucide-react'

export function IntegrationsPage() {
  const integrations = [
    {
      name: 'Slack',
      description: 'Get instant notifications in Slack when bugs are reported or updated',
      icon: '💬',
      status: 'connected',
      color: 'from-purple-500 to-purple-600',
    },
    {
      name: 'GitHub',
      description: 'Link bugs to GitHub issues and sync statuses automatically',
      icon: '🐙',
      status: 'connected',
      color: 'from-gray-800 to-black',
    },
    {
      name: 'Jira',
      description: 'Sync BlockBug issues with your Jira projects',
      icon: '📋',
      status: 'available',
      color: 'from-blue-500 to-blue-600',
    },
    {
      name: 'Microsoft Teams',
      description: 'Share bug updates and collaborate with your Teams channels',
      icon: '👥',
      status: 'available',
      color: 'from-blue-600 to-blue-700',
    },
    {
      name: 'GitLab',
      description: 'Integration with GitLab for issue tracking and CI/CD pipelines',
      icon: '🦊',
      status: 'available',
      color: 'from-orange-500 to-orange-600',
    },
    {
      name: 'Webhooks',
      description: 'Custom webhooks for sending bug events to your systems',
      icon: '🔗',
      status: 'available',
      color: 'from-indigo-500 to-indigo-600',
    },
  ]

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Integrations</h2>
        <p className="text-muted-foreground">Connect BlockBug with your favorite tools and services</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <Card key={integration.name} className="p-6 border border-border hover:border-primary hover:shadow-lg transition">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`text-3xl`}>{integration.icon}</div>
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
            <div className="flex gap-2">
              {integration.status === 'connected' ? (
                <>
                  <Button variant="outline" size="sm" className="gap-1">
                    Configure
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button size="sm" className="gap-1 w-full">
                  <Plus className="w-4 h-4" />
                  Connect
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
