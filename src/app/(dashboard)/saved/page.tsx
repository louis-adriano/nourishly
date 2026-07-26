"use client";

import { useEffect, useState } from "react";
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

export default function SavedPage() {
  const router = useRouter();
  const [items, setItems] = useState<SavedRecipeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchSaved(1, true);
  }, []);

  async function fetchSaved(pageNum: number, replace: boolean) {
    if (replace) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetch(`/api/saved-recipes?page=${pageNum}`);
      const data = await res.json() as { recipes: SavedRecipeItem[]; hasMore: boolean };
      if (res.ok) {
        setItems(prev => replace ? data.recipes : [...prev, ...data.recipes]);
        setHasMore(data.hasMore);
        setPage(pageNum);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
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

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center", color: "var(--color-text-3)", fontSize: "0.9rem" }}>
          Loading saved recipes…
        </div>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="card no-hover" style={{ padding: "48px 40px", textAlign: "center", maxWidth: 480, width: "100%" }}>
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

  // ── Recipe grid ───────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}>

      {/* Header */}
      <div className="card no-hover" style={{ padding: "24px 28px", marginBottom: 24 }}>
        <h1 style={{
          fontFamily: "var(--font-display), system-ui, sans-serif",
          fontWeight: 800,
          fontSize: "2rem",
          color: "var(--color-text)",
          margin: "0 0 4px",
          letterSpacing: "-0.03em",
        }}>
          Saved Recipes
        </h1>
        <p style={{ color: "var(--color-text-3)", fontSize: "0.875rem", margin: 0 }}>
          {items.length} recipe{items.length !== 1 ? "s" : ""} saved
        </p>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
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
            onClick={() => fetchSaved(page + 1, false)}
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
    <div style={{ position: "relative" }}>
      <div
        className="recipe-card"
        onClick={onNavigate}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onNavigate(); }}
      >
        {/* Top */}
        <div className="card-top">
          <div className="card-top-row">
            <span className="cuisine-tag">{cuisine}</span>
            <span className="card-emoji" aria-hidden="true">{emoji}</span>
          </div>
        </div>

        {/* Bottom */}
        <div className="card-bottom">
          <h3 className="card-title">{recipe.title}</h3>

          {ingredients.length > 0 && (
            <div className="ingredient-pills">
              {ingredients.slice(0, 2).map((ing, i) => (
                <span key={i} className="ingredient-pill">{ing.name}</span>
              ))}
            </div>
          )}

          <div className="card-meta">
            <span className="meta-time">⏱️ {recipe.cook_time_mins} min</span>
            <span className="meta-calories">⚡ {calories} kcal</span>
          </div>

          <div className="card-view">View recipe →</div>
        </div>
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
    </div>
  );
}
