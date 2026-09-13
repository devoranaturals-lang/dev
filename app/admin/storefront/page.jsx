"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getStorefrontSettings,
  updateStorefrontSettings,
  getContactDetails,
  updateContactDetails,
  getProducts,
  getCategories,
} from "../../../lib/supabase";
import { DEFAULT_STOREFRONT_SETTINGS } from "../../../lib/initialData";
import {
  Layout,
  Save,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Leaf,
  ShieldCheck,
  HeartHandshake,
  Truck,
  Award,
  Star,
  Check,
  Plus,
  Edit2,
  Trash2,
  Upload,
  X,
  ArrowRight,
  ExternalLink,
  RotateCcw,
  Store,
  HelpCircle,
  Tag,
  Megaphone,
  Percent,
  MessageSquare,
  Flame,
  Globe,
  Gift,
  Search,
  Navigation,
  PanelsTopBottom,
  ShoppingBag,
  User,
  Menu,
  Sliders,
  Link as LinkIcon,
  Mail,
  Phone,
  MapPin,
  Heart,
} from "lucide-react";

const ICON_OPTIONS = [
  { name: "Leaf", label: "Leaf / Organic", icon: Leaf },
  { name: "ShieldCheck", label: "Quality / Verified", icon: ShieldCheck },
  { name: "HeartHandshake", label: "Handcrafted / Care", icon: HeartHandshake },
  { name: "Truck", label: "Express Delivery", icon: Truck },
  { name: "Sparkles", label: "Sparkles / Radiant", icon: Sparkles },
  { name: "Award", label: "Award / Certified", icon: Award },
  { name: "Star", label: "Star / Premium", icon: Star },
  { name: "Gift", label: "Gift / Reward", icon: Gift },
  { name: "Percent", label: "Discount / Offer", icon: Percent },
];

const LinkSelector = ({ value, onChange, availableProducts, availableCategories }) => {
  const [linkType, setLinkType] = useState(() => {
    if (value?.startsWith("/products/")) return "product";
    if (value?.startsWith("/category/")) return "category";
    if (value?.startsWith("#")) return "section";
    if (!value) return "product";
    return "custom";
  });

  return (
    <div className="flex gap-2 w-full">
      <select
        value={linkType}
        onChange={(e) => {
          setLinkType(e.target.value);
          if (e.target.value === "custom" || e.target.value === "section") {
            onChange("");
          }
        }}
        className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 text-sm font-semibold text-slate-700 w-1/3"
      >
        <option value="product">Product</option>
        <option value="category">Category</option>
        <option value="section">Page Section</option>
        <option value="custom">Custom URL</option>
      </select>

      {linkType === "product" && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 text-sm font-semibold text-slate-700"
        >
          <option value="">Select a product...</option>
          {availableProducts.map((p) => (
            <option key={p.id} value={`/products/${p.id}`}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {linkType === "category" && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 text-sm font-semibold text-slate-700"
        >
          <option value="">Select a category...</option>
          {availableCategories.map((c) => (
            <option key={c.id} value={`/category/${c.slug || c.id}`}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {linkType === "section" && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 text-sm font-semibold text-slate-700"
        >
          <option value="">Select a section...</option>
          <option value="#products-section">Products Section</option>
          <option value="#faq-section">FAQ Section</option>
          <option value="#testimonials-section">Testimonials Section</option>
        </select>
      )}

      {linkType === "custom" && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. /about or https://..."
          className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 text-sm font-semibold"
        />
      )}
    </div>
  );
};

export default function AdminStorefrontPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState("identity"); // "identity" | "hero" | "announcements" | "value_props" | "promos" | "spotlight" | "testimonials" | "faqs"

  const [form, setForm] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const s = localStorage.getItem("devora_mock_storefront_v2");
        if (s) return { ...DEFAULT_STOREFRONT_SETTINGS, ...JSON.parse(s) };
      } catch (_) {}
    }
    return DEFAULT_STOREFRONT_SETTINGS;
  });

  // Hero Card Add/Edit Modal
  const [heroCardModalOpen, setHeroCardModalOpen] = useState(false);
  const [editingHeroCardIndex, setEditingHeroCardIndex] = useState(null);
  const [heroCardForm, setHeroCardForm] = useState({
    title: "",
    subtitle: "",
    badge: "Bestseller",
    price: "₹499",
    image_url: "",
    link: "#products-section",
    is_active: true,
  });

  // Modals state
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [editingAnnIndex, setEditingAnnIndex] = useState(null);
  const [annForm, setAnnForm] = useState({ text: "", highlight_text: "", link: "#products-section", is_active: true });

  const [valuePropModalOpen, setValuePropModalOpen] = useState(false);
  const [editingVpIndex, setEditingVpIndex] = useState(null);
  const [vpForm, setVpForm] = useState({ title: "", description: "", icon: "Leaf", is_active: true });

  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingPromoIndex, setEditingPromoIndex] = useState(null);
  const [promoCardForm, setPromoCardForm] = useState({
    title: "",
    subtitle: "",
    badge: "Save 20%",
    image_url: "",
    link: "#products-section",
    button_text: "Shop Deal",
    is_active: true,
  });

  const [testimonialModalOpen, setTestimonialModalOpen] = useState(false);
  const [editingTestimonialIndex, setEditingTestimonialIndex] = useState(null);
  const [testimonialForm, setTestimonialForm] = useState({
    customer_name: "",
    location: "",
    rating: 5,
    comment: "",
    product_name: "",
    image_url: "",
    is_verified: true,
    is_active: true,
  });

  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [editingFaqIndex, setEditingFaqIndex] = useState(null);
  const [faqForm, setFaqForm] = useState({
    question: "",
    answer: "",
    category: "General",
    is_active: true,
  });

  // Navbar Modal & States
  const [navLinkModalOpen, setNavLinkModalOpen] = useState(false);
  const [editingNavLinkIndex, setEditingNavLinkIndex] = useState(null);
  const [navLinkForm, setNavLinkForm] = useState({
    name: "",
    href: "/",
    is_active: true,
  });

  // Footer Col 1 Links Modal
  const [fcol1ModalOpen, setFcol1ModalOpen] = useState(false);
  const [editingFcol1Index, setEditingFcol1Index] = useState(null);
  const [fcol1Form, setFcol1Form] = useState({
    label: "",
    href: "/products",
    is_active: true,
  });

  // Footer Col 2 Links Modal
  const [fcol2ModalOpen, setFcol2ModalOpen] = useState(false);
  const [editingFcol2Index, setEditingFcol2Index] = useState(null);
  const [fcol2Form, setFcol2Form] = useState({
    label: "",
    href: "/about",
    is_active: true,
  });

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: string, index: number, title: string }
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Available data for link selectors
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);

  useEffect(() => {
    async function loadSettings(showLoading = false) {
      try {
        if (showLoading) setLoading(true);
        const [data, contact, prods, cats] = await Promise.all([
          getStorefrontSettings(),
          getContactDetails(),
          getProducts(),
          getCategories(),
        ]);
        setAvailableProducts(prods || []);
        setAvailableCategories(cats || []);
        if (data || contact) {
          setForm((prev) => ({
            ...DEFAULT_STOREFRONT_SETTINGS,
            ...(data || {}),
            store_name: contact?.store_name || data?.store_name || "Devora Naturals",
            tagline: contact?.tagline !== undefined ? contact.tagline : (data?.tagline || ""),
            logo_url: contact?.logo_url !== undefined ? contact.logo_url : (data?.logo_url || ""),
            description: data?.description || contact?.description || prev.description || "",
            hero_cards: Array.isArray(data?.hero_cards) ? data.hero_cards : [],
            announcements: Array.isArray(data?.announcements) ? data.announcements : [],
            value_props: Array.isArray(data?.value_props) ? data.value_props : [],
            promos_list: Array.isArray(data?.promos_list) ? data.promos_list : [],
            testimonials: Array.isArray(data?.testimonials) ? data.testimonials : [],
            faqs: Array.isArray(data?.faqs) ? data.faqs : [],
            navbar: data?.navbar || DEFAULT_STOREFRONT_SETTINGS.navbar,
            footer: data?.footer || DEFAULT_STOREFRONT_SETTINGS.footer,
          }));
        }
      } catch (err) {
        console.error("Failed to load storefront settings", err);
      } finally {
        if (showLoading) setLoading(false);
      }
    }
    loadSettings(false);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const [uploadingField, setUploadingField] = useState(null);

  const handleImageUpload = async (e, fieldName = "bestsellerImage") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(fieldName);
    try {
      const { uploadStorefrontImage } = await import("../../../lib/supabase");
      const publicUrl = await uploadStorefrontImage(file, fieldName);
      setForm((prev) => ({ ...prev, [fieldName]: publicUrl }));
      setSuccessMsg("Image uploaded successfully to Supabase Storage!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.warn("Upload via API failed, using base64 fallback:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setForm((prev) => ({ ...prev, [fieldName]: reader.result }));
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingField(null);
    }
  };

  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    try {
      const updatedForm = {
        ...form,
        footer: {
          ...(form.footer || {}),
          description: form.description || form.footer?.description || "",
        },
      };
      await Promise.all([
        updateStorefrontSettings(updatedForm),
        updateContactDetails({
          store_name: form.store_name,
          tagline: form.tagline,
          logo_url: form.logo_url,
          description: form.description,
        }),
      ]);
      setSuccessMsg("Storefront branding and design saved successfully! Live website has been updated.");
      setTimeout(() => setSuccessMsg(""), 4500);
    } catch (err) {
      console.error(err);
      alert("Failed to update storefront settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setResetting(true);
    try {
      await updateStorefrontSettings(DEFAULT_STOREFRONT_SETTINGS);
      setForm(DEFAULT_STOREFRONT_SETTINGS);
      setShowResetConfirm(false);
      setSuccessMsg("Storefront restored to official Devora Naturals defaults!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error(err);
      alert("Failed to restore defaults.");
    } finally {
      setResetting(false);
    }
  };

  // ================= CRUD: NAVBAR NAVIGATION LINKS =================
  const openNavLinkModal = (index = null) => {
    if (index !== null) {
      setEditingNavLinkIndex(index);
      setNavLinkForm({ ...(form.navbar?.custom_links || [])[index] });
    } else {
      setEditingNavLinkIndex(null);
      setNavLinkForm({
        name: "",
        href: "/",
        is_active: true,
      });
    }
    setNavLinkModalOpen(true);
  };

  const handleSaveNavLink = (e) => {
    e.preventDefault();
    const links = [...(form.navbar?.custom_links || [])];
    if (editingNavLinkIndex !== null) {
      links[editingNavLinkIndex] = { ...navLinkForm, id: links[editingNavLinkIndex].id || `nav-${Date.now()}` };
    } else {
      links.push({ ...navLinkForm, id: `nav-${Date.now()}` });
    }
    setForm({
      ...form,
      navbar: {
        ...(form.navbar || DEFAULT_STOREFRONT_SETTINGS.navbar),
        custom_links: links,
      },
    });
    setNavLinkModalOpen(false);
  };

  const handleToggleNavLink = (index) => {
    const links = [...(form.navbar?.custom_links || [])];
    links[index] = { ...links[index], is_active: !links[index].is_active };
    setForm({
      ...form,
      navbar: {
        ...(form.navbar || DEFAULT_STOREFRONT_SETTINGS.navbar),
        custom_links: links,
      },
    });
  };

  const handleNavbarToggle = (key, value) => {
    setForm({
      ...form,
      navbar: {
        ...(form.navbar || DEFAULT_STOREFRONT_SETTINGS.navbar),
        [key]: value,
      },
    });
  };

  // ================= CRUD: FOOTER COLUMNS & LINKS =================
  const handleFooterSettingChange = (key, value) => {
    setForm({
      ...form,
      footer: {
        ...(form.footer || DEFAULT_STOREFRONT_SETTINGS.footer),
        [key]: value,
      },
    });
  };

  const openFcol1Modal = (index = null) => {
    if (index !== null) {
      setEditingFcol1Index(index);
      setFcol1Form({ ...(form.footer?.col1_links || [])[index] });
    } else {
      setEditingFcol1Index(null);
      setFcol1Form({ label: "", href: "/products", is_active: true });
    }
    setFcol1ModalOpen(true);
  };

  const handleSaveFcol1 = (e) => {
    e.preventDefault();
    const links = [...(form.footer?.col1_links || [])];
    if (editingFcol1Index !== null) {
      links[editingFcol1Index] = { ...fcol1Form, id: links[editingFcol1Index].id || `fcol1-${Date.now()}` };
    } else {
      links.push({ ...fcol1Form, id: `fcol1-${Date.now()}` });
    }
    setForm({
      ...form,
      footer: {
        ...(form.footer || DEFAULT_STOREFRONT_SETTINGS.footer),
        col1_links: links,
      },
    });
    setFcol1ModalOpen(false);
  };

  const handleToggleFcol1 = (index) => {
    const links = [...(form.footer?.col1_links || [])];
    links[index] = { ...links[index], is_active: !links[index].is_active };
    setForm({
      ...form,
      footer: {
        ...(form.footer || DEFAULT_STOREFRONT_SETTINGS.footer),
        col1_links: links,
      },
    });
  };

  const openFcol2Modal = (index = null) => {
    if (index !== null) {
      setEditingFcol2Index(index);
      setFcol2Form({ ...(form.footer?.col2_links || [])[index] });
    } else {
      setEditingFcol2Index(null);
      setFcol2Form({ label: "", href: "/about", is_active: true });
    }
    setFcol2ModalOpen(true);
  };

  const handleSaveFcol2 = (e) => {
    e.preventDefault();
    const links = [...(form.footer?.col2_links || [])];
    if (editingFcol2Index !== null) {
      links[editingFcol2Index] = { ...fcol2Form, id: links[editingFcol2Index].id || `fcol2-${Date.now()}` };
    } else {
      links.push({ ...fcol2Form, id: `fcol2-${Date.now()}` });
    }
    setForm({
      ...form,
      footer: {
        ...(form.footer || DEFAULT_STOREFRONT_SETTINGS.footer),
        col2_links: links,
      },
    });
    setFcol2ModalOpen(false);
  };

  const handleToggleFcol2 = (index) => {
    const links = [...(form.footer?.col2_links || [])];
    links[index] = { ...links[index], is_active: !links[index].is_active };
    setForm({
      ...form,
      footer: {
        ...(form.footer || DEFAULT_STOREFRONT_SETTINGS.footer),
        col2_links: links,
      },
    });
  };

  // ================= CRUD: HERO SPOTLIGHT CARDS =================
  const openHeroCardModal = (index = null) => {
    if (index !== null) {
      setEditingHeroCardIndex(index);
      setHeroCardForm({ ...form.hero_cards[index] });
    } else {
      setEditingHeroCardIndex(null);
      setHeroCardForm({
        title: "",
        subtitle: "",
        badge: "Bestseller",
        price: "₹499",
        image_url: "",
        link: "#products-section",
        is_active: true,
      });
    }
    setHeroCardModalOpen(true);
  };

  const handleHeroCardModalImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { uploadStorefrontImage } = await import("../../../lib/supabase");
      const url = await uploadStorefrontImage(file, "hero_cards");
      setHeroCardForm((prev) => ({ ...prev, image_url: url }));
    } catch (err) {
      console.warn("Upload to storage failed, using fallback:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setHeroCardForm((prev) => ({ ...prev, image_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTestimonialModalImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { uploadStorefrontImage } = await import("../../../lib/supabase");
      const url = await uploadStorefrontImage(file, "testimonials");
      setTestimonialForm((prev) => ({ ...prev, image_url: url }));
    } catch (err) {
      console.warn("Upload to storage failed, using fallback:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTestimonialForm((prev) => ({ ...prev, image_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const compressImage = (file, maxWidth = 640, maxHeight = 640, quality = 0.78) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  const handlePromoCardModalImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { uploadStorefrontImage } = await import("../../../lib/supabase");
      const url = await uploadStorefrontImage(file, "promos");
      setPromoCardForm((prev) => ({ ...prev, image_url: url }));
    } catch (err) {
      console.warn("Upload to storage failed, using fallback:", err);
      try {
        const dataUrl = await compressImage(file, 640, 640, 0.78);
        if (dataUrl) {
          setPromoCardForm((prev) => ({ ...prev, image_url: dataUrl }));
          return;
        }
      } catch (_) {}
      const reader = new FileReader();
      reader.onloadend = () => {
        setPromoCardForm((prev) => ({ ...prev, image_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSpotlightImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { uploadStorefrontImage } = await import("../../../lib/supabase");
      const url = await uploadStorefrontImage(file, "spotlight");
      const newForm = { ...form, spotlight_image: url };
      setForm(newForm);
      await updateStorefrontSettings(newForm);
      setSuccessMsg("Spotlight image uploaded and updated on customer homepage!");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.warn("Upload to storage failed, using fallback:", err);
      try {
        const dataUrl = await compressImage(file, 900, 900, 0.82);
        if (dataUrl) {
          const newForm = { ...form, spotlight_image: dataUrl };
          setForm(newForm);
          await updateStorefrontSettings(newForm);
          setSuccessMsg("Spotlight image uploaded and updated on customer homepage!");
          setTimeout(() => setSuccessMsg(""), 3500);
          return;
        }
      } catch (_) {}
      const reader = new FileReader();
      reader.onloadend = async () => {
        const newForm = { ...form, spotlight_image: reader.result };
        setForm(newForm);
        await updateStorefrontSettings(newForm);
        setSuccessMsg("Spotlight image uploaded and updated on customer homepage!");
        setTimeout(() => setSuccessMsg(""), 3500);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHeroBannerImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { uploadStorefrontImage } = await import("../../../lib/supabase");
      const url = await uploadStorefrontImage(file, "hero_banner");
      const newForm = { ...form, hero_banner_image: url };
      setForm(newForm);
      await updateStorefrontSettings(newForm);
      setSuccessMsg("Hero banner image uploaded and updated on live storefront!");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.warn("Upload to storage failed, using fallback:", err);
      try {
        const dataUrl = await compressImage(file, 1600, 1200, 0.85);
        if (dataUrl) {
          const newForm = { ...form, hero_banner_image: dataUrl };
          setForm(newForm);
          await updateStorefrontSettings(newForm);
          setSuccessMsg("Hero banner image uploaded and updated on live storefront!");
          setTimeout(() => setSuccessMsg(""), 3500);
          return;
        }
      } catch (_) {}
      const reader = new FileReader();
      reader.onloadend = async () => {
        const newForm = { ...form, hero_banner_image: reader.result };
        setForm(newForm);
        await updateStorefrontSettings(newForm);
        setSuccessMsg("Hero banner image uploaded and updated on live storefront!");
        setTimeout(() => setSuccessMsg(""), 3500);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleHeroCard = (index) => {
    const updated = [...(form.hero_cards || [])];
    updated[index] = { ...updated[index], is_active: !updated[index].is_active };
    setForm({ ...form, hero_cards: updated });
  };

  const handleSaveHeroCard = async (e) => {
    e.preventDefault();
    const updated = [...(form.hero_cards || [])];
    if (editingHeroCardIndex !== null) {
      updated[editingHeroCardIndex] = { ...heroCardForm, id: updated[editingHeroCardIndex].id || `hcard-${Date.now()}` };
    } else {
      updated.push({ ...heroCardForm, id: `hcard-${Date.now()}` });
    }
    const newForm = { ...form, hero_cards: updated };
    if (updated.length > 0) {
      newForm.bestsellerTitle = updated[0].title;
      newForm.bestsellerSubtitle = updated[0].subtitle;
      newForm.bestsellerImage = updated[0].image_url;
      if (updated[0].price) newForm.bestsellerPrice = updated[0].price;
      if (updated[0].link) newForm.bestsellerLink = updated[0].link;
    }
    setForm(newForm);
    setHeroCardModalOpen(false);
    try {
      await updateStorefrontSettings(newForm);
      setSuccessMsg("Hero card saved and live on storefront!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Auto-save hero card error:", err);
    }
  };

  // ================= CRUD: ANNOUNCEMENTS =================
  const openAnnouncementModal = (index = null) => {
    if (index !== null) {
      setEditingAnnIndex(index);
      setAnnForm({ ...form.announcements[index] });
    } else {
      setEditingAnnIndex(null);
      setAnnForm({
        text: "",
        highlight_text: "Free Delivery",
        link: "#products-section",
        is_active: true,
      });
    }
    setAnnouncementModalOpen(true);
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    const updated = [...(form.announcements || [])];
    if (editingAnnIndex !== null) {
      updated[editingAnnIndex] = { ...annForm, id: updated[editingAnnIndex].id || `ann-${Date.now()}` };
    } else {
      updated.push({ ...annForm, id: `ann-${Date.now()}` });
    }
    const newForm = { ...form, announcements: updated };
    setForm(newForm);
    setAnnouncementModalOpen(false);
    try {
      await updateStorefrontSettings(newForm);
      setSuccessMsg("Announcement saved and live on storefront!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Auto-save announcement error:", err);
    }
  };

  // ================= CRUD: VALUE PROPOSITIONS =================
  const openValuePropModal = (index = null) => {
    if (index !== null) {
      setEditingVpIndex(index);
      setVpForm({ ...form.value_props[index] });
    } else {
      setEditingVpIndex(null);
      setVpForm({
        title: "",
        description: "",
        icon: "Leaf",
        is_active: true,
      });
    }
    setValuePropModalOpen(true);
  };

  const handleSaveValueProp = async (e) => {
    e.preventDefault();
    const updated = [...(form.value_props || [])];
    if (editingVpIndex !== null) {
      updated[editingVpIndex] = { ...vpForm, id: updated[editingVpIndex].id || `vp-${Date.now()}` };
    } else {
      updated.push({ ...vpForm, id: `vp-${Date.now()}` });
    }
    const newForm = { ...form, value_props: updated };
    setForm(newForm);
    setValuePropModalOpen(false);
    try {
      await updateStorefrontSettings(newForm);
      setSuccessMsg("Trust pillar saved and live on storefront!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Auto-save value prop error:", err);
    }
  };

  // ================= CRUD: PROMOTIONAL DEALS =================
  const openPromoModal = (index = null) => {
    if (index !== null) {
      setEditingPromoIndex(index);
      setPromoCardForm({ ...form.promos_list[index] });
    } else {
      setEditingPromoIndex(null);
      setPromoCardForm({
        title: "",
        subtitle: "",
        badge: "Seasonal Deal",
        image_url: "",
        link: "#products-section",
        button_text: "Shop Now",
        is_active: true,
      });
    }
    setPromoModalOpen(true);
  };

  const handleSavePromoCard = async (e) => {
    e.preventDefault();
    const updated = [...(form.promos_list || [])];
    if (editingPromoIndex !== null) {
      updated[editingPromoIndex] = { ...promoCardForm, id: updated[editingPromoIndex].id || `prm-${Date.now()}` };
    } else {
      updated.push({ ...promoCardForm, id: `prm-${Date.now()}` });
    }
    const newForm = { ...form, promos_list: updated };
    setForm(newForm);
    setPromoModalOpen(false);

    // Immediately persist and sync with storefront
    try {
      await updateStorefrontSettings(newForm);
      setSuccessMsg("Seasonal Deal card saved and updated on live storefront!");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.error("Auto-save deal card error:", err);
    }
  };

  // ================= CRUD: TESTIMONIALS =================
  const openTestimonialModal = (index = null) => {
    if (index !== null) {
      setEditingTestimonialIndex(index);
      setTestimonialForm({
        customer_name: "",
        location: "",
        rating: 5,
        comment: "",
        product_name: "Kumkumadi Herbal Radiant Face Oil",
        image_url: "",
        is_verified: true,
        is_active: true,
        ...form.testimonials[index],
      });
    } else {
      setEditingTestimonialIndex(null);
      setTestimonialForm({
        customer_name: "",
        location: "",
        rating: 5,
        comment: "",
        product_name: "Kumkumadi Herbal Radiant Face Oil",
        image_url: "",
        is_verified: true,
        is_active: true,
      });
    }
    setTestimonialModalOpen(true);
  };

  const handleSaveTestimonial = async (e) => {
    e.preventDefault();
    const updated = [...(form.testimonials || [])];
    if (editingTestimonialIndex !== null) {
      updated[editingTestimonialIndex] = { ...testimonialForm, id: updated[editingTestimonialIndex].id || `test-${Date.now()}` };
    } else {
      updated.push({ ...testimonialForm, id: `test-${Date.now()}` });
    }
    const newForm = { ...form, testimonials: updated };
    setForm(newForm);
    setTestimonialModalOpen(false);
    try {
      await updateStorefrontSettings(newForm);
      setSuccessMsg("Customer review saved and live on storefront!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Auto-save testimonial error:", err);
    }
  };

  // ================= CRUD: FAQS =================
  const openFaqModal = (index = null) => {
    if (index !== null) {
      setEditingFaqIndex(index);
      setFaqForm({ ...form.faqs[index] });
    } else {
      setEditingFaqIndex(null);
      setFaqForm({
        question: "",
        answer: "",
        category: "General",
        is_active: true,
      });
    }
    setFaqModalOpen(true);
  };

  const handleSaveFaq = async (e) => {
    e.preventDefault();
    const updated = [...(form.faqs || [])];
    if (editingFaqIndex !== null) {
      updated[editingFaqIndex] = { ...faqForm, id: updated[editingFaqIndex].id || `faq-${Date.now()}` };
    } else {
      updated.push({ ...faqForm, id: `faq-${Date.now()}` });
    }
    const newForm = { ...form, faqs: updated };
    setForm(newForm);
    setFaqModalOpen(false);
    try {
      await updateStorefrontSettings(newForm);
      setSuccessMsg("FAQ item saved and live on storefront!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Auto-save FAQ error:", err);
    }
  };

  // ================= DELETE HANDLER =================
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { type, index } = deleteTarget;
    let newForm = { ...form };

    if (type === "nav_link") {
      const links = [...(form.navbar?.custom_links || [])];
      links.splice(index, 1);
      newForm = {
        ...form,
        navbar: { ...(form.navbar || DEFAULT_STOREFRONT_SETTINGS.navbar), custom_links: links },
      };
    } else if (type === "fcol1_link") {
      const links = [...(form.footer?.col1_links || [])];
      links.splice(index, 1);
      newForm = {
        ...form,
        footer: { ...(form.footer || DEFAULT_STOREFRONT_SETTINGS.footer), col1_links: links },
      };
    } else if (type === "fcol2_link") {
      const links = [...(form.footer?.col2_links || [])];
      links.splice(index, 1);
      newForm = {
        ...form,
        footer: { ...(form.footer || DEFAULT_STOREFRONT_SETTINGS.footer), col2_links: links },
      };
    } else if (type === "hero_cards") {
      const updated = [...(form.hero_cards || [])];
      updated.splice(index, 1);
      newForm = { ...form, hero_cards: updated };
      if (updated.length > 0) {
        newForm.bestsellerTitle = updated[0].title;
        newForm.bestsellerSubtitle = updated[0].subtitle;
        newForm.bestsellerImage = updated[0].image_url;
      }
    } else if (type === "announcements") {
      const updated = [...(form.announcements || [])];
      updated.splice(index, 1);
      newForm = { ...form, announcements: updated };
    } else if (type === "value_props") {
      const updated = [...(form.value_props || [])];
      updated.splice(index, 1);
      newForm = { ...form, value_props: updated };
    } else if (type === "promos_list") {
      const updated = [...(form.promos_list || [])];
      updated.splice(index, 1);
      newForm = { ...form, promos_list: updated };
    } else if (type === "testimonials") {
      const updated = [...(form.testimonials || [])];
      updated.splice(index, 1);
      newForm = { ...form, testimonials: updated };
    } else if (type === "faqs") {
      const updated = [...(form.faqs || [])];
      updated.splice(index, 1);
      newForm = { ...form, faqs: updated };
    }

    setForm(newForm);
    setDeleteTarget(null);

    // Auto-save changes immediately to localStorage and Supabase so customer storefront syncs in real-time
    try {
      await updateStorefrontSettings(newForm);
      setSuccessMsg("Item deleted and removed from live storefront!");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.error("Auto-save on delete failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-8 h-8 text-brand-700 animate-spin" />
        <p className="text-slate-500 font-medium text-sm">Loading storefront CMS editor...</p>
      </div>
    );
  }

  const navTabs = [
    { id: "identity", label: "Logo & Brand Identity", icon: Store },
    { id: "navbar", label: "Customer Navbar", icon: Navigation, count: form.navbar?.custom_links?.length },
    { id: "footer", label: "Customer Footer", icon: PanelsTopBottom, count: ((form.footer?.col1_links?.length || 0) + (form.footer?.col2_links?.length || 0)) },
    { id: "hero", label: "Hero Banner", icon: Layout, count: form.hero_cards?.length },
    { id: "value_props", label: "Trust Pillars", icon: Leaf, count: form.value_props?.length },
    { id: "promos", label: "Offers & Promos", icon: Tag, count: form.promos_list?.length },
    { id: "spotlight", label: "Brand Spotlight", icon: Flame },
    { id: "testimonials", label: "Customer Reviews", icon: MessageSquare, count: form.testimonials?.length },
    { id: "faqs", label: "FAQ Accordion", icon: HelpCircle, count: form.faqs?.length },
    { id: "announcements", label: "Announcement Bar", icon: Megaphone, count: form.announcements?.length },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-brand-100 text-brand-800 rounded-2xl">
              <Layout className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Storefront Design & CMS</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Full frontend control: Add, edit, delete, and toggle all customer homepage sections
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/"
            target="_blank"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Open customer storefront in new tab"
          >
            <Store className="w-4 h-4 text-emerald-600" />
            <span>View Live Store</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Restore default storefront"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-6 py-2.5 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-brand-800/20 transition-all cursor-pointer disabled:opacity-70"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? "Saving Changes..." : "Save Storefront"}</span>
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

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer border ${
                isActive
                  ? "bg-brand-800 text-white border-brand-800 shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB: CUSTOMER PAGE LOGO, TAGLINE & STORE IDENTITY
          ========================================================================= */}
      {activeTab === "identity" && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Store className="w-4 h-4 text-brand-700" />
                  <span>Customer Page Logo, Tagline & Store Identity</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customize your brand logo, tagline slogan, and store name displayed on the storefront navbar and footer.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold self-start sm:self-auto shadow-2xs">
                <Leaf className="w-3.5 h-3.5" /> Customer Storefront Live
              </span>
            </div>

            {/* LIVE CUSTOMER STOREFRONT NAVBAR PREVIEW */}
            <div className="bg-gradient-to-r from-brand-900 via-brand-850 to-brand-950 p-4 sm:p-5 rounded-2xl border border-brand-800 shadow-md text-white">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-brand-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-200">
                    Live Customer Page Header Preview
                  </span>
                </div>
                <span className="text-[10px] bg-brand-800/80 px-2.5 py-0.5 rounded-md text-brand-300 font-medium border border-brand-700/50">
                  Storefront Navbar Simulation
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-900/80 p-3.5 rounded-xl border border-brand-700/50">
                {/* Brand Preview in Header */}
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center shadow-md overflow-hidden border border-brand-500/40 flex-shrink-0">
                    {form.logo_url ? (
                      <img
                        src={form.logo_url}
                        alt={form.store_name || "Logo preview"}
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
                    <span className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-brand-100 to-brand-300 bg-clip-text text-transparent block">
                      {form.store_name || "Devora Naturals"}
                    </span>
                    <span className="block text-[11px] uppercase tracking-widest text-brand-300 font-semibold truncate max-w-[260px] sm:max-w-md">
                      {form.tagline || "Pure Organic Botanical"}
                    </span>
                    {form.description && (
                      <span className="block text-[10px] text-brand-200/80 line-clamp-1 max-w-[260px] sm:max-w-md mt-0.5">
                        {form.description}
                      </span>
                    )}
                  </div>
                </div>

                {/* Dummy Nav items preview */}
                <div className="hidden md:flex items-center gap-2 text-xs text-brand-200/80">
                  <span className="px-3 py-1.5 rounded-lg bg-brand-800 text-earth-200 font-semibold shadow-inner">Home</span>
                  <span className="px-3 py-1.5 hover:text-earth-200">All Products</span>
                  <span className="px-3 py-1.5 hover:text-earth-200">About Us</span>
                  <span className="px-3 py-1.5 hover:text-earth-200">Contact</span>
                </div>
              </div>
            </div>

            {/* LOGO & TAGLINE EDIT CONTROLS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-slate-50/80 rounded-2xl border border-slate-200">
              {/* Brand / Store Name */}
              <div className="md:col-span-1 space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Brand / Store Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="store_name"
                  value={form.store_name || ""}
                  onChange={handleChange}
                  placeholder="Devora Naturals"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-2xs"
                />
                <p className="text-[11px] text-slate-500">
                  Displayed in the storefront navbar, footer, invoices, and tab title.
                </p>
              </div>

              {/* Customer Page Tagline / Slogan */}
              <div className="md:col-span-1 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Customer Page Tagline / Slogan
                  </label>
                  <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                    Navbar & Footer Subtitle
                  </span>
                </div>
                <input
                  type="text"
                  name="tagline"
                  value={form.tagline || ""}
                  onChange={handleChange}
                  placeholder="Pure Organic Botanical"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-2xs"
                />
                {/* Quick Tagline Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-semibold text-slate-400">Presets:</span>
                  {[
                    "Pure Organic Botanical",
                    "Pure Ayurvedic & Botanical Organic Care",
                    "100% Pure & Organic Ayurvedic Care",
                    "Ancient Botanical Herbs & Wellness",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, tagline: preset }))}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                        form.tagline === preset
                          ? "bg-brand-700 text-white border-brand-700 font-bold"
                          : "bg-white text-slate-600 border-slate-200 hover:border-brand-600"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Description / Store Story */}
              <div className="md:col-span-2 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Brand Description / Store Story
                  </label>
                  <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                    Customer Footer Brand Story
                  </span>
                </div>
                <textarea
                  rows={3}
                  name="description"
                  value={form.description || ""}
                  onChange={handleChange}
                  placeholder="Share your brand story, mission, and commitment to pure organic botanical self-care..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-2xs resize-none"
                />
                <p className="text-[11px] text-slate-500">
                  Displayed beneath the brand logo in your customer website footer.
                </p>
              </div>

              {/* Storefront Logo Upload & Direct URL */}
              <div className="md:col-span-2 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-brand-600" />
                      <span>Customer Page Logo Image</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Upload a custom store logo or paste an image URL. If left empty, the botanical leaf icon is displayed.
                    </p>
                  </div>
                  {form.logo_url && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, logo_url: "" }))}
                      className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 self-start sm:self-auto px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Reset to Default Leaf Icon
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
                  {/* Logo Thumbnail Preview */}
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-brand-900 border border-brand-700 flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0 relative group">
                      {form.logo_url ? (
                        <img
                          src={form.logo_url}
                          alt="Logo preview"
                          className="w-full h-full object-contain p-1.5"
                        />
                      ) : (
                        <Leaf className="w-8 h-8 text-brand-300" />
                      )}
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-slate-800">
                        {form.logo_url ? "Custom Logo Active" : "Default Botanical Icon"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {form.logo_url ? "Saved in Supabase Storage" : "Leaf icon rendered in header & footer"}
                      </p>
                    </div>
                  </div>

                  {/* Upload button & URL input */}
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 rounded-xl text-xs font-bold transition-colors">
                        {uploadingField === "logo_url" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-700" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{uploadingField === "logo_url" ? "Uploading to Storage..." : "Upload Logo File (PNG / JPG / SVG / WebP)"}</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                          className="hidden"
                          disabled={uploadingField === "logo_url"}
                          onChange={(e) => handleImageUpload(e, "logo_url")}
                        />
                      </label>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">or image URL</span>
                    </div>

                    <input
                      type="text"
                      name="logo_url"
                      value={form.logo_url || ""}
                      onChange={handleChange}
                      placeholder="Paste image URL (e.g. https://... or data:image/...)"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Save Bar for Logo & Identity Tab */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Changes will immediately update the customer storefront header, navigation bar, and footer.
              </p>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="px-6 py-2.5 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-brand-800/20 transition-all cursor-pointer disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{saving ? "Saving..." : "Save Identity"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB: CUSTOMER NAVBAR CONTROLS & NAVIGATION MENU
          ========================================================================= */}
      {activeTab === "navbar" && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-brand-700" />
                  <span>Customer Page Navbar Controls & Navigation Menu</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customize menu links, sticky header behavior, cart button, and customer account options.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openNavLinkModal()}
                className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Navigation Link</span>
              </button>
            </div>

            {/* LIVE CUSTOMER NAVBAR SIMULATION */}
            <div className="bg-gradient-to-r from-brand-900 via-brand-850 to-brand-950 p-4 sm:p-5 rounded-2xl border border-brand-800 shadow-md text-white">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-brand-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-200">
                    Live Customer Header Simulation
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="bg-brand-800/80 px-2.5 py-0.5 rounded-md text-brand-300 font-medium border border-brand-700/50">
                    {form.navbar?.sticky !== false ? "Sticky Navbar (Fixed Top)" : "Static Scrolling Navbar"}
                  </span>
                  <span className="bg-emerald-900/60 text-emerald-300 px-2.5 py-0.5 rounded-md font-semibold border border-emerald-700/40">
                    {(form.navbar?.custom_links || []).filter((l) => l.is_active !== false).length} Active Links
                  </span>
                </div>
              </div>

              {/* Simulated Customer Navbar Header Bar */}
              <div className="flex items-center justify-between gap-4 bg-brand-900/90 p-3.5 rounded-xl border border-brand-700/60 shadow-inner">
                {/* Brand Preview */}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center shadow-md overflow-hidden border border-brand-500/40 flex-shrink-0">
                    {form.logo_url ? (
                      <img
                        src={form.logo_url}
                        alt="Logo"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <Leaf className="w-5 h-5 text-brand-200" />
                    )}
                  </div>
                  <div>
                    <span className="text-lg font-bold tracking-tight text-white block">
                      {form.store_name || "Devora Naturals"}
                    </span>
                    <span className="block text-[9px] uppercase tracking-widest text-brand-300 font-semibold truncate max-w-[180px]">
                      {form.tagline || "Pure Organic Botanical"}
                    </span>
                  </div>
                </div>

                {/* Simulated Desktop Navigation Links */}
                <div className="hidden md:flex items-center gap-1 text-xs">
                  {((form.navbar?.custom_links || []).filter((l) => l.is_active !== false).length > 0
                    ? (form.navbar?.custom_links || []).filter((l) => l.is_active !== false)
                    : [
                        { name: "Home", href: "/" },
                        { name: "All Products", href: "/products" },
                        { name: "About Us", href: "/about" },
                        { name: "Contact", href: "/contact" },
                      ]
                  ).map((link, idx) => (
                    <span
                      key={idx}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        idx === 0
                          ? "bg-brand-800 text-earth-200 font-semibold shadow-inner"
                          : "text-brand-100 hover:bg-brand-800/60"
                      }`}
                    >
                      {link.name}
                    </span>
                  ))}
                  {form.navbar?.show_categories !== false && (
                    <span className="px-2.5 py-1 rounded-md text-[10px] bg-brand-800/50 text-earth-300 border border-brand-700/50 italic">
                      + Categories
                    </span>
                  )}
                </div>

                {/* Action Buttons: Cart & Account */}
                <div className="flex items-center space-x-2 text-xs">
                  {form.navbar?.show_cart !== false && (
                    <span className="px-3 py-1.5 bg-brand-800 text-brand-100 rounded-xl border border-brand-700/50 flex items-center gap-1.5 font-semibold">
                      <ShoppingBag className="w-3.5 h-3.5 text-earth-200" />
                      <span>{form.navbar?.cart_label || "Cart"} (0)</span>
                    </span>
                  )}
                  {form.navbar?.show_account !== false && (
                    <span className="px-3 py-1.5 bg-earth-700 text-white rounded-lg flex items-center gap-1.5 font-semibold shadow-xs">
                      <User className="w-3.5 h-3.5" />
                      <span>{form.navbar?.account_label || "Account"}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* NAVBAR FUNCTIONAL SWITCHES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Sticky Navbar Toggle */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-brand-100 text-brand-800 rounded-xl">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Sticky Navbar</h4>
                      <p className="text-[11px] text-slate-500">Fix header to top while scrolling</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.navbar?.sticky !== false}
                      onChange={(e) => handleNavbarToggle("sticky", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Include Categories Toggle */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                      <Leaf className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Dynamic Categories</h4>
                      <p className="text-[11px] text-slate-500">Include store categories in menu</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.navbar?.show_categories !== false}
                      onChange={(e) => handleNavbarToggle("show_categories", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Show Cart Button & Label */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Cart Button</h4>
                      <p className="text-[11px] text-slate-500">Display shopping bag button</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.navbar?.show_cart !== false}
                      onChange={(e) => handleNavbarToggle("show_cart", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                <div className="pt-1">
                  <input
                    type="text"
                    value={form.navbar?.cart_label || "Cart"}
                    onChange={(e) => handleNavbarToggle("cart_label", e.target.value)}
                    placeholder="Cart button label"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-700"
                  />
                </div>
              </div>

              {/* Show Account Button & Label */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-sky-100 text-sky-800 rounded-xl">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Account Button</h4>
                      <p className="text-[11px] text-slate-500">Customer login / profile</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.navbar?.show_account !== false}
                      onChange={(e) => handleNavbarToggle("show_account", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                <div className="pt-1">
                  <input
                    type="text"
                    value={form.navbar?.account_label || "Account"}
                    onChange={(e) => handleNavbarToggle("account_label", e.target.value)}
                    placeholder="Account button label"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-700"
                  />
                </div>
              </div>
            </div>

            {/* CUSTOM NAVIGATION LINKS MANAGER */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-brand-700" />
                    <span>Navigation Menu Links ({form.navbar?.custom_links?.length || 0})</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Add custom pages, promotional routes, or category shortcuts to the customer header.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openNavLinkModal()}
                  className="px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Link</span>
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-400">Quick Add:</span>
                {[
                  { name: "Home", href: "/" },
                  { name: "All Products", href: "/products" },
                  { name: "About Us", href: "/about" },
                  { name: "Contact", href: "/contact" },
                  { name: "Deals & Offers", href: "/#deals" },
                  { name: "Pooja Items", href: "/products?category=Pooja Items" },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      const links = [...(form.navbar?.custom_links || [])];
                      if (!links.some((l) => l.href === preset.href)) {
                        links.push({ id: `nav-${Date.now()}`, name: preset.name, href: preset.href, is_active: true });
                        setForm({
                          ...form,
                          navbar: { ...(form.navbar || DEFAULT_STOREFRONT_SETTINGS.navbar), custom_links: links },
                        });
                      }
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-[11px] font-medium border border-slate-200 shadow-2xs transition-colors"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>

              {/* Links List Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(form.navbar?.custom_links || []).map((link, index) => (
                  <div
                    key={link.id || index}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      link.is_active !== false
                        ? "bg-white border-slate-200 shadow-2xs"
                        : "bg-slate-50/70 border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                        #{index + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 text-xs truncate block">
                          {link.name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono truncate block">
                          {link.href}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleNavLink(index)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                          link.is_active !== false
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {link.is_active !== false ? "Active" : "Hidden"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openNavLinkModal(index)}
                        className="p-1.5 text-slate-500 hover:text-brand-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit link"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            type: "nav_link",
                            index,
                            title: link.name,
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Save Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Navbar changes take effect immediately across all customer store pages.
              </p>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="px-6 py-2.5 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-brand-800/20 transition-all cursor-pointer disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{saving ? "Saving..." : "Save Navbar"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB: CUSTOMER FOOTER LAYOUT & CONTENT
          ========================================================================= */}
      {activeTab === "footer" && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <PanelsTopBottom className="w-4 h-4 text-brand-700" />
                  <span>Customer Page Footer Layout, Columns & Content</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Full control over brand description, category links, quick links, contact visibility, and bottom copyright bar.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-200 text-brand-800 rounded-full text-xs font-bold self-start sm:self-auto">
                <Store className="w-3.5 h-3.5" /> Storefront Footer Active
              </span>
            </div>

            {/* LIVE FOOTER PREVIEW CARD */}
            <div className="bg-brand-900 p-6 rounded-2xl border border-brand-800 text-brand-100 shadow-md space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-brand-800/80 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-bold text-brand-200 uppercase tracking-wider text-[11px]">
                    Live Customer Footer Simulation
                  </span>
                </div>
                <span className="text-[10px] text-brand-400">4-Column Desktop Layout Preview</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
                {/* Brand Column Preview */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-800 flex items-center justify-center border border-brand-700 overflow-hidden">
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-0.5" />
                      ) : (
                        <Leaf className="w-4 h-4 text-brand-200" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-white block text-sm">{form.store_name || "Devora Naturals"}</span>
                      <span className="text-[9px] uppercase tracking-wider text-brand-300 block">{form.tagline || "Pure Organic Botanical"}</span>
                    </div>
                  </div>
                  <p className="text-brand-200/70 text-[11px] leading-relaxed line-clamp-3">
                    {form.footer?.description || "Crafting pure, organic herbal products deeply rooted in Ayurvedic heritage."}
                  </p>
                  {form.footer?.show_social_links !== false && (
                    <span className="inline-block text-[10px] text-earth-300 font-semibold mt-1">
                      {form.footer?.social_heading || "Follow Us Online"} (Active)
                    </span>
                  )}
                </div>

                {/* Col 1 Preview */}
                <div className="space-y-2">
                  <h5 className="font-bold text-white uppercase tracking-wider text-[11px]">
                    {form.footer?.col1_heading || "Categories"}
                  </h5>
                  <ul className="space-y-1 text-brand-200/80 text-[11px]">
                    {form.footer?.col1_show_dynamic_categories !== false && (
                      <li className="text-earth-300 font-medium">⚡ Dynamic Store Categories</li>
                    )}
                    {(form.footer?.col1_links || []).filter((l) => l.is_active !== false).map((l, i) => (
                      <li key={i}>{l.label}</li>
                    ))}
                  </ul>
                </div>

                {/* Col 2 Preview */}
                <div className="space-y-2">
                  <h5 className="font-bold text-white uppercase tracking-wider text-[11px]">
                    {form.footer?.col2_heading || "Devora Naturals"}
                  </h5>
                  <ul className="space-y-1 text-brand-200/80 text-[11px]">
                    {(form.footer?.col2_links || []).filter((l) => l.is_active !== false).map((l, i) => (
                      <li key={i}>{l.label}</li>
                    ))}
                  </ul>
                </div>

                {/* Col 3 Preview */}
                <div className="space-y-2">
                  <h5 className="font-bold text-white uppercase tracking-wider text-[11px]">
                    {form.footer?.col3_heading || "Contact Us"}
                  </h5>
                  <ul className="space-y-1 text-brand-200/80 text-[11px]">
                    {form.footer?.show_contact_email !== false && <li>✉ Support Email</li>}
                    {form.footer?.show_contact_phone !== false && <li>📞 Phone / WhatsApp</li>}
                    {form.footer?.show_contact_address !== false && <li>📍 Farm / Store Address</li>}
                    {form.footer?.show_social_badges !== false && <li>🌐 Social Badges</li>}
                  </ul>
                </div>
              </div>

              {/* Footer Bottom Preview */}
              <div className="pt-3 border-t border-brand-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-brand-300 gap-2">
                <span>© {new Date().getFullYear()} {form.footer?.copyright_text || "Devora Naturals. All Rights Reserved."}</span>
                {form.footer?.show_bottom_badge !== false && (
                  <span>{form.footer?.badge_text || "Handcrafted with ❤️ for natural wellness"}</span>
                )}
              </div>
            </div>

            {/* BRAND COLUMN SECTION */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Leaf className="w-4 h-4 text-brand-700" />
                <span>1. Brand Column Information</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Footer Brand Story / Description</label>
                  <textarea
                    rows={3}
                    value={form.footer?.description || ""}
                    onChange={(e) => handleFooterSettingChange("description", e.target.value)}
                    placeholder="Crafting pure, organic herbal products deeply rooted in Ayurvedic heritage..."
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-medium text-slate-800 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-800 block">Show Social Channels</span>
                      <span className="text-[11px] text-slate-500">Display icons in brand column</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.footer?.show_social_links !== false}
                        onChange={(e) => handleFooterSettingChange("show_social_links", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Social Heading</label>
                    <input
                      type="text"
                      value={form.footer?.social_heading || ""}
                      onChange={(e) => handleFooterSettingChange("social_heading", e.target.value)}
                      placeholder="Follow Us Online"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-medium text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 1: CATEGORIES / CUSTOM LINKS */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-brand-700" />
                  <span>2. Column 1 - Categories & Catalogs</span>
                </h3>
                <button
                  type="button"
                  onClick={() => openFcol1Modal()}
                  className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Column 1 Link</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Column 1 Header Title</label>
                  <input
                    type="text"
                    value={form.footer?.col1_heading || ""}
                    onChange={(e) => handleFooterSettingChange("col1_heading", e.target.value)}
                    placeholder="Categories"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold text-xs"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800 block">Include Dynamic Store Categories</span>
                    <span className="text-[11px] text-slate-500">Automatically sync with catalog categories</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.footer?.col1_show_dynamic_categories !== false}
                      onChange={(e) => handleFooterSettingChange("col1_show_dynamic_categories", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Column 1 Links List */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Custom Column 1 Links ({form.footer?.col1_links?.length || 0})
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {(form.footer?.col1_links || []).map((link, index) => (
                    <div
                      key={link.id || index}
                      className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">{link.label}</span>
                        <span className="text-[11px] text-slate-500 font-mono block truncate">{link.href}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleFcol1(index)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            link.is_active !== false ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {link.is_active !== false ? "Active" : "Hidden"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openFcol1Modal(index)}
                          className="p-1 text-slate-500 hover:text-brand-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              type: "fcol1_link",
                              index,
                              title: link.label,
                            })
                          }
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* COLUMN 2: QUICK LINKS / BRAND PAGES */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <PanelsTopBottom className="w-4 h-4 text-brand-700" />
                  <span>3. Column 2 - Brand & Quick Links</span>
                </h3>
                <button
                  type="button"
                  onClick={() => openFcol2Modal()}
                  className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Quick Link</span>
                </button>
              </div>

              <div className="text-xs">
                <label className="block font-bold text-slate-700 mb-1">Column 2 Header Title</label>
                <input
                  type="text"
                  value={form.footer?.col2_heading || ""}
                  onChange={(e) => handleFooterSettingChange("col2_heading", e.target.value)}
                  placeholder="Devora Naturals"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold text-xs"
                />
              </div>

              {/* Column 2 Links List */}
              <div className="space-y-2 pt-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-bold text-slate-400">Quick Presets:</span>
                  {[
                    { label: "About Our Brand", href: "/about" },
                    { label: "Contact & Support", href: "/contact" },
                    { label: "Customer Account", href: "/account" },
                    { label: "Privacy Policy", href: "/privacy" },
                    { label: "Shipping Policy", href: "/shipping" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        const links = [...(form.footer?.col2_links || [])];
                        if (!links.some((l) => l.href === preset.href)) {
                          links.push({ id: `fcol2-${Date.now()}`, label: preset.label, href: preset.href, is_active: true });
                          setForm({
                            ...form,
                            footer: { ...(form.footer || DEFAULT_STOREFRONT_SETTINGS.footer), col2_links: links },
                          });
                        }
                      }}
                      className="px-2 py-0.5 bg-white hover:bg-slate-50 text-slate-600 rounded-md text-[11px] border border-slate-200"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                  {(form.footer?.col2_links || []).map((link, index) => (
                    <div
                      key={link.id || index}
                      className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">{link.label}</span>
                        <span className="text-[11px] text-slate-500 font-mono block truncate">{link.href}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleFcol2(index)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            link.is_active !== false ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {link.is_active !== false ? "Active" : "Hidden"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openFcol2Modal(index)}
                          className="p-1 text-slate-500 hover:text-brand-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              type: "fcol2_link",
                              index,
                              title: link.label,
                            })
                          }
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* COLUMN 3: CONTACT DETAILS VISIBILITY */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-700" />
                <span>4. Column 3 - Contact Us & Support Visibility</span>
              </h3>

              <div className="text-xs mb-3">
                <label className="block font-bold text-slate-700 mb-1">Column 3 Header Title</label>
                <input
                  type="text"
                  value={form.footer?.col3_heading || ""}
                  onChange={(e) => handleFooterSettingChange("col3_heading", e.target.value)}
                  placeholder="Contact Us"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Email toggle */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-brand-600" />
                    <span className="font-bold text-slate-800">Support Email</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.footer?.show_contact_email !== false}
                      onChange={(e) => handleFooterSettingChange("show_contact_email", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Phone toggle */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-brand-600" />
                    <span className="font-bold text-slate-800">Customer Phone</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.footer?.show_contact_phone !== false}
                      onChange={(e) => handleFooterSettingChange("show_contact_phone", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Address toggle */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-600" />
                    <span className="font-bold text-slate-800">Store Address</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.footer?.show_contact_address !== false}
                      onChange={(e) => handleFooterSettingChange("show_contact_address", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Social Badges toggle */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-brand-600" />
                    <span className="font-bold text-slate-800">Social Badges</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.footer?.show_social_badges !== false}
                      onChange={(e) => handleFooterSettingChange("show_social_badges", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* BOTTOM COPYRIGHT & WELLNESS BADGE */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span>5. Bottom Copyright Bar & Wellness Badge</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Copyright Line Text</label>
                  <input
                    type="text"
                    value={form.footer?.copyright_text || ""}
                    onChange={(e) => handleFooterSettingChange("copyright_text", e.target.value)}
                    placeholder="Devora Naturals. All Rights Reserved."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-medium text-xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Prefixed automatically with © {new Date().getFullYear()}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800">Show Handcrafted / Wellness Badge</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.footer?.show_bottom_badge !== false}
                        onChange={(e) => handleFooterSettingChange("show_bottom_badge", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <input
                    type="text"
                    value={form.footer?.badge_text || ""}
                    onChange={(e) => handleFooterSettingChange("badge_text", e.target.value)}
                    placeholder="Handcrafted with ❤️ for natural wellness"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-medium text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Save Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Footer changes take effect immediately across all customer store pages.
              </p>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="px-6 py-2.5 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-brand-800/20 transition-all cursor-pointer disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{saving ? "Saving..." : "Save Footer"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 1: HERO & BESTSELLER BANNER
          ========================================================================= */}
      {activeTab === "hero" && (
        <div className="space-y-6">
          {/* Main Hero Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Layout className="w-4 h-4 text-brand-700" />
                <span>Homepage Main Hero Banner</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                The primary banner your customers see upon arriving on the homepage.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hero Pill Badge</label>
                <input
                  type="text"
                  name="hero_badge"
                  value={form.hero_badge || ""}
                  onChange={handleChange}
                  placeholder="Pure Organic & Ayurvedic Wellness"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Main Heading</label>
                <input
                  type="text"
                  name="heroHeading"
                  value={form.heroHeading || ""}
                  onChange={handleChange}
                  placeholder="Natural Care For Your Skin, Hair & Soul"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-bold text-slate-900 text-sm"
                />
              </div>


              <div>
                <label className="block font-bold text-slate-700 mb-1">Sub Description</label>
                <textarea
                  name="heroDescription"
                  rows={3}
                  value={form.heroDescription || ""}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 text-slate-700 leading-relaxed font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary Button Text</label>
                  <input
                    type="text"
                    name="hero_primary_btn_text"
                    value={form.hero_primary_btn_text || "Explore Catalog"}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Secondary Button Text</label>
                  <input
                    type="text"
                    name="hero_secondary_btn_text"
                    value={form.hero_secondary_btn_text || "Our Botanical Story"}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold"
                  />
                </div>
              </div>

              {/* Gradient Color Selectors */}
              <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800">Gradient Background</h4>
                  <p className="text-xs text-slate-500">Enable gradient transition behind hero banner</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, hero_gradient_enabled: form.hero_gradient_enabled === false ? true : false })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.hero_gradient_enabled !== false ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.hero_gradient_enabled !== false ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 transition-opacity ${form.hero_gradient_enabled === false ? "opacity-40 pointer-events-none" : ""}`}>
                <div>
                  <label className="block font-bold text-slate-700 mb-2">Background Gradient (Start)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="heroBgGradientStart"
                      value={form.heroBgGradientStart || "#064e3b"}
                      onChange={handleChange}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0"
                    />
                    <span className="font-mono text-slate-600 font-bold">{form.heroBgGradientStart}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-2">Background Gradient (End)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="heroBgGradientEnd"
                      value={form.heroBgGradientEnd || "#065f46"}
                      onChange={handleChange}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0"
                    />
                    <span className="font-mono text-slate-600 font-bold">{form.heroBgGradientEnd}</span>
                  </div>
                </div>
              </div>

              {/* Hero Banner Image Upload */}
              <div className="pt-6 mt-4 border-t border-slate-100">
                <label className="block font-bold text-slate-700 mb-2">Main Hero Background Image</label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleHeroBannerImageUpload}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-brand-100 file:text-brand-800 hover:file:bg-brand-200 cursor-pointer border border-slate-200 rounded-xl"
                    />
                  </div>
                  {form.hero_banner_image && (
                    <button
                      type="button"
                      onClick={async () => {
                        const newForm = { ...form, hero_banner_image: "" };
                        setForm(newForm);
                        await updateStorefrontSettings(newForm);
                      }}
                      className="px-3.5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-sm transition-colors border border-red-100"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {form.hero_banner_image && (
                  <div className="mt-4 p-2 bg-slate-50 rounded-2xl border border-slate-200 inline-block">
                    <img
                      src={form.hero_banner_image}
                      alt="Hero Banner Preview"
                      className="h-32 w-auto object-cover rounded-xl"
                    />
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-3 font-medium">
                  Uploading an image overrides the gradient background. We recommend a wide, high-quality image.
                </p>
              </div>
            </div>
          </div>

          {/* Hero Spotlight Cards (Add, Edit, Delete multi-card manager) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  <span>Hero Spotlight Cards</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 font-bold">
                    {form.hero_cards?.length || 0} {form.hero_cards?.length === 1 ? "Card" : "Cards"}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Display interactive spotlight product cards next to hero heading. Add, edit, or delete showcase cards.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
                  <span className="text-xs font-bold text-slate-600">
                    {form.bestsellerEnabled !== false ? "Showcase Visible" : "Showcase Hidden"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, bestsellerEnabled: !form.bestsellerEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      form.bestsellerEnabled !== false ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.bestsellerEnabled !== false ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => openHeroCardModal(null)}
                  className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Hero Card</span>
                </button>
              </div>
            </div>

            {/* Cards Grid */}
            <div className={`transition-opacity ${form.bestsellerEnabled === false ? "opacity-40 pointer-events-none" : ""}`}>
              {(!form.hero_cards || form.hero_cards.length === 0) ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Star className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No hero spotlight cards yet</p>
                  <p className="text-[11px] text-slate-400 mt-1 mb-4">Add product spotlight cards to showcase your bestsellers on the homepage hero.</p>
                  <button
                    type="button"
                    onClick={() => openHeroCardModal(null)}
                    className="px-4 py-2 bg-brand-800 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create First Hero Card</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {form.hero_cards.map((card, idx) => (
                    <div
                      key={card.id || `hcard-${idx}`}
                      className={`relative flex flex-col justify-between p-4 rounded-2xl border transition-all ${
                        card.is_active !== false
                          ? "bg-white border-slate-200 shadow-sm hover:border-brand-300"
                          : "bg-slate-50/70 border-slate-200 opacity-60"
                      }`}
                    >
                      <div>
                        {/* Image Preview Container */}
                        <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-slate-100 mb-3 border border-slate-200">
                          {card.image_url ? (
                            <img
                              src={card.image_url}
                              alt={card.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                              <ImageIcon className="w-8 h-8 opacity-40" />
                              <span className="text-[10px] mt-1">No Image</span>
                            </div>
                          )}

                          <div className="absolute top-2 left-2 flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-[10px] font-bold text-amber-300 border border-white/20 uppercase tracking-wider">
                              {card.badge || "Featured"}
                            </span>
                          </div>

                          {card.price && (
                            <div className="absolute top-2 right-2">
                              <span className="px-2 py-0.5 rounded-md bg-emerald-800/90 text-white font-black text-xs shadow-xs">
                                {card.price}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Title & Subtitle */}
                        <h4 className="font-extrabold text-sm text-slate-900 line-clamp-1">{card.title || "Untitled Card"}</h4>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{card.subtitle || "Spotlight product"}</p>
                        {card.link && (
                          <span className="inline-block text-[11px] font-semibold text-brand-700 mt-1 truncate max-w-full">
                            Link: {card.link}
                          </span>
                        )}
                      </div>

                      {/* Card Footer Controls */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                        {/* Active status button */}
                        <button
                          type="button"
                          onClick={() => handleToggleHeroCard(idx)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                            card.is_active !== false
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${card.is_active !== false ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                          <span>{card.is_active !== false ? "Active" : "Hidden"}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openHeroCardModal(idx)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-brand-800 hover:bg-brand-50 transition-colors cursor-pointer"
                            title="Edit card"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ type: "hero_cards", index: idx, title: card.title || `Card #${idx + 1}` })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete card"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: VALUE PROPOSITIONS & TRUST PILLARS
          ========================================================================= */}
      {activeTab === "value_props" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-700" />
                <span>Value Propositions & Trust Badges</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                4-pill guarantee banner positioned directly below the hero section.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">
                  {form.value_props_enabled ? "Banner ON" : "Banner OFF"}
                </span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, value_props_enabled: !form.value_props_enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    form.value_props_enabled ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.value_props_enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={() => openValuePropModal()}
                className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Trust Pillar</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {(form.value_props || []).map((vp, idx) => {
              const matchedIcon = ICON_OPTIONS.find((ico) => ico.name === vp.icon)?.icon || Leaf;
              const IconComp = matchedIcon;
              return (
                <div
                  key={vp.id || idx}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    vp.is_active ? "bg-emerald-50/40 border-emerald-200" : "bg-slate-50 border-slate-200 opacity-60"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-brand-800 text-brand-100 rounded-xl">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...form.value_props];
                          updated[idx].is_active = !updated[idx].is_active;
                          setForm({ ...form, value_props: updated });
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer ${
                          vp.is_active ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
                        }`}
                      >
                        {vp.is_active ? "Active" : "Hidden"}
                      </button>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{vp.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{vp.description}</p>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openValuePropModal(idx)}
                      className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-200 flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ type: "value_props", index: idx, title: vp.title })}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: PROMOTIONAL BANNERS & DEALS
          ========================================================================= */}
      {activeTab === "promos" && (
        <div className="space-y-6">
          {/* Middle Wide Banner */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-brand-700" />
                  <span>Homepage Middle Wide Promo Banner</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-converting wide promotional banner positioned above the product catalog.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">
                  {form.promoBannerEnabled ? "Banner ON" : "Banner OFF"}
                </span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, promoBannerEnabled: !form.promoBannerEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    form.promoBannerEnabled ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.promoBannerEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 text-xs ${!form.promoBannerEnabled ? "opacity-40 pointer-events-none" : ""}`}>
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Banner Title</label>
                  <input
                    type="text"
                    name="promoBannerTitle"
                    value={form.promoBannerTitle || ""}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subtitle / Badge</label>
                  <input
                    type="text"
                    name="promoBannerSubtitle"
                    value={form.promoBannerSubtitle || ""}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Banner Image URL</label>
                  <input
                    type="text"
                    name="promoBannerImage"
                    value={form.promoBannerImage || ""}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Or Upload Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "promoBannerImage")}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-800 hover:file:bg-blue-200 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Destination Link</label>
                  <LinkSelector
                    value={form.promoBannerLink}
                    onChange={(val) => setForm({ ...form, promoBannerLink: val })}
                    availableProducts={availableProducts}
                    availableCategories={availableCategories}
                  />
                </div>
              </div>

              {/* Wide Preview */}
              <div className="flex flex-col justify-center bg-slate-50 rounded-2xl border border-slate-200 p-4">
                {form.promoBannerImage ? (
                  <div className="relative w-full aspect-[21/9] rounded-xl overflow-hidden shadow-md">
                    <img src={form.promoBannerImage} alt="Promo preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-900/90 via-brand-900/50 to-transparent"></div>
                    <div className="absolute inset-y-0 left-0 p-4 flex flex-col justify-center text-white">
                      <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
                        {form.promoBannerSubtitle}
                      </span>
                      <h4 className="font-extrabold text-sm mt-1 line-clamp-2">{form.promoBannerTitle}</h4>
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs text-center">No image preview</span>
                )}
              </div>
            </div>
          </div>

          {/* Promotional Deal Cards (Add, Edit, Delete) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Percent className="w-4 h-4 text-emerald-700" />
                  <span>Seasonal Offer Cards & Product Deals</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Featured product deal cards that link directly into catalog categories
                </p>
              </div>

              <button
                type="button"
                onClick={() => openPromoModal()}
                className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Deal Card</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(form.promos_list || []).map((card, idx) => (
                <div
                  key={card.id || idx}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    card.is_active ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200 opacity-60"
                  }`}
                >
                  <div className="flex gap-4">
                    {card.image_url ? (
                      <img
                        src={card.image_url}
                        alt={card.title}
                        className="w-20 h-20 rounded-xl object-cover shrink-0 border border-slate-200"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {card.badge || "Offer"}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            const updated = [...(form.promos_list || [])];
                            updated[idx] = { ...updated[idx], is_active: !updated[idx].is_active };
                            const newForm = { ...form, promos_list: updated };
                            setForm(newForm);
                            try {
                              await updateStorefrontSettings(newForm);
                              setSuccessMsg(
                                updated[idx].is_active
                                  ? `"${card.title}" is now visible on storefront!`
                                  : `"${card.title}" is now hidden on storefront!`
                              );
                              setTimeout(() => setSuccessMsg(""), 3000);
                            } catch (err) {
                              console.error("Auto-save promo toggle failed:", err);
                            }
                          }}
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded cursor-pointer ${
                            card.is_active ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
                          }`}
                        >
                          {card.is_active ? "Active" : "Hidden"}
                        </button>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{card.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2">{card.subtitle}</p>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openPromoModal(idx)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ type: "promos_list", index: idx, title: card.title })}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: BRAND SPOTLIGHT
          ========================================================================= */}
      {activeTab === "spotlight" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-brand-700" />
                <span>Brand Story & Why Choose Us Spotlight</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Displays authentic botanical story with stats counters and showcase image on the customer homepage.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">
                {form.spotlight_enabled ? "Spotlight ON" : "Spotlight OFF"}
              </span>
              <button
                type="button"
                onClick={async () => {
                  const newForm = { ...form, spotlight_enabled: !form.spotlight_enabled };
                  setForm(newForm);
                  try {
                    await updateStorefrontSettings(newForm);
                    setSuccessMsg(
                      newForm.spotlight_enabled
                        ? "Brand Spotlight enabled and live on customer homepage!"
                        : "Brand Spotlight is now hidden from customer homepage."
                    );
                    setTimeout(() => setSuccessMsg(""), 3500);
                  } catch (err) {
                    console.error("Auto-save spotlight toggle failed:", err);
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  form.spotlight_enabled ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.spotlight_enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className={`space-y-5 text-xs ${!form.spotlight_enabled ? "opacity-40 pointer-events-none" : ""}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Badge Tag</label>
                <input
                  type="text"
                  name="spotlight_badge"
                  placeholder="e.g. The Devora Promise"
                  value={form.spotlight_badge || ""}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Main Spotlight Title</label>
                <input
                  type="text"
                  name="spotlight_title"
                  placeholder="e.g. Ethically Farmed & Handcrafted with Ancient Ayurvedic Wisdom"
                  value={form.spotlight_title || ""}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
                />
              </div>
            </div>

            {/* Brand Spotlight Showcase Image: URL + JPG File Upload */}
            <div className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-800 text-xs">
                  Spotlight Showcase Image (JPG / PNG Upload or Image URL)
                </label>
                {form.spotlight_image && (
                  <button
                    type="button"
                    onClick={async () => {
                      const newForm = { ...form, spotlight_image: "" };
                      setForm(newForm);
                      await updateStorefrontSettings(newForm);
                      setSuccessMsg("Spotlight image cleared.");
                      setTimeout(() => setSuccessMsg(""), 2500);
                    }}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Clear Image
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  name="spotlight_image"
                  placeholder="Paste image URL (https://...) or choose a file below"
                  value={form.spotlight_image || ""}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Upload className="w-4 h-4 text-brand-700 shrink-0" />
                    <span className="font-bold text-xs">Upload JPG / Image File from Computer:</span>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
                    onChange={handleSpotlightImageUpload}
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-800 file:text-white hover:file:bg-brand-900 file:cursor-pointer cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Select any .jpg, .jpeg, or .png photo. It is automatically compressed to load lightning-fast on the customer homepage.
                </p>
              </div>

              {form.spotlight_image && (
                <div className="flex items-center gap-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <img
                    src={form.spotlight_image}
                    alt="Spotlight Preview"
                    className="w-20 h-24 object-cover rounded-xl border border-emerald-300 shadow-sm shrink-0"
                  />
                  <div className="space-y-1 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-extrabold text-[10px]">
                      Live Showcase Preview
                    </span>
                    <p className="font-bold text-slate-900">Displayed in Brand Story section</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1 truncate max-w-sm">{form.spotlight_image}</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Narrative Description</label>
              <textarea
                name="spotlight_description"
                rows={3}
                placeholder="Story about sourcing, pure Ayurvedic ingredients, and craftsmanship..."
                value={form.spotlight_description || ""}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Destination Link</label>
              <LinkSelector
                value={form.spotlight_btn_link}
                onChange={(val) => setForm({ ...form, spotlight_btn_link: val })}
                availableProducts={availableProducts}
                availableCategories={availableCategories}
              />
            </div>

            {/* 4 Stats Counters */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div>
                <h4 className="font-bold text-slate-800 text-xs">Homepage Statistics Counters</h4>
                <p className="text-[11px] text-slate-400">These 4 metrics appear directly below your brand narrative.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Metric 1</span>
                  <input
                    type="text"
                    name="spotlight_stat_1_val"
                    value={form.spotlight_stat_1_val || "100%"}
                    onChange={handleChange}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-black text-center text-sm"
                  />
                  <input
                    type="text"
                    name="spotlight_stat_1_lbl"
                    value={form.spotlight_stat_1_lbl || "Pure Botanical Oils"}
                    onChange={handleChange}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-center text-[10px] font-semibold"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Metric 2</span>
                  <input
                    type="text"
                    name="spotlight_stat_2_val"
                    value={form.spotlight_stat_2_val || "10,000+"}
                    onChange={handleChange}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-black text-center text-sm"
                  />
                  <input
                    type="text"
                    name="spotlight_stat_2_lbl"
                    value={form.spotlight_stat_2_lbl || "Happy Customers"}
                    onChange={handleChange}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-center text-[10px] font-semibold"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Metric 3</span>
                  <input
                    type="text"
                    name="spotlight_stat_3_val"
                    value={form.spotlight_stat_3_val || "0%"}
                    onChange={handleChange}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-black text-center text-sm"
                  />
                  <input
                    type="text"
                    name="spotlight_stat_3_lbl"
                    value={form.spotlight_stat_3_lbl || "Parabens & Toxins"}
                    onChange={handleChange}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-center text-[10px] font-semibold"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Metric 4</span>
                  <input
                    type="text"
                    name="spotlight_stat_4_val"
                    value={form.spotlight_stat_4_val || "4.9★"}
                    onChange={handleChange}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-black text-center text-sm"
                  />
                  <input
                    type="text"
                    name="spotlight_stat_4_lbl"
                    value={form.spotlight_stat_4_lbl || "Customer Rating"}
                    onChange={handleChange}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-center text-[10px] font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Dedicated Save Button for Brand Spotlight */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Changes will be saved and immediately updated on your live customer homepage.
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await updateStorefrontSettings(form);
                    setSuccessMsg("Brand Spotlight saved and updated on live customer storefront!");
                    setTimeout(() => setSuccessMsg(""), 3500);
                  } catch (err) {
                    console.error("Failed to save brand spotlight:", err);
                    alert("Failed to save brand spotlight.");
                  }
                }}
                className="px-6 py-2.5 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-xl shadow-md flex items-center gap-2 text-xs transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Brand Spotlight</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: CUSTOMER TESTIMONIALS & REVIEWS
          ========================================================================= */}
      {activeTab === "testimonials" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-700" />
                <span>Customer Reviews & Testimonials</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Authentic buyer feedback displayed in an elegant review grid on the homepage.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">
                  {form.testimonials_enabled ? "Reviews ON" : "Reviews OFF"}
                </span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, testimonials_enabled: !form.testimonials_enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    form.testimonials_enabled ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.testimonials_enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={() => openTestimonialModal()}
                className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Review</span>
              </button>
            </div>
          </div>

          {/* Section Heading Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Section Main Title</label>
              <input
                type="text"
                name="testimonials_title"
                value={form.testimonials_title || ""}
                onChange={handleChange}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Section Subtitle</label>
              <input
                type="text"
                name="testimonials_subtitle"
                value={form.testimonials_subtitle || ""}
                onChange={handleChange}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Reviews List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
            {(form.testimonials || []).map((review, idx) => (
              <div
                key={review.id || idx}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  review.is_active ? "bg-white border-slate-200 shadow-xs" : "bg-slate-50 border-slate-200 opacity-60"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-amber-400">
                      {[...Array(review.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    {review.is_verified && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Verified
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 italic line-clamp-3 leading-relaxed">
                    "{review.comment}"
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2.5">
                    {review.image_url ? (
                      <img
                        src={review.image_url}
                        alt={review.customer_name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0 shadow-xs"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-800 font-extrabold text-xs flex items-center justify-center shrink-0 border border-brand-200">
                        {(review.customer_name || "C").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h5 className="font-extrabold text-slate-900 text-xs truncate">{review.customer_name}</h5>
                      <p className="text-[10px] text-slate-400 truncate">{review.location}</p>
                      <p className="text-[10px] text-brand-700 font-semibold line-clamp-1 mt-0.5">
                        {review.product_name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...form.testimonials];
                      updated[idx].is_active = !updated[idx].is_active;
                      setForm({ ...form, testimonials: updated });
                    }}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                      review.is_active ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
                    }`}
                  >
                    {review.is_active ? "Active" : "Hidden"}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openTestimonialModal(idx)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ type: "testimonials", index: idx, title: review.customer_name })}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: FREQUENTLY ASKED QUESTIONS (FAQS)
          ========================================================================= */}
      {activeTab === "faqs" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-brand-700" />
                <span>Frequently Asked Questions (FAQ) Accordion</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Collapsible question and answer drawer for customer clarity on the homepage.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">
                  {form.faqs_enabled ? "FAQs ON" : "FAQs OFF"}
                </span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, faqs_enabled: !form.faqs_enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    form.faqs_enabled ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.faqs_enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={() => openFaqModal()}
                className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add FAQ</span>
              </button>
            </div>
          </div>

          {/* Section Heading */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Section Main Title</label>
              <input
                type="text"
                name="faqs_title"
                value={form.faqs_title || ""}
                onChange={handleChange}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Section Subtitle</label>
              <input
                type="text"
                name="faqs_subtitle"
                value={form.faqs_subtitle || ""}
                onChange={handleChange}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* FAQs List */}
          <div className="space-y-3 pt-2">
            {(form.faqs || []).map((faq, idx) => (
              <div
                key={faq.id || idx}
                className={`p-4 rounded-2xl border transition-all ${
                  faq.is_active ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                        {faq.category || "General"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...form.faqs];
                          updated[idx].is_active = !updated[idx].is_active;
                          setForm({ ...form, faqs: updated });
                        }}
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded cursor-pointer ${
                          faq.is_active ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
                        }`}
                      >
                        {faq.is_active ? "Active" : "Hidden"}
                      </button>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{faq.question}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1">{faq.answer}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openFaqModal(idx)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ type: "faqs", index: idx, title: faq.question })}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 7: TOP ANNOUNCEMENT BAR
          ========================================================================= */}
      {activeTab === "announcements" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-brand-700" />
                <span>Top Announcement Notification Bar</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Displays active promotion and delivery notices at the very top of the customer website.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">
                  {form.announcement_enabled ? "Bar Visible" : "Bar Hidden"}
                </span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, announcement_enabled: !form.announcement_enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    form.announcement_enabled ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.announcement_enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={() => openAnnouncementModal()}
                className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Message</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {(form.announcements || []).map((ann, idx) => (
              <div
                key={ann.id || idx}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                  ann.is_active ? "bg-emerald-950/10 border-emerald-500/30" : "bg-slate-50 border-slate-200 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-800 text-brand-100 rounded-xl shrink-0">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                        {ann.highlight_text || "Notice"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...form.announcements];
                          updated[idx].is_active = !updated[idx].is_active;
                          setForm({ ...form, announcements: updated });
                        }}
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded cursor-pointer ${
                          ann.is_active ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
                        }`}
                      >
                        {ann.is_active ? "Active" : "Hidden"}
                      </button>
                    </div>
                    <p className="font-bold text-slate-900 text-xs mt-1">{ann.text}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openAnnouncementModal(idx)}
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ type: "announcements", index: idx, title: ann.text })}
                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 0: ADD / EDIT HERO SPOTLIGHT CARD
          ========================================================================= */}
      {heroCardModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                <span>{editingHeroCardIndex !== null ? "Edit Hero Spotlight Card" : "Add New Hero Spotlight Card"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setHeroCardModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHeroCard} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product / Card Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kumkumadi Saffron Glow Oil"
                  value={heroCardForm.title}
                  onChange={(e) => setHeroCardForm({ ...heroCardForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Badge Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. Bestseller / Pure Saffron"
                    value={heroCardForm.badge}
                    onChange={(e) => setHeroCardForm({ ...heroCardForm, badge: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹499"
                    value={heroCardForm.price}
                    onChange={(e) => setHeroCardForm({ ...heroCardForm, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtitle / Key Highlight</label>
                <input
                  type="text"
                  placeholder="e.g. Handcrafted Kashmiri Saffron & Lotus Radiance"
                  value={heroCardForm.subtitle}
                  onChange={(e) => setHeroCardForm({ ...heroCardForm, subtitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Destination Link</label>
                <LinkSelector
                  value={heroCardForm.link}
                  onChange={(val) => setHeroCardForm({ ...heroCardForm, link: val })}
                  availableProducts={availableProducts}
                  availableCategories={availableCategories}
                />
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Product Card Image</label>
                <input
                  type="text"
                  placeholder="Enter image URL (https://...)"
                  value={heroCardForm.image_url}
                  onChange={(e) => setHeroCardForm({ ...heroCardForm, image_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold mb-2"
                />

                <div className="flex items-center gap-3">
                  <label className="text-[11px] font-bold text-slate-600 shrink-0">Or Upload File:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleHeroCardModalImageUpload}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-100 file:text-brand-800 hover:file:bg-brand-200 cursor-pointer"
                  />
                </div>

                {heroCardForm.image_url && (
                  <div className="mt-2 flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <img
                      src={heroCardForm.image_url}
                      alt="Preview"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                    />
                    <div>
                      <span className="text-[11px] font-bold text-slate-700">Image Preview Ready</span>
                      <p className="text-[10px] text-slate-400">Card will showcase this visual on homepage hero</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="hcard_is_active"
                  checked={heroCardForm.is_active !== false}
                  onChange={(e) => setHeroCardForm({ ...heroCardForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-brand-800 border-slate-300 cursor-pointer"
                />
                <label htmlFor="hcard_is_active" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Card Active on Live Storefront
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setHeroCardModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  {editingHeroCardIndex !== null ? "Update Hero Card" : "Save Hero Card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD / EDIT ANNOUNCEMENT
          ========================================================================= */}
      {announcementModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-brand-700" />
                <span>{editingAnnIndex !== null ? "Edit Announcement" : "Add Announcement"}</span>
              </h3>
              <button onClick={() => setAnnouncementModalOpen(false)} className="p-1 rounded-xl text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Highlight Tag *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Free Delivery / 15% OFF"
                  value={annForm.highlight_text}
                  onChange={(e) => setAnnForm({ ...annForm, highlight_text: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Announcement Message *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Free Pan-India Express Delivery on Orders Above ₹499 | Shop Now"
                  value={annForm.text}
                  onChange={(e) => setAnnForm({ ...annForm, text: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Destination Link</label>
                <LinkSelector
                  value={annForm.link}
                  onChange={(val) => setAnnForm({ ...annForm, link: val })}
                  availableProducts={availableProducts}
                  availableCategories={availableCategories}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAnnouncementModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-xl shadow-sm"
                >
                  Save Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ADD / EDIT VALUE PROPOSITION PILLAR
          ========================================================================= */}
      {valuePropModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Leaf className="w-5 h-5 text-emerald-700" />
                <span>{editingVpIndex !== null ? "Edit Trust Pillar" : "Add Trust Pillar"}</span>
              </h3>
              <button onClick={() => setValuePropModalOpen(false)} className="p-1 rounded-xl text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveValueProp} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100% Organic"
                  value={vpForm.title}
                  onChange={(e) => setVpForm({ ...vpForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pure wild-harvested botanical extracts"
                  value={vpForm.description}
                  onChange={(e) => setVpForm({ ...vpForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Choose Icon *</label>
                <select
                  value={vpForm.icon}
                  onChange={(e) => setVpForm({ ...vpForm, icon: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold cursor-pointer"
                >
                  {ICON_OPTIONS.map((ico) => (
                    <option key={ico.name} value={ico.name}>
                      {ico.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setValuePropModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-xl shadow-sm"
                >
                  Save Trust Pillar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: ADD / EDIT PROMO CARD
          ========================================================================= */}
      {promoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Tag className="w-5 h-5 text-brand-700" />
                <span>{editingPromoIndex !== null ? "Edit Seasonal Deal" : "Add Seasonal Deal"}</span>
              </h3>
              <button onClick={() => setPromoModalOpen(false)} className="p-1 rounded-xl text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePromoCard} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Deal Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ayurvedic Hair Vitalizer Combo"
                  value={promoCardForm.title}
                  onChange={(e) => setPromoCardForm({ ...promoCardForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtitle / Details *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pure Bhringraj, Neem & Hibiscus hair care system"
                  value={promoCardForm.subtitle}
                  onChange={(e) => setPromoCardForm({ ...promoCardForm, subtitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Offer Badge Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. Save 20%"
                    value={promoCardForm.badge}
                    onChange={(e) => setPromoCardForm({ ...promoCardForm, badge: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Button Text</label>
                  <input
                    type="text"
                    placeholder="Shop Deal"
                    value={promoCardForm.button_text}
                    onChange={(e) => setPromoCardForm({ ...promoCardForm, button_text: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              {/* Deal Card Image: URL + JPG File Upload */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">
                  Deal Card Image (JPG / PNG Upload or Image URL)
                </label>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste image URL (https://...) or choose a JPG file below"
                    value={promoCardForm.image_url}
                    onChange={(e) => setPromoCardForm({ ...promoCardForm, image_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                  {promoCardForm.image_url && (
                    <button
                      type="button"
                      onClick={() => setPromoCardForm({ ...promoCardForm, image_url: "" })}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                      title="Clear image"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Upload className="w-4 h-4 text-brand-700 shrink-0" />
                      <span className="font-bold text-xs">Upload JPG / Image File:</span>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
                      onChange={handlePromoCardModalImageUpload}
                      className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-800 file:text-white hover:file:bg-brand-900 file:cursor-pointer cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Select any .jpg, .jpeg, or .png image from your computer. It is automatically optimized for fast storefront loading.
                  </p>
                </div>

                {promoCardForm.image_url && (
                  <div className="flex items-center gap-3 p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                    <img
                      src={promoCardForm.image_url}
                      alt="Deal Preview"
                      className="w-16 h-16 object-cover rounded-xl border border-emerald-200 shrink-0"
                    />
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        Deal Image Selected
                      </span>
                      <p className="text-[10px] text-emerald-700">
                        This visual will be displayed on the Seasonal Deal card on your storefront.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Link (Catalog Category / Page)</label>
                <LinkSelector
                  value={promoCardForm.link}
                  onChange={(val) => setPromoCardForm({ ...promoCardForm, link: val })}
                  availableProducts={availableProducts}
                  availableCategories={availableCategories}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="promo_is_active"
                  checked={promoCardForm.is_active !== false}
                  onChange={(e) => setPromoCardForm({ ...promoCardForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-brand-800 border-slate-300 cursor-pointer"
                />
                <label htmlFor="promo_is_active" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Card Active on Live Storefront
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPromoModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-xl shadow-sm"
                >
                  Save Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: ADD / EDIT TESTIMONIAL
          ========================================================================= */}
      {testimonialModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-brand-700" />
                <span>{editingTestimonialIndex !== null ? "Edit Customer Review" : "Add Customer Review"}</span>
              </h3>
              <button onClick={() => setTestimonialModalOpen(false)} className="p-1 rounded-xl text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTestimonial} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Radhika Sharma"
                    value={testimonialForm.customer_name}
                    onChange={(e) => setTestimonialForm({ ...testimonialForm, customer_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location / City</label>
                  <input
                    type="text"
                    placeholder="e.g. Kochi, Kerala"
                    value={testimonialForm.location}
                    onChange={(e) => setTestimonialForm({ ...testimonialForm, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Purchased</label>
                <input
                  type="text"
                  placeholder="e.g. Kumkumadi Herbal Radiant Face Oil"
                  value={testimonialForm.product_name}
                  onChange={(e) => setTestimonialForm({ ...testimonialForm, product_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rating (1 to 5 Stars)</label>
                <select
                  value={testimonialForm.rating}
                  onChange={(e) => setTestimonialForm({ ...testimonialForm, rating: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                  <option value={3}>⭐⭐⭐ (3 Stars)</option>
                </select>
              </div>

              <div className="space-y-2 p-3 bg-slate-50/80 rounded-2xl border border-slate-200">
                <label className="block font-bold text-slate-700">Customer Photo / Review Image (Optional)</label>
                <input
                  type="text"
                  placeholder="Paste image URL (https://...)"
                  value={testimonialForm.image_url || ""}
                  onChange={(e) => setTestimonialForm({ ...testimonialForm, image_url: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                />

                <div className="flex items-center gap-3 pt-1">
                  <label className="text-[11px] font-bold text-slate-600 shrink-0">Or Upload File:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleTestimonialModalImageUpload}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-100 file:text-brand-800 hover:file:bg-brand-200 cursor-pointer"
                  />
                </div>

                {testimonialForm.image_url && (
                  <div className="mt-2 flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={testimonialForm.image_url}
                        alt="Customer Preview"
                        className="w-12 h-12 rounded-full object-cover border-2 border-brand-200 shadow-xs shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-slate-800 block truncate">Customer Photo Attached</span>
                        <p className="text-[10px] text-slate-400 truncate">Will display as avatar next to reviewer details</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTestimonialForm({ ...testimonialForm, image_url: "" })}
                      className="px-2.5 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer transition-colors shrink-0 ml-2"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Review Feedback *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="What did the customer love about the product?"
                  value={testimonialForm.comment}
                  onChange={(e) => setTestimonialForm({ ...testimonialForm, comment: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTestimonialModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-xl shadow-sm"
                >
                  Save Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: ADD / EDIT FAQ
          ========================================================================= */}
      {faqModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-brand-700" />
                <span>{editingFaqIndex !== null ? "Edit FAQ" : "Add FAQ"}</span>
              </h3>
              <button onClick={() => setFaqModalOpen(false)} className="p-1 rounded-xl text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFaq} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category Tag *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ingredients / Shipping / Returns"
                    value={faqForm.category}
                    onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Question *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Are Devora Naturals products 100% organic?"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Answer *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain the answer in clear, friendly detail..."
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFaqModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-xl shadow-sm"
                >
                  Save FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT NAVBAR NAVIGATION LINK
          ========================================================================= */}
      {navLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6 bg-gradient-to-r from-brand-900 to-brand-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Navigation className="w-5 h-5 text-earth-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    {editingNavLinkIndex !== null ? "Edit Navigation Link" : "Add Navigation Link"}
                  </h3>
                  <p className="text-xs text-brand-200">Customer navbar menu link</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNavLinkModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNavLink} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Link Label / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={navLinkForm.name}
                  onChange={(e) => setNavLinkForm({ ...navLinkForm, name: e.target.value })}
                  placeholder="e.g. All Products, Special Offers, About"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Destination URL / Route <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={navLinkForm.href}
                  onChange={(e) => setNavLinkForm({ ...navLinkForm, href: e.target.value })}
                  placeholder="e.g. /products, /about, /#deals, https://..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-medium"
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-500">Quick Destination Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: "Home", href: "/" },
                    { name: "All Products", href: "/products" },
                    { name: "Skin Care", href: "/products?category=Skin Care" },
                    { name: "Hair Care", href: "/products?category=Hair Care" },
                    { name: "Pooja Items", href: "/products?category=Pooja Items" },
                    { name: "About Us", href: "/about" },
                    { name: "Contact", href: "/contact" },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setNavLinkForm((prev) => ({ ...prev, name: preset.name, href: preset.href }))}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-800 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 transition-colors"
                    >
                      + {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 block">Active Status</span>
                  <span className="text-[11px] text-slate-500">Visible on customer navbar</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={navLinkForm.is_active}
                    onChange={(e) => setNavLinkForm({ ...navLinkForm, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setNavLinkModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-xl shadow-sm"
                >
                  Save Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT FOOTER COLUMN 1 LINK (CATEGORIES / MENU)
          ========================================================================= */}
      {fcol1ModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6 bg-gradient-to-r from-brand-900 to-brand-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <PanelsTopBottom className="w-5 h-5 text-earth-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    {editingFcol1Index !== null ? "Edit Column 1 Link" : "Add Column 1 Link"}
                  </h3>
                  <p className="text-xs text-brand-200">Footer categories & catalog navigation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFcol1ModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFcol1} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Link Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fcol1Form.label}
                  onChange={(e) => setFcol1Form({ ...fcol1Form, label: e.target.value })}
                  placeholder="e.g. Skin Care Essentials"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Target URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fcol1Form.href}
                  onChange={(e) => setFcol1Form({ ...fcol1Form, href: e.target.value })}
                  placeholder="e.g. /products?category=Skin Care"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-medium"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 block">Active Status</span>
                  <span className="text-[11px] text-slate-500">Visible in footer Column 1</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fcol1Form.is_active}
                    onChange={(e) => setFcol1Form({ ...fcol1Form, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setFcol1ModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-xl shadow-sm"
                >
                  Save Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT FOOTER COLUMN 2 LINK (QUICK LINKS)
          ========================================================================= */}
      {fcol2ModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6 bg-gradient-to-r from-brand-900 to-brand-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <PanelsTopBottom className="w-5 h-5 text-earth-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    {editingFcol2Index !== null ? "Edit Column 2 Quick Link" : "Add Column 2 Quick Link"}
                  </h3>
                  <p className="text-xs text-brand-200">Footer brand & customer service links</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFcol2ModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFcol2} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Link Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fcol2Form.label}
                  onChange={(e) => setFcol2Form({ ...fcol2Form, label: e.target.value })}
                  placeholder="e.g. About Our Brand, Terms of Service"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Target URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fcol2Form.href}
                  onChange={(e) => setFcol2Form({ ...fcol2Form, href: e.target.value })}
                  placeholder="e.g. /about, /contact, /account"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-medium"
                />
              </div>

              {/* Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-500">Popular Page Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "About Our Brand", href: "/about" },
                    { label: "Contact & Support", href: "/contact" },
                    { label: "Customer Account", href: "/account" },
                    { label: "Privacy Policy", href: "/privacy" },
                    { label: "Shipping Policy", href: "/shipping" },
                    { label: "Terms & Conditions", href: "/terms" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setFcol2Form((prev) => ({ ...prev, label: preset.label, href: preset.href }))}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-800 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 transition-colors"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 block">Active Status</span>
                  <span className="text-[11px] text-slate-500">Visible in footer Column 2</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fcol2Form.is_active}
                    onChange={(e) => setFcol2Form({ ...fcol2Form, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setFcol2ModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-xl shadow-sm"
                >
                  Save Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          DELETE CONFIRMATION MODAL
          ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Delete Frontend Item?</h3>
                <p className="text-xs text-slate-500">Remove from the customer storefront</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete <strong className="text-slate-900">"{deleteTarget.title}"</strong>?
              This section will no longer appear on your live storefront.
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          RESET STOREFRONT DEFAULTS MODAL
          ========================================================================= */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-3 bg-amber-100 rounded-2xl">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Reset Storefront Design?</h3>
                <p className="text-xs text-slate-500">Restore factory Devora Naturals layouts</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will restore all hero gradients, trust pillars, announcements, reviews, FAQs, and brand spotlight sections to the official botanical templates.
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={resetting}
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={handleResetDefaults}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{resetting ? "Restoring..." : "Restore Defaults"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
