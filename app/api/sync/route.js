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

function isDemoProduct(product) {
  if (!product) return false;
  const idStr = String(product.id || "");
  if (idStr.startsWith("demo-") || idStr.startsWith("card-demo-")) {
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
    } else if (type === "products" && Array.isArray(data)) {
      for (const prod of data) {
        if (!isDemoProduct(prod)) {
          const { id, ...payload } = prod;
          const isUUID = typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
          if (isUUID) {
            await serverSupabase.from("products").upsert({ ...payload, id }, { onConflict: "id" });
          } else {
            await serverSupabase.from("products").insert([payload]);
          }
        }
      }
    } else if (type === "categories" && Array.isArray(data)) {
      for (const cat of data) {
        if (cat && !["cat-1", "cat-2", "cat-3"].includes(String(cat.id))) {
          const { id, ...payload } = cat;
          const isUUID = typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
          if (isUUID) {
            await serverSupabase.from("categories").upsert({ ...payload, id }, { onConflict: "id" });
          } else {
            await serverSupabase.from("categories").insert([payload]);
          }
        }
      }
    } else if (type === "offers" && Array.isArray(data)) {
      for (const off of data) {
        if (off && !["off-devora10", "off-flat100", "off-bogo", "off-festive15", "off-welcome10"].includes(String(off.id))) {
          const { id, ...payload } = off;
          const isUUID = typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
          if (isUUID) {
            await serverSupabase.from("offers").upsert({ ...payload, id }, { onConflict: "id" });
          } else {
            await serverSupabase.from("offers").insert([payload]);
          }
        }
      }
    }
  } catch (err) {
    console.warn("Background syncToSupabase error:", err.message);
  }
}

export async function GET() {
  try {
    const store = await getPersistentStore();

    if (serverSupabase) {
      try {
        const [prodRes, catRes, offRes] = await Promise.all([
          serverSupabase.from("products").select("*").order("created_at", { ascending: false }),
          serverSupabase.from("categories").select("*").order("name", { ascending: true }),
          serverSupabase.from("offers").select("*").order("created_at", { ascending: false }),
        ]);

        if (!prodRes.error && Array.isArray(prodRes.data)) {
          store.products = prodRes.data.filter((p) => !isDemoProduct(p));
        }
        if (!catRes.error && Array.isArray(catRes.data)) {
          store.categories = catRes.data.filter((c) => c && !["cat-1", "cat-2", "cat-3"].includes(String(c.id)));
        }
        if (!offRes.error && Array.isArray(offRes.data)) {
          store.offers = offRes.data.filter((o) => o && !["off-devora10", "off-flat100", "off-bogo", "off-festive15", "off-welcome10"].includes(String(o.id)));
        }
      } catch (e) {
        console.warn("serverSupabase get data error:", e.message);
      }
    }

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
