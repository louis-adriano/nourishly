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
    router.push("/login");
  }

  return (
    <aside style={{
      position: "fixed",
      top: 0,
      left: 0,
      height: "100vh",
      width: "220px",
      background: "#F5F2EE",
      borderRight: "1px solid #E2DDD6",
      display: "flex",
      flexDirection: "column",
      zIndex: 50,
      fontFamily: "var(--font-body), system-ui, sans-serif",
    }}>

      {/* Logo */}
      <div style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "10px",
        padding: "20px 16px 12px",
        borderBottom: "1px solid var(--color-border)",
        marginBottom: "8px",
      }}>
        <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#4A7C59" />
            <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 8v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
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
      </div>

      {/* Nav Links */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "8px 12px" }}>
        {NAV_LINKS.map(({ href, label, icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "10px",
                textDecoration: "none",
                backgroundColor: isActive ? "var(--color-green-light)" : "transparent",
                color: isActive ? "var(--color-green-dark)" : "var(--color-text-2)",
                fontWeight: isActive ? 600 : 500,
                fontSize: "0.875rem",
                transition: "background 0.15s ease",
              }}
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
        <div style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "10px",
          marginBottom: "8px",
        }}>
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
              color: "var(--color-text-3)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "140px",
            }}>
              {email}
            </span>
          </div>
        </div>

        <button className="logout-btn" type="button" onClick={handleLogOut}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Log Out
        </button>
      </div>

      <style jsx>{`
        .logout-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 9px 12px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--color-text-3);
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
      `}</style>
    </aside>
  );
}
