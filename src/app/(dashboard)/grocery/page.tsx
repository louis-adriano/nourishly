"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroceryItem {
  item_id: string;
  recipe_id: string | null;
  ingredient_name: string;
  quantity: string;
  is_collected: boolean;
}

interface GroceryGroup {
  groupId: string;
  recipeName: string;
  items: GroceryItem[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GroceryPage() {
  const [groups, setGroups] = useState<GroceryGroup[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [inputName, setInputName] = useState("");
  const [inputQty, setInputQty] = useState("");
  const [inputUnit, setInputUnit] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const UNITS = [
    { label: "No unit", value: "" },
    { label: "g", value: "g" },
    { label: "kg", value: "kg" },
    { label: "ml", value: "ml" },
    { label: "L", value: "L" },
    { label: "tsp", value: "tsp" },
    { label: "tbsp", value: "tbsp" },
    { label: "cup", value: "cup" },
    { label: "oz", value: "oz" },
    { label: "lb", value: "lb" },
    { label: "piece(s)", value: "piece(s)" },
    { label: "slice(s)", value: "slice(s)" },
    { label: "can", value: "can" },
    { label: "pack", value: "pack" },
  ];
  const [groupToDelete, setGroupToDelete] = useState<GroceryGroup | null>(null);

  useEffect(() => {
    if (!groupToDelete) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setGroupToDelete(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [groupToDelete]);

  useEffect(() => { fetchGroups(); }, []);

  async function fetchGroups() {
    setPageLoading(true);
    setPageError(null);
    try {
      const res = await fetch("/api/grocery");
      if (!res.ok) throw new Error(`Failed to load grocery list (${res.status})`);
      const data = await res.json();
      setGroups(data.groups);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPageLoading(false);
    }
  }

  async function handleAddItem() {
    const trimmedName = inputName.trim();
    if (!trimmedName || addLoading) return;
    setAddLoading(true);
    try {
      const res = await fetch("/api/grocery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredient_name: trimmedName, quantity: inputQty.trim() ? `${inputQty.trim()}${inputUnit ? " " + inputUnit : ""}` : "" }),
      });
      if (!res.ok) throw new Error("Failed to add item");
      const data = await res.json();
      setGroups((prev) =>
        prev.map((g) =>
          g.groupId === "group-general" ? { ...g, items: [...g.items, data.item] } : g
        )
      );
      setInputName("");
      setInputQty("");
      setInputUnit("");
    } catch {
      alert("Could not add item. Please try again.");
    } finally {
      setAddLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); handleAddItem(); }
  }

  async function handleToggle(groupId: string, item: GroceryItem) {
    const newValue = !item.is_collected;
    setGroups((prev) =>
      prev.map((g) =>
        g.groupId === groupId
          ? { ...g, items: g.items.map((i) => i.item_id === item.item_id ? { ...i, is_collected: newValue } : i) }
          : g
      )
    );
    try {
      const res = await fetch("/api/grocery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.item_id, is_collected: newValue }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setGroups((prev) =>
        prev.map((g) =>
          g.groupId === groupId
            ? { ...g, items: g.items.map((i) => i.item_id === item.item_id ? { ...i, is_collected: !newValue } : i) }
            : g
        )
      );
    }
  }

  async function handleDeleteItem(groupId: string, item_id: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.groupId === groupId ? { ...g, items: g.items.filter((i) => i.item_id !== item_id) } : g
      )
    );
    try {
      const res = await fetch("/api/grocery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id }),
      });
      if (!res.ok) throw new Error();
    } catch { fetchGroups(); }
  }

  async function handleDeleteGroup(group: GroceryGroup) {
    const recipe_id = group.groupId === "group-general" ? null : group.groupId;
    if (group.groupId === "group-general") {
      setGroups((prev) => prev.map((g) => g.groupId === "group-general" ? { ...g, items: [] } : g));
    } else {
      setGroups((prev) => prev.filter((g) => g.groupId !== group.groupId));
    }
    try {
      const res = await fetch("/api/grocery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe_id }),
      });
      if (!res.ok) throw new Error();
    } catch { fetchGroups(); }
  }

  const allItems = groups.flatMap((g) => g.items);
  const totalItems = allItems.length;
  const checkedItems = allItems.filter((i) => i.is_collected).length;
  const progressPct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
  const visibleGroups = groups.filter((g) => g.groupId === "group-general" || g.items.length > 0);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--color-border)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 2, background: "var(--color-green)", animation: "loadBar 1s ease infinite" }} />
        </div>
        <p style={{ fontSize: 14, color: "var(--color-text-3)", margin: 0 }}>Loading your grocery list…</p>
        <style>{`@keyframes loadBar { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (pageError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12, textAlign: "center", padding: "0 24px" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fdf0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e57373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", margin: 0 }}>Could not load grocery list</h2>
        <p style={{ fontSize: 13, color: "var(--color-text-3)", margin: 0 }}>{pageError}</p>
        <button onClick={fetchGroups} style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: "var(--color-green)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
          Try again
        </button>
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", fontFamily: "var(--font-body), 'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .item-row:hover .delete-btn { opacity: 1 !important; }
        .add-btn:hover:not(:disabled) { filter: brightness(0.9); }
        .group-section { animation: fadeUp 0.25s ease both; }
      `}</style>

      {/* ── Page header ── */}
      <div className="card" style={{ padding: "24px 28px", marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontWeight: 800,
            fontSize: "2rem",
            color: "var(--color-text)",
            margin: "0 0 4px",
            letterSpacing: "-0.03em",
          }}>
            Grocery List
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", margin: 0 }}>
            {totalItems === 0
              ? "Your list is empty — add items below"
              : `${checkedItems} of ${totalItems} item${totalItems === 1 ? "" : "s"} checked`}
          </p>

          {/* Progress bar */}
          {totalItems > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-3)" }}>Progress</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: progressPct === 100 ? "var(--color-green)" : "var(--color-text-2)" }}>
                  {progressPct}%{progressPct === 100 ? " 🎉 All done!" : ""}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "var(--color-surface-2)", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  borderRadius: 4,
                  background: progressPct === 100 ? "var(--color-green)" : "var(--color-green)",
                  width: `${progressPct}%`,
                  transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Stats pill */}
        {totalItems > 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--color-green-light)",
            borderRadius: 12,
            padding: "8px 14px",
            flexShrink: 0,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-green-dark)" }}>
              {totalItems - checkedItems} remaining
            </span>
          </div>
        )}
      </div>

      {/* ── Add item form ── */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 24 }}>
        <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-green)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>
          Add Item
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Item name"
            style={{
              flex: "2 1 160px",
              fontSize: "0.875rem",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1.5px solid var(--color-border)",
              background: "var(--color-bg)",
              color: "var(--color-text)",
              outline: "none",
              fontFamily: "inherit",
              transition: "border-color 0.15s ease",
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "var(--color-green)"}
            onBlur={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
          />
          <input
            type="text"
            value={inputQty}
            onChange={(e) => setInputQty(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Quantity (optional)"
            style={{
              flex: "1 1 120px",
              fontSize: "0.875rem",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1.5px solid var(--color-border)",
              background: "var(--color-bg)",
              color: "var(--color-text)",
              outline: "none",
              fontFamily: "inherit",
              transition: "border-color 0.15s ease",
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "var(--color-green)"}
            onBlur={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
          />
          <select
            value={inputUnit}
            onChange={(e) => setInputUnit(e.target.value)}
            style={{
              flex: "0 0 auto",
              fontSize: "0.875rem",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1.5px solid var(--color-border)",
              background: "var(--color-bg)",
              color: inputUnit ? "var(--color-text)" : "var(--color-text-3)",
              outline: "none",
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "border-color 0.15s ease",
              minWidth: 90,
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "var(--color-green)"}
            onBlur={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
          >
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
          <button
            className="add-btn"
            onClick={handleAddItem}
            disabled={!inputName.trim() || addLoading}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: inputName.trim() && !addLoading ? "var(--color-green)" : "var(--color-border)",
              color: inputName.trim() && !addLoading ? "#fff" : "var(--color-text-3)",
              fontSize: "0.875rem",
              fontWeight: 700,
              cursor: inputName.trim() && !addLoading ? "pointer" : "not-allowed",
              transition: "all 0.15s ease",
              flexShrink: 0,
              fontFamily: "inherit",
            }}
          >
            {addLoading ? "Adding…" : "+ Add"}
          </button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {totalItems === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "48px 24px", animation: "fadeUp 0.3s ease both" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--color-green-light)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text)", margin: "0 0 8px" }}>No items yet</h2>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", margin: 0, maxWidth: 300, lineHeight: 1.6 }}>
            Add items manually above, or import a recipe&apos;s ingredients from the recipe detail page.
          </p>
        </div>
      )}

      {/* ── Grouped sections ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {visibleGroups.map((group) => {
          const groupChecked = group.items.filter((i) => i.is_collected).length;
          const groupTotal = group.items.length;

          return (
            <section key={group.groupId} className="group-section">
              {/* Group card */}
              <div className="card" style={{ overflow: "hidden", padding: 0 }}>

                {/* Group header */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  borderBottom: group.items.length > 0 ? "1px solid var(--color-border)" : "none",
                  background: "var(--color-green-light)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h2 style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--color-green-dark)",
                      margin: 0,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}>
                      {group.recipeName}
                    </h2>
                    {groupTotal > 0 && (
                      <span style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        color: "var(--color-green)",
                        background: "white",
                        borderRadius: 20,
                        padding: "2px 8px",
                      }}>
                        {groupChecked}/{groupTotal}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setGroupToDelete(group)}
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--color-text-3)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "3px 8px",
                      borderRadius: 6,
                      transition: "color 0.15s ease",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#e57373"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-3)"}
                  >
                    {group.groupId === "group-general" ? "Clear all" : "Remove group"}
                  </button>
                </div>

                {/* Items list */}
                {group.items.length === 0 ? (
                  <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", padding: "16px 20px", margin: 0 }}>
                    No items — add one above.
                  </p>
                ) : (
                  group.items.map((item, i) => (
                    <div
                      key={item.item_id}
                      className="item-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "13px 20px",
                        background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-bg)",
                        borderBottom: i < group.items.length - 1 ? "1px solid var(--color-border)" : "none",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggle(group.groupId, item)}
                        aria-label={item.is_collected ? "Mark as uncollected" : "Mark as collected"}
                        style={{
                          flexShrink: 0,
                          width: 22,
                          height: 22,
                          borderRadius: 7,
                          border: `2px solid ${item.is_collected ? "var(--color-green)" : "var(--color-border)"}`,
                          background: item.is_collected ? "var(--color-green)" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {item.is_collected && (
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>

                      {/* Name + quantity */}
                      <span style={{ flex: 1, fontSize: "0.9rem", fontWeight: 500, color: item.is_collected ? "var(--color-text-3)" : "var(--color-text)", textDecoration: item.is_collected ? "line-through" : "none", transition: "all 0.15s ease" }}>
                        {item.ingredient_name}
                        {item.quantity && (
                          <span style={{ fontSize: "0.8rem", color: "var(--color-text-3)", fontWeight: 400, marginLeft: 8 }}>
                            {item.quantity}
                          </span>
                        )}
                      </span>

                      {/* Delete */}
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteItem(group.groupId, item.item_id)}
                        aria-label={`Delete ${item.ingredient_name}`}
                        style={{
                          opacity: 0,
                          flexShrink: 0,
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          border: "none",
                          background: "#fdf0f0",
                          color: "#e57373",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "opacity 0.15s ease",
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* ── Delete confirmation modal ── */}
      {groupToDelete && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setGroupToDelete(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}
        >
          <div style={{ background: "var(--color-surface)", borderRadius: 20, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fdf0f0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e57373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            </div>
            <h2 style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "var(--color-text)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
              {groupToDelete.groupId === "group-general" ? "Clear all general items?" : `Remove ${groupToDelete.recipeName}?`}
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", margin: "0 0 24px", lineHeight: 1.6 }}>
              {groupToDelete.items.length === 0
                ? "This group is already empty."
                : `This will delete ${groupToDelete.items.length} item${groupToDelete.items.length === 1 ? "" : "s"}. This can't be undone.`}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setGroupToDelete(null)}
                style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1.5px solid var(--color-border)", background: "transparent", color: "var(--color-text-2)", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { handleDeleteGroup(groupToDelete); setGroupToDelete(null); }}
                style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: "#e57373", color: "white", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                {groupToDelete.groupId === "group-general" ? "Clear all" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}