"use client";

import { useEffect, useState } from "react";
import {
  Leaf,
  Sparkles,
  HeartHandshake,
  ShieldCheck,
  Award,
  RotateCcw,
  Check,
  Truck,
  Gift,
  Star,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { getAboutContent } from "../../lib/supabase";
import { DEFAULT_ABOUT_DATA } from "../../lib/initialData";

const ICON_MAP = {
  Sparkles,
  HeartHandshake,
  ShieldCheck,
  Leaf,
  Award,
  RotateCcw,
  Check,
  Truck,
  Gift,
  Star,
  Zap,
};

export default function AboutPage() {
  const [aboutData, setAboutData] = useState(DEFAULT_ABOUT_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getAboutContent();
        if (data) {
          setAboutData(data);
        }
      } catch (err) {
        console.error("Failed to load about data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-brand-900 text-white rounded-3xl p-8 sm:p-16 shadow-2xl relative overflow-hidden text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-700/60 text-brand-200 text-xs font-semibold">
          <Leaf className="w-4 h-4 text-emerald-300" />
          <span>{aboutData.badge || "Our Ayurvedic Heritage"}</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          {aboutData.title || "Rooted in Nature, Crafted with Care"}
        </h1>
        <p className="text-brand-100 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto font-light">
          {aboutData.description ||
            "Devora Naturals brings ancient botanical wisdom to modern self-care routines. Every bottle is lovingly formulated using wild-harvested herbs and traditional cold-press extraction."}
        </p>
      </div>

      {/* Dynamic Story Pillars / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {(aboutData.cards || []).map((card) => {
          const IconComponent = ICON_MAP[card.icon] || Sparkles;
          return (
            <div
              key={card.id || card.title}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-3"
            >
              <div className="p-3 bg-brand-50 text-brand-800 rounded-2xl w-fit shadow-xs">
                <IconComponent className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">{card.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{card.description}</p>
            </div>
          );
        })}
      </div>

      {/* Catalog CTA & Social Connect */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-6 max-w-4xl mx-auto">
        <h3 className="text-2xl font-extrabold text-slate-800">
          Experience Authentic Ayurvedic Wellness
        </h3>
        <p className="text-slate-500 text-sm max-w-xl mx-auto">
          From wild-harvested herbs to doorstep delivery, every Devora Naturals creation is backed by purity, tradition, and transparency.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/products"
            className="px-8 py-3.5 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-2xl shadow-lg shadow-brand-800/20 transition-all inline-block text-sm"
          >
            Explore Our Products
          </Link>
          <Link
            href="/contact"
            className="px-8 py-3.5 bg-white hover:bg-slate-100 text-brand-900 font-bold rounded-2xl border border-slate-300 transition-all inline-block text-sm"
          >
            Contact &amp; Support
          </Link>
        </div>
      </div>
    </div>
  );
}
