'use client'

import { Card } from '@/components/ui/card'
import { mockBugs, mockProjects } from '@/lib/mock-data'
import HighchartsReact from 'highcharts-react-official'
import Highcharts from 'highcharts'

export function ReportsPage() {
  // Priority breakdown
  const priorityBugCounts = mockBugs.reduce(
    (acc, bug) => {
      acc[bug.priority] = (acc[bug.priority] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // Resolution time chart options
  const resolutionChartOptions: Highcharts.Options = {
    chart: {
      type: 'bar',
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
      categories: ['Mobile App', 'Web Platform', 'API Services'],
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
        text: 'Days',
        style: {
          color: '#888888',
        },
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
      bar: {
        dataLabels: {
          enabled: false,
        },
        enableMouseTracking: true,
      },
    },
    series: [
      {
        type: 'bar',
        name: 'Avg Resolution Time',
        data: [4.2, 3.8, 5.1],
        color: '#7c3aed',
      },
    ],
    tooltip: {
      enabled: true,
      shared: false,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      borderColor: '#d1d5db',
      borderRadius: 4,
      style: {
        color: '#FFFFFF',
      },
      headerFormat: '<b>{point.key}</b><br/>',
      pointFormat: '{series.name}: <b>{point.y}</b> days',
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

  // Priority bugs chart options
  const priorityChartOptions: Highcharts.Options = {
    chart: {
      type: 'bar',
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
      categories: ['Critical', 'High', 'Medium', 'Low'],
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
        text: 'Count',
        style: {
          color: '#888888',
        },
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
      bar: {
        dataLabels: {
          enabled: false,
        },
        enableMouseTracking: true,
      },
    },
    series: [
      {
        type: 'bar',
        name: 'Bugs by Priority',
        data: [
          priorityBugCounts.critical || 0,
          priorityBugCounts.high || 0,
          priorityBugCounts.medium || 0,
          priorityBugCounts.low || 0,
        ],
        color: '#6366f1',
      },
    ],
    tooltip: {
      enabled: true,
      shared: false,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      borderColor: '#d1d5db',
      borderRadius: 4,
      style: {
        color: '#FFFFFF',
      },
      headerFormat: '<b>{point.key}</b><br/>',
      pointFormat: '{series.name}: <b>{point.y}</b> bugs',
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
      <div>
        <h2 className="text-2xl font-bold text-foreground">Analytics & Reports</h2>
        <p className="text-muted-foreground">Detailed insights and metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border border-border">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Avg Resolution Time (Days)</h3>
          <HighchartsReact highcharts={Highcharts} options={resolutionChartOptions} />
        </Card>

        <Card className="p-6 border border-border">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Bugs by Priority</h3>
          <HighchartsReact highcharts={Highcharts} options={priorityChartOptions} />
        </Card>

        <Card className="p-6 border border-border lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Reports Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Total Bug Reports</p>
              <p className="text-3xl font-bold text-foreground">{mockBugs.length}</p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Active Projects</p>
              <p className="text-3xl font-bold text-foreground">{mockProjects.filter(p => p.status === 'active').length}</p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Avg Bugs per Project</p>
              <p className="text-3xl font-bold text-foreground">{(mockBugs.length / mockProjects.length).toFixed(1)}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
