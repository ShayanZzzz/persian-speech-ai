import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

type ProtectedRouteProps = {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation()
  const [status, setStatus] = useState<
    'checking' | 'authenticated' | 'unauthenticated'
  >('checking')

  useEffect(() => {
    let active = true
    const token = localStorage.getItem('access_token')

    if (!token) {
      setStatus('unauthenticated')
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

        if (response.ok) {
          setStatus('authenticated')
        } else {
          if (response.status === 401) {
            localStorage.removeItem('access_token')
          }
          setStatus('unauthenticated')
        }
      } catch {
        if (active) setStatus('unauthenticated')
      }
    }

    void checkSession()

    return () => {
      active = false
    }
  }, [])

  if (status === 'checking') return null

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
