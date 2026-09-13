"use client";

import { useEffect, useState } from "react";
import { getProducts, addProduct, updateProduct, deleteProduct, getCategories, addCategory, clearAllProducts } from "../../../lib/supabase";
import { Plus, Edit2, Trash2, Search, X, Package, Check, RefreshCw, ShieldCheck, RotateCcw } from "lucide-react";

// Client-side image compression utility to prevent local storage quota crashes and payload errors
function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export default function AdminProductsPage() {
  // Initialize immediately from local cache so navigation is 0ms instant
  const [products, setProducts] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("devora_mock_products_v1");
        if (stored) return JSON.parse(stored);
      } catch (_) {}
    }
    return [];
  });
  const [categories, setCategories] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("devora_mock_categories_v1");
        if (stored) return JSON.parse(stored);
      } catch (_) {}
    }
    return [];
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");

  const [form, setForm] = useState({
    name: "",
    price: "",
    actual_price: "",
    category: "",
    description: "",
    image_url: "",
    stock: "50",
    rating: "4.8",
    is_featured: false,
    is_active: true,
    is_returnable: true,
    return_period_days: 7,
  });

  const loadData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setIsRefreshing(true);
    try {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      if (prods) setProducts(prods);
      if (cats) setCategories(cats);
    } catch (e) {
      console.warn("loadData error in admin products:", e);
    } finally {
      if (showLoading) setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // If no initial cached products, show quick loader while fetching
    if (products.length === 0 && categories.length === 0) {
      loadData(true);
    } else {
      loadData(false);
    }

    const handleProductsUpdated = () => {
      loadData(false);
    };
    const handleStorage = (e) => {
      if (e.key === "devora_mock_products_v1" || e.key === "devora_products_sync_ping") {
        loadData(false);
      }
    };
    window.addEventListener("devora_products_updated", handleProductsUpdated);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("devora_products_updated", handleProductsUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const openAddModal = () => {
    setEditItem(null);
    setIsCustomCategory(false);
    setCustomCategoryName("");
    const defaultCat = categories[0]?.name || "Skin Care";
    setForm({
      name: "",
      price: "",
      actual_price: "",
      category: defaultCat,
      description: "",
      image_url: "",
      stock: "50",
      rating: "4.8",
      is_featured: false,
      is_active: true,
      is_returnable: true,
      return_period_days: 7,
    });
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditItem(product);
    setIsCustomCategory(false);
    setCustomCategoryName("");
    setForm({
      name: product.name,
      price: product.price,
      actual_price: product.actual_price || "",
      category: product.category || categories[0]?.name || "Skin Care",
      description: product.description || "",
      image_url: product.image_url || "",
      stock: product.stock || 50,
      rating: product.rating || 4.8,
      is_featured: Boolean(product.is_featured),
      is_active: product.is_active !== undefined ? Boolean(product.is_active) : true,
      is_returnable: product.is_returnable !== undefined ? Boolean(product.is_returnable) : true,
      return_period_days: product.return_period_days || 7,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const resolvedCategory = isCustomCategory && customCategoryName.trim()
      ? customCategoryName.trim()
      : (form.category || "Skin Care");

    if (!form.name || !form.price || !resolvedCategory) {
      alert("Product Name, Price, and Category are required.");
      return;
    }

    try {
      // If user typed a custom category, create it in categories table automatically
      if (isCustomCategory && customCategoryName.trim()) {
        const catName = customCategoryName.trim();
        if (!categories.some((c) => c.name.toLowerCase() === catName.toLowerCase())) {
          addCategory({ name: catName }).catch(() => {});
        }
      }

      const payload = {
        name: form.name.trim(),
        slug: form.name.trim().toLowerCase().replace(/\s+/g, "-"),
        price: Number(form.price),
        actual_price: Number(form.actual_price) || Number(form.price),
        category: resolvedCategory,
        description: form.description,
        image_url: form.image_url || "https://images.unsplash.com/photo-1608248597263-00079e96047c?auto=format&fit=crop&w=600&q=80",
        stock: Number(form.stock || 50),
        rating: Number(form.rating || 4.8),
        is_featured: Boolean(form.is_featured),
        is_active: Boolean(form.is_active),
        is_returnable: Boolean(form.is_returnable),
        return_period_days: form.is_returnable ? Number(form.return_period_days || 7) : 0,
      };

      // Optimistic close and update
      setModalOpen(false);

      let savedProd = null;
      if (editItem) {
        setProducts((prev) => prev.map((p) => String(p.id) === String(editItem.id) ? { ...p, ...payload } : p));
        savedProd = await updateProduct(editItem.id, payload);
      } else {
        const tempProd = { ...payload, id: `prod-${Date.now()}` };
        setProducts((prev) => [tempProd, ...prev]);
        savedProd = await addProduct(payload);
      }

      if (savedProd) {
        setProducts((prev) => [savedProd, ...prev.filter((p) => String(p.id) !== String(savedProd.id))]);
      }
      loadData(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save product: " + err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      setProducts((prev) => prev.filter((p) => String(p.id) !== String(id)));
      await deleteProduct(id);
      loadData(false);
    }
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all products from the store? The catalog will be empty on the customer site.")) {
      setProducts([]);
      await clearAllProducts();
      loadData(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!p) return false;
    const nameMatch = (p.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const catMatch = (p.category || "").toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || catMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Product Inventory</h1>
          <p className="text-xs text-slate-500 mt-1">Manage catalog listings, prices, and imagery</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleClearAll}
            className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-red-200 cursor-pointer"
            title="Remove all products from store"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Products</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-slate-200 cursor-pointer"
            title="Refresh products list from database"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-5 py-2.5 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
          />
        </div>

        <span className="text-xs font-bold text-slate-500">
          Showing {filteredProducts.length} of {products.length} Products
        </span>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center space-y-2">
            <RefreshCw className="w-6 h-6 text-brand-700 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading inventory...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-medium">
            No products match your search query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Product Details</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Selling Price</th>
                  <th className="p-4">Actual Price</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4 text-center">Return & Replace</th>
                  <th className="p-4 text-center">Active</th>
                  <th className="p-4 text-center">Featured</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <img
                        src={p.image_url || "https://images.unsplash.com/photo-1608248597263-00079e96047c?auto=format&fit=crop&w=100&q=80"}
                        alt={p.name}
                        className="w-12 h-12 object-cover rounded-xl border border-slate-200 flex-shrink-0"
                      />
                      <div>
                        <p className="font-bold text-slate-900 text-xs leading-snug">{p.name}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-1 max-w-xs">{p.description}</p>
                      </div>
                    </td>

                    <td className="p-4 font-semibold text-brand-700">
                      <span className="px-2.5 py-1 bg-brand-50 border border-brand-200 rounded-full">
                        {p.category}
                      </span>
                    </td>

                    <td className="p-4 font-black text-earth-700">
                      ₹{Number(p.price).toLocaleString("en-IN")}
                    </td>
                    
                    <td className="p-4 font-medium text-slate-400 line-through">
                      {p.actual_price ? `₹${Number(p.actual_price).toLocaleString("en-IN")}` : "-"}
                    </td>

                    <td className="p-4 font-medium text-slate-600">
                      {p.stock || 50} units
                    </td>

                    {/* Return & Replacement Quick Switch */}
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={async () => {
                          const newReturn = p.is_returnable === false ? true : false;
                          await updateProduct(p.id, { is_returnable: newReturn });
                          await loadData();
                        }}
                        title={p.is_returnable !== false ? "Return & Replacement is ON (Click to turn OFF)" : "Return & Replacement is OFF (Click to turn ON)"}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                          p.is_returnable !== false ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            p.is_returnable !== false ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span className="block text-[9px] font-bold text-slate-500 mt-0.5">
                        {p.is_returnable !== false ? `${p.return_period_days || 7}d Return` : "No Return"}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={async () => {
                          const newActive = !p.is_active;
                          await updateProduct(p.id, { is_active: newActive });
                          await loadData();
                        }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          p.is_active !== false ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          p.is_active !== false ? 'translate-x-5' : 'translate-x-1'
                        }`} />
                      </button>
                    </td>

                    <td className="p-4 text-center">
                      {p.is_featured ? (
                        <span className="inline-block p-1 bg-emerald-100 text-emerald-700 rounded-full">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Edit Product"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-6 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editItem ? "Edit Product" : "Add New Product"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Kumkumadi Saffron Glow Oil"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="389"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>
                
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Actual Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={form.actual_price}
                    onChange={(e) => setForm({ ...form, actual_price: e.target.value })}
                    placeholder="499"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Category *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(!isCustomCategory);
                        if (!isCustomCategory) setCustomCategoryName("");
                      }}
                      className="text-[10px] font-bold text-brand-700 hover:underline cursor-pointer"
                    >
                      {isCustomCategory ? "Choose from list" : "+ Type new"}
                    </button>
                  </div>
                  {isCustomCategory ? (
                    <input
                      type="text"
                      required
                      value={customCategoryName}
                      onChange={(e) => {
                        setCustomCategoryName(e.target.value);
                        setForm({ ...form, category: e.target.value });
                      }}
                      placeholder="e.g. Skin Care, Hair Care..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold"
                    />
                  ) : (
                    <select
                      value={form.category}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setIsCustomCategory(true);
                          setCustomCategoryName("");
                          setForm({ ...form, category: "" });
                        } else {
                          setForm({ ...form, category: e.target.value });
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold"
                    >
                      {categories.length === 0 ? (
                        <>
                          <option value="Skin Care">Skin Care</option>
                          <option value="Hair Care">Hair Care</option>
                          <option value="Pooja Items">Pooja Items</option>
                          <option value="__NEW__">+ Type Custom Category...</option>
                        </>
                      ) : (
                        <>
                          {categories.map((c) => (
                            <option key={c.id || c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                          <option value="__NEW__">+ Type Custom Category...</option>
                        </>
                      )}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Image (Upload JPG/PNG)</label>
                <div className="space-y-3">
                  {form.image_url && (
                    <div className="relative w-20 h-20">
                      <img 
                        src={form.image_url} 
                        alt="Preview" 
                        className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-sm"
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg, image/jpg, image/png, image/webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file);
                          setForm((prev) => ({ ...prev, image_url: compressed }));
                        } catch (err) {
                          console.warn("Image compression failed, using fallback:", err);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setForm((prev) => ({ ...prev, image_url: reader.result }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-100 file:text-brand-700 hover:file:bg-brand-200 cursor-pointer"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border-t border-slate-200"></div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">OR</span>
                    <div className="flex-1 border-t border-slate-200"></div>
                  </div>
                  <input
                    type="text"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="Enter image URL directly (https://...)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Key benefits and Ayurvedic ingredients..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>

              {/* Return & Replacement Option with Modern ON/OFF Switch */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl transition-colors ${
                      form.is_returnable ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                    }`}>
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <label
                        className="font-extrabold text-slate-900 text-xs block cursor-pointer"
                        onClick={() => setForm({ ...form, is_returnable: !form.is_returnable })}
                      >
                        Return & Replacement Option
                      </label>
                      <p className="text-[11px] text-slate-500">
                        {form.is_returnable
                          ? `Eligible for customer return & replacement (${form.return_period_days || 7} Days)`
                          : "Non-returnable item (consumable / herbal product)"}
                      </p>
                    </div>
                  </div>

                  {/* Modern ON/OFF Switch Button */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                      form.is_returnable ? "text-emerald-700 font-extrabold" : "text-slate-400"
                    }`}>
                      {form.is_returnable ? "ON" : "OFF"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, is_returnable: !form.is_returnable })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                        form.is_returnable ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                          form.is_returnable ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {form.is_returnable && (
                  <div className="pt-2.5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                    <div className="text-[11px] text-slate-600">
                      <span>Customer Return Window (Days from delivery):</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={form.return_period_days}
                        onChange={(e) => setForm({ ...form, return_period_days: e.target.value })}
                        className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-700"
                      />
                      <span className="text-xs font-bold text-slate-600">Days</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 text-brand-700 rounded border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="is_active" className="font-bold text-slate-700 cursor-pointer">
                    Product is Active (Visible to Customers)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_featured"
                    checked={form.is_featured}
                    onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                    className="w-4 h-4 text-brand-700 rounded border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="is_featured" className="font-bold text-slate-700 cursor-pointer">
                    Feature on Homepage
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-800 text-white font-bold rounded-xl shadow-md"
                >
                  {editItem ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
