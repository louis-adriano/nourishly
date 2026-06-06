"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PageState = "idle" | "loading" | "done" | "error";

interface Recipe {
  id: string;
  title: string;
  description: string;
  cook_time_mins: number;
  nutrition: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}

export default function GeneratePage() {
  const [pageState, setPageState] = useState<PageState>("idle");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleGenerate() {
    setPageState("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/recipes", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to generate recipes");
        setPageState("error");
        return;
      }
      setRecipes(data.recipes);
      setPageState("done");
    } catch {
      setErrorMsg("Network error — please try again");
      setPageState("error");
    }
  }

  function handleGenerateAgain() {
    setRecipes([]);
    handleGenerate();
  }

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="page-header">
        <div className="header-text">
          <h1 className="page-title">AI Recipe Generator</h1>
          <p className="page-subtitle">
            Let AI create personalised recipes based on your health goals and preferences
          </p>
        </div>

        <div className="header-actions">
          {(pageState === "done" || pageState === "error") && (
            <button
              className="generate-again-btn"
              onClick={handleGenerateAgain}
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
              </svg>
              Generate Again
            </button>
          )}
          <button
            className={`generate-btn${pageState === "loading" ? " generate-btn--loading" : ""}`}
            onClick={handleGenerate}
            disabled={pageState === "loading" || pageState === "done" || pageState === "error"}
            type="button"
          >
            {pageState === "loading" ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Cooking up ideas…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Generate Recipes
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="divider" />

      {/* ── Content area ── */}
      <div className={`content-area${pageState === "done" ? " content-area--grid" : ""}`}>
        {pageState === "idle" && <EmptyState />}
        {pageState === "loading" && <LoadingState />}
        {pageState === "error" && <ErrorState message={errorMsg ?? "Something went wrong"} onRetry={handleGenerate} />}
        {pageState === "done" && <RecipeGrid recipes={recipes} />}
      </div>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 64px);
          font-family: 'DM Sans', 'Nunito', sans-serif;
        }

        /* ── Header ── */
        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }
        .page-title {
          font-size: 24px;
          font-weight: 800;
          color: #1a3a28;
          letter-spacing: -0.5px;
          margin: 0 0 4px;
        }
        .page-subtitle {
          font-size: 14px;
          color: #7a9a88;
          margin: 0;
          max-width: 440px;
          line-height: 1.5;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        /* ── Generate button ── */
        .generate-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 22px;
          border-radius: 12px;
          border: none;
          background: #2C7A4B;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s ease, transform 0.1s ease, opacity 0.15s ease;
        }
        .generate-btn:hover:not(:disabled) {
          background: #245f3c;
        }
        .generate-btn:active:not(:disabled) {
          transform: scale(0.97);
        }
        .generate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .generate-btn--loading {
          opacity: 0.8 !important;
          cursor: not-allowed !important;
        }
        .btn-spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Generate Again button ── */
        .generate-again-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 11px 18px;
          border-radius: 12px;
          border: 1.5px solid #d4e6da;
          background: #fff;
          color: #2C7A4B;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .generate-again-btn:hover {
          background: #eaf4ee;
          border-color: #2C7A4B;
        }

        /* ── Divider ── */
        .divider {
          height: 1px;
          background: #e8f0eb;
          margin: 24px 0;
        }

        /* ── Content area ── */
        .content-area {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .content-area--grid {
          align-items: flex-start;
          justify-content: flex-start;
        }
      `}</style>
    </div>
  );
}

/* ── Recipe cards grid ── */
function RecipeGrid({ recipes }: { recipes: Recipe[] }) {
  const router = useRouter();

  return (
    <div className="grid-wrapper">
      <p className="grid-meta">{recipes.length} recipes generated for you</p>
      <div className="recipe-grid">
        {recipes.map((recipe, i) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            index={i}
            onClick={() => router.push(`/generate/${recipe.id}`)}
          />
        ))}
      </div>

      <style jsx>{`
        .grid-wrapper {
          width: 100%;
          animation: fadeUp 0.35s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .grid-meta {
          font-size: 13px;
          color: #7a9a88;
          margin: 0 0 16px;
          font-family: 'DM Sans', 'Nunito', sans-serif;
        }
        .recipe-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }
      `}</style>
    </div>
  );
}

/* ── Single recipe card ── */
function RecipeCard({
  recipe,
  index,
  onClick,
}: {
  recipe: Recipe;
  index: number;
  onClick: () => void;
}) {
  const CARD_COLORS = ["#eaf4ee", "#fef9ec", "#eef4fb", "#fdf0f0"];
  const ACCENT_COLORS = ["#2C7A4B", "#b07d1a", "#2a6aa8", "#b03a3a"];
  const bg = CARD_COLORS[index % CARD_COLORS.length];
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];

  return (
    <button className="card" onClick={onClick} type="button" style={{ animationDelay: `${index * 0.08}s` }}>
      {/* Color strip */}
      <div className="card-strip" style={{ background: accent }} />

      <div className="card-body">
        {/* Title */}
        <h3 className="card-title">{recipe.title}</h3>

        {/* Description */}
        <p className="card-description">{recipe.description}</p>

        {/* Meta row */}
        <div className="card-meta">
          <span className="meta-chip">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {recipe.cook_time_mins} min
          </span>
          <span className="meta-chip meta-chip--cal" style={{ background: bg, color: accent }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            {recipe.nutrition.calories} kcal
          </span>
        </div>

        {/* View arrow */}
        <div className="card-arrow" style={{ color: accent }}>
          View recipe
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
      </div>

      <style jsx>{`
        .card {
          display: flex;
          flex-direction: column;
          background: #fff;
          border: 1.5px solid #e8f0eb;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          text-align: left;
          padding: 0;
          width: 100%;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          animation: cardReveal 0.4s ease both;
          font-family: 'DM Sans', 'Nunito', sans-serif;
        }
        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(44,122,75,0.12);
          border-color: #b8d9c4;
        }
        .card:active {
          transform: translateY(-1px);
        }
        .card-strip {
          height: 5px;
          width: 100%;
          flex-shrink: 0;
        }
        .card-body {
          padding: 18px 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }
        .card-title {
          font-size: 15px;
          font-weight: 700;
          color: #1a3a28;
          margin: 0;
          letter-spacing: -0.2px;
          line-height: 1.3;
        }
        .card-description {
          font-size: 13px;
          color: #7a9a88;
          margin: 0;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
        }
        .meta-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          background: #f2f6f4;
          color: #5a7a68;
          font-size: 12px;
          font-weight: 600;
        }
        .meta-chip--cal {
          background: #eaf4ee;
        }
        .card-arrow {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 700;
          margin-top: 6px;
          transition: gap 0.15s ease;
        }
        .card:hover .card-arrow {
          gap: 8px;
        }
      `}</style>
    </button>
  );
}

/* ── Error state ── */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="error-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e57373" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h2 className="error-title">Could not generate recipes</h2>
      <p className="error-body">{message}</p>
      <button className="retry-btn" onClick={onRetry} type="button">Try again</button>

      <style jsx>{`
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 360px;
          padding: 40px 24px;
          gap: 12px;
          animation: fadeUp 0.3s ease both;
          font-family: 'DM Sans', 'Nunito', sans-serif;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .error-title {
          font-size: 18px;
          font-weight: 700;
          color: #1a3a28;
          margin: 0;
          letter-spacing: -0.3px;
        }
        .error-body {
          font-size: 14px;
          color: #7a9a88;
          margin: 0;
          line-height: 1.6;
        }
        .retry-btn {
          margin-top: 4px;
          padding: 10px 22px;
          border-radius: 10px;
          border: 1.5px solid #d4e6da;
          background: #fff;
          color: #2C7A4B;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .retry-btn:hover {
          background: #eaf4ee;
          border-color: #2C7A4B;
        }
      `}</style>
    </div>
  );
}

/* ── Empty state ── */
function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" fill="#eaf4ee" />
          <path d="M9 12c0-1.7 1.3-3 3-3s3 1.3 3 3" stroke="#2C7A4B" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 9v6" stroke="#2C7A4B" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 17h8" stroke="#2C7A4B" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="empty-title">Ready to discover new recipes?</h2>
      <p className="empty-body">
        Click <strong>Generate Recipes</strong> above and we&apos;ll create personalised
        recipe suggestions tailored to your nutrition goals and taste preferences.
      </p>
      <div className="empty-hints">
        {["Matches your health goal", "Respects your dietary needs", "Cuisine you actually enjoy"].map((hint) => (
          <span key={hint} className="hint-chip">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2C7A4B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {hint}
          </span>
        ))}
      </div>

      <style jsx>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 400px;
          padding: 40px 24px;
          animation: fadeUp 0.4s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .empty-icon { margin-bottom: 20px; }
        .empty-title {
          font-size: 18px;
          font-weight: 700;
          color: #1a3a28;
          margin: 0 0 10px;
          letter-spacing: -0.3px;
        }
        .empty-body {
          font-size: 14px;
          color: #7a9a88;
          line-height: 1.6;
          margin: 0 0 24px;
        }
        .empty-hints {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }
        .hint-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 20px;
          background: #eaf4ee;
          color: #2C7A4B;
          font-size: 12px;
          font-weight: 600;
          font-family: 'DM Sans', 'Nunito', sans-serif;
        }
      `}</style>
    </div>
  );
}

/* ── Loading state ── */
function LoadingState() {
  const steps = [
    "Reading your nutrition profile…",
    "Crafting personalised recipes…",
    "Calculating nutrition facts…",
    "Almost ready…",
  ];

  return (
    <div className="loading-state">
      <div className="loading-ring" aria-label="Generating recipes" role="status">
        <div className="ring ring--outer" />
        <div className="ring ring--inner" />
        <div className="loading-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#eaf4ee" />
            <path d="M9 12c0-1.7 1.3-3 3-3s3 1.3 3 3" stroke="#2C7A4B" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 9v6" stroke="#2C7A4B" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <h2 className="loading-title">Cooking up your recipes…</h2>
      <p className="loading-sub">Claude is thinking. This usually takes a few seconds.</p>
      <div className="loading-steps" role="list">
        {steps.map((step, i) => (
          <div key={step} className="loading-step" role="listitem" style={{ animationDelay: `${i * 0.6}s` }}>
            <span className="step-dot" style={{ animationDelay: `${i * 0.6}s` }} aria-hidden="true" />
            <span className="step-text">{step}</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 40px 24px;
          animation: fadeUp 0.3s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .loading-ring {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }
        .ring {
          position: absolute;
          border-radius: 50%;
          border: 3px solid transparent;
        }
        .ring--outer {
          width: 80px;
          height: 80px;
          border-top-color: #2C7A4B;
          border-right-color: #2C7A4B;
          animation: spin 1.2s linear infinite;
        }
        .ring--inner {
          width: 58px;
          height: 58px;
          border-bottom-color: #7ec99a;
          border-left-color: #7ec99a;
          animation: spin 0.8s linear infinite reverse;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-icon { position: relative; z-index: 1; }
        .loading-title {
          font-size: 18px;
          font-weight: 700;
          color: #1a3a28;
          margin: 0 0 6px;
          letter-spacing: -0.3px;
        }
        .loading-sub {
          font-size: 13px;
          color: #7a9a88;
          margin: 0 0 28px;
        }
        .loading-steps {
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: flex-start;
        }
        .loading-step {
          display: flex;
          align-items: center;
          gap: 10px;
          opacity: 0;
          animation: stepReveal 0.4s ease forwards;
        }
        @keyframes stepReveal {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2C7A4B;
          flex-shrink: 0;
          animation: dotPulse 1.2s ease-in-out infinite;
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.3); }
        }
        .step-text {
          font-size: 13px;
          color: #4a7a5c;
          font-family: 'DM Sans', 'Nunito', sans-serif;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}