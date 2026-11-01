import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Languages } from 'lucide-react'
import { useAudioPlayer } from './AudioPlayer'
import './Studio.css'
import StudioHeader from './StudioHeader'
import type { ModelId, ModelsResponse, SpeechToTextModel } from './config/models'
import { useNavigate } from 'react-router-dom'

type Language = 'fa' | 'en'

function Studio() {
  const navigate = useNavigate()
  const { playLocalFile } = useAudioPlayer()
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)
  const [file, setFile] = useState<File | null>(null)
  const [modelName, setModelName] = useState<ModelId>("base")
  const [transcriptionLanguage, setTranscriptionLanguage] = useState<'auto' | 'fa' | 'en'>('auto')
  const [availableModels, setAvailableModels] = useState<SpeechToTextModel[]>([])
  const selectedModel = availableModels.find((model) => model.id === modelName)

  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch('/models')
        if (!response.ok) throw new Error('Failed to load models')

        const data: ModelsResponse = await response.json()
        const category = data.categories.find(
          (item) => item.id === 'speech_to_text' && item.enabled
        )

        const models = category?.models ?? []
        setAvailableModels(models)

        if (models.length > 0 && !models.some((model) => model.id === modelName)) {
          setModelName(models[0].id)
        }
      } catch (error) {
        console.error('Unable to load speech-to-text models:', error)
      }
    }

    loadModels()
  }, [])

  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const modelControlRef = useRef<HTMLDivElement>(null)
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const languageControlRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!modelMenuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!modelControlRef.current?.contains(event.target as Node)) {
        setModelMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModelMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [modelMenuOpen])

  useEffect(() => {
    if (!languageMenuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!languageControlRef.current?.contains(event.target as Node)) {
        setLanguageMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLanguageMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [languageMenuOpen])
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
    cancelTranscription()

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

  const cancelTranscription = () => {
    requestIdRef.current += 1
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setProcessing(false)
  }

  const transcribeFile = async () => {
    if (!file || processing) return

    const controller = new AbortController()
    const requestId = ++requestIdRef.current
    abortControllerRef.current = controller

    setProcessing(true)
    setError('')
    setQuotaExceeded(false)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('model_name', modelName)
      if (transcriptionLanguage !== 'auto') {
        formData.append('language', transcriptionLanguage)
      }

      const token = localStorage.getItem('access_token')
      const response = await fetch('/transcribe', {
        method: 'POST',
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
        body: formData,
        credentials: 'include',
        signal: controller.signal,
      })

      if (requestId !== requestIdRef.current) return

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

      if (requestId === requestIdRef.current) {
        setResult(data)
      }
    } catch (err) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return

      setError(
        err instanceof Error
          ? err.message
          : (fa ? 'خطای نامشخصی رخ داد.' : 'An unexpected error occurred.')
      )
    } finally {
      if (requestId === requestIdRef.current) {
        abortControllerRef.current = null
        setProcessing(false)
      }
    }
  }

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  return (
    <main className={`negar-page ${darkMode ? 'negar-dark' : '' } ${fa ? 'negar-fa' : 'negar-en'}`} dir={fa ? 'rtl' : 'ltr'}>
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
                  cancelTranscription()
                  setFile(null)
                  setError('')
                  setResult(null)
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

          <button className="negar-primary-button negar-file-button" type="button" onClick={() => inputRef.current?.click()}>
            {fa ? 'انتخاب فایل' : 'Choose a file'}
          </button>
          <div className="negar-model-control" ref={modelControlRef}>
            <button
              className={`negar-primary-button negar-model-button negar-selector-button ${modelMenuOpen ? 'is-open' : ''}`}
              type="button"
              disabled={processing}
              aria-label={fa ? 'انتخاب مدل تشخیص گفتار' : 'Select transcription model'}
              aria-expanded={modelMenuOpen}
              aria-haspopup="true"
              onClick={() => {
                setLanguageMenuOpen(false)
                setModelMenuOpen(open => !open)
              }}
            >
              <span className="negar-model-animal" aria-hidden="true">
                {selectedModel?.icon ?? '🎙️'}
              </span>
              <span className="negar-model-content">
                <small>{fa ? 'مدل تشخیص گفتار' : 'SPEECH MODEL'}</small>
                <bdi className="negar-model-label" dir="auto">
                  {selectedModel?.name[fa ? 'fa' : 'en'] ?? modelName}
                </bdi>
              </span>
              <ChevronDown className="negar-model-chevron" aria-hidden="true" />
            </button>
            <div id="negar-model-menu" className="negar-model-menu" hidden={!modelMenuOpen}>
              {availableModels.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  className={`negar-model-option ${modelName === model.id ? 'is-selected' : ''}`}
                  onClick={() => {
                    setModelName(model.id)
                    setModelMenuOpen(false)
                  }}
                >
                  <span className="negar-model-option-main">
                    <span className="negar-model-animal" aria-hidden="true">
                      {model.icon}
                    </span>
                    <bdi dir="auto">{model.name[fa ? 'fa' : 'en']}</bdi>
                  </span>
                  <small>{model.id}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="negar-model-control negar-language-control" ref={languageControlRef}>
            <button
              className={`negar-primary-button negar-model-button negar-language-button ${languageMenuOpen ? 'is-open' : ''}`}
              type="button"
              disabled={processing}
              aria-label={fa ? 'انتخاب زبان فایل صوتی' : 'Select audio language'}
              aria-expanded={languageMenuOpen}
              aria-haspopup="true"
              onClick={() => {
                setModelMenuOpen(false)
                setLanguageMenuOpen(open => !open)
              }}
            >
              <Languages className="negar-language-icon" aria-hidden="true" />
              <span className="negar-language-content">
                <small>{fa ? 'زبان صوت' : 'LANGUAGE'}</small>
                <bdi dir="auto">
                  {transcriptionLanguage === 'auto'
                    ? (fa ? 'تشخیص خودکار' : 'Auto Detect')
                    : transcriptionLanguage === 'fa'
                      ? (fa ? 'فارسی' : 'Persian')
                      : (fa ? 'انگلیسی' : 'English')}
                </bdi>
              </span>
              <ChevronDown className="negar-model-chevron" aria-hidden="true" />
            </button>

            <div
              id="negar-language-menu"
              className="negar-model-menu negar-language-menu"
              hidden={!languageMenuOpen}
            >
              {[
                { id: 'auto', fa: 'تشخیص خودکار', en: 'Auto Detect' },
                { id: 'fa', fa: 'فارسی', en: 'Persian' },
                { id: 'en', fa: 'انگلیسی', en: 'English' },
              ].map((language) => (
                <button
                  key={language.id}
                  type="button"
                  className={`negar-model-option ${transcriptionLanguage === language.id ? 'is-selected' : ''}`}
                  onClick={() => {
                    setTranscriptionLanguage(language.id as 'auto' | 'fa' | 'en')
                    setLanguageMenuOpen(false)
                  }}
                >
                  <bdi dir="auto">{fa ? language.fa : language.en}</bdi>
                </button>
              ))}
            </div>
          </div>

          {file && (
            <button
              className={`negar-primary-button negar-transcribe-button ${processing ? "negar-cancel-button" : ""}`}
              type="button"
              onClick={processing ? cancelTranscription : transcribeFile}
            >
              {processing
                ? (fa ? 'لغو پردازش' : 'Cancel processing')
                : (fa ? 'تبدیل به متن' : 'Transcribe to text')}
              
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
