"use client";

import { useState } from "react";
import { saveCatalogItem, deleteCatalogItemAction, toggleCatalogItemAvailability } from "./actions";
import type { CatalogItem } from "../../../lib/merchant-types";

function formatCents(cents: number): string {
  return `RM ${(cents / 100).toFixed(2)}`;
}

interface CatalogEditorProps {
  initialItems: CatalogItem[];
  initialCategories: string[];
}

export default function CatalogEditor({ initialItems, initialCategories }: CatalogEditorProps) {
  const [items, setItems] = useState<CatalogItem[]>(initialItems);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emptyForm = {
    name: "",
    priceCents: 0,
    isAvailable: true,
    categoryName: "",
    description: "",
  };
  const [form, setForm] = useState(emptyForm);

  const refresh = () => {
    // Full page refresh to get fresh data from Supabase
    window.location.reload();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : type === "number" ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const result = await saveCatalogItem({
        itemId: editingId || crypto.randomUUID(),
        name: form.name,
        priceCents: form.priceCents,
        isAvailable: form.isAvailable,
        categoryName: form.categoryName,
      });

      if (result.status === "rejected") {
        setError(result.message);
      } else {
        setForm(emptyForm);
        setEditingId(null);
        setShowForm(false);
        refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item.");
    }
    setSaving(false);
  };

  const startEdit = (item: CatalogItem) => {
    setForm({
      name: item.name,
      priceCents: item.priceCents,
      isAvailable: item.isAvailable,
      categoryName: item.categoryName,
      description: item.description || "",
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    try {
      const result = await deleteCatalogItemAction(id);
      if (!result.ok) {
        alert(result.message);
      } else {
        refresh();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete item.");
    }
  };

  const handleToggleAvailability = async (id: string, current: boolean) => {
    try {
      const result = await toggleCatalogItemAvailability(id, !current);
      if (!result.ok) {
        alert(result.message);
      } else {
        // Optimistic update
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, isAvailable: !current } : item
          )
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle availability.");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
  };

  const itemsByCategory = categories.map((cat) => ({
    category: cat,
    items: items.filter((item) => item.categoryName === cat),
  }));

  // Also show uncategorized items
  const uncategorized = items.filter((item) => !item.categoryName || item.categoryName === "Uncategorized");
  if (uncategorized.length > 0 && !categories.includes("Uncategorized")) {
    itemsByCategory.push({ category: "Uncategorized", items: uncategorized });
  }

  return (
    <>
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button
          className="merchant-btn merchant-btn-primary"
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
        >
          <span className="material-symbols-outlined">add</span>
          Add Item
        </button>
      </div>

      {showForm && (
        <div className="merchant-card" style={{ maxWidth: 640, marginBottom: 24 }}>
          <div className="merchant-card-title">
            <span className="material-symbols-outlined">{editingId ? "edit" : "add_circle"}</span>
            {editingId ? "Edit Item" : "New Item"}
          </div>
          <form onSubmit={handleSubmit} className="merchant-form">
            <div className="merchant-form-group">
              <label className="merchant-form-label">Item Name</label>
              <input name="name" type="text" className="merchant-form-input" value={form.name} onChange={handleChange} required placeholder="e.g., Signature Basil Beef Pad Kra Pao" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="merchant-form-group">
                <label className="merchant-form-label">Price (cents)</label>
                <input name="priceCents" type="number" min={0} className="merchant-form-input" value={form.priceCents} onChange={handleChange} required placeholder="e.g., 1650" />
                <p className="merchant-form-hint">Enter price in cents (e.g., 1650 = RM 16.50)</p>
              </div>
              <div className="merchant-form-group">
                <label className="merchant-form-label">Category</label>
                <input name="categoryName" type="text" className="merchant-form-input" value={form.categoryName} onChange={handleChange} required placeholder="e.g., Signature, Drinks, Sides" list="category-list" />
                <datalist id="category-list">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
            <div className="merchant-form-group">
              <label className="merchant-form-label">Description</label>
              <textarea name="description" className="merchant-form-textarea" rows={2} value={form.description} onChange={handleChange} placeholder="Brief description for customers" />
            </div>
            <div className="merchant-form-group" style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <input name="isAvailable" type="checkbox" checked={form.isAvailable} onChange={handleChange} style={{ width: 20, height: 20, accentColor: "var(--primary)" }} />
              <label className="merchant-form-label" style={{ margin: 0 }}>Available for ordering</label>
            </div>
            {error && (
              <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--error-container)", color: "var(--error)", fontSize: "0.85rem", fontWeight: 600, marginBottom: 8 }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 12 }}>
              <button type="submit" className="merchant-btn merchant-btn-primary" disabled={saving}>
                <span className="material-symbols-outlined">{saving ? "progress_activity" : editingId ? "save" : "add"}</span>
                {saving ? "Saving…" : editingId ? "Update" : "Add"} Item
              </button>
              <button type="button" className="merchant-btn merchant-btn-secondary" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="merchant-list">
        {itemsByCategory.map(({ category, items }) => (
          <div key={category} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span className="tk-badge" style={{ background: "var(--primary-fixed)", color: "var(--on-primary-fixed)", border: "2px solid var(--outline)" }}>
                {category}
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>
                {items.length} item{items.length !== 1 ? "s" : ""}
              </span>
            </div>
            {items.map((item) => (
              <div key={item.id} className="merchant-list-item">
                <div className="merchant-list-item-info">
                  <div className="merchant-list-item-title">{item.name}</div>
                  <div className="merchant-list-item-meta">
                    {formatCents(item.priceCents)} • {item.description || "No description"}
                  </div>
                </div>
                <div className="merchant-list-item-actions">
                  <button
                    className="status-badge"
                    style={{
                      background: item.isAvailable ? "var(--mint)" : "var(--error-container)",
                      color: item.isAvailable ? "var(--ink)" : "var(--error)",
                      cursor: "pointer",
                      border: "none",
                    }}
                    onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
                  >
                    {item.isAvailable ? "On" : "Off"}
                  </button>
                  <button className="merchant-btn merchant-btn-sm merchant-btn-secondary" onClick={() => startEdit(item)}>
                    <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>edit</span>
                  </button>
                  <button className="merchant-btn merchant-btn-sm merchant-btn-danger" onClick={() => handleDelete(item.id)}>
                    <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
