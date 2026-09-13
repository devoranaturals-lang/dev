"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProducts, getCategories, getStorefrontSettings } from "../lib/supabase";
import { DEFAULT_STOREFRONT_SETTINGS } from "../lib/initialData";
import ProductCard from "../components/ProductCard";
import {
  Search,
  Sparkles,
  ShieldCheck,
  Truck,
  HeartHandshake,
  Leaf,
  ArrowRight,
  RefreshCw,
  Award,
  Star,
  Gift,
  Percent,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Check,
  Flame,
  HelpCircle,
} from "lucide-react";

const ICON_MAP = {
  Leaf,
  ShieldCheck,
  HeartHandshake,
  Truck,
  Sparkles,
  Award,
  Star,
  Gift,
  Percent,
};

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [storefront, setStorefront] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openFaqId, setOpenFaqId] = useState(null);
  const [heroCardIdx, setHeroCardIdx] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [prods, cats, sf] = await Promise.all([
          getProducts(),
          getCategories(),
          getStorefrontSettings(),
        ]);
        setProducts(prods || []);
        setCategories(cats || []);
        setStorefront(sf || null);
        if (sf?.faqs && sf.faqs.length > 0) {
          setOpenFaqId(sf.faqs[0].id);
        }
      } catch (err) {
        console.error("Failed to load storefront data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    // Listen for live storefront, products, and categories updates from admin
    const handleStorefrontUpdate = (e) => {
      if (e?.detail) {
        setStorefront(e.detail);
      } else {
        getStorefrontSettings().then((sf) => setStorefront(sf));
      }
    };

    const handleProductsUpdate = (e) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setProducts(e.detail);
      } else {
        getProducts().then((p) => setProducts(p || []));
      }
    };

    const handleCategoriesUpdate = (e) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setCategories(e.detail);
      } else {
        getCategories().then((c) => setCategories(c || []));
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === "devora_mock_storefront_v2" || e.key === "devora_storefront_sync_ping") {
        getStorefrontSettings().then((sf) => setStorefront(sf));
      }
      if (e.key === "devora_mock_products_v1" || e.key === "devora_products_sync_ping") {
        getProducts().then((p) => setProducts(p || []));
      }
      if (e.key === "devora_mock_categories_v1" || e.key === "devora_categories_sync_ping") {
        getCategories().then((c) => setCategories(c || []));
      }
    };

    window.addEventListener("devora_storefront_updated", handleStorefrontUpdate);
    window.addEventListener("devora_settings_updated", handleStorefrontUpdate);
    window.addEventListener("devora_products_updated", handleProductsUpdate);
    window.addEventListener("devora_categories_updated", handleCategoriesUpdate);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("devora_storefront_updated", handleStorefrontUpdate);
      window.removeEventListener("devora_settings_updated", handleStorefrontUpdate);
      window.removeEventListener("devora_products_updated", handleProductsUpdate);
      window.removeEventListener("devora_categories_updated", handleCategoriesUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);


  // Hero Spotlight Cards handling (Multi-card showcase)
  const isDemoCard = (card) => {
    if (!card) return false;
    const link = String(card.link || "").toLowerCase();
    const id = String(card.id || "").toLowerCase();
    return (
      id === "card-demo-1" ||
      id === "card-demo-2" ||
      id === "card-demo-3" ||
      link.includes("prod-1") ||
      link.includes("prod-2") ||
      link.includes("prod-3")
    );
  };

  const activeHeroCards = (storefront?.hero_cards || []).filter(
    (c) => c.is_active !== false && !isDemoCard(c)
  );
  const displayHeroCards = activeHeroCards;

  useEffect(() => {
    if (displayHeroCards.length <= 1) return;
    const heroTimer = setInterval(() => {
      setHeroCardIdx((prev) => (prev + 1) % displayHeroCards.length);
    }, 5500);
    return () => clearInterval(heroTimer);
  }, [displayHeroCards.length]);

  const currentHeroCard = displayHeroCards[heroCardIdx] || displayHeroCards[0];

  const activeProducts = products.filter((p) => p && p.is_active !== false);

  const filteredProducts = activeProducts.filter((product) => {
    if (!product) return false;
    const matchesCategory =
      selectedCategory === "All" ||
      (product.category || "").toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      (product.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeValueProps = (
    Array.isArray(storefront?.value_props)
      ? storefront.value_props
      : DEFAULT_STOREFRONT_SETTINGS.value_props
  ).filter((vp) => vp.is_active !== false);

  const isDemoPromo = (p) => {
    if (!p) return false;
    const title = (p.title || "").toLowerCase();
    return (
      title.includes("ayurvedic hair vitalizer") ||
      title.includes("sambrani dhoop") ||
      title.includes("pooja & sambrani")
    );
  };

  const activePromos = (
    Array.isArray(storefront?.promos_list)
      ? storefront.promos_list
      : (DEFAULT_STOREFRONT_SETTINGS.promos_list || [])
  ).filter((p) => p.is_active !== false && !isDemoPromo(p));

  const activeTestimonials = (
    Array.isArray(storefront?.testimonials)
      ? storefront.testimonials
      : DEFAULT_STOREFRONT_SETTINGS.testimonials
  ).filter((t) => t.is_active !== false);

  const activeFaqs = (
    Array.isArray(storefront?.faqs)
      ? storefront.faqs
      : DEFAULT_STOREFRONT_SETTINGS.faqs
  ).filter((f) => f.is_active !== false);

  return (
    <div className="space-y-16 pb-20">
      {/* 2. HERO SECTION */}
      <section
        className="relative overflow-hidden text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8"
        style={
          storefront?.hero_banner_image
            ? {
                backgroundImage: `linear-gradient(to right, rgba(6, 78, 59, 0.8), rgba(6, 95, 70, 0.4)), url(${storefront.hero_banner_image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : storefront?.hero_gradient_enabled === false
            ? {
                backgroundColor: storefront.heroBgGradientStart || "#064e3b"
              }
            : storefront
            ? {
                background: `linear-gradient(to bottom, ${storefront.heroBgGradientStart || "#064e3b"}, ${
                  storefront.heroBgGradientEnd || "#065f46"
                })`,
              }
            : { background: `linear-gradient(to bottom, #064e3b, #065f46)` }
        }
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#86efac_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div
            className={
              storefront?.bestsellerEnabled === false || displayHeroCards.length === 0
                ? "lg:col-span-12 space-y-6 text-center"
                : "lg:col-span-7 space-y-6 text-center lg:text-left"
            }
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-700/60 border border-brand-500/40 text-brand-200 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-earth-300" />
              <span>{storefront?.hero_badge || "Pure Organic & Ayurvedic Wellness"}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight whitespace-pre-wrap">
              {storefront?.heroHeading || (
                <>
                  Natural Care For Your <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-earth-200 via-amber-200 to-emerald-200 bg-clip-text text-transparent">
                    Skin, Hair & Soul
                  </span>
                </>
              )}
            </h1>

            <p
              className={`text-base sm:text-lg text-brand-100 leading-relaxed font-light ${
                storefront?.bestsellerEnabled === false || displayHeroCards.length === 0 ? "max-w-3xl mx-auto" : "max-w-2xl mx-auto lg:mx-0"
              }`}
            >
              {storefront?.heroDescription ||
                "Elevate your daily self-care ritual with handcrafted Kumkumadi oils, wild-harvested Bhringraj scalp tonics, and sacred organic Sambrani dhoop."}
            </p>

            <div
              className={`flex flex-wrap items-center gap-4 pt-2 ${
                storefront?.bestsellerEnabled === false || displayHeroCards.length === 0
                  ? "justify-center"
                  : "justify-center lg:justify-start"
              }`}
            >
              <a
                href={storefront?.hero_primary_btn_link || "#products-section"}
                className="px-8 py-4 bg-earth-600 hover:bg-earth-700 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-earth-600/30 flex items-center gap-2 text-base cursor-pointer"
              >
                <span>{storefront?.hero_primary_btn_text || "Explore Catalog"}</span>
                <ArrowRight className="w-5 h-5" />
              </a>

              <Link
                href={storefront?.hero_secondary_btn_link || "/about"}
                className="px-8 py-4 bg-brand-800/80 hover:bg-brand-800 text-brand-100 font-semibold rounded-2xl transition-colors border border-brand-700 text-base"
              >
                {storefront?.hero_secondary_btn_text || "Our Botanical Story"}
              </Link>
            </div>
          </div>

          {storefront?.bestsellerEnabled !== false && displayHeroCards.length > 0 && currentHeroCard && (
            <div className="lg:col-span-5 relative flex flex-col items-center">
              {/* Spotlight Card */}
              <div className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-brand-700/50 group bg-slate-900">
                <img
                  src={
                    currentHeroCard.image_url ||
                    "https://images.unsplash.com/photo-1608248597263-00079e96047c?auto=format&fit=crop&w=800&q=80"
                  }
                  alt={currentHeroCard.title || "Featured Product"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/20 to-transparent"></div>

                {/* Top Badges */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                  <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-[11px] font-extrabold text-amber-300 border border-amber-400/30 uppercase tracking-wider shadow-sm">
                    {currentHeroCard.badge || "Bestseller"}
                  </span>
                  {currentHeroCard.price && (
                    <span className="px-3 py-1 rounded-full bg-emerald-700/90 backdrop-blur-md text-white font-black text-xs shadow-md border border-emerald-500/30">
                      {currentHeroCard.price}
                    </span>
                  )}
                </div>

                {/* Arrow navigation if multiple cards */}
                {displayHeroCards.length > 1 && (
                  <div className="absolute inset-y-0 left-2 right-2 flex items-center justify-between pointer-events-none">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHeroCardIdx((prev) => (prev - 1 + displayHeroCards.length) % displayHeroCards.length);
                      }}
                      className="p-2 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-md pointer-events-auto transition-colors cursor-pointer border border-white/20 hover:scale-105 shadow-md"
                      title="Previous spotlight product"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHeroCardIdx((prev) => (prev + 1) % displayHeroCards.length);
                      }}
                      className="p-2 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-md pointer-events-auto transition-colors cursor-pointer border border-white/20 hover:scale-105 shadow-md"
                      title="Next spotlight product"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Bottom Card Info & Action */}
                <div className="absolute bottom-4 left-4 right-4 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-earth-300 uppercase tracking-widest truncate">
                        {currentHeroCard.subtitle || "Spotlight Collection"}
                      </p>
                      <p className="text-base font-extrabold mt-0.5 truncate text-white">
                        {currentHeroCard.title}
                      </p>
                    </div>

                    <a
                      href={currentHeroCard.link || "#products-section"}
                      className="shrink-0 px-3.5 py-1.5 bg-earth-600 hover:bg-earth-500 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center gap-1"
                    >
                      <span>Explore</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Dots Indicator if multiple cards */}
              {displayHeroCards.length > 1 && (
                <div className="flex items-center gap-1.5 mt-4">
                  {displayHeroCards.map((card, i) => (
                    <button
                      key={card.id || i}
                      type="button"
                      onClick={() => setHeroCardIdx(i)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        i === (heroCardIdx % displayHeroCards.length)
                          ? "w-7 bg-amber-400"
                          : "w-2 bg-white/40 hover:bg-white/70"
                      }`}
                      title={card.title}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 3. VALUE PROPOSITIONS / TRUST PILLARS BANNER */}
      {storefront?.value_props_enabled !== false && activeValueProps.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {activeValueProps.map((vp) => {
              const IconComp = ICON_MAP[vp.icon] || Leaf;
              return (
                <div key={vp.id} className="flex items-center gap-4 p-3 rounded-2xl bg-emerald-50/50">
                  <div className="p-3 bg-brand-800 text-brand-100 rounded-xl shrink-0 shadow-xs">
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">{vp.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1">{vp.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. SECONDARY PROMO BANNER */}
      {storefront?.promoBannerEnabled !== false && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-8">
          <div className="relative w-full aspect-[21/9] md:aspect-[24/7] rounded-3xl overflow-hidden shadow-xl group">
            <img
              src={
                storefront?.promoBannerImage ||
                DEFAULT_STOREFRONT_SETTINGS.promoBannerImage
              }
              alt="Promo Banner"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-900/90 via-brand-900/60 to-transparent"></div>
            <div className="absolute inset-y-0 left-0 p-8 sm:p-12 md:p-16 flex flex-col justify-center text-white max-w-2xl">
              <span className="text-xs sm:text-sm font-bold text-earth-300 uppercase tracking-widest mb-2 sm:mb-4">
                {storefront?.promoBannerSubtitle || DEFAULT_STOREFRONT_SETTINGS.promoBannerSubtitle}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-6">
                {storefront?.promoBannerTitle || DEFAULT_STOREFRONT_SETTINGS.promoBannerTitle}
              </h2>
              <a
                href={storefront?.promoBannerLink || DEFAULT_STOREFRONT_SETTINGS.promoBannerLink}
                className="inline-flex w-fit items-center gap-2 px-6 py-3 bg-earth-600 hover:bg-earth-700 text-white font-bold rounded-xl transition-colors shadow-lg cursor-pointer"
              >
                <span>{storefront?.promoBannerBtnText || DEFAULT_STOREFRONT_SETTINGS.promoBannerBtnText}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 5. SEASONAL OFFER DEALS GRID */}
      {activePromos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activePromos.map((deal) => (
              <div
                key={deal.id}
                className="relative rounded-3xl overflow-hidden shadow-md border border-slate-100 group flex flex-col justify-end p-8 min-h-[260px] bg-slate-900 text-white"
              >
                {deal.image_url && (
                  <img
                    src={deal.image_url}
                    alt={deal.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent"></div>
                <div className="relative z-10 space-y-2 max-w-md">
                  <span className="inline-block px-3 py-1 bg-amber-500 text-slate-950 font-black text-[11px] rounded-full uppercase tracking-wider">
                    {deal.badge || "Special Deal"}
                  </span>
                  <h3 className="text-2xl font-black">{deal.title}</h3>
                  <p className="text-xs text-slate-300 line-clamp-2">{deal.subtitle}</p>
                  <div className="pt-2">
                    <a
                      href={deal.link || "#products-section"}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-slate-900 font-bold text-xs rounded-xl hover:bg-brand-100 transition-colors cursor-pointer"
                    >
                      <span>{deal.button_text || "Explore Offer"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. PRODUCTS STOREFRONT CATALOG */}
      <section id="products-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pt-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-brand-700">
              Catalog Collection
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-1">Our Natural Products</h2>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search products, ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm"
            />
          </div>
        </div>

        {/* Dynamic Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCategory("All")}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer ${
              selectedCategory === "All"
                ? "bg-brand-900 text-white shadow-brand-900/20"
                : "bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200"
            }`}
          >
            All Products ({activeProducts.length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id || cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer ${
                selectedCategory.toLowerCase() === cat.name.toLowerCase()
                  ? "bg-brand-900 text-white shadow-brand-900/20"
                  : "bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-brand-700 animate-spin" />
            <p className="text-sm font-medium text-slate-500">Loading organic catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 space-y-4 max-w-xl mx-auto shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-brand-700 flex items-center justify-center mx-auto mb-2">
              <Leaf className="w-7 h-7" />
            </div>
            <p className="text-xl font-bold text-slate-800">
              {products.length === 0 ? "New Collection Coming Soon" : "No products found"}
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {products.length === 0
                ? "Our pure organic botanical products are being crafted with fresh harvest. Please check back shortly!"
                : "No products matched your search or category filter. Try clearing filters to see all items."}
            </p>
            {products.length > 0 && (
              <button
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                }}
                className="px-6 py-2.5 bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 7. BRAND SPOTLIGHT / WHY CHOOSE DEVORA */}
      {storefront?.spotlight_enabled !== false && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-brand-900 via-brand-950 to-slate-900 rounded-3xl p-8 sm:p-12 lg:p-16 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-800/80 border border-brand-700 text-earth-300 text-xs font-bold">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>{storefront?.spotlight_badge || DEFAULT_STOREFRONT_SETTINGS.spotlight_badge}</span>
                </span>

                <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">
                  {storefront?.spotlight_title || DEFAULT_STOREFRONT_SETTINGS.spotlight_title}
                </h2>

                <p className="text-brand-100 text-sm sm:text-base leading-relaxed font-light">
                  {storefront?.spotlight_description || DEFAULT_STOREFRONT_SETTINGS.spotlight_description}
                </p>

                {/* 4 Stats counters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-brand-800">
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-amber-300">
                      {storefront?.spotlight_stat_1_val || DEFAULT_STOREFRONT_SETTINGS.spotlight_stat_1_val}
                    </p>
                    <p className="text-xs text-brand-200 mt-0.5">
                      {storefront?.spotlight_stat_1_lbl || DEFAULT_STOREFRONT_SETTINGS.spotlight_stat_1_lbl}
                    </p>
                  </div>

                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-400">
                      {storefront?.spotlight_stat_2_val || DEFAULT_STOREFRONT_SETTINGS.spotlight_stat_2_val}
                    </p>
                    <p className="text-xs text-brand-200 mt-0.5">
                      {storefront?.spotlight_stat_2_lbl || DEFAULT_STOREFRONT_SETTINGS.spotlight_stat_2_lbl}
                    </p>
                  </div>

                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-earth-300">
                      {storefront?.spotlight_stat_3_val || DEFAULT_STOREFRONT_SETTINGS.spotlight_stat_3_val}
                    </p>
                    <p className="text-xs text-brand-200 mt-0.5">
                      {storefront?.spotlight_stat_3_lbl || DEFAULT_STOREFRONT_SETTINGS.spotlight_stat_3_lbl}
                    </p>
                  </div>

                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-amber-400">
                      {storefront?.spotlight_stat_4_val || DEFAULT_STOREFRONT_SETTINGS.spotlight_stat_4_val}
                    </p>
                    <p className="text-xs text-brand-200 mt-0.5">
                      {storefront?.spotlight_stat_4_lbl || DEFAULT_STOREFRONT_SETTINGS.spotlight_stat_4_lbl}
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 flex justify-center">
                <div className="relative w-full max-w-sm aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-brand-700/60">
                  <img
                    src={
                      storefront?.spotlight_image || DEFAULT_STOREFRONT_SETTINGS.spotlight_image
                    }
                    alt={storefront?.spotlight_title || "Botanical Extraction"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-950/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-6 left-6 right-6 p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white text-xs">
                    <p className="font-bold">Traditional Taila-Paka Method</p>
                    <p className="text-[10px] text-brand-200 mt-0.5">Slow-cooked over natural wood fire in Kerala</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 8. CUSTOMER TESTIMONIALS & REVIEWS */}
      {storefront?.testimonials_enabled !== false && activeTestimonials.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-700">
              Community Love
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900">
              {storefront?.testimonials_title || "Loved by Thousands of Natural Beauty Enthusiasts"}
            </h2>
            <p className="text-xs text-slate-500">
              {storefront?.testimonials_subtitle ||
                "Read authentic experiences from genuine buyers across India"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeTestimonials.map((t) => (
              <div
                key={t.id}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-amber-400">
                      {[...Array(t.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    {t.is_verified && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Verified Buyer</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed italic">"{t.comment}"</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {t.image_url ? (
                      <img
                        src={t.image_url}
                        alt={t.customer_name}
                        className="w-9 h-9 rounded-full object-cover border-2 border-brand-100 shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-800 font-extrabold text-xs flex items-center justify-center shrink-0 border border-brand-200">
                        {(t.customer_name || "C").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-xs truncate">{t.customer_name}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{t.location}</p>
                    </div>
                  </div>
                  {t.product_name && (
                    <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-1 rounded-lg line-clamp-1 max-w-[130px] shrink-0">
                      {t.product_name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 9. FREQUENTLY ASKED QUESTIONS (FAQS) ACCORDION */}
      {storefront?.faqs_enabled !== false && activeFaqs.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-700 flex items-center justify-center gap-1.5">
              <HelpCircle className="w-4 h-4" />
              <span>Questions & Answers</span>
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900">
              {storefront?.faqs_title || "Frequently Asked Questions"}
            </h2>
            <p className="text-xs text-slate-500">
              {storefront?.faqs_subtitle ||
                "Clear answers about our organic sourcing, usage, and policies"}
            </p>
          </div>

          <div className="space-y-3">
            {activeFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 hover:text-brand-800 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span>{faq.question}</span>
                    </span>
                    <span className="p-1 rounded-lg bg-slate-100 text-slate-600 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50 animate-fadeIn">
                      <p>{faq.answer}</p>
                      {faq.category && (
                        <div className="mt-2.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            Topic: {faq.category}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
