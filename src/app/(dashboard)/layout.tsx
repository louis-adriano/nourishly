"use client";

import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">{children}</main>

      <style jsx>{`
        .app-shell {
          display: flex;
          min-height: 100vh;
          background: var(--color-bg);
        }

        .main-content {
          margin-left: 220px;
          flex: 1;
          min-height: 100vh;
          background: var(--color-bg);
          padding: 40px 48px;
          max-width: 1100px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}