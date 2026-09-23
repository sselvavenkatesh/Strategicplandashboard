import { Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './app/ThemeProvider'
import { AppShell } from './components/layout/AppShell'
import { AdminHomePage } from './pages/admin/AdminHomePage'
import { GoalPage } from './pages/dashboard/GoalPage'
import { SummaryPage } from './pages/dashboard/SummaryPage'
import { WelcomePage } from './pages/dashboard/WelcomePage'

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/goals/:goalId" element={<GoalPage />} />
          <Route path="/admin" element={<AdminHomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}
