import { useState } from 'react'
import './MediaStudio.css'

type Language = 'fa' | 'en'

function MediaStudio() {
  const [lang, setLang] = useState<Language>('fa')
  const fa = lang === 'fa'

  const tools = [
    {
      number: '۰۱',
      name: 'نگار',
      subtitle: fa ? 'تبدیل گفتار به متن' : 'Speech to text',
      description: fa
        ? 'تبدیل فایل‌های صوتی و ویدیویی به متن و زیرنویس قابل ویرایش.'
        : 'Turn audio and video into accurate, editable text and subtitles.',
      status: 'available',
      href: '/studio/negar',
      symbol: '♫',
    },
    {
      number: '۰۲',
      name: fa ? 'استودیو زیرنویس' : 'Subtitle Studio',
      subtitle: fa ? 'ویرایش زیرنویس' : 'Subtitle editing',
      description: fa
        ? 'اصلاح متن زیرنویس، تنظیم زمان‌بندی و آماده‌سازی کپشن ویدیو.'
        : 'Refine subtitles, adjust timing, and prepare captions for your videos.',
      status: 'development',
      href: '/studio/negar',
      symbol: '▤',
    },
    {
      number: '۰۳',
      name: fa ? 'آزمایشگاه صدا' : 'Audio Lab',
      subtitle: fa ? 'ابزارهای صوتی' : 'Audio tools',
      description: fa
        ? 'مجموعه‌ای در حال توسعه از ابزارهای کار با صدا و گفتار.'
        : 'A growing collection of tools for working with audio and voice.',
      status: 'later',
      href: '/studio/negar',
      symbol: '∿',
    },
  ]

  return (
    <main className={`media-studio ${fa ? 'ms-fa' : 'ms-en'}`} dir={fa ? 'rtl' : 'ltr'}>
      <header className="ms-header">
        <a className="ms-brand" href="/" aria-label="Shayan Hub">
          <span className="ms-brand-mark">S<span>.</span></span>
          <span>SHAYAN<span className="ms-muted">HUB</span></span>
        </a>

        <nav className="ms-nav" aria-label={fa ? 'ناوبری اصلی' : 'Main navigation'}>
          <a href="/">{fa ? 'صفحه اصلی' : 'Home'}</a>
          <span>/</span>
          <span>{fa ? 'استودیو رسانه' : 'Media Studio'}</span>
        </nav>

        <div className="ms-header-actions">
          <button className="ms-language" type="button" onClick={() => setLang(fa ? 'en' : 'fa')}>
            {fa ? 'English' : 'فارسی'}
          </button>
          <a className="ms-signin" href="#account">
            {fa ? 'ورود' : 'Sign in'} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <section className="ms-hero">
        <div className="ms-eyebrow">
          <span className="ms-dot" />
          {fa ? 'فضای کار خلاقانه‌ی شما' : 'YOUR CREATIVE WORKSPACE'}
        </div>

        <h1>
          {fa ? <>از رسانه‌هات<br />بیشتر <span>بساز.</span></> : <>Make more<br />from your <span>media.</span></>}
        </h1>

        <p>
          {fa
            ? <>ابزارهای صوتی و ویدیویی، یک‌جا و در کنار هم.<br className="ms-desktop-break" /> فایل را انتخاب کن و شروع کن.</>
            : <>Audio and video tools, brought together in one place.<br className="ms-desktop-break" />Start with a file. Get straight to work.</>}
        </p>

        <a className="ms-cta" href="/studio/negar">
          {fa ? 'رایگان با نگار شروع کن' : 'Try Negar for free'} <span>↗</span>
        </a>

        <div className="ms-hero-note">
          <span>{fa ? 'برای شروع نیازی به حساب کاربری نیست' : 'NO ACCOUNT NEEDED TO GET STARTED'}</span>
          <span>{fa ? '۰۱ — ابزارهای رسانه' : '01 — MEDIA TOOLS'}</span>
        </div>
      </section>

      <section className="ms-tools">
        <div className="ms-section-heading">
          <div>
            <span className="ms-section-label">{fa ? 'مجموعه ابزارها / ۰۰۱' : 'THE TOOLKIT / 001'}</span>
            <h2>{fa ? 'ابزار موردنظرت را انتخاب کن.' : 'Choose your tool.'}</h2>
          </div>
          <p>{fa ? 'ابزارهایی کاربردی برای جریان واقعی کار.' : 'Focused tools for real creative workflows.'}</p>
        </div>

        <div className="ms-tool-list">
          {tools.map((tool) => (
            <a className="ms-tool" href={tool.href} key={tool.number}>
              <span className="ms-tool-number">{tool.number}</span>
              <span className="ms-tool-symbol" aria-hidden="true">{tool.symbol}</span>
              <span className="ms-tool-content">
                <span className="ms-tool-subtitle">{tool.subtitle}</span>
                <strong>{tool.name}</strong>
                <span className="ms-tool-description">{tool.description}</span>
              </span>
              <span className="ms-tool-end">
                <span className={`ms-tool-status ${tool.status === 'available' ? 'is-available' : ''}`}>
                  <span />
                  {tool.status === 'available'
                    ? (fa ? 'قابل استفاده' : 'AVAILABLE')
                    : tool.status === 'development'
                      ? (fa ? 'در حال توسعه' : 'IN DEVELOPMENT')
                      : (fa ? 'به‌زودی' : 'COMING LATER')}
                </span>
                <span className="ms-tool-arrow" aria-hidden="true">{fa ? '↖' : '↗'}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="ms-free">
        <div>
          <span className="ms-section-label">{fa ? 'شروع ساده' : 'START SIMPLE'}</span>
          <h2>{fa ? 'هر روز، سه فایل رایگان.' : 'Three free files. Every day.'}</h2>
          <p>
            {fa
              ? 'با نگار شروع کن. فایل صوتی یا ویدیویی‌ات را بارگذاری کن و بدون مراحل پیچیده متن بگیر.'
              : 'Try Negar first. Upload your audio or video and get your transcript without a complicated setup.'}
          </p>
        </div>
        <a className="ms-free-link" href="/studio/negar">
          {fa ? 'شروع کن' : 'Get started'} <span aria-hidden="true">{fa ? '↖' : '↗'}</span>
        </a>
      </section>

      <footer className="ms-footer">
        <a className="ms-brand" href="/">
          <span className="ms-brand-mark">S<span>.</span></span>
          <span>SHAYAN<span className="ms-muted">HUB</span></span>
        </a>
        <span>{fa ? 'استودیو رسانه · در حال توسعه' : 'MEDIA STUDIO · A WORK IN PROGRESS'}</span>
        <a href="/">{fa ? 'بازگشت به صفحه اصلی ↑' : 'BACK TO HUB ↑'}</a>
      </footer>
    </main>
  )
}

export default MediaStudio
