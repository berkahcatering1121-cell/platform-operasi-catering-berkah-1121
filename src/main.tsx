import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { LanguageProvider } from '@/lib/i18n'
import { AuthProvider } from '@/auth/AuthProvider'
import App from './App'
import './index.css'

// Recover from stale code-split chunks after a new deploy. When a browser tab
// holds an old build and a dynamically imported module (PDF reader, exporters,
// ...) is requested, its hashed filename is gone from the server and the import
// fails with "Failed to fetch dynamically imported module". Vite fires
// `vite:preloadError` in that case; reload once to pick up the current build.
// The timestamp guard prevents a reload loop if the chunk is genuinely missing.
window.addEventListener('vite:preloadError', () => {
  const KEY = 'cb:chunkReloadAt'
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0)
    if (Date.now() - last < 10000) return
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    /* sessionStorage unavailable: fall through and still reload */
  }
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
