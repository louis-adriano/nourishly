"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroceryItem {
  id: string;
  name: string;
  quantity: string;
  is_collected: boolean;
}

interface GroceryGroup {
  groupId: string;
  recipeName: string; // "General Items" for manually added
  items: GroceryItem[];
}

// ─── Mock data (replaced by Supabase fetch in FR08-02) ────────────────────────

const MOCK_GROUPS: GroceryGroup[] = [
  {
    groupId: "group-001",
    recipeName: "Teriyaki Chicken Bowl",
    items: [
      { id: "i-001", name: "chicken breast",  quantity: "2 pieces", is_collected: false },
      { id: "i-002", name: "jasmine rice",    quantity: "1 cup",    is_collected: false },
      { id: "i-003", name: "broccoli florets",quantity: "1 cup",    is_collected: false },
      { id: "i-004", name: "soy sauce",       quantity: "1/4 cup",  is_collected: false },
    ],
  },
  {
    groupId: "group-002",
    recipeName: "Mediterranean Chickpea Bowl",
    items: [
      { id: "i-005", name: "chickpeas",      quantity: "1 can",   is_collected: false },
      { id: "i-006", name: "mixed greens",   quantity: "2 cups",  is_collected: false },
      { id: "i-007", name: "cherry tomatoes",quantity: "1 cup",   is_collected: false },
      { id: "i-008", name: "feta cheese",    quantity: "1/4 cup", is_collected: false },
    ],
  },
  {
    groupId: "group-general",
    recipeName: "General Items",
    items: [],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GroceryPage() {
  const [groups, setGroups] = useState<GroceryGroup[]>(MOCK_GROUPS);
  const [inputName, setInputName] = useState("");
  const [inputQty, setInputQty] = useState("");

  // ── Derived stats ──────────────────────────────────────────────────────────
  const allItems = groups.flatMap((g) => g.items);
  const totalItems = allItems.length;
  const checkedItems = allItems.filter((i) => i.is_collected).length;

  // ── Add item manually to General Items group ───────────────────────────────
  function handleAddItem() {
    const trimmedName = inputName.trim();
    if (!trimmedName) return;

    const newItem: GroceryItem = {
      id: generateId(),
      name: trimmedName,
      quantity: inputQty.trim(),
      is_collected: false,
    };

    setGroups((prev) =>
      prev.map((g) =>
        g.groupId === "group-general"
          ? { ...g, items: [...g.items, newItem] }
          : g
      )
    );
    setInputName("");
    setInputQty("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddItem();
    }
  }

  // ── Toggle checkbox (visual only — persisted in FR08-02) ───────────────────
  function handleToggle(groupId: string, itemId: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.groupId === groupId
          ? {
              ...g,
              items: g.items.map((item) =>
                item.id === itemId
                  ? { ...item, is_collected: !item.is_collected }
                  : item
              ),
            }
          : g
      )
    );
  }

  // ── Delete single item ─────────────────────────────────────────────────────
  function handleDeleteItem(groupId: string, itemId: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.groupId === groupId
          ? { ...g, items: g.items.filter((item) => item.id !== itemId) }
          : g
      )
    );
  }

  // ── Delete entire group ────────────────────────────────────────────────────
  function handleDeleteGroup(groupId: string) {
    // Never delete the General Items group — just clear its items
    if (groupId === "group-general") {
      setGroups((prev) =>
        prev.map((g) => (g.groupId === "group-general" ? { ...g, items: [] } : g))
      );
    } else {
      setGroups((prev) => prev.filter((g) => g.groupId !== groupId));
    }
  }

  // ── Visible groups (hide empty non-general groups) ─────────────────────────
  const visibleGroups = groups.filter(
    (g) => g.groupId === "group-general" || g.items.length > 0
  );

  return (
    <div style={{ fontFamily: "'DM Sans', 'Nunito', sans-serif", maxWidth: 720, margin: "0 auto", padding: "32px 24px 64px" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .item-row:hover .delete-btn { opacity: 1; }
        .delete-btn { opacity: 0; transition: opacity 0.15s ease; }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a3a28", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
          Grocery List
        </h1>
        <p style={{ fontSize: 13, color: "#4a6b58", margin: 0 }}>
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
          disabled={!inputName.trim()}
          style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: inputName.trim() ? "#2C7A4B" : "#d4e6da", color: inputName.trim() ? "#fff" : "#a0b8a8", fontSize: 13, fontWeight: 700, cursor: inputName.trim() ? "pointer" : "not-allowed", transition: "background 0.15s ease", flexShrink: 0 }}
        >
          + Add
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
          <p style={{ fontSize: 13, color: "#4a6b58", margin: 0, maxWidth: 280, lineHeight: 1.6 }}>
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
                onClick={() => handleDeleteGroup(group.groupId)}
                title={group.groupId === "group-general" ? "Clear all general items" : "Remove this group"}
                style={{ fontSize: 12, color: "#4a6b58", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 6, transition: "color 0.15s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#e57373")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#4a6b58")}
              >
                {group.groupId === "group-general" ? "Clear all" : "Remove group"}
              </button>
            </div>

            {/* Items */}
            <div style={{ border: "1px solid #e8f0eb", borderRadius: 12, overflow: "hidden" }}>
              {group.items.length === 0 ? (
                <p style={{ fontSize: 13, color: "#4a6b58", padding: "14px 16px", margin: 0 }}>
                  No items — add one above.
                </p>
              ) : (
                group.items.map((item, i) => (
                  <div
                    key={item.id}
                    className="item-row"
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: i % 2 === 0 ? "#f8faf9" : "#fff", borderBottom: i < group.items.length - 1 ? "1px solid #e8f0eb" : "none" }}
                  >
                    {/* Custom checkbox */}
                    <button
                      onClick={() => handleToggle(group.groupId, item.id)}
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
                    <span style={{ flex: 1, fontSize: 14, color: item.is_collected ? "#4a6b58" : "#1a3a28", fontWeight: 500, textDecoration: item.is_collected ? "line-through" : "none", transition: "all 0.15s ease" }}>
                      {item.name}
                      {item.quantity && (
                        <span style={{ fontSize: 13, color: item.is_collected ? "#4a6b58" : "#4a6b58", fontWeight: 400, marginLeft: 8 }}>
                          {item.quantity}
                        </span>
                      )}
                    </span>

                    {/* Delete button */}
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteItem(group.groupId, item.id)}
                      aria-label={`Delete ${item.name}`}
                      style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, border: "none", background: "#fdf0f0", color: "#e57373", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
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