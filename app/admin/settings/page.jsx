"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getContactDetails,
  updateContactDetails,
  resetContactDetails,
} from "../../../lib/supabase";
import { DEFAULT_ABOUT_DATA, DEFAULT_SOCIAL_LINKS } from "../../../lib/initialData";
import {
  Save,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Truck,
  RotateCcw,
  Store,
  Clock,
  Instagram,
  Facebook,
  Youtube,
  ShieldCheck,
  Check,
  AlertCircle,
  Download,
  Share2,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  HeartHandshake,
  Leaf,
  Award,
  BookOpen,
  X,
  Twitter,
  Linkedin,
  Globe,
  Send,
  ExternalLink,
  Link as LinkIcon,
  Sun,
  Moon,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { useAdminTheme } from "../../../context/AdminThemeContext";

const ABOUT_ICONS = [
  { name: "Sparkles", label: "Sparkles", icon: Sparkles },
  { name: "HeartHandshake", label: "Care & Trust", icon: HeartHandshake },
  { name: "ShieldCheck", label: "Security & Purity", icon: ShieldCheck },
  { name: "Leaf", label: "Natural Botanical", icon: Leaf },
  { name: "Award", label: "Quality Standards", icon: Award },
  { name: "BookOpen", label: "Ancient Wisdom", icon: BookOpen },
];

const SOCIAL_ICON_OPTIONS = [
  { name: "Instagram", label: "Instagram", icon: Instagram, color: "text-pink-600 bg-pink-50" },
  { name: "Facebook", label: "Facebook", icon: Facebook, color: "text-blue-600 bg-blue-50" },
  { name: "Youtube", label: "YouTube", icon: Youtube, color: "text-red-600 bg-red-50" },
  { name: "MessageCircle", label: "WhatsApp", icon: MessageCircle, color: "text-emerald-600 bg-emerald-50" },
  { name: "Twitter", label: "Twitter / X", icon: Twitter, color: "text-sky-500 bg-sky-50" },
  { name: "Linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-700 bg-blue-50" },
  { name: "Send", label: "Telegram", icon: Send, color: "text-cyan-600 bg-cyan-50" },
  { name: "Globe", label: "Website", icon: Globe, color: "text-slate-700 bg-slate-100" },
  { name: "Share2", label: "General Link", icon: Share2, color: "text-amber-600 bg-amber-50" },
];

const SOCIAL_PLATFORM_PRESETS = [
  { platform: "Instagram", title: "Instagram", icon: "Instagram", placeholder: "https://instagram.com/devoranaturals" },
  { platform: "Facebook", title: "Facebook", icon: "Facebook", placeholder: "https://facebook.com/devoranaturals" },
  { platform: "YouTube", title: "YouTube", icon: "Youtube", placeholder: "https://youtube.com/@devoranaturals" },
  { platform: "WhatsApp", title: "WhatsApp Chat", icon: "MessageCircle", placeholder: "https://wa.me/918608540400" },
  { platform: "Twitter / X", title: "Twitter / X", icon: "Twitter", placeholder: "https://x.com/devoranaturals" },
  { platform: "LinkedIn", title: "LinkedIn Page", icon: "Linkedin", placeholder: "https://linkedin.com/company/devora" },
  { platform: "Telegram", title: "Telegram Channel", icon: "Send", placeholder: "https://t.me/devoranaturals" },
  { platform: "Website", title: "Official Website", icon: "Globe", placeholder: "https://devoranaturals.com" },
  { platform: "Custom Link", title: "Custom Link", icon: "Share2", placeholder: "https://..." },
];

const SETTINGS_TABS = [
  { id: "all", label: "All Settings", icon: Store },
  { id: "contact", label: "Contact & Support", icon: Mail },
  { id: "shipping", label: "State Shipping", icon: Truck },
  { id: "return", label: "Return Policy", icon: RotateCcw },
  { id: "about", label: "About Us CMS", icon: BookOpen },
  { id: "whatsapp", label: "WhatsApp Order", icon: MessageCircle },
  { id: "social", label: "Social Media Links", icon: Share2 },
  { id: "appearance", label: "Admin Theme", icon: Moon },
];

export default function AdminSettingsPage() {
  const [formData, setFormData] = useState({
    store_name: "Devora Naturals",
    tagline: "Pure Organic Botanical",
    logo_url: "",
    email: "support@devoranaturals.com",
    phone: "+91 8608540400",
    address: "Kerala Botanical Organic Farm, India",
    whatsapp: "8608540400",
    free_shipping_threshold: 499,
    state_shipping_enabled: true,
    shipping_charge_tamilnadu: 50,
    shipping_charge_other_states: 100,
    standard_shipping_charge: 50,
    delivery_estimate: "Tamil Nadu: 1-2 Days | Other States: 3-5 Business Days",
    support_hours: "Mon - Sat: 9:00 AM - 7:00 PM IST",
    order_prefix: "DEV-",
    instagram_url: "https://instagram.com/devoranaturals",
    facebook_url: "https://facebook.com/devoranaturals",
    youtube_url: "https://youtube.com/@devoranaturals",
    // Social Links & Channels Management
    social_links_enabled: true,
    social_links: DEFAULT_SOCIAL_LINKS,
    // Return & Replacement switch & details
    return_policy_enabled: true,
    return_window_days: 7,
    return_policy_text: "7-Day Easy Replacement Guarantee for damaged or defective items",
    // About Us configurations
    about_badge: DEFAULT_ABOUT_DATA.badge,
    about_title: DEFAULT_ABOUT_DATA.title,
    about_description: DEFAULT_ABOUT_DATA.description,
    about_cards: DEFAULT_ABOUT_DATA.cards,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "identity" | "shipping" | "return" | "about" | "whatsapp" | "social" | "appearance"
  const { isDark, toggleTheme, setTheme } = useAdminTheme();

  // About Us Card Add/Edit Modal
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCardIndex, setEditingCardIndex] = useState(null);
  const [cardForm, setCardForm] = useState({
    title: "",
    description: "",
    icon: "Sparkles",
  });

  // Card Delete Confirmation Modal
  const [cardToDeleteIndex, setCardToDeleteIndex] = useState(null);

  // Social Link Modal & Management States
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLinkIndex, setEditingLinkIndex] = useState(null);
  const [linkForm, setLinkForm] = useState({
    platform: "Instagram",
    title: "",
    url: "",
    icon: "Instagram",
    is_active: true,
  });
  const [linkToDeleteIndex, setLinkToDeleteIndex] = useState(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await getContactDetails();
        if (data) {
          setFormData((prev) => ({
            ...prev,
            ...data,
            logo_url: data.logo_url || "",
            tagline: data.tagline || "Pure Organic Botanical",
            store_name: data.store_name || "Devora Naturals",
            free_shipping_threshold:
              data.free_shipping_threshold !== undefined ? data.free_shipping_threshold : 499,
            state_shipping_enabled:
              data.state_shipping_enabled !== undefined ? Boolean(data.state_shipping_enabled) : true,
            shipping_charge_tamilnadu:
              data.shipping_charge_tamilnadu !== undefined ? data.shipping_charge_tamilnadu : 50,
            shipping_charge_other_states:
              data.shipping_charge_other_states !== undefined ? data.shipping_charge_other_states : 100,
            standard_shipping_charge:
              data.standard_shipping_charge !== undefined ? data.standard_shipping_charge : 50,
            return_policy_enabled:
              data.return_policy_enabled !== undefined ? Boolean(data.return_policy_enabled) : true,
            return_window_days:
              data.return_window_days !== undefined ? Number(data.return_window_days) : 7,
            return_policy_text:
              data.return_policy_text || "7-Day Easy Replacement Guarantee for damaged or defective items",
            about_badge: data.about_badge || DEFAULT_ABOUT_DATA.badge,
            about_title: data.about_title || DEFAULT_ABOUT_DATA.title,
            about_description: data.about_description || DEFAULT_ABOUT_DATA.description,
            about_cards:
              data.about_cards && Array.isArray(data.about_cards) && data.about_cards.length > 0
                ? data.about_cards
                : DEFAULT_ABOUT_DATA.cards,
            social_links_enabled:
              data.social_links_enabled !== undefined ? Boolean(data.social_links_enabled) : true,
            social_links:
              data.social_links && Array.isArray(data.social_links) && data.social_links.length > 0
                ? data.social_links
                : DEFAULT_SOCIAL_LINKS,
          }));
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleReturnPolicy = () => {
    setFormData((prev) => ({
      ...prev,
      return_policy_enabled: !prev.return_policy_enabled,
    }));
  };

  const handleToggleStateShipping = () => {
    setFormData((prev) => ({
      ...prev,
      state_shipping_enabled: prev.state_shipping_enabled !== undefined ? !prev.state_shipping_enabled : false,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessMsg("");
      await updateContactDetails(formData);
      setSuccessMsg("All store settings and customer-side policies updated successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (error) {
      console.error("Error updating settings:", error);
      alert("Failed to update settings: " + (error.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    try {
      setResetting(true);
      const defaults = await resetContactDetails();
      setFormData(defaults);
      setShowResetConfirm(false);
      setSuccessMsg("Settings restored to default Devora Naturals configurations!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Failed to reset settings:", err);
      alert("Failed to reset settings.");
    } finally {
      setResetting(false);
    }
  };

  const handleExportBackup = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `devora_settings_backup_${new Date().toISOString().split("T")[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // About Us Cards Handlers
  const openAddCardModal = () => {
    setEditingCardIndex(null);
    setCardForm({
      title: "",
      description: "",
      icon: "Sparkles",
    });
    setCardModalOpen(true);
  };

  const openEditCardModal = (card, idx) => {
    setEditingCardIndex(idx);
    setCardForm({
      title: card.title || "",
      description: card.description || "",
      icon: card.icon || "Sparkles",
    });
    setCardModalOpen(true);
  };

  const handleSaveCard = (e) => {
    e.preventDefault();
    if (!cardForm.title || !cardForm.description) {
      alert("Card Title and Description are required.");
      return;
    }

    const currentCards = [...(formData.about_cards || [])];
    if (editingCardIndex !== null && editingCardIndex >= 0) {
      currentCards[editingCardIndex] = {
        ...currentCards[editingCardIndex],
        ...cardForm,
      };
    } else {
      const newCard = {
        id: `about-${Date.now()}`,
        ...cardForm,
      };
      currentCards.push(newCard);
    }

    setFormData((prev) => ({
      ...prev,
      about_cards: currentCards,
    }));
    setCardModalOpen(false);
  };

  const handleDeleteCard = (idx) => {
    const currentCards = [...(formData.about_cards || [])];
    currentCards.splice(idx, 1);
    setFormData((prev) => ({
      ...prev,
      about_cards: currentCards,
    }));
    setCardToDeleteIndex(null);
  };

  // ================= SOCIAL LINKS TAB HANDLERS =================
  const handleToggleSocialGlobal = () => {
    setFormData((prev) => ({
      ...prev,
      social_links_enabled: !prev.social_links_enabled,
    }));
  };

  const handleToggleLinkActive = (idx) => {
    const updated = [...(formData.social_links || [])];
    if (updated[idx]) {
      updated[idx] = {
        ...updated[idx],
        is_active: updated[idx].is_active === false ? true : false,
      };
      setFormData((prev) => ({ ...prev, social_links: updated }));
    }
  };

  const handleOpenAddLink = () => {
    setEditingLinkIndex(null);
    setLinkForm({
      platform: "Instagram",
      title: "Instagram",
      url: "",
      icon: "Instagram",
      is_active: true,
    });
    setLinkModalOpen(true);
  };

  const handleOpenEditLink = (idx) => {
    const link = formData.social_links[idx];
    if (!link) return;
    setEditingLinkIndex(idx);
    setLinkForm({
      platform: link.platform || "Custom Link",
      title: link.title || "",
      url: link.url || "",
      icon: link.icon || "Share2",
      is_active: link.is_active !== false,
    });
    setLinkModalOpen(true);
  };

  const handleSaveLink = (e) => {
    e.preventDefault();
    if (!linkForm.title || !linkForm.url) {
      alert("Link Title and URL are required.");
      return;
    }

    const currentLinks = [...(formData.social_links || [])];
    if (editingLinkIndex !== null && editingLinkIndex >= 0) {
      currentLinks[editingLinkIndex] = {
        ...currentLinks[editingLinkIndex],
        ...linkForm,
      };
    } else {
      currentLinks.push({
        id: `soc-${Date.now()}`,
        ...linkForm,
      });
    }

    setFormData((prev) => ({
      ...prev,
      social_links: currentLinks,
    }));
    setLinkModalOpen(false);
  };

  const handleDeleteLink = (idx) => {
    const currentLinks = [...(formData.social_links || [])];
    currentLinks.splice(idx, 1);
    setFormData((prev) => ({
      ...prev,
      social_links: currentLinks,
    }));
    setLinkToDeleteIndex(null);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-100 text-brand-800 rounded-2xl">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Store Settings & Policy Hub</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Control standard shipping, Return & Replacement switch, About Us story cards, and store branding
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download JSON backup"
          >
            <Download className="w-4 h-4" />
            <span>Export Backup</span>
          </button>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Restore default settings"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-brand-800/20 transition-all cursor-pointer disabled:opacity-70"
          >
            {saving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2.5 shadow-xs animate-fadeIn">
          <div className="p-1 bg-emerald-600 text-white rounded-full">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs to Fit Setting Options Neatly */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer border ${
                isActive
                  ? "bg-brand-800 text-white border-brand-800 shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-white p-16 rounded-3xl border border-slate-200 shadow-sm text-center space-y-3">
          <RotateCcw className="w-6 h-6 text-brand-800 animate-spin mx-auto" />
          <p className="text-slate-500 text-xs font-semibold">Loading store configurations...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          {/* 1. Store Contact & Customer Support Information */}
          {(activeTab === "all" || activeTab === "contact") && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 w-full animate-in fade-in duration-150">

              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-brand-700" />
                    <span>1. Store Contact & Support Information</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official email, phone, physical address, support hours, and order prefix used in invoices and order communications.
                  </p>
                </div>
              </div>

              {/* CONTACT DETAILS & SUPPORT INFO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-brand-600" /> Support Email
                  </label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="support@devoranaturals.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-brand-600" /> Customer Support Phone
                  </label>
                  <input
                    type="text"
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 8608540400"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-brand-600" /> Farm / Office Physical Address
                  </label>
                  <textarea
                    rows={2}
                    required
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Kerala Botanical Organic Farm, India"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-brand-600" /> Customer Support Hours
                  </label>
                  <input
                    type="text"
                    name="support_hours"
                    value={formData.support_hours}
                    onChange={handleChange}
                    placeholder="Mon - Sat: 9:00 AM - 7:00 PM IST"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Order ID Code Prefix
                  </label>
                  <input
                    type="text"
                    name="order_prefix"
                    value={formData.order_prefix}
                    onChange={handleChange}
                    placeholder="DEV-"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700 uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. State-Based Shipping Charge Controls with ON/OFF Switch */}
          {(activeTab === "all" || activeTab === "shipping") && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 w-full animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-700" />
                    <span>2. State-Based Shipping (Tamil Nadu vs Other States)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Toggle and configure state-specific delivery charges (Tamil Nadu ₹50, Other States ₹100) or flat nationwide rate.
                  </p>
                </div>
              </div>

              {/* Master ON/OFF Switch Row for State-Based Shipping */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                      formData.state_shipping_enabled !== false
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      State-Based Shipping Fee Rules
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formData.state_shipping_enabled !== false
                        ? "ON: Differential pricing enabled (Tamil Nadu ₹" + (formData.shipping_charge_tamilnadu !== undefined ? formData.shipping_charge_tamilnadu : 50) + ", Other States ₹" + (formData.shipping_charge_other_states !== undefined ? formData.shipping_charge_other_states : 100) + ")."
                        : "OFF: State-based pricing disabled. A flat standard delivery fee applies to all states nationwide."}
                    </p>
                  </div>
                </div>

                {/* ON/OFF Switch Button */}
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-black uppercase tracking-wider ${
                      formData.state_shipping_enabled !== false
                        ? "text-emerald-700 font-extrabold"
                        : "text-slate-400"
                    }`}
                  >
                    {formData.state_shipping_enabled !== false ? "ON (ACTIVE)" : "OFF (DISABLED)"}
                  </span>

                  <button
                    type="button"
                    onClick={handleToggleStateShipping}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                      formData.state_shipping_enabled !== false ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
                        formData.state_shipping_enabled !== false ? "translate-x-8" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {formData.state_shipping_enabled !== false ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
                  {/* Tamil Nadu Rate */}
                  <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-emerald-950">
                        Tamil Nadu Shipping (₹)
                      </label>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                        Intrastate
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        name="shipping_charge_tamilnadu"
                        value={formData.shipping_charge_tamilnadu !== undefined ? formData.shipping_charge_tamilnadu : 50}
                        onChange={handleChange}
                        placeholder="50"
                        className="w-full pl-8 pr-4 py-2 bg-emerald-50/30 border border-emerald-300/80 rounded-xl text-xs font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <p className="text-[11px] text-emerald-700 font-medium leading-tight">
                      Applied automatically for customers in Tamil Nadu.
                    </p>
                  </div>

                  {/* Other States Rate */}
                  <div className="bg-white p-4 rounded-xl border border-blue-200/80 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-blue-950">
                        Other States / Rest of India (₹)
                      </label>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                        Interstate
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        name="shipping_charge_other_states"
                        value={formData.shipping_charge_other_states !== undefined ? formData.shipping_charge_other_states : 100}
                        onChange={handleChange}
                        placeholder="100"
                        className="w-full pl-8 pr-4 py-2 bg-blue-50/30 border border-blue-300/80 rounded-xl text-xs font-bold text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <p className="text-[11px] text-blue-700 font-medium leading-tight">
                      Applied for all other Indian states & Union Territories.
                    </p>
                  </div>

                  {/* Free Delivery Threshold */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800">
                        Free Shipping Threshold (₹)
                      </label>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md">
                        Threshold
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        name="free_shipping_threshold"
                        value={formData.free_shipping_threshold}
                        onChange={handleChange}
                        placeholder="499"
                        className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-tight">
                      Orders reaching this value unlock 100% FREE delivery.
                    </p>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Delivery Timeframe Estimate Description
                    </label>
                    <input
                      type="text"
                      name="delivery_estimate"
                      value={formData.delivery_estimate}
                      onChange={handleChange}
                      placeholder="Tamil Nadu: 1-2 Days | Other States: 3-5 Business Days"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                  </div>

                  {/* Live Customer Rules Preview Banner */}
                  <div className="md:col-span-3 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-4 flex items-start gap-3.5">
                    <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-extrabold text-emerald-950">Active Customer Shipping Rates (State-Based: ON)</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-emerald-900">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>Tamil Nadu Orders: <strong className="font-black text-emerald-950">₹{formData.shipping_charge_tamilnadu !== undefined ? formData.shipping_charge_tamilnadu : 50}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span>Other States Orders: <strong className="font-black text-emerald-950">₹{formData.shipping_charge_other_states !== undefined ? formData.shipping_charge_other_states : 100}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>Free Delivery: {Number(formData.free_shipping_threshold) > 0 ? (
                            <strong className="font-black text-emerald-950">Orders ₹{formData.free_shipping_threshold}+</strong>
                          ) : (
                            <span className="text-slate-500">Disabled</span>
                          )}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Flat Standard Shipping Charge for All States (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        name="standard_shipping_charge"
                        value={formData.standard_shipping_charge !== undefined ? formData.standard_shipping_charge : 50}
                        onChange={handleChange}
                        placeholder="50"
                        className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Applied uniformly across all Indian states since state-based shipping is turned OFF.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Free Shipping Order Threshold (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        name="free_shipping_threshold"
                        value={formData.free_shipping_threshold}
                        onChange={handleChange}
                        placeholder="499"
                        className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Orders at or above this value get FREE delivery.
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Delivery Timeframe Estimate Description
                    </label>
                    <input
                      type="text"
                      name="delivery_estimate"
                      value={formData.delivery_estimate}
                      onChange={handleChange}
                      placeholder="3-5 Business Days across India"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                  </div>

                  <div className="md:col-span-2 bg-slate-100 border border-slate-200 rounded-xl p-3.5 flex items-start gap-3">
                    <div className="p-1.5 bg-slate-200 text-slate-700 rounded-lg shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-slate-900">Flat Rate Customer Rule (State-Based: OFF)</p>
                      <p className="text-slate-600 mt-0.5">
                        Customers pay flat <strong className="font-extrabold text-slate-900">₹{formData.standard_shipping_charge || 0}</strong> delivery nationwide.
                        {Number(formData.free_shipping_threshold) > 0 ? (
                          <> Orders of <strong className="font-extrabold text-slate-900">₹{formData.free_shipping_threshold}+</strong> unlock <strong className="font-extrabold text-slate-900">FREE Delivery</strong>.</>
                        ) : (
                          <> Free delivery is disabled.</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Return & Replacement Option Separately with ON/OFF Switch */}
          {(activeTab === "all" || activeTab === "return") && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 w-full animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-emerald-700" />
                    <span>3. Return & Replacement Policy (Store-Wide)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Toggle and configure customer return and replacement guarantee across all customer pages.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
                {/* Switch Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                        formData.return_policy_enabled
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        Store-Wide Return & Replacement
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formData.return_policy_enabled
                          ? "ON: Customers see active Return & Replacement guarantee on products, cart, and checkout."
                          : "OFF: Returns are disabled; products are marked as 'Non-Returnable' on customer side."}
                      </p>
                    </div>
                  </div>

                  {/* Modern ON/OFF Switch Button */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-black uppercase tracking-wider ${
                        formData.return_policy_enabled
                          ? "text-emerald-700 font-extrabold"
                          : "text-slate-400"
                      }`}
                    >
                      {formData.return_policy_enabled ? "ON (ACTIVE)" : "OFF (DISABLED)"}
                    </span>

                    <button
                      type="button"
                      onClick={handleToggleReturnPolicy}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                        formData.return_policy_enabled ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
                          formData.return_policy_enabled ? "translate-x-8" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Return Details when ON */}
                {formData.return_policy_enabled ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Return Window (Days from delivery)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        name="return_window_days"
                        value={formData.return_window_days}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-700"
                      />
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Standard window for replacement claims.
                      </span>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Customer-Facing Policy Guarantee Text
                      </label>
                      <input
                        type="text"
                        name="return_policy_text"
                        value={formData.return_policy_text}
                        onChange={handleChange}
                        placeholder="7-Day Easy Replacement Guarantee for damaged or defective items"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700"
                      />
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Replicated on customer product detail pages, cart, and order summary.
                      </span>
                    </div>

                    <div className="md:col-span-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3">
                      <div className="p-1 bg-emerald-600 text-white rounded-md shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-xs text-emerald-800">
                        <strong>Replication Active:</strong> Customers will see{" "}
                        <span className="underline font-bold">
                          {formData.return_window_days || 7}-Day Replacement Guarantee
                        </span>{" "}
                        on all returnable product pages, order summary side cards, and checkout.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-100 border border-slate-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-slate-600">
                    <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Replication Note:</strong> When switched OFF, customers will see{" "}
                      <span className="font-bold">"Non-Returnable (Herbal / Final Sale)"</span> on
                      product pages.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. About Us Option with Add, Edit, Delete Story Cards */}
          {(activeTab === "all" || activeTab === "about") && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 w-full animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-brand-700" />
                    <span>4. About Us Page Content & Story Cards</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Customize the hero headline, story text, and add/edit/delete cards shown on{" "}
                    <code className="text-brand-800 font-bold bg-brand-50 px-1 py-0.5 rounded">/about</code>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openAddCardModal}
                  className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add About Card</span>
                </button>
              </div>

              <div className="space-y-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Hero Badge / Subtitle
                    </label>
                    <input
                      type="text"
                      name="about_badge"
                      value={formData.about_badge}
                      onChange={handleChange}
                      placeholder="Our Ayurvedic Heritage"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Main Headline / Title
                    </label>
                    <input
                      type="text"
                      name="about_title"
                      value={formData.about_title}
                      onChange={handleChange}
                      placeholder="Rooted in Nature, Crafted with Care"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Brand Story Paragraph
                    </label>
                    <textarea
                      rows={3}
                      name="about_description"
                      value={formData.about_description}
                      onChange={handleChange}
                      placeholder="Describe your brand story, traditional Ayurvedic roots, and dedication..."
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                  </div>
                </div>

                {/* About Cards List (Add / Edit / Delete) */}
                <div className="pt-3 border-t border-slate-200/80">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Story Pillars & Value Cards ({(formData.about_cards || []).length})
                    </p>
                    <span className="text-[11px] text-slate-500">
                      Replicates directly on the customer /about page
                    </span>
                  </div>

                  {(formData.about_cards || []).length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
                      No story cards added yet. Click "+ Add About Card" above to add your first pillar.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {(formData.about_cards || []).map((card, idx) => {
                        return (
                          <div
                            key={card.id || idx}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-50 text-brand-800 rounded-md border border-brand-100">
                                  Icon: {card.icon || "Sparkles"}
                                </span>
                              </div>
                              <h4 className="text-xs font-extrabold text-slate-900 leading-snug line-clamp-1">
                                {card.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">
                                {card.description}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditCardModal(card, idx)}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Edit this card"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setCardToDeleteIndex(idx)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Delete this card"
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
                </div>
              </div>
            </div>
          )}

          {/* 5. WhatsApp Order Integration */}
          {(activeTab === "all" || activeTab === "whatsapp") && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 w-full animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>5. WhatsApp Order Integration</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  The phone number receiving automated order messages from customer checkout.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  WhatsApp Order Number (Country Code + 10-digit number without "+")
                </label>
                <div className="relative max-w-md">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-emerald-600">+</span>
                  <input
                    type="text"
                    required
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    placeholder="918608540400"
                    className="w-full pl-7 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6. Social Media Channels & Links Management */}
          {(activeTab === "all" || activeTab === "social") && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 w-full animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-brand-700" />
                    <span>6. Social Media Channels &amp; Links Management</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official accounts displayed in the customer footer, contact page, and storefront.
                  </p>
                </div>

                {/* Master ON/OFF Switch */}
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl w-fit">
                  <span className="text-xs font-bold text-slate-700">Master Switch:</span>
                  <button
                    type="button"
                    onClick={handleToggleSocialGlobal}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      formData.social_links_enabled ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                    title={formData.social_links_enabled ? "Social Links are ON" : "Social Links are OFF"}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.social_links_enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span
                    className={`text-xs font-black ${
                      formData.social_links_enabled ? "text-emerald-700" : "text-slate-400"
                    }`}
                  >
                    {formData.social_links_enabled ? "ON" : "OFF"}
                  </span>
                </div>
              </div>

              {/* Status Alert Banner */}
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                  formData.social_links_enabled
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Share2
                    className={`w-4 h-4 shrink-0 ${
                      formData.social_links_enabled ? "text-emerald-700" : "text-amber-600"
                    }`}
                  />
                  <span>
                    {formData.social_links_enabled
                      ? "Social links tab is active and visible on customer storefront footer & contact page."
                      : "Social links are globally turned OFF and will be hidden from customer footer & contact page."}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddLink}
                  className="px-3.5 py-1.5 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm shrink-0 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Social Link</span>
                </button>
              </div>

              {/* Links List Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Configured Links ({(formData.social_links || []).length})
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Use individual ON/OFF switches to show or hide specific channels
                  </p>
                </div>

                {(!formData.social_links || formData.social_links.length === 0) ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-3">
                    <Share2 className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-500">No social media links added yet.</p>
                    <button
                      type="button"
                      onClick={handleOpenAddLink}
                      className="px-4 py-2 bg-brand-800 text-white text-xs font-bold rounded-xl hover:bg-brand-900 transition-colors"
                    >
                      + Add Your First Link
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {formData.social_links.map((link, idx) => {
                      const isLinkOn = link.is_active !== false;
                      const IconComp =
                        link.icon === "Instagram"
                          ? Instagram
                          : link.icon === "Facebook"
                          ? Facebook
                          : link.icon === "Youtube"
                          ? Youtube
                          : link.icon === "MessageCircle"
                          ? MessageCircle
                          : link.icon === "Twitter"
                          ? Twitter
                          : link.icon === "Linkedin"
                          ? Linkedin
                          : link.icon === "Send"
                          ? Send
                          : link.icon === "Globe"
                          ? Globe
                          : Share2;

                      return (
                        <div
                          key={link.id || idx}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 bg-white ${
                            isLinkOn
                              ? "border-slate-200 shadow-xs hover:border-brand-300 hover:shadow-md"
                              : "border-slate-200 opacity-60 bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2.5 rounded-xl shrink-0 ${
                                  link.icon === "Instagram"
                                    ? "bg-pink-50 text-pink-600"
                                    : link.icon === "Facebook"
                                    ? "bg-blue-50 text-blue-600"
                                    : link.icon === "Youtube"
                                    ? "bg-red-50 text-red-600"
                                    : link.icon === "MessageCircle"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : link.icon === "Twitter"
                                    ? "bg-sky-50 text-sky-600"
                                    : link.icon === "Linkedin"
                                    ? "bg-blue-50 text-blue-700"
                                    : link.icon === "Send"
                                    ? "bg-cyan-50 text-cyan-600"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                <IconComp className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-slate-900 text-xs truncate">
                                  {link.title || link.platform || "Link"}
                                </h4>
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-brand-800 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                                  title={link.url}
                                >
                                  <span className="truncate">{link.url}</span>
                                  <ExternalLink className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                                </a>
                              </div>
                            </div>

                            {/* Per-Link ON/OFF Switch */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleLinkActive(idx)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                                  isLinkOn ? "bg-emerald-600" : "bg-slate-300"
                                }`}
                                title={isLinkOn ? "Click to turn OFF" : "Click to turn ON"}
                              >
                                <span
                                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                    isLinkOn ? "translate-x-4" : "translate-x-0.5"
                                  }`}
                                />
                              </button>
                              <span
                                className={`text-[10px] font-extrabold ${
                                  isLinkOn ? "text-emerald-700" : "text-slate-400"
                                }`}
                              >
                                {isLinkOn ? "ON" : "OFF"}
                              </span>
                            </div>
                          </div>

                          {/* Bottom Row Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isLinkOn
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {isLinkOn ? "Visible to Customers" : "Hidden"}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditLink(idx)}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Edit this link"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span className="text-[11px]">Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setLinkToDeleteIndex(idx)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Delete this link"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span className="text-[11px]">Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. Admin Workspace Appearance & Dark Mode */}
          {(activeTab === "all" || activeTab === "appearance") && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 w-full animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Moon className="w-4 h-4 text-brand-700" />
                  <span>7. Admin Interface Appearance & Theme</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select your preferred color mode for all administrative workflows and management screens.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Dark Mode Card */}
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isDark
                      ? "border-emerald-500 bg-emerald-950/20 ring-2 ring-emerald-500/30"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-slate-900 text-amber-300 border border-slate-800">
                      <Moon className="w-5 h-5" />
                    </div>
                    {isDark && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1">
                        <Check className="w-3 h-3" /> Active Mode
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Obsidian Dark Theme</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Low-glare, high contrast dark theme designed for extended workspace management.
                    </p>
                  </div>
                </button>

                {/* Light Mode Card */}
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    !isDark
                      ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/30"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600 border border-amber-200">
                      <Sun className="w-5 h-5" />
                    </div>
                    {!isDark && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1">
                        <Check className="w-3 h-3" /> Active Mode
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Classic Clean Light</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bright, natural herbal styling matching standard daylight environments.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            <p className="text-xs text-slate-400">
              Saving updates will instantly sync with the customer storefront navbar, footer, /about page, cart, and checkout.
            </p>

            <button
              type="submit"
              disabled={saving}
              className="bg-brand-800 hover:bg-brand-900 disabled:opacity-50 text-white px-8 py-3.5 rounded-xl text-xs font-bold shadow-md shadow-brand-800/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
            >
              {saving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? "Saving All Settings..." : "Save All Settings"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ================= ABOUT US CARD ADD / EDIT MODAL ================= */}
      {cardModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-100 text-brand-800 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingCardIndex !== null ? "Edit About Us Card" : "Add New About Us Card"}
                </h3>
              </div>
              <button
                onClick={() => setCardModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pillar Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100% Pure Botanical Ingredients"
                  value={cardForm.title}
                  onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Card Icon</label>
                <select
                  value={cardForm.icon}
                  onChange={(e) => setCardForm({ ...cardForm, icon: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold text-slate-800 cursor-pointer"
                >
                  {ABOUT_ICONS.map((ico) => (
                    <option key={ico.name} value={ico.name}>
                      {ico.label} ({ico.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Explain this brand pillar or value in detail..."
                  value={cardForm.description}
                  onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCardModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCardIndex !== null ? "Update Card" : "Add Card"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CARD DELETE CONFIRM MODAL ================= */}
      {cardToDeleteIndex !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Delete About Card?</h3>
                <p className="text-xs text-slate-500">Remove this pillar from the /about page</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete{" "}
              <strong className="text-slate-900">
                "{formData.about_cards[cardToDeleteIndex]?.title}"
              </strong>
              ?
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCardToDeleteIndex(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCard(cardToDeleteIndex)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Card</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= RESET CONFIRM MODAL ================= */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-3 bg-amber-100 rounded-2xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Reset All Settings?</h3>
                <p className="text-xs text-slate-500">Restore factory Devora Naturals configurations</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will restore standard shipping to ₹50, free shipping threshold to ₹499, Return &
              Replacement switch to ON (7 days), and reset About Us story content to official defaults.
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={resetting}
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={handleResetToDefaults}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{resetting ? "Resetting..." : "Yes, Restore Defaults"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SOCIAL LINK ADD / EDIT MODAL ================= */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-100 text-brand-800 rounded-xl">
                  <Share2 className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingLinkIndex !== null ? "Edit Social Media Link" : "Add New Social Media Link"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLink} className="space-y-4 text-xs">
              {/* Quick Presets */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Quick Platform Presets:</label>
                <div className="flex flex-wrap gap-1.5">
                  {SOCIAL_PLATFORM_PRESETS.map((preset) => (
                    <button
                      key={preset.platform}
                      type="button"
                      onClick={() =>
                        setLinkForm((prev) => ({
                          ...prev,
                          platform: preset.platform,
                          title: prev.title ? prev.title : preset.title,
                          icon: preset.icon,
                        }))
                      }
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                        linkForm.platform === preset.platform
                          ? "bg-brand-800 text-white border-brand-800"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {preset.platform}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Link Title / Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Instagram, WhatsApp Support, Twitter / X"
                  value={linkForm.title}
                  onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Destination URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://instagram.com/your_handle or https://wa.me/..."
                  value={linkForm.url}
                  onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Icon Style</label>
                <select
                  value={linkForm.icon}
                  onChange={(e) => setLinkForm({ ...linkForm, icon: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold text-slate-800 cursor-pointer"
                >
                  {SOCIAL_ICON_OPTIONS.map((opt) => (
                    <option key={opt.name} value={opt.name}>
                      {opt.label} Icon
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Switch */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">Link Active Status</span>
                  <span className="text-[11px] text-slate-500">
                    {linkForm.is_active ? "Visible to customers on storefront" : "Hidden from customer view"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setLinkForm({ ...linkForm, is_active: !linkForm.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    linkForm.is_active ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      linkForm.is_active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingLinkIndex !== null ? "Save Changes" : "Add Link"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SOCIAL LINK DELETE CONFIRM MODAL ================= */}
      {linkToDeleteIndex !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Delete Social Link?</h3>
                <p className="text-xs text-slate-500">Remove this channel from customer pages</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete{" "}
              <strong className="text-slate-900">
                "{formData.social_links[linkToDeleteIndex]?.title}"
              </strong>
              ? Customers will no longer see this link.
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setLinkToDeleteIndex(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteLink(linkToDeleteIndex)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Link</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
