import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Dashboard.css'

type User = {
  id: number | string
  email: string
  created_at?: string
  duration_seconds?: number | null
  mode?: string | null
  segments?: { start: number; end: number; text: string }[]
}

type HistoryRecord = {
  id: number | string
  filename: string
  language?: string | null
  text: string
  created_at?: string
  duration_seconds?: number | null
  mode?: string | null
  segments?: { start: number; end: number; text: string }[]
}

function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openMenu, setOpenMenu] = useState<string | number | null>(null)


  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [bulkExportOpen, setBulkExportOpen] = useState(false)
useEffect(() => {
    if (openMenu === null) return

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Element)) return

      if (
        target.closest('.dashboard-export-menu') ||
        target.closest('.dashboard-menu-trigger')
      ) {
        return
      }

      setOpenMenu(null)
    }

    document.addEventListener('click', handleOutsideClick)
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [openMenu])

  useEffect(() => {
    const currentIds = new Set(history.map((record) => record.id))
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => currentIds.has(id)))
      return next.size === current.size ? current : next
    })
  }, [history])

  useEffect(() => {
    const token = localStorage.getItem('access_token')

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    const headers = { Authorization: `Bearer ${token}` }

    async function loadDashboard() {
      try {
        const [userResponse, historyResponse] = await Promise.all([
          fetch('/me', { headers }),
          fetch('/history', { headers }),
        ])

        if (userResponse.status === 401 || historyResponse.status === 401) {
          localStorage.removeItem('access_token')
          navigate('/login', { replace: true })
          return
        }

        if (!userResponse.ok) {
          throw new Error('دریافت مشخصات حساب ناموفق بود.')
        }

        if (!historyResponse.ok) {
          throw new Error('دریافت تاریخچه ناموفق بود.')
        }

        const userData = await userResponse.json()
        const historyData = await historyResponse.json()

        setUser(userData)
        setHistory(Array.isArray(historyData) ? historyData : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در ارتباط با سرور.')
      } finally {
        setLoading(false)
      }
    }

    void loadDashboard()
  }, [navigate])

  function logout() {
    localStorage.removeItem('access_token')
    navigate('/login', { replace: true })
  }

  function formatDate(value?: string) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat('fa-IR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }


  function formatDuration(value?: number | null) {
    if (value == null || !Number.isFinite(value) || value < 0) return '—'
    const total = Math.floor(value)
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const seconds = total % 60
    return hours
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  function safeFilename(filename: string) {
    return filename.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_') || 'transcript'
  }

  function downloadFile(filename: string, content: string, mime: string) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function exportRecord(record: HistoryRecord, format: 'txt' | 'json' | 'srt' | 'vtt') {
    const name = safeFilename(record.filename)
    const segments = record.segments || []

    if ((format === 'srt' || format === 'vtt') && segments.length === 0) {
      window.alert('برای این تبدیل، زمان‌بندی جمله‌ها ذخیره نشده است؛ خروجی TXT یا JSON را انتخاب کن.')
      return
    }

    let content: string

    if (format === 'txt') {
      content = record.text || ''
    } else if (format === 'json') {
      content = JSON.stringify(record, null, 2)
    } else {
      const timecode = (seconds: number, vtt: boolean) => {
        const ms = Math.max(0, Math.floor(seconds * 1000))
        const h = Math.floor(ms / 3600000)
        const m = Math.floor((ms % 3600000) / 60000)
        const sec = Math.floor((ms % 60000) / 1000)
        const milli = ms % 1000
        const base = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
        return `${base}${vtt ? '.' : ','}${String(milli).padStart(3, '0')}`
      }

      const body = segments.map((segment, index) => {
        const start = timecode(segment.start, format === 'vtt')
        const end = timecode(segment.end, format === 'vtt')
        const number = format === 'srt' ? `${index + 1}\n` : ''
        return `${number}${start} --> ${end}\n${(segment.text || '').trim()}`
      }).join('\n\n')

      content = format === 'vtt' ? `WEBVTT\n\n${body}\n` : `${body}\n`
    }

    const mime = format === 'json'
      ? 'application/json;charset=utf-8'
      : 'text/plain;charset=utf-8'

    downloadFile(`${name}.${format}`, content, mime)
    setOpenMenu(null)
  }


  function toggleSelected(id: string | number) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds((current) =>
      history.length > 0 && current.size === history.length
        ? new Set()
        : new Set(history.map((record) => record.id))
    )
  }

  function exportSelected(format: 'txt' | 'json' | 'srt' | 'vtt') {
    const records = history.filter((record) => selectedIds.has(record.id))
    if (!records.length) return

    if ((format === 'srt' || format === 'vtt') &&
        records.some((record) => !record.segments?.length)) {
      window.alert('برای بعضی از رکوردهای انتخاب‌شده، زمان‌بندی جمله‌ها موجود نیست. فرمت دیگری انتخاب کن.')
      return
    }

    let content = ''

    if (format === 'txt') {
      content = records.map((record) =>
        `===== ${safeFilename(record.filename)} =====\n\n${record.text || ''}`
      ).join('\n\n\n')
    } else if (format === 'json') {
      content = JSON.stringify(records, null, 2)
    } else {
      const timecode = (seconds: number, vtt: boolean) => {
        const ms = Math.max(0, Math.floor(seconds * 1000))
        const h = Math.floor(ms / 3600000)
        const m = Math.floor((ms % 3600000) / 60000)
        const sec = Math.floor((ms % 60000) / 1000)
        const milli = ms % 1000
        const base = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
        return `${base}${vtt ? '.' : ','}${String(milli).padStart(3, '0')}`
      }

      let index = 0
      const blocks = records.flatMap((record) =>
        (record.segments || []).map((segment) => {
          index += 1
          const start = timecode(segment.start, format === 'vtt')
          const end = timecode(segment.end, format === 'vtt')
          const number = format === 'srt' ? `${index}\n` : ''
          return `${number}${start} --> ${end}\n${(segment.text || '').trim()}`
        })
      )
      content = format === 'vtt'
        ? `WEBVTT\n\n${blocks.join('\n\n')}\n`
        : `${blocks.join('\n\n')}\n`
    }

    const mime = format === 'json'
      ? 'application/json;charset=utf-8'
      : 'text/plain;charset=utf-8'

    downloadFile(`negar-export-${records.length}-files.${format}`, content, mime)
    setBulkExportOpen(false)
  }

  return (
    <main className="dashboard-page" dir="rtl">
      <header className="dashboard-header">
        <Link className="dashboard-brand" to="/">
          <span className="dashboard-brand-mark">N<span>.</span></span>
          <span>NEGAR</span>
        </Link>

        <div className="dashboard-account">
          <div className="dashboard-avatar">
            {user?.email?.charAt(0).toUpperCase() || '؟'}
          </div>
          <div className="dashboard-account-info">
            <strong>{user?.email || 'حساب کاربری'}</strong>
            <span>حساب ثبت‌نام‌شده</span>
          </div>
          <button className="dashboard-logout" onClick={logout}>
            خروج
          </button>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="dashboard-welcome">
          <span className="dashboard-eyebrow">فضای کار شخصی</span>
          <h1>سلام، خوش برگشتی.</h1>
          <p>تبدیل‌ها و متن‌های ذخیره‌شده‌ات را از اینجا مدیریت کن.</p>
          <Link className="dashboard-primary" to="/studio/negar">
            شروع تبدیل جدید <span>↗</span>
          </Link>
        </div>

        <section className="dashboard-history">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-eyebrow">فایل‌های شما</span>
              <h2>تاریخچهٔ تبدیل‌ها</h2>
            </div>
            <span className="dashboard-count">{history.length} مورد</span>
          </div>

          {loading ? (
            <div className="dashboard-empty">در حال دریافت اطلاعات حساب…</div>
          ) : error ? (
            <div className="dashboard-empty dashboard-error">
              {error}
              <button onClick={() => window.location.reload()}>تلاش دوباره</button>
            </div>
          ) : history.length === 0 ? (
            <div className="dashboard-empty">
              <span className="dashboard-empty-icon">↗</span>
              <h3>هنوز تبدیلی ثبت نشده</h3>
              <p>بعد از اولین تبدیل، تاریخچهٔ فایل‌هایت را اینجا می‌بینی.</p>
              <Link to="/studio/negar">تبدیل اولین فایل</Link>
            </div>
          ) : (
            <>
              {selectedIds.size > 0 && (
                <div className="dashboard-bulk-toolbar">
                  <div className="dashboard-bulk-selection">
                    <span>{selectedIds.size} مورد انتخاب شده</span>

                  </div>
                  <div className="dashboard-bulk-actions">
                    <button
                      type="button"
                      className="dashboard-bulk-delete"
                      title="حذف گروهی (هنوز فعال نیست)"
                      aria-label="حذف گروهی؛ هنوز فعال نیست"
                      disabled
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="dashboard-bulk-export"
                      onClick={() => setBulkExportOpen(true)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 3v12m-4-4 4 4 4-4M5 17v3h14v-3" />
                      </svg>
                      خروجی گرفتن
                    </button>
                  </div>
                </div>
              )}
              <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>
                      <button
                        type="button"
                        className={`dashboard-select-record${history.length > 0 && selectedIds.size === history.length ? ' is-selected' : ''}`}
                        onClick={toggleSelectAll}
                        title={history.length > 0 && selectedIds.size === history.length ? 'لغو انتخاب همه' : 'انتخاب همه'}
                        aria-label={history.length > 0 && selectedIds.size === history.length ? 'لغو انتخاب همه' : 'انتخاب همه'}
                        aria-pressed={history.length > 0 && selectedIds.size === history.length}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m5 12.5 4.2 4.2L19 7" />
                        </svg>
                      </button>
                      <span style={{ marginRight: '24px' }}>نام فایل</span>
                    </th>
                    <th>تاریخ بارگذاری</th>
                    <th>مدت فایل</th>
                    <th>مدل</th>
                    <th>وضعیت</th>
                    <th aria-label="عملیات"></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr
                      key={record.id}
                      className="dashboard-file-row"
                      onClick={(event) => {
                        if ((event.target as HTMLElement).closest('button, a, input, select, textarea')) return
                        navigate(`/dashboard/files/${encodeURIComponent(String(record.id))}`)
                      }}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          navigate(`/dashboard/files/${encodeURIComponent(String(record.id))}`)
                        }
                      }}
                      tabIndex={0}
                      aria-label={`نمایش متن فایل ${record.filename}`}
                    >
                      <td data-label="نام فایل">
                        <button
                          type="button"
                          className={`dashboard-select-record${selectedIds.has(record.id) ? ' is-selected' : ''}`}
                          aria-label={selectedIds.has(record.id) ? 'لغو انتخاب فایل' : 'انتخاب فایل'}
                          aria-pressed={selectedIds.has(record.id)}
                          onClick={(event) => { event.stopPropagation(); toggleSelected(record.id) }}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="m5 12.5 4.2 4.2L19 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="dashboard-filename"
                          onClick={(event) => {
                            event.stopPropagation()
                            navigate(`/dashboard/files/${encodeURIComponent(String(record.id))}`)
                          }}
                        >
                          <span>{(record.filename || 'فایل بدون نام').replace(/\.[^.]+$/, '')}</span>
                        </button>
                      </td>
                      <td data-label="تاریخ بارگذاری">{formatDate(record.created_at)}</td>
                      <td data-label="مدت فایل">{formatDuration(record.duration_seconds)}</td>
                      <td data-label="مدل">
                        <span className="dashboard-model" title="Whisper Base">
                          <span aria-hidden="true">🐋</span> Whisper Base
                        </span>
                      </td>
                      <td data-label="وضعیت">
                        <span className="dashboard-success">
                          <span aria-hidden="true">✓</span> موفق
                        </span>
                      </td>
                      <td data-label="عملیات" className="dashboard-actions-cell">
                        <button
                          className="dashboard-menu-trigger"
                          aria-label={`عملیات ${record.filename}`}
                          aria-expanded={openMenu === record.id}
                          onClick={(event) => { event.stopPropagation(); setOpenMenu(openMenu === record.id ? null : record.id) }}
                        >
                          ⋯
                        </button>
                        {openMenu === record.id && (
                          <div className="dashboard-export-menu">
                            <button onClick={() => exportRecord(record, 'txt')}>دانلود متن TXT</button>
                            <button onClick={() => exportRecord(record, 'json')}>دانلود JSON</button>
                            <button
                              disabled={!record.segments?.length}
                              onClick={() => exportRecord(record, 'srt')}
                            >دانلود زیرنویس SRT</button>
                            <button
                              disabled={!record.segments?.length}
                              onClick={() => exportRecord(record, 'vtt')}
                            >دانلود زیرنویس VTT</button>
                            <button onClick={() => {
                              setOpenMenu(null)
                              navigate(`/dashboard/files/${encodeURIComponent(String(record.id))}`)
                            }}>نمایش متن</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>
      </section>

      {bulkExportOpen && (
        <div
          className="dashboard-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setBulkExportOpen(false)
          }}
        >
          <section
            className="dashboard-export-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-bulk-export-title"
          >
            <button
              type="button"
              className="dashboard-modal-close"
              aria-label="بستن پنجره"
              onClick={() => setBulkExportOpen(false)}
            >×</button>
            <span className="dashboard-eyebrow">خروجی گروهی</span>
            <h2 id="dashboard-bulk-export-title">خروجی فایل‌های انتخاب‌شده</h2>
            <p>{selectedIds.size} رکورد در یک فایل خروجی قرار می‌گیرند.</p>
            <div className="dashboard-modal-formats">
              <button type="button" onClick={() => exportSelected('txt')}>TXT <span>متن ساده</span></button>
              <button type="button" onClick={() => exportSelected('json')}>JSON <span>اطلاعات ساختاریافته</span></button>
              <button
                type="button"
                disabled={history.filter((record) => selectedIds.has(record.id)).some((record) => !record.segments?.length)}
                onClick={() => exportSelected('srt')}
              >SRT <span>زیرنویس</span></button>
              <button
                type="button"
                disabled={history.filter((record) => selectedIds.has(record.id)).some((record) => !record.segments?.length)}
                onClick={() => exportSelected('vtt')}
              >VTT <span>زیرنویس وب</span></button>
            </div>
          </section>
        </div>
      )}

      <footer className="dashboard-footer">
        NEGAR <span>·</span> فضای کار شخصی شما
      </footer>
    </main>
  )
}

export default Dashboard
