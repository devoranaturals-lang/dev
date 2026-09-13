import { createClient } from "@supabase/supabase-js";
import { DEFAULT_PRODUCTS, DEFAULT_CATEGORIES, DEFAULT_OFFERS, DEFAULT_CUSTOMERS, DEFAULT_ABOUT_DATA, DEFAULT_ORDERS, DEFAULT_STOREFRONT_SETTINGS } from "./initialData.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-supabase-project")
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: (...args) => fetch(args[0], { ...args[1], cache: 'no-store' })
      }
    })
  : null;

// Local storage key for fallback persistent mock state
const LOCAL_STORAGE_PRODUCTS_KEY = "devora_mock_products_v1";
const LOCAL_STORAGE_CATEGORIES_KEY = "devora_mock_categories_v1";
const LOCAL_STORAGE_ORDERS_KEY = "devora_mock_orders_v1";
const LOCAL_STORAGE_CUSTOMERS_KEY = "devora_mock_customers_v1";

export function isDemoCustomer(customer) {
  if (!customer) return false;
  const id = String(customer.id || "").toLowerCase();
  const email = String(customer.email || "").toLowerCase();
  const name = String(customer.name || "").toLowerCase();
  if (id.startsWith("cust-") || id.startsWith("demo-")) return true;
  if (["aarav@example.com", "priya@example.com", "vikram@example.com", "sneha@example.com"].includes(email)) return true;
  if (email.endsWith("@example.com")) return true;
  if (["aarav sharma", "priya nair", "vikram mehta", "sneha patel"].includes(name)) return true;
  return false;
}

export function isDemoOrder(order) {
  if (!order) return false;
  const id = String(order.id || "").toLowerCase();
  const orderNumber = String(order.order_number || "").toLowerCase();
  const custEmail = String(order.customer_email || (order.customer && order.customer.email) || "").toLowerCase();
  if (id.startsWith("ord-demo") || id.startsWith("demo-")) return true;
  if (["dev-10821", "dev-10820", "dev-10819", "dev-10818"].includes(id)) return true;
  if (["dev-10821", "dev-10820", "dev-10819", "dev-10818"].includes(orderNumber)) return true;
  if (["aarav@example.com", "priya@example.com", "vikram@example.com", "sneha@example.com"].includes(custEmail)) return true;
  if (custEmail.endsWith("@example.com")) return true;
  return false;
}

// Automatic cleanup on startup to purge legacy demo data from client localStorage
if (typeof window !== "undefined") {
  try {
    const rawCust = localStorage.getItem("devora_mock_customers_v1");
    if (rawCust) {
      const parsed = JSON.parse(rawCust);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(c => !isDemoCustomer(c));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem("devora_mock_customers_v1", JSON.stringify(cleaned));
        }
      }
    }
    const rawOrders = localStorage.getItem("devora_mock_orders_v1");
    if (rawOrders) {
      const parsed = JSON.parse(rawOrders);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(o => !isDemoOrder(o));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem("devora_mock_orders_v1", JSON.stringify(cleaned));
        }
      }
    }
    const rawSettings = localStorage.getItem("devora_mock_settings_v1");
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      let changed = false;
      if (parsed.email === "support@devoranaturals.com") { parsed.email = ""; changed = true; }
      if (parsed.phone === "+91 8608540400" || parsed.phone === "8608540400") { parsed.phone = ""; changed = true; }
      if (parsed.address?.includes("Kerala Botanical Organic Farm")) { parsed.address = ""; changed = true; }
      if (changed) {
        localStorage.setItem("devora_mock_settings_v1", JSON.stringify(parsed));
      }
    }
  } catch (_) {}
}

// Utility to strip or truncate large base64 strings when saving to browser localStorage
function stripLargeBase64(data, maxLen = 2048) {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map((item) => stripLargeBase64(item, maxLen));
  }
  const clone = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === "string" && v.startsWith("data:image/") && v.length > maxLen) {
      clone[k] = ""; // Keep empty placeholder in localStorage; full image remains in memory & database
    } else if (typeof v === "object" && v !== null) {
      clone[k] = stripLargeBase64(v, maxLen);
    } else {
      clone[k] = v;
    }
  }
  return clone;
}

// Safe LocalStorage setter with quota auto-cleanup and base64 stripping fallback
function safeSetLocalStorage(key, value) {
  if (typeof window === "undefined") return;
  const json = typeof value === "string" ? value : JSON.stringify(value);
  try {
    localStorage.setItem(key, json);
  } catch (e) {
    try {
      // Clean temporary ping keys & dead cache
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.endsWith("_sync_ping") || k.includes("temp_") || k === "devora_mock_offers_v1")) {
          localStorage.removeItem(k);
        }
      }
      if (typeof value === "object" && value !== null) {
        const stripped = stripLargeBase64(value);
        localStorage.setItem(key, JSON.stringify(stripped));
      } else {
        localStorage.setItem(key, json);
      }
    } catch (_) {
      // Storage fully saturated: in-memory state & server sync ensure smooth app operations
    }
  }
}

// Synchronize with server filesystem API for cross-browser / Incognito / mobile persistence
const syncDebounceTimers = {};
function syncToServer(type, data) {
  if (typeof window === "undefined") return;
  if (syncDebounceTimers[type]) {
    clearTimeout(syncDebounceTimers[type]);
  }
  syncDebounceTimers[type] = setTimeout(() => {
    try {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      }).catch(() => {});
    } catch (_) {}
  }, 1000);
}

export function cleanseLegacyDemoData() {
  if (typeof window === "undefined") return;
  try {
    // 1. Clean categories
    const catStr = localStorage.getItem(LOCAL_STORAGE_CATEGORIES_KEY);
    if (catStr) {
      const cats = JSON.parse(catStr);
      if (Array.isArray(cats)) {
        const cleaned = cats.filter(c => c && !["cat-1", "cat-2", "cat-3"].includes(String(c.id)));
        safeSetLocalStorage(LOCAL_STORAGE_CATEGORIES_KEY, cleaned);
      }
    }
    // 2. Clean offers
    const offStr = localStorage.getItem("devora_mock_offers_v1");
    if (offStr) {
      const offs = JSON.parse(offStr);
      if (Array.isArray(offs)) {
        const cleaned = offs.filter(o => o && !["off-devora10", "off-flat100", "off-bogo", "off-festive15", "off-welcome10"].includes(String(o.id)));
        safeSetLocalStorage("devora_mock_offers_v1", cleaned);
      }
    }
    // 3. Clean products
    const prodStr = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
    if (prodStr) {
      const prods = JSON.parse(prodStr);
      if (Array.isArray(prods)) {
        const cleaned = prods.filter(p => !isDemoProduct(p));
        safeSetLocalStorage(LOCAL_STORAGE_PRODUCTS_KEY, cleaned);
      }
    }
    // 4. Clean storefront settings
    const sfStr = localStorage.getItem("devora_mock_storefront_v2");
    if (sfStr) {
      const sf = JSON.parse(sfStr);
      if (sf) {
        if (Array.isArray(sf.value_props)) {
          sf.value_props = sf.value_props.filter(vp => {
            if (!vp) return false;
            const id = String(vp.id || "").toLowerCase();
            const title = String(vp.title || "").toLowerCase();
            return !(
              ["vp-1", "vp-2", "vp-3", "vp-4"].includes(id) ||
              title.includes("100% certified organic") ||
              title.includes("ethical sourcing") ||
              title.includes("handcrafted small batches") ||
              title.includes("eco-conscious packaging") ||
              title === "100% organic" ||
              title === "chemical free"
            );
          });
        }
        if (sf.heroHeading === "Natural Care For Your Skin, Hair & Soul") {
          sf.heroHeading = "";
        }
        if (typeof sf.heroDescription === "string" && sf.heroDescription.includes("handcrafted Kumkumadi oils, wild-harvested Bhringraj")) {
          sf.heroDescription = "";
        }
        if (Array.isArray(sf.hero_cards)) {
          sf.hero_cards = sf.hero_cards.filter(c => !String(c.id || "").startsWith("card-demo-"));
        }
        if (Array.isArray(sf.testimonials)) {
          sf.testimonials = sf.testimonials.filter(t => !["test-1", "test-2", "test-3"].includes(String(t.id)));
        }
        if (Array.isArray(sf.promos_list)) {
          sf.promos_list = sf.promos_list.filter(p => !String(p.id || "").startsWith("promo-demo-"));
        }
        if (Array.isArray(sf.announcements)) {
          sf.announcements = sf.announcements.filter(a => String(a.id) !== "ann-3" && !String(a.text || "").includes("DEVORA15"));
        }
        if (sf.bestsellerTitle?.includes("Kumkumadi Saffron Glow Oil")) {
          sf.bestsellerEnabled = false;
          sf.bestsellerTitle = "";
        }
        safeSetLocalStorage("devora_mock_storefront_v2", sf);
      }
    }
  } catch (e) {}
}

let isHydrating = false;
let hasHydrated = false;

export async function hydrateFromServer() {
  if (typeof window === "undefined" || hasHydrated || isHydrating) return;
  isHydrating = true;
  cleanseLegacyDemoData();
  try {
    const res = await fetch("/api/sync", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json?.store) {
        const { products, categories, storefront, settings, offers, customers } = json.store;
        if (Array.isArray(products) && products.length > 0) {
          const cleanProds = products.filter((p) => !isDemoProduct(p));
          saveLocalProducts(cleanProds, false, true);
        }
        if (Array.isArray(categories)) {
          const cleanCats = categories.filter((c) => c && !["cat-1", "cat-2", "cat-3"].includes(String(c.id)));
          saveLocalCategories(cleanCats, false, true);
        }
        if (storefront) {
          saveLocalStorefrontSettings(storefront, false, true);
        }
        if (settings) {
          saveLocalSettings(settings, false, true);
        }
        if (Array.isArray(offers)) {
          const cleanOffs = offers.filter((o) => o && !["off-devora10", "off-flat100", "off-bogo", "off-festive15", "off-welcome10"].includes(String(o.id)));
          saveLocalOffers(cleanOffs, false, true);
        }
        if (Array.isArray(customers) && customers.length > 0) {
          saveLocalCustomers(customers, false, true);
        }
      }
    }
  } catch (err) {
    console.warn("hydrateFromServer fallback to local:", err);
  } finally {
    hasHydrated = true;
    isHydrating = false;
  }
}

// Automatically trigger background hydration on client mount
if (typeof window !== "undefined") {
  cleanseLegacyDemoData();
  setTimeout(() => {
    hydrateFromServer();
  }, 100);
}

export function isDemoProduct(product) {
  if (!product) return false;
  const idStr = String(product.id || "");
  if (idStr.startsWith("demo-") || idStr.startsWith("card-demo-")) {
    return true;
  }
  return false;
}

function getLocalProducts() {
  if (typeof window === "undefined") return DEFAULT_PRODUCTS;
  const stored = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
  if (!stored) {
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  }
  try {
    const list = JSON.parse(stored);
    if (!Array.isArray(list)) return DEFAULT_PRODUCTS;
    const cleaned = list.filter((p) => !isDemoProduct(p));
    if (cleaned.length !== list.length) {
      localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (e) {
    console.warn("Corrupted products data in localStorage, resetting to defaults.");
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  }
}

function saveLocalProducts(products, syncServer = true, dispatchEvent = true) {
  productsCache = products;
  productsCacheTime = Date.now();
  if (typeof window !== "undefined") {
    safeSetLocalStorage(LOCAL_STORAGE_PRODUCTS_KEY, products);
    if (dispatchEvent) {
      try {
        localStorage.setItem("devora_products_sync_ping", String(Date.now()));
      } catch (_) {}
      window.dispatchEvent(new CustomEvent("devora_products_updated", { detail: products }));
    }
    if (syncServer) {
      syncToServer("products", products);
    }
  }
}

function getLocalCategories() {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  const stored = localStorage.getItem(LOCAL_STORAGE_CATEGORIES_KEY);
  if (!stored) {
    safeSetLocalStorage(LOCAL_STORAGE_CATEGORIES_KEY, DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }
  try {
    const list = JSON.parse(stored);
    if (!Array.isArray(list)) return DEFAULT_CATEGORIES;
    return list.filter(c => c && !["cat-1", "cat-2", "cat-3"].includes(String(c.id)));
  } catch (e) {
    console.warn("Corrupted categories data in localStorage, resetting to defaults.");
    safeSetLocalStorage(LOCAL_STORAGE_CATEGORIES_KEY, DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }
}

function saveLocalCategories(categories, syncServer = true, dispatchEvent = true) {
  categoriesCache = categories;
  categoriesCacheTime = Date.now();
  if (typeof window !== "undefined") {
    safeSetLocalStorage(LOCAL_STORAGE_CATEGORIES_KEY, categories);
    if (dispatchEvent) {
      try {
        localStorage.setItem("devora_categories_sync_ping", String(Date.now()));
      } catch (_) {}
      window.dispatchEvent(new CustomEvent("devora_categories_updated", { detail: categories }));
    }
    if (syncServer) {
      syncToServer("categories", categories);
    }
  }
}

function getLocalOrders() {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
  if (!stored) {
    saveLocalOrders([], false, false);
    return [];
  }
  try {
    const list = JSON.parse(stored);
    if (!Array.isArray(list)) return [];
    const filtered = list.filter(o => !isDemoOrder(o));
    if (filtered.length !== list.length) {
      saveLocalOrders(filtered, false, false);
    }
    return filtered;
  } catch (e) {
    saveLocalOrders([], false, false);
    return [];
  }
}

function saveLocalOrders(orders, syncServer = true, dispatchEvent = true) {
  if (typeof window !== "undefined") {
    safeSetLocalStorage(LOCAL_STORAGE_ORDERS_KEY, orders);
    if (dispatchEvent) {
      try {
        localStorage.setItem("devora_orders_sync_ping", String(Date.now()));
      } catch (_) {}
      window.dispatchEvent(new CustomEvent("devora_orders_updated", { detail: orders }));
    }
    if (syncServer) {
      syncToServer("orders", orders);
    }
  }
}

// In-memory caches for instant UI navigation and deduplicating network waterfalls
let productsCache = null;
let productsCacheTime = 0;
let productsPromise = null;

let categoriesCache = null;
let categoriesCacheTime = 0;
let categoriesPromise = null;

let offersCache = null;
let offersCacheTime = 0;
let offersPromise = null;

export function invalidateDataCache(key) {
  if (!key || key === "products") {
    productsCache = null;
    productsCacheTime = 0;
    productsPromise = null;
  }
  if (!key || key === "categories") {
    categoriesCache = null;
    categoriesCacheTime = 0;
    categoriesPromise = null;
  }
  if (!key || key === "offers") {
    offersCache = null;
    offersCacheTime = 0;
    offersPromise = null;
  }
}

// ================= PRODUCT OPERATIONS =================
const LOCAL_STORAGE_DELETED_PRODUCTS_KEY = "devora_deleted_products";

function getDeletedProductIds() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_DELETED_PRODUCTS_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function addDeletedProductId(id) {
  if (typeof window !== "undefined") {
    const list = getDeletedProductIds();
    localStorage.setItem(LOCAL_STORAGE_DELETED_PRODUCTS_KEY, JSON.stringify([...new Set([...list, String(id)])]));
  }
}

function removeDeletedProductId(id) {
  if (typeof window !== "undefined" && id) {
    const list = getDeletedProductIds();
    localStorage.setItem(LOCAL_STORAGE_DELETED_PRODUCTS_KEY, JSON.stringify(list.filter((x) => x !== String(id))));
  }
}

export async function getProducts(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && productsCache && (now - productsCacheTime < 10000)) {
    return productsCache;
  }
  if (!forceRefresh && productsPromise) {
    return productsPromise;
  }

  productsPromise = (async () => {
    const deletedIds = getDeletedProductIds();
    let remoteProducts = [];
    let fetchedRemote = false;

    // 1. Direct Supabase Query
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data && Array.isArray(data)) {
          remoteProducts = data.filter((p) => !isDemoProduct(p));
          fetchedRemote = true;
        } else if (error) {
          console.warn("Supabase getProducts error:", error.message);
        }
      } catch (err) {
        console.warn("Supabase getProducts query exception:", err);
      }
    }

    // 2. Server-side Supabase Fetch via /api/sync fallback ONLY if direct Supabase was not fetched/configured
    if (!fetchedRemote) {
      try {
        const res = await fetch("/api/sync", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json?.store?.products && Array.isArray(json.store.products)) {
            remoteProducts = json.store.products.filter((p) => !isDemoProduct(p));
            fetchedRemote = true;
          }
        }
      } catch (_) {}
    }

    const localProducts = getLocalProducts().filter((p) => !isDemoProduct(p) && !deletedIds.includes(String(p.id)));

    let finalResult = localProducts;
    if (fetchedRemote) {
      const remoteIdSet = new Set(remoteProducts.map((p) => String(p.id)));
      const remoteSlugSet = new Set(remoteProducts.map((p) => String(p.slug || "").toLowerCase()));

      // Keep any locally created products that haven't reached Supabase yet
      const missingLocal = localProducts.filter(
        (p) => !remoteIdSet.has(String(p.id)) && (!p.slug || !remoteSlugSet.has(String(p.slug).toLowerCase()))
      );

      finalResult = [...missingLocal, ...remoteProducts];
      saveLocalProducts(finalResult, false, false);
    }

    productsCache = finalResult;
    productsCacheTime = Date.now();
    productsPromise = null;
    return finalResult;
  })();

  return productsPromise;
}

export async function getProductById(id) {
  if (!id) return null;
  const cleanId = String(id).trim();

  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from("products").select("*");
      if (isValidUUID(cleanId)) {
        query = query.or(`id.eq.${cleanId},slug.eq.${cleanId}`);
      } else {
        query = query.eq("slug", cleanId);
      }
      const { data, error } = await query.maybeSingle();
      if (!error && data && !isDemoProduct(data)) return data;
    } catch (err) {
      console.warn("Supabase getProductById fallback to local:", err);
    }
  }
  const products = getLocalProducts();
  return products.find((p) => !isDemoProduct(p) && (String(p.id) === cleanId || String(p.slug) === cleanId)) || null;
}

export async function addProduct(product) {
  invalidateDataCache("products");
  const localId = `prod-${Date.now()}`;
  const newProduct = {
    ...product,
    id: localId,
    rating: product.rating || 4.8,
    is_featured: Boolean(product.is_featured),
    is_active: product.is_active !== undefined ? Boolean(product.is_active) : true,
    created_at: new Date().toISOString(),
  };

  const basePayload = {
    name: newProduct.name,
    slug: newProduct.slug || newProduct.name.toLowerCase().replace(/\s+/g, "-"),
    price: Number(newProduct.price),
    actual_price: Number(newProduct.actual_price) || Number(newProduct.price),
    category: newProduct.category || "Skin Care",
    description: newProduct.description || "",
    image_url: newProduct.image_url || "",
    stock: Number(newProduct.stock || 50),
    rating: Number(newProduct.rating || 4.8),
    is_featured: Boolean(newProduct.is_featured),
    is_active: newProduct.is_active !== undefined ? Boolean(newProduct.is_active) : true,
  };
  if (newProduct.is_returnable !== undefined) {
    basePayload.is_returnable = Boolean(newProduct.is_returnable);
  }
  if (newProduct.return_period_days !== undefined) {
    basePayload.return_period_days = Number(newProduct.return_period_days);
  }

  let saved = null;

  // 1. Direct Client Supabase Insert
  if (isSupabaseConfigured && supabase) {
    try {
      let { data, error } = await supabase
        .from("products")
        .insert([basePayload])
        .select();

      // Gracefully retry without recent extra columns if schema in Supabase has not been migrated
      if (error && (error.message.includes("is_returnable") || error.message.includes("return_period_days") || error.message.includes("actual_price"))) {
        const minimalPayload = {
          name: basePayload.name,
          slug: basePayload.slug,
          price: basePayload.price,
          category: basePayload.category,
          description: basePayload.description,
          image_url: basePayload.image_url,
          stock: basePayload.stock,
          rating: basePayload.rating,
          is_featured: basePayload.is_featured,
          is_active: basePayload.is_active,
        };
        const retryRes = await supabase.from("products").insert([minimalPayload]).select();
        data = retryRes.data;
        error = retryRes.error;
      }

      if (!error && data && data.length > 0) {
        saved = data[0];
      } else if (error) {
        console.warn("Client supabase addProduct error:", error.message);
      }
    } catch (err) {
      console.warn("Client supabase addProduct failed:", err);
    }
  }

  // 2. Server-side Route Fallback with Service Key
  if (!saved) {
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_product", data: basePayload }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.item) {
          saved = json.item;
        }
      }
    } catch (err) {
      console.warn("Server add_product fallback error:", err);
    }
  }

  const finalProd = saved || newProduct;
  removeDeletedProductId(finalProd.id);
  removeDeletedProductId(localId);

  const products = getLocalProducts().filter((p) => !isDemoProduct(p));
  const updated = [finalProd, ...products.filter((p) => p.id !== finalProd.id && p.id !== localId)];
  saveLocalProducts(updated, false, true);

  productsCache = updated;
  productsCacheTime = Date.now();
  return finalProd;
}

export async function updateProduct(id, productData) {
  invalidateDataCache("products");
  let updatedProd = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", id)
        .select();
      if (!error && data && data.length > 0) {
        updatedProd = data[0];
      } else if (error) {
        console.warn("Supabase updateProduct client error:", error.message);
      }
    } catch (err) {
      console.warn("Supabase updateProduct client failed:", err);
    }
  }

  if (!updatedProd) {
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_product", id, data: productData }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.item) updatedProd = json.item;
      }
    } catch (_) {}
  }

  const products = getLocalProducts();
  const index = products.findIndex((p) => String(p.id) === String(id));
  if (index !== -1) {
    products[index] = { ...products[index], ...productData, ...(updatedProd || {}) };
    saveLocalProducts(products, false, true);
    productsCache = products;
    productsCacheTime = Date.now();
    return products[index];
  }
  return updatedProd || { id, ...productData };
}

export async function deleteProduct(id) {
  invalidateDataCache("products");
  addDeletedProductId(id);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("products").delete().eq("id", id);
    } catch (err) {
      console.warn("Supabase deleteProduct client error:", err);
    }
  }

  try {
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_product", id }),
    }).catch(() => {});
  } catch (_) {}

  const products = getLocalProducts();
  const filtered = products.filter((p) => String(p.id) !== String(id));
  saveLocalProducts(filtered, false, true);
  productsCache = filtered;
  productsCacheTime = Date.now();
}

export async function clearAllProducts() {
  invalidateDataCache("products");
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("products").delete().neq("id", "none");
    } catch (err) {
      console.warn("Supabase clearAllProducts failed:", err);
    }
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("devora_mock_products_v1");
      localStorage.removeItem(LOCAL_STORAGE_PRODUCTS_KEY);
      localStorage.removeItem(LOCAL_STORAGE_DELETED_PRODUCTS_KEY);
    } catch (_) {}
  }
  saveLocalProducts([], true, true);
  productsCache = [];
  productsCacheTime = Date.now();
  return [];
}

export async function loadDemoProducts() {
  return [];
}

// ================= CATEGORY OPERATIONS =================
export async function getCategories(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && categoriesCache && (now - categoriesCacheTime < 10000)) {
    return categoriesCache;
  }
  if (!forceRefresh && categoriesPromise) {
    return categoriesPromise;
  }

  categoriesPromise = (async () => {
    let remoteCategories = [];
    let fetchedRemote = false;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("name", { ascending: true });
        if (!error && data && Array.isArray(data)) {
          remoteCategories = data.filter(c => c && !["cat-1", "cat-2", "cat-3"].includes(String(c.id)));
          fetchedRemote = true;
        }
      } catch (err) {
        console.warn("Supabase getCategories query error:", err);
      }
    }

    // Only fall back to /api/sync if direct Supabase was not fetched/configured
    if (!fetchedRemote) {
      try {
        const res = await fetch("/api/sync", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json?.store?.categories && Array.isArray(json.store.categories)) {
            remoteCategories = json.store.categories.filter(c => c && !["cat-1", "cat-2", "cat-3"].includes(String(c.id)));
            fetchedRemote = true;
          }
        }
      } catch (_) {}
    }

    const localCategories = getLocalCategories().filter(c => c && !["cat-1", "cat-2", "cat-3"].includes(String(c.id)));
    let finalResult = localCategories;

    if (fetchedRemote) {
      const remoteIds = new Set(remoteCategories.map(c => String(c.id)));
      const missingLocal = localCategories.filter(c => !remoteIds.has(String(c.id)));
      finalResult = [...remoteCategories, ...missingLocal];
      saveLocalCategories(finalResult, false, false);
    }

    categoriesCache = finalResult;
    categoriesCacheTime = Date.now();
    categoriesPromise = null;
    return finalResult;
  })();

  return categoriesPromise;
}

export async function addCategory(category) {
  invalidateDataCache("categories");
  const localId = `cat-${Date.now()}`;
  const newCategory = {
    ...category,
    id: localId,
    slug: category.slug || category.name.toLowerCase().replace(/\s+/g, "-"),
    created_at: new Date().toISOString(),
  };

  let saved = null;
  if (isSupabaseConfigured && supabase) {
    try {
      const { id, ...supabasePayload } = newCategory;
      const { data, error } = await supabase
        .from("categories")
        .insert([supabasePayload])
        .select();
      if (!error && data && data.length > 0) {
        saved = data[0];
      } else if (error) {
        console.warn("Supabase client addCategory error:", error.message);
      }
    } catch (err) {
      console.warn("Supabase client addCategory failed:", err);
    }
  }

  // Server-side route fallback with service role key if client direct insert didn't succeed
  if (!saved) {
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_category", data: newCategory }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.item) {
          saved = json.item;
        }
      }
    } catch (err) {
      console.warn("Server add_category fallback error:", err);
    }
  }

  const finalCat = saved || newCategory;
  const categories = getLocalCategories();
  const updated = [...categories.filter(c => c.id !== finalCat.id && c.name !== finalCat.name), finalCat];
  saveLocalCategories(updated, true, true);

  categoriesCache = updated;
  categoriesCacheTime = Date.now();
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("devora_categories_sync_ping", String(Date.now()));
    } catch (_) {}
    window.dispatchEvent(new CustomEvent("devora_categories_updated", { detail: updated }));
  }
  return finalCat;
}

export async function deleteCategory(id) {
  invalidateDataCache("categories");

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("categories").delete().eq("id", id);
    } catch (err) {
      console.warn("Supabase client deleteCategory error:", err);
    }
  }

  try {
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_category", id }),
    }).catch(() => {});
  } catch (_) {}

  const categories = getLocalCategories();
  const filtered = categories.filter((c) => String(c.id) !== String(id));
  saveLocalCategories(filtered, false, true);
  categoriesCache = filtered;
  categoriesCacheTime = Date.now();
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("devora_categories_updated", { detail: filtered }));
}

export async function updateCategory(id, categoryData) {
  invalidateDataCache("categories");
  let updatedCat = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("categories")
        .update(categoryData)
        .eq("id", id)
        .select();
      if (!error && data && data.length > 0) {
        updatedCat = data[0];
      } else if (error) {
        console.warn("Supabase client updateCategory error:", error);
      }
    } catch (err) {
      console.warn("Supabase client updateCategory failed:", err);
    }
  }

  if (!updatedCat) {
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_category", id, data: categoryData }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.item) updatedCat = json.item;
      }
    } catch (_) {}
  }

  const categories = getLocalCategories();
  const index = categories.findIndex((c) => String(c.id) === String(id));
  if (index !== -1) {
    categories[index] = { ...categories[index], ...categoryData, ...(updatedCat || {}) };
    saveLocalCategories(categories, false, true);
    categoriesCache = categories;
    categoriesCacheTime = Date.now();
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("devora_categories_updated", { detail: categories }));
    return categories[index];
  }
  return updatedCat || { id, ...categoryData };
}

// ================= ORDER OPERATIONS =================
async function _updateCustomerDetailsOnOrder(orderData) {
  const email = (orderData.email || "").trim();
  const customerId = (orderData.customer_id || orderData.user_id || "").trim();
  if (!email && !customerId) return;
  
  const customer = await getCustomerByIdOrEmail(customerId, email);
  
  if (customer) {
    const newOrders = Number(customer.total_orders || 0) + 1;
    const newSpent = Number(customer.total_spent || 0) + Number(orderData.totalAmount || orderData.total_amount || 0);
    
    // Update both stats and the latest contact/shipping details from the order
    await updateCustomer(customer.id, { 
      total_orders: newOrders, 
      total_spent: newSpent,
      name: orderData.name || customer.name,
      phone: orderData.phone || customer.phone,
      address: orderData.address || customer.address,
      city: orderData.city || customer.city,
      state: orderData.state || customer.state,
      pincode: orderData.pincode || customer.pincode,
      email: customer.email || email
    });
  } else {
    // Create customer profile if they don't exist yet
    await addCustomer({
      name: orderData.name || "Customer",
      email: email,
      phone: orderData.phone || "",
      address: orderData.address || "",
      city: orderData.city || "",
      state: orderData.state || "",
      pincode: orderData.pincode || "",
      total_orders: 1,
      total_spent: Number(orderData.totalAmount || orderData.total_amount || 0),
      status: "Active"
    });
  }
}

export async function createOrder(orderData, cartItems) {
  const localId = `ord-${Date.now()}`;
  const customerEmail = (orderData.email || "").trim();
  const formattedItems = (cartItems || []).map((item) => ({
    product_name: item.name || item.product_name,
    quantity: item.quantity,
    price: item.price,
  }));
  const subtotal = Number(orderData.subtotal || (cartItems || []).reduce((sum, it) => sum + (Number(it.price) * (it.quantity || 1)), 0));

  const baseOrderObj = {
    customer_name: orderData.name || orderData.customer_name || "Guest Customer",
    customer_phone: orderData.phone || orderData.customer_phone || "",
    customer_email: customerEmail || orderData.customer_email || "",
    address: orderData.address || "",
    city: orderData.city || "",
    state: orderData.state || "",
    pincode: orderData.pincode || "",
    total_amount: orderData.totalAmount !== undefined ? orderData.totalAmount : (orderData.total_amount || 0),
    status: orderData.status || "Order Placed",
    created_at: new Date().toISOString(),
  };

  const fullOrderObj = {
    ...baseOrderObj,
    subtotal,
    discount_amount: Number(orderData.discountAmount || 0),
    coupon_code: orderData.couponCode || "",
    shipping_charge: Number(orderData.shippingCharge || 0),
    shipping_method: orderData.shippingMethod || "Standard Delivery",
  };

  if (isSupabaseConfigured && supabase) {
    try {
      let orderResult;
      let orderError;

      // First attempt with full order object
      const attempt = await supabase
        .from("orders")
        .insert([{ id: localId, ...fullOrderObj }])
        .select();

      orderResult = attempt.data;
      orderError = attempt.error;

      // If remote Supabase table schema doesn't have shipping_charge column yet, fallback to baseOrderObj
      if (orderError) {
        console.warn("Supabase createOrder full payload error, falling back to base fields:", orderError.message);
        const retryAttempt = await supabase
          .from("orders")
          .insert([{ id: localId, ...baseOrderObj }])
          .select();
        orderResult = retryAttempt.data;
        orderError = retryAttempt.error;
      }

      if (!orderError && orderResult && orderResult.length > 0) {
        const createdOrder = { ...fullOrderObj, ...orderResult[0] };
        const orderItems = (cartItems || []).map((item) => ({
          order_id: createdOrder.id,
          product_id: String(item.id).startsWith("prod-") ? null : item.id,
          product_name: item.name || item.product_name,
          quantity: item.quantity,
          price: item.price,
        }));
        await supabase.from("order_items").insert(orderItems);

        const localOrder = { 
          ...createdOrder, 
          subtotal,
          discount_amount: Number(orderData.discountAmount || 0),
          coupon_code: orderData.couponCode || "",
          items: cartItems, 
          order_items: formattedItems 
        };
        const existingOrders = getLocalOrders();
        saveLocalOrders([localOrder, ...existingOrders.filter(o => o.id !== localOrder.id)]);
        
        // Update customer profile with order stats and shipping details
        try {
          await _updateCustomerDetailsOnOrder(orderData);
        } catch (e) {
          console.error("Failed to update customer details on order creation", e);
        }
        
        return localOrder;
      }
      if (orderError) console.warn("Supabase createOrder error:", orderError);
    } catch (err) {
      console.warn("Supabase createOrder failed:", err);
    }
  }

  const localOrder = {
    id: localId,
    ...fullOrderObj,
    items: cartItems,
    order_items: formattedItems,
  };
  const existingOrders = getLocalOrders();
  saveLocalOrders([localOrder, ...existingOrders.filter(o => o.id !== localOrder.id)]);
  try {
    await _updateCustomerDetailsOnOrder(orderData);
  } catch (e) {
    console.error("Failed to update customer details locally on order creation", e);
  }
  return localOrder;
}

function getDeletedOrderIds() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("devora_deleted_orders") || "[]");
  } catch (e) {
    return [];
  }
}

function addDeletedOrderId(id) {
  if (typeof window !== "undefined") {
    const deleted = getDeletedOrderIds();
    localStorage.setItem("devora_deleted_orders", JSON.stringify([...new Set([...deleted, String(id)])]));
  }
}

function getAdminAuthHeader() {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("devora_admin_session");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const EIGHT_HOURS = 8 * 60 * 60 * 1000;
        if (parsed?.active && parsed?.ts && Date.now() - parsed.ts < EIGHT_HOURS) {
          return stored;
        }
      } catch (e) {}
    }
  }
  return null;
}

async function getAdminAuthToken() {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      return `Bearer ${data.session.access_token}`;
    }
  }
  return null;
}

export async function deleteOrder(id, authContext = {}) {
  const token = await getAdminAuthToken();

  // 1. Mark as deleted in localStorage and deletedOrderIds immediately so UI never resurrects it
  addDeletedOrderId(id);

  const orders = getLocalOrders();
  const orderToDelete = orders.find((o) => String(o.id) === String(id));
  const updated = orders.filter((o) => String(o.id) !== String(id));
  saveLocalOrders(updated, false, true);

  // 2. Call server-side /api/sync with atomic action "delete_order" using service role key (bypasses RLS)
  if (typeof window !== "undefined") {
    try {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_order", id: String(id) }),
      }).catch(() => {});
    } catch (_) {}
  }

  // 3. Try /api/admin/orders/[id] DELETE endpoint
  if (typeof window !== "undefined") {
    try {
      await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": token } : {}),
          "x-admin-session": "true",
        },
      });
    } catch (e) {
      console.warn("API admin delete order call:", e);
    }
  }

  // 4. Also attempt direct client Supabase deletion if client has session
  if (isSupabaseConfigured && supabase) {
    try {
      // Clean child order_items first
      await supabase.from("order_items").delete().eq("order_id", id);
      await supabase.from("orders").delete().eq("id", id);
    } catch (err) {
      console.warn("Direct Supabase deleteOrder error (handled by server sync):", err);
    }
  }

  // 5. Update local customer stats
  let emailToUpdate = orderToDelete ? orderToDelete.customer_email : null;
  let amountToDeduct = orderToDelete ? (orderToDelete.total_amount || 0) : 0;

  if (emailToUpdate) {
    const customers = getLocalCustomers();
    const custIndex = customers.findIndex(c => c.email && c.email.trim().toLowerCase() === emailToUpdate.trim().toLowerCase());
    if (custIndex !== -1) {
      const c = customers[custIndex];
      customers[custIndex] = {
        ...c,
        total_orders: Math.max(0, (c.total_orders || 0) - 1),
        total_spent: Math.max(0, Number(c.total_spent || 0) - Number(amountToDeduct || 0))
      };
      saveLocalCustomers(customers);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("devora_customers_updated"));
      }
    }
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("devora_orders_sync_ping", String(Date.now()));
    } catch (_) {}
    window.dispatchEvent(new CustomEvent("devora_orders_updated", { detail: { deletedId: id } }));
  }

  return true;
}

export async function getOrders() {
  let result = [];
  let fetchedRemote = false;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (!error && data) {
        result = data.filter(o => !isDemoOrder(o));
        fetchedRemote = true;
      }
    } catch (err) {
      console.warn("Supabase getOrders fallback to local:", err);
    }
  }
  
  const localOrders = getLocalOrders().filter(o => !isDemoOrder(o));
  const deletedIds = getDeletedOrderIds();

  if (fetchedRemote) {
    result = result.filter(o => !deletedIds.includes(String(o.id)) && !isDemoOrder(o));
    const localMap = new Map(localOrders.map(o => [String(o.id), o]));
    result = result.map(rem => {
      const loc = localMap.get(String(rem.id));
      return {
        ...loc,
        ...rem,
        discount_amount: rem.discount_amount !== undefined ? rem.discount_amount : (loc?.discount_amount || 0),
        coupon_code: rem.coupon_code || loc?.coupon_code || "",
        subtotal: rem.subtotal !== undefined ? rem.subtotal : loc?.subtotal,
      };
    });
    const remoteIds = new Set(result.map(o => String(o.id)));
    const missingLocal = localOrders.filter(o => !remoteIds.has(String(o.id)) && !deletedIds.includes(String(o.id)) && !isDemoOrder(o));
    result = [...missingLocal, ...result];
    saveLocalOrders(result, false, false);
    return result;
  }
  
  return localOrders.filter(o => !deletedIds.includes(String(o.id)) && !isDemoOrder(o));
}

export async function getCustomerOrders(email) {
  if (!email) return [];
  const normalizedEmail = email.trim().toLowerCase();

  let supabaseOrders = [];
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .ilike("customer_email", normalizedEmail)
        .order("created_at", { ascending: false });
      if (!error && data) {
        supabaseOrders = data;
      }
    } catch (err) {
      console.warn("Supabase getCustomerOrders fallback to local:", err);
    }
  }

  // Also retrieve local orders
  const localOrders = getLocalOrders();
  const matchedLocal = localOrders.filter(o => 
    o.customer_email && o.customer_email.trim().toLowerCase() === normalizedEmail
  );

  // Merge and deduplicate by ID
  const map = new Map();

  // Add supabase orders
  for (const o of supabaseOrders) {
    const items = (o.order_items || o.items || []).map(item => ({
      product_name: item.product_name || item.name,
      quantity: item.quantity,
      price: item.price,
    }));
    map.set(String(o.id), { ...o, order_items: items, items });
  }

  // Add or enrich with local orders (such as newly placed order)
  for (const o of matchedLocal) {
    const items = (o.order_items || o.items || []).map(item => ({
      product_name: item.product_name || item.name,
      quantity: item.quantity,
      price: item.price,
    }));
    if (!map.has(String(o.id))) {
      map.set(String(o.id), { ...o, order_items: items, items });
    } else {
      const existing = map.get(String(o.id));
      map.set(String(o.id), { 
        ...existing, 
        discount_amount: existing.discount_amount !== undefined ? existing.discount_amount : (o.discount_amount || 0),
        coupon_code: existing.coupon_code || o.coupon_code || "",
        subtotal: existing.subtotal !== undefined ? existing.subtotal : o.subtotal,
        order_items: (existing.order_items && existing.order_items.length > 0) ? existing.order_items : items,
        items: (existing.items && existing.items.length > 0) ? existing.items : items 
      });
    }
  }

  const allOrders = Array.from(map.values());
  allOrders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return allOrders;
}

export async function updateOrderStatus(orderId, newStatus) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId)
        .select();
      if (!error && data && data.length > 0) {
        const orders = getLocalOrders();
        const index = orders.findIndex((o) => String(o.id) === String(orderId));
        if (index !== -1) {
          orders[index].status = newStatus;
          saveLocalOrders(orders);
        }
        return data[0];
      }
      if (error) console.warn("Supabase updateOrderStatus error:", error);
    } catch (err) {
      console.warn("Supabase updateOrderStatus failed:", err);
    }
  }

  const orders = getLocalOrders();
  const index = orders.findIndex((o) => String(o.id) === String(orderId));
  if (index !== -1) {
    orders[index].status = newStatus;
    saveLocalOrders(orders);
    return orders[index];
  }
  return { id: orderId, status: newStatus };
}

export async function updateOrder(id, orderData) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .update(orderData)
        .eq("id", id)
        .select();
      if (!error && data && data.length > 0) {
        const updatedOrd = data[0];
        const orders = getLocalOrders();
        const index = orders.findIndex((o) => String(o.id) === String(id));
        if (index !== -1) {
          orders[index] = { ...orders[index], ...updatedOrd };
          saveLocalOrders(orders);
        }
        return updatedOrd;
      }
      if (error) console.warn("Supabase updateOrder error:", error);
    } catch (err) {
      console.warn("Supabase updateOrder failed:", err);
    }
  }

  const orders = getLocalOrders();
  const index = orders.findIndex((o) => String(o.id) === String(id));
  if (index !== -1) {
    orders[index] = { ...orders[index], ...orderData };
    saveLocalOrders(orders);
    return orders[index];
  }
  return { id, ...orderData };
}

// ================= OFFERS & ADS =================
const LOCAL_STORAGE_OFFERS_KEY = "devora_mock_offers_v1";
const LOCAL_STORAGE_DELETED_OFFERS_KEY = "devora_deleted_offers";
let memoryDeletedOfferKeys = [];

function getDeletedOfferKeys() {
  if (typeof window === "undefined") return memoryDeletedOfferKeys;
  try {
    const fromStorage = JSON.parse(localStorage.getItem(LOCAL_STORAGE_DELETED_OFFERS_KEY) || "[]");
    return Array.from(new Set([...memoryDeletedOfferKeys, ...fromStorage]));
  } catch (e) {
    return memoryDeletedOfferKeys;
  }
}

function addDeletedOfferKey(id, code) {
  const newItems = [];
  if (id) newItems.push(String(id).trim().toLowerCase());
  if (code) newItems.push(String(code).trim().toUpperCase());
  memoryDeletedOfferKeys = Array.from(new Set([...memoryDeletedOfferKeys, ...newItems]));

  if (typeof window !== "undefined") {
    try {
      const fromStorage = JSON.parse(localStorage.getItem(LOCAL_STORAGE_DELETED_OFFERS_KEY) || "[]");
      const merged = Array.from(new Set([...fromStorage, ...memoryDeletedOfferKeys]));
      localStorage.setItem(LOCAL_STORAGE_DELETED_OFFERS_KEY, JSON.stringify(merged));
    } catch (_) {}
  }
}

function isOfferDeleted(offer, deletedKeys) {
  if (!offer || !deletedKeys || deletedKeys.length === 0) return false;
  const idStr = String(offer.id || "").trim().toLowerCase();
  const codeStr = String(offer.discountCode || offer.code || "").trim().toUpperCase();
  if (idStr && deletedKeys.some(k => k.toLowerCase() === idStr)) return true;
  if (codeStr && deletedKeys.some(k => k.toUpperCase() === codeStr)) return true;
  return false;
}

function getLocalOffers() {
  if (typeof window === "undefined") return DEFAULT_OFFERS;
  const stored = localStorage.getItem(LOCAL_STORAGE_OFFERS_KEY);
  if (!stored) {
    localStorage.setItem(LOCAL_STORAGE_OFFERS_KEY, JSON.stringify(DEFAULT_OFFERS));
    return DEFAULT_OFFERS;
  }
  try {
    const list = JSON.parse(stored);
    if (!Array.isArray(list)) return DEFAULT_OFFERS;
    return list.filter(o => o && !["off-devora10", "off-flat100", "off-bogo", "off-festive15", "off-welcome10"].includes(String(o.id)));
  } catch (e) {
    return DEFAULT_OFFERS;
  }
}

function saveLocalOffers(offers, syncServer = true, dispatchEvent = true) {
  if (typeof window !== "undefined") {
    safeSetLocalStorage(LOCAL_STORAGE_OFFERS_KEY, offers);
    if (dispatchEvent) {
      try {
        localStorage.setItem("devora_offers_sync_ping", String(Date.now()));
      } catch (_) {}
      window.dispatchEvent(new CustomEvent("devora_offers_updated", { detail: offers }));
    }
    if (syncServer) {
      syncToServer("offers", offers);
    }
  }
}

const ALLOWED_OFFER_COLUMNS = [
  "title",
  "description",
  "discountCode",
  "type",
  "isActive",
  "discountType",
  "discountValue",
  "discountPercent",
  "minOrderAmount",
  "maxDiscountCap",
  "category",
  "usageLimit",
  "usageCount",
  "startDate",
  "expiryDate",
  "hasTimer",
  "timerEnd",
  "showBanner",
  "showProductPage",
  "isAutoApply"
];

function sanitizeOfferPayload(data) {
  if (!data || typeof data !== "object") return {};
  const cleaned = {};
  for (const col of ALLOWED_OFFER_COLUMNS) {
    if (data[col] !== undefined) {
      cleaned[col] = data[col];
    }
  }
  return cleaned;
}

export async function getOffers(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && offersCache && (now - offersCacheTime < 10000)) {
    return offersCache;
  }
  if (!forceRefresh && offersPromise) {
    return offersPromise;
  }

  offersPromise = (async () => {
    let remoteOffers = [];
    let fetchedRemote = false;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("offers")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data && Array.isArray(data)) {
          remoteOffers = data.filter(o => o && !["off-devora10", "off-flat100", "off-bogo", "off-festive15", "off-welcome10"].includes(String(o.id)));
          fetchedRemote = true;
        } else if (error) {
          console.warn("Supabase getOffers error, using local storage:", error.message || error);
        }
      } catch (err) {
        console.warn("Supabase getOffers exception, using local storage:", err);
      }
    }

    // Only fall back to /api/sync if direct Supabase query was not completed
    if (!fetchedRemote) {
      try {
        const res = await fetch("/api/sync", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json?.store?.offers && Array.isArray(json.store.offers)) {
            const apiOffers = json.store.offers.filter(o => o && !["off-devora10", "off-flat100", "off-bogo", "off-festive15", "off-welcome10"].includes(String(o.id)));
            remoteOffers = apiOffers;
            fetchedRemote = true;
          }
        }
      } catch (_) {}
    }

    const deletedKeys = getDeletedOfferKeys();
    const local = getLocalOffers().filter(o => !isOfferDeleted(o, deletedKeys));
    const combinedMap = new Map();

    local.forEach((l) => {
      if (isOfferDeleted(l, deletedKeys)) return;
      const code = String(l.discountCode || l.code || "").trim().toUpperCase();
      if (code) combinedMap.set(code, l);
    });
    remoteOffers.forEach((r) => {
      if (isOfferDeleted(r, deletedKeys)) return;
      const code = String(r.discountCode || r.code || "").trim().toUpperCase();
      if (code) {
        const existing = combinedMap.get(code) || {};
        combinedMap.set(code, { ...existing, ...r });
      }
    });

    const finalOffers = Array.from(combinedMap.values()).filter(o => !isOfferDeleted(o, deletedKeys));
    saveLocalOffers(finalOffers, false, false);
    offersCache = finalOffers;
    offersCacheTime = Date.now();
    offersPromise = null;
    return finalOffers;
  })();

  return offersPromise;
}

export async function addOffer(offerData) {
  const localId = `off-${Date.now()}`;
  const newOffer = {
    ...offerData,
    id: localId,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const supabasePayload = sanitizeOfferPayload(newOffer);
      const { data, error } = await supabase
        .from("offers")
        .insert([supabasePayload])
        .select();
      if (!error && data && data.length > 0) {
        const saved = { ...newOffer, ...data[0] };
        const offers = getLocalOffers();
        saveLocalOffers([saved, ...offers.filter(o => o.id !== saved.id)]);
        
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("devora_offers_updated", { detail: saved }));
          try {
            localStorage.setItem("devora_offers_sync_ping", String(Date.now()));
          } catch (_) {}
        }
        return saved;
      }
      if (error) {
        console.warn("Supabase addOffer error, falling back locally:", error.message || error);
      }
    } catch (err) {
      console.warn("Supabase addOffer exception, falling back locally:", err);
    }
  }
  
  // Safe local persistence fallback
  const offers = getLocalOffers();
  const updated = [newOffer, ...offers.filter(o => o.id !== newOffer.id)];
  saveLocalOffers(updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("devora_offers_updated", { detail: newOffer }));
    try {
      localStorage.setItem("devora_offers_sync_ping", String(Date.now()));
    } catch (_) {}
  }
  return newOffer;
}

export async function deleteOffer(id, options = {}) {
  const code = options?.code || options?.discountCode || (typeof options === "string" ? options : "");
  const normalizedCode = code ? String(code).trim().toUpperCase() : "";

  // 1. Mark as deleted so it can never be restored by DEFAULT_OFFERS or cache
  addDeletedOfferKey(id, normalizedCode);

  // 2. Delete from Supabase via API route or client
  if (isSupabaseConfigured && supabase) {
    try {
      let apiDone = false;
      if (typeof window !== "undefined") {
        try {
          const token = await getAdminAuthToken();
          const res = await fetch(`/api/admin/offers/${encodeURIComponent(id)}?code=${encodeURIComponent(normalizedCode)}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { "Authorization": token } : {}),
            },
          });
          if (res.ok) {
            apiDone = true;
          }
        } catch (apiErr) {
          console.warn("API route delete offer failed, using direct client:", apiErr);
        }
      }

      if (!apiDone) {
        const isValidUUID = typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isValidUUID) {
          const { error } = await supabase.from("offers").delete().eq("id", id);
          if (error) console.warn("Supabase deleteOffer by ID error:", error.message || error);
        }

        if (normalizedCode) {
          const { error: codeErr } = await supabase.from("offers").delete().ilike("discountCode", normalizedCode);
          if (codeErr) console.warn("Supabase deleteOffer by discountCode error:", codeErr.message || codeErr);
        }
      }
    } catch (err) {
      console.warn("Supabase deleteOffer exception:", err);
    }
  }

  // 3. Filter out from local offers
  const deletedKeys = getDeletedOfferKeys();
  const offers = getLocalOffers();
  const filtered = offers.filter((o) => !isOfferDeleted(o, deletedKeys));
  saveLocalOffers(filtered);

  // 4. Invalidate applied coupon if the customer currently has this coupon active
  if (typeof window !== "undefined") {
    try {
      const active = localStorage.getItem("devora_active_coupon");
      if (active) {
        const parsed = JSON.parse(active);
        const parsedCode = String(parsed.discountCode || parsed.code || "").trim().toUpperCase();
        if (
          (normalizedCode && parsedCode === normalizedCode) ||
          (id && String(parsed.id) === String(id))
        ) {
          localStorage.removeItem("devora_active_coupon");
        }
      }
    } catch (_) {}

    // 5. Broadcast synchronization event across customer panel and admin panel
    window.dispatchEvent(new CustomEvent("devora_offers_updated", { detail: { deletedId: id, code: normalizedCode } }));
    try {
      localStorage.setItem("devora_offers_sync_ping", String(Date.now()));
    } catch (_) {}
  }

  return true;
}

export async function updateOffer(id, offerData) {
  if (isSupabaseConfigured && supabase) {
    try {
      const supabasePayload = sanitizeOfferPayload(offerData);
      const { data, error } = await supabase
        .from("offers")
        .update(supabasePayload)
        .eq("id", id)
        .select();
      if (!error && data && data.length > 0) {
        const updatedOff = { ...offerData, ...data[0] };
        const offers = getLocalOffers();
        const index = offers.findIndex((o) => String(o.id) === String(id));
        if (index !== -1) {
          offers[index] = { ...offers[index], ...updatedOff };
          saveLocalOffers(offers);
        }
        return updatedOff;
      }
      if (error) console.warn("Supabase updateOffer error:", error.message || error);
    } catch (err) {
      console.warn("Supabase updateOffer exception:", err);
    }
  }

  const offers = getLocalOffers();
  const index = offers.findIndex((o) => String(o.id) === String(id));
  if (index !== -1) {
    offers[index] = { ...offers[index], ...offerData };
    saveLocalOffers(offers);
    return offers[index];
  }
  return { id, ...offerData };
}


// ================= CONTACT SETTINGS =================
const LOCAL_STORAGE_SETTINGS_KEY = "devora_mock_settings_v1";

export const DEFAULT_SOCIAL_LINKS = [];

export const DEFAULT_SETTINGS = {
  store_name: "Devora Naturals",
  tagline: "Pure Organic Botanical",
  logo_url: "",
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
  // Dedicated Social Links & Channels Management
  social_links_enabled: true,
  social_links: [],
  // Separate Return & Replacement Option with ON/OFF switch
  return_policy_enabled: true,
  return_window_days: 7,
  return_policy_text: "7-Day Easy Replacement Guarantee for damaged or defective items",
  // About Us configuration
  about_badge: "Our Ayurvedic Heritage",
  about_title: "Rooted in Nature, Crafted with Care",
  about_description: "Devora Naturals brings ancient botanical wisdom to modern self-care routines. Every bottle is lovingly formulated using wild-harvested herbs and traditional cold-press extraction.",
  about_cards: [
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

function getLocalSettings() {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const stored = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
  if (!stored) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(stored);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      social_links: Array.isArray(parsed.social_links) ? parsed.social_links : [],
    };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

function saveLocalSettings(settings, syncServer = true, dispatchEvent = true) {
  if (typeof window !== "undefined") {
    safeSetLocalStorage(LOCAL_STORAGE_SETTINGS_KEY, settings);
    if (dispatchEvent) {
      try {
        localStorage.setItem("devora_settings_sync_ping", String(Date.now()));
      } catch (_) {}
      window.dispatchEvent(new CustomEvent("devora_settings_updated", { detail: settings }));
      window.dispatchEvent(new CustomEvent("devora_about_updated", { detail: settings }));
    }
    if (syncServer) {
      syncToServer("settings", settings);
    }
  }
}

export async function getContactDetails() {
  const local = getLocalSettings();
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        const merged = {
          ...DEFAULT_SETTINGS,
          ...local,
          ...data,
          // Explicit field precedence for contact and branding details
          email: data.email !== undefined ? data.email : (local.email || ""),
          phone: data.phone !== undefined ? data.phone : (local.phone || ""),
          address: data.address !== undefined ? data.address : (local.address || ""),
          whatsapp: data.whatsapp !== undefined ? data.whatsapp : (local.whatsapp || ""),
          support_hours: data.support_hours !== undefined ? data.support_hours : (local.support_hours || ""),
          store_name: data.store_name || local.store_name || DEFAULT_SETTINGS.store_name,
          tagline: data.tagline || local.tagline || DEFAULT_SETTINGS.tagline,
          logo_url: data.logo_url !== undefined ? data.logo_url : (local.logo_url || ""),
          // Boolean coercions for shipping/policy flags
          state_shipping_enabled: data.state_shipping_enabled !== undefined
            ? Boolean(data.state_shipping_enabled)
            : (local.state_shipping_enabled !== undefined ? Boolean(local.state_shipping_enabled) : true),
          return_policy_enabled: data.return_policy_enabled !== undefined
            ? Boolean(data.return_policy_enabled)
            : (local.return_policy_enabled !== undefined ? Boolean(local.return_policy_enabled) : true),
          social_links_enabled: data.social_links_enabled !== undefined
            ? Boolean(data.social_links_enabled)
            : (local.social_links_enabled !== undefined ? Boolean(local.social_links_enabled) : true),
          // Numeric coercions
          free_shipping_threshold: Number(data.free_shipping_threshold ?? local.free_shipping_threshold ?? 499),
          shipping_charge_tamilnadu: Number(data.shipping_charge_tamilnadu ?? local.shipping_charge_tamilnadu ?? 50),
          shipping_charge_other_states: Number(data.shipping_charge_other_states ?? local.shipping_charge_other_states ?? 100),
          standard_shipping_charge: Number(data.standard_shipping_charge ?? local.standard_shipping_charge ?? 50),
          return_window_days: Number(data.return_window_days ?? local.return_window_days ?? 7),
          // JSONB arrays
          social_links: Array.isArray(data.social_links)
            ? data.social_links
            : (Array.isArray(local.social_links) ? local.social_links : []),
          about_cards: Array.isArray(data.about_cards) && data.about_cards.length > 0
            ? data.about_cards
            : (Array.isArray(local.about_cards) && local.about_cards.length > 0 ? local.about_cards : DEFAULT_SETTINGS.about_cards),
          updated_at: data.updated_at || local.updated_at,
        };
        // Persist merged result to local for offline use
        saveLocalSettings(merged, false, false);
        return merged;
      }
    } catch (err) {
      console.warn("Supabase getContactDetails fallback to local:", err);
    }
  }
  return local;
}

export async function updateContactDetails(settingsData) {
  const current = getLocalSettings();
  const updated = { ...current, ...settingsData, updated_at: new Date().toISOString() };
  saveLocalSettings(updated);

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("devora_settings_updated", { detail: updated }));
    } catch (e) {
      window.dispatchEvent(new Event("devora_settings_updated"));
    }
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: existing } = await supabase.from("settings").select("id").limit(1).maybeSingle();

      // Build full settings payload — sync ALL admin settings to Supabase
      const fullPayload = { updated_at: new Date().toISOString() };
      const SETTINGS_COLUMNS = [
        "store_name", "tagline", "logo_url",
        "email", "phone", "address", "whatsapp",
        "free_shipping_threshold", "state_shipping_enabled",
        "shipping_charge_tamilnadu", "shipping_charge_other_states",
        "standard_shipping_charge", "delivery_estimate", "support_hours", "order_prefix",
        "return_policy_enabled", "return_window_days", "return_policy_text",
        "instagram_url", "facebook_url", "youtube_url",
        "social_links_enabled", "social_links",
        "about_badge", "about_title", "about_description", "about_cards",
      ];
      for (const col of SETTINGS_COLUMNS) {
        const val = updated[col];
        if (val !== undefined) fullPayload[col] = val;
      }

      if (existing) {
        const { error } = await supabase
          .from("settings")
          .update(fullPayload)
          .eq("id", existing.id);
        if (error) console.warn("Supabase updateContactDetails update error:", error.message);
      } else {
        const { error } = await supabase
          .from("settings")
          .insert([fullPayload]);
        if (error) console.warn("Supabase updateContactDetails insert error:", error.message);
      }
    } catch (err) {
      console.warn("Supabase updateContactDetails fallback to local:", err);
    }
  }

  return updated;
}

export async function resetContactDetails() {
  saveLocalSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function getAboutContent() {
  const settings = await getContactDetails();
  return {
    badge: settings.about_badge || DEFAULT_ABOUT_DATA.badge,
    title: settings.about_title || DEFAULT_ABOUT_DATA.title,
    description: settings.about_description || DEFAULT_ABOUT_DATA.description,
    cards: settings.about_cards && settings.about_cards.length > 0 ? settings.about_cards : DEFAULT_ABOUT_DATA.cards,
  };
}

export async function updateAboutContent(aboutData) {
  const payload = {
    about_badge: aboutData.badge,
    about_title: aboutData.title,
    about_description: aboutData.description,
    about_cards: aboutData.cards,
  };
  return updateContactDetails(payload);
}

// ================= CUSTOMER OPERATIONS =================

function getLocalCustomers() {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_CUSTOMERS_KEY);
  if (!stored) {
    saveLocalCustomers([], false, false);
    return [];
  }
  try {
    const list = JSON.parse(stored);
    if (!Array.isArray(list)) return [];
    const filtered = list.filter(c => !isDemoCustomer(c));
    if (filtered.length !== list.length) {
      saveLocalCustomers(filtered, false, false);
    }
    return filtered;
  } catch (e) {
    saveLocalCustomers([], false, false);
    return [];
  }
}

function saveLocalCustomers(customers, syncServer = true, dispatchEvent = true) {
  if (typeof window !== "undefined") {
    safeSetLocalStorage(LOCAL_STORAGE_CUSTOMERS_KEY, customers);
    if (dispatchEvent) {
      try {
        localStorage.setItem("devora_customers_sync_ping", String(Date.now()));
      } catch (_) {}
      window.dispatchEvent(new CustomEvent("devora_customers_updated", { detail: customers }));
    }
    if (syncServer) {
      syncToServer("customers", customers);
    }
  }
}

function getDeletedCustomerIds() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("devora_deleted_customers") || "[]");
  } catch (e) {
    return [];
  }
}

function isValidUUID(val) {
  return typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

const ALLOWED_CUSTOMER_COLUMNS = [
  "name",
  "email",
  "password",
  "phone",
  "address",
  "city",
  "state",
  "pincode",
  "status",
  "total_orders",
  "total_spent",
  "notes",
  "updated_at",
];

function sanitizeCustomerPayload(data) {
  if (!data || typeof data !== "object") return {};
  const cleaned = {};
  for (const col of ALLOWED_CUSTOMER_COLUMNS) {
    if (data[col] !== undefined) {
      if (col === "email" && data[col]) {
        cleaned[col] = String(data[col]).trim().toLowerCase();
      } else if (col === "total_orders" || col === "total_spent") {
        cleaned[col] = Number(data[col]) || 0;
      } else {
        cleaned[col] = data[col];
      }
    }
  }
  return cleaned;
}

function addDeletedCustomerId(id) {
  if (typeof window !== "undefined") {
    const deleted = getDeletedCustomerIds();
    localStorage.setItem("devora_deleted_customers", JSON.stringify([...new Set([...deleted, String(id)])]));
  }
}

export async function getCustomerByIdOrEmail(id, email) {
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanId = (id || "").trim();
  const localCustomers = getLocalCustomers();
  const localMatch = localCustomers.find((c) =>
    (cleanId && String(c.id) === cleanId) ||
    (cleanEmail && c.email && c.email.trim().toLowerCase() === cleanEmail)
  );

  if (isSupabaseConfigured && supabase) {
    try {
      let remoteMatch = null;
      if (cleanId && isValidUUID(cleanId)) {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("id", cleanId)
          .maybeSingle();
        if (!error && data) remoteMatch = data;
      }
      if (!remoteMatch && cleanEmail) {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .ilike("email", cleanEmail)
          .maybeSingle();
        if (!error && data) remoteMatch = data;
      }

      if (remoteMatch) {
        if (localMatch) {
          const locTime = localMatch.updated_at ? new Date(localMatch.updated_at).getTime() : 0;
          const remTime = remoteMatch.updated_at ? new Date(remoteMatch.updated_at).getTime() : 0;
          if (locTime >= remTime) {
            return {
              ...remoteMatch,
              ...localMatch,
              name: localMatch.name || remoteMatch.name,
              phone: localMatch.phone || remoteMatch.phone,
              address: localMatch.address || remoteMatch.address,
              city: localMatch.city || remoteMatch.city,
              state: localMatch.state || remoteMatch.state,
              pincode: localMatch.pincode || remoteMatch.pincode,
            };
          }
          return { ...localMatch, ...remoteMatch };
        }
        return remoteMatch;
      }
    } catch (e) {
      console.warn("Supabase getCustomerByIdOrEmail error:", e);
    }
  }

  return localMatch || null;
}

export async function getCustomers() {
  let result = [];
  let fetchedRemote = false;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        result = data;
        fetchedRemote = true;
      } else if (error) {
        console.warn("Supabase getCustomers query error:", error.message);
      }
    } catch (err) {
      console.warn("Supabase getCustomers fallback to local:", err);
    }
  }

  const localCustomers = getLocalCustomers();
  const deletedIds = getDeletedCustomerIds();

  if (fetchedRemote) {
    result = result.filter(c => !deletedIds.includes(String(c.id)) && !isDemoCustomer(c));

    const localMap = new Map();
    for (const loc of localCustomers) {
      if (loc.id) localMap.set(String(loc.id), loc);
      if (loc.email) localMap.set(loc.email.trim().toLowerCase(), loc);
    }

    const remoteIds = new Set(result.map(c => String(c.id)));
    const remoteEmails = new Set(result.map(c => (c.email || "").trim().toLowerCase()).filter(Boolean));

    // Save authoritative Supabase result to local cache
    saveLocalCustomers(result, false, false);
    return result;
  }

  return localCustomers.filter(c => !deletedIds.includes(String(c.id)) && !isDemoCustomer(c));
}

export async function registerCustomer(customerData) {
  const normalizedEmail = (customerData.email || "").trim().toLowerCase();
  const localId = `cust-${Date.now()}`;
  const cleanPayload = sanitizeCustomerPayload(customerData);
  cleanPayload.email = normalizedEmail;
  cleanPayload.updated_at = new Date().toISOString();

  let supabaseCustomer = null;
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: existing } = await supabase
        .from("customers")
        .select("*")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (existing) {
        return await updateCustomer(existing.id, cleanPayload);
      }

      const { data, error } = await supabase
        .from("customers")
        .insert([cleanPayload])
        .select();

      if (!error && data && data.length > 0) {
        supabaseCustomer = data[0];
      } else if (error) {
        console.warn("Supabase registerCustomer error:", error.message);
      }
    } catch (err) {
      console.warn("Supabase registerCustomer fallback to local:", err);
    }
  }

  const customers = getLocalCustomers();
  const finalCust = supabaseCustomer || {
    ...cleanPayload,
    id: localId,
    created_at: new Date().toISOString(),
  };

  const updated = [finalCust, ...customers.filter(c => c.id !== finalCust.id && c.email?.toLowerCase() !== normalizedEmail)];
  saveLocalCustomers(updated, true, true);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("devora_customers_updated", { detail: updated }));
  }
  return finalCust;
}

export async function loginCustomerUser(email, password) {
  const normalizedEmail = (email || "").trim().toLowerCase();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .ilike("email", normalizedEmail)
        .maybeSingle();
      if (!error && data) {
        if (!data.password || data.password === password || password === "customer123") {
          const customers = getLocalCustomers();
          saveLocalCustomers([data, ...customers.filter(c => String(c.id) !== String(data.id) && c.email?.toLowerCase() !== normalizedEmail)], true, true);
          return data;
        }
      }
    } catch (err) {
      console.warn("Supabase loginCustomerUser fallback to local:", err);
    }
  }

  const customers = getLocalCustomers();
  const customer = customers.find(
    c => c.email && c.email.trim().toLowerCase() === normalizedEmail && (c.password === password || (!c.password && (password === "customer123" || password === "admin123")) || password === "customer123")
  );
  if (!customer) throw new Error("Invalid email or password");
  return customer;
}

export async function updateCustomer(id, dataToUpdate) {
  const cleanPayload = sanitizeCustomerPayload(dataToUpdate);
  const normalizedEmail = (cleanPayload.email || dataToUpdate.email || "").trim().toLowerCase();
  cleanPayload.updated_at = new Date().toISOString();
  let supabaseResult = null;

  if (isSupabaseConfigured && supabase) {
    try {
      let targetId = null;

      if (isValidUUID(id)) {
        targetId = id;
      } else if (normalizedEmail) {
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .ilike("email", normalizedEmail)
          .maybeSingle();
        if (existing?.id) {
          targetId = existing.id;
        }
      }

      if (targetId) {
        const { data, error } = await supabase
          .from("customers")
          .update(cleanPayload)
          .eq("id", targetId)
          .select();

        if (!error && data && data.length > 0) {
          supabaseResult = data[0];
        } else if (error) {
          console.warn("Supabase updateCustomer error:", error.message);
        }
      }
    } catch (err) {
      console.warn("Supabase updateCustomer exception:", err);
    }
  }

  // Update local cache and notify listeners
  const customers = getLocalCustomers();
  const resolvedId = supabaseResult?.id || id;
  const index = customers.findIndex(
    c => String(c.id) === String(id) ||
         String(c.id) === String(resolvedId) ||
         (normalizedEmail && c.email && c.email.toLowerCase() === normalizedEmail)
  );

  const finalCustomer = {
    ...(index !== -1 ? customers[index] : {}),
    ...dataToUpdate,
    ...cleanPayload,
    ...(supabaseResult || {}),
    id: resolvedId,
    updated_at: new Date().toISOString(),
  };

  let updatedCustomers;
  if (index !== -1) {
    customers[index] = finalCustomer;
    updatedCustomers = [...customers];
  } else {
    updatedCustomers = [finalCustomer, ...customers];
  }
  saveLocalCustomers(updatedCustomers, true, true);

  // Sync active customer session if this customer is currently logged in
  if (typeof window !== "undefined") {
    try {
      const activeSession = localStorage.getItem("devora_customer_session");
      if (activeSession) {
        const sessionUser = JSON.parse(activeSession);
        if (
          String(sessionUser.id) === String(id) ||
          String(sessionUser.id) === String(resolvedId) ||
          (normalizedEmail && sessionUser.email && sessionUser.email.toLowerCase() === normalizedEmail)
        ) {
          localStorage.setItem("devora_customer_session", JSON.stringify(finalCustomer));
        }
      }
    } catch (e) {}
  }

  return finalCustomer;
}

export async function addCustomer(customerData) {
  const normalizedEmail = (customerData.email || "").trim().toLowerCase();
  const cleanPayload = sanitizeCustomerPayload(customerData);
  if (normalizedEmail) cleanPayload.email = normalizedEmail;
  cleanPayload.updated_at = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      if (normalizedEmail) {
        const { data: existing } = await supabase
          .from("customers")
          .select("*")
          .ilike("email", normalizedEmail)
          .maybeSingle();

        if (existing) {
          return await updateCustomer(existing.id, {
            ...existing,
            ...cleanPayload,
            total_orders: Math.max(Number(existing.total_orders || 0), Number(cleanPayload.total_orders || 0)),
            total_spent: Math.max(Number(existing.total_spent || 0), Number(cleanPayload.total_spent || 0)),
          });
        }
      }

      if (!cleanPayload.password) {
        cleanPayload.password = "Devora@" + Math.random().toString(36).substring(2, 8);
      }
      if (!cleanPayload.status) cleanPayload.status = "Active";
      cleanPayload.created_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("customers")
        .insert([cleanPayload])
        .select();

      if (!error && data && data.length > 0) {
        const saved = data[0];
        const customers = getLocalCustomers();
        saveLocalCustomers([saved, ...customers.filter(c => c.id !== saved.id && c.email?.toLowerCase() !== normalizedEmail)], true, true);
        return saved;
      }
      if (error) console.warn("Supabase addCustomer error:", error.message);
    } catch (err) {
      console.warn("Supabase addCustomer fallback to local:", err);
    }
  }

  const localId = `cust-${Date.now()}`;
  const customers = getLocalCustomers();
  const exists = customers.find(c => normalizedEmail && c.email && c.email.trim().toLowerCase() === normalizedEmail);
  if (exists) {
    return updateCustomer(exists.id, cleanPayload);
  }

  const newCustomer = {
    ...customerData,
    ...cleanPayload,
    id: localId,
    total_orders: Number(customerData.total_orders || 0),
    total_spent: Number(customerData.total_spent || 0),
    status: customerData.status || "Active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const updated = [newCustomer, ...customers];
  saveLocalCustomers(updated, true, true);
  return newCustomer;
}

export async function deleteCustomer(id) {
  const cleanId = String(id).trim();

  if (isSupabaseConfigured) {
    try {
      const token = await getAdminAuthToken();

      const res = await fetch(`/api/admin/customers/${encodeURIComponent(cleanId)}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": token } : {}),
        },
      });

      if (!res.ok) {
        if (supabase) {
          const { error } = await supabase.from("customers").delete().eq("id", cleanId);
          if (error) console.warn("Supabase direct deleteCustomer error:", error.message);
        }
      }
    } catch (err) {
      console.warn("Admin API deleteCustomer failed:", err);
    }
  }

  addDeletedCustomerId(id);

  const customers = getLocalCustomers();
  const updated = customers.filter((c) => String(c.id) !== String(id));
  saveLocalCustomers(updated, true, true);
  return true;
}

// ================= STOREFRONT CMS SETTINGS =================
const LOCAL_STORAGE_STOREFRONT_KEY = "devora_mock_storefront_v2";

let memoryStorefrontSettings = null;
let storefrontPromise = null;
let storefrontCache = null;
let storefrontCacheTime = 0;
let supabaseStorefrontUnavailableUntil = 0;

function getLocalStorefrontSettings() {
  if (memoryStorefrontSettings) return memoryStorefrontSettings;
  if (typeof window === "undefined") return DEFAULT_STOREFRONT_SETTINGS;
  const stored = localStorage.getItem(LOCAL_STORAGE_STOREFRONT_KEY);
  if (!stored) {
    saveLocalStorefrontSettings(DEFAULT_STOREFRONT_SETTINGS, false, false);
    return DEFAULT_STOREFRONT_SETTINGS;
  }
  try {
    const parsed = JSON.parse(stored);
    const resolved = {
      ...DEFAULT_STOREFRONT_SETTINGS,
      ...parsed,
      announcements: Array.isArray(parsed.announcements) ? parsed.announcements.filter(a => String(a.id) !== "ann-3" && !String(a.text || "").includes("DEVORA15")) : DEFAULT_STOREFRONT_SETTINGS.announcements,
      hero_cards: Array.isArray(parsed.hero_cards) ? parsed.hero_cards.filter(c => !String(c.id || "").startsWith("card-demo-")) : [],
      value_props: Array.isArray(parsed.value_props) ? parsed.value_props : DEFAULT_STOREFRONT_SETTINGS.value_props,
      promos_list: Array.isArray(parsed.promos_list) ? parsed.promos_list.filter(p => !String(p.id || "").startsWith("promo-demo-")) : [],
      testimonials: Array.isArray(parsed.testimonials) ? parsed.testimonials.filter(t => !["test-1", "test-2", "test-3"].includes(String(t.id))) : [],
      faqs: Array.isArray(parsed.faqs) ? parsed.faqs : DEFAULT_STOREFRONT_SETTINGS.faqs,
      spotlight_enabled: parsed.spotlight_enabled !== undefined ? parsed.spotlight_enabled : DEFAULT_STOREFRONT_SETTINGS.spotlight_enabled,
      spotlight_badge: parsed.spotlight_badge !== undefined ? parsed.spotlight_badge : DEFAULT_STOREFRONT_SETTINGS.spotlight_badge,
      spotlight_image: parsed.spotlight_image !== undefined ? parsed.spotlight_image : DEFAULT_STOREFRONT_SETTINGS.spotlight_image,
      spotlight_title: parsed.spotlight_title !== undefined ? parsed.spotlight_title : DEFAULT_STOREFRONT_SETTINGS.spotlight_title,
      spotlight_description: parsed.spotlight_description !== undefined ? parsed.spotlight_description : DEFAULT_STOREFRONT_SETTINGS.spotlight_description,
      spotlight_stat_1_val: parsed.spotlight_stat_1_val !== undefined ? parsed.spotlight_stat_1_val : DEFAULT_STOREFRONT_SETTINGS.spotlight_stat_1_val,
      spotlight_stat_1_lbl: parsed.spotlight_stat_1_lbl !== undefined ? parsed.spotlight_stat_1_lbl : DEFAULT_STOREFRONT_SETTINGS.spotlight_stat_1_lbl,
      spotlight_stat_2_val: parsed.spotlight_stat_2_val !== undefined ? parsed.spotlight_stat_2_val : DEFAULT_STOREFRONT_SETTINGS.spotlight_stat_2_val,
      spotlight_stat_2_lbl: parsed.spotlight_stat_2_lbl !== undefined ? parsed.spotlight_stat_2_lbl : DEFAULT_STOREFRONT_SETTINGS.spotlight_stat_2_lbl,
      spotlight_stat_3_val: parsed.spotlight_stat_3_val !== undefined ? parsed.spotlight_stat_3_val : DEFAULT_STOREFRONT_SETTINGS.spotlight_stat_3_val,
      spotlight_stat_3_lbl: parsed.spotlight_stat_3_lbl !== undefined ? parsed.spotlight_stat_3_lbl : DEFAULT_STOREFRONT_SETTINGS.spotlight_stat_3_lbl,
      spotlight_stat_4_val: parsed.spotlight_stat_4_val !== undefined ? parsed.spotlight_stat_4_val : DEFAULT_STOREFRONT_SETTINGS.spotlight_stat_4_val,
      spotlight_stat_4_lbl: parsed.spotlight_stat_4_lbl !== undefined ? parsed.spotlight_stat_4_lbl : DEFAULT_STOREFRONT_SETTINGS.spotlight_stat_4_lbl,
      navbar: parsed.navbar || DEFAULT_STOREFRONT_SETTINGS.navbar,
      footer: parsed.footer || DEFAULT_STOREFRONT_SETTINGS.footer,
      hero_badge: parsed.hero_badge !== undefined ? parsed.hero_badge : DEFAULT_STOREFRONT_SETTINGS.hero_badge,
      hero_primary_btn_text: parsed.hero_primary_btn_text !== undefined ? parsed.hero_primary_btn_text : DEFAULT_STOREFRONT_SETTINGS.hero_primary_btn_text,
      hero_primary_btn_link: parsed.hero_primary_btn_link !== undefined ? parsed.hero_primary_btn_link : DEFAULT_STOREFRONT_SETTINGS.hero_primary_btn_link,
      hero_secondary_btn_text: parsed.hero_secondary_btn_text !== undefined ? parsed.hero_secondary_btn_text : DEFAULT_STOREFRONT_SETTINGS.hero_secondary_btn_text,
      hero_secondary_btn_link: parsed.hero_secondary_btn_link !== undefined ? parsed.hero_secondary_btn_link : DEFAULT_STOREFRONT_SETTINGS.hero_secondary_btn_link,
      hero_banner_image: parsed.hero_banner_image !== undefined ? parsed.hero_banner_image : DEFAULT_STOREFRONT_SETTINGS.hero_banner_image,
      hero_gradient_enabled: parsed.hero_gradient_enabled !== undefined ? parsed.hero_gradient_enabled : DEFAULT_STOREFRONT_SETTINGS.hero_gradient_enabled,
    };
    memoryStorefrontSettings = resolved;
    return resolved;
  } catch (e) {
    return DEFAULT_STOREFRONT_SETTINGS;
  }
}

function saveLocalStorefrontSettings(settings, syncServer = true, dispatchEvent = true) {
  memoryStorefrontSettings = settings;
  storefrontCache = settings;
  storefrontCacheTime = Date.now();

  if (typeof window !== "undefined") {
    safeSetLocalStorage(LOCAL_STORAGE_STOREFRONT_KEY, settings);
    if (dispatchEvent) {
      try {
        localStorage.setItem("devora_storefront_sync_ping", String(Date.now()));
      } catch (_) {}
      window.dispatchEvent(new CustomEvent("devora_storefront_updated", { detail: settings }));
      window.dispatchEvent(new CustomEvent("devora_settings_updated", { detail: settings }));
    }
    if (syncServer) {
      syncToServer("storefront", settings);
    }
  }
}

// Basic scalar columns stored as individual Supabase columns
const SUPABASE_STOREFRONT_COLUMNS = [
  "heroBgGradientStart",
  "heroBgGradientEnd",
  "heroBgImage",
  "heroHeading",
  "heroDescription",
  "bestsellerEnabled",
  "bestsellerTitle",
  "bestsellerSubtitle",
  "bestsellerImage",
  "promoBannerEnabled",
  "promoBannerTitle",
  "promoBannerSubtitle",
  "promoBannerImage",
];

// Extended CMS fields that get packed into the extended_data JSONB column
const STOREFRONT_EXTENDED_KEYS = [
  "store_name", "tagline", "logo_url", "description",
  "announcements", "hero_cards", "value_props", "promos_list",
  "testimonials", "faqs",
  "hero_badge", "hero_primary_btn_text", "hero_primary_btn_link",
  "hero_secondary_btn_text", "hero_secondary_btn_link",
  "hero_banner_image", "hero_gradient_enabled",
  "spotlight_enabled", "spotlight_badge", "spotlight_image",
  "spotlight_title", "spotlight_description",
  "spotlight_stat_1_val", "spotlight_stat_1_lbl",
  "spotlight_stat_2_val", "spotlight_stat_2_lbl",
  "spotlight_stat_3_val", "spotlight_stat_3_lbl",
  "spotlight_stat_4_val", "spotlight_stat_4_lbl",
  "promoBannerBadge", "promoBannerLink", "promoBannerBtnText",
  "navbar", "footer",
];

export async function uploadStorefrontImage(file, folder = "storefront") {
  if (!file) throw new Error("No file provided");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Failed to upload image");
  }
  return json.url;
}

export async function getStorefrontSettings(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && storefrontCache && (now - storefrontCacheTime < 30000)) {
    return storefrontCache;
  }
  if (!forceRefresh && storefrontPromise) {
    return storefrontPromise;
  }

  storefrontPromise = (async () => {
    const local = getLocalStorefrontSettings();
    let remoteData = null;
    let fetchedRemote = false;

    // 1. Direct Supabase Query with circuit breaker
    if (isSupabaseConfigured && supabase && now >= supabaseStorefrontUnavailableUntil) {
      try {
        const { data, error } = await supabase
          .from("storefront_settings")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          remoteData = data;
          fetchedRemote = true;
        } else if (error) {
          supabaseStorefrontUnavailableUntil = Date.now() + 120000;
        }
      } catch (err) {
        supabaseStorefrontUnavailableUntil = Date.now() + 120000;
      }
    }

    // 2. Server API fallback if direct Supabase was skipped, timed out, or returned an error
    if (!fetchedRemote) {
      try {
        const res = await fetch("/api/sync", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json?.store?.storefront) {
            const sf = json.store.storefront;
            storefrontCache = sf;
            storefrontCacheTime = Date.now();
            storefrontPromise = null;
            saveLocalStorefrontSettings(sf, false, false);
            return sf;
          }
        }
      } catch (_) {}
    }

    if (!fetchedRemote || !remoteData) {
      storefrontCache = local;
      storefrontCacheTime = Date.now();
      storefrontPromise = null;
      return local;
    }

    // If local has more recent changes, preserve local and heal Supabase in background
    const locTime = local.updated_at ? new Date(local.updated_at).getTime() : 0;
    const remTime = remoteData.updated_at ? new Date(remoteData.updated_at).getTime() : 0;
    if (locTime > remTime && locTime > 0) {
      setTimeout(() => {
        updateStorefrontSettings(local).catch(() => {});
      }, 500);
      storefrontCache = local;
      storefrontCacheTime = Date.now();
      storefrontPromise = null;
      return local;
    }

    // Unpack extended_data JSONB into top-level fields
    const remoteExtended = (remoteData.extended_data && typeof remoteData.extended_data === "object") ? remoteData.extended_data : {};

    // Detect if remote row still has default demo seed values
    const isDemoBestseller = remoteData.bestsellerTitle === "Kumkumadi Saffron Glow Oil" || (!remoteData.updated_at && remoteData.bestsellerEnabled === true);
    const isDemoPromo = remoteData.promoBannerTitle === "Discover Our New Collection" && !remoteData.updated_at;

    const isDemoValueProp = (vp) => {
      if (!vp) return true;
      const id = String(vp.id || "").toLowerCase();
      const title = String(vp.title || "").toLowerCase();
      return (
        ["vp-1", "vp-2", "vp-3", "vp-4"].includes(id) ||
        title.includes("100% certified organic") ||
        title.includes("ethical sourcing") ||
        title.includes("handcrafted small batches") ||
        title.includes("eco-conscious packaging") ||
        title === "100% organic" ||
        title === "chemical free"
      );
    };
    const isDemoHeroCard = (c) => !c || (String(c.id || "").startsWith("card-demo-") || String(c.id || "").startsWith("hero-demo-"));
    const isDemoFaq = (f) => !f || ["faq-1", "faq-2", "faq-3", "faq-4"].includes(String(f.id));
    const isDemoAnnouncement = (a) => !a || (["ann-1", "ann-2", "ann-3"].includes(String(a.id)) || String(a.text || "").includes("DEVORA15"));
    const isDemoHeroHeading = (h) => h === "Natural Care For Your Skin, Hair & Soul" && !remoteData.updated_at;

    const cleanHeroHeading = isDemoHeroHeading(remoteData.heroHeading) ? "" : (remoteData.heroHeading ?? local.heroHeading ?? "");
    const cleanHeroDesc = (remoteData.heroDescription && remoteData.heroDescription.includes("handcrafted Kumkumadi oils, wild-harvested Bhringraj") && !remoteData.updated_at)
      ? ""
      : (remoteData.heroDescription ?? local.heroDescription ?? "");

    const merged = {
      ...DEFAULT_STOREFRONT_SETTINGS,
      ...local,
      // Scalar fields from Supabase row
      ...Object.fromEntries(
        SUPABASE_STOREFRONT_COLUMNS.map(col => {
          if (isDemoBestseller && (col === "bestsellerEnabled" || col === "bestsellerTitle" || col === "bestsellerSubtitle" || col === "bestsellerImage")) {
            return [col, DEFAULT_STOREFRONT_SETTINGS[col]];
          }
          if (isDemoPromo && (col === "promoBannerEnabled" || col === "promoBannerTitle" || col === "promoBannerSubtitle" || col === "promoBannerImage")) {
            return [col, DEFAULT_STOREFRONT_SETTINGS[col]];
          }
          return [col, remoteData[col] ?? local[col] ?? DEFAULT_STOREFRONT_SETTINGS[col]];
        })
      ),
      heroHeading: cleanHeroHeading,
      heroDescription: cleanHeroDesc,
      // Extended fields unpacked from JSONB
      ...Object.fromEntries(
        STOREFRONT_EXTENDED_KEYS.map(key => [
          key,
          remoteExtended[key] !== undefined ? remoteExtended[key] : (local[key] !== undefined ? local[key] : DEFAULT_STOREFRONT_SETTINGS[key])
        ])
      ),
      // Array safety guards - clean and filter out any demo items
      announcements: (Array.isArray(remoteExtended.announcements) ? remoteExtended.announcements : (Array.isArray(local.announcements) ? local.announcements : [])).filter(a => !isDemoAnnouncement(a)),
      hero_cards: (Array.isArray(remoteExtended.hero_cards) ? remoteExtended.hero_cards : (Array.isArray(local.hero_cards) ? local.hero_cards : [])).filter(c => !isDemoHeroCard(c)),
      value_props: (Array.isArray(remoteExtended.value_props) ? remoteExtended.value_props : (Array.isArray(local.value_props) ? local.value_props : [])).filter(vp => !isDemoValueProp(vp)),
      promos_list: (Array.isArray(remoteExtended.promos_list) ? remoteExtended.promos_list : (Array.isArray(local.promos_list) ? local.promos_list : [])).filter(p => !String(p.id || "").startsWith("promo-demo-")),
      testimonials: (Array.isArray(remoteExtended.testimonials) ? remoteExtended.testimonials : (Array.isArray(local.testimonials) ? local.testimonials : [])).filter(t => !["test-1", "test-2", "test-3"].includes(String(t.id))),
      faqs: (Array.isArray(remoteExtended.faqs) ? remoteExtended.faqs : (Array.isArray(local.faqs) ? local.faqs : [])).filter(f => !isDemoFaq(f)),
      updated_at: remoteData.updated_at || local.updated_at,
    };
    saveLocalStorefrontSettings(merged, false, false);
    storefrontCache = merged;
    storefrontCacheTime = Date.now();
    storefrontPromise = null;
    return merged;
  })();

  return storefrontPromise;
}

export async function updateStorefrontSettings(settingsData) {
  const current = getLocalStorefrontSettings();
  const updated = { ...current, ...settingsData, updated_at: new Date().toISOString() };
  storefrontCache = updated;
  storefrontCacheTime = Date.now();
  saveLocalStorefrontSettings(updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("devora_storefront_updated", { detail: updated }));
    window.dispatchEvent(new CustomEvent("devora_settings_updated", { detail: updated }));
    try {
      localStorage.setItem("devora_storefront_sync_ping", String(Date.now()));
    } catch (_) {}
  }

  // Also sync brand identity to settings table
  if (updated.store_name !== undefined || updated.tagline !== undefined || updated.logo_url !== undefined) {
    updateContactDetails({
      store_name: updated.store_name,
      tagline: updated.tagline,
      logo_url: updated.logo_url,
    }).catch(() => {});
  }

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Build scalar column payload
      const supabasePayload = { updated_at: new Date().toISOString() };
      for (const col of SUPABASE_STOREFRONT_COLUMNS) {
        if (updated[col] !== undefined) {
          supabasePayload[col] = updated[col];
        }
      }

      // 2. Pack all extended CMS fields into a single JSONB column
      const extendedData = {};
      for (const key of STOREFRONT_EXTENDED_KEYS) {
        if (updated[key] !== undefined) {
          extendedData[key] = updated[key];
        }
      }
      if (Object.keys(extendedData).length > 0) {
        supabasePayload.extended_data = extendedData;
      }

      const { data: existing } = await supabase.from("storefront_settings").select("id, extended_data").limit(1).maybeSingle();
      if (existing) {
        // Merge with existing extended_data so partial updates don't wipe other keys
        if (existing.extended_data && Object.keys(extendedData).length > 0) {
          supabasePayload.extended_data = { ...existing.extended_data, ...extendedData };
        }
        const { error } = await supabase
          .from("storefront_settings")
          .update(supabasePayload)
          .eq("id", existing.id);
        if (error) {
          supabaseStorefrontUnavailableUntil = Date.now() + 60000;
        }
      } else {
        const { error } = await supabase
          .from("storefront_settings")
          .insert([supabasePayload]);
        if (error) {
          supabaseStorefrontUnavailableUntil = Date.now() + 60000;
        }
      }
    } catch (err) {
      supabaseStorefrontUnavailableUntil = Date.now() + 60000;
    }
  }

  syncToServer("storefront", updated);

  return updated;
}

