import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Dashboard.css'
import StudioHeader from './StudioHeader'
import type { ModelsResponse, SpeechToTextModel } from './config/models'

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
    const [history, setHistory] = useState<HistoryRecord[]>([])
  const [models, setModels] = useState<SpeechToTextModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openMenu, setOpenMenu] = useState<string | number | null>(null)


  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [bulkExportOpen, setBulkExportOpen] = useState(false)
  const [filenameTooltip, setFilenameTooltip] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)
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
          throw new Error('account_load_failed')
        }

        if (!historyResponse.ok) {
          throw new Error('history_load_failed')
        }

        const historyData = await historyResponse.json()
        setHistory(Array.isArray(historyData) ? historyData : [])

        try {
          const modelsResponse = await fetch('/models')
          if (modelsResponse.ok) {
            const modelsData: ModelsResponse = await modelsResponse.json()
            const speechToTextCategory = modelsData.categories?.find(
              (category) => category.id === 'speech_to_text',
            )
            setModels(
              speechToTextCategory?.models ??
                modelsData.models?.filter(
                  (model) => model.category_id === 'speech_to_text',
                ) ??
                [],
            )
          }
        } catch {
          setModels([])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'server_connection_failed')
      } finally {
        setLoading(false)
      }
    }

    void loadDashboard()
  }, [navigate])

function formatDate(value?: string) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat(fa ? 'fa-IR' : 'en-US', {
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
      window.alert(fa ? 'زمان‌بندی جمله‌ها ذخیره نشده است؛ خروجی TXT یا JSON را انتخاب کن.' : 'Segment timing is unavailable. Choose TXT or JSON instead.')
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
      window.alert(fa ? 'برای بعضی از فایل‌های انتخاب‌شده زمان‌بندی جمله‌ها موجود نیست. فرمت دیگری انتخاب کن.' : 'Some selected files have no segment timing. Choose another format.')
      return
    }

    const content = (() => {
      if (format === 'txt') {
        return records.map((record) =>
          `===== ${safeFilename(record.filename)} =====\n\n${record.text || ''}`
        ).join('\n\n\n')
      }

      if (format === 'json') {
        return JSON.stringify(records, null, 2)
      }

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

      return format === 'vtt'
        ? `WEBVTT\n\n${blocks.join('\n\n')}\n`
        : `${blocks.join('\n\n')}\n`
    })()
    const mime = format === 'json'
      ? 'application/json;charset=utf-8'
      : 'text/plain;charset=utf-8'

    downloadFile(`negar-export-${records.length}-files.${format}`, content, mime)
    setBulkExportOpen(false)
  }

  const [lang, setLang] = useState<'fa' | 'en'>('fa')
  const [darkMode, setDarkMode] = useState(
    () => (localStorage.getItem('negar-theme') ?? 'light') === 'dark',
  )
  const fa = lang === 'fa'

  const toggleTheme = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('negar-theme', next ? 'dark' : 'light')
  }

  return (
    <main className={`dashboard-page ${darkMode ? "dashboard-dark" : ""}`} dir={fa ? "rtl" : "ltr"}>
      <StudioHeader
        title={fa ? 'داشبورد' : 'Dashboard'}
        lang={lang}
        onToggleLanguage={() => setLang(fa ? "en" : "fa")}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
      />

      <section className="dashboard-content">
        <div className="dashboard-welcome">
          <span className="dashboard-eyebrow">{fa ? "فضای کار شخصی" : "PERSONAL WORKSPACE"}</span>
          <h1>{fa ? 'سلام، خوش برگشتی.' : 'Welcome back.'}</h1>
          <p>{fa ? 'تبدیل‌ها و متن‌های ذخیره‌شده‌ات را از اینجا مدیریت کن.' : 'Manage your transcriptions and saved files in one place.'}</p>
          <Link className="dashboard-primary" to="/studio/negar">
            {fa ? 'شروع تبدیل جدید' : 'New transcription'} <span>↗</span>
          </Link>
        </div>

        <section className="dashboard-history">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-eyebrow">{fa ? "فایل‌های شما" : "YOUR FILES"}</span>
              <h2>{fa ? 'تاریخچهٔ تبدیل‌ها' : 'Transcription history'}</h2>
            </div>
            <span className="dashboard-count">{history.length} {fa ? 'مورد' : history.length === 1 ? 'file' : 'files'}</span>
          </div>

          {loading ? (
            <div className="dashboard-empty">{fa ? 'در حال دریافت اطلاعات حساب…' : 'Loading your account…'}</div>
          ) : error ? (
            <div className="dashboard-empty dashboard-error">
              {fa ? ({ account_load_failed: 'دریافت مشخصات حساب ناموفق بود.', history_load_failed: 'دریافت تاریخچه ناموفق بود.', server_connection_failed: 'خطا در ارتباط با سرور.' } as Record<string, string>)[error] || error : ({ account_load_failed: 'Could not load account details.', history_load_failed: 'Could not load transcription history.', server_connection_failed: 'Could not connect to the server.' } as Record<string, string>)[error] || error}
              <button onClick={() => window.location.reload()}>{fa ? 'تلاش دوباره' : 'Try again'}</button>
            </div>
          ) : history.length === 0 ? (
            <div className="dashboard-empty">
              <span className="dashboard-empty-icon">↗</span>
              <h3>{fa ? 'هنوز تبدیلی ثبت نشده' : 'No transcriptions yet'}</h3>
              <p>{fa ? 'بعد از اولین تبدیل، تاریخچهٔ فایل‌هایت را اینجا می‌بینی.' : 'Your saved transcriptions will appear here after your first upload.'}</p>
              <Link to="/studio/negar">{fa ? 'تبدیل اولین فایل' : 'Transcribe your first file'}</Link>
            </div>
          ) : (
            <>
              {selectedIds.size > 0 && (
                <div className="dashboard-bulk-toolbar">
                  <div className="dashboard-bulk-selection">
                    <span>{selectedIds.size} {fa ? 'مورد انتخاب شده' : 'selected'}</span>

                  </div>
                  <div className="dashboard-bulk-actions">
                    <button
                      type="button"
                      className="dashboard-bulk-delete"
                      title={fa ? "حذف گروهی (هنوز فعال نیست)" : "Bulk delete (not available yet)"}
                      aria-label={fa ? "حذف گروهی؛ هنوز فعال نیست" : "Bulk delete; not available yet"}
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
                      {fa ? 'خروجی گرفتن' : 'Export selected'}
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
                        title={history.length > 0 && selectedIds.size === history.length ? (fa ? 'لغو انتخاب همه' : 'Deselect all') : (fa ? 'انتخاب همه' : 'Select all')}
                        aria-label={history.length > 0 && selectedIds.size === history.length ? (fa ? 'لغو انتخاب همه' : 'Deselect all') : (fa ? 'انتخاب همه' : 'Select all')}
                        aria-pressed={history.length > 0 && selectedIds.size === history.length}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m5 12.5 4.2 4.2L19 7" />
                        </svg>
                      </button>
                      <span className="dashboard-file-column-label">{fa ? 'نام فایل' : 'File name'}</span>
                    </th>
                    <th>{fa ? 'تاریخ بارگذاری' : 'Uploaded'}</th>
                    <th>{fa ? 'مدت فایل' : 'Duration'}</th>
                    <th>{fa ? 'مدل' : 'Model'}</th>
                    <th>{fa ? 'وضعیت' : 'Status'}</th>
                    <th aria-label={fa ? "عملیات" : "Actions"}></th>
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
                      aria-label={fa ? `نمایش متن فایل ${record.filename}` : `View transcription for ${record.filename}`}
                    >
                      <td data-label={fa ? "نام فایل" : "File name"}>
                        <button
                          type="button"
                          className={`dashboard-select-record${selectedIds.has(record.id) ? ' is-selected' : ''}`}
                          aria-label={selectedIds.has(record.id) ? (fa ? 'لغو انتخاب فایل' : 'Deselect file') : (fa ? 'انتخاب فایل' : 'Select file')}
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
                          onMouseEnter={(event) => {
                            const button = event.currentTarget
                            const textElement = button.querySelector('span')
                            if (!textElement || textElement.scrollWidth <= textElement.clientWidth + 1) {
                              setFilenameTooltip(null)
                              return
                            }
                            const rect = button.getBoundingClientRect()
                            setFilenameTooltip({
                              text: (record.filename || (fa ? 'فایل بدون نام' : 'Untitled file')).replace(/\.[^.]+$/, ''),
                              x: rect.left + rect.width / 2,
                              y: rect.top - 8,
                            })
                          }}
                          onMouseLeave={() => setFilenameTooltip(null)}
                          onFocus={(event) => {
                            const button = event.currentTarget
                            const textElement = button.querySelector('span')
                            if (!textElement || textElement.scrollWidth <= textElement.clientWidth + 1) {
                              setFilenameTooltip(null)
                              return
                            }
                            const rect = button.getBoundingClientRect()
                            setFilenameTooltip({
                              text: (record.filename || (fa ? 'فایل بدون نام' : 'Untitled file')).replace(/\.[^.]+$/, ''),
                              x: rect.left + rect.width / 2,
                              y: rect.top - 8,
                            })
                          }}
                          onBlur={() => setFilenameTooltip(null)}
                          onClick={(event) => {
                            event.stopPropagation()
                            navigate(`/dashboard/files/${encodeURIComponent(String(record.id))}`)
                          }}
                        >
                          <span>{(record.filename || (fa ? 'فایل بدون نام' : 'Untitled file')).replace(/\.[^.]+$/, '')}</span>
                        </button>
                      </td>
                      <td data-label={fa ? "تاریخ بارگذاری" : "Uploaded"}>{formatDate(record.created_at)}</td>
                      <td data-label={fa ? "مدت فایل" : "Duration"}>{formatDuration(record.duration_seconds)}</td>
                      <td data-label={fa ? "مدل" : "Model"}>
                        {(() => {
                          const modelId = record.mode?.startsWith('whisper-')
                            ? record.mode.slice('whisper-'.length)
                            : record.mode
                          const model = models.find((item) => item.id === modelId)
                          const modelName = model?.name[fa ? 'fa' : 'en'] ??
                            (fa ? 'مدل نامشخص' : 'Unknown model')
                          const modelIcon = model?.icon ?? '🎙️'

                          return (
                            <button
                              type="button"
                              className="dashboard-model app-tooltip"
                              aria-label={`Whisper ${modelName}`}
                              data-tooltip={`Whisper ${modelName}`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <span aria-hidden="true">{modelIcon}</span>
                            </button>
                          )
                        })()}
                      </td>
                      <td data-label={fa ? "وضعیت" : "Status"}>
                        <span className="dashboard-success">
                          <span aria-hidden="true">✓</span> موفق
                        </span>
                      </td>
                      <td data-label={fa ? "عملیات" : "Actions"} className="dashboard-actions-cell">
                        <button
                          className="dashboard-menu-trigger"
                          aria-label={fa ? `عملیات ${record.filename}` : `Actions for ${record.filename}`}
                          aria-expanded={openMenu === record.id}
                          onClick={(event) => { event.stopPropagation(); setOpenMenu(openMenu === record.id ? null : record.id) }}
                        >
                          ⋯
                        </button>
                        {openMenu === record.id && (
                          <div className="dashboard-export-menu">
                            <button onClick={() => exportRecord(record, 'txt')}>{fa ? 'دانلود متن TXT' : 'Download TXT'}</button>
                            <button onClick={() => exportRecord(record, 'json')}>{fa ? 'دانلود JSON' : 'Download JSON'}</button>
                            <button
                              disabled={!record.segments?.length}
                              onClick={() => exportRecord(record, 'srt')}
                            >{fa ? 'دانلود زیرنویس SRT' : 'Download SRT subtitles'}</button>
                            <button
                              disabled={!record.segments?.length}
                              onClick={() => exportRecord(record, 'vtt')}
                            >{fa ? 'دانلود زیرنویس VTT' : 'Download VTT subtitles'}</button>
                            <button onClick={() => {
                              setOpenMenu(null)
                              navigate(`/dashboard/files/${encodeURIComponent(String(record.id))}`)
                            }}>{fa ? 'نمایش متن' : 'View transcription'}</button>
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
              aria-label={fa ? "بستن پنجره" : "Close dialog"}
              onClick={() => setBulkExportOpen(false)}
            >×</button>
            <span className="dashboard-eyebrow">{fa ? "خروجی گروهی" : "BULK EXPORT"}</span>
            <h2 id="dashboard-bulk-export-title">{fa ? 'خروجی فایل‌های انتخاب‌شده' : 'Export selected files'}</h2>
            <p>{fa ? `${selectedIds.size} رکورد در یک فایل خروجی قرار می‌گیرند.` : `${selectedIds.size} selected files will be included in one export.`}</p>
            <div className="dashboard-modal-formats">
              <button type="button" onClick={() => exportSelected('txt')}>TXT <span>{fa ? 'متن ساده' : 'Plain text'}</span></button>
              <button type="button" onClick={() => exportSelected('json')}>JSON <span>{fa ? 'اطلاعات ساختاریافته' : 'Structured data'}</span></button>
              <button
                type="button"
                disabled={history.filter((record) => selectedIds.has(record.id)).some((record) => !record.segments?.length)}
                onClick={() => exportSelected('srt')}
              >SRT <span>{fa ? 'زیرنویس' : 'Subtitles'}</span></button>
              <button
                type="button"
                disabled={history.filter((record) => selectedIds.has(record.id)).some((record) => !record.segments?.length)}
                onClick={() => exportSelected('vtt')}
              >VTT <span>{fa ? 'زیرنویس وب' : 'Web subtitles'}</span></button>
            </div>
          </section>
        </div>
      )}

      {filenameTooltip && (
        <div
          className="app-tooltip-floating"
          role="tooltip"
          style={{
            left: filenameTooltip.x,
            top: filenameTooltip.y,
          }}
        >
          {filenameTooltip.text}
        </div>
      )}
      <footer className="dashboard-footer">
        NEGAR <span>·</span> {fa ? 'فضای کار شخصی شما' : 'Your personal workspace'}
      </footer>
    </main>
  )
}

export default Dashboard
