"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PageState = "idle" | "loading" | "done" | "error";

interface Recipe {
  id: string;
  title: string;
  description: string;
  cook_time_mins: number;
  ingredients?: Array<string | { name: string; unit?: string; quantity?: number | string }>;
  nutrition: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}

// ── Display helpers ───────────────────────────────────────────────────────────

function getRecipeEmoji(title: string): string {
  const t = title.toLowerCase();
  if (/fish|salmon|tuna|seafood|shrimp/.test(t)) return "🐟";
  if (/chicken/.test(t)) return "🍗";
  if (/beef|pork|meat|bulgogi|steak|bbq/.test(t)) return "🥩";
  if (/pasta|noodle|ramen|spaghetti/.test(t)) return "🍝";
  if (/salad|bowl|vegetable|veg|tofu/.test(t)) return "🥗";
  if (/soup|stew|broth|curry/.test(t)) return "🍲";
  if (/rice|fried rice|congee/.test(t)) return "🍚";
  return "🍽️";
}

function getRecipeCuisine(title: string): string {
  const t = title.toLowerCase();
  if (/korean|bulgogi|kimchi|bibimbap/.test(t)) return "Korean";
  if (/japanese|ramen|sushi|teriyaki|miso/.test(t)) return "Japanese";
  if (/italian|pasta|risotto|pizza/.test(t)) return "Italian";
  if (/mexican|taco|burrito|enchilada/.test(t)) return "Mexican";
  if (/indian|curry|masala|tikka/.test(t)) return "Indian";
  if (/thai|pad thai|tom yum/.test(t)) return "Thai";
  if (/mediterranean|greek|hummus/.test(t)) return "Mediterranean";
  if (/american|burger|bbq/.test(t)) return "American";
  return "Recipe";
}

// ── Page ─────────────────────────────────────────────────────────────────────

const FILTER_CONFIG: Array<{ key: string; emoji: string }> = [
  { key: "Weight Loss", emoji: "🎯" },
  { key: "Vegetarian", emoji: "🥗" },
  { key: "Korean",     emoji: "🍜" },
];

const ACTION_BTN_STYLE = {
  display: "inline-flex" as const,
  alignItems: "center" as const,
  gap: "8px",
  padding: "12px 28px",
  fontSize: "0.95rem",
  fontFamily: "var(--font-body), system-ui, sans-serif",
};

export default function GeneratePage() {
  const [pageState, setPageState] = useState<PageState>("idle");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({
    "Weight Loss": true,
    "Vegetarian": true,
    "Korean": true,
  });

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

  function toggleFilter(key: string) {
    setActiveFilters(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 64px)" }}>

      {/* ── Header card (single column) ── */}
      <div className="card header-card">
        <p className="header-label">AI RECIPE GENERATOR</p>
        <h1 style={{
          fontFamily: "var(--font-display), system-ui, sans-serif",
          fontWeight: 800,
          fontSize: "1.75rem",
          color: "var(--color-text)",
          lineHeight: 1.2,
          margin: "0 0 8px",
          letterSpacing: "-0.03em",
        }}>
          What would you like to cook?
        </h1>
        <p className="header-subtitle">
          Recipes are personalised to your filters below.
        </p>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", margin: "16px 0" }}>
        {FILTER_CONFIG.map(({ key, emoji }) => {
          const isActive = activeFilters[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleFilter(key)}
              style={{
                background: isActive ? "var(--color-green)" : "transparent",
                color: isActive ? "white" : "var(--color-text-3)",
                border: isActive ? "none" : "1.5px solid var(--color-border)",
                borderRadius: "20px",
                padding: "8px 16px",
                fontSize: "0.8rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
                cursor: "pointer",
                fontFamily: "var(--font-body), system-ui, sans-serif",
              }}
            >
              {isActive && <span>✓</span>}
              <span>{emoji}</span>
              <span>{key}</span>
            </button>
          );
        })}
        <button
          type="button"
          style={{
            background: "transparent",
            border: "1.5px dashed var(--color-border)",
            borderRadius: "20px",
            padding: "8px 16px",
            fontSize: "0.8rem",
            color: "var(--color-text-3)",
            cursor: "pointer",
            fontFamily: "var(--font-body), system-ui, sans-serif",
          }}
        >
          + Add filter
        </button>
      </div>

      {/* ── Action row ── */}
      <div className="action-row">
        <div>
          {pageState === "done" && recipes.length > 0 && (
            <p className="result-count">✅ {recipes.length} recipes generated for you</p>
          )}
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          {pageState === "done" && (
            <>
              <button className="btn-secondary" onClick={handleGenerateAgain} type="button" style={ACTION_BTN_STYLE}>
                ↩ Generate Again
              </button>
              <button className="btn-primary" onClick={handleGenerate} type="button" style={ACTION_BTN_STYLE}>
                ✨ Generate Recipes
              </button>
            </>
          )}
          {pageState === "error" && (
            <button className="btn-primary" onClick={handleGenerate} type="button" style={ACTION_BTN_STYLE}>
              ✨ Generate Recipes
            </button>
          )}
        </div>
      </div>

      {/* ── Content area ── */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: pageState === "done" ? "flex-start" : "center",
        justifyContent: pageState === "done" ? "flex-start" : "center",
      }}>
        {pageState === "idle"    && <EmptyState onGenerate={handleGenerate} />}
        {pageState === "loading" && <LoadingState />}
        {pageState === "error"   && <ErrorState message={errorMsg ?? "Something went wrong"} onRetry={handleGenerate} />}
        {pageState === "done"    && <RecipeGrid recipes={recipes} />}
      </div>

      <style jsx>{`
        .header-card {
          padding: 28px 32px !important;
          margin-bottom: 0;
        }
        .header-card:hover {
          transform: none;
        }
        .header-label {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--color-green);
          text-transform: uppercase;
          margin: 0 0 6px;
        }
        .header-subtitle {
          color: var(--color-text-3);
          font-size: 0.875rem;
          margin: 0;
          line-height: 1.5;
        }
        .action-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .result-count {
          font-size: 0.85rem;
          color: var(--color-text-3);
          margin: 0;
        }
      `}</style>
    </div>
  );
}

// ── Recipe grid ───────────────────────────────────────────────────────────────

function RecipeGrid({ recipes }: { recipes: Recipe[] }) {
  const router = useRouter();

  return (
    <div className="grid-wrapper">
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "16px",
      }}>
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
      `}</style>
    </div>
  );
}

// ── Recipe card ───────────────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  index,
  onClick,
}: {
  recipe: Recipe;
  index: number;
  onClick: () => void;
}) {
  const emoji   = getRecipeEmoji(recipe.title);
  const cuisine = getRecipeCuisine(recipe.title);

  return (
    <button
      className="recipe-card"
      onClick={onClick}
      type="button"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {/* Top section */}
      <div className="card-top">
        <div className="card-top-row">
          <span className="cuisine-tag">{cuisine}</span>
          <span className="card-emoji" aria-hidden="true">{emoji}</span>
        </div>
      </div>

      {/* Bottom section */}
      <div className="card-bottom">
        <h3 className="card-title">{recipe.title}</h3>
        <p className="card-description">{recipe.description}</p>

        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className="ingredient-pills">
            {recipe.ingredients.slice(0, 2).map((ing, i) => (
              <span key={i} className="ingredient-pill">
                {typeof ing === "string" ? ing : ing.name}
              </span>
            ))}
          </div>
        )}

        <div className="card-meta">
          <span className="meta-time">⏱️ {recipe.cook_time_mins} min</span>
          <span className="meta-calories">⚡ {recipe.nutrition.calories} kcal</span>
        </div>

        <div className="card-view">View recipe →</div>
      </div>

      <style jsx>{`
        .recipe-card {
          background: var(--color-surface);
          border-radius: 16px;
          border: 1px solid var(--color-border);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
          padding: 0;
          overflow: hidden;
          cursor: pointer;
          text-align: left;
          width: 100%;
          display: flex;
          flex-direction: column;
          animation: cardReveal 0.4s ease both;
          transition: all 0.2s ease;
          -webkit-appearance: none;
          appearance: none;
        }
        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .recipe-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          transform: translateY(-2px);
        }
        .recipe-card:active {
          transform: translateY(-1px);
        }

        /* Top section */
        .card-top {
          background: var(--color-green-light);
          padding: 20px 20px 14px;
          height: 100px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .card-top-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }
        .cuisine-tag {
          background: white;
          color: var(--color-green-dark);
          border-radius: 20px;
          padding: 4px 10px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .card-emoji {
          font-size: 2rem;
          line-height: 1;
        }

        /* Bottom section */
        .card-bottom {
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .card-title {
          font-family: var(--font-display), system-ui, sans-serif;
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--color-text);
          line-height: 1.3;
          margin: 0 0 6px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-description {
          font-size: 0.78rem;
          color: var(--color-text-3);
          line-height: 1.5;
          margin: 0 0 10px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .ingredient-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 12px;
        }
        .ingredient-pill {
          background: var(--color-surface-2);
          color: var(--color-text-2);
          border-radius: 6px;
          padding: 2px 7px;
          font-size: 0.7rem;
        }
        .card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
        }
        .meta-time {
          font-size: 0.78rem;
          color: var(--color-text-3);
        }
        .meta-calories {
          font-weight: 600;
          font-size: 0.78rem;
          color: var(--color-green-dark);
        }
        .card-view {
          display: block;
          margin-top: 10px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--color-green);
          border-top: 1px solid var(--color-border);
          padding-top: 10px;
        }
      `}</style>
    </button>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="empty-wrapper">
      <div className="card empty-card">
        <div className="empty-emoji" aria-hidden="true">🍳</div>
        <h2 className="empty-title">What&apos;s cooking today?</h2>
        <p className="empty-body">
          Generate personalised recipes based on your health goals and dietary preferences.
        </p>
        <button
          className="btn-primary"
          onClick={onGenerate}
          type="button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 28px",
            fontSize: "0.95rem",
            fontFamily: "var(--font-body), system-ui, sans-serif",
          }}
        >
          ✨ Generate Recipes
        </button>
      </div>

      <style jsx>{`
        .empty-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          animation: fadeUp 0.4s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .empty-card {
          padding: 40px !important;
          text-align: center;
          max-width: 560px;
          width: 100%;
        }
        .empty-card:hover {
          transform: none;
        }
        .empty-emoji {
          font-size: 4rem;
          margin-bottom: 16px;
          line-height: 1;
        }
        .empty-title {
          font-family: var(--font-display), system-ui, sans-serif;
          font-weight: 700;
          font-size: 1.5rem;
          color: var(--color-text);
          margin: 0;
          letter-spacing: -0.02em;
        }
        .empty-body {
          color: var(--color-text-3);
          font-size: 0.95rem;
          max-width: 400px;
          margin: 8px auto 24px;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

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

// ── Loading state ─────────────────────────────────────────────────────────────

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
