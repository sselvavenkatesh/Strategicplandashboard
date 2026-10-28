import {lazy, Suspense} from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './app/ThemeProvider'
import { AppShell } from './components/layout/AppShell'
import { AdminHomePage } from './pages/admin/AdminHomePage'
import { SuperAdminPage } from './pages/admin/SuperAdminPage'
const GoalPage = lazy(() => import('./pages/dashboard/GoalPage').then(module => ({default: module.GoalPage})))
import { SummaryPage } from './pages/dashboard/SummaryPage'
import { WelcomePage } from './pages/dashboard/WelcomePage'
import { AiAssistantPage } from './pages/dashboard/AiAssistantPage'

const V25AdminPage = lazy(() => import('./pages/admin/v25/V25AdminPage'));
const v25Preview = import.meta.env.VITE_V25_UI_PREVIEW === 'true';

export default function App() {
  return (
    <ThemeProvider>
      <Suspense fallback={<main aria-live="polite" style={{padding: 32}}>Loading workspace…</main>}>
      <Routes>
        <Route path="/superadmin" element={v25Preview ? <V25AdminPage /> : <SuperAdminPage />} />
        {v25Preview && <Route path="/admin" element={<V25AdminPage />} />}
        <Route element={<AppShell />}>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/ai" element={<AiAssistantPage />} />
          <Route path="/goals/:goalId" element={<GoalPage />} />
          {!v25Preview && <Route path="/admin" element={<AdminHomePage />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </Suspense>
    </ThemeProvider>
  )
}
