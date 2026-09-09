"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Star, ArrowRight, Check, RotateCcw, Eye, X, ShieldCheck, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useRouter } from "next/navigation";

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [modalQty, setModalQty] = useState(1);
  const [inWishlist, setInWishlist] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("devora_wishlist");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.includes(product.id)) {
          setInWishlist(true);
        }
      }
    }
  }, [product.id]);

  const toggleWishlist = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const stored = localStorage.getItem("devora_wishlist");
    let parsed = stored ? JSON.parse(stored) : [];
    
    if (inWishlist) {
      parsed = parsed.filter(id => id !== product.id);
    } else {
      parsed.push(product.id);
    }
    
    localStorage.setItem("devora_wishlist", JSON.stringify(parsed));
    setInWishlist(!inWishlist);
  };

  const handleAddToCart = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    addToCart(product, modalQty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    addToCart(product, modalQty);
    router.push("/cart");
  };

  const isReturnable = product.is_returnable !== false;
  const returnDays = product.return_period_days || 7;

  return (
    <>
      <div className="group bg-white rounded-2xl overflow-hidden border border-emerald-900/10 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1">
        {/* Product Image Container (Clickable to view details) */}
        <div className="relative aspect-square w-full bg-emerald-50/50 overflow-hidden">
          <Link href={`/products/${product.id}`} className="block w-full h-full cursor-pointer">
            <img
              src={product.image_url || "https://images.unsplash.com/photo-1608248597263-00079e96047c?auto=format&fit=crop&w=600&q=80"}
              alt={product.name}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
          </Link>
          
          {/* Category Pill Badge */}
          <div className="absolute top-3 left-3 flex flex-col gap-1 items-start pointer-events-none">
            <span className="bg-brand-900/90 text-brand-100 text-[11px] font-semibold px-3 py-1 rounded-full backdrop-blur-md border border-brand-700/50 shadow-sm">
              {product.category}
            </span>
          </div>

          {/* Rating Badge */}
          {product.rating && (
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 pointer-events-none">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{product.rating}</span>
            </div>
          )}

          {/* Wishlist Button */}
          <button
            onClick={toggleWishlist}
            className={`absolute top-12 right-3 p-2 rounded-full backdrop-blur-md shadow-sm transition-all z-10 ${
              inWishlist ? "bg-red-50 text-red-500 hover:bg-red-100" : "bg-white/80 text-slate-400 hover:text-red-500 hover:bg-white"
            }`}
            title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className={`w-4 h-4 ${inWishlist ? "fill-red-500" : ""}`} />
          </button>

          {/* Quick View Hover Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowQuickView(true);
            }}
            className="absolute bottom-3 right-3 bg-white/95 hover:bg-white text-slate-700 hover:text-brand-900 p-2 rounded-xl shadow-md border border-slate-200/80 transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-xs font-bold"
            title="Quick View Details & Return Policy"
          >
            <Eye className="w-3.5 h-3.5 text-brand-800" />
            <span className="hidden sm:inline">Details</span>
          </button>
        </div>

      {/* Product Card Details */}
      <div className="p-5 flex flex-col flex-grow justify-between space-y-4">
        <div>
          <Link href={`/products/${product.id}`}>
            <h3 className="text-lg font-bold text-slate-800 group-hover:text-brand-700 transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          <div className="flex items-center gap-1.5 pt-1">
            {isReturnable ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                <RotateCcw className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{returnDays}d Replacement Available</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                <RotateCcw className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Non-Returnable</span>
              </span>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 font-medium">Price</span>
              <span className="text-xl font-extrabold text-earth-700 mt-0.5">
                ₹{Number(product.price).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddToCart}
              className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
                added
                  ? "bg-emerald-600 text-white"
                  : "bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200"
              }`}
              title="Add to Shopping Cart"
            >
              {added ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
            </button>

            <button
              onClick={handleBuyNow}
              className="px-3.5 py-2.5 bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1"
            >
              <span>Buy</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Quick View Details & Return Policy Modal */}
    {showQuickView && (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
        <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-6 max-h-[90vh] overflow-y-auto">
          {/* Close button */}
          <button
            onClick={() => setShowQuickView(false)}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            {/* Modal Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
              <img
                src={product.image_url || "https://images.unsplash.com/photo-1608248597263-00079e96047c?auto=format&fit=crop&w=600&q=80"}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2">
                <span className="bg-brand-900 text-brand-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  {product.category}
                </span>
              </div>
            </div>

            {/* Modal Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 leading-tight">
                  {product.name}
                </h3>
                {product.rating && (
                  <div className="flex items-center gap-1 text-amber-600 text-xs font-bold mt-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{product.rating} / 5.0</span>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-earth-700">
                  ₹{Number(product.price).toLocaleString("en-IN")}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 leading-relaxed max-h-24 overflow-y-auto">
                {product.description}
              </p>

              {/* Return & Replacement Details Box */}
              <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                isReturnable
                  ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}>
                <div className="flex items-center gap-2">
                  <RotateCcw className={`w-4 h-4 shrink-0 ${isReturnable ? "text-emerald-700" : "text-slate-400"}`} />
                  <span className="font-bold text-sm">
                    {isReturnable
                      ? `${returnDays}-Day Return & Replacement Guarantee`
                      : "Non-Returnable Product"}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {isReturnable
                    ? `Eligible for free doorstep replacement or return within ${returnDays} days of delivery if damaged, defective, or incorrect.`
                    : "This item is sold on a final sale basis and is not eligible for return or replacement."}
                </p>
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs font-bold text-slate-600">Qty:</span>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                    className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="px-3 text-xs font-bold text-slate-800">{modalQty}</span>
                  <button
                    type="button"
                    onClick={() => setModalQty(modalQty + 1)}
                    className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    added
                      ? "bg-emerald-600 text-white"
                      : "bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200"
                  }`}
                >
                  {added ? <Check className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                  <span>{added ? "Added!" : "Add to Cart"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="py-2.5 px-3 bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                >
                  <span>Buy Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* View Full Product Details link */}
              <div className="pt-2 text-center border-t border-slate-100">
                <Link
                  href={`/products/${product.id}`}
                  onClick={() => setShowQuickView(false)}
                  className="text-xs font-bold text-brand-800 hover:text-brand-900 inline-flex items-center gap-1 hover:underline"
                >
                  <span>View Full Product Page &amp; Detailed Policy</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
