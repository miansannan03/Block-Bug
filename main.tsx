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
            <Route path="/dashboard" element={<DashboardPage />} />
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
