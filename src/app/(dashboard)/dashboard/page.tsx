"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealLog {
  log_id: string;
  recipe_title: string;
  logged_time: string;
  calories: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBarColor(logged: number, target: number): string {
  const pct = (logged / target) * 100;
  if (pct > 100) return "#e05252"; // red — exceeded
  if (pct >= 80) return "#d97706";  // amber — approaching
  return "#2C7A4B";                 // green — on track
}

function getBarBg(logged: number, target: number): string {
  const pct = (logged / target) * 100;
  if (pct > 100) return "#fef2f2";
  if (pct >= 80) return "#fffbeb";
  return "#eaf4ee";
}

function clampPct(logged: number, target: number): number {
  return Math.min((logged / target) * 100, 100);
}

function getStatusLabel(logged: number, target: number): { text: string; color: string } {
  const pct = (logged / target) * 100;
  if (pct > 100) return { text: "Exceeded", color: "#e05252" };
  if (pct >= 80) return { text: "Almost there", color: "#d97706" };
  return { text: "On track", color: "#2C7A4B" };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getCaloriesRemaining(logged: number, target: number): number {
  return Math.max(target - logged, 0);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [totals, setTotals] = useState<NutritionTotals>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [targets, setTargets] = useState<NutritionTargets>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    setMounted(true);

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;

    async function fetchNutrition() {
      try {
        const res = await fetch("/api/nutrition");
        if (!res.ok) return;
        const data = await res.json();
        setTotals({
          calories: data.totals.calories,
          protein: data.totals.protein_g,
          carbs: data.totals.carbs_g,
          fat: data.totals.fat_g,
        });
        setTargets({
          calories: data.targets.daily_calories,
          protein: data.targets.daily_protein_g,
          carbs: data.targets.daily_carbs_g,
          fat: data.targets.daily_fat_g,
        });
        setMeals(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data.logs ?? []).map((log: any, i: number) => ({
            log_id: log.log_id ?? `${log.recipe_id}-${i}`,
            recipe_title: log.recipe_title ?? "Logged Meal",
            logged_time: "Logged today",
            calories: log.calories,
          }))
        );
      } finally {
        setIsLoading(false);
      }
    }

    async function setup() {
      await fetchNutrition();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserName(user.user_metadata?.full_name || "");
      supabase.removeChannel(supabase.channel("meal_logs_inserts"));
      channel = supabase
        .channel("meal_logs_inserts")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "meal_logs", filter: `user_id=eq.${user.id}` },
          () => { fetchNutrition(); }
        )
        .subscribe();
    }

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const remaining = getCaloriesRemaining(totals.calories, targets.calories);
  const greeting = getGreeting();

  const NUTRITION_BARS = [
    { key: "calories", label: "Calories", unit: "kcal", logged: totals.calories, target: targets.calories },
    { key: "protein",  label: "Protein",  unit: "g",    logged: totals.protein,  target: targets.protein  },
    { key: "carbs",    label: "Carbs",    unit: "g",    logged: totals.carbs,    target: targets.carbs    },
    { key: "fat",      label: "Fat",      unit: "g",    logged: totals.fat,      target: targets.fat      },
  ];

  return (
    <div className="page">

      {/* ── Greeting + daily status ── */}
      <div className="hero">
        <div className="hero-text">
          <h1 className="greeting">{greeting}{userName ? `, ${userName}` : ""} 👋</h1>
          <p className="hero-sub">
            {isLoading
              ? "Loading your nutrition summary…"
              : remaining > 0
              ? `You have ${remaining} kcal remaining today — keep it up!`
              : "You've hit your calorie target for today!"}
          </p>
        </div>
        <a href="/generate" className="cta-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Generate Recipes
        </a>
      </div>

      {/* ── Nutrition summary ── */}
      <section className="section">
        <h2 className="section-title">Nutrition Summary</h2>
        {isLoading ? null : <div className="bars-grid">
          {NUTRITION_BARS.map((bar, i) => {
            const color = getBarColor(bar.logged, bar.target);
            const bgColor = getBarBg(bar.logged, bar.target);
            const pct = clampPct(bar.logged, bar.target);
            const status = getStatusLabel(bar.logged, bar.target);
            return (
              <div
                key={bar.key}
                className="bar-card"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="bar-card-header">
                  <span className="bar-label">{bar.label}</span>
                  <span className="bar-status" style={{ color: status.color, background: bgColor }}>
                    {status.text}
                  </span>
                </div>

                <div className="bar-numbers">
                  <span className="bar-logged" style={{ color }}>
                    {bar.logged}
                  </span>
                  <span className="bar-target">/ {bar.target} {bar.unit}</span>
                </div>

                <div className="bar-track" style={{ background: bgColor }}>
                  <div
                    className="bar-fill"
                    style={{
                      width: mounted ? `${pct}%` : "0%",
                      background: color,
                    }}
                  />
                </div>

                <div className="bar-footer">
                  <span className="bar-pct" style={{ color }}>
                    {Math.round((bar.logged / bar.target) * 100)}%
                  </span>
                  <span className="bar-remaining">
                    {bar.logged > bar.target
                      ? `${bar.logged - bar.target}${bar.unit} over`
                      : `${bar.target - bar.logged}${bar.unit} left`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>}
      </section>

      {/* ── Today's logged meals ── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Today's Logged Meals</h2>
          {!isLoading && <span className="meal-count">{meals.length} meal{meals.length !== 1 ? "s" : ""}</span>}
        </div>

        {isLoading ? null : meals.length === 0 ? (
          <div className="meals-empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="#eaf4ee" />
              <path d="M8 12h8M12 8v8" stroke="#2C7A4B" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <p>No meals logged today.</p>
            <p className="meals-empty-sub">Mark a recipe as cooked to get started.</p>
          </div>
        ) : (
          <div className="meals-list">
            {meals.map((meal, i) => (
              <div
                key={meal.log_id}
                className="meal-row"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="meal-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2C7A4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                    <line x1="6" y1="1" x2="6" y2="4" />
                    <line x1="10" y1="1" x2="10" y2="4" />
                    <line x1="14" y1="1" x2="14" y2="4" />
                  </svg>
                </div>
                <div className="meal-info">
                  <span className="meal-name">{meal.recipe_title}</span>
                  <span className="meal-time">{meal.logged_time}</span>
                </div>
                <span className="meal-calories">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2C7A4B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  {meal.calories} kcal
                </span>
              </div>
            ))}
          </div>
        ) /* isLoading */}
      </section>

      <style jsx>{`
        /* ── Page ── */
        .page {
          display: flex;
          flex-direction: column;
          gap: 32px;
          font-family: 'DM Sans', 'Nunito', sans-serif;
          max-width: 900px;
        }

        /* ── Hero ── */
        .hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          background: #fff;
          border: 1.5px solid #e8f0eb;
          border-radius: 20px;
          padding: 24px 28px;
          animation: fadeUp 0.35s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .greeting {
          font-size: 20px;
          font-weight: 800;
          color: #1a3a28;
          letter-spacing: -0.4px;
          margin: 0 0 4px;
        }
        .hero-sub {
          font-size: 14px;
          color: #7a9a88;
          margin: 0;
          line-height: 1.5;
        }
        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 11px 20px;
          border-radius: 12px;
          background: #2C7A4B;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          font-family: inherit;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .cta-btn:hover {
          background: #245f3c;
          transform: translateY(-1px);
        }

        /* ── Sections ── */
        .section {
          display: flex;
          flex-direction: column;
          gap: 14px;
          animation: fadeUp 0.4s ease both;
          animation-delay: 0.1s;
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .section-title {
          font-size: 15px;
          font-weight: 700;
          color: #1a3a28;
          margin: 0;
          letter-spacing: -0.2px;
        }
        .meal-count {
          font-size: 12px;
          color: #7a9a88;
          font-weight: 500;
          background: #f2f6f4;
          padding: 3px 10px;
          border-radius: 20px;
        }

        /* ── Nutrition bars grid ── */
        .bars-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        .bar-card {
          background: #fff;
          border: 1.5px solid #e8f0eb;
          border-radius: 16px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          animation: cardReveal 0.4s ease both;
          transition: box-shadow 0.18s ease;
        }
        .bar-card:hover {
          box-shadow: 0 4px 16px rgba(44,122,75,0.08);
        }
        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .bar-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .bar-label {
          font-size: 13px;
          font-weight: 700;
          color: #1a3a28;
        }
        .bar-status {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 20px;
        }
        .bar-numbers {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .bar-logged {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1;
        }
        .bar-target {
          font-size: 12px;
          color: #9ab5a5;
          font-weight: 500;
        }

        /* ── Progress bar ── */
        .bar-track {
          height: 8px;
          border-radius: 99px;
          overflow: hidden;
          width: 100%;
        }
        .bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .bar-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .bar-pct {
          font-size: 12px;
          font-weight: 700;
        }
        .bar-remaining {
          font-size: 11px;
          color: #9ab5a5;
          font-weight: 500;
        }

        /* ── Meals list ── */
        .meals-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: #fff;
          border: 1.5px solid #e8f0eb;
          border-radius: 16px;
          overflow: hidden;
        }
        .meal-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          border-bottom: 1px solid #f2f6f4;
          animation: fadeUp 0.35s ease both;
          transition: background 0.12s ease;
        }
        .meal-row:last-child {
          border-bottom: none;
        }
        .meal-row:hover {
          background: #fafcfb;
        }
        .meal-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #eaf4ee;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .meal-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .meal-name {
          font-size: 14px;
          font-weight: 600;
          color: #1a3a28;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .meal-time {
          font-size: 12px;
          color: #9ab5a5;
          font-weight: 500;
        }
        .meal-calories {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 700;
          color: #2C7A4B;
          background: #eaf4ee;
          padding: 4px 10px;
          border-radius: 20px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* ── Empty meals ── */
        .meals-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 40px 24px;
          background: #fff;
          border: 1.5px solid #e8f0eb;
          border-radius: 16px;
          text-align: center;
          color: #5a7a68;
          font-size: 14px;
          font-weight: 500;
        }
        .meals-empty p { margin: 0; }
        .meals-empty-sub {
          font-size: 13px;
          color: #9ab5a5;
        }
      `}</style>
    </div>
  );
}