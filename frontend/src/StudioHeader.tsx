import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './StudioHeader.css'

type StudioHeaderProps = {
  title: string
  lang?: 'fa' | 'en'
  onToggleLanguage?: () => void
  darkMode?: boolean
  onToggleTheme?: () => void
  collapsible?: boolean
  children?: ReactNode
}

type HeaderUser = {
  id: number | string
  email: string
}

export default function StudioHeader({
  title,
  lang = 'fa',
  onToggleLanguage,
  darkMode,
  onToggleTheme,
  collapsible = false,
  children,
}: StudioHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<HeaderUser | null>(null)
  const [authChecked, setAuthChecked] = useState(() => !localStorage.getItem('access_token'))

  const location = useLocation()
  const navigate = useNavigate()
  const fa = lang === 'fa'

  useEffect(() => {
    let active = true
    const token = localStorage.getItem('access_token')

    if (!token) {
      return () => {
        active = false
      }
    }

    async function checkSession() {
      try {
        const response = await fetch('/me', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!active) return

        if (response.status === 401) {
          localStorage.removeItem('access_token')
          setUser(null)
          return
        }

        if (!response.ok) {
          setUser(null)
          return
        }

        const data = await response.json()

        if (
          active &&
          (typeof data.id === 'string' || typeof data.id === 'number') &&
          typeof data.email === 'string' &&
          data.email.length > 0
        ) {
          setUser({ id: data.id, email: data.email })
        } else if (active) {
          setUser(null)
        }
      } catch {
        if (active) setUser(null)
      } finally {
        if (active) setAuthChecked(true)
      }
    }

    void checkSession()

    return () => {
      active = false
    }
  }, [])

  function logout() {
    localStorage.removeItem('access_token')
    setUser(null)
    navigate('/login', { replace: true })
  }

  const accountHref = user ? '/dashboard' : '/login'

  const links = [
    { to: '/studio', label: fa ? 'خانهٔ استودیو' : 'Studio home' },
    { to: '/studio/stt', label: fa ? 'گفتار به متن' : 'Speech to text' },
    { to: '/studio/video', label: fa ? 'تدوین و زیرنویس ویدیو' : 'Video & subtitles' },
    {
      to: accountHref,
      label: user
        ? (fa ? 'حساب کاربری' : 'Account')
        : (fa ? 'ورود / ثبت‌نام' : 'Log in / Sign up'),
    },
  ]

  return (
    <header
      className={`studio-header ${fa ? 'studio-header-fa' : 'studio-header-en'} ${darkMode ? 'studio-header-dark' : 'studio-header-light'} ${collapsible ? 'studio-header-collapsible' : ''}`}
      dir={fa ? 'rtl' : 'ltr'}
    >
      <div className="studio-header-menu-wrap">
        <button
          className="studio-header-menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="true"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="studio-header-menu-icon" aria-hidden="true">☰</span>
          <span>{fa ? 'سرویس‌ها' : 'Services'}</span>
        </button>

        {menuOpen && (
          <>
            <button
              className="studio-header-dismiss"
              type="button"
              aria-label={fa ? 'بستن منو' : 'Close menu'}
              onClick={() => setMenuOpen(false)}
            />
            <nav
              className="studio-header-dropdown"
              aria-label={fa ? 'ناوبری استودیو' : 'Studio navigation'}
            >
              {links.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={location.pathname === item.to ? 'is-active' : ''}
                >
                  {item.label}
                  {location.pathname === item.to && (
                    <span aria-hidden="true">●</span>
                  )}
                </Link>
              ))}
            </nav>
          </>
        )}
      </div>

      <div className="studio-header-current">
        <span>{fa ? 'استودیوی هوش مصنوعی رسانه' : 'MEDIA AI STUDIO'}</span>
        <strong>{title}</strong>
      </div>

      <div className="studio-header-actions">
        {onToggleLanguage && (
          <button
            className="studio-header-control"
            type="button"
            onClick={onToggleLanguage}
          >
            {fa ? 'English' : 'فارسی'}
          </button>
        )}

        {onToggleTheme && (
          <button
            className="studio-header-control"
            type="button"
            onClick={onToggleTheme}
            aria-label={
              darkMode
                ? (fa ? 'فعال‌کردن حالت روشن' : 'Switch to light mode')
                : (fa ? 'فعال‌کردن حالت شب' : 'Switch to dark mode')
            }
          >
            {darkMode ? '☀' : '☾'}
            <span>{darkMode ? (fa ? 'روشن' : 'Light') : (fa ? 'تیره' : 'Dark')}</span>
          </button>
        )}

        {!authChecked ? (
          <span className="studio-header-auth-loading" aria-hidden="true" />
        ) : user ? (
          <div className="studio-header-account">
            <div className="studio-header-avatar">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="studio-header-account-info">
              <strong>{user.email}</strong>
              <span>{fa ? 'حساب ثبت‌نام‌شده' : 'Registered account'}</span>
            </div>
            <button
              className="studio-header-logout"
              type="button"
              onClick={logout}
            >
              {fa ? 'خروج' : 'Log out'}
            </button>
          </div>
        ) : (
          <Link className="studio-header-login" to="/login">
            {fa ? 'ورود / ثبت‌نام' : 'Log in / Sign up'}
          </Link>
        )}
      </div>

      {children && <div className="studio-header-extra">{children}</div>}
    </header>
  )
}
