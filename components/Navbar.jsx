"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Leaf, Menu, X, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const pathname = usePathname();
  const { cartCount } = useCart();
  const { customerUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);



  const [categories, setCategories] = useState([]);
  const [branding, setBranding] = useState({
    store_name: "Devora Naturals",
    tagline: "Pure Organic Botanical",
    logo_url: "",
  });
  const [navConfig, setNavConfig] = useState({
    sticky: true,
    show_cart: true,
    show_account: true,
    show_categories: true,
    cart_label: "Cart",
    account_label: "Account",
    custom_links: [
      { id: "nav-1", name: "Home", href: "/", is_active: true },
      { id: "nav-2", name: "All Products", href: "/products", is_active: true },
      { id: "nav-3", name: "About Us", href: "/about", is_active: true },
      { id: "nav-4", name: "Contact", href: "/contact", is_active: true },
    ],
  });

  useEffect(() => {
    import("../lib/supabase").then(async ({ getCategories, getContactDetails, getStorefrontSettings }) => {
      try {
        const [cats, settings, sfSettings] = await Promise.all([
          getCategories(),
          getContactDetails(),
          getStorefrontSettings(),
        ]);
        if (cats) setCategories(cats);
        if (settings) {
          setBranding({
            store_name: settings.store_name || "Devora Naturals",
            tagline: settings.tagline || "Pure Organic Botanical",
            logo_url: settings.logo_url || "",
          });
        }
        if (sfSettings?.navbar) {
          setNavConfig((prev) => ({
            ...prev,
            ...sfSettings.navbar,
          }));
        }
      } catch (err) {
        console.error("Failed to load categories/branding for navbar", err);
      }
    });

    const handleSettingsUpdate = (e) => {
      if (e?.detail) {
        if (e.detail.store_name || e.detail.tagline || e.detail.logo_url !== undefined) {
          setBranding((prev) => ({
            store_name: e.detail.store_name || prev.store_name,
            tagline: e.detail.tagline || prev.tagline,
            logo_url: e.detail.logo_url !== undefined ? e.detail.logo_url : prev.logo_url,
          }));
        }
        if (e.detail.navbar) {
          setNavConfig((prev) => ({
            ...prev,
            ...e.detail.navbar,
          }));
        }
      } else {
        import("../lib/supabase").then(async ({ getContactDetails, getStorefrontSettings }) => {
          const [s, sf] = await Promise.all([getContactDetails(), getStorefrontSettings()]);
          if (s) {
            setBranding({
              store_name: s.store_name || "Devora Naturals",
              tagline: s.tagline || "Pure Organic Botanical",
              logo_url: s.logo_url || "",
            });
          }
          if (sf?.navbar) {
            setNavConfig((prev) => ({ ...prev, ...sf.navbar }));
          }
        });
      }
    };

    window.addEventListener("devora_settings_updated", handleSettingsUpdate);
    window.addEventListener("devora_storefront_updated", handleSettingsUpdate);
    return () => {
      window.removeEventListener("devora_settings_updated", handleSettingsUpdate);
      window.removeEventListener("devora_storefront_updated", handleSettingsUpdate);
    };
  }, []);

  const configuredLinks = (Array.isArray(navConfig.custom_links) && navConfig.custom_links.length > 0)
    ? navConfig.custom_links.filter((l) => l.is_active !== false)
    : [
        { name: "Home", href: "/" },
        { name: "All Products", href: "/products" },
        { name: "About Us", href: "/about" },
        { name: "Contact", href: "/contact" },
      ];

  const categoryLinks = (navConfig.show_categories !== false)
    ? categories.map((cat) => ({
        name: cat.name,
        href: `/products?category=${encodeURIComponent(cat.name)}`,
      }))
    : [];

  const finalNavLinks = [];
  if (configuredLinks.length <= 2) {
    finalNavLinks.push(...configuredLinks, ...categoryLinks);
  } else {
    finalNavLinks.push(...configuredLinks.slice(0, 2), ...categoryLinks, ...configuredLinks.slice(2));
  }

  const isSticky = navConfig.sticky !== false;

  // Hide main user nav on admin subpages and dedicated customer login page (after all hooks)
  if (pathname?.startsWith("/admin") || pathname === "/login" || pathname === "/customer/login") {
    return null;
  }

  return (
    <header className={`${isSticky ? "sticky top-0" : "relative"} z-40 bg-brand-900/95 backdrop-blur-md border-b border-brand-800 text-white shadow-lg`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Tagline */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300 overflow-hidden border border-brand-500/30">
              {branding.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt={branding.store_name}
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <Leaf className="w-6 h-6 text-brand-200" />
              )}
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-brand-100 to-brand-300 bg-clip-text text-transparent">
                {branding.store_name}
              </span>
              <span className="block text-[10px] uppercase tracking-widest text-brand-300 font-semibold truncate max-w-[200px] sm:max-w-xs">
                {branding.tagline}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {finalNavLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name + link.href}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-brand-800 text-earth-200 font-semibold shadow-inner"
                      : "text-brand-100 hover:text-earth-200 hover:bg-brand-800/60"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Action Buttons: Cart & Account */}
          <div className="flex items-center space-x-3">
            {navConfig.show_cart !== false && (
              <Link
                href="/cart"
                className="relative p-2.5 text-brand-100 hover:text-white bg-brand-800/80 hover:bg-brand-800 rounded-xl transition-all duration-200 shadow-sm flex items-center gap-2 px-3.5 border border-brand-700/50"
              >
                <ShoppingBag className="w-5 h-5 text-earth-200" />
                <span className="hidden sm:inline text-xs font-semibold">{navConfig.cart_label || "Cart"}</span>
                {mounted && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-earth-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            {navConfig.show_account !== false && (
              <Link
                href={customerUser ? "/account" : "/login"}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-earth-700 hover:bg-earth-800 text-white rounded-lg transition-colors shadow-sm"
              >
                <User className="w-4 h-4" />
                <span suppressHydrationWarning>
                  {mounted && customerUser
                    ? (customerUser.name?.split(" ")[0] || "Account")
                    : "Login"}
                </span>
              </Link>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-brand-100 hover:text-white hover:bg-brand-800"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-brand-800 bg-brand-900 px-4 pt-3 pb-6 space-y-2 shadow-2xl animate-in slide-in-from-top duration-200">
          {finalNavLinks.map((link) => (
            <Link
              key={link.name + link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 text-base font-medium text-brand-100 hover:text-earth-200 hover:bg-brand-800 rounded-lg"
            >
              {link.name}
            </Link>
          ))}
          {navConfig.show_account !== false && (
            <Link
              href={customerUser ? "/account" : "/login"}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 text-base font-medium text-earth-300 hover:text-white hover:bg-brand-800 rounded-lg border-t border-brand-800 mt-2"
            >
              {customerUser ? `Account (${customerUser.name?.split(" ")[0] || "Profile"})` : "Login"}
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
