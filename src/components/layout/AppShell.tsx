import { Moon, Sun } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { useTheme } from '../../app/ThemeProvider'

export function AppShell() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div className="app-shell">
      <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle color theme">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <Outlet />
    </div>
  )
}
