'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

  return (
    <div className="page">
      <div className="panel-left" aria-hidden="true">
        <div className="panel-blob panel-blob--1" />
        <div className="panel-blob panel-blob--2" />
        <img src="/icons/icon-512.png" alt="" className="panel-watermark" />
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
        </div>
      </div>

      <style jsx>{`
        .page { display: flex; min-height: 100vh; font-family: 'DM Sans', 'Nunito', sans-serif; background: #f7faf8; }
        .panel-left { position: relative; width: 42%; background: #2C7A4B; display: flex; align-items: stretch; overflow: hidden; flex-shrink: 0; }
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
        .form-card { width: 100%; max-width: 400px; }
        .form-header { margin-bottom: 32px; }
        .form-title { font-size: 26px; font-weight: 800; color: #1a3a28; letter-spacing: -0.5px; margin: 0 0 8px; }
        .form-subtitle { font-size: 14px; color: #7a9a88; margin: 0; }
        .form-link { color: #2C7A4B; font-weight: 600; text-decoration: none; }
        .form-link:hover { text-decoration: underline; }
        .form { display: flex; flex-direction: column; gap: 18px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field-label { font-size: 13px; font-weight: 600; color: #2d4a3a; letter-spacing: 0.1px; }
        .field-input { width: 100%; padding: 11px 14px; border-radius: 10px; border: 1.5px solid #d4e6da; background: #fff; font-size: 14px; color: #1a3a28; font-family: inherit; transition: border-color 0.15s ease, box-shadow 0.15s ease; outline: none; box-sizing: border-box; }
        .field-input::placeholder { color: #b0c8bb; }
        .field-input:focus { border-color: #2C7A4B; box-shadow: 0 0 0 3px rgba(44,122,75,0.12); }
        .field--error .field-input { border-color: #e05252; box-shadow: none; }
        .field--error .field-input:focus { box-shadow: 0 0 0 3px rgba(224,82,82,0.12); }
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
