"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/generate",
    label: "Generate",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
        <path d="M12 2a10 10 0 0 1 10 10" />
        <path d="M12 12l4-4" />
      </svg>
    ),
  },
  {
    href: "/saved",
    label: "Saved",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: "/grocery",
    label: "Grocery",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <span className="logo-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#2C7A4B" />
            <path
              d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M12 8v8"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="logo-wordmark">Nourishly</span>
      </div>

      {/* Nav Links */}
      <nav className="sidebar-nav">
        {NAV_LINKS.map(({ href, label, icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`nav-link${isActive ? " nav-link--active" : ""}`}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
              {isActive && <span className="nav-indicator" />}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="sidebar-spacer" />

      {/* User + Logout — wired by auth owner (FR-01) */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">J</div>
          <div className="user-details">
            <p className="user-name">Jonathan</p>
            <p className="user-email">jonathan@email.com</p>
          </div>
        </div>
        <button className="logout-btn" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Log Out
        </button>
      </div>

      <style jsx>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 220px;
          background: #ffffff;
          border-right: 1px solid #e8f0eb;
          display: flex;
          flex-direction: column;
          padding: 24px 0 20px;
          z-index: 50;
          font-family: 'DM Sans', 'Nunito', sans-serif;
        }

        /* Logo */
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 20px 28px;
          border-bottom: 1px solid #e8f0eb;
          margin-bottom: 16px;
        }
        .logo-icon {
          display: flex;
          align-items: center;
        }
        .logo-wordmark {
          font-size: 17px;
          font-weight: 700;
          color: #1a3a28;
          letter-spacing: -0.3px;
        }

        /* Nav */
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0 12px;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          color: #5a7a68;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          position: relative;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .nav-link:hover {
          background: #f0f7f3;
          color: #2C7A4B;
        }
        .nav-link--active {
          background: #eaf4ee;
          color: #2C7A4B;
          font-weight: 600;
        }
        .nav-icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .nav-label {
          flex: 1;
        }
        .nav-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #2C7A4B;
          flex-shrink: 0;
        }

        /* Spacer */
        .sidebar-spacer {
          flex: 1;
        }

        /* Footer */
        .sidebar-footer {
          padding: 16px 16px 0;
          border-top: 1px solid #e8f0eb;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }
        .user-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #2C7A4B;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .user-details {
          min-width: 0;
        }
        .user-name {
          font-size: 13px;
          font-weight: 600;
          color: #1a3a28;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-email {
          font-size: 11px;
          color: #8aab98;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .logout-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 9px 12px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #8aab98;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
          font-family: inherit;
        }
        .logout-btn:hover {
          background: #fef2f2;
          color: #dc2626;
        }
      `}</style>
    </aside>
  );
}