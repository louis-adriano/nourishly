"use client";

import { useEffect, useState } from "react";

// ─── Types (matching grocery_items Supabase schema) ───────────────────────────

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

  // Add item form state
  const [inputName, setInputName] = useState("");
  const [inputQty, setInputQty] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // ── Fetch all grocery items on mount ────────────────────────────────────────
  useEffect(() => {
    fetchGroups();
  }, []);

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

  // ── Add item manually (POST) ─────────────────────────────────────────────
  async function handleAddItem() {
    const trimmedName = inputName.trim();
    if (!trimmedName || addLoading) return;

    setAddLoading(true);
    try {
      const res = await fetch("/api/grocery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredient_name: trimmedName,
          quantity: inputQty.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to add item");
      const data = await res.json();

      // Optimistically add to General Items group
      setGroups((prev) =>
        prev.map((g) =>
          g.groupId === "group-general"
            ? { ...g, items: [...g.items, data.item] }
            : g
        )
      );
      setInputName("");
      setInputQty("");
    } catch {
      alert("Could not add item. Please try again.");
    } finally {
      setAddLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddItem();
    }
  }

  // ── Toggle checkbox (PATCH) ──────────────────────────────────────────────
  async function handleToggle(groupId: string, item: GroceryItem) {
    const newValue = !item.is_collected;

    // Optimistic update
    setGroups((prev) =>
      prev.map((g) =>
        g.groupId === groupId
          ? {
              ...g,
              items: g.items.map((i) =>
                i.item_id === item.item_id ? { ...i, is_collected: newValue } : i
              ),
            }
          : g
      )
    );

    try {
      const res = await fetch("/api/grocery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.item_id, is_collected: newValue }),
      });
      if (!res.ok) throw new Error("Failed to update item");
    } catch {
      // Revert on failure
      setGroups((prev) =>
        prev.map((g) =>
          g.groupId === groupId
            ? {
                ...g,
                items: g.items.map((i) =>
                  i.item_id === item.item_id ? { ...i, is_collected: !newValue } : i
                ),
              }
            : g
        )
      );
    }
  }

  // ── Delete single item (DELETE) ──────────────────────────────────────────
  async function handleDeleteItem(groupId: string, item_id: string) {
    // Optimistic update
    setGroups((prev) =>
      prev.map((g) =>
        g.groupId === groupId
          ? { ...g, items: g.items.filter((i) => i.item_id !== item_id) }
          : g
      )
    );

    try {
      const res = await fetch("/api/grocery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id }),
      });
      if (!res.ok) throw new Error("Failed to delete item");
    } catch {
      // Refetch to restore accurate state on failure
      fetchGroups();
    }
  }

  // ── Delete entire group (DELETE) ─────────────────────────────────────────
  async function handleDeleteGroup(group: GroceryGroup) {
    const recipe_id = group.groupId === "group-general" ? null : group.groupId;

    // Optimistic update
    if (group.groupId === "group-general") {
      setGroups((prev) =>
        prev.map((g) => (g.groupId === "group-general" ? { ...g, items: [] } : g))
      );
    } else {
      setGroups((prev) => prev.filter((g) => g.groupId !== group.groupId));
    }

    try {
      const res = await fetch("/api/grocery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe_id }),
      });
      if (!res.ok) throw new Error("Failed to delete group");
    } catch {
      fetchGroups();
    }
  }

  // ── Derived stats ────────────────────────────────────────────────────────
  const allItems = groups.flatMap((g) => g.items);
  const totalItems = allItems.length;
  const checkedItems = allItems.filter((i) => i.is_collected).length;
  const visibleGroups = groups.filter(
    (g) => g.groupId === "group-general" || g.items.length > 0
  );

  // ── Loading state ────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div style={{ fontFamily: "'DM Sans', 'Nunito', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e8f0eb", borderTopColor: "#2C7A4B", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 14, color: "#7a9a88", margin: 0 }}>Loading your grocery list…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (pageError) {
    return (
      <div style={{ fontFamily: "'DM Sans', 'Nunito', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12, textAlign: "center", padding: "0 24px" }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e57373" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a3a28", margin: 0 }}>Could not load grocery list</h2>
        <p style={{ fontSize: 14, color: "#7a9a88", margin: 0 }}>{pageError}</p>
        <button
          onClick={fetchGroups}
          style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "#2C7A4B", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans', 'Nunito', sans-serif", maxWidth: 720, margin: "0 auto", padding: "32px 24px 64px" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .item-row:hover .delete-btn { opacity: 1 !important; }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a3a28", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
          Grocery List
        </h1>
        <p style={{ fontSize: 13, color: "#7a9a88", margin: 0 }}>
          {totalItems === 0
            ? "Your list is empty — add items below"
            : `${checkedItems} of ${totalItems} item${totalItems === 1 ? "" : "s"} checked`}
        </p>
      </div>

      {/* ── Add item form ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
        <input
          type="text"
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Item name"
          style={{ flex: "2 1 160px", fontSize: 13, padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d4e6da", background: "#fff", color: "#1a3a28", outline: "none" }}
        />
        <input
          type="text"
          value={inputQty}
          onChange={(e) => setInputQty(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Quantity (optional)"
          style={{ flex: "1 1 120px", fontSize: 13, padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d4e6da", background: "#fff", color: "#1a3a28", outline: "none" }}
        />
        <button
          onClick={handleAddItem}
          disabled={!inputName.trim() || addLoading}
          style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: inputName.trim() && !addLoading ? "#2C7A4B" : "#d4e6da", color: inputName.trim() && !addLoading ? "#fff" : "#a0b8a8", fontSize: 13, fontWeight: 700, cursor: inputName.trim() && !addLoading ? "pointer" : "not-allowed", transition: "background 0.15s ease", flexShrink: 0 }}
        >
          {addLoading ? "Adding…" : "+ Add"}
        </button>
      </div>

      {/* ── Empty state ── */}
      {totalItems === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "48px 24px", animation: "fadeUp 0.3s ease both" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#eaf4ee", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2C7A4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a3a28", margin: "0 0 6px" }}>No items yet</h2>
          <p style={{ fontSize: 13, color: "#7a9a88", margin: 0, maxWidth: 280, lineHeight: 1.6 }}>
            Add items manually above or import a recipe&apos;s ingredients from the recipe detail page.
          </p>
        </div>
      )}

      {/* ── Grouped sections ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {visibleGroups.map((group) => (
          <section key={group.groupId} style={{ animation: "fadeUp 0.25s ease both" }}>

            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "#2C7A4B", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {group.recipeName}
              </h2>
              <button
                onClick={() => handleDeleteGroup(group)}
                style={{ fontSize: 12, color: "#b0c4b8", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 6, transition: "color 0.15s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#e57373")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#b0c4b8")}
              >
                {group.groupId === "group-general" ? "Clear all" : "Remove group"}
              </button>
            </div>

            {/* Items */}
            <div style={{ border: "1px solid #e8f0eb", borderRadius: 12, overflow: "hidden" }}>
              {group.items.length === 0 ? (
                <p style={{ fontSize: 13, color: "#b0c4b8", padding: "14px 16px", margin: 0 }}>
                  No items — add one above.
                </p>
              ) : (
                group.items.map((item, i) => (
                  <div
                    key={item.item_id}
                    className="item-row"
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: i % 2 === 0 ? "#f8faf9" : "#fff", borderBottom: i < group.items.length - 1 ? "1px solid #e8f0eb" : "none" }}
                  >
                    {/* Custom checkbox */}
                    <button
                      onClick={() => handleToggle(group.groupId, item)}
                      aria-label={item.is_collected ? "Mark as uncollected" : "Mark as collected"}
                      style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, border: `2px solid ${item.is_collected ? "#2C7A4B" : "#c5d9ce"}`, background: item.is_collected ? "#2C7A4B" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s ease" }}
                    >
                      {item.is_collected && (
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>

                    {/* Item name + quantity */}
                    <span style={{ flex: 1, fontSize: 14, color: item.is_collected ? "#a0b8a8" : "#1a3a28", fontWeight: 500, textDecoration: item.is_collected ? "line-through" : "none", transition: "all 0.15s ease" }}>
                      {item.ingredient_name}
                      {item.quantity && (
                        <span style={{ fontSize: 13, color: item.is_collected ? "#c5d9ce" : "#7a9a88", fontWeight: 400, marginLeft: 8 }}>
                          {item.quantity}
                        </span>
                      )}
                    </span>

                    {/* Delete button */}
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteItem(group.groupId, item.item_id)}
                      aria-label={`Delete ${item.ingredient_name}`}
                      style={{ opacity: 0, flexShrink: 0, width: 28, height: 28, borderRadius: 8, border: "none", background: "#fdf0f0", color: "#e57373", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "opacity 0.15s ease" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}