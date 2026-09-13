import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_PRODUCTS,
  DEFAULT_CATEGORIES,
  DEFAULT_OFFERS,
  DEFAULT_SETTINGS,
  DEFAULT_STOREFRONT_SETTINGS,
  DEFAULT_CUSTOMERS,
  DEFAULT_ORDERS,
} from "../../../lib/initialData.js";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serverSupabase =
  supabaseUrl && (supabaseServiceKey || supabaseAnonKey) && !supabaseUrl.includes("your-supabase-project")
    ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: { persistSession: false },
      })
    : null;

const DEMO_PRODUCT_IDS = new Set([
  "prod-1", "prod-2", "prod-3", "prod-4", "prod-5", "prod-6",
  "demo-1", "demo-2", "demo-3", "demo-4", "demo-5", "demo-6"
]);

const DEMO_PRODUCT_SLUGS = new Set([
  "kumkumadi-radiant-face-oil",
  "bhringraj-neem-hair-oil",
  "pure-sambrani-dhoop-cups",
  "organic-rose-water-mist",
  "amla-hibiscus-shampoo",
  "bhimseni-camphor-tablets"
]);

function isDemoProduct(product) {
  if (!product) return false;
  if (DEMO_PRODUCT_IDS.has(String(product.id))) return true;
  if (product.slug && DEMO_PRODUCT_SLUGS.has(String(product.slug).toLowerCase())) return true;
  if (product.name && [
    "Kumkumadi Herbal Radiant Face Oil",
    "Bhringraj & Neem Intensive Hair Growth Oil",
    "Pure Sambrani Dhoop Cups (Pack of 12)",
    "Pure Organic Rose Water Hydrating Mist",
    "Amla & Hibiscus Natural Herbal Shampoo",
    "Organic Bhimseni Camphor Pure Tablets"
  ].includes(product.name)) {
    return true;
  }
  return false;
}

// In-memory cache for fast fallback
let memoryStore = null;

async function getPersistentStore() {
  if (memoryStore) {
    return memoryStore;
  }

  try {
    const fileContent = await fs.readFile(STORE_FILE, "utf-8");
    memoryStore = JSON.parse(fileContent);
    if (Array.isArray(memoryStore.products)) {
      memoryStore.products = memoryStore.products.filter(p => !isDemoProduct(p));
    }
    return memoryStore;
  } catch (err) {
    // If file does not exist, initialize with default initial data
    const initialStore = {
      products: DEFAULT_PRODUCTS.filter(p => !isDemoProduct(p)),
      categories: DEFAULT_CATEGORIES,
      offers: DEFAULT_OFFERS,
      settings: DEFAULT_SETTINGS,
      storefront: DEFAULT_STOREFRONT_SETTINGS,
      customers: DEFAULT_CUSTOMERS,
      orders: DEFAULT_ORDERS,
      updated_at: new Date().toISOString(),
    };

    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(STORE_FILE, JSON.stringify(initialStore, null, 2), "utf-8");
    } catch (writeErr) {
      console.warn("Could not write initial store to disk, using in-memory store:", writeErr);
    }

    memoryStore = initialStore;
    return memoryStore;
  }
}

async function savePersistentStore(updated) {
  if (Array.isArray(updated.products)) {
    updated.products = updated.products.filter(p => !isDemoProduct(p));
  }

  memoryStore = {
    ...memoryStore,
    ...updated,
    updated_at: new Date().toISOString(),
  };

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STORE_FILE, JSON.stringify(memoryStore, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist store to disk, held in memory:", err);
  }

  return memoryStore;
}

async function syncToSupabaseBackground(type, data) {
  if (!serverSupabase || !data) return;
  try {
    if (type === "settings") {
      const { data: existing } = await serverSupabase.from("settings").select("id").limit(1).maybeSingle();
      const payload = { ...data, updated_at: new Date().toISOString() };
      delete payload.id;
      if (existing?.id) {
        await serverSupabase.from("settings").update(payload).eq("id", existing.id);
      } else {
        await serverSupabase.from("settings").insert([payload]);
      }
    } else if (type === "storefront") {
      const { data: existing } = await serverSupabase.from("storefront_settings").select("id, extended_data").limit(1).maybeSingle();
      const payload = {
        heroBgGradientStart: data.heroBgGradientStart,
        heroBgGradientEnd: data.heroBgGradientEnd,
        heroBgImage: data.heroBgImage,
        heroHeading: data.heroHeading,
        heroDescription: data.heroDescription,
        bestsellerEnabled: Boolean(data.bestsellerEnabled),
        bestsellerTitle: data.bestsellerTitle || "",
        bestsellerSubtitle: data.bestsellerSubtitle || "",
        bestsellerImage: data.bestsellerImage || "",
        promoBannerEnabled: Boolean(data.promoBannerEnabled),
        promoBannerTitle: data.promoBannerTitle || "",
        promoBannerSubtitle: data.promoBannerSubtitle || "",
        promoBannerImage: data.promoBannerImage || "",
        extended_data: { ...(existing?.extended_data || {}), ...(data || {}) },
        updated_at: new Date().toISOString(),
      };
      if (existing?.id) {
        await serverSupabase.from("storefront_settings").update(payload).eq("id", existing.id);
      } else {
        await serverSupabase.from("storefront_settings").insert([payload]);
      }
    }
  } catch (err) {
    console.warn("Background syncToSupabase error:", err.message);
  }
}

export async function GET() {
  try {
    const store = await getPersistentStore();
    return NextResponse.json({ success: true, store });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const current = await getPersistentStore();

    let newStore = { ...current };

    if (body.type && body.data !== undefined) {
      newStore[body.type] = body.data;
      syncToSupabaseBackground(body.type, body.data);
    } else {
      // Direct keys passed (e.g. { products: [...], storefront: {...} })
      const allowedKeys = ["products", "categories", "offers", "settings", "storefront", "customers", "orders"];
      for (const key of allowedKeys) {
        if (body[key] !== undefined) {
          newStore[key] = body[key];
          syncToSupabaseBackground(key, body[key]);
        }
      }
    }

    const saved = await savePersistentStore(newStore);
    return NextResponse.json({ success: true, store: saved });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
