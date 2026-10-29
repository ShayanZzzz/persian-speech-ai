import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import StudioHeader from './StudioHeader'
import './MediaStudio.css'

type Language = 'fa' | 'en'
type Theme = 'light' | 'dark'

const articles = [
  {
    number: '01',
    category: 'راهنمای کاربردی',
    title: 'چطور فایل صوتی را به متن تبدیل کنیم؟',
    description:
      'با تبدیل گفتار به متن، محتوای جلسات، مصاحبه‌ها و فایل‌های صوتی را به متن قابل ویرایش تبدیل کن.',
    readTime: '۳ دقیقه مطالعه',
  },
  {
    number: '02',
    category: 'تولید محتوا',
    title: 'ساخت زیرنویس برای ویدیو؛ از متن تا تدوین',
    description:
      'با زیرنویس، دسترسی‌پذیری و تجربه تماشای ویدیو را بهتر کن و محتوایت را برای مخاطبان بیشتری آماده کن.',
    readTime: '۴ دقیقه مطالعه',
  },
  {
    number: '03',
    category: 'هوش مصنوعی صوتی',
    title: 'چطور از فایل‌های صوتی محتوای متنی بسازیم؟',
    description:
      'از پادکست و گفت‌وگو تا محتوای آموزشی؛ راه‌هایی برای استفاده دوباره از محتوای صوتی را بشناس.',
    readTime: '۳ دقیقه مطالعه',
  },
]

function MediaStudio() {
  const [lang, setLang] = useState<Language>('fa')
  const [darkMode, setDarkMode] = useState(
    () => (localStorage.getItem('negar-theme') ?? 'light') === 'dark',
  )
  const [prompt, setPrompt] = useState('')
  const [assistantNotice, setAssistantNotice] = useState('')

  const [placeholderText, setPlaceholderText] = useState('')
  const [placeholderActive, setPlaceholderActive] = useState(true)

  useEffect(() => {
    if (!placeholderActive || prompt) return

    const examples =
      lang === 'fa'
        ? [
            'مثلاً چطور از یک فایل آزمایشی زیرنویس بسازم؟',
            'فایل صوتی‌ام را به متن تبدیل کن.',
            'چطور برای ویدیوی خودم زیرنویس فارسی بسازم؟',
            'چطور متن خروجی را ویرایش و ذخیره کنم؟',
          ]
        : [
            'How can I create subtitles from a test file?',
            'Convert my audio file to text.',
            'How can I create Persian subtitles for my video?',
            'How can I edit and export the transcript?',
          ]

    let phraseIndex = 0
    let charIndex = 0
    let deleting = false
    let timeout: ReturnType<typeof setTimeout>

    const tick = () => {
      const phrase = examples[phraseIndex]

      if (!deleting) {
        charIndex++
        setPlaceholderText(phrase.slice(0, charIndex))

        if (charIndex >= phrase.length) {
          deleting = true
          timeout = setTimeout(tick, 1800)
          return
        }

        timeout = setTimeout(tick, 40)
        return
      }

      charIndex--
      setPlaceholderText(phrase.slice(0, charIndex))

      if (charIndex <= 0) {
        deleting = false
        phraseIndex = (phraseIndex + 1) % examples.length
        timeout = setTimeout(tick, 350)
        return
      }

      timeout = setTimeout(tick, 20)
    }

    timeout = setTimeout(tick, 400)

    return () => clearTimeout(timeout)
  }, [lang, placeholderActive, prompt])


  const fa = lang === 'fa'

  const toggleTheme = () => {
    const nextTheme: Theme = darkMode ? 'light' : 'dark'
    localStorage.setItem('negar-theme', nextTheme)
    setDarkMode(nextTheme === 'dark')
  }

  const handleAssistantSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!prompt.trim()) return

    setAssistantNotice(
      fa
        ? 'دستیار نگار هنوز به سرویس هوش مصنوعی متصل نشده است. این بخش پس از اتصال بک‌اند فعال می‌شود.'
        : 'Negar Assistant is not connected to the AI backend yet. It will be enabled after integration.',
    )
  }

  return (
    <main
      className={`media-studio ${fa ? 'ms-fa' : 'ms-en'} ${darkMode ? 'ms-dark' : 'ms-light'}`}
      dir={fa ? 'rtl' : 'ltr'}
    >
      <StudioHeader
        title={fa ? 'استودیو رسانه' : 'Media Studio'}
        lang={lang}
        onToggleLanguage={() => setLang(fa ? 'en' : 'fa')}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
      />

      <div className="ms-page">
        <section className="ms-hero">
          <div className="ms-hero-copy">
            <div className="ms-eyebrow">
              <span className="ms-live-dot" />
              {fa ? 'فضای کار هوشمند رسانه' : 'YOUR AI MEDIA WORKSPACE'}
            </div>

            <h1>
              {fa ? (
                <>
                  محتوایت را
                  <br />
                  <span>هوشمندتر بساز.</span>
                </>
              ) : (
                <>
                  Make more
                  <br />
                  <span>from your media.</span>
                </>
              )}
            </h1>

            <p>
              {fa
                ? 'از تبدیل گفتار به متن تا تدوین زیرنویس؛ ابزارهای نگار برای تبدیل فایل‌های رسانه‌ای به محتوای قابل استفاده.'
                : 'From speech transcription to subtitle editing, use Negar tools to turn media files into useful content.'}
            </p>

            <div className="ms-hero-actions">
              <Link className="ms-primary-button" to="/studio/stt">
                {fa ? 'شروع با نگار' : 'Start with Negar'}
                <span aria-hidden="true">{fa ? '↖' : '↗'}</span>
              </Link>
              <a className="ms-secondary-link" href="#ms-tools">
                {fa ? 'مشاهده ابزارها' : 'Explore tools'}
                <span aria-hidden="true">↓</span>
              </a>
            </div>

            <div className="ms-hero-trust">
              <span>{fa ? 'صوت و ویدیو' : 'AUDIO & VIDEO'}</span>
              <span>{fa ? 'متن قابل ویرایش' : 'EDITABLE TEXT'}</span>
              <span>{fa ? 'محیط یکپارچه' : 'ONE WORKSPACE'}</span>
            </div>
          </div>

          <div className="ms-hero-assistant">
          <form className="ms-assistant-box" onSubmit={handleAssistantSubmit}>
            <div className="ms-assistant-box-top">
              <span className="ms-assistant-avatar" aria-hidden="true">ن</span>
              <div>
                <strong>{fa ? 'دستیار صوتی نگار' : 'Negar Voice Assistant'}</strong>
                <span>{fa ? 'دستیار رسانه‌ای شما' : 'Your media assistant'}</span>
              </div>
              <span className="ms-assistant-beta">{fa ? 'نسخهٔ آزمایشی' : 'PREVIEW'}</span>
            </div>

            <label className="ms-assistant-input-wrap">
              <span className="ms-sr-only">
                {fa ? 'سؤال از دستیار نگار' : 'Ask Negar Assistant'}
              </span>
              <textarea
                value={prompt}
                onChange={(event) => {
                  setPlaceholderActive(false)
                  setPrompt(event.target.value)
                  setAssistantNotice('')
                }}
                placeholder={placeholderText}
                onFocus={() => setPlaceholderActive(false)}
                rows={2}
                dir={fa ? 'rtl' : 'ltr'}
              />
            </label>

            <div className="ms-assistant-box-bottom">
              <span>{fa ? 'پاسخ‌گویی هوشمند پس از اتصال بک‌اند فعال می‌شود.' : 'AI responses will be enabled after backend integration.'}</span>
              <button type="submit" disabled={!prompt.trim()}>
                {fa ? 'ارسال سؤال' : 'Send question'}
                <span aria-hidden="true">{fa ? '↖' : '↗'}</span>
              </button>
            </div>

            {assistantNotice && (
              <p className="ms-assistant-notice" role="status">{assistantNotice}</p>
            )}
          </form>
                  </div>

          <aside className="ms-quick-panel" aria-label={fa ? 'شروع سریع' : 'Quick start'}>
            <div className="ms-quick-panel-heading">
              <span className="ms-quick-kicker">{fa ? 'شروع سریع' : 'QUICK START'}</span>
              <h2>{fa ? 'از کجا شروع کنیم؟' : 'What would you like to do?'}</h2>
              <p>{fa ? 'یک مسیر را انتخاب کن و مستقیم وارد ابزار شو.' : 'Choose a workflow and jump straight into the tool.'}</p>
            </div>
            <Link className="ms-quick-action" to="/studio/stt">
              <span className="ms-quick-action-icon" aria-hidden="true">↗</span>
              <span>
                <strong>{fa ? 'تبدیل صوت به متن' : 'Speech to text'}</strong>
                <small>{fa ? 'متن قابل ویرایش از فایل صوتی' : 'Editable text from audio'}</small>
              </span>
              <span className="ms-quick-action-arrow" aria-hidden="true">{fa ? '←' : '→'}</span>
            </Link>
            <Link className="ms-quick-action" to="/studio/video">
              <span className="ms-quick-action-icon" aria-hidden="true">▤</span>
              <span>
                <strong>{fa ? 'ساخت و ویرایش زیرنویس' : 'Create and edit subtitles'}</strong>
                <small>{fa ? 'از ویدیو تا زیرنویس هماهنگ' : 'From video to synced subtitles'}</small>
              </span>
              <span className="ms-quick-action-arrow" aria-hidden="true">{fa ? '←' : '→'}</span>
            </Link>
            <div className="ms-quick-panel-footnote">
              <span className="ms-quick-status-dot" />
              {fa ? 'ابزارها در یک فضای کاری یکپارچه' : 'All tools in one workspace'}
            </div>
          </aside>

          <div className="ms-hero-visual" aria-label={fa ? 'پیش‌نمایش موج صوتی نگار' : 'Negar audio waveform preview'}>
            <div className="ms-visual-orbit ms-orbit-one" />
            <div className="ms-visual-orbit ms-orbit-two" />

            <div className="ms-visual-card">
              <div className="ms-visual-card-top">
                <span className="ms-visual-icon">♫</span>
                <div className="ms-visual-file">
                  <strong>{fa ? 'مصاحبه-نمونه.wav' : 'sample-interview.wav'}</strong>
                  <span>{fa ? 'فایل صوتی · ۰۳:۲۴' : 'Audio file · 03:24'}</span>
                </div>
                <span className="ms-visual-tag">NEGAR / 01</span>
              </div>

              <div className="ms-waveform" aria-hidden="true">
                {Array.from({ length: 43 }, (_, index) => (
                  <span
                    key={index}
                    style={{ height: `${15 + ((index * 37 + 19) % 75)}%` }}
                  />
                ))}
              </div>

              <div className="ms-visual-timeline">
                <span />
                <span />
                <span />
              </div>

              <div className="ms-transcript-preview">
                <span className="ms-transcript-badge">AI</span>
                <div>
                  <i />
                  <i />
                  <i />
                </div>
              </div>

              <div className="ms-visual-card-bottom">
                <span>{fa ? 'آماده برای تبدیل به متن' : 'READY TO TRANSCRIBE'}</span>
                <span className="ms-visual-arrow">↗</span>
              </div>
            </div>
          </div>
        </section>



        <section className="ms-workspace" id="ms-tools" aria-labelledby="ms-tools-title">
          <div className="ms-section-heading">
            <div>
              <span className="ms-section-kicker">
                {fa ? 'ابزارها / ۰۰۱' : 'TOOLS / 001'}
              </span>
              <h2 id="ms-tools-title">
                {fa ? 'ابزار مناسب کارت را انتخاب کن' : 'Choose your workflow'}
              </h2>
            </div>
            <p>
              {fa
                ? 'هر ابزار برای یک مرحله از کار با محتوای رسانه‌ای طراحی شده است.'
                : 'Purpose-built tools for different parts of your media workflow.'}
            </p>
          </div>

          <div className="ms-tool-grid">
            <Link className="ms-tool-card is-featured" to="/studio/stt">
              <div className="ms-tool-preview ms-preview-transcription">
                <div className="ms-preview-window">
                  <div className="ms-preview-toolbar">
                    <span />
                    <span />
                    <span />
                    <b>NEGAR / STT</b>
                  </div>
                  <div className="ms-preview-body">
                    <div className="ms-preview-sidebar">
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                    <div className="ms-preview-main">
                      <span className="ms-preview-label">{fa ? 'متن استخراج‌شده' : 'TRANSCRIPT'}</span>
                      <strong>{fa ? 'متن گفتار شما' : 'Your transcript'}</strong>
                      <div className="ms-preview-wave">
                        {Array.from({ length: 24 }, (_, index) => (
                          <i key={index} style={{ height: `${18 + ((index * 23) % 65)}%` }} />
                        ))}
                      </div>
                      <div className="ms-preview-lines">
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                  </div>
                </div>
                <span className="ms-preview-corner">{fa ? 'پیش‌نمایش رابط' : 'UI PREVIEW'}</span>
              </div>

              <div className="ms-tool-top">
                <span className="ms-tool-number">01</span>
                <span className="ms-tool-symbol" aria-hidden="true">♫</span>
                <span className="ms-tool-status is-available">
                  <span />
                  {fa ? 'آمادهٔ استفاده' : 'AVAILABLE'}
                </span>
              </div>
              <div className="ms-tool-content">
                <span className="ms-tool-category">{fa ? 'تبدیل گفتار به متن' : 'SPEECH TO TEXT'}</span>
                <h3>{fa ? 'نگار؛ تبدیل صوت به متن' : 'Negar Speech to Text'}</h3>
                <p>
                  {fa
                    ? 'فایل صوتی یا ویدیویی را بارگذاری کن و گفتار را به متنی قابل بررسی و ویرایش تبدیل کن.'
                    : 'Upload an audio or video file and convert spoken content into editable text.'}
                </p>
              </div>
              <div className="ms-tool-footer">
                <span>{fa ? 'شروع تبدیل' : 'Start transcription'}</span>
                <span className="ms-tool-arrow" aria-hidden="true">{fa ? '↖' : '↗'}</span>
              </div>
            </Link>

            <Link className="ms-tool-card" to="/studio/video">
              <div className="ms-tool-preview ms-preview-subtitles">
                <div className="ms-editor-window">
                  <div className="ms-editor-topbar">
                    <span>SUBTITLE STUDIO</span>
                    <span>16:9</span>
                  </div>
                  <div className="ms-editor-workspace">
                    <div className="ms-editor-video">
                      <div className="ms-video-scene">
                        <span />
                        <i />
                      </div>
                      <div className="ms-subtitle-on-video">
                        {fa ? 'متن زیرنویس ویدیو' : 'Your subtitle goes here'}
                      </div>
                    </div>
                    <div className="ms-editor-properties">
                      <span>{fa ? 'تنظیمات متن' : 'TEXT STYLE'}</span>
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                  <div className="ms-editor-timeline">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
                <span className="ms-preview-corner">{fa ? 'پیش‌نمایش رابط' : 'UI PREVIEW'}</span>
              </div>

              <div className="ms-tool-top">
                <span className="ms-tool-number">02</span>
                <span className="ms-tool-symbol" aria-hidden="true">▤</span>
                <span className="ms-tool-status is-available">
                  <span />
                  {fa ? 'ورود به استودیو' : 'OPEN STUDIO'}
                </span>
              </div>
              <div className="ms-tool-content">
                <span className="ms-tool-category">{fa ? 'ویرایش و زمان‌بندی' : 'SUBTITLE EDITING'}</span>
                <h3>{fa ? 'استودیوی تدوین زیرنویس' : 'Subtitle Studio'}</h3>
                <p>
                  {fa
                    ? 'در فضای تدوین ویدیو، متن زیرنویس و زمان‌بندی آن را بررسی کن و برای ادامه کار آماده شو.'
                    : 'Open the video editing workspace to work with subtitle text and timing.'}
                </p>
              </div>
              <div className="ms-tool-footer">
                <span>{fa ? 'ورود به استودیو' : 'Open subtitle studio'}</span>
                <span className="ms-tool-arrow" aria-hidden="true">{fa ? '↖' : '↗'}</span>
              </div>
            </Link>

            <article className="ms-tool-card is-disabled">
              <div className="ms-tool-preview ms-preview-audio-lab">
                <div className="ms-lab-orb"><span>∿</span></div>
                <div className="ms-lab-bars">
                  {Array.from({ length: 17 }, (_, index) => (
                    <i key={index} style={{ height: `${20 + ((index * 29) % 60)}%` }} />
                  ))}
                </div>
                <span className="ms-preview-corner">{fa ? 'در حال توسعه' : 'IN DEVELOPMENT'}</span>
              </div>
              <div className="ms-tool-top">
                <span className="ms-tool-number">03</span>
                <span className="ms-tool-symbol" aria-hidden="true">∿</span>
                <span className="ms-tool-status is-pending">
                  <span />
                  {fa ? 'به‌زودی' : 'COMING LATER'}
                </span>
              </div>
              <div className="ms-tool-content">
                <span className="ms-tool-category">{fa ? 'ابزارهای صوتی' : 'AUDIO TOOLS'}</span>
                <h3>{fa ? 'آزمایشگاه صدا' : 'Audio Lab'}</h3>
                <p>
                  {fa
                    ? 'ابزارهای بیشتر برای کار با صدا و گفتار در حال توسعه‌اند.'
                    : 'More tools for working with audio and voice are in development.'}
                </p>
              </div>
              <div className="ms-tool-footer">
                <span>{fa ? 'در دست توسعه' : 'In development'}</span>
                <span className="ms-tool-arrow" aria-hidden="true">⌁</span>
              </div>
            </article>
          </div>
        </section>

        <section className="ms-articles" aria-labelledby="ms-articles-title">
          <div className="ms-section-heading">
            <div>
              <span className="ms-section-kicker">{fa ? 'مجلهٔ نگار / راهنما و به‌روزرسانی' : 'NEGAR JOURNAL / 003'}</span>
              <h2 id="ms-articles-title">
                {fa ? 'راهنماها و ایده‌های تازه' : 'Guides and ideas'}
              </h2>
            </div>
            <p>
              {fa
                ? 'راهنماهایی برای تبدیل گفتار، تدوین زیرنویس و استفاده بهتر از محتوای رسانه‌ای.'
                : 'Practical guides for transcription, subtitles, and media workflows.'}
            </p>
          </div>

          <div className="ms-article-grid">
            {articles.map((article, index) => (
              <article className="ms-article-card" key={article.number}>
                <div className={`ms-article-art ms-article-art-${index + 1}`} aria-hidden="true">
                  <span className="ms-article-art-number">{article.number}</span>
                  {index === 0 ? (
                    <div className="ms-article-art-wave">
                      {Array.from({ length: 25 }, (_, i) => (
                        <i key={i} style={{ height: `${20 + ((i * 31) % 65)}%` }} />
                      ))}
                    </div>
                  ) : index === 1 ? (
                    <div className="ms-article-art-subtitles">
                      <i />
                      <i />
                      <i />
                      <span>SUBTITLE</span>
                    </div>
                  ) : (
                    <div className="ms-article-art-document">
                      <span>TXT</span>
                      <i />
                      <i />
                      <i />
                    </div>
                  )}
                </div>
                <div className="ms-article-copy">
                  <span className="ms-article-category">{fa ? article.category : ['HOW-TO GUIDE', 'CONTENT CREATION', 'AI & AUDIO'][index]}</span>
                  <h3>{fa ? article.title : [
                    'How to convert audio files to text',
                    'Creating subtitles for video: from text to editing',
                    'Turning audio files into useful written content',
                  ][index]}</h3>
                  <p>{fa ? article.description : [
                    'Turn interviews, meetings, and audio recordings into editable text with a clear workflow.',
                    'Improve accessibility and viewing experience by preparing subtitle text for your videos.',
                    'Explore ways to reuse podcasts, conversations, and educational recordings as written content.',
                  ][index]}</p>
                  <div className="ms-article-footer">
                    <span>{fa ? article.readTime : ['3 MIN READ', '4 MIN READ', '3 MIN READ'][index]}</span>
                    <Link to={index === 1 ? '/studio/video' : '/studio/stt'}>
                      {fa ? 'شروع با ابزار مرتبط' : 'Try related tool'}
                      <span aria-hidden="true">{fa ? '↖' : '↗'}</span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="ms-articles-note">
            {fa
              ? 'این بخش برای انتشار راهنماهای کاربردی، خبرهای محصول و به‌روزرسانی‌های نگار در نظر گرفته شده است.'
              : 'These are initial guide previews. Publishing real articles and content management will be added later.'}
          </p>
        </section>

        <section className="ms-free-banner">
          <div className="ms-free-icon" aria-hidden="true">✳</div>
          <div className="ms-free-copy">
            <span className="ms-section-kicker">{fa ? 'برای شروع' : 'GET STARTED'}</span>
            <h2>{fa ? 'اولین تبدیل را امتحان کن.' : 'Try your first transcription.'}</h2>
            <p>
              {fa
                ? 'فایل موردنظرت را انتخاب کن و با نگار شروع کن.'
                : 'Choose a file and start working with Negar.'}
            </p>
          </div>
          <Link className="ms-banner-link" to="/studio/stt">
            {fa ? 'رفتن به ابزار' : 'Open tool'}
            <span aria-hidden="true">{fa ? '↖' : '↗'}</span>
          </Link>
        </section>

        <footer className="ms-footer">
          <Link to="/" className="ms-footer-brand">SHAYAN<span>HUB</span></Link>
          <span>
            {fa
              ? 'ابزارهایی برای کار هوشمندتر با رسانه'
              : 'Tools for a smarter media workflow'}
          </span>
          <span>© {new Date().getFullYear()} Shayan Hub</span>
        </footer>
      </div>
    </main>
  )
}

export default MediaStudio
