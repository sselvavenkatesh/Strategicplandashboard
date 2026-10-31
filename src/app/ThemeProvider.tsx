import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type Theme = 'dark' | 'light'
type ThemeContextValue = { theme: Theme; toggleTheme: () => void }

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children,defaultTheme='dark',storageKey='district360-theme',scoped=false }: { children: ReactNode; defaultTheme?:Theme; storageKey?:string; scoped?:boolean }) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(storageKey) as Theme) || defaultTheme)

  useEffect(() => {
    if(!scoped) document.documentElement.dataset.theme = theme
    localStorage.setItem(storageKey, theme)
  }, [theme,storageKey,scoped])

  const value = useMemo(() => ({ theme, toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark') }), [theme])
  return <ThemeContext.Provider value={value}>{scoped?<div className="themeScope" data-theme={theme}>{children}</div>:children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
