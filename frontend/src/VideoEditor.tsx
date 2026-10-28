import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './VideoEditor.css'
import StudioHeader from './StudioHeader'

type Subtitle = {
  id: string
  start: number
  end: number
  text: string
}

type EditorLocationState = {
  file?: File
}

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds || 0)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const secs = Math.floor(safe % 60)
  const millis = Math.floor((safe % 1) * 1000)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`
}

function parseTime(value: string) {
  const parts = value.trim().replace(',', '.').split(':').map(Number)
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}

function safeFilename(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_') || 'subtitles'
}

function downloadText(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function VideoEditor() {
  const location = useLocation()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const state = location.state as EditorLocationState | null
  const [lang, setLang] = useState<'fa' | 'en'>('fa')
  const fa = lang === 'fa'
  const [darkMode, setDarkMode] = useState(
    () => (localStorage.getItem('negar-theme') ?? 'dark') === 'dark'
  )

  const [file, setFile] = useState<File | null>(state?.file ?? null)
  const [videoUrl, setVideoUrl] = useState('')
  const [subtitles, setSubtitles] = useState<Subtitle[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [fontSize, setFontSize] = useState(28)
  const [fontFamily, setFontFamily] = useState('Vazirmatn')
  const [fontColor, setFontColor] = useState('#ffffff')
  const [backgroundColor, setBackgroundColor] = useState('#000000')
  const [position, setPosition] = useState('bottom')
  const [message, setMessage] = useState('')
  const [exportingVideo, setExportingVideo] = useState(false)

  const selected = subtitles.find((item) => item.id === selectedId) ?? null
  const timelineDuration = duration || Math.max(30, ...subtitles.map((item) => item.end))
  const rulerTicks = Array.from(
    { length: Math.floor(timelineDuration / 5) + 1 },
    (_, index) => index * 5,
  )
  if (rulerTicks[rulerTicks.length - 1] < timelineDuration) {
    rulerTicks.push(timelineDuration)
  }
  const activeSubtitle = subtitles.find(
    (item) => currentTime >= item.start && currentTime <= item.end,
  )

  useEffect(() => {
    if (!file) {
      setVideoUrl('')
      return
    }
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed
  }, [speed])

  function chooseFile(next?: File) {
    if (!next) return
    if (!next.type.startsWith('video/')) {
      setMessage(fa ? 'لطفاً یک فایل ویدیویی انتخاب کنید.' : 'Please select a video file.')
      return
    }
    setFile(next)
    setCurrentTime(0)
    setDuration(0)
    setPlaying(false)
    setMessage('')
  }

  function updateSubtitle(id: string, changes: Partial<Subtitle>) {
    setSubtitles((current) =>
      current.map((item) => item.id === id ? { ...item, ...changes } : item),
    )
  }

  function addSubtitle() {
    const start = Math.min(currentTime, duration || currentTime)
    const item: Subtitle = {
      id: crypto.randomUUID(),
      start,
      end: start + 3,
      text: '',
    }
    setSubtitles((current) => [...current, item].sort((a, b) => a.start - b.start))
    setSelectedId(item.id)
  }

  function jumpTo(time: number) {
    const target = Math.max(0, Math.min(time, duration || time))
    if (videoRef.current) videoRef.current.currentTime = target
    setCurrentTime(target)
  }

  function dragSubtitle(
    event: import('react').PointerEvent<HTMLElement>,
    item: Subtitle,
    mode: 'move' | 'start' | 'end',
  ) {
    event.preventDefault()
    event.stopPropagation()

    const timeline = event.currentTarget.closest('.ve-timeline')
    if (!(timeline instanceof HTMLElement)) return

    const rect = timeline.getBoundingClientRect()
    if (!rect.width) return

    const startX = event.clientX
    const originalStart = item.start
    const originalEnd = item.end
    const originalLength = originalEnd - originalStart
    const total = timelineDuration

    setSelectedId(item.id)

    const onMove = (moveEvent: PointerEvent) => {
      const delta = ((moveEvent.clientX - startX) / rect.width) * total

      setSubtitles((current) =>
        current.map((subtitle) => {
          if (subtitle.id !== item.id) return subtitle

          if (mode === 'move') {
            const nextStart = Math.max(
              0,
              Math.min(originalStart + delta, Math.max(0, total - originalLength)),
            )
            return {
              ...subtitle,
              start: nextStart,
              end: nextStart + originalLength,
            }
          }

          if (mode === 'start') {
            return {
              ...subtitle,
              start: Math.max(0, Math.min(originalStart + delta, originalEnd - 0.1)),
            }
          }

          return {
            ...subtitle,
            end: Math.min(total, Math.max(originalStart + 0.1, originalEnd + delta)),
          }
        }),
      )
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  async function togglePlayback() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      try {
        await video.play()
      } catch {
        setMessage(fa ? 'پخش ویدیو آغاز نشد؛ فرمت فایل را بررسی کنید.' : 'Video playback failed. Check the file format.')
      }
    } else {
      video.pause()
    }
  }

  function exportSubtitles(format: 'srt' | 'vtt') {
    const ordered = [...subtitles].sort((a, b) => a.start - b.start)
    const stamp = (time: number) =>
      formatTime(time).replace(',', format === 'vtt' ? '.' : ',')
    const content = format === 'srt'
      ? ordered.map((item, index) =>
          `${index + 1}\n${stamp(item.start)} --> ${stamp(item.end)}\n${item.text}\n`,
        ).join('\n')
      : `WEBVTT\n\n${ordered.map((item) =>
          `${stamp(item.start)} --> ${stamp(item.end)}\n${item.text}\n`,
        ).join('\n')}`

    downloadText(
      `${safeFilename(file?.name ?? 'subtitles')}.${format}`,
      content,
      format === 'srt' ? 'application/x-subrip;charset=utf-8' : 'text/vtt;charset=utf-8',
    )
    setMessage(fa ? `خروجی ${format.toUpperCase()} آماده شد.` : `${format.toUpperCase()} export is ready.`)
  }

  function exportProject() {
    downloadText(
      `${safeFilename(file?.name ?? 'project')}.json`,
      JSON.stringify({
        filename: file?.name ?? null,
        subtitles,
        style: { fontSize, fontFamily, fontColor, backgroundColor, position },
      }, null, 2),
      'application/json;charset=utf-8',
    )
  }


  async function exportVideo() {
    if (!file) {
      setMessage(fa ? 'ابتدا یک فایل ویدیویی انتخاب کنید.' : 'Please select a video file first.')
      return
    }
    if (!subtitles.some((item) => item.text.trim() && item.end > item.start && item.start >= 0)) {
      setMessage(fa ? 'ابتدا دست‌کم یک زیرنویس معتبر اضافه کنید.' : 'Add at least one valid subtitle first.')
      return
    }

    setExportingVideo(true)
    setMessage(fa ? 'در حال ساخت ویدیوی نهایی؛ بسته به طول ویدیو ممکن است زمان ببرد...' : 'Rendering the final video. This may take a while.')

    try {
      const video = videoRef.current
      const player = video?.parentElement

      const previewVideoHeight =
        video && player && video.videoWidth > 0 && video.videoHeight > 0
          ? Math.min(
              player.clientWidth * (video.videoHeight / video.videoWidth),
              player.clientHeight,
            )
          : 0

      const form = new FormData()
      form.append('file', file, file.name)
      form.append('subtitles_json', JSON.stringify(subtitles))
      form.append('style_json', JSON.stringify({
        fontSize,
        fontFamily,
        fontColor,
        backgroundColor,
        position,
        previewVideoHeight,
      }))

      const response = await fetch('/export-video', {
        method: 'POST',
        body: form,
      })

      if (!response.ok) {
        let detail = fa ? 'ساخت ویدیو ناموفق بود.' : 'Video export failed.'
        try {
          const payload = await response.json()
          if (typeof payload.detail === 'string') detail = payload.detail
        } catch {
          // Keep the fallback message if the response is not JSON.
        }
        throw new Error(detail)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${safeFilename(file.name)}-subtitled.mp4`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage(fa ? 'ویدیوی نهایی آماده و دانلود شد.' : 'The final video is ready and downloaded.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (fa ? 'خطا در ساخت ویدیوی نهایی.' : 'An unexpected error occurred while exporting the video.'))
    } finally {
      setExportingVideo(false)
    }
  }

  return (
    <main
      className={`video-editor ${darkMode ? 've-dark' : 've-light'} ${fa ? 've-fa' : 've-en'}`}
      dir={fa ? 'rtl' : 'ltr'}
    >
      <StudioHeader
        title={fa ? 'استودیو تدوین زیرنویس' : 'Subtitle Editing Studio'}
        lang={lang}
        onToggleLanguage={() => setLang(fa ? 'en' : 'fa')}
        darkMode={darkMode}
        onToggleTheme={() => {
          const nextTheme = darkMode ? 'light' : 'dark'
          localStorage.setItem('negar-theme', nextTheme)
          setDarkMode(nextTheme === 'dark')
        }}
      />
      <div className="ve-editor-meta">
        {file && (
          <div className="ve-file-info ve-file-info-header" title={file.name}>
            <strong>{file.name}</strong>
            <span>{(file.size / 1048576).toFixed(1)} مگابایت</span>
          </div>
        )}

      </div>

      <div className="ve-workspace">
        <button
          className="ve-secondary-button ve-back-aligned"
          onClick={() => navigate('/studio')}
        >
          {fa ? 'بازگشت' : 'Back'}
        </button>
        <section className="ve-preview-column">

          <div className="ve-section-heading ve-preview-toolbar">
            <div>
                            <h2>{fa ? 'پیش‌نمایش ویدیو' : 'Video Preview'}</h2>
            </div>

            <div className="ve-preview-actions">
              <button
                className="ve-secondary-button"
                onClick={() => inputRef.current?.click()}
              >
                {fa ? 'انتخاب ویدیو' : 'Select Video'}
              </button>

              <input
                ref={inputRef}
                hidden
                type="file"
                accept="video/*"
                onChange={(event) => chooseFile(event.target.files?.[0])}
              />
            </div>
          </div>



          <div className="ve-player">
            {videoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  playsInline
                  onClick={togglePlayback}
                  onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
                  onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />
                {activeSubtitle && (
                  <div
                    className={`ve-subtitle-overlay ve-position-${position}`}
                    style={{
                      fontSize: `${fontSize}px`,
                      color: fontColor,
                      backgroundColor: `${backgroundColor}bb`,
                      fontFamily,
                    }}
                  >
                    {activeSubtitle.text}
                  </div>
                )}
                <div className="ve-player-controls">
                  <button onClick={() => void togglePlayback()}>
                    {playing ? (fa ? 'توقف موقت' : 'Pause') : (fa ? 'پخش' : 'Play')}
                  </button>
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                  <select
                    aria-label={fa ? 'سرعت پخش' : 'Playback speed'}
                    value={speed}
                    onChange={(event) => setSpeed(Number(event.target.value))}
                  >
                    <option value="0.5">۰٫۵×</option>
                    <option value="0.75">۰٫۷۵×</option>
                    <option value="1">۱×</option>
                    <option value="1.25">۱٫۲۵×</option>
                    <option value="1.5">۱٫۵×</option>
                    <option value="2">۲×</option>
                  </select>
                  <button onClick={() => videoRef.current?.requestFullscreen?.()}>
                    تمام‌صفحه
                  </button>
                </div>
              </>
            ) : (
              <button className="ve-empty-player" onClick={() => inputRef.current?.click()}>
                <span className="ve-play-symbol">▶</span>
                <strong>{fa ? 'ویدیوی خود را انتخاب کنید' : 'Choose a video'}</strong>
                <span>MP4 · MOV · WebM</span>
              </button>
            )}
          </div>





          <section className="ve-panel">
            <div className="ve-section-heading">
              <div>
                                <h2>{fa ? 'تایم‌لاین زیرنویس' : 'Subtitle Timeline'}</h2>
              </div>
              <button className="ve-primary-button" onClick={addSubtitle}>
                + افزودن قطعه
              </button>
            </div>

            <input
              className="ve-seek"
              aria-label={fa ? 'موقعیت ویدیو' : 'Video position'}
              type="range"
              min="0"
              max={Math.max(duration, 0.1)}
              step="0.01"
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => jumpTo(Number(event.target.value))}
            />

            {selected && (
              <div className="ve-selected-timing" dir="ltr">
                <span>{fa ? "شروع" : "Start"} <strong>{formatTime(selected.start)}</strong></span>
                <span>{fa ? "پایان" : "End"} <strong>{formatTime(selected.end)}</strong></span>
                <span>{fa ? "مدت" : "Duration"} <strong>{formatTime(selected.end - selected.start)}</strong></span>
              </div>
            )}

            <div
              className="ve-timeline"
              aria-label={fa ? 'تایم‌لاین زیرنویس' : 'Subtitle timeline'}
              onClick={(event) => {
                if (!duration) return
                const rect = event.currentTarget.getBoundingClientRect()
                if (!rect.width) return
                const ratio = (event.clientX - rect.left) / rect.width
                jumpTo(ratio * duration)
              }}
            >
              <div className="ve-time-ruler" aria-hidden="true">
                {rulerTicks.map((tick) => (
                  <div
                    key={tick}
                    className="ve-time-tick"
                    style={{ left: `${(tick / timelineDuration) * 100}%` }}
                  >
                    <span
                      className="ve-time-label"
                      style={{
                        transform:
                          tick === 0
                            ? 'translateX(0)'
                            : tick === timelineDuration
                              ? 'translateX(-100%)'
                              : 'translateX(-50%)',
                      }}
                    >
                      {formatTime(tick)}
                    </span>
                  </div>
                ))}
              </div>

              {subtitles.length === 0 && (
                <p className="ve-empty-note ve-timeline-empty">
                  {fa ? 'برای شروع، یک قطعهٔ زیرنویس اضافه کنید.' : 'Add a subtitle to get started.'}
                </p>
              )}

              {subtitles.map((item) => {
                const left = Math.max(0, (item.start / timelineDuration) * 100)
                const width = Math.max(
                  0.2,
                  ((item.end - item.start) / timelineDuration) * 100,
                )

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`ve-timeline-clip${selectedId === item.id ? ' is-selected' : ''}`}
                    style={{
                      left: `${left}%`,
                      width: `${Math.min(width, 100 - left)}%`,
                    }}
                    onPointerDown={(event) => dragSubtitle(event, item, 'move')}
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelectedId(item.id)
                    }}
                    title={`${formatTime(item.start)} – ${formatTime(item.end)} | ${item.text || (fa ? 'قطعهٔ بدون متن' : 'Untitled subtitle')}`}
                  >
                    <span
                      className="ve-resize-handle"
                      aria-label={fa ? 'تغییر زمان شروع' : 'Adjust start time'}
                      onPointerDown={(event) => dragSubtitle(event, item, 'start')}
                    />
                    <span className="ve-clip-label">
                      {item.text || (fa ? 'بدون متن' : 'No text')}
                    </span>
                    <span
                      className="ve-resize-handle"
                      aria-label={fa ? 'تغییر زمان پایان' : 'Adjust end time'}
                      onPointerDown={(event) => dragSubtitle(event, item, 'end')}
                    />
                  </button>
                )
              })}

              <div
                className="ve-playhead"
                style={{
                  left: `${Math.min(100, Math.max(0, (currentTime / timelineDuration) * 100))}%`,
                }}
                aria-hidden="true"
              />
            </div>
          </section>
        </section>

        <aside className="ve-sidebar">
          <section className="ve-panel">
                        <h2>{fa ? 'ویرایش زیرنویس' : 'Edit Subtitle'}</h2>
            {selected ? (
              <>
                <label className="ve-field">
                  {fa ? 'متن زیرنویس' : 'Subtitle text'}
                  <textarea
                    rows={4}
                    value={selected.text}
                    onChange={(event) => updateSubtitle(selected.id, { text: event.target.value })}
                  />
                </label>
                <label className="ve-field">
                  {fa ? 'زمان شروع (ساعت:دقیقه:ثانیه،میلی‌ثانیه)' : 'Start time (HH:MM:SS,mmm)'}
                  <input
                    dir="ltr"
                    value={formatTime(selected.start)}
                    onChange={(event) => updateSubtitle(selected.id, { start: parseTime(event.target.value) })}
                  />
                </label>
                <label className="ve-field">
                  {fa ? 'زمان پایان' : 'End time'}
                  <input
                    dir="ltr"
                    value={formatTime(selected.end)}
                    onChange={(event) => updateSubtitle(selected.id, { end: Math.max(selected.start, parseTime(event.target.value)) })}
                  />
                </label>
                <button
                  className="ve-danger-button"
                  onClick={() => {
                    setSubtitles((current) => current.filter((item) => item.id !== selected.id))
                    setSelectedId(null)
                  }}
                >
                  حذف قطعه
                </button>
              </>
            ) : (
              <p className="ve-empty-note">{fa ? 'یک قطعه را از تایم‌لاین انتخاب کنید یا قطعهٔ جدید بسازید.' : 'Select a timeline item or create a new subtitle.'}</p>
            )}
          </section>

          <section className="ve-panel">
                        <h2>{fa ? 'ظاهر زیرنویس' : 'Subtitle Appearance'}</h2>
            <label className="ve-field">
              {fa ? 'قلم' : 'Font'}
              <select value={fontFamily} onChange={(event) => setFontFamily(event.target.value)}>
                <option value="Vazirmatn">{fa ? 'وزیرمتن' : 'Vazirmatn'}</option>
                <option value="Arial">Arial</option>
                <option value="Tahoma">Tahoma</option>
                <option value="sans-serif">Sans-serif</option>
              </select>
            </label>
            <label className="ve-field">
              {fa ? 'اندازهٔ قلم' : 'Font size'}: {fontSize}px
              <input type="range" min="14" max="56" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} />
            </label>
            <div className="ve-color-row">
              <label>{fa ? 'رنگ متن' : 'Text color'} <input type="color" value={fontColor} onChange={(event) => setFontColor(event.target.value)} /></label>
              <label>{fa ? 'پس‌زمینه' : 'Background'} <input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} /></label>
            </div>
            <label className="ve-field">
              {fa ? 'جایگاه زیرنویس' : 'Subtitle position'}
              <select value={position} onChange={(event) => setPosition(event.target.value)}>
                <option value="bottom">{fa ? 'پایین' : 'Bottom'}</option>
                <option value="middle">{fa ? 'وسط' : 'Middle'}</option>
                <option value="top">{fa ? 'بالا' : 'Top'}</option>
              </select>
            </label>
          </section>

          <section className="ve-panel">
                        <h2>{fa ? 'خروجی' : 'Export'}</h2>
            <p className="ve-export-note">
              {fa ? 'زیرنویس‌ها را دائماً روی تصویر رندر و ویدیوی MP4 نهایی را دانلود کنید.' : 'Burn subtitles into the video and download the final MP4.'}
            </p>
            <button
              className="ve-primary-button ve-full-button"
              onClick={exportVideo}
              disabled={!file || exportingVideo}
            >
              {exportingVideo ? (fa ? 'در حال ساخت ویدیو...' : 'Rendering video...') : (fa ? 'دانلود MP4 با زیرنویس' : 'Download MP4 with Subtitles')}
            </button>
            <button className="ve-primary-button ve-full-button" onClick={() => exportSubtitles('srt')}>
              دانلود SRT
            </button>
            <button className="ve-secondary-button ve-full-button" onClick={() => exportSubtitles('vtt')}>
              دانلود VTT
            </button>
            <button className="ve-secondary-button ve-full-button" onClick={exportProject}>
              ذخیرهٔ تنظیمات پروژه
            </button>
            {message && <p className="ve-message" role="status">{message}</p>}
          </section>
        </aside>
      </div>
    </main>
  )
}
