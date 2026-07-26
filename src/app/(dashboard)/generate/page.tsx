"use client";

import { useState } from "react";

interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Recipe {
  id: string;
  title: string;
  description: string;
  cookTimeMinutes: number;
  nutrition: Nutrition;
  ingredients: { name: string; qty: string; unit: string }[];
  steps: { step: number; text: string }[];
  tags: string[];
  accent: string;
  emoji: string;
}

const MOCK_RECIPES: Recipe[] = [
  {
    id: "1",
    title: "Lemon Herb Grilled Chicken",
    description:
      "Juicy chicken breast marinated in lemon, garlic, and fresh herbs — light, high-protein, and ready in 30 minutes.",
    cookTimeMinutes: 30,
    tags: ["High Protein", "Gluten-Free"],
    nutrition: { calories: 420, protein: 48, carbs: 8, fat: 22 },
    accent: "from-green-100 to-green-200",
    emoji: "🍋",
    ingredients: [
      { name: "Chicken breast", qty: "300", unit: "g" },
      { name: "Lemon", qty: "1", unit: "whole" },
      { name: "Garlic cloves", qty: "3", unit: "whole" },
      { name: "Olive oil", qty: "2", unit: "tbsp" },
      { name: "Fresh thyme", qty: "1", unit: "tbsp" },
    ],
    steps: [
      { step: 1, text: "Whisk lemon juice, garlic, olive oil and thyme in a bowl." },
      { step: 2, text: "Add chicken and marinate for at least 15 minutes." },
      { step: 3, text: "Grill over medium-high heat for 6–7 minutes per side." },
      { step: 4, text: "Rest 5 minutes before slicing and serving." },
    ],
  },
  {
    id: "2",
    title: "Mediterranean Chickpea Bowl",
    description:
      "A vibrant plant-based bowl loaded with chickpeas, roasted vegetables, and a creamy tahini drizzle.",
    cookTimeMinutes: 25,
    tags: ["Vegetarian", "High Fibre"],
    nutrition: { calories: 510, protein: 22, carbs: 64, fat: 18 },
    accent: "from-amber-100 to-amber-200",
    emoji: "🥙",
    ingredients: [
      { name: "Chickpeas (canned)", qty: "400", unit: "g" },
      { name: "Cherry tomatoes", qty: "150", unit: "g" },
      { name: "Cucumber", qty: "1", unit: "whole" },
      { name: "Tahini", qty: "3", unit: "tbsp" },
      { name: "Lemon juice", qty: "2", unit: "tbsp" },
    ],
    steps: [
      { step: 1, text: "Drain and rinse chickpeas, then roast at 200°C for 20 minutes." },
      { step: 2, text: "Dice cucumber and halve tomatoes." },
      { step: 3, text: "Whisk tahini with lemon juice and 2 tbsp water." },
      { step: 4, text: "Assemble bowl and drizzle with tahini dressing." },
    ],
  },
  {
    id: "3",
    title: "Ginger Miso Salmon",
    description:
      "Omega-rich salmon fillet glazed with a umami-packed ginger miso marinade. On the table in under 20 minutes.",
    cookTimeMinutes: 20,
    tags: ["Pescatarian", "Dairy-Free"],
    nutrition: { calories: 480, protein: 42, carbs: 14, fat: 28 },
    accent: "from-rose-100 to-rose-200",
    emoji: "🐟",
    ingredients: [
      { name: "Salmon fillet", qty: "200", unit: "g" },
      { name: "White miso paste", qty: "2", unit: "tbsp" },
      { name: "Fresh ginger", qty: "1", unit: "tsp" },
      { name: "Soy sauce", qty: "1", unit: "tbsp" },
      { name: "Sesame oil", qty: "1", unit: "tsp" },
    ],
    steps: [
      { step: 1, text: "Mix miso, ginger, soy sauce and sesame oil into a glaze." },
      { step: 2, text: "Coat salmon fillet and rest for 10 minutes." },
      { step: 3, text: "Bake at 200°C for 12–14 minutes until caramelised." },
    ],
  },
];

// ─── Macro chip ───────────────────────────────────────────────────────────────

function MacroChip({
  label,
  value,
  unit,
  bg,
}: {
  label: string;
  value: number;
  unit: string;
  bg: string;
}) {
  return (
    <div className={`flex flex-col items-center px-2 py-1.5 rounded-xl ${bg}`}>
      <span className="text-xs text-gray-600">{label}</span>
      <span className="text-sm font-bold text-gray-800">
        {value}
        <span className="text-xs font-normal text-gray-600 ml-0.5">{unit}</span>
      </span>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-20 px-6 text-center">
      <div className="relative mb-10">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center shadow-lg">
          <span className="text-5xl">🍽️</span>
        </div>
        <span className="absolute top-1 right-2 w-3 h-3 rounded-full bg-green-400 opacity-40" />
        <span className="absolute bottom-2 left-1 w-2 h-2 rounded-full bg-green-300 opacity-30" />
      </div>

      <h2 className="text-2xl font-semibold text-gray-800 mb-3">
        Your recipes will appear here
      </h2>
      <p className="text-sm text-gray-500 mb-2 max-w-sm leading-relaxed">
        We&apos;ll use your{" "}
        <strong className="text-green-700">health goal</strong>,{" "}
        <strong className="text-green-700">dietary preferences</strong>, and{" "}
        <strong className="text-green-700">cuisine choices</strong> from onboarding to generate
        personalised recipes just for you.
      </p>
      <p className="text-xs text-gray-600 mb-10">
        Powered by Claude AI · Usually takes 5–10 seconds
      </p>

      <button
        onClick={onGenerate}
        className="flex items-center gap-2 px-8 py-3.5 rounded-full text-white font-semibold text-sm bg-gradient-to-r from-green-700 to-green-500 shadow-lg hover:shadow-green-300 hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <span>✦</span>
        Generate Recipes
      </button>

      <div className="flex flex-wrap gap-2 justify-center mt-10">
        {["High Protein", "Vegetarian", "Gluten-Free", "Dairy-Free", "Quick Meals"].map((t) => (
          <span
            key={t}
            className="text-xs px-3 py-1 rounded-full border border-green-700 text-green-800 font-medium"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Loading spinner ──────────────────────────────────────────────────────────

function LoadingSpinner() {
  const tips = [
    "Analysing your health goal…",
    "Picking the best ingredients…",
    "Calculating nutrition facts…",
    "Finalising your recipes…",
  ];

  return (
    <div className="flex flex-col items-center justify-center flex-1 py-24 gap-8">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-green-400 opacity-20 animate-ping" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center shadow-md">
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-600 border-r-green-300 animate-spin" />
          <span className="text-3xl">🍳</span>
        </div>
      </div>

      <div className="text-center">
        <p className="font-semibold text-gray-800">Cooking up your recipes…</p>
        <p className="text-xs text-gray-600 mt-1">Powered by Claude AI</p>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className="w-1.5 h-1.5 rounded-full bg-green-500 opacity-50 animate-pulse"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
            <p className="text-xs text-gray-500">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Recipe card ──────────────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  onClick,
}: {
  recipe: Recipe;
  onClick: (r: Recipe) => void;
}) {
  return (
    <button
      onClick={() => onClick(recipe)}
      className="group text-left w-full rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-green-200 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-green-600 focus-visible:outline-offset-2"
    >
      {/* Gradient header */}
      <div className={`relative h-24 bg-gradient-to-br ${recipe.accent} flex items-center justify-between px-5`}>
        <span className="text-5xl drop-shadow-sm">{recipe.emoji}</span>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-sm text-xs font-semibold text-gray-700">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="#2C7A4B" strokeWidth="1.3" />
            <path d="M6 3.5v2.5l2 1" stroke="#2C7A4B" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          {recipe.cookTimeMinutes} min
        </div>
        {/* Green left border on hover */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-600 rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-green-50 text-green-700"
            >
              {tag}
            </span>
          ))}
        </div>

        <h3 className="font-semibold text-base text-gray-800 leading-snug mb-2">
          {recipe.title}
        </h3>
        <p className="text-xs text-gray-600 leading-relaxed mb-4 line-clamp-2">
          {recipe.description}
        </p>

        {/* Macros */}
        <div className="grid grid-cols-4 gap-1.5">
          <MacroChip label="Cal" value={recipe.nutrition.calories} unit="kcal" bg="bg-green-50" />
          <MacroChip label="Protein" value={recipe.nutrition.protein} unit="g" bg="bg-blue-50" />
          <MacroChip label="Carbs" value={recipe.nutrition.carbs} unit="g" bg="bg-amber-50" />
          <MacroChip label="Fat" value={recipe.nutrition.fat} unit="g" bg="bg-rose-50" />
        </div>

        {/* View cue */}
        <div className="flex items-center justify-end gap-1 mt-3 text-xs font-medium text-green-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          View full recipe
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="#2C7A4B" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// ─── Recipe detail modal ──────────────────────────────────────────────────────

function RecipeDetail({
  recipe,
  onClose,
}: {
  recipe: Recipe;
  onClose: () => void;
}) {
  const [cookStatus, setCookStatus] = useState<"idle" | "loading" | "done" | "duplicate" | "error">("idle");

  async function handleMarkAsCooked() {
    setCookStatus("loading");
    try {
      const res = await fetch("/api/meal-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe_id: recipe.id,
          calories: recipe.nutrition.calories,
          protein_g: recipe.nutrition.protein,
          carbs_g: recipe.nutrition.carbs,
          fat_g: recipe.nutrition.fat,
        }),
      });

      if (res.status === 409) {
        setCookStatus("duplicate");
        return;
      }

      if (!res.ok) throw new Error("Failed to log meal");

      setCookStatus("done");
    } catch {
      setCookStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden bg-white shadow-2xl"
        style={{ maxHeight: "88vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className={`relative px-6 pt-6 pb-5 bg-gradient-to-br ${recipe.accent}`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-sm font-medium text-gray-600 hover:bg-white transition-colors"
          >
            ✕
          </button>
          <span className="text-4xl block mb-3">{recipe.emoji}</span>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-white/70 text-green-700"
              >
                {tag}
              </span>
            ))}
          </div>
          <h2 className="text-xl font-semibold text-gray-800 leading-snug mb-1">
            {recipe.title}
          </h2>
          <p className="text-xs text-gray-600 leading-relaxed">{recipe.description}</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-green-700">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5.5" stroke="#2C7A4B" strokeWidth="1.3" />
              <path d="M6.5 4v2.5l1.5 1" stroke="#2C7A4B" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            {recipe.cookTimeMinutes} minutes
          </div>
        </div>

        {/* Nutrition */}
        <div className="grid grid-cols-4 gap-2 px-6 py-4 border-b border-gray-100">
          <MacroChip label="Calories" value={recipe.nutrition.calories} unit="kcal" bg="bg-green-50" />
          <MacroChip label="Protein" value={recipe.nutrition.protein} unit="g" bg="bg-blue-50" />
          <MacroChip label="Carbs" value={recipe.nutrition.carbs} unit="g" bg="bg-amber-50" />
          <MacroChip label="Fat" value={recipe.nutrition.fat} unit="g" bg="bg-rose-50" />
        </div>

        {/* Ingredients */}
        <div className="px-6 pt-5 pb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">
            Ingredients
          </h3>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <li
                key={i}
                className={`flex items-center gap-3 text-sm px-3 py-1.5 rounded-lg ${i % 2 === 0 ? "bg-gray-50" : ""}`}
              >
                <span className="w-2 h-2 rounded-full bg-green-500 opacity-60 shrink-0" />
                <span className="flex-1 font-medium text-gray-700">{ing.name}</span>
                <span className="text-xs font-semibold text-gray-600">
                  {ing.qty} {ing.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        <div className="px-6 pb-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">
            Method
          </h3>
          <ol className="space-y-4">
            {recipe.steps.map((s) => (
              <li key={s.step} className="flex gap-4">
                <span className="shrink-0 w-6 h-6 rounded-full bg-green-700 text-white text-xs font-bold flex items-center justify-center shadow-sm mt-0.5">
                  {s.step}
                </span>
                <p className="text-sm text-gray-600 leading-relaxed">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* ── Mark as Cooked ── */}
        <div className="px-6 pb-7 pt-2">

          {/* Status messages */}
          {cookStatus === "done" && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-3">
              <span className="text-base">✅</span>
              <span className="font-medium">Logged! This recipe has been added to today&apos;s meal log.</span>
            </div>
          )}
          {cookStatus === "duplicate" && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3">
              <span className="text-base">⚠️</span>
              <span className="font-medium">You&apos;ve already logged this recipe today.</span>
            </div>
          )}
          {cookStatus === "error" && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3">
              <span className="text-base">❌</span>
              <span className="font-medium">Something went wrong. Please try again.</span>
            </div>
          )}

          {/* Button */}
          <button
            onClick={handleMarkAsCooked}
            disabled={cookStatus === "loading" || cookStatus === "done" || cookStatus === "duplicate"}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background:
                cookStatus === "done" || cookStatus === "duplicate"
                  ? "#9ca3af"
                  : "linear-gradient(135deg, #2C7A4B 0%, #3fac6a 100%)",
              boxShadow:
                cookStatus === "done" || cookStatus === "duplicate"
                  ? "none"
                  : "0 4px 14px rgba(44,122,75,0.35)",
            }}
          >
            {cookStatus === "loading" && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
              </svg>
            )}
            {cookStatus === "idle" || cookStatus === "error" ? "🍳 Mark as Cooked" : null}
            {cookStatus === "loading" ? "Saving…" : null}
            {cookStatus === "done" ? "✓ Logged Today" : null}
            {cookStatus === "duplicate" ? "✓ Already Logged Today" : null}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GeneratePage() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleGenerate() {
    setStatus("loading");
    setErrorMsg("");
    try {
      // ── Swap for real API once /api/recipes is ready ──────────────────────
      // const res = await fetch("/api/recipes", { method: "POST" });
      // if (!res.ok) throw new Error("Failed to generate recipes");
      // const data = await res.json();
      // setRecipes(data.recipes);
      // ─────────────────────────────────────────────────────────────────────
      await new Promise((res) => setTimeout(res, 2500));
      setRecipes(MOCK_RECIPES);
      setStatus("done");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* Header */}
      <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-6 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                AI Powered
              </span>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800 mt-1 leading-tight">
                Generate Recipes
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {status === "done"
                  ? `${recipes.length} recipes tailored to your profile — click any card for the full recipe.`
                  : "Personalised to your health goal, diet & cuisine preferences"}
              </p>
            </div>

            {status !== "idle" && (
              <button
                onClick={handleGenerate}
                disabled={status === "loading"}
                className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm bg-gradient-to-r from-green-700 to-green-500 shadow-md hover:shadow-green-200 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <span>✦</span>
                {status === "loading" ? "Generating…" : "Generate Again"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">

        {status === "idle" && <EmptyState onGenerate={handleGenerate} />}
        {status === "loading" && <LoadingSpinner />}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center flex-1 py-24 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-2xl mb-5 shadow-sm">
              ⚠️
            </div>
            <p className="font-semibold text-gray-800 mb-1">Something went wrong</p>
            <p className="text-sm text-gray-600 mb-6 max-w-xs">{errorMsg}</p>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-semibold text-sm bg-gradient-to-r from-green-700 to-green-500 shadow-md hover:shadow-green-200 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              Try Again
            </button>
          </div>
        )}

        {status === "done" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recipes.map((recipe, i) => (
              <div
                key={recipe.id}
                className="animate-[fadeUp_0.45s_ease_both]"
                style={{ animationDelay: `${i * 0.13}s` }}
              >
                <RecipeCard recipe={recipe} onClick={setSelected} />
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <RecipeDetail recipe={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}