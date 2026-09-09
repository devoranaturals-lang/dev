// lib/coupons.js
// Production-grade Coupon & Offers Calculation and Validation Engine for Devora Naturals

import { getOffers, updateOffer } from "./supabase.js";

/**
 * Intelligently resolve discountType and discountValue for any offer,
 * parsing description, title, or code if fields are not explicitly set.
 */
export function resolveOfferDiscount(offer) {
  if (!offer) return { discountType: "percentage", discountValue: 0 };

  let dType = offer.discountType || (offer.type === "fixed" ? "fixed" : offer.type === "bogo" ? "bogo" : "");
  let dVal = Number(
    offer.discountValue !== undefined && offer.discountValue !== null && offer.discountValue !== ""
      ? offer.discountValue
      : (offer.discountPercent || 0)
  );

  const text = `${offer.description || ""} ${offer.title || ""}`.toLowerCase();
  const code = String(offer.discountCode || offer.code || "").toUpperCase();

  // If type or value is missing or 0, intelligently extract from description/title/code
  if (!dType || dVal <= 0) {
    if (dType === "bogo" || /buy\s*2\s*get\s*1|bogo/.test(text) || /bogo|buy2/.test(code.toLowerCase())) {
      dType = "bogo";
      dVal = 0;
    } else {
      // 1. Check for Rupee / Flat amounts: e.g. "50rs", "50 rupees", "₹50", "flat 50", "get 50"
      const matchRs = text.match(/(\d+)\s*(?:rs|rupees|inr|\/-)/i) || 
                      text.match(/(?:flat|save|get|off)\s*₹?\s*(\d+)/i) ||
                      text.match(/₹\s*(\d+)/);
      if (matchRs) {
        dType = "fixed";
        dVal = parseInt(matchRs[1], 10);
      } else {
        // 2. Check for Percentage: e.g. "15%", "10 %"
        const matchPct = text.match(/(\d{1,2})\s*%/);
        if (matchPct) {
          dType = "percentage";
          dVal = parseInt(matchPct[1], 10);
        } else {
          // 3. Check trailing digits in coupon code: e.g. "GENESH50", "FLAT100", "DEVORA10"
          const matchCode = code.match(/(\d{1,4})$/);
          if (matchCode) {
            const num = parseInt(matchCode[1], 10);
            if (code.includes("FLAT") || text.includes("rs") || text.includes("rupee") || text.includes("flat") || num > 30) {
              dType = "fixed";
              dVal = num;
            } else {
              dType = "percentage";
              dVal = num;
            }
          }
        }
      }
    }
  }

  if (!dType) dType = "percentage";
  return { discountType: dType, discountValue: dVal };
}

/**
 * Format a human-readable discount summary for any offer
 */
export function formatDiscountText(offer) {
  if (!offer) return "";
  const resolved = resolveOfferDiscount(offer);
  const dType = resolved.discountType;
  const dVal = resolved.discountValue;

  if (dType === "bogo" || offer.type === "bogo") {
    return "Buy 2 Get 1 Free";
  }
  if (dType === "fixed") {
    return `Flat ₹${dVal} OFF`;
  }
  if (dType === "free_shipping") {
    return "FREE Shipping";
  }
  return `${dVal}% OFF on Total Order`;
}

/**
 * Check if an offer is currently expired based on date or usage limit
 */
export function isOfferExpired(offer) {
  if (!offer) return false;
  if (offer.expiryDate || offer.expiry_date) {
    const exp = new Date(offer.expiryDate || offer.expiry_date);
    if (!isNaN(exp.getTime()) && new Date() > exp) {
      return true;
    }
  }
  const limit = Number(offer.usageLimit || offer.usage_limit || 0);
  const count = Number(offer.usageCount || offer.usage_count || 0);
  if (limit > 0 && count >= limit) {
    return true;
  }
  return false;
}

/**
 * Check if an offer's start date has arrived
 */
export function isOfferStarted(offer) {
  if (!offer) return true;
  if (offer.startDate || offer.start_date) {
    const start = new Date(offer.startDate || offer.start_date);
    if (!isNaN(start.getTime()) && new Date() < start) {
      return false;
    }
  }
  return true;
}

/**
 * Compute time remaining for limited-time offers with a countdown
 */
export function getTimeRemaining(targetDate) {
  if (!targetDate) return null;
  const total = Date.parse(targetDate) - Date.now();
  if (total <= 0) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes, seconds, isExpired: false };
}

/**
 * Validate and calculate the discount for a coupon applied to cart
 *
 * @param {Object} coupon - The coupon/offer object
 * @param {Array} cartItems - Current items in cart
 * @param {number} subtotal - Total cart value before discounts
 * @returns {Object} { isValid, error, discountAmount, freeShipping, description }
 */
export function validateAndApplyCoupon(coupon, cartItems = [], subtotal = 0) {
  if (!coupon) {
    return { isValid: false, error: "Please provide a valid coupon code.", discountAmount: 0 };
  }

  // 1. Active status check
  const isActive = coupon.isActive !== false && coupon.is_active !== false;
  if (!isActive) {
    return {
      isValid: false,
      error: `Coupon "${coupon.code || coupon.discountCode}" is currently disabled.`,
      discountAmount: 0,
    };
  }

  // 2. Start Date check
  if (!isOfferStarted(coupon)) {
    const start = new Date(coupon.startDate || coupon.start_date).toLocaleDateString("en-IN");
    return {
      isValid: false,
      error: `This promotion has not started yet. Starts on ${start}.`,
      discountAmount: 0,
    };
  }

  // 3. Expiry Date check
  if (coupon.expiryDate || coupon.expiry_date) {
    const exp = new Date(coupon.expiryDate || coupon.expiry_date);
    if (!isNaN(exp.getTime()) && new Date() > exp) {
      return {
        isValid: false,
        error: `Coupon "${coupon.code || coupon.discountCode}" expired on ${exp.toLocaleDateString("en-IN")}.`,
        discountAmount: 0,
      };
    }
  }

  // 4. Usage Limit check
  const usageLimit = Number(coupon.usageLimit || coupon.usage_limit || 0);
  const usageCount = Number(coupon.usageCount || coupon.usage_count || 0);
  if (usageLimit > 0 && usageCount >= usageLimit) {
    return {
      isValid: false,
      error: `Coupon "${coupon.code || coupon.discountCode}" has reached its maximum redemption limit (${usageLimit} uses).`,
      discountAmount: 0,
    };
  }

  // 5. Minimum Order Amount check
  const minOrder = Number(coupon.minOrderAmount || coupon.min_order_amount || 0);
  if (minOrder > 0 && subtotal < minOrder) {
    const diff = minOrder - subtotal;
    return {
      isValid: false,
      error: `Coupon requires a minimum order of ₹${minOrder.toLocaleString("en-IN")}. Add ₹${diff.toLocaleString("en-IN")} more to qualify.`,
      discountAmount: 0,
    };
  }

  // 6. Category / Product restriction check
  const categoryFilter = coupon.category || coupon.applicableCategory;
  if (categoryFilter && categoryFilter !== "All" && categoryFilter !== "all") {
    const matchingItems = cartItems.filter((item) => {
      const cat = String(item.category || "").toLowerCase();
      return cat.includes(String(categoryFilter).toLowerCase());
    });
    if (matchingItems.length === 0) {
      return {
        isValid: false,
        error: `Coupon is valid only for products in the "${categoryFilter}" category.`,
        discountAmount: 0,
      };
    }
  }

  // 7. Calculate Discount based on discountType
  const resolved = resolveOfferDiscount(coupon);
  const dType = resolved.discountType;
  const dVal = resolved.discountValue;
  const maxCap = Number(coupon.maxDiscountCap || coupon.max_discount || 0);

  let discountAmount = 0;
  let freeShipping = false;

  if (dType === "bogo" || coupon.type === "bogo") {
    // Buy 2 Get 1 Free: For every 3 items in cart, 1 item of lowest price is FREE
    const totalQty = cartItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
    if (totalQty < 3) {
      return {
        isValid: false,
        error: `Buy 2 Get 1 Free requires at least 3 items in your cart (Current: ${totalQty}).`,
        discountAmount: 0,
      };
    }
    // Flatten all items by quantity and find lowest priced item(s) to make free
    const allIndividualItems = [];
    cartItems.forEach((it) => {
      for (let i = 0; i < (it.quantity || 1); i++) {
        allIndividualItems.push(Number(it.price || 0));
      }
    });
    allIndividualItems.sort((a, b) => a - b);
    const freeItemCount = Math.floor(totalQty / 3);
    discountAmount = allIndividualItems.slice(0, freeItemCount).reduce((sum, p) => sum + p, 0);
  } else if (dType === "fixed") {
    // Flat ₹ OFF on Total
    discountAmount = Math.min(subtotal, dVal);
  } else if (dType === "free_shipping") {
    // Free Shipping waiver
    freeShipping = true;
    discountAmount = 0;
  } else {
    // Standard percentage discount on total
    discountAmount = Math.round(subtotal * (dVal / 100));
    if (maxCap > 0 && discountAmount > maxCap) {
      discountAmount = maxCap;
    }
  }

  discountAmount = Math.max(0, Math.min(discountAmount, subtotal));

  if (dType !== "bogo" && !freeShipping && discountAmount <= 0) {
    return {
      isValid: false,
      error: `Coupon "${coupon.code || coupon.discountCode}" is valid, but no discount applies to this order.`,
      discountAmount: 0,
    };
  }

  return {
    isValid: true,
    error: null,
    discountAmount,
    freeShipping,
    description: coupon.description || formatDiscountText(coupon),
  };
}

/**
 * Increment usage count of a coupon after an order is placed
 */
export async function incrementCouponUsage(couponCode) {
  if (!couponCode) return;
  const cleanCode = String(couponCode).trim().toUpperCase();
  try {
    const offers = await getOffers();
    const matched = (offers || []).find(
      (o) => String(o.discountCode || o.code || "").toUpperCase() === cleanCode
    );
    if (matched) {
      const currentCount = Number(matched.usageCount || matched.usage_count || 0);
      const updated = {
        ...matched,
        usageCount: currentCount + 1,
        usage_count: currentCount + 1,
      };
      await updateOffer(matched.id, updated);
    }
  } catch (err) {
    console.warn("Could not increment coupon usage count:", err);
  }
}

/**
 * Check if there is an automatic discount (no code needed) that the cart qualifies for
 */
export function findBestAutoDiscount(offers = [], cartItems = [], subtotal = 0) {
  const autoOffers = (offers || []).filter(
    (o) => (o.isAutoApply || o.is_auto_apply) && (o.isActive !== false && o.is_active !== false)
  );

  let bestOffer = null;
  let maxSavings = 0;

  for (const off of autoOffers) {
    const res = validateAndApplyCoupon(off, cartItems, subtotal);
    if (res.isValid && res.discountAmount > maxSavings) {
      maxSavings = res.discountAmount;
      bestOffer = { ...off, calculatedDiscount: res.discountAmount };
    }
  }

  return bestOffer;
}
