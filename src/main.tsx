import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/main.scss'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { LicenseProvider } from './contexts/LicenseContext.tsx'
import { ToastProvider } from './components/Toast/ToastProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <LicenseProvider>
            <App />
          </LicenseProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
