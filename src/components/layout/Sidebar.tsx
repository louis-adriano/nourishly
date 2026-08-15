"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
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

const PROFILE_TAB = {
  href: "/profile",
  label: "Profile",
  icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  ),
};

// Mobile tab bar shows all 5 destinations (desktop keeps Profile separate,
// in its own user-info card at the bottom of the sidebar).
const TAB_BAR_LINKS = [...NAV_LINKS, PROFILE_TAB];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [fullName, setFullName] = useState("User");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email ?? "");
      setFullName(user.user_metadata?.full_name || "User");
    });
  }, []);

  async function handleLogOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem("nourishly:lastGenerated");
    router.push("/login");
  }

  return (
    <>
      {/* Mobile bottom tab bar */}
      <nav className="mobile-tabbar" aria-label="Primary">
        {TAB_BAR_LINKS.map(({ href, label, icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className={`tabbar-item${isActive ? " tabbar-item--active" : ""}`}
            >
              <span className="tabbar-icon" style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "44px", height: "44px",
                background: isActive
                  ? "linear-gradient(180deg, rgba(232,240,235,0.95), rgba(232,240,235,0.7))"
                  : "transparent",
                boxShadow: isActive ? "inset 0 1px 1px rgba(255,255,255,0.8)" : "none",
                borderRadius: "12px",
              }}>
                {icon}
              </span>
            </Link>
          );
        })}
      </nav>

      <aside className="sidebar sidebar-desktop-aside" style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: "220px",
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
        borderRadius: 0,
        overflow: "visible",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
        fontFamily: "var(--font-body), system-ui, sans-serif",
      }}>

        {/* Logo */}
        <Link href="/dashboard" style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "10px",
          padding: "20px 16px 12px",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "8px",
          textDecoration: "none",
        }}>
          <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <img src="/icons/icon-192.png" alt="" width={22} height={22} style={{ borderRadius: 6, display: "block" }} />
          </span>
          <span style={{
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontWeight: 700,
            fontSize: "1.1rem",
            color: "var(--color-green-dark)",
            letterSpacing: "-0.3px",
          }}>
            Nourishly
          </span>
        </Link>

        {/* Nav Links */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "8px 12px" }}>
          {NAV_LINKS.map(({ href, label, icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`nav-link${isActive ? " active" : ""}`}
              >
                <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  {icon}
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* User + Logout */}
        <div style={{ borderTop: "1px solid var(--color-border)", padding: "12px 16px" }}>
          <Link
            href="/profile"
            className="user-info-link"
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "10px",
              marginBottom: "8px",
              padding: "6px",
              margin: "-6px -6px 8px",
              borderRadius: "10px",
              textDecoration: "none",
              transition: "background 0.15s ease",
            }}
          >
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "var(--color-green)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.85rem",
              flexShrink: 0,
            }}>
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
              <span style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--color-text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {fullName}
              </span>
              <span style={{
                fontSize: "0.7rem",
                color: "var(--color-text-2)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "140px",
              }}>
                {email}
              </span>
            </div>
          </Link>

          <button className="logout-btn" type="button" onClick={handleLogOut}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log Out
          </button>
        </div>
      </aside>

      <style jsx>{`
        .user-info-link:hover {
          background: var(--color-surface-2);
        }

        :global(.nav-link) {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          text-decoration: none;
          outline: none;
          font-weight: 500;
          font-size: 0.875rem;
          color: var(--color-text-2);
          background-color: transparent;
          transition: background 0.15s ease;
        }
        :global(.nav-link.active) {
          background-color: var(--color-green-light);
          color: var(--color-green-dark);
          font-weight: 600;
        }
        @media (hover: hover) {
          :global(.nav-link:not(.active):hover) {
            background-color: var(--color-green-light);
            opacity: 0.6;
          }
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
          color: var(--color-text-2);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
          font-family: inherit;
        }
        .logout-btn:hover {
          background: var(--color-danger-light);
          color: var(--color-danger);
        }

        @media (max-width: 767px) {
          .mobile-tabbar {
            align-items: center;
            justify-content: space-around;
            position: fixed;
            left: 22px;
            right: 22px;
            bottom: max(16px, env(safe-area-inset-bottom, 0px));
            height: 68px;
            border-radius: 999px;
            background: linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.28));
            backdrop-filter: blur(24px) saturate(180%);
            -webkit-backdrop-filter: blur(24px) saturate(180%);
            border: 1px solid rgba(255,255,255,0.65);
            box-shadow:
              inset 0 1px 1.5px rgba(255,255,255,0.9),
              inset 0 -1px 1px rgba(0,0,0,0.05),
              0 12px 32px rgba(0,0,0,0.16),
              0 2px 8px rgba(0,0,0,0.08);
            z-index: 60;
          }

          .tabbar-item {
            flex: 1;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 64px;
            text-decoration: none;
            outline: none;
          }

          .tabbar-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            color: var(--color-text-3);
            transition: background 0.15s ease, color 0.15s ease, padding 0.15s ease;
          }

          .tabbar-icon :global(svg) {
            width: 24px;
            height: 24px;
          }

          .tabbar-item--active .tabbar-icon {
            color: var(--color-green);
          }

          .tabbar-item--active:active .tabbar-icon {
            color: var(--color-green-dark);
          }

          @media (hover: hover) {
            .tabbar-item:hover .tabbar-icon {
              color: var(--color-text-2);
            }
            .tabbar-item--active:hover .tabbar-icon {
              color: var(--color-green-dark);
            }
          }
        }
      `}</style>
    </>
  );
}
