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
          background: #f7faf8;
        }

        .main-content {
          margin-left: 220px;
          flex: 1;
          min-height: 100vh;
          padding: 32px 36px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}