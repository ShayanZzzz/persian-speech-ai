import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import './AudioPlayer.css'

type AudioPlayerContextType = {
  playLocalFile: (file: File) => void
  playSavedAudio: (publicId: string, filename: string) => Promise<void>
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null)

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext)
  if (!context) {
    throw new Error('useAudioPlayer must be used inside AudioPlayerProvider')
  }
  return context
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [audioUrl, setAudioUrl] = useState('')
  const [filename, setFilename] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const shouldAutoPlayRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (!audioUrl) return

    const audio = audioRef.current
    if (!audio) return

    audio.load()

    if (shouldAutoPlayRef.current) {
      shouldAutoPlayRef.current = false
      void audio.play().catch(() => {
        setError('فایل بارگذاری شد؛ برای شروع، دکمهٔ پخش پلیر را بزنید.')
      })
    }
  }, [audioUrl])

  useEffect(() => {
    return () => {
      if (audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const playLocalFile = (file: File) => {
    setError('')
    setFilename(file.name)
    setAudioUrl(URL.createObjectURL(file))
  }

  const playSavedAudio = async (publicId: string, name: string) => {
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
      setFilename(name)
      shouldAutoPlayRef.current = true
      setAudioUrl(URL.createObjectURL(blob))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت فایل صوتی.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AudioPlayerContext.Provider value={{ playLocalFile, playSavedAudio }}>
      {children}
      <aside className="global-audio-player" dir="rtl">
        <div className="global-audio-info">
          <span className="global-audio-label">پخش‌کنندهٔ صوتی</span>
          <span className="global-audio-filename" title={filename}>
            {filename || 'هنوز فایلی انتخاب نشده'}
          </span>
          {loading && <span className="global-audio-status">در حال دریافت فایل…</span>}
          {error && <span className="global-audio-status" role="alert">{error}</span>}
        </div>
        <audio ref={audioRef} className="global-audio-controls" controls preload="metadata" src={audioUrl || undefined}>
          مرورگر شما از پخش صوت پشتیبانی نمی‌کند.
        </audio>
      </aside>
    </AudioPlayerContext.Provider>
  )
}
