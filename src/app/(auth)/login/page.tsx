'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="login-page">
      <div className="login-header">
        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">Sign in to your Nourishly account</p>
      </div>

      <form className="login-form" onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="email" className="form-label">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="form-input"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">Password</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            className="form-input"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        <div className="form-options">
          <div className="checkbox-group">
            <input id="remember" type="checkbox" className="form-checkbox" />
            <label htmlFor="remember" className="checkbox-label">Remember me</label>
          </div>
          <Link href="/forgot-password" className="forgot-password-link">
            Forgot Password?
          </Link>
        </div>

        {error && <p style={{ color: 'red', fontSize: '13px', margin: 0 }}>{error}</p>}

        <button type="submit" className="login-button" disabled={loading}>
          {loading ? 'Signing in...' : 'Log In'}
        </button>
      </form>

      <div className="login-footer">
        <p className="footer-text">
          Don't have an account?{' '}
          <Link href="/register" className="signup-link">Sign up</Link>
        </p>
      </div>

      <style jsx>{`
        .login-page { display: flex; flex-direction: column; width: 100%; }
        .login-header { text-align: center; margin-bottom: 32px; }
        .login-title { font-size: 28px; font-weight: 700; color: #1a3a28; margin: 0 0 8px; }
        .login-subtitle { font-size: 14px; color: #5a7a68; margin: 0; }
        .login-form { display: flex; flex-direction: column; gap: 20px; margin-bottom: 24px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-label { font-size: 14px; font-weight: 600; color: #1a3a28; }
        .form-input { padding: 10px 12px; border: 1px solid #e8f0eb; border-radius: 8px; font-size: 14px; color: #1a3a28; background: #ffffff; font-family: inherit; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .form-input::placeholder { color: #8aab98; }
        .form-input:focus { outline: none; border-color: #2C7A4B; box-shadow: 0 0 0 3px rgba(44, 122, 75, 0.1); }
        .form-options { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .checkbox-group { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .form-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: #2C7A4B; }
        .checkbox-label { font-size: 13px; color: #5a7a68; cursor: pointer; user-select: none; }
        .forgot-password-link { font-size: 13px; color: #2C7A4B; text-decoration: none; transition: opacity 0.15s ease; }
        .forgot-password-link:hover { text-decoration: underline; opacity: 0.8; }
        .login-button { padding: 12px 16px; background: #2C7A4B; color: #ffffff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s ease; font-family: inherit; }
        .login-button:hover { background: #1f5a3a; }
        .login-button:disabled { opacity: 0.6; cursor: not-allowed; }
        .login-footer { text-align: center; }
        .footer-text { font-size: 13px; color: #5a7a68; margin: 0; }
        .signup-link { color: #2C7A4B; text-decoration: none; font-weight: 600; }
        .signup-link:hover { text-decoration: underline; opacity: 0.8; }
      `}</style>
    </div>
  )
}