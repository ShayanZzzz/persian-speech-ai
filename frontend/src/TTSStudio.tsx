import { useEffect, useState } from 'react'
import StudioHeader from './StudioHeader'
import './TTSStudio.css'

type Language = 'fa' | 'en'
type Theme = 'light' | 'dark'

type TTSVoice = {
  id: string
  name: string
  language: string
}

type VoiceProfile = {
  id: number
  name: string
  status: string
  created_at: string
}

function TTSStudio() {
  const [lang, setLang] = useState<Language>('fa')
  const [textLanguage, setTextLanguage] = useState<Language>('en')
  const [darkMode, setDarkMode] = useState(
    () => (localStorage.getItem('negar-theme') ?? 'dark') === 'dark',
  )
  const [text, setText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [generatedFilename, setGeneratedFilename] = useState('speech.wav')
  const [audioSize, setAudioSize] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [voices, setVoices] = useState<TTSVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState('alba')
  const [voicesLoading, setVoicesLoading] = useState(true)
  const [voicesError, setVoicesError] = useState('')
  const [voicesRetry, setVoicesRetry] = useState(0)
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([])
  const [voiceProfilesOpen, setVoiceProfilesOpen] = useState(false)
  const [voiceProfilesLoading, setVoiceProfilesLoading] = useState(false)
  const [voiceProfilesError, setVoiceProfilesError] = useState('')
  const [newProfileName, setNewProfileName] = useState('')
  const [newProfileFile, setNewProfileFile] = useState<File | null>(null)
  const [profileConsent, setProfileConsent] = useState(false)
  const [profileUploading, setProfileUploading] = useState(false)
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null)
  const [editingProfileName, setEditingProfileName] = useState("")
  const [profileActionId, setProfileActionId] = useState<number | null>(null)

  useEffect(() => {
    let active = true

    async function loadVoices() {
      try {
        const response = await fetch('/tts/voices')
        if (!response.ok) throw new Error('Failed to load voices')

        const data: { voices: TTSVoice[] } = await response.json()
        if (!active) return

        const availableVoices = Array.isArray(data.voices)
          ? data.voices.filter((voice) => voice.language === 'en')
          : []

        setVoices(availableVoices)
        setSelectedVoice(
          availableVoices.some((voice) => voice.id === 'alba')
            ? 'alba'
            : availableVoices[0]?.id ?? '',
        )
      } catch {
        if (active) setVoicesError('بارگذاری فهرست صداها ناموفق بود.')
      } finally {
        if (active) setVoicesLoading(false)
      }
    }

    setVoicesLoading(true)
    setVoicesError("")
    loadVoices()

    return () => {
      active = false
    }
  }, [voicesRetry])

  useEffect(() => {
    const token = localStorage.getItem('access_token')

    if (!token) {
      setVoiceProfiles([])
      return
    }

    let active = true

    async function loadVoiceProfiles() {
      setVoiceProfilesLoading(true)
      setVoiceProfilesError('')

      try {
        const response = await fetch('/voice-profiles', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('نشست ورود معتبر نیست؛ دوباره وارد حساب کاربری شو.')
          }
          throw new Error('دریافت پروفایل‌های صدا ناموفق بود.')
        }

        const data: { voice_profiles: VoiceProfile[] } = await response.json()

        if (active) {
          setVoiceProfiles(
            Array.isArray(data.voice_profiles) ? data.voice_profiles : [],
          )
        }
      } catch (error) {
        if (active) {
          setVoiceProfilesError(
            error instanceof Error ? error.message : 'خطا در دریافت پروفایل‌ها.',
          )
        }
      } finally {
        if (active) setVoiceProfilesLoading(false)
      }
    }

    loadVoiceProfiles()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const handleUploadVoiceProfile = async () => {
    const token = localStorage.getItem('access_token')

    if (!token) {
      setVoiceProfilesError('برای ثبت پروفایل صدا ابتدا وارد حساب کاربری شو.')
      return
    }

    if (!newProfileName.trim() || !newProfileFile || !profileConsent) {
      setVoiceProfilesError('نام، فایل صوتی و تأیید رضایت الزامی هستند.')
      return
    }

    setProfileUploading(true)
    setVoiceProfilesError('')

    try {
      const formData = new FormData()
      formData.append('name', newProfileName.trim())
      formData.append('consent', 'true')
      formData.append('file', newProfileFile)

      const response = await fetch('/voice-profiles', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(
          response.status === 401
            ? 'نشست ورود معتبر نیست؛ دوباره وارد حساب کاربری شو.'
            : data.detail || 'ثبت پروفایل صدا ناموفق بود.',
        )
      }

      const listResponse = await fetch('/voice-profiles', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!listResponse.ok) {
        throw new Error('پروفایل ثبت شد، اما دریافت فهرست جدید ناموفق بود.')
      }

      const data: { voice_profiles: VoiceProfile[] } = await listResponse.json()
      setVoiceProfiles(
        Array.isArray(data.voice_profiles) ? data.voice_profiles : [],
      )
      setNewProfileName('')
      setNewProfileFile(null)
      setProfileConsent(false)
      setVoiceProfilesError('')
    } catch (error) {
      setVoiceProfilesError(
        error instanceof Error ? error.message : 'خطا در ثبت پروفایل صدا.',
      )
    } finally {
      setProfileUploading(false)
    }
  }

  const handleRenameVoiceProfile = async (profileId: number) => {
    const token = localStorage.getItem("access_token")
    const name = editingProfileName.trim()

    if (!token || !name) {
      setVoiceProfilesError(fa ? "نام پروفایل نمی‌تواند خالی باشد." : "Profile name cannot be empty.")
      return
    }

    setProfileActionId(profileId)
    setVoiceProfilesError("")

    try {
      const response = await fetch(`/voice-profiles/${profileId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || (fa ? "ویرایش نام پروفایل ناموفق بود." : "Could not rename profile."))
      }

      setVoiceProfiles((profiles) =>
        profiles.map((profile) =>
          profile.id === profileId ? { ...profile, name } : profile,
        ),
      )
      setEditingProfileId(null)
      setEditingProfileName("")
    } catch (error) {
      setVoiceProfilesError(
        error instanceof Error ? error.message : "Could not rename profile.",
      )
    } finally {
      setProfileActionId(null)
    }
  }

  const handleDeleteVoiceProfile = async (profileId: number) => {
    const confirmed = window.confirm(
      fa ? "از حذف این پروفایل صدا مطمئنی؟ این عمل قابل بازگشت نیست." : "Delete this voice profile? This cannot be undone.",
    )
    if (!confirmed) return

    const token = localStorage.getItem("access_token")
    if (!token) {
      setVoiceProfilesError(fa ? "ابتدا وارد حساب کاربری شو." : "Please log in first.")
      return
    }

    setProfileActionId(profileId)
    setVoiceProfilesError("")

    try {
      const response = await fetch(`/voice-profiles/${profileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || (fa ? "حذف پروفایل ناموفق بود." : "Could not delete profile."))
      }

      setVoiceProfiles((profiles) =>
        profiles.filter((profile) => profile.id !== profileId),
      )
      if (editingProfileId === profileId) {
        setEditingProfileId(null)
        setEditingProfileName("")
      }
    } catch (error) {
      setVoiceProfilesError(
        error instanceof Error ? error.message : "Could not delete profile.",
      )
    } finally {
      setProfileActionId(null)
    }
  }

  const handleGenerate = async () => {
    const token = localStorage.getItem('access_token')

    if (!token) {
      setGenerationError('برای تولید صدا ابتدا وارد حساب کاربری شو.')
      return
    }

    if (textLanguage !== 'en') {
      setGenerationError('موتور فعلی فقط از متن انگلیسی پشتیبانی می‌کند.')
      return
    }

    if (!text.trim()) {
      setGenerationError('ابتدا متن موردنظر را وارد کن.')
      return
    }

    setGenerating(true)
    setGenerationError('')

    try {
      const response = await fetch('/tts/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          voice: selectedVoice,
          language: 'en',
          format: 'wav',
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(
          response.status === 401
            ? 'نشست ورود معتبر نیست؛ دوباره وارد حساب کاربری شو.'
            : data.detail || 'تولید صدا ناموفق بود.',
        )
      }

      const data: { audio_url: string; filename: string } = await response.json()

      const audioResponse = await fetch(data.audio_url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!audioResponse.ok) {
        throw new Error('دریافت فایل صوتی ناموفق بود.')
      }

      const audioBlob = await audioResponse.blob()
      const nextAudioUrl = URL.createObjectURL(audioBlob)

      setGeneratedFilename(data.filename || 'speech.wav')
      setAudioSize(audioBlob.size)
      setAudioDuration(0)
      setAudioUrl(nextAudioUrl)
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : 'خطایی هنگام تولید صدا رخ داد.',
      )
    } finally {
      setGenerating(false)
    }
  }

  const fa = lang === 'fa'

  const toggleTheme = () => {
    const nextTheme: Theme = darkMode ? 'light' : 'dark'
    localStorage.setItem('negar-theme', nextTheme)
    setDarkMode(nextTheme === 'dark')
  }

  return (
    <main
      className={`tts-page ${fa ? 'tts-fa' : 'tts-en'} ${darkMode ? 'tts-dark' : 'tts-light'}`}
      dir={fa ? 'rtl' : 'ltr'}
    >
      <StudioHeader
        title={fa ? 'تبدیل متن به گفتار' : 'Text to Speech'}
        lang={lang}
        onToggleLanguage={() => setLang(fa ? 'en' : 'fa')}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
      />

      <div className="tts-container">
        <section className="tts-intro">
          <div className="tts-eyebrow">
            <span className="tts-status-dot" />
            {fa ? 'استودیوی تولید گفتار' : 'SPEECH SYNTHESIS STUDIO'}
          </div>

          <h1>
            {fa ? <>به متن خود <span>صدا ببخش.</span></> : <>Give your text <span>a voice.</span></>}
          </h1>

          <p>
            {fa
              ? 'فعلاً فقط متن انگلیسی پشتیبانی می‌شود. متن خود را وارد کن تا آن را به گفتار تبدیل کنیم.'
              : 'English text only for now. Enter your text to generate speech.'}
          </p>
        </section>

        <div className="tts-workspace">
          <section className="tts-panel tts-input-panel">
            <div className="tts-panel-heading">
              <div>
                <span className="tts-step">{fa ? 'مرحله ۰۱' : 'STEP 01'}</span>
                <h2>{fa ? 'متن ورودی' : 'Input text'}</h2>
              </div>
              <span className="tts-char-count">
                {text.length.toLocaleString(fa ? 'fa-IR' : 'en-US')} / 2000
              </span>
            </div>

            <textarea
              className="tts-textarea"
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, 2000))}
              placeholder={
                fa
                  ? 'متنی را که می‌خواهی به گفتار تبدیل شود اینجا بنویس...'
                  : 'Type or paste the text you want to convert into speech...'
              }
              maxLength={2000}
              dir="auto"
            />

            <div className="tts-text-footer">
              <span>{fa ? 'زبان متن' : 'TEXT LANGUAGE'}</span>
              <div className="tts-language-options">
                <button
                  type="button"
                  className={textLanguage === 'fa' ? 'is-selected' : ''}
                  onClick={() => setTextLanguage('fa')}
                >
                  فارسی
                </button>
                <button
                  type="button"
                  className={textLanguage === 'en' ? 'is-selected' : ''}
                  onClick={() => setTextLanguage('en')}
                >
                  English
                </button>
              </div>
            </div>
          </section>

          <section className="tts-panel tts-settings-panel">
            <div className="tts-panel-heading">
              <div>
                <span className="tts-step">{fa ? 'مرحله ۰۲' : 'STEP 02'}</span>
                <h2>{fa ? 'تنظیمات صدا' : 'Voice settings'}</h2>
              </div>
            </div>

            <label className="tts-field-label">
              {fa ? 'گوینده' : 'VOICE'}
            </label>

            <div className="tts-voice-card">
              <div className="tts-voice-avatar">♫</div>
              <div className="tts-voice-info">
                <strong>{fa ? 'انتخاب گوینده' : 'Select voice'}</strong>
                <span>
                  {voicesLoading
                    ? (fa ? 'در حال دریافت فهرست صداها...' : 'Loading voices...')
                    : (fa ? 'گوینده موردنظر را انتخاب کن' : 'Choose your preferred voice')}
                </span>
              </div>
              <select
                className="tts-voice-select"
                aria-label={fa ? 'انتخاب گوینده' : 'Select voice'}
                value={selectedVoice}
                onChange={(event) => setSelectedVoice(event.target.value)}
                disabled={voicesLoading || voices.length === 0}
              >
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="tts-custom-voices">
              <div className="tts-custom-voices-info">
                <strong>{fa ? 'صداهای شخصی من' : 'My custom voices'}</strong>
                <span>
                  {voiceProfilesLoading
                    ? (fa ? 'در حال بارگذاری...' : 'Loading...')
                    : fa
                      ? `${voiceProfiles.length} پروفایل ثبت‌شده`
                      : `${voiceProfiles.length} saved profiles`}
                </span>
              </div>
              <button
                type="button"
                className="tts-custom-voices-button"
                onClick={() => setVoiceProfilesOpen(true)}
              >
                {fa ? 'مدیریت پروفایل‌ها' : 'Manage profiles'}
              </button>
            </div>

            {voiceProfilesError && (
              <p className="tts-generation-error" role="alert">
                {voiceProfilesError}
              </p>
            )}

            {voiceProfilesOpen && (
              <div className="tts-custom-voices-list">
                <div className="tts-profile-upload-form">
                  <strong>{fa ? 'ثبت پروفایل صدای جدید' : 'Add a new voice profile'}</strong>

                  <label className="tts-field-label">
                    {fa ? 'نام پروفایل' : 'Profile name'}
                  </label>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(event) => setNewProfileName(event.target.value)}
                    placeholder={fa ? 'مثلاً صدای شخصی من' : 'e.g. My voice'}
                    maxLength={100}
                    disabled={profileUploading}
                  />

                  <label className="tts-field-label">
                    {fa ? 'فایل صوتی مرجع' : 'Reference audio'}
                  </label>
                  <input
                    type="file"
                    accept=".wav,.mp3,.m4a,.flac,.ogg,audio/wav,audio/mpeg,audio/mp4,audio/flac,audio/ogg"
                    onChange={(event) =>
                      setNewProfileFile(event.target.files?.[0] ?? null)
                    }
                    disabled={profileUploading}
                  />

                  <label className="tts-profile-consent">
                    <input
                      type="checkbox"
                      checked={profileConsent}
                      onChange={(event) => setProfileConsent(event.target.checked)}
                      disabled={profileUploading}
                    />
                    <span>
                      {fa
                        ? 'رضایت صاحب صدا را برای استفاده از این فایل دارم.'
                        : "I have the voice owner's consent to use this recording."}
                    </span>
                  </label>

                  <button
                    type="button"
                    className="tts-custom-voices-button"
                    onClick={handleUploadVoiceProfile}
                    disabled={
                      profileUploading ||
                      !newProfileName.trim() ||
                      !newProfileFile ||
                      !profileConsent
                    }
                  >
                    {profileUploading
                      ? (fa ? 'در حال بارگذاری...' : 'Uploading...')
                      : (fa ? 'ثبت پروفایل' : 'Save profile')}
                  </button>
                </div>

                <div className="tts-profile-list-divider" />

                {voiceProfilesLoading ? (
                  <p>{fa ? 'در حال بارگذاری پروفایل‌ها...' : 'Loading profiles...'}</p>
                ) : voiceProfiles.length === 0 ? (
                  <p>{fa ? 'هنوز پروفایل صدایی ثبت نکرده‌ای.' : 'No custom voice profiles yet.'}</p>
                ) : (
                  voiceProfiles.map((profile) => (
                    <div className="tts-custom-voice-item" key={profile.id}>
                      {editingProfileId === profile.id ? (
                        <div className="tts-profile-edit">
                          <input
                            type="text"
                            value={editingProfileName}
                            onChange={(event) => setEditingProfileName(event.target.value)}
                            maxLength={100}
                            autoFocus
                          />
                          <div className="tts-profile-actions">
                            <button
                              type="button"
                              className="tts-profile-action-save"
                              onClick={() => handleRenameVoiceProfile(profile.id)}
                              disabled={profileActionId === profile.id || !editingProfileName.trim()}
                            >
                              {fa ? "ذخیره" : "Save"}
                            </button>
                            <button
                              type="button"
                              className="tts-profile-action-cancel"
                              onClick={() => {
                                setEditingProfileId(null)
                                setEditingProfileName("")
                              }}
                              disabled={profileActionId === profile.id}
                            >
                              {fa ? "لغو" : "Cancel"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="tts-custom-voice-item-info">
                            <strong>{profile.name}</strong>
                            <span>{profile.status}</span>
                          </div>
                          <div className="tts-profile-actions">
                            <button
                              type="button"
                              className="tts-profile-action-edit"
                              onClick={() => {
                                setEditingProfileId(profile.id)
                                setEditingProfileName(profile.name)
                                setVoiceProfilesError("")
                              }}
                              disabled={profileActionId !== null}
                            >
                              {fa ? "ویرایش" : "Rename"}
                            </button>
                            <button
                              type="button"
                              className="tts-profile-action-delete"
                              onClick={() => handleDeleteVoiceProfile(profile.id)}
                              disabled={profileActionId !== null}
                            >
                              {profileActionId === profile.id
                                ? (fa ? "..." : "...")
                                : (fa ? "حذف" : "Delete")}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
                <button
                  type="button"
                  className="tts-retry-button"
                  onClick={() => setVoiceProfilesOpen(false)}
                >
                  {fa ? 'بستن' : 'Close'}
                </button>
              </div>
            )}

            {voicesError && (
              <div className="tts-voices-error">
                <p className="tts-development-note">{voicesError}</p>
                <button
                  type="button"
                  className="tts-retry-button"
                  onClick={() => setVoicesRetry((value) => value + 1)}
                  disabled={voicesLoading}
                >
                  {fa ? 'تلاش دوباره' : 'Try again'}
                </button>
              </div>
            )}

            <label className="tts-field-label">
              {fa ? 'فرمت فایل خروجی' : 'OUTPUT FORMAT'}
            </label>
            <div className="tts-format-options">
              <button type="button" className="is-selected" disabled>
                WAV
              </button>
            </div>
            <button
              type="button"
              className="tts-generate-button"
              onClick={handleGenerate}
              disabled={
                generating ||
                voicesLoading ||
                !selectedVoice ||
                textLanguage !== 'en' ||
                !text.trim()
              }
            >
              <span>♫</span>
              {generating
                ? (fa ? 'در حال تولید صدا...' : 'Generating audio...')
                : (fa ? 'تولید صدا' : 'Generate speech')}
            </button>

            {generationError && (
              <p className="tts-generation-error" role="alert">
                {generationError}
              </p>
            )}

            <p className="tts-development-note">
              {textLanguage === 'fa'
                ? 'موتور فعلی از متن فارسی پشتیبانی نمی‌کند؛ انگلیسی را انتخاب کن.'
                : 'English text only. Voice: Alba and other available voices.'}
            </p>
          </section>
        </div>

        <section className="tts-panel tts-output-panel">
          <div className="tts-panel-heading">
            <div>
              <span className="tts-step">{fa ? 'مرحله ۰۳' : 'STEP 03'}</span>
              <h2>{fa ? 'خروجی صوتی' : 'Audio output'}</h2>
            </div>
            <span className="tts-output-empty">{generating
              ? (fa ? 'در حال تولید' : 'GENERATING')
              : audioUrl
                ? (fa ? 'آماده' : 'READY')
                : generationError
                  ? (fa ? 'خطا' : 'ERROR')
                  : (fa ? 'بدون خروجی' : 'NO OUTPUT')}</span>
          </div>

          {audioUrl ? (
            <div className="tts-audio-result">
              <strong>{generatedFilename}</strong>
              <div className="tts-audio-meta">
                <span>
                  {fa ? 'مدت:' : 'Duration:'}{' '}
                  {audioDuration
                    ? `${Math.floor(audioDuration / 60)}:${String(Math.floor(audioDuration % 60)).padStart(2, '0')}`
                    : '--:--'}
                </span>
                <span>
                  {fa ? 'حجم:' : 'Size:'}{' '}
                  {audioSize >= 1024 * 1024
                    ? `${(audioSize / (1024 * 1024)).toFixed(2)} MB`
                    : `${(audioSize / 1024).toFixed(1)} KB`}
                </span>
              </div>
              <audio
                controls
                src={audioUrl}
                onLoadedMetadata={(event) => setAudioDuration(event.currentTarget.duration)}
              >
                Your browser does not support audio playback.
              </audio>
              <a href={audioUrl} download={generatedFilename}>
                {fa ? 'دانلود فایل WAV' : 'Download WAV'}
              </a>
            </div>
          ) : (
            <div className="tts-output-placeholder">
              <div className="tts-output-icon">♫</div>
              <strong>
                {fa ? 'صدای تولیدشده اینجا نمایش داده می‌شود' : 'Your generated audio will appear here'}
              </strong>
              <span>
                {fa
                  ? 'پس از تولید، می‌توانی فایل را پخش و دانلود کنی.'
                  : 'Generate speech to preview and download your audio.'}
              </span>
            </div>
          )}
          {generating && (
            <p className="tts-generation-status">
              {fa ? 'در حال ساخت فایل صوتی؛ لطفاً صبر کن...' : 'Generating your audio file. Please wait...'}
            </p>
          )}
        </section>
      </div>
    </main>
  )
}

export default TTSStudio
