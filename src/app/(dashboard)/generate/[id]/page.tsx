"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

// ─── Types (matching Louis's FR03-02 API response shape exactly) ──────────────

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
    fetch("/api/meal-logs")
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
      <div style={{ fontFamily: "'DM Sans', 'Nunito', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e8f0eb", borderTopColor: "#2C7A4B", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 14, color: "#7a9a88", margin: 0 }}>Loading recipe…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────

  if (error || !recipe || !nutrition) {
    return (
      <div style={{ fontFamily: "'DM Sans', 'Nunito', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12, textAlign: "center", padding: "0 24px" }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e57373" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a3a28", margin: 0 }}>Could not load recipe</h2>
        <p style={{ fontSize: 14, color: "#7a9a88", margin: 0 }}>{error ?? "Recipe not found."}</p>
        <a href="/generate" style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "#2C7A4B", textDecoration: "underline" }}>
          Back to recipes
        </a>
      </div>
    );
  }

  const limitReached = remaining <= 0;
  const canSend = inputValue.trim().length > 0 && !chatLoading && !limitReached;

  // ── Recipe detail ───────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'DM Sans', 'Nunito', sans-serif", maxWidth: 760, margin: "0 auto", padding: "32px 24px 64px" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* ── Back link ── */}
      <a
        href="/generate"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#2C7A4B", textDecoration: "none", marginBottom: 28 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        Back to recipes
      </a>

      {/* ── Recipe header ── */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1a3a28", margin: "0 0 8px", letterSpacing: "-0.5px", lineHeight: 1.2 }}>
          {recipe.title}
        </h1>
        <p style={{ fontSize: 15, color: "#7a9a88", margin: "0 0 16px", lineHeight: 1.6 }}>
          {recipe.description}
        </p>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: "#eaf4ee", color: "#2C7A4B", fontSize: 13, fontWeight: 700 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          {recipe.cook_time_mins} min cook time
        </span>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #e8f0eb", marginBottom: 32 }} />

      {/* ── Two-column layout: ingredients + nutrition ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 40 }}>

        {/* ── Ingredients (live — updated by substitution) ── */}
        <section>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1a3a28", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-flex", padding: 6, borderRadius: 8, background: "#eaf4ee" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2C7A4B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
              </svg>
            </span>
            Ingredients
          </h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {ingredients.map((ing, i) => (
              <li
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: i % 2 === 0 ? "#f8faf9" : "#fff", border: "1px solid #e8f0eb", animation: "fadeUp 0.2s ease both" }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2C7A4B", flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: "#1a3a28", fontWeight: 500 }}>
                  {[ing.quantity, ing.unit, ing.name].filter(Boolean).join(" ")}
                  {substitutedIngredients.has(i) && (
                    <span style={{ background: "var(--color-green-light)", color: "var(--color-green-dark)", borderRadius: 4, padding: "2px 6px", fontSize: "0.65rem", fontWeight: 600, marginLeft: 6, verticalAlign: "middle" }}>
                      Substituted
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Nutrition breakdown (live — updated by substitution) ── */}
        <section>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1a3a28", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-flex", padding: 6, borderRadius: 8, background: "#eaf4ee" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2C7A4B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </span>
            Nutrition per serving
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {NUTRITION_ROWS.map((row) => (
              <div
                key={row.key}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 10, background: row.color, border: "1px solid #e8f0eb", animation: "fadeUp 0.2s ease both" }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1a3a28" }}>{row.label}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#2C7A4B" }}>
                  {nutrition[row.key]} {row.unit}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Mark as Cooked ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, marginBottom: 40 }}>
        <button
          onClick={handleMarkAsCooked}
          disabled={cookState !== "idle"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            borderRadius: 12,
            border: "none",
            background: cookState === "logged" ? "#eaf4ee" : "#2C7A4B",
            color: cookState === "logged" ? "#2C7A4B" : "#fff",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: cookState === "idle" ? "pointer" : "not-allowed",
            opacity: cookState === "loading" ? 0.8 : 1,
            transition: "background 0.15s ease",
          }}
        >
          {cookState === "loading" && (
            <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
          )}
          {cookState === "logged" ? "Logged Today ✓" : "Mark as Cooked"}
        </button>
        {cookError && (
          <p style={{ fontSize: 13, color: "#b03a3a", margin: 0 }}>{cookError}</p>
        )}
      </div>

      {/* ── Cooking steps ── */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1a3a28", margin: "0 0 20px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", padding: 6, borderRadius: 8, background: "#eaf4ee" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2C7A4B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </span>
          Cooking Steps
          {stepsLoading && (
            <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "var(--color-text-3)", marginLeft: 8 }}>Updating steps...</span>
          )}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {steps.map((step) => (
            <div
              key={step.step_number}
              style={{ display: "flex", gap: 16, padding: "16px 18px", borderRadius: 12, background: "#fff", border: "1.5px solid #e8f0eb" }}
            >
              <span style={{ flexShrink: 0, width: 32, height: 32, borderRadius: "50%", background: "#2C7A4B", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>
                {step.step_number}
              </span>
              <p style={{ margin: 0, fontSize: 14, color: "#2d4a38", lineHeight: 1.65, paddingTop: 5 }}>
                {step.instruction}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Substitution chat panel ── */}
      <section>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1a3a28", margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", padding: 6, borderRadius: 8, background: "#eaf4ee" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2C7A4B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          Ingredient substitution
        </h2>

        {/* Remaining count */}
        <p style={{ fontSize: 12, color: limitReached ? "#e57373" : "#7a9a88", margin: "0 0 16px" }}>
          {limitReached
            ? "You've used all substitutions for this session."
            : `${remaining} substitution${remaining === 1 ? "" : "s"} remaining`}
        </p>

        {/* Chat panel */}
        <div style={{ border: "1.5px solid #d4e6da", borderRadius: 14, overflow: "hidden", background: "#fff" }}>

          {/* Message thread */}
          <div style={{ minHeight: 160, maxHeight: 320, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.length === 0 && (
              <p style={{ fontSize: 13, color: "#b0c4b8", textAlign: "center", margin: "auto", lineHeight: 1.6 }}>
                Ask about an ingredient — e.g.<br />
                <em>&quot;I don&apos;t have heavy cream, what can I use?&quot;</em>
              </p>
            )}
            {messages.map((msg, i) => {
              if (msg.role === "user") {
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "flex-end", animation: "fadeUp 0.2s ease both" }}>
                    <div style={{ maxWidth: "75%", padding: "9px 14px", borderRadius: "14px 14px 4px 14px", background: "#2C7A4B", color: "#fff", fontSize: 13, lineHeight: 1.55 }}>
                      {msg.text}
                    </div>
                  </div>
                );
              }
              if (msg.role === "error") {
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "flex-start", animation: "fadeUp 0.2s ease both" }}>
                    <div style={{ maxWidth: "75%", padding: "9px 14px", borderRadius: "14px 14px 14px 4px", background: "#fdf0f0", border: "1px solid #f9c0c0", color: "#b03a3a", fontSize: 13, lineHeight: 1.55 }}>
                      {msg.text}
                    </div>
                  </div>
                );
              }
              return (
                <div key={i} style={{ display: "flex", justifyContent: "flex-start", animation: "fadeUp 0.2s ease both" }}>
                  <div style={{ maxWidth: "75%", padding: "9px 14px", borderRadius: "14px 14px 14px 4px", background: "#f0f9f4", border: "1px solid #d4e6da", color: "#1a3a28", fontSize: 13, lineHeight: 1.55 }}>
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {/* AI typing indicator */}
            {chatLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start", animation: "fadeUp 0.2s ease both" }}>
                <div style={{ padding: "10px 14px", borderRadius: "14px 14px 14px 4px", background: "#f0f9f4", border: "1px solid #d4e6da", display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map((dot) => (
                    <span key={dot} style={{ width: 6, height: 6, borderRadius: "50%", background: "#2C7A4B", display: "inline-block", animation: `bounce 1s ease-in-out ${dot * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input row */}
          <div style={{ borderTop: "1px solid #e8f0eb", padding: "10px 12px", display: "flex", gap: 8, alignItems: "center", background: "#f8faf9" }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={chatLoading || limitReached}
              placeholder={limitReached ? "Substitution limit reached" : "I don't have X, what can I use?"}
              style={{ flex: 1, fontSize: 13, padding: "9px 14px", borderRadius: 10, border: "1px solid #d4e6da", background: "#fff", color: "#1a3a28", outline: "none", opacity: limitReached ? 0.5 : 1 }}
            />
            <button
              onClick={handleSend}
              disabled={!canSend}
              style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: canSend ? "#2C7A4B" : "#d4e6da", color: canSend ? "#fff" : "#a0b8a8", fontSize: 13, fontWeight: 700, cursor: canSend ? "pointer" : "not-allowed", transition: "background 0.15s ease", flexShrink: 0 }}
            >
              {chatLoading ? "…" : "Send"}
            </button>
          </div>
        </div>
      </section>

      <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-4px); opacity: 1; } }`}</style>
    </div>
  );
}