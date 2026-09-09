"use client";

import { useState, useEffect, useMemo } from "react";
import { getOffers, addOffer, updateOffer, deleteOffer, getCategories } from "../../../lib/supabase";
import { formatDiscountText, isOfferExpired, getTimeRemaining } from "../../../lib/coupons";
import {
  Plus,
  Trash2,
  Edit2,
  Tag,
  Percent,
  X,
  Check,
  Search,
  Filter,
  Clock,
  AlertCircle,
  Copy,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  Eye,
  ShoppingBag,
  Gift,
  Flame,
  ArrowRight,
} from "lucide-react";

export default function AdminCouponsAndOffersPage() {
  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, active, disabled, expired
  const [typeFilter, setTypeFilter] = useState("all"); // all, percentage, fixed, bogo, festival, auto
  const [copiedCode, setCopiedCode] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const initialFormState = {
    discountCode: "",
    title: "",
    description: "",
    type: "coupon",
    discountType: "percentage", // percentage, fixed, bogo, free_shipping
    discountValue: 10,
    discountPercent: 10,
    minOrderAmount: 0,
    maxDiscountCap: 0,
    category: "All",
    usageLimit: 0,
    usageCount: 0,
    startDate: "",
    expiryDate: "",
    hasTimer: false,
    timerEnd: "",
    showBanner: true,
    showProductPage: true,
    isAutoApply: false,
    isActive: true,
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchInitialData();

    const handleOffersUpdated = () => {
      fetchInitialData();
    };

    const handleStorageChange = (e) => {
      if (e.key === "devora_offers_sync_ping" || e.key === "devora_deleted_offers" || e.key === "devora_mock_offers_v1") {
        fetchInitialData();
      }
    };

    window.addEventListener("devora_offers_updated", handleOffersUpdated);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("devora_offers_updated", handleOffersUpdated);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  async function fetchInitialData() {
    try {
      setLoading(true);
      const [offersData, catsData] = await Promise.all([getOffers(), getCategories()]);
      setOffers(offersData || []);
      setCategories(catsData || []);
    } catch (error) {
      console.error("Error fetching coupons & offers:", error);
    } finally {
      setLoading(false);
    }
  }

  // Statistics calculation
  const stats = useMemo(() => {
    const total = offers.length;
    const active = offers.filter(
      (o) => (o.isActive !== false && o.is_active !== false) && !isOfferExpired(o)
    ).length;
    const totalRedemptions = offers.reduce(
      (sum, o) => sum + Number(o.usageCount || o.usage_count || 0),
      0
    );
    const bogoOffers = offers.filter((o) => o.discountType === "bogo" || o.type === "bogo").length;
    return { total, active, totalRedemptions, bogoOffers };
  }, [offers]);

  // Filtered offers
  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      const code = String(offer.discountCode || offer.code || "").toUpperCase();
      const title = String(offer.title || "").toLowerCase();
      const q = searchQuery.trim().toLowerCase();

      // Search matching
      if (q && !code.toLowerCase().includes(q) && !title.includes(q)) {
        return false;
      }

      // Status filter
      const isExpired = isOfferExpired(offer);
      const isActive = offer.isActive !== false && offer.is_active !== false;

      if (statusFilter === "active" && (!isActive || isExpired)) return false;
      if (statusFilter === "disabled" && isActive) return false;
      if (statusFilter === "expired" && !isExpired) return false;

      // Type filter
      const dType = offer.discountType || (offer.type === "fixed" ? "fixed" : offer.type === "bogo" ? "bogo" : "percentage");
      if (typeFilter !== "all") {
        if (typeFilter === "auto" && !offer.isAutoApply && !offer.is_auto_apply) return false;
        if (typeFilter === "festival" && offer.type !== "festival") return false;
        if (typeFilter === "bogo" && dType !== "bogo") return false;
        if (typeFilter === "fixed" && dType !== "fixed") return false;
        if (typeFilter === "percentage" && dType !== "percentage") return false;
      }

      return true;
    });
  }, [offers, searchQuery, statusFilter, typeFilter]);

  const handleOpenAdd = () => {
    setEditItem(null);
    setFormData(initialFormState);
    setStatusMsg("");
    setModalOpen(true);
  };

  const handleOpenEdit = (offer) => {
    setEditItem(offer);
    const dType = offer.discountType || (offer.type === "fixed" ? "fixed" : offer.type === "bogo" ? "bogo" : "percentage");
    const dVal = Number(offer.discountValue !== undefined ? offer.discountValue : (offer.discountPercent || 10));

    setFormData({
      discountCode: offer.discountCode || offer.code || "",
      title: offer.title || "",
      description: offer.description || "",
      type: offer.type || "coupon",
      discountType: dType,
      discountValue: dVal,
      discountPercent: dVal,
      minOrderAmount: Number(offer.minOrderAmount || offer.min_order_amount || 0),
      maxDiscountCap: Number(offer.maxDiscountCap || offer.max_discount || 0),
      category: offer.category || "All",
      usageLimit: Number(offer.usageLimit || offer.usage_limit || 0),
      usageCount: Number(offer.usageCount || offer.usage_count || 0),
      startDate: offer.startDate || offer.start_date || "",
      expiryDate: offer.expiryDate || offer.expiry_date || "",
      hasTimer: Boolean(offer.hasTimer || offer.timerEnd),
      timerEnd: offer.timerEnd || "",
      showBanner: offer.showBanner !== false,
      showProductPage: offer.showProductPage !== false,
      isAutoApply: Boolean(offer.isAutoApply || offer.is_auto_apply),
      isActive: offer.isActive !== false && offer.is_active !== false,
    });
    setStatusMsg("");
    setModalOpen(true);
  };

  const handleToggleActive = async (offer) => {
    try {
      const currentActive = offer.isActive !== false && offer.is_active !== false;
      const updated = {
        ...offer,
        isActive: !currentActive,
        is_active: !currentActive,
      };
      await updateOffer(offer.id, updated);
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? updated : o)));
      setSuccessMsg(`Coupon "${offer.discountCode || offer.title}" ${!currentActive ? "enabled" : "disabled"}.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to update coupon status.");
    }
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setStatusMsg("Offer title is required.");
      return;
    }

    try {
      setSubmitting(true);
      setStatusMsg("");

      const cleanCode = String(formData.discountCode || "").trim().toUpperCase();

      const payload = {
        ...formData,
        discountCode: cleanCode,
        code: cleanCode,
        discountPercent: Number(formData.discountValue || 0),
        discountValue: Number(formData.discountValue || 0),
        minOrderAmount: Number(formData.minOrderAmount || 0),
        maxDiscountCap: Number(formData.maxDiscountCap || 0),
        usageLimit: Number(formData.usageLimit || 0),
        usageCount: Number(formData.usageCount || 0),
        isActive: Boolean(formData.isActive),
        is_active: Boolean(formData.isActive),
        showBanner: Boolean(formData.showBanner),
        showProductPage: Boolean(formData.showProductPage),
        isAutoApply: Boolean(formData.isAutoApply),
      };

      if (editItem) {
        await updateOffer(editItem.id, payload);
        setSuccessMsg(`Coupon "${payload.discountCode || payload.title}" updated successfully!`);
      } else {
        await addOffer(payload);
        setSuccessMsg(`New coupon "${payload.discountCode || payload.title}" created successfully!`);
      }

      setModalOpen(false);
      setTimeout(() => setSuccessMsg(""), 3000);
      await fetchInitialData();
    } catch (error) {
      console.error("Error saving offer:", error);
      setStatusMsg("Failed to save offer: " + (error.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, codeOrTitle) => {
    if (confirm(`Are you sure you want to permanently delete coupon "${codeOrTitle}"?`)) {
      try {
        const cleanCode = String(codeOrTitle || "").trim().toUpperCase();
        await deleteOffer(id, { code: cleanCode });
        setOffers(prev => prev.filter(o => 
          String(o.id) !== String(id) && 
          String(o.discountCode || o.code || "").toUpperCase() !== cleanCode
        ));
        setSuccessMsg(`Coupon "${codeOrTitle}" deleted successfully!`);
        setTimeout(() => setSuccessMsg(""), 3000);
        await fetchInitialData();
      } catch (error) {
        console.error("Error deleting offer:", error);
        alert("Failed to delete coupon: " + (error.message || "Unknown error"));
      }
    }
  };

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 text-brand-800 rounded-xl border border-brand-200">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                Marketing → Coupons &amp; Offers
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage promo codes, percentage &amp; fixed discounts, BOGO deals, countdown timers, and banner offers.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 bg-brand-800 hover:bg-brand-900 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Coupon</span>
        </button>
      </div>

      {/* Analytics & Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Coupons</p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{stats.total}</p>
          <p className="text-[10px] text-slate-400">All promotional rules</p>
        </div>

        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Active Codes</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-900">{stats.active}</p>
          <p className="text-[10px] text-emerald-700">Currently redeemable by customers</p>
        </div>

        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Redemptions</p>
          <p className="text-2xl sm:text-3xl font-black text-amber-900">{stats.totalRedemptions}</p>
          <p className="text-[10px] text-amber-700">Orders completed with coupons</p>
        </div>

        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200 shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Special &amp; BOGO Deals</p>
          <p className="text-2xl sm:text-3xl font-black text-blue-900">{stats.bogoOffers}</p>
          <p className="text-[10px] text-blue-700">Buy 2 Get 1 / Automated Deals</p>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search coupon code or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 text-xs"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="disabled">Disabled</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold text-[11px]">Discount Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="all">All Discount Types</option>
              <option value="percentage">Percentage (% OFF)</option>
              <option value="fixed">Fixed Amount (₹ OFF)</option>
              <option value="bogo">Buy 2 Get 1 (BOGO)</option>
              <option value="festival">Festival Sale</option>
              <option value="auto">Automatic (No Code)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Coupons List */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs font-semibold text-slate-500">
          Loading coupons and promotional rules...
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <Tag className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No coupons or offers match your search/filter.</p>
          <p className="text-xs text-slate-400">Try changing your filters or click "Create New Coupon" above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map((offer) => {
            const isExpired = isOfferExpired(offer);
            const isActive = offer.isActive !== false && offer.is_active !== false;
            const code = offer.discountCode || offer.code;
            const discountSummary = formatDiscountText(offer);
            const minOrder = Number(offer.minOrderAmount || offer.min_order_amount || 0);
            const maxCap = Number(offer.maxDiscountCap || offer.max_discount || 0);
            const usageLimit = Number(offer.usageLimit || offer.usage_limit || 0);
            const usageCount = Number(offer.usageCount || offer.usage_count || 0);
            const hasTimer = Boolean(offer.hasTimer || offer.timerEnd);

            return (
              <div
                key={offer.id}
                className={`bg-white rounded-3xl border transition-all ${
                  !isActive
                    ? "border-slate-200 opacity-60 bg-slate-50/50"
                    : isExpired
                    ? "border-red-200 shadow-xs"
                    : "border-brand-300 shadow-md hover:shadow-lg"
                } p-6 flex flex-col justify-between space-y-5`}
              >
                <div className="space-y-4">
                  {/* Top Bar: Code Pill + Active Status Switch */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    {code ? (
                      <div className="flex items-center gap-1.5 bg-brand-50 border border-brand-200 px-3 py-1 rounded-xl">
                        <Tag className="w-3.5 h-3.5 text-brand-700" />
                        <span className="font-mono font-black text-sm text-brand-900 tracking-wider">
                          {code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(code)}
                          className="ml-1 p-1 hover:bg-brand-200/60 rounded text-brand-700 transition-colors"
                          title="Copy Code"
                        >
                          {copiedCode === code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl">
                        Automatic Discount
                      </span>
                    )}

                    {/* Status Badge & Toggle */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          !isActive
                            ? "bg-slate-100 text-slate-500"
                            : isExpired
                            ? "bg-red-100 text-red-700"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {!isActive ? "DISABLED" : isExpired ? "EXPIRED" : "ACTIVE"}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(offer)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                          isActive ? "bg-emerald-600 justify-end" : "bg-slate-300 justify-start"
                        }`}
                        title={isActive ? "Click to Disable" : "Click to Enable"}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-xs"></div>
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base leading-snug">{offer.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                      {offer.description}
                    </p>
                  </div>

                  {/* Discount Highlight Badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                      <Percent className="w-3.5 h-3.5" />
                      <span>{discountSummary}</span>
                    </span>

                    {offer.category && offer.category !== "All" && (
                      <span className="text-[10px] font-bold text-brand-800 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-lg">
                        Category: {offer.category}
                      </span>
                    )}

                    {offer.isAutoApply && (
                      <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                        ⚡ Auto-Apply
                      </span>
                    )}
                  </div>

                  {/* Rule Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Min. Order:</span>
                      <span className="font-bold text-slate-800">
                        {minOrder > 0 ? `₹${minOrder.toLocaleString("en-IN")}` : "No Minimum"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Max Savings:</span>
                      <span className="font-bold text-slate-800">
                        {maxCap > 0 ? `Up to ₹${maxCap}` : "No Cap"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Redemptions:</span>
                      <span className="font-bold text-slate-800">
                        {usageCount} {usageLimit > 0 ? `/ ${usageLimit}` : "uses"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Expiry:</span>
                      <span className={`font-bold ${isExpired ? "text-red-600" : "text-slate-800"}`}>
                        {offer.expiryDate || offer.expiry_date
                          ? new Date(offer.expiryDate || offer.expiry_date).toLocaleDateString("en-IN")
                          : "Never"}
                      </span>
                    </div>
                  </div>

                  {/* Placements & Live Countdown Badge */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <div className="flex items-center gap-2">
                      {offer.showBanner !== false && (
                        <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-bold">
                          Banner Active
                        </span>
                      )}
                      {offer.showProductPage !== false && (
                        <span className="bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded font-bold">
                          Product Page
                        </span>
                      )}
                    </div>

                    {hasTimer && (
                      <span className="flex items-center gap-1 text-red-600 font-bold">
                        <Clock className="w-3 h-3 text-red-500 animate-pulse" />
                        <span>Timer Enabled</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Card Actions: Edit & Delete */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(offer)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Edit Offer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(offer.id, code || offer.title)}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Delete Offer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Coupon Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  {editItem ? "Edit Coupon / Offer Rule" : "Create New Coupon / Offer"}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure discount percentages, fixed amounts, BOGO rules, expiry dates and banners.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 text-xs">
              {/* Section 1: Coupon Basics */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
                  1. Coupon Identity &amp; Title
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Coupon Code (e.g. FESTIVE20)
                    </label>
                    <input
                      type="text"
                      value={formData.discountCode}
                      onChange={(e) => setFormData({ ...formData, discountCode: e.target.value.toUpperCase() })}
                      placeholder="e.g. DEVORA15"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-mono uppercase font-bold text-sm tracking-wider"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Leave blank if this is a purely automatic discount without code.
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Offer Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. 15% Festival Herbal Savings"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Short Description *</label>
                    <textarea
                      required
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Get 15% OFF on all pure Ayurvedic skincare and wellness products."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Discount Type & Calculation Rules */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
                  2. Discount Calculation &amp; Conditions
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Discount Type *</label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-bold text-slate-800"
                    >
                      <option value="percentage">Percentage (% OFF Total)</option>
                      <option value="fixed">Fixed Amount (Flat ₹ OFF)</option>
                      <option value="bogo">Buy 2 Get 1 FREE (BOGO)</option>
                      <option value="free_shipping">Free Shipping Waiver</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Discount Value {formData.discountType === "percentage" ? "(%)" : "(₹)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={formData.discountType === "bogo" || formData.discountType === "free_shipping"}
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      placeholder="15"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 disabled:opacity-40 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Max Savings Cap (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maxDiscountCap}
                      onChange={(e) => setFormData({ ...formData, maxDiscountCap: e.target.value })}
                      placeholder="0 (No limit)"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">0 = No maximum cap</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Min. Order Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minOrderAmount}
                      onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                      placeholder="499"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">0 = No minimum purchase</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Applicable Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                    >
                      <option value="All">All Categories (Storewide)</option>
                      {categories.map((c) => (
                        <option key={c.id || c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Total Usage Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                      placeholder="500"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">0 = Unlimited redemptions</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Schedule & Countdown Timer */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
                  3. Validity, Expiry &amp; Live Timer
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Start Date (Optional)</label>
                    <input
                      type="datetime-local"
                      value={formData.startDate ? formData.startDate.slice(0, 16) : ""}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Expiry Date (Optional)</label>
                    <input
                      type="datetime-local"
                      value={formData.expiryDate ? formData.expiryDate.slice(0, 16) : ""}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                  </div>

                  <div className="sm:col-span-2 p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasTimer}
                        onChange={(e) => setFormData({ ...formData, hasTimer: e.target.checked })}
                        className="w-4 h-4 text-brand-700 rounded"
                      />
                      <span className="font-bold text-amber-950">
                        Enable Live Countdown Timer for this Offer (Hours/Mins/Secs Banner)
                      </span>
                    </label>

                    {formData.hasTimer && (
                      <div className="pt-2">
                        <label className="block font-bold text-slate-700 mb-1">
                          Countdown Target End Time *
                        </label>
                        <input
                          type="datetime-local"
                          required={formData.hasTimer}
                          value={formData.timerEnd ? formData.timerEnd.slice(0, 16) : ""}
                          onChange={(e) => setFormData({ ...formData, timerEnd: e.target.value })}
                          className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4: Visibility & Automation */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
                  4. Placements &amp; Automation
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showBanner}
                      onChange={(e) => setFormData({ ...formData, showBanner: e.target.checked })}
                      className="w-4 h-4 text-brand-700 rounded"
                    />
                    <span className="font-bold text-slate-700">Display in Top Header Offer Banner</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showProductPage}
                      onChange={(e) => setFormData({ ...formData, showProductPage: e.target.checked })}
                      className="w-4 h-4 text-brand-700 rounded"
                    />
                    <span className="font-bold text-slate-700">Display on Product Details Pages</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isAutoApply}
                      onChange={(e) => setFormData({ ...formData, isAutoApply: e.target.checked })}
                      className="w-4 h-4 text-brand-700 rounded"
                    />
                    <span className="font-bold text-slate-700">Automatic Discount (Apply without code)</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-emerald-700 rounded"
                    />
                    <span className="font-bold text-emerald-900">Set as Active (Immediately Redeemable)</span>
                  </label>
                </div>
              </div>

              {statusMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                  {statusMsg}
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-brand-800 hover:bg-brand-900 disabled:opacity-50 text-white px-7 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  {submitting ? "Saving..." : editItem ? "Update Coupon Rule" : "Save Coupon Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
