import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAudioPlayer } from './AudioPlayer'
import StudioHeader from './StudioHeader'
import './FileDetail.css'

type HistoryRecord = {
  id: number | string
  public_id?: string | null
  filename: string
  language?: string | null
  text: string
  created_at?: string
  duration_seconds?: number | null
  mode?: string | null
  segments?: { start: number; end: number; text: string }[]
}

function formatDate(value?: string) {
  if (!value) return 'نامشخص'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatDuration(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return 'نامشخص'
  const total = Math.max(0, Math.floor(value))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export default function FileDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { playSavedAudio, closePlayer } = useAudioPlayer()
  const [record, setRecord] = useState<HistoryRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [lang, setLang] = useState<'fa' | 'en'>('fa')
  const [darkMode, setDarkMode] = useState(
    () => (localStorage.getItem('negar-theme') ?? 'dark') === 'dark',
  )
  const fa = lang === 'fa'

  function toggleTheme() {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('negar-theme', next ? 'dark' : 'light')
  }

  useEffect(() => {
    let cancelled = false

    async function loadRecord() {
      const token = localStorage.getItem('access_token')

      if (!token) {
        navigate('/login', { replace: true })
        return
      }

      try {
        const response = await fetch('/history', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('access_token')
          navigate('/login', { replace: true })
          return
        }

        if (!response.ok) throw new Error('بارگذاری تاریخچه ناموفق بود.')

        const data: unknown = await response.json()
        const records = Array.isArray(data) ? (data as HistoryRecord[]) : []
        const found = records.find((item) => String(item.id) === id)

        if (!cancelled) {
          if (found) setRecord(found)
          else setError('این فایل در تاریخچه پیدا نشد.')
        }
      } catch {
        if (!cancelled) {
          setError('دریافت اطلاعات فایل با خطا مواجه شد. دوباره تلاش کن.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadRecord()
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  useEffect(() => {
    return () => closePlayer()
  }, [closePlayer])

  async function copyTranscript() {
    if (!record?.text) return
    try {
      await navigator.clipboard.writeText(record.text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      className={`file-detail-shell ${darkMode ? 'file-detail-dark' : 'file-detail-light'}`}
      dir={fa ? 'rtl' : 'ltr'}
    >
      <StudioHeader
        title={fa ? 'جزئیات فایل' : 'File details'}
        lang={lang}
        onToggleLanguage={() => setLang(fa ? 'en' : 'fa')}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
      />

      <main className="file-detail-page">
        <div className="file-detail-topbar">
          <Link className="file-detail-back" to="/dashboard">
            <span aria-hidden="true">→</span>
            <span>بازگشت به تاریخچه</span>
          </Link>
          <div className="file-detail-topbar-label">
            <span className="file-detail-status-dot" />
            تاریخچهٔ پیاده‌سازی
          </div>
        </div>

        {loading ? (
          <section className="file-detail-state" aria-live="polite">
            <span className="file-detail-loader" />
            <p>در حال بارگذاری اطلاعات فایل…</p>
          </section>
        ) : error ? (
          <section className="file-detail-state file-detail-error" role="alert">
            <span className="file-detail-state-icon">!</span>
            <h1>بارگذاری انجام نشد</h1>
            <p>{error}</p>
            <Link className="file-detail-primary-link" to="/dashboard">
              بازگشت به تاریخچه
            </Link>
          </section>
        ) : record ? (
          <div className="file-detail-content">
            <section className="file-detail-hero">
              <div className="file-detail-hero-copy">
                <span className="file-detail-eyebrow">
                  <span className="file-detail-eyebrow-mark">S.</span>
                  SHAYAN HUB / TRANSCRIPT
                </span>
                <h1>{record.filename || 'فایل بدون نام'}</h1>
                <p>متن استخراج‌شده از فایل، آمادهٔ مرور و استفادهٔ مجدد است.</p>
              </div>
              <div className="file-detail-file-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none">
                  <path d="M17 7.5h20l12 12V54a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3V10.5a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M37 8v13h12M22 32h20M22 40h20M22 48h13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="file-detail-hero-glow" />
            </section>

            <section className="file-detail-meta" aria-label="اطلاعات فایل">
              <div className="file-detail-meta-card">
                <span className="file-detail-meta-icon">◷</span>
                <div>
                  <span>تاریخ ثبت</span>
                  <strong>{formatDate(record.created_at)}</strong>
                </div>
              </div>
              <div className="file-detail-meta-card">
                <span className="file-detail-meta-icon">◴</span>
                <div>
                  <span>مدت فایل</span>
                  <strong>{formatDuration(record.duration_seconds)}</strong>
                </div>
              </div>
              <div className="file-detail-meta-card">
                <span className="file-detail-meta-icon">文</span>
                <div>
                  <span>زبان تشخیص‌داده‌شده</span>
                  <strong>{record.language || 'نامشخص'}</strong>
                </div>
              </div>
            </section>

            {record.public_id && (
              <section className="file-detail-audio-card">
                <div className="file-detail-audio-symbol" aria-hidden="true">
                  <svg viewBox="0 0 48 48" fill="none">
                    <path d="M8 19v10h8l11 9V10l-11 9H8Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
                    <path d="M33 17a10 10 0 0 1 0 14M37 12a17 17 0 0 1 0 24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="file-detail-audio-copy">
                  <strong>فایل صوتی اصلی</strong>
                  <span>برای شنیدن فایل، پخش‌کننده را باز کن.</span>
                </div>
                <button
                  className="file-detail-play-button"
                  type="button"
                  onClick={() => void playSavedAudio(record.public_id!, record.filename || 'فایل صوتی')}
                >
                  <span className="file-detail-play-icon" aria-hidden="true">▶</span>
                  <span>پخش فایل صوتی</span>
                </button>
              </section>
            )}

            <section className="file-detail-transcript">
              <div className="file-detail-transcript-heading">
                <div>
                  <span className="file-detail-section-kicker">TRANSCRIPTION</span>
                  <h2>متن پیاده‌سازی‌شده</h2>
                  <p>متن کامل خروجی تبدیل گفتار به نوشتار</p>
                </div>
                <button
                  className="file-detail-copy-button"
                  type="button"
                  onClick={() => void copyTranscript()}
                  disabled={!record.text?.trim()}
                >
                  <span aria-hidden="true">{copied ? '✓' : '▢'}</span>
                  {copied ? 'کپی شد' : 'کپی متن'}
                </button>
              </div>

              <div className="file-detail-transcript-body">
                {record.text?.trim() || 'متنی برای این فایل ثبت نشده است.'}
              </div>

              <div className="file-detail-transcript-footer">
                <span><span className="file-detail-status-dot" /> متن ذخیره‌شده</span>
                <span>{record.text?.trim() ? record.text.trim().split(/\s+/).length : 0} کلمه</span>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  )
}
