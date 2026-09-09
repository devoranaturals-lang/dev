"use client";

import { useState, useEffect } from "react";
import { getOffers } from "../lib/supabase";
import { getTimeRemaining } from "../lib/coupons";
import { Sparkles, Percent, Tag, Clock, Copy, Check, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function OfferBanner() {
  const [offers, setOffers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    async function fetchOffers() {
      try {
        const fetched = await getOffers();
        const active = (fetched || []).filter(
          (o) =>
            (o.isActive !== false && o.is_active !== false) &&
            o.showBanner !== false
        );
        setOffers(active);
      } catch (error) {
        console.error("Failed to load banner offers", error);
      }
    }
    fetchOffers();

    const handleOffersUpdated = () => {
      fetchOffers();
    };

    const handleStorageChange = (e) => {
      if (e.key === "devora_offers_sync_ping" || e.key === "devora_deleted_offers" || e.key === "devora_mock_offers_v1") {
        fetchOffers();
      }
    };

    window.addEventListener("devora_offers_updated", handleOffersUpdated);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("devora_offers_updated", handleOffersUpdated);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const activeOffer = offers.length > 0 ? offers[currentIndex % offers.length] : null;

  // Live countdown timer effect
  useEffect(() => {
    if (!activeOffer?.timerEnd && !activeOffer?.hasTimer) {
      setTimeLeft(null);
      return;
    }
    const target = activeOffer.timerEnd;
    if (!target) return;

    const updateTimer = () => {
      const remaining = getTimeRemaining(target);
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeOffer]);

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeOffer || !isVisible) return null;

  const codeToDisplay = activeOffer.discountCode || activeOffer.code;

  return (
    <div className="relative z-50 bg-gradient-to-r from-[#022316] via-[#054332] to-[#022316] text-white border-b border-amber-400/30 shadow-sm transition-all duration-300 select-none min-h-[42px] flex items-center">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2.5 text-center md:text-left">
          
          {/* Left / Offer Title & Badge */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-start">
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-amber-950 font-black text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full shadow-sm uppercase tracking-wider shrink-0 border border-amber-300">
              {activeOffer.type === "bogo" ? (
                "B2G1 Deal"
              ) : activeOffer.type === "festival" ? (
                <Sparkles className="w-3.5 h-3.5 text-amber-950" />
              ) : (
                <Percent className="w-3.5 h-3.5 text-amber-950" />
              )}
              <span>{activeOffer.title}</span>
            </span>

            <span className="text-xs sm:text-sm font-semibold text-white tracking-wide drop-shadow-xs">
              {activeOffer.description}
            </span>
          </div>

          {/* Center & Right: Countdown Timer, Coupon Pill & Copy Action */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center">
            {/* Live Countdown Timer if present */}
            {timeLeft && !timeLeft.isExpired && (
              <div className="inline-flex items-center gap-1 bg-black/40 border border-amber-400/50 px-2 py-0.5 rounded-full text-amber-300 font-mono text-[11px] font-bold shrink-0">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="font-mono text-[11px] tracking-wide">
                  {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
                  {String(timeLeft.hours).padStart(2, "0")}h :{" "}
                  {String(timeLeft.minutes).padStart(2, "0")}m :{" "}
                  {String(timeLeft.seconds).padStart(2, "0")}s
                </span>
              </div>
            )}

            {/* Coupon Code Pill with Copy Action */}
            {codeToDisplay && (
              <div className="inline-flex items-center gap-1.5 bg-black/40 px-2.5 py-0.5 rounded-full border border-amber-400/40 text-[11px] shrink-0">
                <Tag className="w-3 h-3 text-amber-400" />
                <span className="text-brand-200">
                  Use: <strong className="font-mono text-amber-300 font-extrabold tracking-wider">{codeToDisplay}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(codeToDisplay)}
                  className="ml-1 px-2 py-0.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-amber-950 rounded-md text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                  title="Copy coupon code"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-700 font-black" />
                      <span className="font-black">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* If multiple offers, show Next button */}
            {offers.length > 1 && (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => (prev + 1) % offers.length)}
                className="text-[10px] font-bold text-brand-300 hover:text-white px-2 py-1 bg-brand-800/60 hover:bg-brand-800 rounded-lg flex items-center gap-0.5 transition-colors"
                title="View next offer"
              >
                <span>Next ({((currentIndex % offers.length) + 1)}/{offers.length})</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
