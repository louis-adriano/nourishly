"use client";

import { useState } from "react";
import Link from "next/link";

interface FormFields {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateForm(fields: FormFields): FormErrors {
  const errors: FormErrors = {};

  if (!fields.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

  if (!fields.email.trim()) {
    errors.email = "Email is required.";
  } else if (!validateEmail(fields.email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!fields.password) {
    errors.password = "Password is required.";
  } else if (fields.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!fields.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (fields.password !== fields.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export default function RegisterPage() {
  const [fields, setFields] = useState<FormFields>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormFields, boolean>>>({});

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    const updated = { ...fields, [name]: value };
    setFields(updated);
    if (touched[name as keyof FormFields]) {
      const newErrors = validateForm(updated);
      setErrors((prev) => ({ ...prev, [name]: newErrors[name as keyof FormErrors] }));
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const newErrors = validateForm(fields);
    setErrors((prev) => ({ ...prev, [name]: newErrors[name as keyof FormErrors] }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const allTouched = { fullName: true, email: true, password: true, confirmPassword: true };
    setTouched(allTouched);
    const newErrors = validateForm(fields);
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      // Hand off to auth owner (FR-01) — submit logic goes here
      console.log("Form valid — ready for auth submission", fields);
    }
  }

  return (
    <div className="page">
      {/* Left panel — decorative */}
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

      {/* Right panel — form */}
      <div className="panel-right">
        <div className="form-card">
          <div className="form-header">
            <h1 className="form-title">Create your account</h1>
            <p className="form-subtitle">
              Already have one?{" "}
              <Link href="/login" className="form-link">Sign in</Link>
            </p>
          </div>

          <form className="form" onSubmit={handleSubmit} noValidate>
            {/* Full Name */}
            <div className={`field${errors.fullName && touched.fullName ? " field--error" : ""}`}>
              <label className="field-label" htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="Jonathan Sebastian"
                className="field-input"
                value={fields.fullName}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-describedby={errors.fullName ? "fullName-error" : undefined}
                aria-invalid={!!errors.fullName}
              />
              {errors.fullName && touched.fullName && (
                <p id="fullName-error" className="field-error" role="alert">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Email */}
            <div className={`field${errors.email && touched.email ? " field--error" : ""}`}>
              <label className="field-label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@email.com"
                className="field-input"
                value={fields.email}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-describedby={errors.email ? "email-error" : undefined}
                aria-invalid={!!errors.email}
              />
              {errors.email && touched.email && (
                <p id="email-error" className="field-error" role="alert">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className={`field${errors.password && touched.password ? " field--error" : ""}`}>
              <label className="field-label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                className="field-input"
                value={fields.password}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-describedby={errors.password ? "password-error" : undefined}
                aria-invalid={!!errors.password}
              />
              {errors.password && touched.password && (
                <p id="password-error" className="field-error" role="alert">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className={`field${errors.confirmPassword && touched.confirmPassword ? " field--error" : ""}`}>
              <label className="field-label" htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className="field-input"
                value={fields.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                aria-invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && touched.confirmPassword && (
                <p id="confirmPassword-error" className="field-error" role="alert">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button type="submit" className="submit-btn">
              Sign Up
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        /* ── Page shell ── */
        .page {
          display: flex;
          min-height: 100vh;
          font-family: 'DM Sans', 'Nunito', sans-serif;
          background: #f7faf8;
        }

        /* ── Left decorative panel ── */
        .panel-left {
          position: relative;
          width: 42%;
          background: #2C7A4B;
          display: flex;
          align-items: stretch;
          overflow: hidden;
          flex-shrink: 0;
        }
        .panel-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.35;
        }
        .panel-blob--1 {
          width: 380px;
          height: 380px;
          background: #1a5c38;
          top: -100px;
          right: -80px;
        }
        .panel-blob--2 {
          width: 300px;
          height: 300px;
          background: #4aaa72;
          bottom: -60px;
          left: -60px;
        }
        .panel-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 40px 44px;
          width: 100%;
        }
        .panel-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .panel-logo-text {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.3px;
        }
        .panel-tagline {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .panel-headline {
          font-size: clamp(32px, 3.5vw, 48px);
          font-weight: 800;
          color: #fff;
          line-height: 1.15;
          letter-spacing: -1px;
          margin: 0 0 16px;
        }
        .panel-sub {
          font-size: 15px;
          color: rgba(255,255,255,0.75);
          line-height: 1.6;
          max-width: 280px;
          margin: 0;
        }
        .panel-dots {
          display: flex;
          gap: 8px;
        }
        .dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.4);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.25); }
        }

        /* ── Right form panel ── */
        .panel-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
        }
        .form-card {
          width: 100%;
          max-width: 400px;
        }
        .form-header {
          margin-bottom: 32px;
        }
        .form-title {
          font-size: 26px;
          font-weight: 800;
          color: #1a3a28;
          letter-spacing: -0.5px;
          margin: 0 0 8px;
        }
        .form-subtitle {
          font-size: 14px;
          color: #7a9a88;
          margin: 0;
        }
        .form-link {
          color: #2C7A4B;
          font-weight: 600;
          text-decoration: none;
        }
        .form-link:hover {
          text-decoration: underline;
        }

        /* ── Form fields ── */
        .form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-label {
          font-size: 13px;
          font-weight: 600;
          color: #2d4a3a;
          letter-spacing: 0.1px;
        }
        .field-input {
          width: 100%;
          padding: 11px 14px;
          border-radius: 10px;
          border: 1.5px solid #d4e6da;
          background: #fff;
          font-size: 14px;
          color: #1a3a28;
          font-family: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          outline: none;
          box-sizing: border-box;
        }
        .field-input::placeholder {
          color: #b0c8bb;
        }
        .field-input:focus {
          border-color: #2C7A4B;
          box-shadow: 0 0 0 3px rgba(44,122,75,0.12);
        }
        .field--error .field-input {
          border-color: #e05252;
          box-shadow: none;
        }
        .field--error .field-input:focus {
          box-shadow: 0 0 0 3px rgba(224,82,82,0.12);
        }
        .field-error {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: #e05252;
          margin: 0;
          font-weight: 500;
        }

        /* ── Submit button ── */
        .submit-btn {
          margin-top: 6px;
          width: 100%;
          padding: 13px;
          border-radius: 10px;
          border: none;
          background: #2C7A4B;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          letter-spacing: 0.1px;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .submit-btn:hover {
          background: #245f3c;
        }
        .submit-btn:active {
          transform: scale(0.98);
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .panel-left {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
