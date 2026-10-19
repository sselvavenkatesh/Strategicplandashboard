import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  // Vercel's Git preview does not read Netlify build contexts.
  // Production builds and all other branches continue to use real targets.
  ...(process.env.VERCEL_ENV === 'preview' &&
      process.env.VERCEL_GIT_COMMIT_REF === 'preview/indicator-achievement-20261019'
    ? {define: {'import.meta.env.VITE_ACHIEVEMENT_PREVIEW': JSON.stringify('true')}}
    : {}),
})
