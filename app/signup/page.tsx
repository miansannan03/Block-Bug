import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BlockBugLogo } from '@/components/blockbug-logo'

export default function SignupPage() {
  return <div className="min-h-screen grid place-items-center bg-background px-4"><Card className="w-full max-w-md p-8 text-center"><BlockBugLogo appName="BlockBug" className="mx-auto mb-7 h-14" /><h1 className="text-2xl font-bold">Invitation required</h1><p className="mt-3 mb-6 text-muted-foreground">Organizations are onboarded by the BlockBug Super Admin. Team members receive a secure invitation from their Organization Admin.</p><Button asChild><Link to="/login">Back to Login</Link></Button></Card></div>
}
