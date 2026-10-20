import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Dashboard.css'

type User = {
  id: number | string
  email: string
  created_at?: string
}

type HistoryRecord = {
  id: number | string
  filename: string
  language?: string | null
  text: string
  created_at?: string
}

function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
          throw new Error('دریافت مشخصات حساب ناموفق بود.')
        }

        if (!historyResponse.ok) {
          throw new Error('دریافت تاریخچه ناموفق بود.')
        }

        const userData = await userResponse.json()
        const historyData = await historyResponse.json()

        setUser(userData)
        setHistory(Array.isArray(historyData) ? historyData : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در ارتباط با سرور.')
      } finally {
        setLoading(false)
      }
    }

    void loadDashboard()
  }, [navigate])

  function logout() {
    localStorage.removeItem('access_token')
    navigate('/login', { replace: true })
  }

  function formatDate(value?: string) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat('fa-IR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }

  return (
    <main className="dashboard-page" dir="rtl">
      <header className="dashboard-header">
        <Link className="dashboard-brand" to="/">
          <span className="dashboard-brand-mark">N<span>.</span></span>
          <span>NEGAR</span>
        </Link>

        <div className="dashboard-account">
          <div className="dashboard-avatar">
            {user?.email?.charAt(0).toUpperCase() || '؟'}
          </div>
          <div className="dashboard-account-info">
            <strong>{user?.email || 'حساب کاربری'}</strong>
            <span>حساب ثبت‌نام‌شده</span>
          </div>
          <button className="dashboard-logout" onClick={logout}>
            خروج
          </button>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="dashboard-welcome">
          <span className="dashboard-eyebrow">فضای کار شخصی</span>
          <h1>سلام، خوش برگشتی.</h1>
          <p>تبدیل‌ها و متن‌های ذخیره‌شده‌ات را از اینجا مدیریت کن.</p>
          <Link className="dashboard-primary" to="/studio/negar">
            شروع تبدیل جدید <span>↗</span>
          </Link>
        </div>

        <section className="dashboard-history">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-eyebrow">فایل‌های شما</span>
              <h2>تاریخچهٔ تبدیل‌ها</h2>
            </div>
            <span className="dashboard-count">{history.length} مورد</span>
          </div>

          {loading ? (
            <div className="dashboard-empty">در حال دریافت اطلاعات حساب…</div>
          ) : error ? (
            <div className="dashboard-empty dashboard-error">
              {error}
              <button onClick={() => window.location.reload()}>تلاش دوباره</button>
            </div>
          ) : history.length === 0 ? (
            <div className="dashboard-empty">
              <span className="dashboard-empty-icon">↗</span>
              <h3>هنوز تبدیلی ثبت نشده</h3>
              <p>بعد از اولین تبدیل، تاریخچهٔ فایل‌هایت را اینجا می‌بینی.</p>
              <Link to="/studio/negar">تبدیل اولین فایل</Link>
            </div>
          ) : (
            <div className="dashboard-records">
              {history.map((record) => (
                <article className="dashboard-record" key={record.id}>
                  <div className="dashboard-file-icon">TXT</div>
                  <div className="dashboard-record-main">
                    <strong>{record.filename || 'فایل بدون نام'}</strong>
                    <span>
                      {formatDate(record.created_at)}
                      {record.language ? ` · ${record.language}` : ''}
                    </span>
                    <p>{record.text || 'متنی ثبت نشده است.'}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <footer className="dashboard-footer">
        NEGAR <span>·</span> فضای کار شخصی شما
      </footer>
    </main>
  )
}

export default Dashboard
