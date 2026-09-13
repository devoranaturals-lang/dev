"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getProducts, getCategories } from "../../lib/supabase";
import ProductCard from "../../components/ProductCard";
import { Search, SlidersHorizontal, RefreshCw } from "lucide-react";

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "All";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prods || []);
      setCategories(cats || []);
      setLoading(false);
    }
    loadData();

    const handleLiveUpdate = () => {
      loadData();
    };

    const handleStorageChange = (e) => {
      if (
        e.key === "devora_mock_products_v1" ||
        e.key === "devora_products_sync_ping" ||
        e.key === "devora_mock_categories_v1" ||
        e.key === "devora_categories_sync_ping" ||
        e.key === "devora_mock_offers_v1" ||
        e.key === "devora_offers_sync_ping"
      ) {
        loadData();
      }
    };

    window.addEventListener("devora_products_updated", handleLiveUpdate);
    window.addEventListener("devora_categories_updated", handleLiveUpdate);
    window.addEventListener("devora_offers_updated", handleLiveUpdate);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("devora_products_updated", handleLiveUpdate);
      window.removeEventListener("devora_categories_updated", handleLiveUpdate);
      window.removeEventListener("devora_offers_updated", handleLiveUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setSelectedCategory(cat);
  }, [searchParams]);

  const activeProducts = products.filter(p => p.is_active !== false);

  let filtered = activeProducts.filter((product) => {
    const matchesCategory =
      selectedCategory === "All" ||
      product.category?.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (sortBy === "price-low") {
    filtered.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sortBy === "price-high") {
    filtered.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sortBy === "rating") {
    filtered.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <h1 className="sr-only">All Devora Products</h1>

      {/* Controls: Search, Category Pills & Sort */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search */}
          <div className="relative md:col-span-8">
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="md:col-span-4 flex items-center justify-end gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="default">Sort by: Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* Dynamic Category Switcher */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setSelectedCategory("All")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === "All"
                ? "bg-brand-800 text-white shadow-md"
                : "bg-slate-100 text-slate-600 hover:bg-emerald-50"
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id || cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedCategory.toLowerCase() === cat.name.toLowerCase()
                  ? "bg-brand-800 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-emerald-50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-brand-700 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Fetching products...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
          <p className="text-lg font-bold text-slate-700">No matching products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-8">
          {filtered.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading catalog...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
