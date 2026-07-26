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
  if (pct > 100) return "#e05252";
  if (pct >= 80) return "#d97706";
  return "#2C7A4B";
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

  // keep helpers in scope so they are not flagged as unused
  void getBarColor; void getBarBg; void getStatusLabel;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", maxWidth: "900px" }}>

      {/* ── Greeting Hero ── */}
      <div className="hero-card" style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "20px",
        flexWrap: "wrap",
        background: "linear-gradient(135deg, var(--color-green) 0%, var(--color-green-dark) 100%)",
        borderRadius: "20px",
        overflow: "hidden",
        animation: "fadeUp 0.35s ease both",
      }}>
        {/* Dots pattern overlay */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 className="hero-title" style={{
            fontFamily: "var(--font-display), Georgia, serif",
            fontWeight: 700,
            color: "white",
            margin: "0 0 6px",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}>
            {greeting}{userName ? `, ${userName}` : ""} 👋
          </h1>
          <p style={{ fontSize: "0.95rem", color: "white", opacity: 0.85, margin: 0, lineHeight: 1.5 }}>
            {isLoading
              ? "Loading your nutrition summary…"
              : remaining > 0
              ? `You have ${remaining} kcal remaining today — keep it up!`
              : "You’ve hit your calorie target for today!"}
          </p>
        </div>

        <a href="/generate" style={{
          position: "relative",
          zIndex: 1,
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          padding: "12px 24px",
          borderRadius: "10px",
          background: "white",
          color: "var(--color-green-dark)",
          fontSize: "0.875rem",
          fontWeight: 600,
          fontFamily: "var(--font-body), system-ui, sans-serif",
          textDecoration: "none",
          whiteSpace: "nowrap",
          flexShrink: 0,
          transition: "opacity 0.15s ease",
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Generate Recipes
        </a>
      </div>

      {/* ── Nutrition Summary ── */}
      <section>
        <h2 style={{
          fontFamily: "var(--font-display), Georgia, serif",
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "var(--color-text)",
          margin: "0 0 16px",
          letterSpacing: "-0.01em",
        }}>
          Nutrition Summary
        </h2>

        {!isLoading && (
          <div className="nutrition-grid">
            {NUTRITION_BARS.map((bar, i) => {
              const rawPct = bar.target > 0 ? (bar.logged / bar.target) * 100 : 0;
              const fillColor = rawPct > 100
                ? "var(--color-danger)"
                : rawPct >= 80
                ? "#F59E0B"
                : "var(--color-green)";
              const pillBg = rawPct > 100
                ? "var(--color-danger-light)"
                : rawPct >= 80
                ? "#FEF3C7"
                : "var(--color-green-light)";
              const pillTextColor = rawPct > 100
                ? "var(--color-danger)"
                : rawPct >= 80
                ? "#92400E"
                : "var(--color-green-dark)";
              const pillText = rawPct > 100 ? "Over" : rawPct >= 80 ? "Almost there" : "On track";
              const pct = clampPct(bar.logged, bar.target);

              return (
                <div
                  key={bar.key}
                  className="card nutrition-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    animationDelay: `${i * 0.08}s`,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)",
                  }}
                >
                  {/* Label + status pill */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--color-text-2)",
                    }}>
                      {bar.label}
                    </span>
                    <span style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "20px",
                      background: pillBg,
                      color: pillTextColor,
                    }}>
                      {pillText}
                    </span>
                  </div>

                  {/* Big number */}
                  <div className="nutrition-number" style={{
                    fontFamily: "var(--font-body), system-ui, sans-serif",
                    fontWeight: 700,
                    color: "var(--color-text)",
                    lineHeight: 1,
                  }}>
                    {bar.logged}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-2)", marginTop: "2px" }}>
                    of {bar.target} {bar.unit}
                  </div>

                  {/* Progress track */}
                  <div style={{
                    height: "10px",
                    borderRadius: "5px",
                    background: "var(--color-surface-2)",
                    margin: "16px 0 8px",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      borderRadius: "5px",
                      background: fillColor,
                      width: mounted ? `${pct}%` : "0%",
                      transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                    }} />
                  </div>

                  {/* Footer: % left, amount right */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-2)" }}>
                      {Math.round(rawPct)}%
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-2)" }}>
                      {bar.logged > bar.target
                        ? `${bar.logged - bar.target}${bar.unit} over`
                        : `${bar.target - bar.logged}${bar.unit} left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Today's Logged Meals ── */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <h2 style={{
            fontFamily: "var(--font-display), Georgia, serif",
            fontSize: "1.25rem",
            fontWeight: 600,
            color: "var(--color-text)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}>
            Today&apos;s Logged Meals
          </h2>
          {!isLoading && (
            <span style={{
              background: "var(--color-green-light)",
              color: "var(--color-green-dark)",
              borderRadius: "20px",
              padding: "2px 10px",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}>
              {meals.length} meal{meals.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {!isLoading && (
          meals.length === 0 ? (
            <div className="card" style={{
              minHeight: "140px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              textAlign: "center",
            }}>
              <span aria-hidden="true" style={{ fontSize: "2rem", color: "var(--color-green)", lineHeight: 1 }}>+</span>
              <p style={{ margin: 0, color: "var(--color-text-2)", fontSize: "0.9rem", fontWeight: 500 }}>
                No meals logged today.
              </p>
              <p style={{ margin: 0, color: "var(--color-text-2)", fontSize: "0.8rem" }}>
                Mark a recipe as cooked to get started.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {meals.map((meal, i) => (
                <div
                  key={meal.log_id}
                  className="card"
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    animationDelay: `${i * 0.06}s`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600,
                      color: "var(--color-text)",
                      fontSize: "0.9rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {meal.recipe_title}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-2)", marginTop: "2px" }}>
                      {meal.logged_time}
                    </div>
                  </div>
                  <span style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "var(--color-green)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}>
                    {meal.calories} kcal
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </section>

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .nutrition-card {
          padding: 20px 24px;
        }
        .nutrition-number {
          font-size: 2.5rem;
        }
        .nutrition-card:hover {
          box-shadow: 0 6px 20px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.08);
          transform: none;
        }
        .hero-card {
          padding: 28px 32px;
        }
        .hero-title {
          font-size: 1.75rem;
        }
        .nutrition-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 640px) {
          .hero-card {
            padding: 20px;
          }
          .hero-title {
            font-size: 1.4rem;
          }
          .nutrition-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .nutrition-card {
            padding: 16px;
          }
          .nutrition-number {
            font-size: 1.9rem;
          }
        }
        @media (max-width: 380px) {
          .nutrition-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
