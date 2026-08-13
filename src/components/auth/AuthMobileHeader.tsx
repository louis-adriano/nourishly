'use client'

import Link from 'next/link'

export default function AuthMobileHeader({
  heading,
  subtextPrefix,
  subtextLinkText,
  subtextLinkHref,
  compact = false,
}: {
  heading: string
  subtextPrefix: string
  subtextLinkText: string
  subtextLinkHref: string
  compact?: boolean
}) {
  return (
    <div className={`auth-mobile-header${compact ? ' auth-mobile-header--compact' : ''}`}>
      <img src="/logo-transparent.png" alt="" className="header-watermark" />
      <div className="auth-mobile-header-content">
        <div className="auth-mobile-header-logo">
          <img src="/icons/icon-192.png" alt="" width={20} height={20} style={{ borderRadius: 6, display: 'block' }} />
          <span>Nourishly</span>
        </div>
        <h1 className="auth-mobile-header-heading">{heading}</h1>
        <p className="auth-mobile-header-subtext">
          {subtextPrefix}{' '}
          <Link href={subtextLinkHref} className="auth-mobile-header-link">{subtextLinkText}</Link>
        </p>
        <p className="auth-mobile-header-tagline">
          AI-powered nutrition and recipe planning designed around you.
        </p>
      </div>

      <style jsx>{`
        .auth-mobile-header {
          display: none;
        }

        @media (max-width: 767px) {
          .auth-mobile-header {
            position: relative;
            display: block;
            overflow: hidden;
            background: linear-gradient(135deg, var(--color-green) 0%, var(--color-green-dark) 100%);
            padding: max(48px, calc(env(safe-area-inset-top, 0px) + 20px)) 28px 40px 28px;
          }

          .auth-mobile-header--compact {
            padding: max(40px, calc(env(safe-area-inset-top, 0px) + 16px)) 28px 32px 28px;
          }

          .header-watermark {
            position: absolute;
            width: 280px;
            height: 280px;
            right: -80px;
            bottom: -80px;
            opacity: 0.14;
            pointer-events: none;
            user-select: none;
          }

          .auth-mobile-header-content {
            position: relative;
            z-index: 1;
          }

          .auth-mobile-header-logo {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 20px;
          }

          .auth-mobile-header-logo span {
            font-size: 16px;
            font-weight: 700;
            color: #fff;
            letter-spacing: -0.2px;
          }

          .auth-mobile-header-heading {
            font-size: 28px;
            font-weight: 800;
            color: #fff;
            letter-spacing: -0.5px;
            margin: 0 0 8px;
          }

          .auth-mobile-header-subtext {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.85);
            margin: 0 0 16px;
          }

          :global(.auth-mobile-header-link) {
            color: #fff;
            font-weight: 700;
            text-decoration: underline;
          }

          .auth-mobile-header-tagline {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.75);
            line-height: 1.5;
            margin: 0;
            max-width: 260px;
          }
        }
      `}</style>
    </div>
  )
}
