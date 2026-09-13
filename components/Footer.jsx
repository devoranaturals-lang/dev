"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Leaf,
  Heart,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Facebook,
  Youtube,
  MessageCircle,
  Twitter,
  Linkedin,
  Globe,
  Send,
  Share2,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
  getContactDetails,
  getStorefrontSettings,
  getCategories,
  isDemoContactEmail,
  isDemoContactPhone,
  isDemoContactAddress,
  isDemoCategory,
} from "../lib/supabase";

function getSocialIcon(iconName) {
  switch (iconName) {
    case "Instagram":
      return Instagram;
    case "Facebook":
      return Facebook;
    case "Youtube":
      return Youtube;
    case "MessageCircle":
      return MessageCircle;
    case "Twitter":
      return Twitter;
    case "Linkedin":
      return Linkedin;
    case "Send":
      return Send;
    case "Globe":
      return Globe;
    case "Share2":
      return Share2;
    default:
      return Share2;
  }
}

export default function Footer() {
  const pathname = usePathname();
  const [categories, setCategories] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("devora_mock_categories_v1");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed.filter((c) => !isDemoCategory(c));
          }
        }
      } catch (_) {}
    }
    return [];
  });
  const [contactDetails, setContactDetails] = useState({
    store_name: "Devora Naturals",
    tagline: "Pure Organic Botanical",
    logo_url: "",
    email: "",
    phone: "",
    address: "",
    social_links_enabled: true,
    social_links: [],
  });

  const [footerConfig, setFooterConfig] = useState({
    description: "",
    show_social_links: true,
    social_heading: "Follow Us Online",
    col1_heading: "Categories",
    col1_show_dynamic_categories: true,
    col1_links: [],
    col2_heading: "Devora Naturals",
    col2_links: [
      { id: "fcol2-1", label: "About Our Brand", href: "/about", is_active: true },
      { id: "fcol2-2", label: "Contact & Support", href: "/contact", is_active: true },
    ],
    col3_heading: "Contact Us",
    show_contact_email: true,
    show_contact_phone: true,
    show_contact_address: true,
    show_social_badges: true,
    copyright_text: "Devora Naturals. All Rights Reserved.",
    badge_text: "Handcrafted for natural wellness",
    show_bottom_badge: true,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const [contactData, sfData, cats] = await Promise.all([
          getContactDetails(),
          getStorefrontSettings(),
          getCategories(),
        ]);
        if (contactData || sfData) {
          setContactDetails((prev) => ({
            ...prev,
            ...(contactData || {}),
            email: isDemoContactEmail(contactData?.email) ? "" : (contactData?.email || prev.email),
            phone: isDemoContactPhone(contactData?.phone) ? "" : (contactData?.phone || prev.phone),
            address: isDemoContactAddress(contactData?.address) ? "" : (contactData?.address || prev.address),
            store_name: sfData?.store_name || contactData?.store_name || "Devora Naturals",
            tagline: sfData?.tagline !== undefined ? sfData.tagline : (contactData?.tagline || ""),
            logo_url: sfData?.logo_url !== undefined ? sfData.logo_url : (contactData?.logo_url || ""),
          }));
        }
        if (cats) setCategories(cats);
        const desc = sfData?.footer?.description || sfData?.description || contactData?.description || "";
        if (sfData?.footer) {
          setFooterConfig((prev) => ({
            ...prev,
            ...sfData.footer,
            description: desc,
          }));
        } else if (desc) {
          setFooterConfig((prev) => ({
            ...prev,
            description: desc,
          }));
        }
      } catch (e) {
        console.error("Footer fetch error:", e);
      }
    }
    loadSettings();

    const handleSettingsUpdate = (e) => {
      if (e?.type === "devora_categories_updated") {
        if (e.detail && Array.isArray(e.detail)) {
          setCategories(e.detail);
        } else {
          getCategories(true).then((cats) => {
            if (cats) setCategories(cats);
          }).catch(() => {});
        }
        return;
      }
      if (e?.detail) {
        if (e.detail.email !== undefined || e.detail.phone !== undefined || e.detail.address !== undefined || e.detail.store_name || e.detail.logo_url !== undefined || e.detail.social_links) {
          setContactDetails((prev) => ({
            ...prev,
            ...e.detail,
            email: isDemoContactEmail(e.detail.email) ? "" : (e.detail.email !== undefined ? e.detail.email : prev.email),
            phone: isDemoContactPhone(e.detail.phone) ? "" : (e.detail.phone !== undefined ? e.detail.phone : prev.phone),
            address: isDemoContactAddress(e.detail.address) ? "" : (e.detail.address !== undefined ? e.detail.address : prev.address),
          }));
        }
        if (e.detail.footer) {
          setFooterConfig((prev) => ({
            ...prev,
            ...e.detail.footer,
            description: e.detail.footer?.description || e.detail.description || prev.description || "",
          }));
        } else if (e.detail.description !== undefined) {
          setFooterConfig((prev) => ({
            ...prev,
            description: e.detail.description || "",
          }));
        }
      } else {
        loadSettings();
      }
    };

    const handleStorageChange = (e) => {
      if (
        e.key === "devora_settings_sync_ping" ||
        e.key === "devora_storefront_sync_ping" ||
        e.key === "devora_categories_sync_ping" ||
        e.key === "devora_mock_settings_v1" ||
        e.key === "devora_mock_storefront_v2" ||
        e.key === "devora_mock_categories_v1"
      ) {
        loadSettings();
      }
    };

    window.addEventListener("devora_settings_updated", handleSettingsUpdate);
    window.addEventListener("devora_storefront_updated", handleSettingsUpdate);
    window.addEventListener("devora_categories_updated", handleSettingsUpdate);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("devora_settings_updated", handleSettingsUpdate);
      window.removeEventListener("devora_storefront_updated", handleSettingsUpdate);
      window.removeEventListener("devora_categories_updated", handleSettingsUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  if (pathname?.startsWith("/admin") || pathname === "/login" || pathname === "/customer/login") {
    return null;
  }

  const isSocialEnabled = contactDetails.social_links_enabled !== false && footerConfig.show_social_links !== false;
  const activeLinks = isSocialEnabled
    ? (Array.isArray(contactDetails.social_links) && contactDetails.social_links.length > 0
        ? contactDetails.social_links.filter((l) => l.is_active !== false && Boolean(l.url))
        : [
            contactDetails.instagram_url ? { id: "ig", title: "Instagram", url: contactDetails.instagram_url, icon: "Instagram" } : null,
            contactDetails.facebook_url ? { id: "fb", title: "Facebook", url: contactDetails.facebook_url, icon: "Facebook" } : null,
            contactDetails.youtube_url ? { id: "yt", title: "YouTube", url: contactDetails.youtube_url, icon: "Youtube" } : null,
            contactDetails.whatsapp ? { id: "wa", title: "WhatsApp", url: `https://wa.me/91${contactDetails.whatsapp}`, icon: "MessageCircle" } : null,
          ].filter(Boolean))
    : [];

  // Determine Column 1 links (Categories)
  const isDemoCatLink = (l) => {
    const id = String(l?.id || "");
    const label = String(l?.label || "").toLowerCase();
    return (
      ["fcol1-1", "fcol1-2", "fcol1-3"].includes(id) ||
      label.includes("skin care essentials") ||
      label.includes("ayurvedic hair oils") ||
      label.includes("sacred pooja dhoop")
    );
  };

  const dynamicCategoryLinks = (footerConfig.col1_show_dynamic_categories !== false && categories.length > 0)
    ? categories.map((cat) => ({
        id: `cat-${cat.id || cat.name}`,
        label: cat.name,
        href: `/products?category=${encodeURIComponent(cat.name)}`,
      }))
    : [];

  const customCol1Links = (Array.isArray(footerConfig.col1_links) ? footerConfig.col1_links : [])
    .filter((l) => l.is_active !== false && !isDemoCatLink(l));

  const finalCol1Links = dynamicCategoryLinks.length > 0
    ? [...dynamicCategoryLinks, ...customCol1Links.filter((l) => !dynamicCategoryLinks.some((c) => c.label.toLowerCase() === l.label.toLowerCase()))]
    : (customCol1Links.length > 0 ? customCol1Links : [{ id: "fcol1-all", label: "View Full Catalog", href: "/products" }]);

  // Determine Column 2 links (strictly exclude Customer Account)
  const finalCol2Links = (Array.isArray(footerConfig.col2_links) ? footerConfig.col2_links : [])
    .filter((l) => l.is_active !== false && String(l.id) !== "fcol2-3" && (l.label || "").toLowerCase() !== "customer account" && (l.href || "") !== "/account");

  return (
    <footer className="bg-brand-900 text-brand-100 border-t border-brand-800 pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Info Column */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-brand-800 flex items-center justify-center overflow-hidden border border-brand-700/50 shadow-sm flex-shrink-0">
                {contactDetails.logo_url ? (
                  <img
                    src={contactDetails.logo_url}
                    alt={contactDetails.store_name || "Devora Naturals"}
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <Leaf className="w-5 h-5 text-brand-200" />
                )}
              </div>
              <div>
                <span className="text-xl font-bold text-white block">
                  {contactDetails.store_name || "Devora Naturals"}
                </span>
                {contactDetails.tagline && (
                  <span className="block text-[10px] uppercase tracking-widest text-brand-300 font-semibold">
                    {contactDetails.tagline}
                  </span>
                )}
              </div>
            </div>
            {footerConfig.description ? (
              <p className="text-sm text-brand-200/80 leading-relaxed">
                {footerConfig.description}
              </p>
            ) : null}

            {/* Social Media Channels in Brand Column */}
            {activeLinks.length > 0 && (
              <div className="pt-2">
                <p className="text-[11px] font-bold text-brand-300 uppercase tracking-wider mb-2.5">
                  {footerConfig.social_heading || "Follow Us Online"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {activeLinks.map((link) => {
                    const IconComp = getSocialIcon(link.icon);
                    return (
                      <a
                        key={link.id || link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={link.title || "Follow us"}
                        className="w-8 h-8 rounded-full bg-brand-800 hover:bg-brand-700 text-brand-200 hover:text-white flex items-center justify-center transition-all shadow-sm"
                      >
                        <IconComp className="w-4 h-4" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Column 1: Categories / Custom Links */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-base uppercase tracking-wider text-xs">
              {footerConfig.col1_heading || "Categories"}
            </h4>
            <ul className="space-y-2 text-sm text-brand-200/80">
              {finalCol1Links.map((item) => (
                <li key={item.id || item.label + item.href}>
                  <Link href={item.href} className="hover:text-earth-200 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-base uppercase tracking-wider text-xs">
              {footerConfig.col2_heading || "Devora Naturals"}
            </h4>
            <ul className="space-y-2 text-sm text-brand-200/80">
              {finalCol2Links.map((item) => (
                <li key={item.id || item.label + item.href}>
                  <Link href={item.href} className="hover:text-earth-200 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact Details */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-base uppercase tracking-wider text-xs">
              {footerConfig.col3_heading || "Contact Us"}
            </h4>
            <ul className="space-y-2.5 text-sm text-brand-200/80">
              {footerConfig.show_contact_email !== false && contactDetails.email && (
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-earth-300 shrink-0" />
                  <span>{contactDetails.email}</span>
                </li>
              )}
              {footerConfig.show_contact_phone !== false && contactDetails.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-earth-300 shrink-0" />
                  <span>{contactDetails.phone}</span>
                </li>
              )}
              {footerConfig.show_contact_address !== false && contactDetails.address && (
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-earth-300 shrink-0" />
                  <span>{contactDetails.address}</span>
                </li>
              )}

              {/* Official Social Badges in Footer Column */}
              {footerConfig.show_social_badges !== false && activeLinks.length > 0 && (
                <li className="pt-2 border-t border-brand-800/60">
                  <p className="text-[11px] font-semibold text-brand-300 uppercase tracking-wider mb-2">
                    Official Social Channels
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeLinks.map((link) => {
                      const IconComp = getSocialIcon(link.icon);
                      return (
                        <a
                          key={link.id || link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-800/80 hover:bg-brand-700 text-brand-200 hover:text-white transition-all text-xs font-medium"
                        >
                          <IconComp className="w-3.5 h-3.5 text-brand-300" />
                          <span>{link.title || link.platform}</span>
                        </a>
                      );
                    })}
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-brand-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-brand-300 gap-4">
          <p>© {new Date().getFullYear()} {footerConfig.copyright_text || "Devora Naturals. All Rights Reserved."}</p>
          {footerConfig.show_bottom_badge !== false && (
            <p className="flex items-center gap-1">
              <span>{footerConfig.badge_text || "Handcrafted with ❤️ for natural wellness"}</span>
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
