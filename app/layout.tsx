import { AuthProvider } from '@/lib/auth-context'
import { SystemSettingsProvider } from '@/lib/system-settings-context'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ThemeProvider defaultTheme="light" enableSystem={false}>
      <SystemSettingsProvider>
        <AuthProvider>{children}</AuthProvider>
      </SystemSettingsProvider>
    </ThemeProvider>
  )
}
