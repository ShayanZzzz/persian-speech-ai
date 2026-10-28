import { useRef, useState } from 'react'
import { useAudioPlayer } from './AudioPlayer'
import './Studio.css'
import StudioHeader from './StudioHeader'
import { useNavigate } from 'react-router-dom'

type Language = 'fa' | 'en'

function Studio() {
  const navigate = useNavigate()
  const { playLocalFile } = useAudioPlayer()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [lang, setLang] = useState<Language>('fa')
  const [darkMode, setDarkMode] = useState(
    () => (localStorage.getItem('negar-theme') ?? 'dark') === 'dark'
  )
  const fa = lang === 'fa'
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [quotaExceeded, setQuotaExceeded] = useState(false)
  const [result, setResult] = useState<{ text: string; language?: string; files_remaining?: number } | null>(null)

  const acceptFile = (selectedFile?: File) => {
    if (!selectedFile) return

    const isVideo =
      selectedFile.type.startsWith('video/') ||
      /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(selectedFile.name)

    if (isVideo) {
      navigate('/studio/video', { state: { file: selectedFile } })
      return
    }

    setFile(selectedFile)
    playLocalFile(selectedFile)
    setError('')
    setResult(null)
  }

  const transcribeFile = async () => {
    if (!file || processing) return

    setProcessing(true)
    setError('')
    setQuotaExceeded(false)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('access_token')

      const response = await fetch('/transcribe', {
        method: 'POST',
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
        body: formData,
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 429) {
          setQuotaExceeded(true)
          throw new Error(
            fa
              ? 'سهمیهٔ سه فایل رایگان شما تمام شده است. برای ادامه، حساب کاربری بسازید.'
              : 'You have used all 3 free files. Create an account to continue.'
          )
        }
        const message =
          typeof data.detail === 'string'
            ? data.detail
            : (fa ? 'تبدیل فایل انجام نشد.' : 'Transcription failed.')
        throw new Error(message)
      }

      setResult(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : (fa ? 'خطای نامشخصی رخ داد.' : 'An unexpected error occurred.')
      )
    } finally {
      setProcessing(false)
    }
  }

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  return (
    <main className={`negar-page ${fa ? 'negar-fa' : 'negar-en'}`} dir={fa ? 'rtl' : 'ltr'}>
      <StudioHeader
        title={fa ? 'گفتار به متن' : 'Speech to text'}
        lang={lang}
        onToggleLanguage={() => setLang(fa ? 'en' : 'fa')}
        darkMode={darkMode}
        onToggleTheme={() => {
          const nextTheme = darkMode ? 'light' : 'dark'
          localStorage.setItem('negar-theme', nextTheme)
          setDarkMode(nextTheme === 'dark')
        }}
      />

      <section className="negar-main">
        <div className="negar-intro">
          <div className="negar-eyebrow">
            <span className="negar-live-dot" />
            {fa ? 'استودیو رسانه · ۰۱' : 'MEDIA STUDIO · 01'}
          </div>

          <h1>{fa ? <>با <span>نگار</span> آشنا شو.</> : <>Meet <span>Negar.</span></>}</h1>

          <p className="negar-subtitle">
            {fa
              ? <>صدا و ویدیوت را به متن تبدیل کن.<br />ساده، سریع و آماده‌ی ویرایش.</>
              : <>Turn your audio and video into text.<br />Simple, fast, and ready to edit.</>}
          </p>

          <div className="negar-benefits">
            <span>↗ {fa ? 'شروع بدون ثبت‌نام' : 'No account to get started'}</span>
            <span>↗ {fa ? 'فایل صوتی و ویدیویی' : 'Audio and video'}</span>
            <span>↗ {fa ? 'خروجی متن و زیرنویس' : 'Text and subtitle exports'}</span>
          </div>
        </div>

        <section
          className={`negar-upload ${dragging ? 'is-dragging' : ''}`}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            acceptFile(event.dataTransfer.files[0])
          }}
        >
          <input
            ref={inputRef}
            className="negar-file-input"
            type="file"
            accept="audio/*,video/*,.mp3,.wav,.m4a,.mp4,.mov,.webm"
            onChange={(event) => acceptFile(event.target.files?.[0])}
          />

          {file ? (
            <div className="negar-selected-file">
              <div className="negar-file-icon">♫</div>
              <div className="negar-file-details">
                <strong>{file.name}</strong>
                <span>{formatSize(file.size)} · {fa ? 'آماده‌ی پردازش' : 'Ready to process'}</span>
              </div>
              <button
                className="negar-remove-file"
                type="button"
                onClick={() => {
                  setFile(null)
                  if (inputRef.current) inputRef.current.value = ''
                }}
                aria-label={fa ? 'حذف فایل انتخاب‌شده' : 'Remove selected file'}
              >
                ×
              </button>
            </div>
          ) : (
            <>
              <div className="negar-upload-icon">
                <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
                  <path d="M24 31V8m0 0-9 9m9-9 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 28v9a3 3 0 0 0 3 3h22a3 3 0 0 0 3-3v-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h2>{fa ? 'فایل را اینجا رها کن' : 'Drop your file here'}</h2>
              <p>{fa ? 'صوت یا ویدیو؛ ادامه‌ی کار با نگار.' : "Audio or video. We'll take it from here."}</p>
            </>
          )}

          <button className="negar-primary-button" type="button" onClick={() => inputRef.current?.click()}>
            {fa ? 'انتخاب فایل' : 'Choose a file'} <span aria-hidden="true">{fa ? '↖' : '↗'}</span>
          </button>

          {file && (
            <button
              className="negar-primary-button"
              type="button"
              disabled={processing}
              onClick={transcribeFile}
            >
              {processing
                ? (fa ? 'در حال تبدیل…' : 'Transcribing…')
                : (fa ? 'تبدیل به متن' : 'Transcribe to text')}
              {!processing && <span aria-hidden="true">↗</span>}
            </button>
          )}

          <div className="negar-upload-foot">
            <span>MP3 · WAV · M4A · MP4 · MOV</span>
            <span>{fa ? 'فایل را متناسب با محدودیت سرویس انتخاب کن' : 'Choose a file up to your service limit'}</span>
          </div>
        </section>

        {(error || result) && (
          <section className="negar-result" aria-live="polite">
            {error && <p role="alert">{error}</p>}
            {quotaExceeded && (
              <a className="negar-register-link" href="/login">
                {fa ? 'ورود / ساخت حساب کاربری' : 'Sign in / Create account'} ↗
              </a>
            )}
            {result && (
              <>
                <h2>{fa ? 'متن تبدیل‌شده' : 'Transcription result'}</h2>
                {result.language && (
                  <p>
                    {fa ? 'زبان تشخیص‌داده‌شده: ' : 'Detected language: '}
                    {result.language}
                  </p>
                )}
                <textarea
                  aria-label={fa ? 'متن تبدیل‌شده' : 'Transcribed text'}
                  readOnly
                  value={result.text || ''}
                  rows={8}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                />
                {typeof result.files_remaining === 'number' && (
                  <p>
                    {fa ? 'فایل رایگان باقی‌مانده: ' : 'Free files remaining: '}
                    {result.files_remaining}
                  </p>
                )}
              </>
            )}
          </section>
        )}

        <div className="negar-free-plan">
          <div className="negar-free-copy">
            <span className="negar-free-label">{fa ? 'طرح رایگان شما' : 'YOUR FREE PLAN'}</span>
            <strong>{fa ? 'سه فایل رایگان برای شروع.' : 'Three free files to get started.'}</strong>
            <p>{fa ? 'بدون حساب شروع کن؛ برای امکانات بیشتر وارد حساب شو.' : "Start without an account. Sign in when you're ready for more."}</p>
          </div>
          <div className="negar-quota" aria-label={fa ? 'سه فایل رایگان در کل' : 'Three free files in total'}>
            <span className="negar-quota-number">۰۳</span>
            <span className="negar-quota-label">{fa ? 'فایل در کل' : 'FILES TOTAL'}</span>
          </div>
        </div>

        <footer className="negar-footer">
          <span>{fa ? 'نگار / تبدیل گفتار به متن' : 'NEGAR / SPEECH TO TEXT'}</span>
          <span>{fa ? 'برای شیوه‌ی کار تو ساخته شده' : 'MADE FOR THE WAY YOU WORK.'}</span>
        </footer>
      </section>
    </main>
  )
}

export default Studio
