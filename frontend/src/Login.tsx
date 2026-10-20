import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Login.css'

type Mode = 'login' | 'register'

function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isLogin = mode === 'login'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')
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
      navigate('/dashboard')
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

            <label htmlFor="login-password">رمز عبور</label>
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

            <button className="login-submit" type="submit" disabled={loading}>
              {loading
                ? 'لطفاً صبر کن…'
                : isLogin
                  ? 'ورود به حساب'
                  : 'ساخت حساب کاربری'}
              {!loading && <span>↗</span>}
            </button>
          </form>

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
