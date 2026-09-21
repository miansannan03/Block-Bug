import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth-context'
import { SystemSettingsProvider } from '@/lib/system-settings-context'
import { ThemeProvider } from '@/components/theme-provider'
import Home from '@/app/page'
import LoginPage from '@/app/login/page'
import SignupPage from '@/app/signup/page'
import DashboardPage from '@/app/dashboard/page'
import AcceptInvitationPage from '@/app/invite/page'
import SuperAdminPage from '@/app/super-admin/page'
import '@/app/globals.css'

function App() {
  return (
    <ThemeProvider defaultTheme="light" enableSystem={false}>
      <SystemSettingsProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/invite" element={<AcceptInvitationPage />} />
            <Route path="/i" element={<AcceptInvitationPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/organization/*" element={<DashboardPage />} />
            <Route path="/super-admin/*" element={<SuperAdminPage />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </AuthProvider>
      </SystemSettingsProvider>
    </ThemeProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
