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
    <div className="page">
      <div className="panel-left" aria-hidden="true">
        <div className="panel-blob panel-blob--1" />
        <div className="panel-blob panel-blob--2" />
        <div className="panel-content">
          <div className="panel-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#fff" fillOpacity="0.15" />
              <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 8v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="panel-logo-text">Nourishly</span>
          </div>
          <div className="panel-tagline">
            <p className="panel-headline">Eat well,<br />live fully.</p>
            <p className="panel-sub">AI-powered nutrition and recipe planning designed around you.</p>
          </div>
          <div className="panel-dots">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="dot" style={{ animationDelay: `${i * 0.3}s` }} />
            ))}
          </div>
        </div>
      </div>

      <div className="panel-right">
        <div className="form-card">
          <div className="form-header">
            <h1 className="form-title">Welcome back</h1>
            <p className="form-subtitle">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="form-link">Sign up</Link>
            </p>
          </div>

          <form className="form" onSubmit={handleLogin} noValidate>
            <div className="field">
              <label className="field-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@email.com"
                className="field-input"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="password">
                <span>Password</span>
                <Link href="/forgot-password" className="forgot-link">Forgot password?</Link>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="field-input"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="field-error" role="alert">{error}</p>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Log In'}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .page { display: flex; min-height: 100vh; font-family: 'DM Sans', 'Nunito', sans-serif; background: #f7faf8; }
        .panel-left { position: relative; width: 42%; background: #2C7A4B; display: flex; align-items: stretch; overflow: hidden; flex-shrink: 0; }
        .panel-blob { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.35; }
        .panel-blob--1 { width: 380px; height: 380px; background: #1a5c38; top: -100px; right: -80px; }
        .panel-blob--2 { width: 300px; height: 300px; background: #4aaa72; bottom: -60px; left: -60px; }
        .panel-content { position: relative; z-index: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 40px 44px; width: 100%; }
        .panel-logo { display: flex; align-items: center; gap: 10px; }
        .panel-logo-text { font-size: 18px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
        .panel-tagline { flex: 1; display: flex; flex-direction: column; justify-content: center; }
        .panel-headline { font-size: clamp(32px, 3.5vw, 48px); font-weight: 800; color: #fff; line-height: 1.15; letter-spacing: -1px; margin: 0 0 16px; }
        .panel-sub { font-size: 15px; color: rgba(255,255,255,0.75); line-height: 1.6; max-width: 280px; margin: 0; }
        .panel-dots { display: flex; gap: 8px; }
        .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.4); animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.25); } }
        .panel-right { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 32px; }
        .form-card { width: 100%; max-width: 400px; }
        .form-header { margin-bottom: 32px; }
        .form-title { font-size: 26px; font-weight: 800; color: #1a3a28; letter-spacing: -0.5px; margin: 0 0 8px; }
        .form-subtitle { font-size: 14px; color: #4a6b58; margin: 0; }
        .form-link { color: #1e5c38; font-weight: 600; text-decoration: none; }
        .form-link:hover { text-decoration: underline; }
        .form { display: flex; flex-direction: column; gap: 18px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field-label { font-size: 13px; font-weight: 600; color: #2d4a3a; letter-spacing: 0.1px; display: flex; justify-content: space-between; align-items: center; }
        .forgot-link { font-size: 12px; font-weight: 500; color: #2C7A4B; text-decoration: none; }
        .forgot-link:hover { text-decoration: underline; }
        .field-input { width: 100%; padding: 11px 14px; border-radius: 10px; border: 1.5px solid #d4e6da; background: #fff; font-size: 14px; color: #1a3a28; font-family: inherit; transition: border-color 0.15s ease, box-shadow 0.15s ease; outline: none; box-sizing: border-box; }
        .field-input::placeholder { color: #b0c8bb; }
        .field-input:focus { border-color: #2C7A4B; box-shadow: 0 0 0 3px rgba(44,122,75,0.12); }
        .field-error { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #e05252; margin: 0; font-weight: 500; }
        .submit-btn { margin-top: 6px; width: 100%; padding: 13px; border-radius: 10px; border: none; background: #2C7A4B; color: #fff; font-size: 15px; font-weight: 700; font-family: inherit; cursor: pointer; letter-spacing: 0.1px; transition: background 0.15s ease, transform 0.1s ease; }
        .submit-btn:hover { background: #245f3c; }
        .submit-btn:active { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        @media (max-width: 768px) { .panel-left { display: none; } }
        @media (max-width: 480px) {
          .panel-right { padding: 32px 20px; }
          .form-title { font-size: 22px; }
        }
      `}</style>
    </div>
  )
}
