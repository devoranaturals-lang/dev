"use client";

import { useEffect, useState } from "react";
import { getCategories, addCategory, updateCategory, deleteCategory, getProducts } from "../../../lib/supabase";
import { FolderTree, Plus, Trash2, Edit2, X, RefreshCw, Layers, Check } from "lucide-react";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
  });

  const loadData = async () => {
    setLoading(true);
    const [cats, prods] = await Promise.all([getCategories(), getProducts()]);
    setCategories(cats || []);
    setProducts(prods || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditItem(null);
    setForm({ name: "", slug: "", description: "" });
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditItem(cat);
    setForm({
      name: cat.name || "",
      slug: cat.slug || "",
      description: cat.description || "",
    });
    setModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Category name is required.");
      return;
    }

    try {
      setSaving(true);
      const generatedSlug = form.slug.trim() || form.name.trim().toLowerCase().replace(/\s+/g, "-");
      const payload = {
        name: form.name.trim(),
        slug: generatedSlug,
        description: form.description.trim(),
      };

      if (editItem) {
        await updateCategory(editItem.id, payload);
        setSuccessMsg(`Category "${payload.name}" updated successfully!`);
      } else {
        await addCategory(payload);
        setSuccessMsg(`Category "${payload.name}" created successfully!`);
      }

      setForm({ name: "", slug: "", description: "" });
      setModalOpen(false);
      setTimeout(() => setSuccessMsg(""), 3000);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to save category: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (confirm(`Are you sure you want to delete category "${name}"?`)) {
      try {
        await deleteCategory(id);
        setSuccessMsg(`Category "${name}" deleted.`);
        setTimeout(() => setSuccessMsg(""), 3000);
        await loadData();
      } catch (err) {
        console.error(err);
        alert("Failed to delete category.");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Category Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, edit, and organize product categories dynamically for storefront navigation and filtering
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-5 py-2.5 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Category List Cards */}
      {loading ? (
        <div className="p-12 text-center flex flex-col items-center space-y-2">
          <RefreshCw className="w-6 h-6 text-brand-700 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <FolderTree className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No categories created yet.</p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-brand-800 text-white text-xs font-bold rounded-xl"
          >
            Add First Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => {
            const productCount = products.filter(
              (p) => p.category?.toLowerCase() === cat.name.toLowerCase()
            ).length;

            return (
              <div
                key={cat.id || cat.name}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-brand-50 text-brand-800 rounded-2xl">
                      <Layers className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
                      {productCount} {productCount === 1 ? "Product" : "Products"}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{cat.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {cat.description || "No category description provided."}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400">slug: {cat.slug}</p>
                </div>

                {/* Actions: Edit & Delete */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"
                    title="Edit Category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editItem ? "Edit Category" : "Add New Category"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Essential Oils"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL Slug (Optional)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="e.g. essential-oils (auto-generated if empty)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the category range and benefits..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-brand-800 hover:bg-brand-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all"
                >
                  {saving ? "Saving..." : editItem ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
