import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import './AudioPlayer.css'

type AudioPlayerContextType = {
  playLocalFile: (file: File) => void
  playSavedAudio: (publicId: string, filename: string) => Promise<void>
  closePlayer: () => void
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null)

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3]

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return '0:00'
  const total = Math.floor(value)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext)
  if (!context) {
    throw new Error('useAudioPlayer must be used inside AudioPlayerProvider')
  }
  return context
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [audioUrl, setAudioUrl] = useState('')
  const [filename, setFilename] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const shouldAutoPlayRef = useRef(false)
  const requestIdRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const closePlayer = useCallback(() => {
    requestIdRef.current += 1
    shouldAutoPlayRef.current = false
    audioRef.current?.pause()
    if (audioRef.current) audioRef.current.currentTime = 0
    setAudioUrl('')
    setFilename('')
    setLoading(false)
    setError('')
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setPlaybackRate(1)
    setSettingsOpen(false)
  }, [])

  useEffect(() => {
    closePlayer()
  }, [location.pathname, closePlayer])

  useEffect(() => {
    if (!audioUrl) return
    const audio = audioRef.current
    if (!audio) return

    audio.load()

    if (shouldAutoPlayRef.current) {
      shouldAutoPlayRef.current = false
      void audio.play().catch(() => {
        setError('برای شروع پخش، دکمهٔ پخش را بزن.')
      })
    }
  }, [audioUrl])

  useEffect(() => {
    return () => {
      if (audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const playLocalFile = useCallback((file: File) => {
    requestIdRef.current += 1
    audioRef.current?.pause()
    shouldAutoPlayRef.current = false
    setError('')
    setFilename(file.name)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    setPlaybackRate(1)
    setSettingsOpen(false)
    setAudioUrl(URL.createObjectURL(file))
  }, [])

  const playSavedAudio = useCallback(async (publicId: string, name: string) => {
    const requestId = ++requestIdRef.current
    audioRef.current?.pause()
    shouldAutoPlayRef.current = false
    setAudioUrl('')
    setFilename(name)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    setPlaybackRate(1)
    setSettingsOpen(false)
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('access_token')
      if (!token) throw new Error('برای پخش فایل ذخیره‌شده وارد حساب شوید.')

      const response = await fetch(`/media/${publicId}/audio`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('دریافت فایل صوتی ناموفق بود.')

      const blob = await response.blob()
      if (requestIdRef.current !== requestId) return

      setFilename(name)
      shouldAutoPlayRef.current = true
      setAudioUrl(URL.createObjectURL(blob))
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setError(err instanceof Error ? err.message : 'خطا در دریافت فایل صوتی.')
      }
    } finally {
      if (requestIdRef.current === requestId) setLoading(false)
    }
  }, [])

  function togglePlayback() {
    const audio = audioRef.current
    if (!audio || !audioUrl) return

    if (audio.paused) {
      void audio.play().catch(() => {
        setError('پخش فایل شروع نشد. دوباره تلاش کن.')
      })
    } else {
      audio.pause()
    }
  }

  function seekBy(seconds: number) {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration)) return
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds))
  }

  function changeRate(rate: number) {
    setPlaybackRate(rate)
    if (audioRef.current) audioRef.current.playbackRate = rate
  }

  const hasPlayer = Boolean(audioUrl || loading || error)

  return (
    <AudioPlayerContext.Provider value={{ playLocalFile, playSavedAudio, closePlayer }}>
      {children}

      {hasPlayer && (
        <aside className="global-audio-player" dir="rtl" aria-label="پخش‌کنندهٔ صوتی">
          <div className="audio-player-top">
            <div className="audio-player-track-icon" aria-hidden="true">♫</div>
            <div className="audio-player-track-info">
              <span className="audio-player-label">در حال پخش</span>
              <strong className="audio-player-filename" title={filename}>
                {filename || 'فایل صوتی'}
              </strong>
            </div>
            <button
              className="audio-player-close"
              type="button"
              onClick={closePlayer}
              aria-label="بستن پخش‌کننده"
              title="بستن"
            >
              ×
            </button>
          </div>

          {loading ? (
            <div className="audio-player-message" role="status">
              <span className="audio-player-spinner" />
              در حال دریافت فایل صوتی…
            </div>
          ) : error ? (
            <div className="audio-player-message audio-player-error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')}>متوجه شدم</button>
            </div>
          ) : (
            <>
              <audio
                ref={audioRef}
                className="audio-player-native"
                preload="metadata"
                src={audioUrl || undefined}
                onLoadedMetadata={(event) => {
                  const value = event.currentTarget.duration
                  setDuration(Number.isFinite(value) ? value : 0)
                }}
                onDurationChange={(event) => {
                  const value = event.currentTarget.duration
                  setDuration(Number.isFinite(value) ? value : 0)
                }}
                onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />

              <div className="audio-player-timeline">
                <span>{formatTime(currentTime)}</span>
                <input
                  aria-label="موقعیت پخش"
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.1}
                  value={Math.min(currentTime, duration || 1)}
                  style={{ '--audio-progress': `${duration ? (currentTime / duration) * 100 : 0}%` } as React.CSSProperties}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    if (audioRef.current) audioRef.current.currentTime = value
                    setCurrentTime(value)
                  }}
                />
                <span>{formatTime(duration)}</span>
              </div>

              <div className="audio-player-controls">
                <button
                  className="audio-player-tool"
                  type="button"
                  onClick={() => seekBy(10)}
                  aria-label="۱۰ ثانیه جلو"
                  title="۱۰ ثانیه جلو"
                >
                  <span>+10</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7v5h5M5.5 12a7 7 0 1 0 2-5" /></svg>
                </button>

                <button
                  className="audio-player-main-button"
                  type="button"
                  onClick={togglePlayback}
                  aria-label={isPlaying ? 'مکث' : 'پخش'}
                  title={isPlaying ? 'مکث' : 'پخش'}
                >
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM15 5h3v14h-3z" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>

                <button
                  className="audio-player-tool"
                  type="button"
                  onClick={() => seekBy(-10)}
                  aria-label="۱۰ ثانیه عقب"
                  title="۱۰ ثانیه عقب"
                >
                  <span>−10</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M18.5 12a7 7 0 1 1-2-5" /></svg>
                </button>
              </div>

              <div className="audio-player-bottom">
                <span className="audio-player-bottom-status">
                  <span className={`audio-player-live-dot ${isPlaying ? 'is-playing' : ''}`} />
                  {isPlaying ? 'در حال پخش' : 'آمادهٔ پخش'}
                </span>

                <div className="audio-player-settings-wrap">
                  <button
                    className={`audio-player-settings-button ${settingsOpen ? 'is-open' : ''}`}
                    type="button"
                    aria-expanded={settingsOpen}
                    aria-haspopup="true"
                    onClick={() => setSettingsOpen((open) => !open)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
                      <path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" />
                    </svg>
                    تنظیمات
                    <strong>{playbackRate}x</strong>
                  </button>

                  {settingsOpen && (
                    <>
                      <button
                        className="audio-player-settings-dismiss"
                        type="button"
                        aria-label="بستن تنظیمات"
                        onClick={() => setSettingsOpen(false)}
                      />
                      <div className="audio-player-settings-menu" role="dialog" aria-label="تنظیمات پخش">
                        <div className="audio-player-settings-heading">
                          <strong>سرعت پخش</strong>
                          <span>Playback speed</span>
                        </div>
                        <div className="audio-player-rates">
                          {PLAYBACK_RATES.map((rate) => (
                            <button
                              key={rate}
                              type="button"
                              className={playbackRate === rate ? 'is-selected' : ''}
                              aria-pressed={playbackRate === rate}
                              onClick={() => changeRate(rate)}
                            >
                              {rate}x
                              {playbackRate === rate && <span aria-hidden="true">✓</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </aside>
      )}
    </AudioPlayerContext.Provider>
  )
}
