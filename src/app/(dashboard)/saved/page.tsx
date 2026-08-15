"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SavedRecipeItem {
  saved_id: string;
  saved_at: string;
  recipe_id: string;
  recipe: {
    recipe_id: string;
    title: string;
    description: string;
    cook_time_mins: number;
    cuisine: string | null;
    nutrition_json: {
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    };
    ingredients_json: Array<{ name: string; quantity: string; unit: string }>;
  } | null;
}

// ── Display helpers ───────────────────────────────────────────────────────────

function getRecipeEmoji(title: string): string {
  const t = title.toLowerCase();
  if (/soup|stew|broth|curry/.test(t)) return "🍲";
  if (/noodle|ramen|pasta|spaghetti|glass noodles/.test(t)) return "🍝";
  if (/rice|bibimbap|congee|fried rice/.test(t)) return "🍚";
  if (/fish|salmon|tuna|seafood|shrimp/.test(t)) return "🐟";
  if (/chicken/.test(t)) return "🍗";
  if (/beef|pork|meat|bulgogi|steak|bbq/.test(t)) return "🥩";
  if (/stir.?fry/.test(t)) return "🥘";
  if (/dumpling|wonton|gyoza/.test(t)) return "🥟";
  if (/tofu|tempeh/.test(t)) return "🫘";
  if (/salad|bowl|vegetable|veg/.test(t)) return "🥗";
  return "🍽️";
}

function getCuisine(title: string, cuisine: string | null): string {
  if (cuisine) return cuisine;
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

type SortOption = "recent" | "oldest" | "title";

export default function SavedPage() {
  const router = useRouter();
  const [items, setItems] = useState<SavedRecipeItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("recent");
  const isFirstFetch = useRef(true);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [sortOpen, setSortOpen] = useState(false);

  // Debounce the search input ~300ms before it drives the API call
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchSaved(1, true, debouncedSearch, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, sort]);

  async function fetchSaved(pageNum: number, replace: boolean, q: string, sortOption: SortOption) {
    if (replace) {
      if (isFirstFetch.current) setInitialLoading(true); else setSearching(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const params = new URLSearchParams({ page: String(pageNum), sort: sortOption });
      if (q) params.set("q", q);
      const res = await fetch(`/api/saved-recipes?${params.toString()}`);
      const data = await res.json() as { recipes: SavedRecipeItem[]; hasMore: boolean };
      if (res.ok) {
        setItems(prev => replace ? data.recipes : [...prev, ...data.recipes]);
        setHasMore(data.hasMore);
        setPage(pageNum);
      }
    } finally {
      setInitialLoading(false);
      setSearching(false);
      setLoadingMore(false);
      isFirstFetch.current = false;
    }
  }

  async function handleUnsave(recipeId: string) {
    const res = await fetch("/api/saved-recipes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipe_id: recipeId }),
    });
    if (res.ok) {
      setItems(prev => prev.filter(r => r.recipe_id !== recipeId));
    }
  }

  if (!mounted) {
    return null;
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (initialLoading) {
    return (
      <div className="loading-overlay">
        <img
          src="/icons/icon-192.png"
          alt="Nourishly"
          width={56}
          height={56}
          style={{ borderRadius: 14 }}
        />
        <div style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: "1rem",
          color: "var(--color-text-3)",
        }}>
          Loading…
        </div>
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: "var(--color-border)",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: "var(--color-green)",
            animation: "loadBar 1s ease infinite",
          }} />
        </div>
        <style>{`
          @keyframes loadBar {
            0% { width: 0%; margin-left: 0; }
            50% { width: 100%; margin-left: 0; }
            100% { width: 0%; margin-left: 100%; }
          }
        `}</style>
        <style jsx>{`
          .loading-overlay {
            position: fixed;
            inset: 0;
            padding-left: 220px;
            background: var(--color-bg);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            z-index: 10;
          }
          @media (max-width: 767px) {
            .loading-overlay {
              padding-left: 0;
              top: 56px;
              bottom: calc(58px + env(safe-area-inset-bottom, 0px));
            }
          }
        `}</style>
      </div>
    );
  }

  // ── Empty state (no saved recipes at all — only when not searching) ────────

  if (items.length === 0 && !debouncedSearch) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: isMobile ? "0 16px" : 0 }}>
        <div className="card no-hover" style={{ padding: isMobile ? "40px 24px" : "48px 40px", textAlign: "center", maxWidth: 480, width: "100%" }}>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-green)" }}>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2 style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 700, fontSize: "1.25rem", color: "var(--color-text)", margin: "0 0 8px" }}>
            No saved recipes yet
          </h2>
          <p style={{ color: "var(--color-text-2)", fontSize: "0.875rem", margin: "0 0 24px", lineHeight: 1.6 }}>
            Save recipes from the generate page to see them here
          </p>
          <Link
            href="/generate"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--color-green)",
              color: "white",
              borderRadius: 10,
              padding: "10px 24px",
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
              fontFamily: "var(--font-body), system-ui, sans-serif",
            }}
          >
            Generate Recipes
          </Link>
        </div>
        <style jsx>{`
          .no-hover:hover { transform: none !important; box-shadow: none !important; }
        `}</style>
      </div>
    );
  }

  // ── Mobile layout ────────────────────────────────────────────────────────

  if (isMobile) {
    const SORT_OPTIONS: { value: SortOption; label: string }[] = [
      { value: "recent", label: "Recently Saved" },
      { value: "oldest", label: "Oldest First" },
      { value: "title", label: "Title (A–Z)" },
    ];

    return (
      <div style={{ fontFamily: "var(--font-body), system-ui, sans-serif", paddingBottom: "16px" }}>

        {/* Compact header */}
        <div style={{ padding: "14px 16px 4px" }}>
          <span style={{ fontSize: "19px", fontWeight: 700, color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
            Saved Recipes
          </span>
          <div style={{ fontSize: "12px", color: "var(--color-green)", fontWeight: 600, marginTop: "2px" }}>
            {items.length} recipe{items.length !== 1 ? "s" : ""} saved
          </div>
        </div>

        {/* Search + sort row */}
        <div style={{ display: "flex", gap: "8px", margin: "14px 16px 16px" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "11px 14px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saved recipes..."
              style={{ border: "none", outline: "none", fontSize: "16px", flex: 1, background: "transparent", color: "var(--color-text)" }}
            />
          </div>
          <button onClick={() => setSortOpen(true)} style={{
            width: "42px", height: "42px", borderRadius: "12px", background: "var(--color-surface)",
            border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M6 12h12M10 18h4"/>
            </svg>
          </button>
        </div>

        {/* No search results */}
        {items.length === 0 && debouncedSearch && !searching && (
          <div className="card no-hover" style={{ margin: "0 16px", padding: "40px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--color-text-2)", fontSize: "0.9rem", margin: 0 }}>
              No recipes match &lsquo;{debouncedSearch}&rsquo;
            </p>
          </div>
        )}

        {/* Single column recipe cards */}
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "12px", opacity: searching ? 0.5 : 1, transition: "opacity 0.15s ease" }}>
          {items.map((item) => {
            if (!item.recipe) return null;
            return (
              <SavedRecipeCard
                key={item.saved_id}
                item={item}
                onUnsave={() => handleUnsave(item.recipe_id)}
                onNavigate={() => router.push(`/generate/${item.recipe_id}`)}
              />
            );
          })}
        </div>

        {/* Load more */}
        {hasMore && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
            <button
              type="button"
              onClick={() => fetchSaved(page + 1, false, debouncedSearch, sort)}
              disabled={loadingMore}
              style={{
                background: "var(--color-surface)",
                border: "1.5px solid var(--color-border)",
                borderRadius: 10,
                padding: "10px 28px",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--color-text-2)",
                cursor: loadingMore ? "not-allowed" : "pointer",
                opacity: loadingMore ? 0.6 : 1,
                fontFamily: "var(--font-body), system-ui, sans-serif",
              }}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}

        {/* Sort bottom sheet */}
        {sortOpen && (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setSortOpen(false); }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100 }}
          >
            <div style={{
              position: "fixed",
              inset: "auto 0 0 0",
              background: "var(--color-surface)",
              borderRadius: "20px 20px 0 0",
              padding: "0 20px 24px",
              width: "100%",
              boxShadow: "0 -20px 60px rgba(0,0,0,0.15)",
            }}>
              <div style={{ width: 36, height: 4, background: "var(--color-border)", borderRadius: 2, margin: "10px auto 16px" }} />
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text)", fontFamily: "var(--font-display)", marginBottom: "12px" }}>
                Sort by
              </div>
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setSort(opt.value); setSortOpen(false); }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "14px 12px",
                    borderRadius: "10px",
                    border: "none",
                    background: sort === opt.value ? "var(--color-green-light)" : "transparent",
                    color: sort === opt.value ? "var(--color-green-dark)" : "var(--color-text)",
                    fontSize: "14px",
                    fontWeight: sort === opt.value ? 700 : 500,
                    marginBottom: "4px",
                    fontFamily: "var(--font-body), system-ui, sans-serif",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Recipe grid ───────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}>

      {/* Header */}
      <div className="card no-hover saved-header-card" style={{ padding: "24px 28px", marginBottom: 24 }}>
        <h1 className="saved-header-title" style={{
          fontFamily: "var(--font-display), system-ui, sans-serif",
          color: "var(--color-text)",
          margin: "0 0 4px",
        }}>
          Saved Recipes
        </h1>
        <p className="saved-header-sub" style={{ color: "var(--color-text-3)", fontSize: "0.875rem", margin: 0 }}>
          {items.length} recipe{items.length !== 1 ? "s" : ""} saved
        </p>
      </div>

      {/* Search + sort controls */}
      <div style={{
        display: "flex",
        gap: 12,
        marginBottom: 20,
        flexWrap: "wrap",
      }}>
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: 200 }}>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search saved recipes…"
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              borderRadius: 10,
              border: "1.5px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontSize: "0.875rem",
              fontFamily: "var(--font-body), system-ui, sans-serif",
              outline: "none",
            }}
          />
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortOption)}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1.5px solid var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text-2)",
            fontSize: "0.875rem",
            fontFamily: "var(--font-body), system-ui, sans-serif",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="recent">Recently Saved</option>
          <option value="oldest">Oldest First</option>
          <option value="title">Title (A–Z)</option>
        </select>
      </div>

      {/* No search results */}
      {items.length === 0 && debouncedSearch && !searching && (
        <div className="card no-hover" style={{ padding: "48px 40px", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-2)", fontSize: "0.9rem", margin: 0 }}>
            No recipes match &lsquo;{debouncedSearch}&rsquo;
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="saved-grid" style={{
        marginTop: items.length === 0 ? 0 : "24px",
        opacity: searching ? 0.5 : 1,
        transition: "opacity 0.15s ease",
      }}>
        {items.map((item) => {
          if (!item.recipe) return null;
          return (
            <SavedRecipeCard
              key={item.saved_id}
              item={item}
              onUnsave={() => handleUnsave(item.recipe_id)}
              onNavigate={() => router.push(`/generate/${item.recipe_id}`)}
            />
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
          <button
            type="button"
            onClick={() => fetchSaved(page + 1, false, debouncedSearch, sort)}
            disabled={loadingMore}
            style={{
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-border)",
              borderRadius: 10,
              padding: "10px 28px",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--color-text-2)",
              cursor: loadingMore ? "not-allowed" : "pointer",
              opacity: loadingMore ? 0.6 : 1,
              fontFamily: "var(--font-body), system-ui, sans-serif",
            }}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      <style jsx>{`
        .no-hover:hover { transform: none !important; box-shadow: none !important; }
        .saved-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 767px) {
          .saved-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .saved-header-card {
            background: transparent;
            border: none;
            box-shadow: none;
            padding: 2px 0 14px;
            margin-bottom: 12px;
          }
          .saved-header-title {
            font-size: 19px !important;
            font-weight: 700 !important;
            letter-spacing: -0.3px !important;
            margin: 0 0 2px !important;
          }
          .saved-header-sub {
            font-size: 12px !important;
            color: var(--color-green) !important;
            font-weight: 600 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Saved recipe card ─────────────────────────────────────────────────────────

function SavedRecipeCard({
  item,
  onUnsave,
  onNavigate,
}: {
  item: SavedRecipeItem;
  onUnsave: () => void;
  onNavigate: () => void;
}) {
  const recipe = item.recipe!;
  const emoji = getRecipeEmoji(recipe.title);
  const cuisine = getCuisine(recipe.title, recipe.cuisine);
  const calories = recipe.nutrition_json?.calories ?? 0;
  const ingredients = recipe.ingredients_json ?? [];

  return (
    <div
      className="recipe-card"
      onClick={onNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onNavigate(); }}
    >
      {/* Top */}
      <div className="card-top">
        <span className="cuisine-tag">{cuisine}</span>
        <span className="card-emoji" aria-hidden="true">{emoji}</span>
      </div>

      {/* Bottom */}
      <div className="card-bottom">
        <h3 className="card-title">{recipe.title}</h3>

        <p className="card-description">{recipe.description}</p>

        <div className="ingredient-pills">
          {ingredients.slice(0, 2).map((ing, i) => (
            <span key={i} className="ingredient-pill">{ing.name}</span>
          ))}
        </div>

        <div className="card-meta">
          <span className="meta-time">⏱️ {recipe.cook_time_mins} min</span>
          <span className="meta-calories">⚡ {calories} kcal</span>
        </div>

        <div className="card-view">View recipe →</div>
      </div>

      {/* Bookmark — always filled since all shown recipes are saved */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onUnsave(); }}
        aria-label="Unsave recipe"
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: "var(--color-green-light)",
          border: "1.5px solid var(--color-green)",
          borderRadius: 8,
          padding: 6,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-green)" stroke="var(--color-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      <style jsx>{`
        .recipe-card {
          position: relative;
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
          transition: all 0.2s ease;
        }
        .recipe-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          transform: translateY(-2px);
        }
        .card-top {
          background: var(--color-green-light);
          padding: 14px 20px;
          height: 100px;
          position: relative;
          flex-shrink: 0;
        }
        .cuisine-tag {
          position: absolute;
          top: 14px;
          left: 20px;
          background: white;
          color: var(--color-green-dark);
          border-radius: 20px;
          padding: 4px 10px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .card-emoji {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 2rem;
          line-height: 1;
        }
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
          margin: 0 0 10px;
          min-height: 2.6rem;
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
          min-height: 2.34rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .ingredient-pills {
          display: flex;
          flex-wrap: nowrap;
          overflow: hidden;
          gap: 4px;
          min-height: 22px;
          margin-bottom: 12px;
        }
        .ingredient-pill {
          background: var(--color-surface-2);
          color: var(--color-text-2);
          border-radius: 6px;
          padding: 2px 7px;
          font-size: 0.7rem;
          max-width: 48%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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

        @media (max-width: 767px) {
          .card-top {
            height: 150px;
          }
          .card-emoji {
            font-size: 3.25rem;
          }
          .card-title {
            -webkit-line-clamp: unset;
            min-height: 0;
            overflow: visible;
          }
          .card-description {
            -webkit-line-clamp: unset;
            min-height: 0;
            overflow: visible;
          }
        }
      `}</style>
    </div>
  );
}
