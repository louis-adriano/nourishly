"use client";

import { useEffect, useState } from "react";
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

// ─── Nutrition table rows config ──────────────────────────────────────────────

const NUTRITION_ROWS: { label: string; key: keyof Nutrition; unit: string; color: string }[] = [
  { label: "Calories",      key: "calories",  unit: "kcal", color: "#e8f5ee" },
  { label: "Protein",       key: "protein_g", unit: "g",    color: "#eef4fb" },
  { label: "Carbohydrates", key: "carbs_g",   unit: "g",    color: "#fef9ec" },
  { label: "Fat",           key: "fat_g",     unit: "g",    color: "#fdf0f0" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecipeDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ fontFamily: "'DM Sans', 'Nunito', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e8f0eb", borderTopColor: "#2C7A4B", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 14, color: "#7a9a88", margin: 0 }}>Loading recipe…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error || !recipe) {
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

  // ── Recipe detail ──────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'DM Sans', 'Nunito', sans-serif", maxWidth: 760, margin: "0 auto", padding: "32px 24px 64px" }}>

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

      {/* ── Two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 40 }}>

        {/* ── Ingredients ── */}
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
            {recipe.ingredients.map((ing, i) => (
              <li
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: i % 2 === 0 ? "#f8faf9" : "#fff", border: "1px solid #e8f0eb" }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2C7A4B", flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: "#1a3a28", fontWeight: 500 }}>
                  {[ing.quantity, ing.unit, ing.name].filter(Boolean).join(" ")}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Nutrition breakdown ── */}
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
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 10, background: row.color, border: "1px solid #e8f0eb" }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1a3a28" }}>{row.label}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#2C7A4B" }}>
                  {recipe.nutrition[row.key]} {row.unit}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Cooking steps ── */}
      <section>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1a3a28", margin: "0 0 20px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", padding: 6, borderRadius: 8, background: "#eaf4ee" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2C7A4B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </span>
          Cooking Steps
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {recipe.steps.map((step) => (
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

    </div>
  );
}