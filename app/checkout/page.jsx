"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { createOrder, getContactDetails, getOffers } from "../../lib/supabase";
import { validateAndApplyCoupon, findBestAutoDiscount, incrementCouponUsage, formatDiscountText, resolveOfferDiscount } from "../../lib/coupons";
import { DEFAULT_OFFERS } from "../../lib/initialData";
import {
  CheckCircle2,
  ShoppingBag,
  ShieldCheck,
  Tag,
  X,
  ChevronDown,
  Gift,
  Check,
  Percent,
  Sparkles,
  Truck,
  RotateCcw,
  User,
  Package,
} from "lucide-react";
import Link from "next/link";

const INDIAN_STATES = [
  "Tamil Nadu",
  "Kerala",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
  "Maharashtra",
  "Delhi",
  "Gujarat",
  "Goa",
  "Rajasthan",
  "Punjab",
  "Haryana",
  "Uttar Pradesh",
  "West Bengal",
  "Madhya Pradesh",
  "Bihar",
  "Odisha",
  "Assam",
  "Chhattisgarh",
  "Jharkhand",
  "Uttarakhand",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Puducherry",
  "Chandigarh",
  "Other State / UT",
];

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartTotal, clearCart } = useCart();
  const { customerUser } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "Tamil Nadu",
    pincode: "",
  });

  // Auto-populate when customerUser loads or changes
  useEffect(() => {
    if (customerUser) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || customerUser.name || "",
        phone: prev.phone || customerUser.phone || "",
        email: prev.email || customerUser.email || "",
        address: prev.address || customerUser.address || "",
        city: prev.city || customerUser.city || "",
        state: prev.state || customerUser.state || "Tamil Nadu",
        pincode: prev.pincode || customerUser.pincode || "",
      }));
    }
  }, [customerUser]);

  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [storeSettings, setStoreSettings] = useState(null);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [contact, fetchedOffers] = await Promise.all([getContactDetails(), getOffers()]);
        if (contact) {
          setStoreSettings(contact);
          if (contact.whatsapp) {
            setWhatsappNumber(contact.whatsapp);
          }
        }
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
        console.error("Failed to fetch initial data:", e);
      }
    }
    loadData();

    const handleLiveSync = () => {
      loadData();
    };

    const handleStorageChange = (e) => {
      if (
        e.key === "devora_offers_sync_ping" ||
        e.key === "devora_deleted_offers" ||
        e.key === "devora_mock_offers_v1" ||
        e.key === "devora_settings_sync_ping" ||
        e.key === "devora_mock_settings_v1"
      ) {
        loadData();
      }
    };

    window.addEventListener("devora_offers_updated", handleLiveSync);
    window.addEventListener("devora_settings_updated", handleLiveSync);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("devora_offers_updated", handleLiveSync);
      window.removeEventListener("devora_settings_updated", handleLiveSync);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // State-Based Shipping Charge from Admin Settings (Tamil Nadu: ₹50 | Other States: ₹100 | Toggleable)
  const isShippingEnabled = storeSettings?.shipping_enabled !== false;
  const isStateShippingEnabled = storeSettings?.state_shipping_enabled !== false;
  const freeThreshold = Number(
    storeSettings?.free_shipping_threshold !== undefined
      ? storeSettings.free_shipping_threshold
      : 499
  );
  const tnRate = Number(
    storeSettings?.shipping_charge_tamilnadu !== undefined
      ? storeSettings.shipping_charge_tamilnadu
      : 50
  );
  const otherRate = Number(
    storeSettings?.shipping_charge_other_states !== undefined
      ? storeSettings.shipping_charge_other_states
      : 100
  );
  const flatStandardRate = Number(
    storeSettings?.standard_shipping_charge !== undefined
      ? storeSettings.standard_shipping_charge
      : 50
  );

  const isTamilNadu = useMemo(() => {
    if (!formData.state) return true;
    const clean = formData.state.trim().toLowerCase().replace(/[^a-z]/g, "");
    return clean.includes("tamilnadu") || clean.includes("tamil") || clean === "tn";
  }, [formData.state]);

  const applicableShippingRate = isStateShippingEnabled
    ? (isTamilNadu ? tnRate : otherRate)
    : flatStandardRate;
  const isFreeStandard = freeThreshold > 0 && cartTotal >= freeThreshold;
  const shippingCharge = isShippingEnabled ? (isFreeStandard ? 0 : applicableShippingRate) : 0;

  const finalTotal = Math.max(0, cartTotal - discountAmount + shippingCharge);

  // Compute clean, active list of available coupons
  const availableCoupons = useMemo(() => {
    const rawOffers = Array.isArray(offers) ? offers : [];
    const list = rawOffers
      .filter((o) => {
        const active = o.isActive !== false && o.is_active !== false;
        const code = o.discountCode || o.discount_code || o.code;
        return active && Boolean(code);
      })
      .map((o) => {
        const code = String(o.discountCode || o.discount_code || o.code).trim().toUpperCase();
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

    const unique = [];
    const seen = new Set();
    list.forEach((item) => {
      if (!seen.has(item.code)) {
        seen.add(item.code);
        unique.push(item);
      }
    });
    return unique;
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
    if (cart.length > 0 && offers.length > 0 && !appliedCoupon) {
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

  // Keep discount amount synchronized if cart items change
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleApplyCoupon = (codeToApply) => {
    setCouponError("");
    const rawCode = String(codeToApply !== undefined ? codeToApply : couponCode).trim();
    const cleanTarget = rawCode.replace(/\s+/g, "").toUpperCase();
    if (!cleanTarget) {
      setCouponError("Please select or enter a coupon code.");
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


  const handleSelectDropdownCoupon = (val) => {
    if (!val) {
      handleRemoveCoupon();
      return;
    }
    setCouponCode(val);
    handleApplyCoupon(val);
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

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.address || !formData.city || !formData.pincode) {
      setErrorMsg("Please fill in all required customer details.");
      return;
    }
    // Phone format validation (10 digits)
    const cleanPhone = formData.phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit phone number.");
      return;
    }
    // Pincode format validation (6 digits)
    const cleanPincode = formData.pincode.replace(/\D/g, "");
    if (cleanPincode.length !== 6) {
      setErrorMsg("Please enter a valid 6-digit pincode.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const finalCustomerEmail = (formData.email || customerUser?.email || "").trim();

      const orderData = {
        ...formData,
        email: finalCustomerEmail,
        customer_id: customerUser?.id || "",
        user_id: customerUser?.id || "",
        shippingCharge,
        shippingMethod: isShippingEnabled ? "Standard Delivery" : "Free Shipping",
        subtotal: cartTotal,
        couponCode: appliedCoupon?.code || "",
        discountAmount,
        totalAmount: finalTotal,
      };

      const created = await createOrder(orderData, cart);
      
      const itemsList = cart.map(item => `• ${item.name} (Qty: ${item.quantity}) - ₹${(Number(item.price) * item.quantity).toLocaleString("en-IN")}`).join("\n");
      const message = `Hello! I would like to place a new order.

*Order ID:* ${created.id}
*Name:* ${formData.name}
*Phone:* ${formData.phone}
*Address:* ${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}

*Items Ordered (${cart.length} ${cart.length === 1 ? "Product" : "Products"}):*
${itemsList}

*Subtotal:* ₹${cartTotal.toLocaleString("en-IN")}
${appliedCoupon ? `*Coupon Discount on Total Order (${appliedCoupon.code || appliedCoupon.discountCode}):* -₹${discountAmount} (${appliedCoupon.discountPercent}% OFF)\n` : ""}*Shipping:* Standard Delivery (${shippingCharge === 0 ? "FREE" : `₹${shippingCharge}`} - ${isTamilNadu ? "Tamil Nadu" : "Other States"})
*Total Payable Amount:* ₹${finalTotal.toLocaleString("en-IN")}

Please confirm my order. Thank you!`;

      const encodedMessage = encodeURIComponent(message);
      let finalWaUrl = "";
      if (whatsappNumber) {
        const cleanNumber = whatsappNumber.replace(/\D/g, "");
        const formattedWa = cleanNumber.startsWith("91") ? cleanNumber : `91${cleanNumber}`;
        finalWaUrl = `https://wa.me/${formattedWa}?text=${encodedMessage}`;
        // On mobile, redirecting the same tab is more reliable than window.open which gets blocked
        setTimeout(() => { window.location.href = finalWaUrl; }, 1500);
      }
      
      setOrderSuccess({ 
        ...created, 
        subtotal: cartTotal,
        discount_amount: discountAmount,
        coupon_code: appliedCoupon?.code || "",
        shipping_charge: shippingCharge, 
        shipping_method: isShippingEnabled ? "Standard Delivery" : "Free Shipping",
        waUrl: finalWaUrl
      });
      if (appliedCoupon) {
        await incrementCouponUsage(appliedCoupon.code || appliedCoupon.discountCode);
      }
      try {
        localStorage.removeItem("devora_active_coupon");
      } catch (e) {}
      clearCart();
    } catch (err) {
      console.error("Order submission failed:", err);
      setErrorMsg(err.message || "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900">Order Placed Successfully!</h1>
            <p className="text-sm text-slate-600">
              Thank you for ordering with <strong className="text-brand-800">Devora Naturals</strong>.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2 text-xs">
            <div className="flex justify-between font-bold text-slate-800">
              <span>Order ID:</span>
              <span className="font-mono text-brand-700">{orderSuccess.id}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Customer Name:</span>
              <span className="font-bold text-slate-800">{orderSuccess.customer_name}</span>
            </div>
            {orderSuccess.customer_email && (
              <div className="flex justify-between text-slate-600">
                <span>Account Email:</span>
                <span className="font-medium text-slate-800">{orderSuccess.customer_email}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Delivery To:</span>
              <span className="font-medium text-slate-800">{orderSuccess.city}, {orderSuccess.state}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
              <span>Items Subtotal:</span>
              <span className="font-semibold text-slate-800">₹{(orderSuccess.subtotal || cartTotal).toLocaleString("en-IN")}</span>
            </div>
            {appliedCoupon && discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                <span>Coupon Discount on Total ({appliedCoupon.code}):</span>
                <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Shipping:</span>
              <span className="font-semibold text-slate-800">
                {orderSuccess.shipping_method || "Standard Delivery"} ({orderSuccess.shipping_charge ? `₹${orderSuccess.shipping_charge}` : "FREE"})
              </span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Amount:</span>
              <span className="text-earth-700">₹{Number(orderSuccess.total_amount).toLocaleString("en-IN")}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            A confirmation has been prepared for WhatsApp. If it didn't open automatically, you can send it manually below or reach us on WhatsApp at{" "}
            <span className="font-bold text-slate-800">{whatsappNumber}</span>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {orderSuccess.waUrl && (
              <a
                href={orderSuccess.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3 bg-[#25D366] hover:bg-[#1ebd5a] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                <span>Send via WhatsApp</span>
              </a>
            )}
            <Link
              href="/account?tab=orders"
              className="w-full sm:w-auto px-6 py-3 bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" />
              <span>View in Order History</span>
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xl space-y-4">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Your Cart is Empty</h2>
          <p className="text-xs text-slate-500">Add products to your cart before proceeding to checkout.</p>
          <div className="pt-4">
            <Link
              href="/"
              className="px-6 py-3 bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold rounded-xl transition-all shadow-md inline-block"
            >
              Browse Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900">Order Checkout</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your organic items, apply discount coupons, and complete delivery details.
        </p>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">
              Shipping & Customer Details
            </h2>

          {mounted && customerUser && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-emerald-950">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                  {customerUser.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                </div>
                <div>
                  <p className="font-bold text-slate-900">Ordering as {customerUser.name}</p>
                  <p className="text-[11px] text-emerald-800">{customerUser.email}</p>
                </div>
              </div>
              <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2.5 py-1 rounded-full border border-emerald-300">
                Account Linked
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Priya Sharma"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp / Phone *</label>
              <input
                type="tel"
                required
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address (Optional)</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Street Address / House No *</label>
            <textarea
              required
              name="address"
              rows="2"
              value={formData.address}
              onChange={handleChange}
              placeholder="Door number, Apartment name, Street or Landmark"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City / Town *</label>
              <input
                type="text"
                required
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>State *</span>
                {isStateShippingEnabled ? (
                  <span className="text-[10px] font-extrabold text-emerald-800">
                    {isTamilNadu ? `TN: ₹${tnRate}` : `Other: ₹${otherRate}`}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500">
                    Flat: ₹{flatStandardRate}
                  </span>
                )}
              </label>
              <select
                required
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700"
              >
                <option value="Tamil Nadu">
                  Tamil Nadu {isStateShippingEnabled ? `(₹${tnRate} Shipping)` : ""}
                </option>
                <optgroup label={isStateShippingEnabled ? `Other States (₹${otherRate} Shipping)` : "Other States"}>
                  {INDIAN_STATES.filter((s) => s !== "Tamil Nadu").map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pincode *</label>
              <input
                type="text"
                required
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                placeholder="6-digit PIN"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl sticky top-28">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4 mb-4 flex items-center justify-between">
            <span>Order Summary ({cart.length})</span>
            <ShoppingBag className="w-5 h-5 text-brand-800" />
          </h2>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-4">
            {cart.map((item) => {
              const storeReturnEnabled = storeSettings?.return_policy_enabled !== false;
              const isItemReturnable = storeReturnEnabled && item.is_returnable !== false;
              const itemReturnDays = item.return_period_days || storeSettings?.return_window_days || 7;

              return (
                <div key={item.id} className="flex justify-between items-start text-xs border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <p className="text-slate-500">Qty: {item.quantity}</p>
                    {isItemReturnable ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-2 py-0.5 rounded-md mt-1 shadow-2xs">
                        <RotateCcw className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        <span>{itemReturnDays}-Day Return &amp; Replacement</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        <span>Non-Returnable (Final Sale)</span>
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-slate-900 shrink-0 ml-2">
                    ₹{(Number(item.price) * item.quantity).toLocaleString("en-IN")}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-emerald-600" />
                <span>Available Offers & Coupons</span>
              </label>
              {availableCoupons.length > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                  {availableCoupons.length} Active Offers
                </span>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Select coupon code from dropdown:
              </label>
              <div className="relative">
                <select
                  id="coupon-dropdown"
                  value={appliedCoupon ? appliedCoupon.code : ""}
                  onChange={(e) => handleSelectDropdownCoupon(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 hover:border-emerald-500 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:bg-white transition-all cursor-pointer appearance-none shadow-sm"
                >
                  <option value="">-- Choose an available coupon or offer --</option>
                  {availableCoupons.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.title} ({c.discountPercent}% OFF on Total Order)
                    </option>
                  ))}
                </select>
                <Tag className="w-4 h-4 text-emerald-600 absolute left-3 top-3 pointer-events-none" />
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="pt-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Or enter coupon code manually"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  disabled={appliedCoupon !== null}
                  className="flex-1 px-4 py-2 uppercase tracking-wider font-mono border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-700 outline-none disabled:bg-slate-100 placeholder:normal-case placeholder:font-sans"
                />
                {!appliedCoupon ? (
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    className="px-4 py-2 bg-brand-800 text-white text-xs font-bold rounded-xl hover:bg-brand-900 transition-colors shadow-sm shrink-0"
                  >
                    Apply
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {couponError && (
                <p className="text-red-500 text-xs font-semibold mt-1.5">{couponError}</p>
              )}

              <p className="text-[10.5px] text-slate-500 mt-1.5 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                <span>Discounts apply once to your <strong>entire order total</strong>, not to each product separately.</span>
              </p>
            </div>

            {appliedCoupon && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-950">
                      Coupon "{appliedCoupon.code}" Applied! ({appliedCoupon.discountPercent}% OFF on Total Order)
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Deducted once from total order amount • Saving <strong className="font-bold">₹{discountAmount.toLocaleString("en-IN")}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-emerald-800 hover:text-red-600 text-xs font-bold ml-2 underline"
                >
                  Remove
                </button>
              </div>
            )}

            {!appliedCoupon && availableCoupons.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Quick Apply (Applies on Total):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableCoupons.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelectDropdownCoupon(c.code)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 hover:border-emerald-300 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      title={c.description}
                    >
                      <Tag className="w-3 h-3 text-emerald-600" />
                      <span>{c.code}</span>
                      <span className="text-[9px] font-extrabold text-emerald-800 bg-white px-1 py-0.5 rounded shadow-xs">
                        {c.discountPercent}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal ({cart.length} {cart.length === 1 ? "Product" : "Products"})</span>
              <span className="font-bold text-slate-800">₹{cartTotal.toLocaleString("en-IN")}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1.5 rounded-xl">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Coupon Discount on Total ({appliedCoupon?.code})</span>
                </span>
                <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-700">
              <span>Shipping Charge</span>
              <span>
                {!isShippingEnabled
                  ? "Disabled"
                  : shippingCharge === 0
                  ? "FREE"
                  : `+₹${shippingCharge.toLocaleString("en-IN")}`}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <div>
                <span className="block text-slate-800 font-bold text-xs">
                  {isStateShippingEnabled
                    ? `Standard Delivery (${isTamilNadu ? "Tamil Nadu" : "Other States"})`
                    : "Standard Ground Delivery (Nationwide)"}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {isStateShippingEnabled
                    ? (isTamilNadu ? "Local State Delivery (1-2 Days)" : "Interstate Delivery (3-5 Days)")
                    : "Standard Ground Delivery (3-5 Days)"}
                </span>
              </div>
              <span className={`font-bold ${shippingCharge === 0 ? "text-emerald-600 font-black" : "text-slate-900"}`}>
                {shippingCharge === 0 ? (
                  <span className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-black">FREE</span>
                    <span className="text-[10px] line-through text-slate-400">₹{applicableShippingRate}</span>
                  </span>
                ) : (
                  `+₹${shippingCharge}`
                )}
              </span>
            </div>

            {isStateShippingEnabled ? (
              <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>TN: <strong className="text-emerald-950 font-bold">₹{tnRate}</strong></span>
                </span>
                <span className="text-slate-300">•</span>
                <span>Other States: <strong className="text-blue-950 font-bold">₹{otherRate}</strong></span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-800 font-bold">Free on ₹{freeThreshold}+</span>
              </div>
            ) : (
              <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-slate-600" />
                  <span>Flat Rate: <strong className="text-slate-900 font-bold">₹{flatStandardRate}</strong></span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-800 font-bold">Free on ₹{freeThreshold}+</span>
              </div>
            )}

            {freeThreshold > 0 && !isFreeStandard && (
              <div className="text-[11px] text-amber-900 bg-amber-50/90 p-2.5 rounded-xl border border-amber-200">
                Add <strong className="font-extrabold text-amber-800">₹{freeThreshold - cartTotal}</strong> more for <strong>FREE Delivery</strong>!
              </div>
            )}
            {isFreeStandard && (
              <div className="text-[11px] text-emerald-900 bg-emerald-50/90 p-2.5 rounded-xl border border-emerald-200">
                🎉 <strong>FREE Standard Delivery</strong> applied!
              </div>
            )}
            <div className="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-slate-100">
              <span>Total Payable</span>
              <span className="text-earth-700">₹{finalTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-brand-800 hover:bg-brand-900 disabled:opacity-50 text-white font-bold text-center text-sm rounded-2xl transition-all shadow-lg shadow-brand-800/20 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{loading ? "Placing Order..." : "Place Order"}</span>
            </button>

            {/* Dynamic Return & Replacement Policy Guarantee Card */}
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
                  <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl flex flex-col gap-2.5 text-xs text-emerald-900">
                    <div className="flex items-start gap-2.5">
                      <RotateCcw className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                      <div className="space-y-0.5">
                        <p className="font-bold">
                          {storeSettings?.return_window_days || 7}-Day Return &amp; Replacement Policy
                        </p>
                        <p className="text-[11px] text-emerald-800/90 leading-tight">
                          {storeSettings?.return_policy_text || "Eligible items can be returned or replaced within the guarantee period from delivery date."}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/90 rounded-xl p-2.5 border border-emerald-200/70 space-y-1.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">
                        Eligible Products with Return &amp; Replacement ({returnableItems.length}):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {returnableItems.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-900 bg-emerald-100/90 border border-emerald-300/80 px-2 py-0.5 rounded-md"
                          >
                            <RotateCcw className="w-2.5 h-2.5 text-emerald-700" />
                            {item.name} ({item.return_period_days || storeSettings?.return_window_days || 7}d)
                          </span>
                        ))}
                      </div>
                      {nonReturnableItems.length > 0 && (
                        <div className="pt-1.5 border-t border-emerald-100 flex items-center gap-1.5 text-[10px] text-slate-500">
                          <span className="font-semibold text-slate-600">Non-Returnable:</span>
                          <span className="truncate">{nonReturnableItems.map((i) => i.name).join(", ")} (Final Sale)</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-2.5 text-xs text-slate-600">
                    <RotateCcw className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-700">Non-Returnable Order</p>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {storeReturnEnabled
                          ? "None of the products in this order have an active return & replacement policy. All items are final sale."
                          : "Storewide returns & replacements are currently turned off. All sales are final."}
                      </p>
                    </div>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      </form>
    </div>
  );
}
