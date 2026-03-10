import { createContext, useContext, useRef, useState } from 'react'

const AudioCtx = createContext(null)

export function AudioProvider({ children }) {
  const [playingId,   setPlayingId]   = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)
  const audioRef = useRef(null)

  function play(id, url) {
    // Stop whatever is currently playing
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }

    // Toggle off if same track clicked again
    if (playingId === id) {
      setPlayingId(null)
      setCurrentTime(0)
      setDuration(0)
      return
    }

    const audio = new Audio(url)
    audioRef.current = audio

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration || 0)
    })
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
    })
    audio.addEventListener('ended', () => {
      setPlayingId(null)
      setCurrentTime(0)
      setDuration(0)
    }, { once: true })

    audio.play().catch(() => {})
    setPlayingId(id)
    setCurrentTime(0)
  }

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    setPlayingId(null)
    setCurrentTime(0)
    setDuration(0)
  }

  function seek(ratio) {
    if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = ratio * duration
    }
  }

  return (
    <AudioCtx.Provider value={{ playingId, currentTime, duration, play, stop, seek }}>
      {children}
    </AudioCtx.Provider>
  )
}

export function useAudio() {
  const ctx = useContext(AudioCtx)
  if (!ctx) throw new Error('useAudio must be used within AudioProvider')
  return ctx
}
