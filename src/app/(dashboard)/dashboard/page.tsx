"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getLocalDateString } from "@/lib/date";

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
  recipe_id: string;
  recipe_title: string;
  logged_time: string;
  calories: number;
  meal_type?: string | null;
}

interface MealHistoryEntry {
  log_id: string;
  recipe_id: string;
  title: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface DayHistory {
  date: string;
  meals: MealHistoryEntry[];
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

interface WeekDay {
  date: string;
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

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
}

function calculateStreak(weekData: WeekDay[]): number {
  let streak = 0;
  for (let i = weekData.length - 1; i >= 0; i--) {
    if (weekData[i].calories > 0) streak++;
    else break;
  }
  return streak;
}

const MEAL_CATEGORIES: { key: string; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snacks" },
];

function CategoryIcon({ type }: { type: string }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (type === "breakfast") {
    return (
      <svg {...common}>
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    );
  }
  if (type === "lunch") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    );
  }
  if (type === "dinner") {
    return (
      <svg {...common}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [totals, setTotals] = useState<NutritionTotals>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [targets, setTargets] = useState<NutritionTargets>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [historyData, setHistoryData] = useState<DayHistory[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState("breakfast");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    setMounted(true);

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;

    async function fetchNutrition() {
      const res = await fetch(`/api/nutrition?date=${getLocalDateString()}`);
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
          recipe_id: log.recipe_id,
          recipe_title: log.recipe_title ?? "Logged Meal",
          logged_time: "Logged today",
          calories: log.calories,
          meal_type: log.meal_type ?? null,
        }))
      );
    }

    async function fetchHistory() {
      const res = await fetch("/api/meal-history");
      if (!res.ok) return;
      const data = await res.json();
      setHistoryData(data.days ?? []);
    }

    async function setup() {
      await Promise.all([fetchNutrition(), fetchHistory()]);
      setIsLoading(false);

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
    { key: "protein", label: "Protein", unit: "g", logged: totals.protein, target: targets.protein },
    { key: "carbs",   label: "Carbs",   unit: "g", logged: totals.carbs,   target: targets.carbs },
    { key: "fat",     label: "Fat",     unit: "g", logged: totals.fat,     target: targets.fat },
  ];

  // keep helpers in scope so they are not flagged as unused
  void getBarColor; void getBarBg; void getStatusLabel;

  const caloriePctRaw = targets.calories > 0 ? (totals.calories / targets.calories) * 100 : 0;

  const weekData: WeekDay[] = [
    ...[...historyData].slice(0, 6).reverse().map(d => ({ date: d.date, calories: d.totals.calories })),
    { date: getLocalDateString(), calories: totals.calories },
  ];
  const streakCount = calculateStreak(weekData);

  const mealsByCategory = MEAL_CATEGORIES.map(cat => {
    const categoryMeals = meals.filter(m => (m.meal_type ?? "snack") === cat.key);
    return {
      ...cat,
      meals: categoryMeals,
      total: categoryMeals.reduce((sum, m) => sum + (m.calories ?? 0), 0),
    };
  });

  const todayLabel = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  const userInitial = userName ? userName.charAt(0).toUpperCase() : "U";

  return (
    <>
      {isLoading && (
        <div className="loading-overlay" style={{ animation: "fadeOut 0.3s ease forwards", animationDelay: "0.5s" }}>
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
            Loading your dashboard…
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
        </div>
      )}

      {!isLoading && isMobile && (
      <div style={{ paddingBottom: "76px", maxWidth: "480px", margin: "0 auto" }}>

        {/* Greeting hero card */}
        <div style={{ margin: "12px 16px 14px", background: "linear-gradient(135deg, var(--color-green) 0%, var(--color-green-dark) 100%)", borderRadius: "16px", padding: "16px 18px", position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "white", fontFamily: "var(--font-display)" }}>
                {greeting}
              </div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", marginTop: "2px" }}>{todayLabel}</div>
            </div>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.2)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, flexShrink: 0 }}>
              {userInitial}
            </div>
          </div>
        </div>

        {/* Compact hero: ring + 4 mini stats */}
        <div style={{ margin: "0 16px 14px", background: "var(--color-surface)", borderRadius: "16px", padding: "16px", display: "flex", alignItems: "center", gap: "14px", border: "1px solid var(--color-border)" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-surface-2)" strokeWidth="8"/>
              <circle cx="32" cy="32" r="26" fill="none"
                stroke={caloriePctRaw >= 100 ? "var(--color-danger)" : caloriePctRaw >= 80 ? "#F59E0B" : "var(--color-green)"}
                strokeWidth="8"
                strokeDasharray={`${(Math.min(caloriePctRaw,100)/100) * 163} 163`}
                strokeLinecap="round" transform="rotate(-90 32 32)" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text)", lineHeight: 1 }}>{Math.round(caloriePctRaw)}%</div>
              <div style={{ fontSize: "9px", color: "var(--color-text-3)" }}>of goal</div>
            </div>
          </div>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            <div style={{ background: "var(--color-surface-2)", borderRadius: "8px", padding: "6px 8px", textAlign: "center" }}>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>{totals.calories}</div>
              <div style={{ fontSize: "9px", color: "var(--color-text-3)" }}>eaten</div>
            </div>
            <div style={{ background: "var(--color-surface-2)", borderRadius: "8px", padding: "6px 8px", textAlign: "center" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-green-dark)" }}>{Math.max(targets.calories - totals.calories, 0)}</div>
              <div style={{ fontSize: "9px", color: "var(--color-text-3)" }}>left</div>
            </div>
            <div style={{ background: "var(--color-surface-2)", borderRadius: "8px", padding: "6px 8px", textAlign: "center" }}>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>{targets.calories}</div>
              <div style={{ fontSize: "9px", color: "var(--color-text-3)" }}>goal</div>
            </div>
            <div style={{ background: "var(--color-surface-2)", borderRadius: "8px", padding: "6px 8px", textAlign: "center" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#c98500" }}>{streakCount}🔥</div>
              <div style={{ fontSize: "9px", color: "var(--color-text-3)" }}>streak</div>
            </div>
          </div>
        </div>

        {/* Horizontal scroll macro chips */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "0 16px 14px" }}>
          {[
            { name: "Protein", val: totals.protein, goal: targets.protein, color: "#2a78d6" },
            { name: "Carbs", val: totals.carbs, goal: targets.carbs, color: "#eda100" },
            { name: "Fat", val: totals.fat, goal: targets.fat, color: "#eb6834" },
          ].map(macro => (
            <div key={macro.name} style={{ flexShrink: 0, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "10px 14px", minWidth: "88px" }}>
              <div style={{ fontSize: "10px", color: "var(--color-text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{macro.name}</div>
              <div style={{ fontSize: "15px", fontWeight: 600, margin: "2px 0 5px" }}>
                {macro.val}<span style={{ fontSize: "10px", color: "var(--color-text-3)" }}>/{macro.goal}g</span>
              </div>
              <div style={{ height: "3px", background: "var(--color-surface-2)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: "2px", width: `${Math.min((macro.val/macro.goal)*100, 100)}%`, background: macro.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Food diary with pill tabs */}
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)", fontFamily: "var(--font-display)" }}>Food diary</span>
          </div>
          <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
            {["Breakfast", "Lunch", "Dinner", "Snacks"].map(cat => (
              <button key={cat} onClick={() => setActiveMobileTab(cat.toLowerCase())}
                style={{ flex: 1, textAlign: "center", padding: "10px 0", minHeight: "40px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: "none",
                  background: activeMobileTab === cat.toLowerCase() ? "var(--color-green)" : "var(--color-surface-2)",
                  color: activeMobileTab === cat.toLowerCase() ? "white" : "var(--color-text-2)" }}>
                {cat}
              </button>
            ))}
          </div>
          <div>
            {(mealsByCategory.find(c => c.key === activeMobileTab)?.meals ?? []).length === 0 ? (
              <div style={{ fontSize: "11px", color: "var(--color-text-3)", padding: "12px 0", textAlign: "center" }}>
                No {activeMobileTab} logged
              </div>
            ) : (
              mealsByCategory.find(c => c.key === activeMobileTab)?.meals.map((meal, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", borderBottom: "0.5px solid var(--color-border)" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "8px", background: "var(--color-green-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    🍽️
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", fontWeight: 600 }}>{meal.recipe_title ?? "Logged meal"}</div>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-green-dark)" }}>{meal.calories} kcal</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Weekly strip */}
        <div style={{ padding: "0 16px 6px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)", fontFamily: "var(--font-display)" }}>This week</span>
        </div>
        <div style={{ display: "flex", gap: "4px", alignItems: "flex-end", height: "44px", padding: "0 16px 14px" }}>
          {weekData.map((day, i) => {
            const v = day.calories;
            const h = v ? Math.max(Math.round((v/targets.calories)*38), 2) : 2;
            const isToday = i === weekData.length - 1;
            return (
              <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", height: "100%", justifyContent: "flex-end" }}>
                <div style={{ width: "100%", height: `${h}px`, borderRadius: "2px 2px 0 0",
                  background: v > targets.calories ? "var(--color-danger)" : v > 0 ? "var(--color-green)" : "var(--color-border)",
                  opacity: isToday ? 1 : v > 0 ? 0.7 : 0.4 }} />
                <div style={{ fontSize: "9px", color: isToday ? "var(--color-text)" : "var(--color-text-3)", fontWeight: isToday ? 600 : 400 }}>
                  {dayLabel(day.date)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Compact history rows */}
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)", fontFamily: "var(--font-display)" }}>History</span>
            <span style={{ fontSize: "11px", color: "var(--color-text-3)" }}>Last 7 days</span>
          </div>
          {historyData.map(day => {
            const pct = targets.calories > 0 ? Math.round((day.totals.calories / targets.calories) * 100) : 0;
            const displayDate = new Date(day.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
            return (
              <div key={day.date} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid var(--color-border)", fontSize: "11px" }}>
                <span style={{ color: "var(--color-text-2)", minWidth: "70px" }}>{displayDate}</span>
                <div style={{ flex: 1, height: "3px", background: "var(--color-surface-2)", borderRadius: "2px", margin: "0 8px", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "var(--color-green)", borderRadius: "2px", width: `${Math.min(pct,100)}%` }} />
                </div>
                <span style={{ color: "var(--color-text-3)", minWidth: "50px", textAlign: "right" }}>
                  {day.meals.length > 0 ? `${day.totals.calories} kcal` : 'No meals'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {!isLoading && !isMobile && (
      <div style={{
        display: "flex", flexDirection: "column", gap: "32px", maxWidth: "900px",
        animation: "fadeIn 0.3s ease forwards",
      }}>

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

        <div style={{ position: "relative", zIndex: 1, minHeight: "60px" }}>
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
            {remaining > 0
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

        {/* Calorie ring */}
        <div className="card" style={{
          padding: "24px 28px",
          display: "flex",
          alignItems: "center",
          gap: "28px",
          position: "relative",
          marginBottom: "16px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)",
        }}>

          {/* Streak badge, top right */}
          <div style={{ position: "absolute", top: 16, right: 20, display: "flex",
            alignItems: "center", gap: 5, fontSize: "12px", color: "var(--color-text-3)",
            background: "var(--color-surface-2)", padding: "4px 10px", borderRadius: "20px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c98500"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
            {streakCount} day streak
          </div>

          {/* Ring */}
          <svg width="110" height="110" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="44" fill="none" stroke="var(--color-surface-2)" strokeWidth="14"/>
            <circle cx="55" cy="55" r="44" fill="none"
              stroke={caloriePctRaw >= 100 ? "var(--color-danger)" : caloriePctRaw >= 80 ? "#F59E0B" : "var(--color-green)"}
              strokeWidth="14"
              strokeDasharray={`${(Math.min(caloriePctRaw, 100)/100) * 276} 276`}
              strokeLinecap="round"
              transform="rotate(-90 55 55)"
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
            <text x="55" y="50" textAnchor="middle" fontSize="20" fontWeight="500" fill="var(--color-text)">
              {totals.calories}
            </text>
            <text x="55" y="66" textAnchor="middle" fontSize="10" fill="var(--color-text-3)">
              of {targets.calories}
            </text>
          </svg>

          {/* Hero stat */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", color: "var(--color-text-3)", textTransform: "uppercase",
              letterSpacing: "0.06em", marginBottom: "4px" }}>
              Today&apos;s progress
            </div>
            <div style={{ fontSize: "42px", fontWeight: 500, color: "var(--color-text)", lineHeight: 1 }}>
              {Math.round(caloriePctRaw)}<span style={{ fontSize: "16px", color: "var(--color-text-3)",
                fontWeight: 400, marginLeft: "6px" }}>%</span>
            </div>
            <div style={{ fontSize: "13px", color: "var(--color-text-2)", marginTop: "8px" }}>
              of your <span style={{ color: "var(--color-green-dark)", fontWeight: 500 }}>
              {targets.calories}</span> kcal goal reached
            </div>
            <div style={{ width: "100%", height: "5px", background: "var(--color-surface-2)",
              borderRadius: "3px", marginTop: "12px", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "var(--color-green)", borderRadius: "3px",
                width: `${Math.min(caloriePctRaw, 100)}%`, transition: "width 0.6s ease" }} />
            </div>
          </div>
        </div>

        {/* Macro bars */}
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
      </section>

      {/* ── Food Diary ── */}
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
            Food Diary
          </h2>
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
        </div>

        {mealsByCategory.map(cat => (
          <div key={cat.key} className="card" style={{ padding: 0, marginBottom: "10px", overflow: "hidden" }}>
            <div style={{
              padding: "10px 16px",
              background: "var(--color-surface-2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--color-text-2)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}>
                <CategoryIcon type={cat.key} />
                {cat.label}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>{cat.total} kcal</span>
            </div>

            {cat.meals.length === 0 ? (
              <div style={{ padding: "10px 16px", fontSize: "0.8rem", color: "var(--color-text-3)" }}>
                No {cat.label.toLowerCase()} logged
              </div>
            ) : (
              cat.meals.map((meal, i) => (
                <div
                  key={meal.log_id}
                  style={{
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    borderTop: i === 0 ? "none" : "1px solid var(--color-border)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      href={`/generate/${meal.recipe_id}`}
                      style={{
                        color: "var(--color-text)",
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                      }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                    >
                      {meal.recipe_title ?? "Logged Meal"}
                    </Link>
                  </div>
                  <span style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "var(--color-green)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}>
                    {meal.calories} kcal
                  </span>
                </div>
              ))
            )}
          </div>
        ))}
      </section>

      {/* ── Weekly Trend ── */}
      <section>
        <div className="card">
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", marginBottom: "16px" }}>
            This Week
          </h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "80px" }}>
            {weekData.map((day, i) => {
              const h = targets.calories > 0
                ? Math.max((day.calories / targets.calories) * 64, 3)
                : 3;
              const isToday = i === weekData.length - 1;
              const over = targets.calories > 0 && day.calories > targets.calories;
              return (
                <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--color-text-3)" }}>{day.calories || ""}</span>
                  <div style={{
                    width: "100%",
                    height: `${h}px`,
                    borderRadius: "3px 3px 0 0",
                    background: over ? "var(--color-danger)" : day.calories > 0 ? "var(--color-green)" : "var(--color-border)",
                    opacity: isToday ? 1 : day.calories > 0 ? 0.7 : 0.3,
                  }} />
                  <span style={{
                    fontSize: "0.65rem",
                    color: isToday ? "var(--color-text)" : "var(--color-text-3)",
                    fontWeight: isToday ? 700 : 400,
                  }}>
                    {dayLabel(day.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── History ── */}
      <section>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 0", minHeight: "56px", marginTop: 8,
        }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: "1.25rem", color: "var(--color-text)" }}>
            History
          </span>
          <span style={{ background: "var(--color-surface-2)", color: "var(--color-text-3)",
            borderRadius: 20, padding: "2px 10px", fontSize: "0.75rem" }}>
            Last 7 days
          </span>
        </div>

        <div style={{ marginBottom: 24 }}>

          {historyData.length === 0 && (
            <div style={{ color: "var(--color-text-3)", fontSize: "0.85rem",
              padding: 20, textAlign: "center" }}>
              No meals logged in the past week.
            </div>
          )}

          {historyData.map(day => {
            const isExpanded = expandedDays.has(day.date);
            const pct = targets.calories > 0
              ? Math.min((day.totals.calories / targets.calories) * 100, 100)
              : 0;
            const displayDate = new Date(day.date + 'T00:00:00')
              .toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });

            return (
              <div key={day.date} style={{
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                overflow: "hidden",
                marginBottom: 8,
                background: "white"
              }}>

                {/* Day summary row */}
                <div
                  onClick={() => day.meals.length > 0 && setExpandedDays(prev => {
                    const next = new Set(prev);
                    if (next.has(day.date)) {
                      next.delete(day.date);
                    } else {
                      next.add(day.date);
                    }
                    return next;
                  })}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 16px", borderRadius: 0,
                    background: "white",
                    cursor: day.meals.length > 0 ? "pointer" : "default",
                    transition: "background 0.15s ease",
                    ...(day.meals.length === 0 ? { opacity: 0.6 } : {})
                  }}
                >
                  {/* Date */}
                  <span style={{ fontWeight: 600, fontSize: "0.85rem",
                    color: "var(--color-text)", minWidth: 90 }}>
                    {displayDate}
                  </span>

                  {/* Mini progress bar */}
                  <div style={{ flex: 1, height: 6, borderRadius: 3,
                    background: "var(--color-surface-2)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      width: `${pct}%`,
                      background: pct >= 100 ? "var(--color-danger)"
                        : pct >= 80 ? "#F59E0B"
                        : "var(--color-green)",
                      transition: "width 0.4s ease"
                    }} />
                  </div>

                  {/* Calories + meal count */}
                  {day.meals.length === 0 ? (
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-3)",
                      minWidth: 80, textAlign: "right" }}>
                      No meals
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-2)",
                      minWidth: 80, textAlign: "right", fontWeight: 500 }}>
                      {day.totals.calories} kcal · {day.meals.length} meal{day.meals.length !== 1 ? "s" : ""}
                    </span>
                  )}

                  {/* Expand chevron */}
                  {day.meals.length > 0 && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="var(--color-text-3)" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease", flexShrink: 0 }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                </div>

                {/* Expanded meal detail */}
                {isExpanded && (
                  <div style={{ padding: "14px 16px",
                    background: "white", borderRadius: 0,
                    borderTop: "1px solid var(--color-border)" }}>

                    {day.meals.map(meal => (
                      <div key={meal.log_id} style={{
                        background: "var(--color-surface-2)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        marginBottom: 8,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Link
                            href={`/generate/${meal.recipe_id}`}
                            style={{
                              fontWeight: 600, fontSize: "0.875rem",
                              color: "var(--color-text)", textDecoration: "none"
                            }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                          >
                            {meal.title}
                          </Link>
                          <span style={{ fontSize: "0.875rem", color: "var(--color-green-dark)",
                            fontWeight: 700 }}>
                            {meal.calories} kcal
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 16 }}>
                          {[
                            { label: "Protein", value: meal.protein_g, unit: "g" },
                            { label: "Carbs", value: meal.carbs_g, unit: "g" },
                            { label: "Fat", value: meal.fat_g, unit: "g" },
                          ].map(macro => (
                            <span key={macro.label} style={{ fontSize: "0.75rem" }}>
                              <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
                                {macro.value}{macro.unit}
                              </span>{" "}
                              <span style={{ color: "var(--color-text-3)", fontSize: "0.7rem",
                                textTransform: "uppercase" }}>
                                {macro.label}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Day nutrition summary */}
                    <div style={{ display: "flex", gap: 16, marginTop: 4,
                      paddingTop: 10, borderTop: "1px solid var(--color-border)" }}>
                      {[
                        { label: "Protein", value: day.totals.protein_g, unit: "g" },
                        { label: "Carbs", value: day.totals.carbs_g, unit: "g" },
                        { label: "Fat", value: day.totals.fat_g, unit: "g" },
                      ].map(macro => (
                        <div key={macro.label} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "0.85rem", fontWeight: 700,
                            color: "var(--color-green-dark)" }}>
                            {macro.value}{macro.unit}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--color-text-3)",
                            textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {macro.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      </div>
      )}

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
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes loadBar {
          0% { width: 0%; margin-left: 0; }
          50% { width: 100%; margin-left: 0; }
          100% { width: 0%; margin-left: 100%; }
        }
        .skeleton-card:hover {
          transform: none;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08);
        }
        .skeleton-line {
          background: var(--color-surface-2);
          border-radius: 6px;
          animation: pulse 1.4s ease-in-out infinite;
        }
        .nutrition-card {
          padding: 20px 24px;
          min-height: 160px;
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
          grid-template-columns: repeat(3, 1fr);
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
    </>
  );
}
