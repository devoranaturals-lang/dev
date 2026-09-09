"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  Sparkles, 
  Tag, 
  Clock, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight,
  Gift,
  Truck,
  Percent,
  RefreshCw
} from "lucide-react";
import { getStorefrontSettings, getOffers } from "../lib/supabase";
import { DEFAULT_STOREFRONT_SETTINGS, DEFAULT_OFFERS } from "../lib/initialData";
import { getTimeRemaining } from "../lib/coupons";

export default function AnnouncementBar() {
  const pathname = usePathname();

  // Hide completely on admin and login routes
  const isExcludedRoute = pathname?.startsWith("/admin") || pathname === "/login" || pathname === "/customer/login";

  const [announcements, setAnnouncements] = useState(
    DEFAULT_STOREFRONT_SETTINGS.announcements || []
  );
  const [offers, setOffers] = useState(DEFAULT_OFFERS || []);
  const [announcementEnabled, setAnnouncementEnabled] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Load Storefront Announcements & Active Offers
  const loadData = async () => {
    try {
      const [sfSettings, activeOffers] = await Promise.all([
        getStorefrontSettings(),
        getOffers(),
      ]);

      if (sfSettings) {
        setAnnouncementEnabled(sfSettings.announcement_enabled !== false);
        if (Array.isArray(sfSettings.announcements) && sfSettings.announcements.length > 0) {
          setAnnouncements(sfSettings.announcements);
        }
      }

      if (Array.isArray(activeOffers) && activeOffers.length > 0) {
        setOffers(activeOffers);
      }
    } catch (err) {
      console.error("AnnouncementBar data load error:", err);
    }
  };

  useEffect(() => {
    // 1. Immediately purge any legacy dismissal lock from storage so the bar is always visible on refresh
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("devora_announcement_dismissed");
        localStorage.removeItem("devora_announcement_dismissed");
      } catch (e) {
        // ignore storage access errors
      }
    }

    loadData();

    // 2. Real-time synchronization listeners
    const handleSync = () => loadData();
    const handleStorageChange = (e) => {
      if (
        e.key === "devora_storefront_sync_ping" ||
        e.key === "devora_offers_sync_ping" ||
        e.key === "devora_deleted_offers" ||
        e.key === "devora_mock_offers_v1" ||
        e.key === "devora_mock_storefront_v2"
      ) {
        loadData();
      }
    };

    window.addEventListener("devora_storefront_updated", handleSync);
    window.addEventListener("devora_settings_updated", handleSync);
    window.addEventListener("devora_offers_updated", handleSync);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("devora_storefront_updated", handleSync);
      window.removeEventListener("devora_settings_updated", handleSync);
      window.removeEventListener("devora_offers_updated", handleSync);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);


  // Build unified items to showcase (Active Announcements + Active Offer Banners)
  const items = useMemo(() => {
    const list = [];

    // 1. Active announcements from Storefront CMS (if announcement bar is enabled)
    if (announcementEnabled) {
      const activeAnns = (announcements || []).filter((a) => a.is_active !== false);
      activeAnns.forEach((ann) => {
        list.push({
          id: ann.id || `ann-${ann.text}`,
          type: "announcement",
          badge: ann.highlight_text || "Special Notice",
          text: ann.text,
          link: ann.link || "#products-section",
          linkText: "Shop Now",
          icon: ann.highlight_text?.toLowerCase().includes("free") ? (
            <Truck className="w-3.5 h-3.5 text-amber-950" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-amber-950" />
          ),
        });
      });
    }

    // 2. Active Offer/Coupon promotional banners from Offers CMS
    const activeOfferBanners = (offers || []).filter(
      (o) => (o.isActive !== false && o.is_active !== false) && o.showBanner !== false
    );
    activeOfferBanners.forEach((off) => {
      const code = off.discountCode || off.code;
      list.push({
        id: off.id || `off-${code}`,
        type: "offer",
        badge: off.title || "Special Deal",
        text: off.description || `Use code ${code} for instant savings on your order!`,
        code: code,
        link: "#products-section",
        linkText: "Explore Deal",
        hasTimer: Boolean(off.hasTimer && off.timerEnd),
        timerEnd: off.timerEnd,
        icon: off.type === "bogo" ? (
          <Gift className="w-3.5 h-3.5 text-amber-950" />
        ) : (
          <Percent className="w-3.5 h-3.5 text-amber-950" />
        ),
      });
    });

    // Fallback if none are configured or active
    if (list.length === 0) {
      list.push({
        id: "default-1",
        type: "announcement",
        badge: "Free Delivery",
        text: "Free Pan-India Express Delivery on Orders Above ₹499",
        link: "#products-section",
        linkText: "Shop Now",
        icon: <Truck className="w-3.5 h-3.5 text-amber-950" />,
      });
    }

    return list;
  }, [announcements, offers, announcementEnabled]);

  // Auto-rotate items every 5 seconds (pauses when hovered)
  useEffect(() => {
    if (items.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [items.length, isPaused]);

  const currentItem = items[currentIndex % items.length] || items[0];

  // Countdown timer for time-sensitive deals
  const [timeLeft, setTimeLeft] = useState(null);
  useEffect(() => {
    if (!currentItem?.timerEnd) {
      setTimeLeft(null);
      return;
    }
    const update = () => {
      const remaining = getTimeRemaining(currentItem.timerEnd);
      setTimeLeft(remaining);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [currentItem]);

  const handleCopyCode = (e, code) => {
    e.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  // Resolve link target: if hashtag and on non-home page, prefix with /
  const resolvedLink = useMemo(() => {
    if (!currentItem?.link) return null;
    if (currentItem.link.startsWith("#")) {
      return pathname === "/" ? currentItem.link : `/${currentItem.link}`;
    }
    return currentItem.link;
  }, [currentItem?.link, pathname]);

  const handleLinkClick = (e) => {
    if (currentItem?.link?.startsWith("#") && pathname === "/") {
      e.preventDefault();
      const el = document.querySelector(currentItem.link);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  if (isExcludedRoute || !currentItem) {
    return null;
  }

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative z-50 bg-gradient-to-r from-[#022316] via-[#054332] to-[#022316] text-white border-b border-amber-400/30 shadow-sm transition-all duration-300 select-none min-h-[42px] flex items-center"
    >
      {/* Decorative Golden Accent Glow Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent"></div>

      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Left Arrow Navigation (Multi-items) */}
          {items.length > 1 ? (
            <button
              onClick={handlePrev}
              className="p-1 rounded-full text-brand-200 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer hidden sm:flex items-center justify-center"
              aria-label="Previous announcement"
              title="Previous Notice"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-6 hidden sm:block"></div>
          )}

          {/* Central High-Contrast Announcement Content */}
          <div className="flex-1 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-center">
            
            {/* Luminous High-Contrast Badge */}
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-amber-950 font-black text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full shadow-sm uppercase tracking-wider shrink-0 border border-amber-300">
              {currentItem.icon}
              <span>{currentItem.badge}</span>
            </span>

            {/* Clear, High-Legibility Announcement Text */}
            <span className="text-xs sm:text-sm font-semibold text-white tracking-wide drop-shadow-xs">
              {currentItem.text}
            </span>

            {/* Live Countdown Timer if present */}
            {timeLeft && !timeLeft.isExpired && (
              <span className="inline-flex items-center gap-1 bg-black/40 border border-amber-400/50 px-2 py-0.5 rounded-full text-amber-300 font-mono text-[11px] font-bold shrink-0">
                <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                <span>
                  {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
                  {String(timeLeft.hours).padStart(2, "0")}h : {String(timeLeft.minutes).padStart(2, "0")}m : {String(timeLeft.seconds).padStart(2, "0")}s
                </span>
              </span>
            )}

            {/* Interactive Coupon Code Pill with Copy Action */}
            {currentItem.code && (
              <div className="inline-flex items-center gap-1.5 bg-black/40 px-2.5 py-0.5 rounded-full border border-amber-400/40 text-[11px] shrink-0">
                <Tag className="w-3 h-3 text-amber-400" />
                <span className="text-brand-200">
                  Code: <strong className="font-mono text-amber-300 font-extrabold tracking-wider">{currentItem.code}</strong>
                </span>
                <button
                  type="button"
                  onClick={(e) => handleCopyCode(e, currentItem.code)}
                  className={`ml-1 px-2 py-0.5 rounded text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                    copiedCode
                      ? "bg-emerald-500 text-white"
                      : "bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-xs"
                  }`}
                  title="Copy coupon code"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-2.5 h-2.5" />
                      <span>COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>COPY</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Clickable Action Link */}
            {resolvedLink && (
              <a
                href={resolvedLink}
                onClick={handleLinkClick}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-amber-400 hover:text-amber-950 text-amber-300 font-extrabold text-[11px] sm:text-xs transition-all border border-amber-400/40 shrink-0 group shadow-xs cursor-pointer"
              >
                <span>{currentItem.linkText || "Shop Now"}</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </a>
            )}
          </div>

            {/* Right Navigation Controls */}
            {items.length > 1 && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-bold text-brand-300 font-mono hidden md:inline px-1">
                  {currentIndex + 1}/{items.length}
                </span>
                <button
                  onClick={handleNext}
                  className="p-1 rounded-full text-brand-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer hidden sm:flex items-center justify-center"
                  aria-label="Next announcement"
                  title="Next Notice"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
