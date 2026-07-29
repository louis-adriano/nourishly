"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getLocalDateString } from "@/lib/date";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

interface Step {
  step_number: number;
  instruction: string;
}

interface Nutrition {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface Recipe {
  id: string;
  title: string;
  description: string;
  cuisine?: string;
  cook_time_mins: number;
  ingredients: Ingredient[];
  steps: Step[];
  nutrition: Nutrition;
}

// ─── Chat types ───────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "ai" | "error";
  text: string;
}

// ─── Nutrition table rows config ──────────────────────────────────────────────
// Note: Jonathan's substitution API returns { protein, carbs, fat } without _g
// so after a substitution we map his keys back onto our Nutrition shape.

const NUTRITION_ROWS: { label: string; key: keyof Nutrition; unit: string; color: string }[] = [
  { label: "Calories",      key: "calories",  unit: "kcal", color: "#e8f5ee" },
  { label: "Protein",       key: "protein_g", unit: "g",    color: "#eef4fb" },
  { label: "Carbohydrates", key: "carbs_g",   unit: "g",    color: "#fef9ec" },
  { label: "Fat",           key: "fat_g",     unit: "g",    color: "#fdf0f0" },
];

const SUBSTITUTION_LIMIT = 10;

// ─── Display helpers ──────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecipeDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  // ── Recipe state ────────────────────────────────────────────────────────────
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Live ingredient + nutrition state (updated by substitution API) ─────────
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [nutrition, setNutrition] = useState<Nutrition | null>(null);

  // ── Substituted ingredient tracking ────────────────────────────────────────
  const [substitutedIngredients, setSubstitutedIngredients] = useState<Set<number>>(new Set());

  // ── Live steps state (may be regenerated after substitution) ───────────────
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepsLoading, setStepsLoading] = useState(false);

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [remaining, setRemaining] = useState(SUBSTITUTION_LIMIT);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Mark as Cooked state ────────────────────────────────────────────────────
  const [cookState, setCookState] = useState<"idle" | "loading" | "logged">("idle");
  const [cookError, setCookError] = useState<string | null>(null);

  // ── Add to Grocery List state ───────────────────────────────────────────────
  const [groceryState, setGroceryState] = useState<"idle" | "loading" | "added">("idle");
  const [groceryError, setGroceryError] = useState<string | null>(null);

  // ── Fetch recipe ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    fetch(`/api/recipes/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load recipe (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setRecipe(data.recipe);
        setIngredients(data.recipe.ingredients);
        setNutrition(data.recipe.nutrition);
        setSteps(data.recipe.steps);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  // ── Check if already logged today on mount ─────────────────────────────────
  useEffect(() => {
    if (!recipe) return;
    fetch(`/api/meal-logs?date=${getLocalDateString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.logs?.some((log: { recipe_id: string }) => log.recipe_id === recipe.id)) {
          setCookState("logged");
        }
      });
  }, [recipe]);

  // ── Scroll chat to bottom on new messages ───────────────────────────────────
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send substitution request ───────────────────────────────────────────────
  async function handleSend() {
    const trimmed = inputValue.trim();
    if (!trimmed || chatLoading || !recipe) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInputValue("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/substitutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: trimmed,
          recipe: {
            ...recipe,
            ingredients,
            nutrition,
          },
        }),
      });

      const data = await res.json();
      console.log('[sub] data:', JSON.stringify(data));

      if (res.status === 429) {
        // Hit the session limit
        setMessages((prev) => [
          ...prev,
          { role: "error", text: data.message ?? "Substitution limit reached." },
        ]);
        setRemaining(0);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      // ── Update remaining count ──────────────────────────────────────────────
      if (data.usage?.remaining !== undefined) {
        setRemaining(data.usage.remaining);
      }

      // ── Update ingredient list ──────────────────────────────────────────────
      // Jonathan's API returns the substitute name — find the ingredient
      // mentioned in the user message and swap it out by name match.
      if (data.substitute) {
        const updatedIngredients = ingredients.map((ing, index) => {
          const ingredientWords = ing.name.toLowerCase().split(' ');
          const msgLower = trimmed.toLowerCase();
          const msgWords = msgLower.split(' ');
          const matches =
            ingredientWords.some(word => word.length > 2 && msgLower.includes(word)) ||
            msgWords.some(word => word.length > 2 && ing.name.toLowerCase().includes(word));
          if (matches) {
            setSubstitutedIngredients(prev => new Set([...prev, index]));
            return {
              ...ing,
              name: data.substitute,
              quantity: data.substituteQuantity ?? ing.quantity,
              unit: data.substituteUnit ?? ing.unit,
            };
          }
          return ing;
        });
        setIngredients(updatedIngredients);
        void regenerateSteps(updatedIngredients);
      }

      // ── Update nutrition ────────────────────────────────────────────────────
      // Jonathan's keys: { calories, protein, carbs, fat }
      // Our Nutrition shape: { calories, protein_g, carbs_g, fat_g }
      if (data.updatedNutrition) {
        setNutrition({
          calories:  data.updatedNutrition.calories,
          protein_g: data.updatedNutrition.protein,
          carbs_g:   data.updatedNutrition.carbs,
          fat_g:     data.updatedNutrition.fat,
        });
      }

      // ── Add AI reply to thread ──────────────────────────────────────────────
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: data.explanation ?? "Here is a suggested substitute." },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [...prev, { role: "error", text: msg }]);
    } finally {
      setChatLoading(false);
    }
  }

  // ── Regenerate cooking steps after substitution ─────────────────────────────
  async function regenerateSteps(updatedIngredients: Ingredient[]) {
    if (!recipe) return;
    setStepsLoading(true);
    try {
      const res = await fetch('/api/substitutions/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_title: recipe.title, ingredients: updatedIngredients }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.steps) setSteps(data.steps);
    } catch {
      // silently fail — original steps remain
    } finally {
      setStepsLoading(false);
    }
  }

  // ── Mark as Cooked ──────────────────────────────────────────────────────────
  async function handleMarkAsCooked() {
    if (!recipe || !nutrition) return;
    setCookState("loading");
    setCookError(null);
    try {
      const res = await fetch("/api/meal-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe_id: recipe.id,
          calories: nutrition.calories,
          protein_g: nutrition.protein_g,
          carbs_g: nutrition.carbs_g,
          fat_g: nutrition.fat_g,
          logged_date: getLocalDateString(),
        }),
      });
      if (res.status === 201 || res.status === 409) {
        setCookState("logged");
        return;
      }
      const data = await res.json();
      setCookError(data.error ?? "Something went wrong.");
      setCookState("idle");
    } catch {
      setCookError("Network error — please try again.");
      setCookState("idle");
    }
  }

  // ── Add to Grocery List ─────────────────────────────────────────────────────
  async function handleAddToGrocery() {
    if (!recipe || ingredients.length === 0) return;
    setGroceryState("loading");
    setGroceryError(null);
    try {
      const res = await fetch("/api/grocery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe_id: recipe.id,
          ingredients: ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Something went wrong.");
      }
      setGroceryState("added");
    } catch (err) {
      setGroceryError(err instanceof Error ? err.message : "Network error — please try again.");
      setGroceryState("idle");
    }
  }

  // ── Enter key sends message ─────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
        <div style={{ width: 40, height: 40, border: "3px solid var(--color-border)", borderTopColor: "var(--color-green)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", margin: 0, fontFamily: "var(--font-body), system-ui, sans-serif" }}>Loading recipe…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────

  if (error || !recipe || !nutrition) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12, textAlign: "center", padding: "0 24px" }}>
        <div style={{ fontSize: "2.5rem", lineHeight: 1 }}>⚠️</div>
        <h2 style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
          Could not load recipe
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", margin: 0 }}>{error ?? "Recipe not found."}</p>
        <a href="/generate" style={{ marginTop: 8, fontSize: "0.875rem", fontWeight: 600, color: "var(--color-green)", textDecoration: "none" }}>
          ← Back to recipes
        </a>
      </div>
    );
  }

  const limitReached = remaining <= 0;
  const canSend = inputValue.trim().length > 0 && !chatLoading && !limitReached;
  const emoji = getRecipeEmoji(recipe.title);
  const cuisine = getRecipeCuisine(recipe);

  // ── Recipe detail ───────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-4px); opacity: 1; } }
        .no-hover-transform:hover { transform: none !important; box-shadow: none !important; }
        .sub-input:focus { border-color: var(--color-green) !important; outline: none; }
        .recipe-detail-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 16px;
          margin-bottom: 0;
        }
        @media (max-width: 800px) {
          .recipe-detail-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* ── Back link ── */}
      <a
        href="/generate"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: "0.85rem",
          color: "var(--color-text-3)",
          textDecoration: "none",
          marginBottom: 24,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        Back to recipes
      </a>

      {/* ── Header card ── */}
      <div className="card no-hover-transform" style={{ padding: "20px 24px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            background: "var(--color-green-light)",
            color: "var(--color-green-dark)",
            borderRadius: 20,
            padding: "6px 16px",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}>
            {cuisine}
          </span>
          <span style={{ fontSize: "2rem", lineHeight: 1 }} aria-hidden="true">{emoji}</span>
        </div>
        <h1 style={{
          fontFamily: "var(--font-display), system-ui, sans-serif",
          fontWeight: 800,
          fontSize: "1.5rem",
          color: "var(--color-text)",
          margin: "12px 0 8px",
          lineHeight: 1.2,
          letterSpacing: "-0.03em",
        }}>
          {recipe.title}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-3)", fontWeight: 500 }}>
            ⏱️{" "}
            <span style={{ color: "var(--color-text)", fontWeight: 600 }}>{recipe.cook_time_mins} min</span>
          </span>
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-3)", fontWeight: 500 }}>
            ⚡{" "}
            <span style={{ color: "var(--color-text)", fontWeight: 600 }}>{nutrition.calories} kcal</span>
          </span>
        </div>
      </div>

      {/* ── Two-column layout: ingredients (left) + nutrition/cook (right) ── */}
      <div className="recipe-detail-grid">

        {/* ── LEFT: Ingredients ── */}
        <section>
          <h2 style={{
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontWeight: 700,
            fontSize: "1rem",
            color: "var(--color-text)",
            margin: "0 0 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span style={{ color: "var(--color-green)", display: "flex", alignItems: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </span>
            Ingredients
          </h2>
          {ingredients.map((ing, i) => (
            <div
              key={i}
              className="card no-hover-transform"
              style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-green)", flexShrink: 0 }} />
              <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--color-green-dark)", minWidth: 70 }}>
                {[ing.quantity, ing.unit].filter(Boolean).join(" ")}
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text)" }}>
                {ing.name}
                {substitutedIngredients.has(i) && (
                  <span style={{
                    background: "var(--color-green-light)",
                    color: "var(--color-green-dark)",
                    borderRadius: 4,
                    padding: "2px 6px",
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    marginLeft: 6,
                    verticalAlign: "middle",
                  }}>
                    Substituted
                  </span>
                )}
              </span>
            </div>
          ))}
        </section>

        {/* ── RIGHT: Nutrition + Mark as Cooked ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Nutrition card */}
          <div className="card no-hover-transform" style={{ padding: "16px 20px" }}>
            <h2 style={{
              fontFamily: "var(--font-display), system-ui, sans-serif",
              fontWeight: 700,
              fontSize: "1rem",
              color: "var(--color-text)",
              margin: "0 0 16px",
            }}>
              Nutrition per serving
            </h2>
            {NUTRITION_ROWS.map((row, i) => (
              <div
                key={row.key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: i < NUTRITION_ROWS.length - 1 ? "1px solid var(--color-border)" : "none",
                }}
              >
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-2)", fontWeight: 500 }}>{row.label}</span>
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-green-dark)" }}>
                  {nutrition[row.key]} {row.unit}
                </span>
              </div>
            ))}
          </div>

          {/* Mark as Cooked button */}
          <button
            onClick={handleMarkAsCooked}
            disabled={cookState !== "idle"}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 10,
              borderRadius: 10,
              border: cookState === "logged" ? "1.5px solid var(--color-green)" : "none",
              background: cookState === "logged" ? "var(--color-green-light)" : "var(--color-green)",
              color: cookState === "logged" ? "var(--color-green-dark)" : "white",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: cookState === "idle" ? "pointer" : "not-allowed",
              fontFamily: "var(--font-body), system-ui, sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.15s ease",
            }}
          >
            {cookState === "loading" && (
              <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
            )}
            {cookState === "loading" ? "Logging…" : cookState === "logged" ? "✓ Logged Today" : "Mark as Cooked"}
          </button>
          {cookError && (
            <p style={{ fontSize: "0.8rem", color: "var(--color-danger)", margin: 0 }}>{cookError}</p>
          )}

          {/* Add to Grocery List button */}
          <button
            onClick={handleAddToGrocery}
            disabled={groceryState !== "idle"}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: groceryState === "added" ? "1.5px solid var(--color-green)" : "1.5px solid var(--color-border)",
              background: groceryState === "added" ? "var(--color-green-light)" : "white",
              color: groceryState === "added" ? "var(--color-green-dark)" : "var(--color-text)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: groceryState === "idle" ? "pointer" : "not-allowed",
              fontFamily: "var(--font-body), system-ui, sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.15s ease",
            }}
          >
            {groceryState === "loading" && (
              <span style={{ width: 14, height: 14, border: "2px solid rgba(0,0,0,0.15)", borderTopColor: "var(--color-green)", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
            )}
            {groceryState === "idle" && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            )}
            {groceryState === "loading" ? "Adding…" : groceryState === "added" ? "✓ Added to Grocery List" : "Add to Grocery List"}
          </button>
          {groceryError && (
            <p style={{ fontSize: "0.8rem", color: "var(--color-danger)", margin: 0 }}>{groceryError}</p>
          )}
        </div>
      </div>

      {/* ── Cooking Steps (full width) ── */}
      <section>
        <h2 style={{
          fontFamily: "var(--font-display), system-ui, sans-serif",
          fontWeight: 700,
          fontSize: "1rem",
          color: "var(--color-text)",
          margin: "20px 0 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ color: "var(--color-green)", display: "flex", alignItems: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          Cooking Steps
        </h2>
        {stepsLoading && (
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-3)", marginBottom: 12, marginTop: 0 }}>
            Updating steps...
          </p>
        )}
        {steps.map((step) => (
          <div key={step.step_number} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
            <span style={{
              width: 26,
              height: 26,
              background: "var(--color-green)",
              color: "white",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.75rem",
              flexShrink: 0,
            }}>
              {step.step_number}
            </span>
            <div className="card no-hover-transform" style={{ padding: "12px 16px", fontSize: "0.85rem", color: "var(--color-text-2)", lineHeight: 1.6, flex: 1, margin: 0 }}>
              {step.instruction}
            </div>
          </div>
        ))}
      </section>

      {/* ── Substitution panel ── */}
      <div style={{ marginTop: 32 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--color-green)", display: "flex", alignItems: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "var(--color-text)" }}>
              Ingredient substitution
            </span>
          </div>
          <span style={{ fontSize: "0.8rem", color: "#3D6B4F", fontWeight: 500 }}>
            {remaining} substitutions remaining
          </span>
        </div>

        {/* Chat box */}
        <div style={{ border: "1.5px solid #E2DDD6", borderRadius: 16, overflow: "hidden" }}>

          {/* Messages */}
          <div style={{ padding: "16px 16px 8px", minHeight: 120, display: "flex", flexDirection: "column", gap: 8, backgroundColor: "white" }}>
            {messages.length === 0 && !chatLoading ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 0", color: "#9A9A9A", fontSize: "0.85rem", fontStyle: "italic", textAlign: "center" }}>
                Ask about an ingredient — e.g.<br />
                <em>{`"I don't have heavy cream, what can I use?"`}</em>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => {
                  if (msg.role === "user") {
                    return (
                      <div key={i} style={{ alignSelf: "flex-end", maxWidth: "70%", backgroundColor: "#4A7C59", color: "white", borderRadius: 10, padding: "10px 14px", fontSize: "0.875rem", fontWeight: 500 }}>
                        {msg.text}
                      </div>
                    );
                  }
                  if (msg.role === "error") {
                    return (
                      <div key={i} style={{ alignSelf: "flex-start", maxWidth: "70%", backgroundColor: "#FFF5F5", color: "#C0392B", border: "none", borderRadius: 10, padding: "10px 14px", fontSize: "0.875rem" }}>
                        Substitution unavailable right now — please try again in a few minutes.
                      </div>
                    );
                  }
                  return (
                    <div key={i} style={{ alignSelf: "flex-start", maxWidth: "70%", backgroundColor: "#F0EDE8", color: "#4A4A4A", border: "1px solid #E2DDD6", borderLeft: "3px solid #3D6B4F", borderRadius: 10, padding: "10px 14px", fontSize: "0.875rem", lineHeight: 1.6 }}>
                      {msg.text}
                    </div>
                  );
                })}
                {chatLoading && (
                  <div style={{ alignSelf: "flex-start", display: "inline-flex", gap: 5, alignItems: "center", padding: "10px 14px", backgroundColor: "#F0EDE8", borderRadius: 10 }}>
                    {[0, 1, 2].map((dot) => (
                      <span key={dot} style={{ width: 6, height: 6, borderRadius: "50%", background: "#3D6B4F", display: "inline-block", animation: `bounce 1s ease-in-out ${dot * 0.2}s infinite` }} />
                    ))}
                  </div>
                )}
                <div ref={chatBottomRef} />
              </>
            )}
          </div>

          {/* Input row */}
          <div style={{ borderTop: "1px solid #E2DDD6", padding: "12px 16px", display: "flex", gap: 8 }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={chatLoading || limitReached}
              placeholder="I don't have X, what can I use?"
              style={{ flex: 1, border: "1.5px solid #E2DDD6", borderRadius: 10, padding: "10px 14px", fontSize: "0.875rem", background: "white", outline: "none", color: "#1A1A1A" }}
            />
            <button
              onClick={handleSend}
              disabled={!canSend}
              style={{ backgroundColor: "#3D6B4F", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, fontSize: "0.875rem", cursor: canSend ? "pointer" : "not-allowed", opacity: canSend ? 1 : 0.5 }}
            >
              Send
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
