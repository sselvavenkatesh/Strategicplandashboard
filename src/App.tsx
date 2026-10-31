import {lazy, Suspense} from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './app/ThemeProvider'
import { AppShell } from './components/layout/AppShell'
const GoalPage = lazy(() => import('./pages/dashboard/GoalPage').then(module => ({default: module.GoalPage})))
import { SummaryPage } from './pages/dashboard/SummaryPage'
import { WelcomePage } from './pages/dashboard/WelcomePage'
import { AiAssistantPage } from './pages/dashboard/AiAssistantPage'

const SuperAdminWorkspace = lazy(() => import('./pages/admin/v25/SuperAdminWorkspace'));

export default function App() {
  return (
    <ThemeProvider>
      <Suspense fallback={<main aria-live="polite" style={{padding: 32}}>Loading workspace…</main>}>
      <Routes>
        <Route path="/superadmin" element={<SuperAdminWorkspace key="superadmin" />} />
        <Route path="/admin" element={<SuperAdminWorkspace key="admin" admin />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/ai" element={<AiAssistantPage />} />
          <Route path="/goals/:goalId" element={<GoalPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </Suspense>
    </ThemeProvider>
  )
}
