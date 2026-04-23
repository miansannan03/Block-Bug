'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRight, CheckCircle2, BarChart3, Users, Shield, Zap, Clock, TrendingUp, Star, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">B</span>
            </div>
            <span className="font-bold text-lg text-foreground">BlockBug</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-foreground hover:text-primary transition">
              Login
            </Link>
            <Link href="/signup">
              <Button variant="default" size="sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 overflow-hidden">
        {/* Gradient background effect */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-3xl"></div>
        
        <div className="text-center max-w-3xl mx-auto">
          <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">New: Real-time Collaboration Features</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-balance leading-tight">
            Professional Bug Tracking for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary">Modern Teams</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 text-balance">
            Streamline your bug reporting, tracking, and resolution process. Keep your development team organized, productive, and one step ahead of issues.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-shadow">
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Stats Showcase */}
          <div className="grid grid-cols-3 gap-8 mt-16 pt-12 border-t border-border">
            <div>
              <div className="text-3xl font-bold text-primary">10K+</div>
              <p className="text-sm text-muted-foreground mt-1">Active Teams</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">1M+</div>
              <p className="text-sm text-muted-foreground mt-1">Bugs Tracked</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">99.9%</div>
              <p className="text-sm text-muted-foreground mt-1">Uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-4xl font-bold mb-12 text-center">Powerful Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 border border-border hover:border-primary transition hover:shadow-lg group">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Analytics</h3>
              <p className="text-muted-foreground">
                Track bug trends, resolution times, and team performance with detailed reports and visualizations.
              </p>
            </Card>
            <Card className="p-6 border border-border hover:border-primary transition hover:shadow-lg group">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
              <p className="text-muted-foreground">
                Assign bugs, add comments, and keep your team synchronized with instant notifications.
              </p>
            </Card>
            <Card className="p-6 border border-border hover:border-primary transition hover:shadow-lg group">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Role-Based Access</h3>
              <p className="text-muted-foreground">
                Manage permissions with flexible role assignments for admins, managers, developers, and testers.
              </p>
            </Card>
            <Card className="p-6 border border-border hover:border-primary transition hover:shadow-lg group">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Instant Notifications</h3>
              <p className="text-muted-foreground">
                Get real-time alerts when bugs are reported, updated, or assigned to keep everyone in sync.
              </p>
            </Card>
            <Card className="p-6 border border-border hover:border-primary transition hover:shadow-lg group">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">SLA Tracking</h3>
              <p className="text-muted-foreground">
                Monitor and enforce service level agreements with automatic reminders and escalation rules.
              </p>
            </Card>
            <Card className="p-6 border border-border hover:border-primary transition hover:shadow-lg group">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Performance Insights</h3>
              <p className="text-muted-foreground">
                Gain actionable insights with heatmaps, trends, and predictive analytics to improve processes.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold mb-12 text-center">Why Choose BlockBug?</h2>
        <div className="space-y-4 max-w-2xl mx-auto">
          {[
            'Reduce bug resolution time by up to 40%',
            'Improve team communication and visibility',
            'Prevent critical bugs from reaching production',
            'Easy integration with your development workflow',
            'Comprehensive reporting and insights',
            'Secure and reliable platform',
          ].map((benefit, i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-lg">{benefit}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold mb-12 text-center">Loved by Teams Worldwide</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { name: 'Sarah Chen', role: 'Engineering Manager', company: 'Tech Startup', text: 'BlockBug transformed how our team tracks bugs. Resolution time dropped by 35% in the first month.' },
            { name: 'Mike Johnson', role: 'QA Lead', company: 'Enterprise Software', text: 'The analytics dashboard gives us visibility we never had before. Essential for modern QA operations.' },
            { name: 'Emma Davis', role: 'CTO', company: 'Digital Agency', text: 'Simple, powerful, and reliable. Our entire team embraced it immediately. Highly recommended!' },
          ].map((testimonial, i) => (
            <Card key={i} className="p-6 border border-border hover:border-primary transition">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-foreground mb-4 italic">"{testimonial.text}"</p>
              <div>
                <p className="font-semibold text-foreground">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role} at {testimonial.company}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Comparison Section */}
      <section className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-4xl font-bold mb-12 text-center">Why BlockBug Stands Out</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold">BlockBug</th>
                  <th className="text-center py-4 px-4 font-semibold">Competitor A</th>
                  <th className="text-center py-4 px-4 font-semibold">Competitor B</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Real-time Collaboration', blockbug: true, a: true, b: false },
                  { feature: 'Advanced Analytics', blockbug: true, a: false, b: true },
                  { feature: 'Custom Workflows', blockbug: true, a: true, b: false },
                  { feature: 'API Access', blockbug: true, a: false, b: true },
                  { feature: 'Mobile App', blockbug: true, a: false, b: false },
                  { feature: 'SLA Management', blockbug: true, a: false, b: false },
                  { feature: '24/7 Support', blockbug: true, a: true, b: true },
                  { feature: 'Affordable Pricing', blockbug: true, a: false, b: false },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/50 transition">
                    <td className="py-4 px-4">{row.feature}</td>
                    <td className="py-4 px-4 text-center">{row.blockbug ? <CheckCircle2 className="w-5 h-5 text-primary mx-auto" /> : '—'}</td>
                    <td className="py-4 px-4 text-center">{row.a ? <CheckCircle2 className="w-5 h-5 text-primary mx-auto" /> : '—'}</td>
                    <td className="py-4 px-4 text-center">{row.b ? <CheckCircle2 className="w-5 h-5 text-primary mx-auto" /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            { q: 'How quickly can I get started?', a: 'You can create an account and set up your first project in less than 5 minutes. No credit card required for the free trial.' },
            { q: 'Can I integrate with other tools?', a: 'Yes! BlockBug integrates with popular development tools, CI/CD platforms, and communication services like Slack and Teams.' },
            { q: 'Is my data secure?', a: 'Absolutely. We use enterprise-grade encryption, regular security audits, and comply with GDPR and SOC 2 standards.' },
            { q: 'What support do you offer?', a: 'We offer 24/7 email support on all plans, priority support for Pro users, and dedicated support for Enterprise customers.' },
            { q: 'Can I export my data?', a: 'Yes, you can export all your bug data in CSV or JSON format anytime. No vendor lock-in.' },
            { q: 'Is there a free trial?', a: 'Yes! Start with our free plan that includes basic features for up to 3 projects with full functionality.' },
          ].map((item, i) => (
            <Card key={i} className="border border-border overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition text-left"
              >
                <span className="font-semibold">{item.q}</span>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {expandedFaq === i && (
                <div className="px-6 py-4 border-t border-border bg-muted/30 text-muted-foreground">
                  {item.a}
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-3xl font-bold mb-12 text-center">Simple Pricing</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { name: 'Starter', price: '$29', features: ['Up to 3 projects', 'Basic analytics', 'Email support'] },
              { name: 'Professional', price: '$79', features: ['Unlimited projects', 'Advanced analytics', 'Priority support', 'API access'], popular: true },
              { name: 'Enterprise', price: 'Custom', features: ['Everything in Pro', 'SSO & SAML', 'Dedicated support'] },
            ].map((plan, i) => (
              <Card
                key={i}
                className={`p-8 border ${plan.popular ? 'border-primary shadow-lg' : 'border-border'} relative`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.price !== 'Custom' && <span className="text-muted-foreground">/month</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                  Get Started
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="p-12 bg-primary text-primary-foreground text-center border-0">
          <h2 className="text-3xl font-bold mb-4">Ready to Improve Your Bug Tracking?</h2>
          <p className="text-lg mb-8 opacity-90">
            Join teams worldwide who trust BlockBug for their issue management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button variant="secondary" size="lg">
                Start Free
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="lg" className="text-primary-foreground hover:bg-primary-foreground/10">
                Sign In
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-muted-foreground">
          <p>&copy; 2024 BlockBug. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
