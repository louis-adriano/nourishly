"use client";

import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      <div className="auth-container">
        {children}
      </div>

      <style jsx>{`
        .auth-layout {
          min-height: 100vh;
          background: #f7faf8;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: 'DM Sans', 'Nunito', sans-serif;
        }

        .auth-container {
          width: 100%;
          max-width: 420px;
        }
      `}</style>
    </div>
  );
}
