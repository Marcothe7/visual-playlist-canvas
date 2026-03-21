import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@/context/AuthContext'
import { CreditProvider } from '@/context/CreditContext'
import { PlaylistProvider } from '@/context/PlaylistContext'
import { AppProvider } from '@/context/AppContext'
import { AudioProvider } from '@/context/AudioContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <CreditProvider>
        <PlaylistProvider>
          <AudioProvider>
            <AppProvider>
              <App />
            </AppProvider>
          </AudioProvider>
        </PlaylistProvider>
      </CreditProvider>
    </AuthProvider>
  </StrictMode>,
)
