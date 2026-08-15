export default function Loading() {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "var(--color-bg)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: "16px", zIndex: 10,
    }}>
      <img src="/icons/icon-192.png" alt="" width={56} height={56} style={{ borderRadius: 14 }} />
      <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--color-border)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 2, background: "var(--color-green)", animation: "loadBar 1s ease infinite" }} />
      </div>
      <style>{`@keyframes loadBar { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
    </div>
  )
}
