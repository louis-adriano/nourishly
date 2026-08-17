'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AuthMobileHeader from '@/components/auth/AuthMobileHeader'

interface FormFields {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  fullName?: string
  email?: string
  password?: string
  confirmPassword?: string
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateForm(fields: FormFields): FormErrors {
  const errors: FormErrors = {}
  if (!fields.fullName.trim()) errors.fullName = 'Full name is required.'
  if (!fields.email.trim()) errors.email = 'Email is required.'
  else if (!validateEmail(fields.email)) errors.email = 'Please enter a valid email address.'
  if (!fields.password) errors.password = 'Password is required.'
  else if (fields.password.length < 8) errors.password = 'Password must be at least 8 characters.'
  if (!fields.confirmPassword) errors.confirmPassword = 'Please confirm your password.'
  else if (fields.password !== fields.confirmPassword) errors.confirmPassword = 'Passwords do not match.'
  return errors
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [fields, setFields] = useState<FormFields>({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof FormFields, boolean>>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    const updated = { ...fields, [name]: value }
    setFields(updated)
    if (touched[name as keyof FormFields]) {
      const newErrors = validateForm(updated)
      setErrors(prev => ({ ...prev, [name]: newErrors[name as keyof FormErrors] }))
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const { name } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    const newErrors = validateForm(fields)
    setErrors(prev => ({ ...prev, [name]: newErrors[name as keyof FormErrors] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const allTouched = { fullName: true, email: true, password: true, confirmPassword: true }
    setTouched(allTouched)
    const newErrors = validateForm(fields)
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    if (!termsAccepted) {
      setTermsError(true)
      return
    }
    setTermsError(false)

    setLoading(true)
    setServerError('')

    const { error } = await supabase.auth.signUp({
      email: fields.email,
      password: fields.password,
      options: {
        data: { full_name: fields.fullName }
      }
    })

    if (error) {
      setServerError(error.message)
      setLoading(false)
      return
    }

    router.push('/onboarding')
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      setServerError(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="panel-left" aria-hidden="true">
        <div className="panel-blob panel-blob--1" />
        <div className="panel-blob panel-blob--2" />
        <img src="/logo-transparent.png" alt="" className="panel-watermark" />
        <div className="panel-content">
          <div className="panel-logo">
            <img src="/icons/icon-192.png" alt="" width={28} height={28} style={{ borderRadius: 8, display: "block" }} />
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
        <AuthMobileHeader
          heading="Create your account"
          subtextPrefix="Already have one?"
          subtextLinkText="Sign in"
          subtextLinkHref="/login"
          compact
        />
        <div className="mobile-form-shell">
        <div className="form-card">
          <div className="form-header">
            <h1 className="form-title">Create your account</h1>
            <p className="form-subtitle">
              Already have one?{' '}
              <Link href="/login" className="form-link">Sign in</Link>
            </p>
          </div>

          <form className="form" onSubmit={handleSubmit} noValidate>
            <div className={`field${errors.fullName && touched.fullName ? ' field--error' : ''}`}>
              <label className="field-label" htmlFor="fullName">Full Name</label>
              <input id="fullName" name="fullName" type="text" autoComplete="name" placeholder="John Smith" className="field-input" value={fields.fullName} onChange={handleChange} onBlur={handleBlur} aria-describedby={errors.fullName ? 'fullName-error' : undefined} aria-invalid={!!errors.fullName} />
              {errors.fullName && touched.fullName && (
                <p id="fullName-error" className="field-error" role="alert">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {errors.fullName}
                </p>
              )}
            </div>

            <div className={`field${errors.email && touched.email ? ' field--error' : ''}`}>
              <label className="field-label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" placeholder="you@email.com" className="field-input" value={fields.email} onChange={handleChange} onBlur={handleBlur} aria-describedby={errors.email ? 'email-error' : undefined} aria-invalid={!!errors.email} />
              {errors.email && touched.email && (
                <p id="email-error" className="field-error" role="alert">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {errors.email}
                </p>
              )}
            </div>

            <div className={`field${errors.password && touched.password ? ' field--error' : ''}`}>
              <label className="field-label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" placeholder="Min. 8 characters" className="field-input" value={fields.password} onChange={handleChange} onBlur={handleBlur} aria-describedby={errors.password ? 'password-error' : undefined} aria-invalid={!!errors.password} />
              {errors.password && touched.password && (
                <p id="password-error" className="field-error" role="alert">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {errors.password}
                </p>
              )}
            </div>

            <div className={`field${errors.confirmPassword && touched.confirmPassword ? ' field--error' : ''}`}>
              <label className="field-label" htmlFor="confirmPassword">Confirm Password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Re-enter your password" className="field-input" value={fields.confirmPassword} onChange={handleChange} onBlur={handleBlur} aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined} aria-invalid={!!errors.confirmPassword} />
              {errors.confirmPassword && touched.confirmPassword && (
                <p id="confirmPassword-error" className="field-error" role="alert">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div style={{ marginBottom: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => { setTermsAccepted(e.target.checked); if (e.target.checked) setTermsError(false) }}
                  style={{ width: 16, height: 16, accentColor: 'var(--color-green)', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-2)' }}>
                  I agree to the{' '}
                  <Link href="/terms" className="form-link">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="form-link">Privacy Policy</Link>
                </span>
              </label>
              {termsError && (
                <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: 4, marginBottom: 0 }}>
                  You must agree to the Terms of Service and Privacy Policy to continue.
                </p>
              )}
            </div>

            {serverError && <p className="field-error" role="alert">{serverError}</p>}

            <button type="submit" className="submit-btn" disabled={loading || !termsAccepted}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="divider"><span>or</span></div>

          <button type="button" className="google-btn" onClick={handleGoogleSignIn} disabled={googleLoading}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 16.1 3 9.3 7.5 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 45c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 36.5 27 37.5 24 37.5c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.2 40.5 16.1 45 24 45z" />
              <path fill="#1976D2" d="M43.6 20.5h-1.9V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.4C41.9 35.6 45 30.2 45 24c0-1.4-.1-2.7-.4-3.5z" />
            </svg>
            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
          </button>
        </div>
        </div>
      </div>

      <style jsx>{`
        .page { display: flex; min-height: 100dvh; width: 100%; padding: 0; font-family: 'DM Sans', 'Nunito', sans-serif; background: #f7faf8; }
        .panel-left { position: relative; width: 50%; background: #2C7A4B; display: flex; align-items: stretch; overflow: hidden; flex-shrink: 0; }
        .panel-blob { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.35; }
        .panel-blob--1 { width: 380px; height: 380px; background: #1a5c38; top: -100px; right: -80px; }
        .panel-blob--2 { width: 300px; height: 300px; background: #4aaa72; bottom: -60px; left: -60px; }
        .panel-watermark { position: absolute; width: 560px; height: 560px; right: -160px; bottom: -140px; opacity: 0.14; pointer-events: none; user-select: none; }
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
        .mobile-form-shell { width: 100%; }
        .form-card { width: 100%; max-width: 400px; margin: 0 auto; }
        .form-header { margin-bottom: 32px; }
        .form-title { font-size: 26px; font-weight: 800; color: #1a3a28; letter-spacing: -0.5px; margin: 0 0 8px; }
        .form-subtitle { font-size: 14px; color: #7a9a88; margin: 0; }
        .form-link { color: #2C7A4B; font-weight: 600; text-decoration: none; }
        .form-link:hover { text-decoration: underline; }
        .form { display: flex; flex-direction: column; gap: 18px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field-label { font-size: 13px; font-weight: 600; color: #2d4a3a; letter-spacing: 0.1px; }
        .field-input { width: 100%; padding: 11px 14px; border-radius: 10px; border: 1.5px solid #d4e6da; background: #fff; font-size: 16px; color: #1a3a28; font-family: inherit; transition: border-color 0.15s ease, box-shadow 0.15s ease; outline: none; box-sizing: border-box; }
        .field-input::placeholder { color: #b0c8bb; }
        .field-input:focus { border-color: #2C7A4B; box-shadow: 0 0 0 3px rgba(44,122,75,0.12); }
        .field--error .field-input { border-color: #e05252; box-shadow: none; }
        .field--error .field-input:focus { box-shadow: 0 0 0 3px rgba(224,82,82,0.12); }
        .field-error { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #e05252; margin: 0; font-weight: 500; }
        .submit-btn { margin-top: 6px; width: 100%; padding: 13px; border-radius: 10px; border: none; background: #2C7A4B; color: #fff; font-size: 15px; font-weight: 700; font-family: inherit; cursor: pointer; letter-spacing: 0.1px; transition: background 0.15s ease, transform 0.1s ease; }
        .submit-btn:hover { background: #245f3c; }
        .submit-btn:active { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; color: #9db8aa; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e2ede6; }
        .google-btn { width: 100%; padding: 12px; border-radius: 10px; border: 1.5px solid #d4e6da; background: #fff; color: #1a3a28; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: background 0.15s ease, border-color 0.15s ease; box-sizing: border-box; }
        .google-btn:hover:not(:disabled) { background: #f5f9f6; border-color: #b8d8c4; }
        .google-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        @media (max-width: 767px) {
          .page { flex-direction: column; background: var(--color-green-dark); }
          .panel-left { display: none; }
          .panel-right { display: flex; flex-direction: column; justify-content: flex-start; align-items: stretch; padding: 0; min-height: 100dvh; }
          .form-header { display: none; }
          .mobile-form-shell {
            flex: 1;
            position: relative;
            z-index: 2;
            margin-top: -24px;
            border-radius: 24px 24px 0 0;
            background: var(--color-bg, #F7F5F0);
            padding: 32px 28px 40px;
          }
          .form-card { max-width: none; }
        }
      `}</style>
    </div>
  )
}
