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
  const idStr = String(product.id || "").toLowerCase().trim();
  const slugStr = String(product.slug || "").toLowerCase().trim();
  const nameStr = String(product.name || "").toLowerCase().trim();

  const demoIds = ["prod-1", "prod-2", "prod-3", "prod-4", "prod-5", "prod-6", "demo-1", "demo-2", "demo-3", "demo-4", "demo-5", "demo-6"];
  if (demoIds.includes(idStr)) return true;
  if (/^prod-[1-6]$/i.test(idStr)) return true;
  if (/^demo-\d+$/i.test(idStr) || idStr.startsWith("demo-") || idStr.startsWith("card-demo-")) return true;

  const demoSlugs = [
    "kumkumadi-radiant-face-oil", "kumkumadi-radiant-glow-face-oil", "kumkumadi-saffron-glow-oil",
    "bhringraj-neem-hair-oil", "bhringraj-neem-treatment-oil", "bhringraj-neem-intensive-hair-growth-oil",
    "pure-sambrani-dhoop-cups", "organic-rose-water-mist", "pure-organic-rose-water-hydrating-mist",
    "amla-hibiscus-shampoo", "amla-hibiscus-natural-herbal-shampoo",
    "bhimseni-camphor-tablets", "organic-bhimseni-camphor"
  ];
  if (demoSlugs.includes(slugStr)) return true;

  return false;
}

function isDemoCategory(category) {
  if (!category) return false;
  const idStr = String(category.id || "");
  return ["cat-1", "cat-2", "cat-3"].includes(idStr);
}

function isDemoCustomer(customer) {
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

function isDemoOrder(order) {
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
    if (Array.isArray(memoryStore.customers)) {
      memoryStore.customers = memoryStore.customers.filter(c => !isDemoCustomer(c));
    }
    if (Array.isArray(memoryStore.orders)) {
      memoryStore.orders = memoryStore.orders.filter(o => !isDemoOrder(o));
    }
    return memoryStore;
  } catch (err) {
    const initialStore = {
      products: DEFAULT_PRODUCTS.filter(p => !isDemoProduct(p)),
      categories: DEFAULT_CATEGORIES.filter(c => !isDemoCategory(c)),
      offers: DEFAULT_OFFERS,
      settings: DEFAULT_SETTINGS,
      storefront: DEFAULT_STOREFRONT_SETTINGS,
      customers: DEFAULT_CUSTOMERS.filter(c => !isDemoCustomer(c)),
      orders: DEFAULT_ORDERS.filter(o => !isDemoOrder(o)),
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
  if (Array.isArray(updated.customers)) {
    updated.customers = updated.customers.filter(c => !isDemoCustomer(c));
  }
  if (Array.isArray(updated.orders)) {
    updated.orders = updated.orders.filter(o => !isDemoOrder(o));
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
      const basePayload = {
        updated_at: new Date().toISOString(),
      };
      if (data.store_name !== undefined) basePayload.store_name = data.store_name;
      if (data.tagline !== undefined) basePayload.tagline = data.tagline;
      if (data.description !== undefined) basePayload.description = data.description;
      if (data.email !== undefined) basePayload.email = data.email;
      if (data.phone !== undefined) basePayload.phone = data.phone;
      if (data.address !== undefined) basePayload.address = data.address;
      if (data.whatsapp !== undefined) basePayload.whatsapp = data.whatsapp;
      if (data.logo_url !== undefined) basePayload.logo_url = data.logo_url;
      if (data.free_shipping_threshold !== undefined) basePayload.free_shipping_threshold = Number(data.free_shipping_threshold);

      const fullPayload = { ...basePayload, ...data, extended_data: data };
      delete fullPayload.id;

      if (existing?.id) {
        const { error: fullErr } = await serverSupabase.from("settings").update(fullPayload).eq("id", existing.id);
        if (fullErr) {
          await serverSupabase.from("settings").update(basePayload).eq("id", existing.id);
        }
      } else {
        const { error: fullInsErr } = await serverSupabase.from("settings").insert([fullPayload]);
        if (fullInsErr) {
          await serverSupabase.from("settings").insert([basePayload]);
        }
      }

      // Mirror contact details into storefront_settings.extended_data
      try {
        const { data: sfExisting } = await serverSupabase.from("storefront_settings").select("id, extended_data").limit(1).maybeSingle();
        if (sfExisting?.id) {
          const curExt = (sfExisting.extended_data && typeof sfExisting.extended_data === "object") ? sfExisting.extended_data : {};
          await serverSupabase.from("storefront_settings").update({
            extended_data: {
              ...curExt,
              contact: {
                email: data.email || "",
                phone: data.phone || "",
                address: data.address || "",
                whatsapp: data.whatsapp || "",
                support_hours: data.support_hours || "",
              },
              email: data.email || "",
              phone: data.phone || "",
              address: data.address || "",
              whatsapp: data.whatsapp || "",
              support_hours: data.support_hours || "",
            },
            updated_at: new Date().toISOString(),
          }).eq("id", sfExisting.id);
        }
      } catch (_) {}
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
            let existing = null;
            if (payload.slug) {
              const { data } = await serverSupabase.from("products").select("id").eq("slug", payload.slug).maybeSingle();
              if (data) existing = data;
            }
            if (!existing && payload.name) {
              const { data } = await serverSupabase.from("products").select("id").eq("name", payload.name).maybeSingle();
              if (data) existing = data;
            }
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
            let existing = null;
            if (payload.slug) {
              const { data } = await serverSupabase.from("categories").select("id").eq("slug", payload.slug).maybeSingle();
              if (data) existing = data;
            }
            if (!existing && payload.name) {
              const { data } = await serverSupabase.from("categories").select("id").eq("name", payload.name).maybeSingle();
              if (data) existing = data;
            }
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
          serverSupabase.from("settings").select("*").limit(1).maybeSingle().catch(() => ({ data: null, error: true })),
        ]);

        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve("TIMEOUT"), 1500)
        );

        const result = await Promise.race([fetchPromise, timeoutPromise]);

        if (result !== "TIMEOUT") {
          const [prodRes, catRes, offRes, sfRes, setRes] = result;

          if (!prodRes.error && Array.isArray(prodRes.data)) {
            const demoProds = prodRes.data.filter((p) => isDemoProduct(p));
            if (demoProds.length > 0) {
              const demoIds = demoProds.map((p) => p.id);
              serverSupabase.from("products").delete().in("id", demoIds).then(() => {}).catch(() => {});
            }
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
          if (setRes && !setRes.error && setRes.data) {
            store.settings = {
              ...(store.settings || DEFAULT_SETTINGS),
              ...setRes.data,
              email: setRes.data.email !== undefined ? setRes.data.email : (store.settings?.email || ""),
              phone: setRes.data.phone !== undefined ? setRes.data.phone : (store.settings?.phone || ""),
              address: setRes.data.address !== undefined ? setRes.data.address : (store.settings?.address || ""),
              whatsapp: setRes.data.whatsapp !== undefined ? setRes.data.whatsapp : (store.settings?.whatsapp || ""),
              support_hours: setRes.data.support_hours !== undefined ? setRes.data.support_hours : (store.settings?.support_hours || ""),
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
          let existing = null;
          if (supabasePayload.slug) {
            const { data } = await serverSupabase
              .from("categories")
              .select("*")
              .eq("slug", supabasePayload.slug)
              .maybeSingle();
            if (data) existing = data;
          }
          if (!existing && supabasePayload.name) {
            const { data } = await serverSupabase
              .from("categories")
              .select("*")
              .eq("name", supabasePayload.name)
              .maybeSingle();
            if (data) existing = data;
          }

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
      const catId = String(body.id).trim();
      if (serverSupabase) {
        try {
          await serverSupabase.from("categories").delete().eq("id", catId);
          await serverSupabase.from("categories").delete().eq("slug", catId);
        } catch (_) {}
      }

      const existingCats = Array.isArray(current.categories) ? current.categories : [];
      const filtered = existingCats.filter((c) => String(c.id) !== catId && String(c.slug || "") !== catId);
      await savePersistentStore({ categories: filtered });

      return NextResponse.json({ success: true });
    }

    if (body.action === "delete_order" && body.id) {
      const orderId = String(body.id).trim();
      if (serverSupabase) {
        try {
          await serverSupabase.from("order_items").delete().eq("order_id", orderId);
          await serverSupabase.from("orders").delete().eq("id", orderId);
        } catch (err) {
          console.warn("serverSupabase delete_order error:", err.message);
        }
      }

      const existingOrders = Array.isArray(current.orders) ? current.orders : [];
      const filtered = existingOrders.filter((o) => String(o.id) !== orderId && String(o.order_number || "") !== orderId);
      await savePersistentStore({ orders: filtered });

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
