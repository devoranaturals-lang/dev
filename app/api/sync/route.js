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

function isDemoCategory(category) {
  if (!category) return false;
  const idStr = String(category.id || "");
  return ["cat-1", "cat-2", "cat-3"].includes(idStr);
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
    if (Array.isArray(memoryStore.categories)) {
      memoryStore.categories = memoryStore.categories.filter(c => !isDemoCategory(c));
    }
    return memoryStore;
  } catch (err) {
    const initialStore = {
      products: DEFAULT_PRODUCTS.filter(p => !isDemoProduct(p)),
      categories: DEFAULT_CATEGORIES.filter(c => !isDemoCategory(c)),
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
  if (Array.isArray(updated.categories)) {
    updated.categories = updated.categories.filter(c => !isDemoCategory(c));
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
            // Check if product already exists by slug or name before inserting
            const { data: existing } = await serverSupabase
              .from("products")
              .select("id")
              .or(`slug.eq.${payload.slug},name.eq.${payload.name}`)
              .maybeSingle();
            if (existing?.id) {
              await serverSupabase.from("products").update(payload).eq("id", existing.id);
            } else {
              await serverSupabase.from("products").insert([payload]);
            }
          }
        }
      }
    } else if (type === "categories" && Array.isArray(data)) {
      for (const cat of data) {
        if (!isDemoCategory(cat)) {
          const { id, ...payload } = cat;
          const isUUID = typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
          if (isUUID) {
            await serverSupabase.from("categories").upsert({ ...payload, id }, { onConflict: "id" });
          } else {
            // Check if category already exists by slug or name before inserting
            const { data: existing } = await serverSupabase
              .from("categories")
              .select("id")
              .or(`slug.eq.${payload.slug},name.eq.${payload.name}`)
              .maybeSingle();
            if (existing?.id) {
              await serverSupabase.from("categories").update(payload).eq("id", existing.id);
            } else {
              await serverSupabase.from("categories").insert([payload]);
            }
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
            const code = payload.discountCode || payload.code;
            if (code) {
              const { data: existing } = await serverSupabase
                .from("offers")
                .select("id")
                .eq("discountCode", code)
                .maybeSingle();
              if (existing?.id) {
                await serverSupabase.from("offers").update(payload).eq("id", existing.id);
              } else {
                await serverSupabase.from("offers").insert([payload]);
              }
            } else {
              await serverSupabase.from("offers").insert([payload]);
            }
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
        // Run queries with a 1.5s timeout so slow Supabase never stalls page loads
        const fetchPromise = Promise.all([
          serverSupabase.from("products").select("*").order("created_at", { ascending: false }),
          serverSupabase.from("categories").select("*").order("name", { ascending: true }),
          serverSupabase.from("offers").select("*").order("created_at", { ascending: false }),
          serverSupabase.from("storefront_settings").select("*").limit(1).maybeSingle().catch(() => ({ data: null, error: true })),
        ]);

        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve("TIMEOUT"), 1500)
        );

        const result = await Promise.race([fetchPromise, timeoutPromise]);

        if (result !== "TIMEOUT") {
          const [prodRes, catRes, offRes, sfRes] = result;

          if (!prodRes.error && Array.isArray(prodRes.data)) {
            store.products = prodRes.data.filter((p) => !isDemoProduct(p));
          }
          if (!catRes.error && Array.isArray(catRes.data)) {
            store.categories = catRes.data.filter((c) => !isDemoCategory(c));
          }
          if (!offRes.error && Array.isArray(offRes.data)) {
            store.offers = offRes.data.filter(
              (o) =>
                o &&
                !["off-devora10", "off-flat100", "off-bogo", "off-festive15", "off-welcome10"].includes(String(o.id))
            );
          }
          if (sfRes && !sfRes.error && sfRes.data) {
            const remoteExtended = (sfRes.data.extended_data && typeof sfRes.data.extended_data === "object") ? sfRes.data.extended_data : {};
            store.storefront = {
              ...(store.storefront || DEFAULT_STOREFRONT_SETTINGS),
              ...sfRes.data,
              ...remoteExtended,
              announcements: Array.isArray(remoteExtended.announcements) ? remoteExtended.announcements : (store.storefront?.announcements || DEFAULT_STOREFRONT_SETTINGS.announcements),
              hero_cards: Array.isArray(remoteExtended.hero_cards) ? remoteExtended.hero_cards : (store.storefront?.hero_cards || []),
              value_props: Array.isArray(remoteExtended.value_props) ? remoteExtended.value_props : (store.storefront?.value_props || DEFAULT_STOREFRONT_SETTINGS.value_props),
              promos_list: Array.isArray(remoteExtended.promos_list) ? remoteExtended.promos_list : (store.storefront?.promos_list || []),
              testimonials: Array.isArray(remoteExtended.testimonials) ? remoteExtended.testimonials : (store.storefront?.testimonials || []),
              faqs: Array.isArray(remoteExtended.faqs) ? remoteExtended.faqs : (store.storefront?.faqs || DEFAULT_STOREFRONT_SETTINGS.faqs),
              updated_at: sfRes.data.updated_at || store.storefront?.updated_at,
            };
          }
        }
      } catch (e) {
        console.warn("serverSupabase query skipped:", e.message);
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

    // ================= SPECIFIC DIRECT ATOMIC ACTIONS =================
    if (body.action === "add_product" && body.data) {
      let newProd = { ...body.data };
      const { id, ...supabasePayload } = newProd;

      let savedProd = null;
      if (serverSupabase) {
        try {
          const { data, error } = await serverSupabase
            .from("products")
            .insert([supabasePayload])
            .select();
          if (!error && data && data.length > 0) {
            savedProd = data[0];
          } else if (error) {
            console.warn("serverSupabase add_product error, falling back:", error.message);
          }
        } catch (err) {
          console.warn("serverSupabase add_product exception:", err);
        }
      }

      const finalProd = savedProd || {
        ...newProd,
        id: id || `prod-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

      const existingProds = Array.isArray(current.products) ? current.products : [];
      const updatedProds = [finalProd, ...existingProds.filter((p) => String(p.id) !== String(finalProd.id))];
      await savePersistentStore({ products: updatedProds });

      return NextResponse.json({ success: true, item: finalProd });
    }

    if (body.action === "update_product" && body.id && body.data) {
      const updateId = String(body.id);
      let updatedItem = null;

      if (serverSupabase) {
        try {
          const { data, error } = await serverSupabase
            .from("products")
            .update(body.data)
            .eq("id", updateId)
            .select();
          if (!error && data && data.length > 0) {
            updatedItem = data[0];
          }
        } catch (_) {}
      }

      const existingProds = Array.isArray(current.products) ? current.products : [];
      const index = existingProds.findIndex((p) => String(p.id) === updateId);
      if (index !== -1) {
        existingProds[index] = { ...existingProds[index], ...body.data, ...(updatedItem || {}) };
      }
      await savePersistentStore({ products: existingProds });

      return NextResponse.json({ success: true, item: updatedItem || body.data });
    }

    if (body.action === "delete_product" && body.id) {
      const deleteId = String(body.id);
      if (serverSupabase) {
        try {
          await serverSupabase.from("products").delete().eq("id", deleteId);
        } catch (_) {}
      }

      const existingProds = Array.isArray(current.products) ? current.products : [];
      const filtered = existingProds.filter((p) => String(p.id) !== deleteId);
      await savePersistentStore({ products: filtered });

      return NextResponse.json({ success: true });
    }

    if (body.action === "add_category" && body.data) {
      let newCat = { ...body.data };
      const { id, ...supabasePayload } = newCat;

      let savedCat = null;
      if (serverSupabase) {
        try {
          // Check if category already exists by slug or name
          const { data: existing } = await serverSupabase
            .from("categories")
            .select("*")
            .or(`name.eq.${supabasePayload.name},slug.eq.${supabasePayload.slug}`)
            .maybeSingle();

          if (existing) {
            savedCat = existing;
          } else {
            const { data, error } = await serverSupabase
              .from("categories")
              .insert([supabasePayload])
              .select();
            if (!error && data && data.length > 0) {
              savedCat = data[0];
            } else if (error) {
              console.warn("serverSupabase add_category error:", error.message);
            }
          }
        } catch (err) {
          console.warn("serverSupabase add_category exception:", err);
        }
      }

      const finalCat = savedCat || {
        ...newCat,
        id: id || `cat-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

      const existingCats = Array.isArray(current.categories) ? current.categories : [];
      const updatedCats = [...existingCats.filter((c) => String(c.id) !== String(finalCat.id) && c.name !== finalCat.name), finalCat];
      await savePersistentStore({ categories: updatedCats });

      return NextResponse.json({ success: true, item: finalCat });
    }

    if (body.action === "update_category" && body.id && body.data) {
      const catId = String(body.id);
      let updatedCat = null;

      if (serverSupabase) {
        try {
          const { data, error } = await serverSupabase
            .from("categories")
            .update(body.data)
            .eq("id", catId)
            .select();
          if (!error && data && data.length > 0) {
            updatedCat = data[0];
          }
        } catch (_) {}
      }

      const existingCats = Array.isArray(current.categories) ? current.categories : [];
      const index = existingCats.findIndex((c) => String(c.id) === catId);
      if (index !== -1) {
        existingCats[index] = { ...existingCats[index], ...body.data, ...(updatedCat || {}) };
      }
      await savePersistentStore({ categories: existingCats });

      return NextResponse.json({ success: true, item: updatedCat || body.data });
    }

    if (body.action === "delete_category" && body.id) {
      const catId = String(body.id);
      if (serverSupabase) {
        try {
          await serverSupabase.from("categories").delete().eq("id", catId);
        } catch (_) {}
      }

      const existingCats = Array.isArray(current.categories) ? current.categories : [];
      const filtered = existingCats.filter((c) => String(c.id) !== catId);
      await savePersistentStore({ categories: filtered });

      return NextResponse.json({ success: true });
    }

    // ================= GENERIC STORE SYNC =================
    let newStore = { ...current };

    if (body.type && body.data !== undefined) {
      newStore[body.type] = body.data;
      syncToSupabaseBackground(body.type, body.data);
    } else {
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
