"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { calculateNutritionTargets, type HealthGoal, type Sex } from "@/lib/nutrition";

// ── Types kept for the hidden pass-through fields (see HealthTab note below) ───

type DietaryRestriction =
  | "vegetarian"
  | "vegan"
  | "gluten-free"
  | "dairy-free"
  | "nut-free"
  | "low-carb"
  | "keto"
  | "paleo"
  | "halal"
  | "kosher";

type CuisinePreference =
  | "italian"
  | "mexican"
  | "chinese"
  | "japanese"
  | "indian"
  | "thai"
  | "mediterranean"
  | "american"
  | "french"
  | "korean";

const SEX_OPTIONS: { id: Sex; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "prefer-not-to-say", label: "Prefer not to say" },
];

// ── Shared styles ────────────────────────────────────────────────────────────

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

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "10px 14px",
  borderRadius: 10,
  border: "1.5px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  fontSize: "0.875rem",
  fontFamily: "var(--font-body), system-ui, sans-serif",
  outline: "none",
};

const disabledInputStyle = {
  ...inputStyle,
  background: "var(--color-surface-2)",
  color: "var(--color-text-3)",
  cursor: "not-allowed",
  wordBreak: "break-word" as const,
};

const saveButtonStyle = (saveSuccess: boolean, disabled: boolean) => ({
  width: "100%",
  minHeight: 44,
  padding: "14px",
  borderRadius: 12,
  border: "none",
  background: saveSuccess ? "var(--color-green-dark)" : "var(--color-green)",
  color: "white",
  fontSize: "0.95rem",
  fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.7 : 1,
  fontFamily: "var(--font-body), system-ui, sans-serif",
  transition: "all 0.2s ease",
});

type Tab = "profile" | "health";

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Profile tab (Supabase Auth — full name; email is read-only) ──────────────
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Health Details tab (profiles table) ───────────────────────────────────────
  // health_goal / dietary_restrictions / cuisine_preferences are edited
  // exclusively via the "Edit Preferences" modal on /generate. We still fetch
  // and hold them here — never rendered — purely so the Health Details save
  // can round-trip them unchanged. /api/auth/onboarding upserts the full
  // profiles row and defaults these to [] when absent from the request body,
  // so omitting them here would silently wipe out whatever was set there.
  const [goal, setGoal] = useState<HealthGoal | "">("");
  const [diet, setDiet] = useState<DietaryRestriction[]>([]);
  const [cuisines, setCuisines] = useState<CuisinePreference[]>([]);
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [sex, setSex] = useState<Sex | "">("");
  const [savingHealth, setSavingHealth] = useState(false);
  const [healthSaveSuccess, setHealthSaveSuccess] = useState(false);
  const [healthError, setHealthError] = useState("");

  // Both tabs' data are fetched together up front so every field arrives
  // pre-filled before anything renders — no flash of empty/default values.
  useEffect(() => {
    async function loadAll() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPageLoading(false);
        return;
      }

      setEmail(user.email ?? "");
      setFullName((user.user_metadata?.full_name as string | undefined) ?? "");

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setGoal((data.health_goal as HealthGoal) ?? "");
        setDiet((data.dietary_restrictions as DietaryRestriction[]) ?? []);
        setCuisines((data.cuisine_preferences as CuisinePreference[]) ?? []);
        setAge(data.age != null ? String(data.age) : "");
        setWeight(data.weight_kg != null ? String(data.weight_kg) : "");
        setHeight(data.height_cm != null ? String(data.height_cm) : "");
        setSex((data.sex as Sex) ?? "");
      }
      setPageLoading(false);
    }
    loadAll();
  }, []);

  const profileFormValid = fullName.trim() !== "";
  const healthFormValid = age !== "" && weight !== "" && height !== "" && sex !== "";

  async function handleSaveProfile() {
    if (!profileFormValid) return;
    setSavingProfile(true);
    setProfileError("");
    try {
      const supabase = createClient();
      // Email is intentionally never sent here — it's read-only on this tab.
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      if (error) {
        setProfileError(error.message);
        return;
      }

      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 2000);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveHealth() {
    if (!healthFormValid) return;
    setSavingHealth(true);
    setHealthError("");
    try {
      // Recalculated from the edited body metrics + the untouched health_goal
      // fetched on load — so this stays consistent even though goal isn't
      // editable from this tab.
      const targets = calculateNutritionTargets({
        weight_kg: parseFloat(weight),
        height_cm: parseFloat(height),
        age: parseInt(age),
        sex,
        health_goal: goal,
      });

      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          health_goal: goal,
          dietary_restrictions: diet,
          cuisine_preferences: cuisines,
          age: parseInt(age),
          weight_kg: parseFloat(weight),
          height_cm: parseFloat(height),
          sex,
          ...targets,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setHealthError(data.error || "Something went wrong");
        return;
      }

      setHealthSaveSuccess(true);
      setTimeout(() => setHealthSaveSuccess(false), 2000);
    } finally {
      setSavingHealth(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  // Covers both tabs — the form never renders with empty/default values that
  // then get swapped out once the real data arrives.

  if (pageLoading) {
    return (
      <div className="loading-overlay">
        <img
          src="/icons/icon-192.png"
          alt="Nourishly"
          width={56}
          height={56}
          style={{ borderRadius: 14 }}
        />
        <div className="loading-text">Loading…</div>
        <div className="loading-track">
          <div className="loading-fill" />
        </div>
        <style jsx>{`
          .loading-overlay {
            position: fixed;
            inset: 0;
            background: var(--color-bg);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            z-index: 10;
            padding-left: 220px;
          }
          .loading-text {
            font-family: var(--font-display);
            font-weight: 600;
            font-size: 1rem;
            color: var(--color-text-3);
          }
          .loading-track {
            width: 40px;
            height: 4px;
            border-radius: 2px;
            background: var(--color-border);
            overflow: hidden;
          }
          .loading-fill {
            height: 100%;
            border-radius: 2px;
            background: var(--color-green);
            animation: loadBar 1s ease infinite;
          }
          @keyframes loadBar {
            0% { width: 0%; margin-left: 0; }
            50% { width: 100%; margin-left: 0; }
            100% { width: 0%; margin-left: 100%; }
          }
          @media (max-width: 767px) {
            .loading-overlay {
              padding-left: 0;
              padding-top: 56px;
            }
          }
        `}</style>
      </div>
    );
  }

  // ── Page ─────────────────────────────────────────────────────────────────

  return (
    <div className="profile-page">

      {/* Header */}
      <div className="card no-hover header-card">
        <h1 className="header-title">Profile</h1>
        <p className="header-subtitle">Manage your account and body metrics</p>
      </div>

      {/* Tabs */}
      <div className="tabs-row">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`tab-btn${activeTab === "profile" ? " active" : ""}`}
        >
          Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("health")}
          className={`tab-btn${activeTab === "health" ? " active" : ""}`}
        >
          Health Details
        </button>
      </div>

      {activeTab === "profile" ? (
        <ProfileTab
          fullName={fullName}
          setFullName={setFullName}
          email={email}
          saving={savingProfile}
          saveSuccess={profileSaveSuccess}
          error={profileError}
          formValid={profileFormValid}
          onSave={handleSaveProfile}
        />
      ) : (
        <HealthTab
          age={age} setAge={setAge}
          weight={weight} setWeight={setWeight}
          height={height} setHeight={setHeight}
          sex={sex} setSex={setSex}
          saving={savingHealth}
          saveSuccess={healthSaveSuccess}
          error={healthError}
          formValid={healthFormValid}
          onSave={handleSaveHealth}
        />
      )}

      <style jsx>{`
        .profile-page {
          font-family: var(--font-body), system-ui, sans-serif;
        }
        .no-hover:hover { transform: none !important; box-shadow: none !important; }
        .card.header-card {
          padding: 24px 28px;
          margin-bottom: 24px;
        }
        .header-title {
          font-family: var(--font-display), system-ui, sans-serif;
          font-weight: 800;
          font-size: 2rem;
          color: var(--color-text);
          margin: 0 0 4px;
          letter-spacing: -0.03em;
        }
        .header-subtitle {
          color: var(--color-text-3);
          font-size: 0.875rem;
          margin: 0;
        }
        .tabs-row {
          display: flex;
          gap: 6px;
          margin-bottom: 20px;
        }
        .tab-btn {
          padding: 10px 20px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: var(--color-text-2);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          font-family: var(--font-body), system-ui, sans-serif;
          transition: all 0.15s ease;
        }
        .tab-btn.active {
          background: var(--color-green);
          color: white;
        }
        @media (max-width: 767px) {
          .tabs-row {
            width: 100%;
          }
          .tab-btn {
            flex: 1 1 0;
            min-height: 44px;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}

// ── Profile tab ──────────────────────────────────────────────────────────────

function ProfileTab({
  fullName, setFullName,
  email,
  saving, saveSuccess, error, formValid, onSave,
}: {
  fullName: string;
  setFullName: (v: string) => void;
  email: string;
  saving: boolean;
  saveSuccess: boolean;
  error: string;
  formValid: boolean;
  onSave: () => void;
}) {
  return (
    <div className="card no-hover profile-tab">
      <div className="field">
        <label className="field-label">Full Name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Doe"
          style={inputStyle}
        />
      </div>

      <div className="field">
        <label className="field-label">Email</label>
        <input
          type="email"
          value={email}
          disabled
          readOnly
          style={disabledInputStyle}
        />
        <p className="field-note">Email cannot be changed.</p>
      </div>

      {error && <p className="field-error">{error}</p>}

      <button
        type="button"
        onClick={onSave}
        disabled={saving || !formValid}
        style={saveButtonStyle(saveSuccess, saving || !formValid)}
      >
        {saveSuccess ? "Saved ✓" : saving ? "Saving…" : "Save Changes"}
      </button>

      <style jsx>{`
        .card.profile-tab {
          padding: 28px 32px;
          box-sizing: border-box;
        }
        .field {
          margin-bottom: 24px;
          min-width: 0;
        }
        .field-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-text-2);
          display: block;
          margin-bottom: 6px;
        }
        .field-note {
          font-size: 0.75rem;
          color: var(--color-text-3);
          margin: 6px 0 0;
        }
        .field-error {
          color: var(--color-danger);
          font-size: 0.85rem;
          margin: 0 0 16px;
          overflow-wrap: anywhere;
        }
        @media (max-width: 767px) {
          .card.profile-tab {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}

// ── Health Details tab ────────────────────────────────────────────────────────

function HealthTab({
  age, setAge,
  weight, setWeight,
  height, setHeight,
  sex, setSex,
  saving, saveSuccess, error, formValid, onSave,
}: {
  age: string;
  setAge: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
  height: string;
  setHeight: (v: string) => void;
  sex: Sex | "";
  setSex: (v: Sex) => void;
  saving: boolean;
  saveSuccess: boolean;
  error: string;
  formValid: boolean;
  onSave: () => void;
}) {
  return (
    <div className="card no-hover health-tab">

      {/* Body metrics — the only section on this tab */}
      <div className="section">
        <p style={SECTION_LABEL_STYLE}>Body Metrics</p>
        <div className="metrics-grid">
          <div className="field">
            <label className="field-label">Age</label>
            <input
              type="number"
              min={10}
              max={100}
              placeholder="25"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div className="field">
            <label className="field-label">Weight (kg)</label>
            <input
              type="number"
              placeholder="70"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div className="field">
            <label className="field-label">Height (cm)</label>
            <input
              type="number"
              placeholder="170"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div className="field">
            <label className="field-label">Sex</label>
            <div className="sex-row">
              {SEX_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSex(opt.id)}
                  className="sex-btn"
                  style={{ ...chipStyle(sex === opt.id), borderRadius: 10 }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="field-error">{error}</p>}

      <button
        type="button"
        onClick={onSave}
        disabled={saving || !formValid}
        style={saveButtonStyle(saveSuccess, saving || !formValid)}
      >
        {saveSuccess ? "Saved ✓" : saving ? "Saving…" : "Save Changes"}
      </button>

      <style jsx>{`
        .card.health-tab {
          padding: 28px 32px;
          box-sizing: border-box;
        }
        .section {
          margin-bottom: 28px;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        .field-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-text-2);
        }
        .sex-row {
          display: flex;
          gap: 8px;
        }
        .sex-btn {
          flex: 1 1 0;
          min-width: 0;
          text-align: center;
        }
        .field-error {
          color: var(--color-danger);
          font-size: 0.85rem;
          margin: 0 0 16px;
          overflow-wrap: anywhere;
        }
        @media (max-width: 767px) {
          .card.health-tab {
            padding: 20px;
          }
          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
