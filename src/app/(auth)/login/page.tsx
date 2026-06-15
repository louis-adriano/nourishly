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

            <button type="submit" className="btn-primary submit-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Log In'}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .page { display: flex; min-height: 100vh; font-family: var(--font-body), system-ui, sans-serif; background: var(--color-bg); }

        .panel-left { position: relative; width: 42%; background: var(--color-green); display: flex; align-items: stretch; overflow: hidden; flex-shrink: 0; }
        .panel-blob { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.35; }
        .panel-blob--1 { width: 380px; height: 380px; background: var(--color-green-dark); top: -100px; right: -80px; }
        .panel-blob--2 { width: 300px; height: 300px; background: #5a9070; bottom: -60px; left: -60px; }
        .panel-content { position: relative; z-index: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 40px 44px; width: 100%; }

        .panel-logo { display: flex; align-items: center; gap: 10px; }
        .panel-logo-text { font-family: var(--font-display), system-ui, sans-serif; font-size: 1.1rem; font-weight: 700; color: #fff; letter-spacing: -0.3px; }

        .panel-tagline { flex: 1; display: flex; flex-direction: column; justify-content: center; }
        .panel-headline { font-family: var(--font-display), system-ui, sans-serif; font-size: 2.5rem; font-weight: 800; color: #fff; line-height: 1.15; letter-spacing: -0.03em; margin: 0 0 16px; }
        .panel-sub { font-family: var(--font-body), system-ui, sans-serif; font-size: 1rem; color: rgba(255,255,255,0.75); line-height: 1.6; max-width: 280px; margin: 0; }

        .panel-dots { display: flex; gap: 8px; }
        .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.4); animation: pulse 2s ease-in-out infinite; }
        .dot:first-child { background: #fff; }
        @keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.25); } }

        .panel-right { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 32px; background: var(--color-bg); }
        .form-card { width: 100%; max-width: 400px; }
        .form-header { margin-bottom: 32px; }
        .form-title { font-family: var(--font-display), system-ui, sans-serif; font-size: 1.75rem; font-weight: 800; color: var(--color-text); letter-spacing: -0.03em; margin: 0 0 8px; }
        .form-subtitle { font-size: 0.875rem; color: var(--color-text-3); margin: 0; }
        .form-link { color: var(--color-green); font-weight: 600; text-decoration: none; }
        .form-link:hover { text-decoration: underline; }

        .form { display: flex; flex-direction: column; gap: 18px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field-label { font-size: 0.8rem; font-weight: 600; color: var(--color-text-2); display: flex; justify-content: space-between; align-items: center; }
        .field-input { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1.5px solid var(--color-border); background: #fff; font-size: 0.9rem; color: var(--color-text); font-family: inherit; transition: border-color 0.15s ease, box-shadow 0.15s ease; outline: none; box-sizing: border-box; }
        .field-input::placeholder { color: var(--color-text-3); }
        .field-input:focus { border-color: var(--color-green); box-shadow: 0 0 0 3px rgba(61,107,79,0.12); }
        .field-error { display: flex; align-items: center; gap: 5px; font-size: 0.75rem; color: var(--color-danger); margin: 0; font-weight: 500; }

        .forgot-link { font-size: 0.8rem; font-weight: 500; color: var(--color-text-3); text-decoration: none; transition: color 0.15s ease; }
        .forgot-link:hover { color: var(--color-green); }

        .submit-btn { margin-top: 6px; width: 100%; padding: 13px; font-size: 0.95rem; font-family: inherit; }
        .submit-btn:active { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        @media (max-width: 768px) { .panel-left { display: none; } }
      `}</style>
    </div>
  )
}
