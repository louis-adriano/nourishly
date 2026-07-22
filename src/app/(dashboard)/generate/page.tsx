"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PageState = "idle" | "loading" | "done" | "error";

interface Recipe {
  id: string;
  title: string;
  description: string;
  cuisine?: string;
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

function getRecipeCuisine(recipe: { title: string; cuisine?: string }): string {
  if (recipe.cuisine) return recipe.cuisine;
  const t = recipe.title.toLowerCase();
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

// ── Preferences config ────────────────────────────────────────────────────────

const HEALTH_GOALS = ["Weight Loss", "Muscle Gain", "General Wellness", "Maintain Weight", "Healthy Eating"];
const DIETARY_OPTIONS = ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Nut-Free", "Halal", "Kosher"];
const CUISINE_OPTIONS = ["Korean", "Japanese", "Italian", "Mexican", "Indian", "Thai", "Mediterranean", "American", "Chinese", "Vietnamese"];

// ── Page ─────────────────────────────────────────────────────────────────────

const ACTION_BTN_STYLE = {
  display: "inline-flex" as const,
  alignItems: "center" as const,
  gap: "8px",
  padding: "12px 28px",
  fontSize: "0.95rem",
  fontFamily: "var(--font-body), system-ui, sans-serif",
};

const SECTION_LABEL_STYLE = {
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  color: "var(--color-green)",
  textTransform: "uppercase" as const,
  margin: "0 0 10px",
};

function chipStyle(active: boolean) {
  return {
    background: active ? "var(--color-green)" : "transparent",
    color: active ? "white" : "var(--color-text-2)",
    border: active ? "none" : "1.5px solid var(--color-border)",
    borderRadius: "20px",
    padding: "8px 16px",
    fontSize: "0.82rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-body), system-ui, sans-serif",
    transition: "all 0.15s ease",
  } as const;
}

export default function GeneratePage() {
  const [pageState, setPageState] = useState<PageState>("idle");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previousTitles, setPreviousTitles] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/saved-recipes")
      .then((r) => r.json())
      .then((data) => {
        if (data.recipes) {
          setSavedIds(new Set(data.recipes.map((r: { recipe_id: string }) => r.recipe_id)));
        }
      })
      .catch(() => {});
  }, []);

  async function handleToggleSave(recipeId: string) {
    if (savedIds.has(recipeId)) {
      const res = await fetch("/api/saved-recipes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe_id: recipeId }),
      });
      if (res.ok) {
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(recipeId);
          return next;
        });
      }
    } else {
      const res = await fetch("/api/saved-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe_id: recipeId }),
      });
      if (res.ok || res.status === 409) {
        setSavedIds((prev) => new Set([...prev, recipeId]));
      }
    }
  }

  // Preferences modal state
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [modalGoal, setModalGoal] = useState("");
  const [modalDiet, setModalDiet] = useState<string[]>([]);
  const [modalCuisine, setModalCuisine] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function openPrefs() {
    setPrefsOpen(true);
    setSaveSuccess(false);
    setLoadingPrefs(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("health_goal, dietary_restrictions, cuisine_preferences")
        .eq("user_id", user.id)
        .single();
      if (data) {
        const goalMap: Record<string, string> = {
          "weight-loss": "Weight Loss",
          "muscle-gain": "Muscle Gain",
          "general-wellness": "General Wellness",
          "maintenance": "Maintain Weight",
          "healthy-eating": "Healthy Eating",
        };
        setModalGoal(goalMap[data.health_goal] ?? data.health_goal ?? "");

        const dietMap: Record<string, string> = {
          "vegetarian": "Vegetarian",
          "vegan": "Vegan",
          "gluten-free": "Gluten-Free",
          "dairy-free": "Dairy-Free",
          "nut-free": "Nut-Free",
          "halal": "Halal",
          "kosher": "Kosher",
        };
        const normalizedDiet = (data.dietary_restrictions ?? [])
          .map((d: string) => dietMap[d.toLowerCase()] ?? d);
        setModalDiet(normalizedDiet);

        const normalizedCuisine = (data.cuisine_preferences ?? [])
          .map((c: string) => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase());
        setModalCuisine(normalizedCuisine);
      }
    } finally {
      setLoadingPrefs(false);
    }
  }

  function toggleDiet(val: string) {
    setModalDiet(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  }

  function toggleCuisine(val: string) {
    setModalCuisine(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  }

  async function savePrefs() {
    setSaving(true);
    try {
      await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          health_goal: modalGoal,
          dietary_restrictions: modalDiet,
          cuisine_preferences: modalCuisine,
        }),
      });
      setSaveSuccess(true);
      setTimeout(() => setPrefsOpen(false), 800);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    setPageState("loading");
    setErrorMsg(null);
    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previousTitles }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error ?? "Failed to generate recipes");
        setPageState("error");
        return;
      }
      setRecipes(data.recipes);
      setPreviousTitles(data.recipes.map((r: Recipe) => r.title));
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
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 64px)" }}>

      {/* ── Header card ── */}
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
          Recipes are personalised to your health goal and preferences.
        </p>
      </div>

      {/* ── Action row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", marginTop: "16px" }}>
        <button
          type="button"
          onClick={openPrefs}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#3D6B4F",
            border: "none",
            borderRadius: "10px",
            padding: "10px 20px",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "white",
            cursor: "pointer",
            fontFamily: "var(--font-body), system-ui, sans-serif",
          }}
        >
          Edit Preferences
        </button>
        {pageState === "done" && (
          <button
            type="button"
            onClick={handleGenerateAgain}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--color-green-dark)",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "white",
              cursor: "pointer",
              fontFamily: "var(--font-body), system-ui, sans-serif",
            }}
          >
            Generate Again
          </button>
        )}
        {pageState === "error" && (
          <button
            type="button"
            onClick={handleGenerate}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--color-green)",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "white",
              cursor: "pointer",
              fontFamily: "var(--font-body), system-ui, sans-serif",
            }}
          >
            Generate Recipes
          </button>
        )}
        {pageState === "done" && recipes.length > 0 && (
          <p className="result-count">✅ {recipes.length} recipes generated for you</p>
        )}
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
        {pageState === "done"    && <RecipeGrid recipes={recipes} savedIds={savedIds} onToggleSave={handleToggleSave} />}
      </div>

      {/* ── Preferences Modal ── */}
      {prefsOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setPrefsOpen(false); }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div style={{
            background: "var(--color-surface)",
            borderRadius: "20px",
            padding: "32px",
            width: "100%",
            maxWidth: "520px",
            maxHeight: "85vh",
            overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }}>
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{
                fontFamily: "var(--font-display), system-ui, sans-serif",
                fontWeight: 700,
                fontSize: "1.25rem",
                color: "var(--color-text)",
                margin: 0,
                letterSpacing: "-0.02em",
              }}>
                Edit Preferences
              </h2>
              <button
                type="button"
                onClick={() => setPrefsOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.4rem",
                  cursor: "pointer",
                  color: "var(--color-text-3)",
                  lineHeight: 1,
                  padding: "4px 8px",
                }}
              >
                ×
              </button>
            </div>

            {loadingPrefs ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-3)", fontSize: "0.9rem" }}>
                Loading…
              </div>
            ) : (
              <>
                {/* Health Goal */}
                <div style={{ marginBottom: "24px" }}>
                  <p style={SECTION_LABEL_STYLE}>Health Goal</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {HEALTH_GOALS.map(goal => (
                      <button key={goal} type="button" onClick={() => setModalGoal(goal)} style={chipStyle(modalGoal === goal)}>
                        {goal}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dietary Restrictions */}
                <div style={{ marginBottom: "24px" }}>
                  <p style={SECTION_LABEL_STYLE}>Dietary Restrictions</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {DIETARY_OPTIONS.map(opt => (
                      <button key={opt} type="button" onClick={() => toggleDiet(opt)} style={chipStyle(modalDiet.includes(opt))}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cuisine Preferences */}
                <div style={{ marginBottom: "28px" }}>
                  <p style={SECTION_LABEL_STYLE}>Cuisine Preferences</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {CUISINE_OPTIONS.map(opt => (
                      <button key={opt} type="button" onClick={() => toggleCuisine(opt)} style={chipStyle(modalCuisine.includes(opt))}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save */}
                <button
                  type="button"
                  onClick={savePrefs}
                  disabled={saving || !modalGoal}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "12px",
                    border: "none",
                    background: saveSuccess ? "var(--color-green-dark)" : "var(--color-green)",
                    color: "white",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    cursor: saving || !modalGoal ? "not-allowed" : "pointer",
                    opacity: saving || !modalGoal ? 0.7 : 1,
                    fontFamily: "var(--font-body), system-ui, sans-serif",
                    transition: "all 0.2s ease",
                  }}
                >
                  {saveSuccess ? "✓ Saved!" : saving ? "Saving…" : "Save Preferences"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

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

function RecipeGrid({ recipes, savedIds, onToggleSave }: { recipes: Recipe[]; savedIds: Set<string>; onToggleSave: (id: string) => void }) {
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
            isSaved={savedIds.has(recipe.id)}
            onToggleSave={() => onToggleSave(recipe.id)}
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
  isSaved,
  onToggleSave,
}: {
  recipe: Recipe;
  index: number;
  onClick: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
}) {
  const emoji   = getRecipeEmoji(recipe.title);
  const cuisine = getRecipeCuisine(recipe);

  return (
    <div style={{ position: "relative" }}>
      <div
        className="recipe-card"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
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
      </div>

      {/* Bookmark button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
        aria-label={isSaved ? "Unsave recipe" : "Save recipe"}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: isSaved ? "var(--color-green-light)" : "white",
          border: `1.5px solid ${isSaved ? "var(--color-green)" : "var(--color-border)"}`,
          borderRadius: 8,
          padding: 6,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        {isSaved ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-green)" stroke="var(--color-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        )}
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
          animation: cardReveal 0.4s ease both;
          transition: all 0.2s ease;
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
    </div>
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
          Generate Recipes
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
    <div className="error-wrapper">
      <div className="card error-card">
        <div style={{ fontSize: "2.5rem", marginBottom: "12px", lineHeight: 1 }} aria-hidden="true">⚠️</div>
        <h2 style={{
          fontFamily: "var(--font-display), system-ui, sans-serif",
          fontWeight: 700,
          fontSize: "1.25rem",
          color: "var(--color-text)",
          margin: "0 0 8px",
        }}>
          Could not generate recipes
        </h2>
        <p style={{
          color: "var(--color-text-3)",
          fontSize: "0.875rem",
          margin: "0 0 20px",
          lineHeight: 1.6,
        }}>
          {message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--color-green)",
            border: "none",
            borderRadius: "10px",
            padding: "10px 20px",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "white",
            cursor: "pointer",
            fontFamily: "var(--font-body), system-ui, sans-serif",
            margin: "0 auto",
          }}
        >
          Try again
        </button>
      </div>

      <style jsx>{`
        .error-wrapper {
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
        .error-card {
          padding: 40px !important;
          text-align: center;
          max-width: 560px;
          width: 100%;
        }
        .error-card:hover {
          transform: none;
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
