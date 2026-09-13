export const DEFAULT_CATEGORIES = [];

export const DEMO_PRODUCTS = [];

export const DEFAULT_PRODUCTS = [];

export const DEFAULT_OFFERS = [];

export const DEFAULT_CUSTOMERS = [];

export const DEFAULT_ABOUT_DATA = {
  badge: "Our Ayurvedic Heritage",
  title: "Rooted in Nature, Crafted with Care",
  description: "Devora Naturals brings ancient botanical wisdom to modern self-care routines. Every bottle is lovingly formulated using wild-harvested herbs and traditional cold-press extraction.",
  cards: [
    {
      id: "about-1",
      title: "100% Pure Botanical Ingredients",
      description: "We source our Kashmiri saffron, Bhringraj leaves, and Kannauj roses directly from certified organic farms without artificial preservatives.",
      icon: "Sparkles",
    },
    {
      id: "about-2",
      title: "Traditional Small-Batch Formulations",
      description: "Following time-tested Ayurvedic taila-paka methods, our oils are slow-infused over copper vessels to preserve essential nutrients.",
      icon: "HeartHandshake",
    },
    {
      id: "about-3",
      title: "Ethical & Eco-Friendly Packaging",
      description: "All our products are cruelty-free, packaged in recyclable dark amber glass bottles to prevent UV oxidation.",
      icon: "ShieldCheck",
    },
  ],
};

export const DEFAULT_SOCIAL_LINKS = [];

export const DEFAULT_SETTINGS = {
  store_name: "Devora Naturals",
  tagline: "Pure Ayurvedic & Botanical Organic Care",
  email: "",
  phone: "",
  address: "",
  whatsapp: "",
  free_shipping_threshold: 499,
  state_shipping_enabled: true,
  shipping_charge_tamilnadu: 50,
  shipping_charge_other_states: 100,
  standard_shipping_charge: 50,
  delivery_estimate: "Tamil Nadu: 1-2 Days | Other States: 3-5 Business Days",
  support_hours: "Mon - Sat: 9:00 AM - 7:00 PM IST",
  order_prefix: "DEV-",
  instagram_url: "",
  facebook_url: "",
  youtube_url: "",
  social_links_enabled: true,
  social_links: [],
  return_policy_enabled: true,
  return_window_days: 7,
  return_policy_text: "7-Day Easy Replacement Guarantee for damaged or defective items",
};

export const DEFAULT_ORDERS = [];

export const DEFAULT_STOREFRONT_SETTINGS = {
  // Store Identity & Customer Brand
  store_name: "Devora Naturals",
  tagline: "Pure Organic Botanical",
  logo_url: "",

  // Top Announcement Bar
  announcement_enabled: true,
  announcements: [
    {
      id: "ann-1",
      text: "Free Pan-India Express Delivery on Orders Above ₹499",
      highlight_text: "Free Delivery",
      link: "#products-section",
      is_active: true,
    },
    {
      id: "ann-2",
      text: "100% Pure Cold-Pressed Oils & Certified Ayurvedic Herbs",
      highlight_text: "Pure Ayurvedic",
      link: "/about",
      is_active: true,
    },
  ],

  // Hero Section
  hero_badge: "Pure Organic & Ayurvedic Wellness",
  heroHeading: "Natural Care For Your Skin, Hair & Soul",
  heroDescription: "Elevate your daily self-care ritual with handcrafted Kumkumadi oils, wild-harvested Bhringraj scalp tonics, and sacred organic Sambrani dhoop.",
  hero_gradient_enabled: true,
  heroBgGradientStart: "#064e3b",
  heroBgGradientEnd: "#065f46",
  hero_primary_btn_text: "Explore Catalog",
  hero_primary_btn_link: "#products-section",
  hero_secondary_btn_text: "Our Botanical Story",
  hero_secondary_btn_link: "/about",

  // Bestseller & Hero Spotlight Cards (Add, Edit, Delete multiple cards)
  bestsellerEnabled: false,
  bestsellerTitle: "",
  bestsellerSubtitle: "",
  bestsellerPrice: "",
  bestsellerImage: "",
  bestsellerLink: "",

  hero_cards_enabled: false,
  hero_cards: [],

  // Value Propositions / Trust Pillars
  value_props_enabled: true,
  value_props: [
    {
      id: "vp-1",
      title: "100% Organic",
      description: "Pure wild-harvested botanical extracts",
      icon: "Leaf",
      is_active: true,
    },
    {
      id: "vp-2",
      title: "Chemical Free",
      description: "Zero sulfates, parabens, or mineral oils",
      icon: "ShieldCheck",
      is_active: true,
    },
    {
      id: "vp-3",
      title: "Handcrafted Batches",
      description: "Slow-infused in copper vessels",
      icon: "HeartHandshake",
      is_active: true,
    },
    {
      id: "vp-4",
      title: "Express Delivery",
      description: "Safe & prompt Pan-India doorstep delivery",
      icon: "Truck",
      is_active: true,
    },
  ],

  // Promotional Middle Banner & Featured Deals
  promoBannerEnabled: false,
  promoBannerTitle: "",
  promoBannerSubtitle: "",
  promoBannerImage: "",
  promoBannerBadge: "",
  promoBannerLink: "#products-section",
  promoBannerBtnText: "Shop Botanical Collection",

  promos_list: [],

  // Brand Spotlight / Why Choose Us
  spotlight_enabled: true,
  spotlight_badge: "The Devora Promise",
  spotlight_title: "Ethically Farmed & Handcrafted with Ancient Ayurvedic Wisdom",
  spotlight_description: "We bridge ancient Vedic recipes with modern cold-extraction science. Every droplet preserves active botanical phyto-nutrients, completely free of synthetics, parabens, and fillers.",
  spotlight_stat_1_val: "100%",
  spotlight_stat_1_lbl: "Pure Botanical Oils",
  spotlight_stat_2_val: "10,000+",
  spotlight_stat_2_lbl: "Happy Customers",
  spotlight_stat_3_val: "0%",
  spotlight_stat_3_lbl: "Parabens & Toxins",
  spotlight_stat_4_val: "4.9★",
  spotlight_stat_4_lbl: "Customer Rating",
  spotlight_image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",

  // Testimonials / Customer Reviews
  testimonials_enabled: false,
  testimonials_title: "Loved by Thousands of Natural Beauty Enthusiasts",
  testimonials_subtitle: "Read authentic experiences from genuine buyers across India",
  testimonials: [],

  // Frequently Asked Questions (FAQ)
  faqs_enabled: true,
  faqs_title: "Frequently Asked Questions",
  faqs_subtitle: "Clear answers about our organic sourcing, usage, and policies",
  faqs: [
    {
      id: "faq-1",
      question: "Are Devora Naturals products 100% natural and chemical-free?",
      answer: "Yes, every single formula is handcrafted from wild-harvested herbs, cold-pressed plant oils, and botanical extracts with zero artificial preservatives, mineral oils, or sulfates.",
      category: "Ingredients",
      is_active: true,
    },
    {
      id: "faq-2",
      question: "How long does Pan-India shipping take?",
      answer: "Orders are packed and dispatched within 24 hours. Standard delivery arrives in 3-5 business days across all Indian states.",
      category: "Shipping",
      is_active: true,
    },
    {
      id: "faq-3",
      question: "What is your return & replacement policy?",
      answer: "We provide an easy 7-day doorstep replacement guarantee for any damaged, leaking, or defective products received.",
      category: "Returns",
      is_active: true,
    },
    {
      id: "faq-4",
      question: "Can I use herbal oils on oily or sensitive skin?",
      answer: "Our botanical oils are formulated as light, non-comedogenic blends. For oily skin, apply 2-3 drops at night on a cleansed face and massage gently until absorbed.",
      category: "Usage",
      is_active: true,
    },
  ],

  // Customer Navbar Settings & Navigation Links
  navbar: {
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
  },

  // Customer Footer Settings, Columns & Links
  footer: {
    description: "Crafting pure, organic herbal products deeply rooted in Ayurvedic heritage. Dedicated to your wellness, radiant skin, and authentic traditional rituals.",
    show_social_links: true,
    social_heading: "Follow Us Online",

    // Column 1: Categories / Custom Menu
    col1_heading: "Categories",
    col1_show_dynamic_categories: true,
    col1_links: [
      { id: "fcol1-all", label: "View Full Catalog", href: "/products", is_active: true },
    ],

    // Column 2: Devora Naturals / Quick Links
    col2_heading: "Devora Naturals",
    col2_links: [
      { id: "fcol2-1", label: "About Our Brand", href: "/about", is_active: true },
      { id: "fcol2-2", label: "Contact & Support", href: "/contact", is_active: true },
    ],

    // Column 3: Contact Details display toggles
    col3_heading: "Contact Us",
    show_contact_email: true,
    show_contact_phone: true,
    show_contact_address: true,
    show_social_badges: true,

    // Bottom Bar
    copyright_text: "Devora Naturals. All Rights Reserved.",
    badge_text: "Handcrafted with ❤️ for natural wellness",
    show_bottom_badge: true,
  },
};

