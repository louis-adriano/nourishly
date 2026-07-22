import Link from 'next/link'

const sections = [
  {
    number: '1.',
    title: 'WHO WE ARE',
    body: 'Nourishly Pty Ltd operates the Nourishly app. We are committed to protecting your personal information in accordance with the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).\n\nContact: privacy@nourishly.app',
  },
  {
    number: '2.',
    title: 'INFORMATION WE COLLECT',
    body: 'We collect the following categories of personal information:\n\nAccount Information: full name, email address, encrypted password.\n\nHealth & Body Data (sensitive information under the Privacy Act): health goal, dietary restrictions and preferences, cuisine preferences, body weight (kg), height (cm), age, biological sex.\n\nUsage Data: recipes generated, meals logged, ingredients substituted, grocery list items, saved recipes, session timestamps.\n\nTechnical Data: IP address, browser type, device type, pages visited (via Vercel analytics if enabled).',
  },
  {
    number: '3.',
    title: 'HOW WE USE YOUR INFORMATION',
    body: 'We use your information to: create and manage your account; personalise AI-generated recipe recommendations; calculate personalised nutrition targets; track your daily nutrition progress; improve the App\'s features and performance.\n\nWe do not sell your personal information to third parties. We do not use your information for advertising purposes.',
  },
  {
    number: '4.',
    title: 'SENSITIVE HEALTH INFORMATION',
    body: 'Health and body data you provide is classified as sensitive information under the Australian Privacy Act 1988. We collect this information only with your consent and use it solely to provide personalised features within the App. This data is stored securely and is never shared with third parties for commercial purposes.',
  },
  {
    number: '5.',
    title: 'DATA STORAGE AND SECURITY',
    body: 'Your data is stored using Supabase, a cloud database provider. Data is encrypted at rest and in transit using industry-standard TLS encryption. Access to your data is protected by Row Level Security (RLS) policies ensuring you can only access your own data.\n\nWe implement reasonable technical and organisational measures to protect your information, however no system is completely secure and we cannot guarantee absolute security.',
  },
  {
    number: '6.',
    title: 'DATA RETENTION',
    body: 'We retain your personal data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law. AI-generated recipes associated with your account are deleted upon account deletion.',
  },
  {
    number: '7.',
    title: 'YOUR RIGHTS UNDER THE AUSTRALIAN PRIVACY ACT',
    body: 'Under the Privacy Act 1988, you have the right to: access the personal information we hold about you; request correction of inaccurate information; request deletion of your personal information; lodge a complaint with the Office of the Australian Information Commissioner (OAIC) at www.oaic.gov.au if you believe we have mishandled your information.\n\nTo exercise these rights, contact us at privacy@nourishly.app',
  },
  {
    number: '8.',
    title: 'THIRD PARTY SERVICES',
    body: 'We use the following third-party processors:\n\nSupabase (Supabase Inc.) — database, authentication, file storage. Data may be stored in data centres outside Australia.\n\nGroq (Groq Inc.) — AI model inference for recipe generation. Your recipe preferences and dietary restrictions are sent to Groq to generate personalised recipes. No directly identifying information (name or email) is sent to Groq.\n\nVercel (Vercel Inc.) — web hosting and deployment.',
  },
  {
    number: '9.',
    title: 'COOKIES AND TRACKING',
    body: 'The App uses session cookies for authentication purposes only. We do not use advertising or tracking cookies.',
  },
  {
    number: '10.',
    title: 'CHILDREN\'S PRIVACY',
    body: 'The App is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, contact us at privacy@nourishly.app and we will delete it promptly.',
  },
  {
    number: '11.',
    title: 'CHANGES TO THIS POLICY',
    body: 'We may update this Privacy Policy from time to time. We will notify you of significant changes by email or via an in-app notice. Continued use of the App after changes constitutes acceptance.',
  },
  {
    number: '12.',
    title: 'CONTACT AND COMPLAINTS',
    body: 'Privacy Officer, Nourishly Pty Ltd\nEmail: privacy@nourishly.app\n\nFor unresolved complaints, you may contact the OAIC at www.oaic.gov.au or call 1300 363 992.',
  },
]

export default function PrivacyPage() {
  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh', padding: '48px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        <Link
          href="/register"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.875rem',
            color: 'var(--color-text-3)',
            textDecoration: 'none',
            marginBottom: 32,
          }}
        >
          ← Back
        </Link>

        <h1 style={{
          fontFamily: 'var(--font-display), system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '2rem',
          color: 'var(--color-text)',
          margin: '0 0 8px',
          letterSpacing: '-0.5px',
        }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', margin: '0 0 40px' }}>
          Last updated: July 2026
        </p>

        {sections.map((section) => (
          <div
            key={section.number}
            style={{
              borderBottom: '1px solid var(--color-border)',
              padding: '20px 0',
            }}
          >
            <h2 style={{
              fontFamily: 'var(--font-display), system-ui, sans-serif',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: 'var(--color-text)',
              margin: '0 0 10px',
              display: 'flex',
              gap: 8,
              alignItems: 'baseline',
            }}>
              <span style={{ color: 'var(--color-green)', fontWeight: 700, minWidth: 28 }}>
                {section.number}
              </span>
              {section.title}
            </h2>
            {section.body.split('\n\n').map((para, i) => (
              <p key={i} style={{
                fontSize: '0.9rem',
                color: 'var(--color-text-2)',
                lineHeight: 1.8,
                margin: i > 0 ? '12px 0 0' : '0',
                whiteSpace: 'pre-line',
              }}>
                {para}
              </p>
            ))}
          </div>
        ))}

      </div>
    </div>
  )
}
