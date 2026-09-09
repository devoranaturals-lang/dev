"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useCart } from "../../context/CartContext";
import {
  Trash2,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Tag,
  Gift,
  Check,
  X,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { getContactDetails, getOffers } from "../../lib/supabase";
import { validateAndApplyCoupon, findBestAutoDiscount, formatDiscountText, resolveOfferDiscount } from "../../lib/coupons";
import { DEFAULT_OFFERS } from "../../lib/initialData";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
  const [storeSettings, setStoreSettings] = useState(null);
  const [offers, setOffers] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const [contact, fetchedOffers] = await Promise.all([
          getContactDetails(),
          getOffers(),
        ]);
        if (contact) setStoreSettings(contact);
        const offersList = fetchedOffers || [];
        setOffers(offersList);

        // If an applied coupon was deleted, invalidate it
        const saved = localStorage.getItem("devora_active_coupon");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const parsedCode = String(parsed.discountCode || parsed.code || "").trim().toUpperCase();
            const stillExists = offersList.some(
              (o) => String(o.discountCode || o.code || "").trim().toUpperCase() === parsedCode
            );
            if (!stillExists) {
              setAppliedCoupon(null);
              setDiscountAmount(0);
              localStorage.removeItem("devora_active_coupon");
            }
          } catch (_) {}
        }
      } catch (e) {
        console.error("Failed to load settings in cart:", e);
      }
    }
    loadData();

    const handleOffersUpdated = () => {
      loadData();
    };

    const handleStorageChange = (e) => {
      if (e.key === "devora_offers_sync_ping" || e.key === "devora_deleted_offers" || e.key === "devora_mock_offers_v1") {
        loadData();
      }
    };

    window.addEventListener("devora_offers_updated", handleOffersUpdated);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("devora_offers_updated", handleOffersUpdated);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Compute available coupons for dropdown
  const availableCoupons = useMemo(() => {
    const rawOffers = Array.isArray(offers) ? offers : [];
    return rawOffers
      .filter((o) => {
        const active = o.isActive !== false && o.is_active !== false;
        const code = o.discountCode || o.code;
        return active && Boolean(code);
      })
      .map((o) => {
        const code = String(o.discountCode || o.code).trim().toUpperCase();
        const resolved = resolveOfferDiscount(o);
        const merged = {
          ...o,
          ...resolved,
          code,
          discountCode: code,
        };
        return {
          ...merged,
          title: o.title || `Coupon ${code}`,
          description: o.description || formatDiscountText(merged),
        };
      });
  }, [offers]);

  // Restore coupon from localStorage or apply automatic discount if none set
  useEffect(() => {
    try {
      const saved = localStorage.getItem("devora_active_coupon");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          const res = validateAndApplyCoupon(parsed, cart, cartTotal);
          if (res.isValid) {
            setAppliedCoupon(parsed);
            setCouponCode(parsed.code || parsed.discountCode || "");
            setDiscountAmount(res.discountAmount);
            return;
          } else {
            localStorage.removeItem("devora_active_coupon");
          }
        }
      }
    } catch (e) {}

    // Check for automatic discount
    if (cart.length > 0 && availableCoupons.length > 0) {
      const bestAuto = findBestAutoDiscount(offers, cart, cartTotal);
      if (bestAuto) {
        const res = validateAndApplyCoupon(bestAuto, cart, cartTotal);
        if (res.isValid) {
          setAppliedCoupon(bestAuto);
          setCouponCode(bestAuto.code || bestAuto.discountCode || "");
          setDiscountAmount(res.discountAmount);
          try {
            localStorage.setItem("devora_active_coupon", JSON.stringify(bestAuto));
          } catch (e) {}
        }
      }
    }
  }, [offers, cartTotal]);

  // Synchronize discount amount if cart items change
  useEffect(() => {
    if (appliedCoupon) {
      const res = validateAndApplyCoupon(appliedCoupon, cart, cartTotal);
      if (res.isValid) {
        setDiscountAmount(res.discountAmount);
      } else {
        setCouponError(res.error || "Coupon criteria no longer met.");
        setAppliedCoupon(null);
        setDiscountAmount(0);
        try {
          localStorage.removeItem("devora_active_coupon");
        } catch (e) {}
      }
    } else {
      setDiscountAmount(0);
    }
  }, [cart, cartTotal, appliedCoupon]);

  const handleApplyCoupon = (codeToApply) => {
    setCouponError("");
    const rawCode = String(codeToApply !== undefined ? codeToApply : couponCode).trim();
    const cleanTarget = rawCode.replace(/\s+/g, "").toUpperCase();
    if (!cleanTarget) {
      setCouponError("Please enter or select a coupon code.");
      return;
    }

    const matched = availableCoupons.find(
      (c) => String(c.code || c.discountCode || "").replace(/\s+/g, "").toUpperCase() === cleanTarget
    );

    if (!matched) {
      setCouponError(`Coupon "${rawCode}" is invalid or does not exist.`);
      return;
    }

    const res = validateAndApplyCoupon(matched, cart, cartTotal);
    if (res.isValid && (res.discountAmount > 0 || res.freeShipping)) {
      setAppliedCoupon(matched);
      setCouponCode(matched.code);
      setDiscountAmount(res.discountAmount);
      setCouponError("");
      try {
        localStorage.setItem("devora_active_coupon", JSON.stringify(matched));
      } catch (e) {}
    } else {
      setCouponError(res.error || `"${rawCode}" is not applicable to this order.`);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode("");
    setCouponError("");
    try {
      localStorage.removeItem("devora_active_coupon");
    } catch (e) {}
  };

  const isStateShippingEnabled = storeSettings?.state_shipping_enabled !== false;
  const freeThreshold = Number(storeSettings?.free_shipping_threshold !== undefined ? storeSettings.free_shipping_threshold : 499);
  const tnRate = Number(storeSettings?.shipping_charge_tamilnadu !== undefined ? storeSettings.shipping_charge_tamilnadu : 50);
  const otherRate = Number(storeSettings?.shipping_charge_other_states !== undefined ? storeSettings.shipping_charge_other_states : 100);
  const flatStandardRate = Number(storeSettings?.standard_shipping_charge !== undefined ? storeSettings.standard_shipping_charge : 50);
  const standardShippingRate = isStateShippingEnabled ? tnRate : flatStandardRate;
  const isFreeStandard = (freeThreshold > 0 && cartTotal >= freeThreshold) || appliedCoupon?.discountType === "free_shipping";
  const estimatedShipping = isFreeStandard ? 0 : standardShippingRate;
  const finalEstimatedTotal = Math.max(0, cartTotal - discountAmount + estimatedShipping);

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-brand-50 text-brand-800 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-800">Your Shopping Cart is Empty</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          Explore our organic herbal skincare, Ayurvedic hair elixirs, and sacred incense products to add items to your cart.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-brand-800 hover:bg-brand-900 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-brand-800/20"
        >
          <span>Explore Products</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Your Shopping Cart</h1>
          <p className="text-xs text-slate-500 mt-1">Review your organic wellness items and apply discounts.</p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Cart Item List */}
        <div className="lg:col-span-8 space-y-4">
          {cart.map((item) => {
            const storeReturnEnabled = storeSettings?.return_policy_enabled !== false;
            const isItemReturnable = storeReturnEnabled && item.is_returnable !== false;
            const itemReturnDays = item.return_period_days || storeSettings?.return_window_days || 7;

            return (
              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <img
                    src={item.image_url || "https://images.unsplash.com/photo-1608248597263-00079e96047c?auto=format&fit=crop&w=200&q=80"}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-xl border border-slate-100 flex-shrink-0"
                  />
                  <div>
                    <h3 className="font-bold text-slate-800 text-base leading-snug">{item.name}</h3>
                    <p className="text-xs text-brand-700 font-semibold mt-0.5">{item.category}</p>
                    <p className="text-sm font-bold text-earth-700 mt-1">₹{Number(item.price).toLocaleString("en-IN")}</p>

                    {/* Per-Product Return & Replacement Policy Badge */}
                    <div className="mt-2">
                      {isItemReturnable ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-2.5 py-0.5 rounded-lg shadow-2xs">
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{itemReturnDays}-Day Return &amp; Replacement</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          <span>Non-Returnable (Final Sale)</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quantity Controls & Line Total */}
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0">
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="px-3 py-1 font-bold text-slate-600 hover:bg-slate-200 text-sm cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-3 font-bold text-slate-800 text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="px-3 py-1 font-bold text-slate-600 hover:bg-slate-200 text-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <span className="font-extrabold text-slate-900 text-base min-w-[80px] text-right">
                    ₹{(Number(item.price) * item.quantity).toLocaleString("en-IN")}
                  </span>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    title="Remove Item"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}

          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-xs font-bold text-brand-800 hover:text-brand-900 pt-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continue Shopping</span>
          </Link>
        </div>

        {/* Order Summary Side Card with Interactive Coupon Box */}
        <div className="lg:col-span-4">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6 sticky top-28">
            <h2 className="text-xl font-extrabold text-slate-900 border-b border-slate-100 pb-4">
              Order Summary
            </h2>

            {/* Coupons & Promo Box */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-emerald-700" />
                  <span>Coupons &amp; Offers</span>
                </span>
                {availableCoupons.length > 0 && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {availableCoupons.length} Available
                  </span>
                )}
              </div>

              {/* Coupon Select Dropdown */}
              <div>
                <select
                  value={appliedCoupon ? appliedCoupon.code : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleApplyCoupon(e.target.value);
                    } else {
                      handleRemoveCoupon();
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700 cursor-pointer"
                >
                  <option value="">-- Select an active coupon / offer --</option>
                  {availableCoupons.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.title} ({formatDiscountText(c)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Manual Input + Apply */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Or enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  disabled={appliedCoupon !== null}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-brand-700 outline-none disabled:bg-slate-100"
                />
                {!appliedCoupon ? (
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    Apply
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {couponError && (
                <p className="text-red-500 text-xs font-semibold">{couponError}</p>
              )}

              {/* Applied Coupon Badge */}
              {appliedCoupon && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-emerald-600 text-white rounded-md">
                      <Check className="w-3 h-3" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-950">
                        {appliedCoupon.code} Applied!
                      </p>
                      <p className="text-[10px] text-emerald-700">
                        Saving <strong className="font-bold">₹{discountAmount.toLocaleString("en-IN")}</strong> on overall total
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-emerald-800 hover:text-red-600 text-[11px] font-bold underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({cart.length} {cart.length === 1 ? "item" : "items"})</span>
                <span className="font-bold text-slate-800">₹{cartTotal.toLocaleString("en-IN")}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-xl text-xs">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Coupon Discount on Total ({appliedCoupon?.code}):</span>
                  </span>
                  <span className="font-bold">-₹{discountAmount.toLocaleString("en-IN")}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Shipping Estimate</span>
                <span className={`font-bold ${isFreeStandard ? "text-emerald-600 font-extrabold" : "text-slate-800"}`}>
                  {isFreeStandard
                    ? "FREE"
                    : isStateShippingEnabled
                    ? `₹${tnRate} (TN) / ₹${otherRate} (Other)`
                    : `₹${flatStandardRate}`}
                </span>
              </div>

              {isStateShippingEnabled ? (
                <div className="text-[10px] text-slate-600 bg-slate-50 border border-slate-200/80 p-2 rounded-xl flex items-center justify-between">
                  <span>Tamil Nadu: <strong className="text-emerald-900 font-bold">₹{tnRate}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>Other States: <strong className="text-blue-900 font-bold">₹{otherRate}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span className="text-emerald-800 font-semibold">Free on ₹{freeThreshold}+</span>
                </div>
              ) : (
                <div className="text-[10px] text-slate-600 bg-slate-50 border border-slate-200/80 p-2 rounded-xl flex items-center justify-between">
                  <span>Standard Delivery: <strong className="text-slate-900 font-bold">₹{flatStandardRate}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span className="text-emerald-800 font-semibold">Free on ₹{freeThreshold}+</span>
                </div>
              )}

              {freeThreshold > 0 && !isFreeStandard && (
                <div className="text-[11px] text-emerald-900 bg-emerald-50/90 p-2.5 rounded-xl border border-emerald-200">
                  Add <strong className="font-extrabold text-emerald-800">₹{freeThreshold - cartTotal}</strong> more to qualify for <strong>FREE Standard Delivery</strong>!
                </div>
              )}
              {isFreeStandard && (
                <div className="text-[11px] text-emerald-900 bg-emerald-50/90 p-2.5 rounded-xl border border-emerald-200">
                  🎉 You have qualified for <strong>FREE Standard Delivery</strong>!
                </div>
              )}

              <div className="border-t border-slate-100 pt-3 flex justify-between text-lg font-black text-slate-900">
                <span>Estimated Total</span>
                <span className="text-earth-700">₹{finalEstimatedTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full py-4 bg-brand-800 hover:bg-brand-900 text-white font-bold text-center text-sm rounded-2xl transition-all shadow-lg shadow-brand-800/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Dynamic Return & Replacement Policy Notice based on Cart Items */}
            {(() => {
              const storeReturnEnabled = storeSettings?.return_policy_enabled !== false;
              const returnableItems = cart.filter(
                (item) => storeReturnEnabled && item.is_returnable !== false
              );
              const nonReturnableItems = cart.filter(
                (item) => !storeReturnEnabled || item.is_returnable === false
              );

              if (returnableItems.length > 0) {
                return (
                  <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 space-y-2 text-xs text-emerald-950">
                    <div className="flex items-center gap-2 font-bold text-emerald-900">
                      <RotateCcw className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Return &amp; Replacement Available</span>
                    </div>
                    <div className="text-[11px] text-emerald-850 space-y-1.5">
                      <p className="leading-snug">
                        Policy applies <strong className="font-extrabold text-emerald-900">only to {returnableItems.length} eligible {returnableItems.length === 1 ? "product" : "products"}</strong>:
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {returnableItems.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-900 bg-white border border-emerald-300 px-2 py-0.5 rounded-md shadow-2xs"
                          >
                            <RotateCcw className="w-2.5 h-2.5 text-emerald-600" />
                            {item.name} ({item.return_period_days || storeSettings?.return_window_days || 7}d)
                          </span>
                        ))}
                      </div>
                    </div>
                    {nonReturnableItems.length > 0 && (
                      <div className="pt-2 border-t border-emerald-200/70 text-[10px] text-slate-500">
                        <span className="font-semibold text-slate-600">Non-Returnable: </span>
                        <span>{nonReturnableItems.map((i) => i.name).join(", ")} (Final Sale)</span>
                      </div>
                    )}
                  </div>
                );
              } else {
                return (
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <RotateCcw className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-medium text-[11px] leading-tight text-center">
                      {storeReturnEnabled
                        ? "Products in your cart are non-returnable (Final Sale)"
                        : "Storewide returns are currently disabled (Final Sale)"}
                    </span>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
