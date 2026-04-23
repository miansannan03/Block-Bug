'use client'

import { Card } from '@/components/ui/card'
import { getBugStats, mockActivities, mockBugs } from '@/lib/mock-data'
import { AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import HighchartsReact from 'highcharts-react-official'
import Highcharts from 'highcharts'

export function DashboardOverview() {
  const stats = getBugStats()

  const recentActivity = mockActivities.slice(0, 5)

  // Line chart options for bugs reported
  const lineChartOptions: Highcharts.Options = {
    chart: {
      type: 'line',
      backgroundColor: 'transparent',
      style: {
        fontFamily: 'var(--font-sans)',
      },
      height: 300,
      borderWidth: 0,
      plotBorderWidth: 0,
    },
    title: {
      text: undefined,
    },
    xAxis: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      lineColor: '#e5e7eb',
      crosshair: true,
      labels: {
        style: {
          color: '#888888',
          fontSize: '12px',
        },
      },
    },
    yAxis: {
      title: {
        text: undefined,
      },
      gridLineColor: '#e5e7eb',
      labels: {
        style: {
          color: '#888888',
          fontSize: '12px',
        },
      },
    },
    legend: {
      enabled: false,
    },
    plotOptions: {
      line: {
        dataLabels: {
          enabled: false,
        },
        enableMouseTracking: true,
      },
      series: {
        lineWidth: 3,
      },
    },
    series: [
      {
        name: 'Bugs Reported',
        data: [4, 3, 5, 2, 6, 1, 3],
        type: 'line',
        color: '#7c3aed',
        lineWidth: 3,
        marker: {
          enabled: true,
          radius: 5,
          fillColor: '#7c3aed',
          lineColor: '#ffffff',
          lineWidth: 2,
        },
        states: {
          hover: {
            lineWidth: 4,
            marker: {
              radius: 6,
            },
          },
        },
      } as any,
    ],
    tooltip: {
      enabled: true,
      shared: false,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      borderColor: 'hsl(var(--border))',
      borderRadius: 4,
      style: {
        color: '#FFFFFF',
      },
      headerFormat: '<b>{point.key}</b><br/>',
      pointFormat: '{series.name}: <b>{point.y}</b> bugs',
      crosshairs: [true],
    },
    credits: {
      enabled: false,
    },
    responsive: {
      rules: [
        {
          condition: {
            maxWidth: 500,
          },
          chartOptions: {
            chart: {
              height: 250,
            },
          },
        },
      ],
    },
  }

  // Pie chart options for bug status
  const pieChartOptions: Highcharts.Options = {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      style: {
        fontFamily: 'var(--font-sans)',
      },
      height: 300,
      borderWidth: 0,
      plotBorderWidth: 0,
    },
    title: {
      text: undefined,
    },
    plotOptions: {
      pie: {
        innerSize: '60%',
        dataLabels: {
          enabled: true,
          style: {
            color: '#1f2937',
            fontSize: '11px',
            fontWeight: 'bold',
          },
          format: '{point.name}',
        },
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    },
    series: [
      {
        type: 'pie',
        name: 'Bug Status',
        data: [
          { name: 'Open', y: stats.open, color: '#8b5cf6' },
          { name: 'In Progress', y: stats.inProgress, color: '#6366f1' },
          { name: 'Resolved', y: stats.resolved, color: '#3b82f6' },
          { name: 'Closed', y: stats.closed, color: '#10b981' },
        ],
      },
    ],
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      borderColor: '#d1d5db',
      borderRadius: 4,
      style: {
        color: '#FFFFFF',
      },
      headerFormat: '',
      pointFormat: '<b>{point.name}</b><br/>Bugs: {point.y}<br/>Percentage: {point.percentage:.1f}%',
    },
    credits: {
      enabled: false,
    },
    responsive: {
      rules: [
        {
          condition: {
            maxWidth: 500,
          },
          chartOptions: {
            chart: {
              height: 250,
            },
          },
        },
      ],
    },
  }

  return (
    <div className="p-8 space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 border border-border hover:border-primary hover:shadow-lg transition group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Bugs</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.total}</p>
              <p className="text-xs text-green-600 mt-2">+12% from last week</p>
            </div>
            <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center group-hover:bg-red-500/20 transition">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-border hover:border-primary hover:shadow-lg transition group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Open Issues</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.open}</p>
              <p className="text-xs text-red-600 mt-2">-8% from last week</p>
            </div>
            <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center group-hover:bg-orange-500/20 transition">
              <AlertCircle className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-border hover:border-primary hover:shadow-lg transition group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.inProgress}</p>
              <p className="text-xs text-blue-600 mt-2">On track</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-border hover:border-primary hover:shadow-lg transition group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Resolved</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.resolved}</p>
              <p className="text-xs text-green-600 mt-2">+23% from last week</p>
            </div>
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20 transition">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 border border-border lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Bugs Reported (Last 7 Days)</h3>
          <HighchartsReact highcharts={Highcharts} options={lineChartOptions} />
        </Card>

        <Card className="p-6 border border-border">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Bug Status</h3>
          <HighchartsReact highcharts={Highcharts} options={pieChartOptions} />
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 border border-border lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-border last:border-0 hover:bg-muted/30 -mx-2 px-2 py-1 rounded transition">
                <div className={`w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 ${
                  activity.type === 'created' ? 'bg-red-500' :
                  activity.type === 'status_changed' ? 'bg-blue-500' :
                  activity.type === 'assigned' ? 'bg-purple-500' :
                  activity.type === 'verified' ? 'bg-green-500' :
                  'bg-primary'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activity.userName}
                    {' '}
                    <span className="text-muted-foreground">
                      {activity.type === 'status_changed' && 'changed status'}
                      {activity.type === 'assigned' && 'assigned bug'}
                      {activity.type === 'verified' && 'verified fix'}
                      {activity.type === 'commented' && 'commented'}
                      {activity.type === 'created' && 'reported'}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">{activity.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.floor((Date.now() - activity.timestamp.getTime()) / (1000 * 60 * 60))} hours ago
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 border border-border">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition font-medium text-sm text-left">
              + New Bug Report
            </button>
            <button className="w-full px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-lg transition font-medium text-sm text-left">
              📊 View Analytics
            </button>
            <button className="w-full px-4 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-600 rounded-lg transition font-medium text-sm text-left">
              ✓ Approve Changes
            </button>
            <button className="w-full px-4 py-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 rounded-lg transition font-medium text-sm text-left">
              👥 Manage Team
            </button>
            <div className="pt-3 mt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Team Members Online</p>
              <div className="flex gap-2">
                {['Sarah', 'Mike', 'Emma'].map((name) => (
                  <div key={name} className="flex items-center gap-1">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs font-semibold text-primary">
                      {name[0]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
