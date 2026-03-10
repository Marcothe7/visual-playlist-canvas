import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PlaylistProvider } from '@/context/PlaylistContext'
import { AppProvider } from '@/context/AppContext'
import { AudioProvider } from '@/context/AudioContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PlaylistProvider>
      <AudioProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AudioProvider>
    </PlaylistProvider>
  </StrictMode>,
)
