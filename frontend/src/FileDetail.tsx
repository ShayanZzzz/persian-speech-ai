import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAudioPlayer } from './AudioPlayer'
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
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export default function FileDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { playSavedAudio } = useAudioPlayer()
  const [record, setRecord] = useState<HistoryRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
        const records = Array.isArray(data) ? data as HistoryRecord[] : []
        const found = records.find((item) => String(item.id) === id)

        if (!cancelled) {
          if (found) setRecord(found)
          else setError('این فایل در تاریخچه پیدا نشد.')
        }
      } catch {
        if (!cancelled) setError('دریافت اطلاعات فایل با خطا مواجه شد. دوباره تلاش کن.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadRecord()
    return () => { cancelled = true }
  }, [id, navigate])

  return (
    <main className="file-detail-page" dir="rtl">
      <header className="file-detail-header">
        <Link className="file-detail-back" to="/dashboard">← بازگشت به تاریخچه</Link>
        <div className="file-detail-brand">Shayan Hub</div>
      </header>

      {loading ? (
        <section className="file-detail-state">در حال بارگذاری فایل…</section>
      ) : error ? (
        <section className="file-detail-state" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => navigate('/dashboard')}>بازگشت به تاریخچه</button>
        </section>
      ) : record ? (
        <section className="file-detail-content">
          <div className="file-detail-eyebrow">متن پیاده‌سازی‌شده</div>
          <h1>{record.filename || 'فایل بدون نام'}</h1>
          {record.public_id != null && (
            <button
              type="button"
              onClick={() => void playSavedAudio(record.public_id!, record.filename || 'فایل صوتی')}
            >
              پخش فایل صوتی
            </button>
          )}

          <div className="file-detail-meta">
            <div><span>تاریخ بارگذاری</span><strong>{formatDate(record.created_at)}</strong></div>
            <div><span>مدت فایل</span><strong>{formatDuration(record.duration_seconds)}</strong></div>
            <div><span>زبان</span><strong>{record.language || 'نامشخص'}</strong></div>
          </div>

          <article className="file-detail-transcript">
            <h2>متن</h2>
            <div className="file-detail-transcript-body">
              {record.text?.trim() || 'متنی برای این فایل ثبت نشده است.'}
            </div>
          </article>
        </section>
      ) : null}
    </main>
  )
}
