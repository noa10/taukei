"use client";

import { useState, useRef } from "react";
import { ImageOff, Pencil, Trash2, Power } from "lucide-react";
import { saveCatalogItem, deleteCatalogItemAction, toggleCatalogItemAvailability } from "./actions";
import type { CatalogItem } from "../../../lib/merchant-types";
import { uploadMenuItemImage, getMenuItemImageUrl, deleteMenuItemImage } from "../../../lib/supabase/storage";

function formatCents(cents: number): string {
  return `RM ${(cents / 100).toFixed(2)}`;
}

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase();
}

function getColorForString(str: string): string {
  const colors = [
    "#b52330", "#006d37", "#1e3a8a", "#7c3aed", "#c2410c",
    "#047857", "#be123c", "#4338ca", "#0f766e", "#a21caf",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface CatalogEditorProps {
  initialItems: CatalogItem[];
  initialCategories: string[];
}

export default function CatalogEditor({ initialItems, initialCategories }: CatalogEditorProps) {
  const [items, setItems] = useState<CatalogItem[]>(initialItems);
  const [categories] = useState<string[]>(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const emptyForm = {
    name: "",
    priceCents: 0,
    isAvailable: true,
    categoryName: "",
    description: "",
    imageUrl: "",
  };
  const [form, setForm] = useState(emptyForm);

  const refresh = () => {
    window.location.reload();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : type === "number" ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);

    try {
      const fileName = `${crypto.randomUUID()}-${file.name}`;
      const uploadedPath = await uploadMenuItemImage(file, fileName);
      if (!uploadedPath) {
        setError("Image upload failed. Please try again.");
        return;
      }
      setForm((prev) => ({ ...prev, imageUrl: uploadedPath }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClearImage = async () => {
    if (form.imageUrl) {
      await deleteMenuItemImage(form.imageUrl);
    }
    setForm((prev) => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) return "Item name is required.";
    if (form.priceCents <= 0) return "Price must be greater than 0.";
    if (!form.categoryName.trim()) return "Category is required.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setSaving(true);
    setError(null);

    try {
      const result = await saveCatalogItem({
        itemId: editingId || crypto.randomUUID(),
        name: form.name.trim(),
        priceCents: form.priceCents,
        isAvailable: form.isAvailable,
        categoryName: form.categoryName.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim() || undefined,
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
      imageUrl: item.imageUrl || "",
    });
    setEditingId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const uncategorized = items.filter((item) => !item.categoryName || item.categoryName === "Uncategorized");
  if (uncategorized.length > 0 && !categories.includes("Uncategorized")) {
    itemsByCategory.push({ category: "Uncategorized", items: uncategorized });
  }

  const previewUrl = form.imageUrl ? getMenuItemImageUrl(form.imageUrl) : "";

  // Image component with fallback
  const MenuItemImage = ({ item, size = 48 }: { item: CatalogItem; size?: number }) => {
    const [imgError, setImgError] = useState(false);
    const resolvedUrl = item.imageUrl ? getMenuItemImageUrl(item.imageUrl) : "";
    const initial = getInitials(item.name);
    const bgColor = getColorForString(item.name);

    if (!resolvedUrl || imgError) {
      return (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: 8,
            background: bgColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "2px solid var(--outline)",
            color: "#fff",
            fontWeight: 700,
            fontSize: size > 40 ? "1.2rem" : "0.9rem",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {initial}
        </div>
      );
    }

    return (
      <img
        src={resolvedUrl}
        alt={item.name}
        width={size}
        height={size}
        style={{ borderRadius: 8, objectFit: "cover", flexShrink: 0, border: "2px solid var(--outline)" }}
        onError={() => setImgError(true)}
      />
    );
  };

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
                <input name="priceCents" type="number" min={1} className="merchant-form-input" value={form.priceCents || ""} onChange={handleChange} required placeholder="e.g., 1650" />
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

            <div className="merchant-form-group">
              <label className="merchant-form-label">Image</label>
              {previewUrl ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ position: "relative", width: 120, height: 120, borderRadius: 8, overflow: "hidden", border: "1px solid var(--outline)" }}>
                    <img
                      src={previewUrl}
                      alt="Preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="merchant-btn merchant-btn-sm merchant-btn-danger"
                    onClick={handleClearImage}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>close</span>
                    Remove
                  </button>
                </div>
              ) : (
                <div style={{ marginBottom: 8 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="merchant-form-input"
                  />
                  {uploadingImage && (
                    <p className="merchant-form-hint" style={{ marginTop: 4 }}>Uploading image...</p>
                  )}
                </div>
              )}
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
              <button type="submit" className="merchant-btn merchant-btn-primary" disabled={saving || uploadingImage}>
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
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, minWidth: 0 }}>
                  <MenuItemImage item={item} size={48} />
                  <div className="merchant-list-item-info" style={{ minWidth: 0 }}>
                    <div className="merchant-list-item-title">{item.name}</div>
                    <div className="merchant-list-item-meta">
                      {formatCents(item.priceCents)} • {item.description || "No description"}
                    </div>
                  </div>
                </div>
                <div className="merchant-list-item-actions" style={{ flexShrink: 0 }}>
                  <button
                    className="status-badge"
                    style={{
                      background: item.isAvailable ? "var(--mint)" : "var(--error-container)",
                      color: item.isAvailable ? "var(--ink)" : "var(--error)",
                      cursor: "pointer",
                      border: "none",
                    }}
                    onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
                    title={item.isAvailable ? "Available - click to disable" : "Unavailable - click to enable"}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>
                      {item.isAvailable ? "power" : "power_off"}
                    </span>
                    <span className="desktop-only">{item.isAvailable ? "On" : "Off"}</span>
                  </button>
                  <button
                    className="merchant-btn merchant-btn-sm merchant-btn-secondary btn-icon-only"
                    onClick={() => startEdit(item)}
                    title="Edit item"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="merchant-btn merchant-btn-sm merchant-btn-danger btn-icon-only"
                    onClick={() => handleDelete(item.id)}
                    title="Delete item"
                  >
                    <Trash2 size={16} />
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
