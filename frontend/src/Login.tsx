import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './Login.css'

type Mode = 'login' | 'register'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [info, setInfo] = useState('')

  const isLogin = mode === 'login'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setInfo('')
    setLoading(true)

    try {
      if (!isLogin) {
        const registerResponse = await fetch('/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        })

        const registerData = await registerResponse.json().catch(() => ({}))

        if (!registerResponse.ok) {
          throw new Error(
            typeof registerData.detail === 'string'
              ? registerData.detail
              : 'ثبت‌نام انجام نشد.'
          )
        }
      }

      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'ورود انجام نشد.'
        )
      }

      if (typeof data.access_token !== 'string') {
        throw new Error('پاسخ سرور معتبر نیست.')
      }

      localStorage.setItem('access_token', data.access_token)
      setSuccess(isLogin ? 'ورود موفق بود.' : 'حساب ساخته شد؛ وارد شدید.')
      const from = (location.state as { from?: { pathname?: string } } | null)?.from
      const destination = from?.pathname?.startsWith('/') ? from.pathname : '/dashboard'
      navigate(destination, { replace: true })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'خطای غیرمنتظره‌ای رخ داد.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page" dir="rtl">
      <header className="login-header">
        <Link className="login-brand" to="/" aria-label="صفحه اصلی">
          <span className="login-brand-mark">S<span>.</span></span>
          <span>SHAYAN<span className="login-brand-muted">HUB</span></span>
        </Link>
        <Link className="login-back" to="/studio/negar">
          بازگشت به نگار <span>↗</span>
        </Link>
      </header>

      <section className="login-layout">
        <div className="login-story">
          <span className="login-eyebrow">NEGAR · SPEECH TO TEXT</span>
          <h1>
            کلماتت را
            <br />
            <span>از دل صدا</span>
            <br />
            بیرون بکش.
          </h1>
          <p>
            وارد حساب شو تا به تاریخچه‌ی تبدیل‌های ذخیره‌شده‌ات دسترسی داشته
            باشی و کارهایت را یک‌جا مدیریت کنی.
          </p>
          <div className="login-story-footer">
            <span className="login-status-dot" />
            تبدیل صوت و ویدیو به متن
          </div>
        </div>

        <section className="login-card">
          <div className="login-card-heading">
            <span className="login-card-kicker">حساب کاربری نگار</span>
            <h2>{isLogin ? 'خوش برگشتی.' : 'شروع کنیم.'}</h2>
            <p>
              {isLogin
                ? 'برای ادامه، وارد حساب خودت شو.'
                : 'حساب بساز تا کارهایت را در تاریخچه نگه داری.'}
            </p>
          </div>

          <div className="login-tabs" role="tablist" aria-label="نوع حساب">
            <button
              type="button"
              role="tab"
              aria-selected={isLogin}
              className={isLogin ? 'active' : ''}
              onClick={() => {
                setMode('login')
                setError('')
                setSuccess('')
                setInfo('')
              }}
            >
              ورود
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isLogin}
              className={!isLogin ? 'active' : ''}
              onClick={() => {
                setMode('register')
                setError('')
                setSuccess('')
                setInfo('')
              }}
            >
              ثبت‌نام
            </button>
          </div>

          <form className="login-form" onSubmit={submit}>
            <label htmlFor="login-email">ایمیل</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <div className="login-password-row">
              <label htmlFor="login-password">رمز عبور</label>
              {isLogin && (
                <button
                  className="login-forgot"
                  type="button"
                  onClick={() => {
                    setError('')
                    setSuccess('')
                    setInfo('بازیابی رمز عبور هنوز فعال نشده است.')
                  }}
                >
                  فراموشی رمز عبور؟
                </button>
              )}
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder={isLogin ? 'رمز عبورت را وارد کن' : 'حداقل ۸ کاراکتر'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={128}
              required
            />

            {error && <p className="login-message error" role="alert">{error}</p>}
            {success && <p className="login-message success" role="status">{success}</p>}
            {info && <p className="login-message info" role="status">{info}</p>}

            <button className="login-submit" type="submit" disabled={loading}>
              {loading
                ? 'لطفاً صبر کن…'
                : isLogin
                  ? 'ورود به حساب'
                  : 'ساخت حساب کاربری'}
              {!loading && <span>↗</span>}
            </button>
          </form>

          <div className="login-divider"><span>یا ادامه بده با</span></div>

          <div className="login-socials">
            <button
              className="login-social-button"
              type="button"
              disabled
              title="به‌زودی فعال می‌شود"
            >
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15Z"/>
                <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.8 1.2-4.1 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2H5.9v5.3A20 20 0 0 0 24 44Z"/>
                <path fill="#FBBC05" d="M12.8 27.8a12 12 0 0 1 0-7.6v-5.3H5.9a20 20 0 0 0 0 18.2l6.9-5.3Z"/>
                <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8A19.5 19.5 0 0 0 24 4 20 20 0 0 0 5.9 14.9l6.9 5.3c1.6-4.7 6-8.1 11.2-8.1Z"/>
              </svg>
              <span>ورود با Google</span>
              <small>به‌زودی</small>
            </button>

            <button
              className="login-social-button"
              type="button"
              disabled
              title="به‌زودی فعال می‌شود"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="login-apple-icon">
                <path d="M16.4 12.2c0-2 1.6-3 1.7-3.1a3.8 3.8 0 0 0-3-1.6c-1.3-.1-2.4.8-3 .8s-1.5-.8-2.6-.8a4 4 0 0 0-3.4 2.1c-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.5 2.1 2.6 2.1 1 0 1.4-.7 2.7-.7s1.7.7 2.7.7c1.1 0 1.8-1 2.5-2.1a9 9 0 0 0 1.2-2.5 3.6 3.6 0 0 1-2.5-3.4ZM14.4 6.2A3.8 3.8 0 0 0 15.3 3a4 4 0 0 0-2.8 1.5 3.5 3.5 0 0 0-.9 3.1 3.3 3.3 0 0 0 2.8-1.4Z"/>
              </svg>
              <span>ورود با Apple</span>
              <small>به‌زودی</small>
            </button>
          </div>

          <p className="login-terms">
            با استفاده از نگار، مسئولیت حفظ امنیت رمز عبورت با خودت است.
          </p>
        </section>
      </section>

      <footer className="login-footer">
        <span>SHAYAN HUB / NEGAR</span>
        <span>ساخته‌شده برای کار با صدا و کلمات</span>
      </footer>
    </main>
  )
}

export default Login
