"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProductById, getContactDetails, getOffers } from "../../../lib/supabase";
import { formatDiscountText } from "../../../lib/coupons";
import { DEFAULT_PRODUCTS, DEFAULT_SETTINGS } from "../../../lib/initialData";
import { useCart } from "../../../context/CartContext";
import {
  ShoppingBag,
  Star,
  Check,
  ArrowLeft,
  Shield,
  Leaf,
  Truck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  PackageCheck,
  Info,
  Clock,
  Sparkles,
  Tag,
  Copy,
  Gift,
} from "lucide-react";
import Link from "next/link";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState(() => {
    return DEFAULT_PRODUCTS.find((p) => p.id === id || p.slug === id) || null;
  });
  const [storeSettings, setStoreSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(() => {
    const found = DEFAULT_PRODUCTS.find((p) => p.id === id || p.slug === id);
    return !found;
  });
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState("returns"); // defaults to returns tab
  const [availableOffers, setAvailableOffers] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const [prodData, settingsData, offersData] = await Promise.all([
          getProductById(id),
          getContactDetails(),
          getOffers(),
        ]);
        if (prodData) setProduct(prodData);
        if (settingsData) setStoreSettings(settingsData);
        if (offersData) {
          const active = (offersData || []).filter(
            (o) => (o.isActive !== false && o.is_active !== false) && o.showProductPage !== false
          );
          setAvailableOffers(active);
        }
      } catch (err) {
        console.error("Error loading product details:", err);
      } finally {
        setLoading(false);
      }
    }
    load();

    const handleStorageChange = (e) => {
      if (
        e.key === "devora_mock_products_v1" ||
        e.key === "devora_products_sync_ping" ||
        e.key === "devora_mock_settings_v1" ||
        e.key === "devora_settings_sync_ping" ||
        e.key === "devora_storefront_updated" ||
        e.key === "devora_storefront_sync_ping" ||
        e.key === "devora_offers_sync_ping" ||
        e.key === "devora_deleted_offers"
      ) {
        load();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("devora_products_updated", load);
    window.addEventListener("devora_settings_updated", load);
    window.addEventListener("devora_storefront_updated", load);
    window.addEventListener("devora_offers_updated", load);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("devora_products_updated", load);
      window.removeEventListener("devora_settings_updated", load);
      window.removeEventListener("devora_storefront_updated", load);
      window.removeEventListener("devora_offers_updated", load);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-500 font-medium">Loading product details &amp; policy...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Product Not Found</h2>
        <p className="text-slate-500">The product you are looking for does not exist or has been removed.</p>
        <Link href="/products" className="inline-block px-6 py-2.5 bg-brand-800 text-white font-bold rounded-xl">
          Back to Products
        </Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = () => {
    addToCart(product, qty);
    router.push("/cart");
  };

  const handleCopyCoupon = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Evaluate storewide setting & product setting
  const isReturnActive = (storeSettings?.return_policy_enabled !== false) && (product.is_returnable !== false);
  const returnDays = product.return_period_days || storeSettings?.return_window_days || 7;
  const freeThreshold = Number(storeSettings?.free_shipping_threshold !== undefined ? storeSettings.free_shipping_threshold : 499);
  const standardShipping = Number(storeSettings?.standard_shipping_charge !== undefined ? storeSettings.standard_shipping_charge : 50);
  const whatsappNumber = storeSettings?.whatsapp || "8608540400";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Breadcrumb Back Link */}
      <Link href="/products" className="inline-flex items-center gap-2 text-xs font-bold text-brand-800 hover:text-brand-900 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Products</span>
      </Link>

      {/* Main Product Hero Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Product Image */}
        <div className="lg:col-span-6 relative aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
          <img
            src={product.image_url || "https://images.unsplash.com/photo-1608248597263-00079e96047c?auto=format&fit=crop&w=800&q=80"}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {product.category && (
            <div className="absolute top-4 left-4">
              <span className="bg-brand-900/90 text-brand-100 text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md shadow-sm border border-brand-700/50">
                {product.category}
              </span>
            </div>
          )}
        </div>

        {/* Right Column: Product Details & Purchase Actions */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              {product.name}
            </h1>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-3xl font-black text-earth-700">₹{Number(product.price).toLocaleString("en-IN")}</span>
              </div>
              
              {product.rating && (
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 w-fit">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{product.rating} / 5.0 Rating</span>
                </div>
              )}
            </div>

            <p className="text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4">
              {product.description}
            </p>

            {/* Return & Replacement Quick Highlight Card */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isReturnActive
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${isReturnActive ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-extrabold">
                      {isReturnActive ? `${returnDays}-Day Return & Replacement Guarantee` : "Non-Returnable Product"}
                    </h3>
                    {isReturnActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-md">
                        100% Doorstep Replacement
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isReturnActive
                      ? (storeSettings?.return_policy_text || `Received a damaged, defective or wrong item? Free replacement or return within ${returnDays} days of delivery.`)
                      : "Returns and replacements are currently disabled for this product. All sales are final."}
                  </p>
                </div>
              </div>
            </div>

            {/* Available Coupons & Offers Section */}
            {availableOffers.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                    <Gift className="w-4 h-4 text-amber-600" />
                    <span>Available Offers &amp; Coupons</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                    {availableOffers.length} Active
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {availableOffers.map((offer) => {
                    const code = offer.discountCode || offer.code;
                    const discountSummary = formatDiscountText(offer);
                    const minOrder = Number(offer.minOrderAmount || offer.min_order_amount || 0);

                    return (
                      <div
                        key={offer.id}
                        className="bg-white p-3 rounded-xl border border-amber-200/90 shadow-2xs flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-xs">
                              {offer.title}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {discountSummary}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">
                            {offer.description}
                            {minOrder > 0 ? ` • Min purchase ₹${minOrder}` : " • No min purchase"}
                          </p>
                        </div>

                        {code && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono font-bold text-xs bg-slate-100 text-brand-800 px-2 py-1 rounded-lg border border-slate-200">
                              {code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCoupon(code)}
                              className="px-2.5 py-1 bg-brand-800 hover:bg-brand-900 active:scale-95 text-white font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Copy coupon code"
                            >
                              {copiedCode === code ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-300" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Actions: Quantity + Add to Cart + Buy Now */}
          <div className="space-y-4 border-t border-slate-100 pt-6">
            <div className="flex items-center gap-4">
              <label className="text-xs font-bold text-slate-700">Quantity:</label>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-200 font-bold"
                >
                  -
                </button>
                <span className="px-4 text-sm font-bold text-slate-800">{qty}</span>
                <button
                  onClick={() => setQty(qty + 1)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-200 font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleAddToCart}
                className={`py-3.5 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  added
                    ? "bg-emerald-600 text-white"
                    : "bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-300"
                }`}
              >
                {added ? <Check className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                <span>{added ? "Added to Cart!" : "Add to Cart"}</span>
              </button>

              <button
                onClick={handleBuyNow}
                className="py-3.5 px-6 bg-brand-800 hover:bg-brand-900 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-brand-800/20"
              >
                Buy Now
              </button>
            </div>

            {/* Micro Feature Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-500">
              <div className="p-2 space-y-1">
                <Leaf className="w-5 h-5 mx-auto text-brand-700" />
                <p className="font-semibold">100% Herbal</p>
              </div>
              <div className="p-2 space-y-1">
                <Shield className="w-5 h-5 mx-auto text-brand-700" />
                <p className="font-semibold">Quality Assured</p>
              </div>
              <div className="p-2 space-y-1">
                <Truck className="w-5 h-5 mx-auto text-brand-700" />
                <p className="font-semibold">Fast Shipping</p>
              </div>
              <div className="p-2 space-y-1">
                <RotateCcw className={`w-5 h-5 mx-auto ${isReturnActive ? "text-emerald-700" : "text-slate-400"}`} />
                <p className={`font-semibold ${isReturnActive ? "text-emerald-800" : "text-slate-500"}`}>
                  {isReturnActive ? `${returnDays}d Replacement` : "Non-Returnable"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Product Details & Return / Replacement Tabs Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-100 space-y-6">
        {/* Navigation Tabs Header */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-2 sm:gap-4 scrollbar-none">
          <button
            onClick={() => setActiveTab("returns")}
            className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "returns"
                ? "border-brand-800 text-brand-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Return &amp; Replacement Policy</span>
            {isReturnActive && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-extrabold">
                {returnDays} Days
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("details")}
            className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "details"
                ? "border-brand-800 text-brand-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Product Details &amp; Benefits</span>
          </button>

          <button
            onClick={() => setActiveTab("shipping")}
            className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "shipping"
                ? "border-brand-800 text-brand-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Shipping &amp; Delivery</span>
          </button>
        </div>

        {/* Tab 1: Return & Replacement Policy */}
        {activeTab === "returns" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isReturnActive ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"}`}>
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">
                    {isReturnActive ? `${returnDays}-Day Replacement & Return Policy` : "Non-Returnable Policy"}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {isReturnActive
                      ? `Valid for ${returnDays} days from package delivery date`
                      : "This product is sold on a final sale basis"}
                  </p>
                </div>
              </div>

              {isReturnActive && (
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/91${whatsappNumber}?text=Hi,%20I%20have%20a%20question%20regarding%20return%20or%20replacement%20for%20${encodeURIComponent(product.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Replacement Support on WhatsApp</span>
                  </a>
                </div>
              )}
            </div>

            {isReturnActive ? (
              <div className="space-y-6">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {storeSettings?.return_policy_text || "At Devora Naturals, we stand behind the quality and purity of our authentic formulations. If you receive an item that is damaged, defective, or incorrect, we offer a hassle-free replacement or return within our guarantee period."}
                </p>

                {/* 3 Step Replacement Process */}
                <div>
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
                    Simple 3-Step Replacement Process:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center">1</span>
                      <h5 className="font-bold text-slate-900 text-sm">Raise Request</h5>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Notify our team within {returnDays} days of delivery with photos of the damaged or defective package.
                      </p>
                    </div>

                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center">2</span>
                      <h5 className="font-bold text-slate-900 text-sm">Instant Verification</h5>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Our quality team reviews your request within 24 business hours for seamless approval.
                      </p>
                    </div>

                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center">3</span>
                      <h5 className="font-bold text-slate-900 text-sm">Free Replacement</h5>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        A fresh replacement is dispatched to your doorstep with express tracking at no additional fee.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Terms & Conditions Box */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
                  <h5 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-brand-800" />
                    <span>Coverage Guidelines &amp; Criteria</span>
                  </h5>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    <li>Replacement covers transit breakage, leakage, seal tampering, or dispatch of wrong products.</li>
                    <li>Items must be in original packaging with batch codes and outer tags intact.</li>
                    <li>Due to hygiene &amp; organic standards, items that have been substantially used or tampered cannot be returned.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-sm text-slate-600 space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <span>This item is classified as Non-Returnable</span>
                </div>
                <p className="leading-relaxed">
                  Due to seasonal production batches, organic potency, or storewide policy settings, returns and replacements are not accepted for this product. All purchases are final once placed. Please feel free to reach out to our customer care team before placing your order if you have any questions.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Product Details & Benefits */}
        {activeTab === "details" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-emerald-600" />
                  <span>Key Ingredients &amp; Ayurvedic Formulation</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Crafted using time-tested Ayurvedic herbs, cold-pressed plant oils, and natural botanical extracts sourced directly from traditional organic farms. Free from parabens, mineral oils, and synthetic preservatives.
                </p>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Product Specifications</span>
                </h4>
                <div className="text-xs text-slate-600 space-y-1.5">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="font-semibold text-slate-700">Category:</span>
                    <span>{product.category || "General"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="font-semibold text-slate-700">Brand:</span>
                    <span>Devora Naturals</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="font-semibold text-slate-700">Quality Standard:</span>
                    <span>100% Herbal &amp; Certified Ayurvedic</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-extrabold text-slate-900">How to Use:</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apply as directed on the packaging. For external wellness and skincare application, perform a 24-hour patch test before first use. Store in a cool, dry place away from direct sunlight.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Shipping & Delivery */}
        {activeTab === "shipping" && (
          <div className="space-y-4 animate-fadeIn text-xs text-slate-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <h5 className="font-extrabold text-slate-800 text-sm">Delivery Timelines</h5>
                <p>Standard delivery across India within <strong>3 to 5 business days</strong> from dispatch.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <h5 className="font-extrabold text-slate-800 text-sm">Shipping Charges</h5>
                <p>
                  Standard Shipping: <strong>₹{standardShipping}</strong>. Free shipping on orders above <strong>₹{freeThreshold}</strong>.
                </p>
              </div>
            </div>

            <p className="text-slate-500 leading-relaxed pt-2">
              All parcels are carefully packaged in eco-conscious, tamper-evident corrugated boxes to ensure glass bottles and herbal preparations reach you safely.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
