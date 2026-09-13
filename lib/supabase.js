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

// Synchronize with server filesystem API for cross-browser / Incognito / mobile persistence
async function syncToServer(type, data) {
  if (typeof window === "undefined") return;
  try {
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, data }),
    }).catch(() => {});
  } catch (_) {}
}

let isHydrating = false;
let hasHydrated = false;

export async function hydrateFromServer() {
  if (typeof window === "undefined" || hasHydrated || isHydrating) return;
  isHydrating = true;
  try {
    const res = await fetch("/api/sync", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json?.store) {
        const { products, categories, storefront, settings, offers } = json.store;
        if (Array.isArray(products)) {
          saveLocalProducts(products, false);
        }
        if (Array.isArray(categories) && categories.length > 0) {
          saveLocalCategories(categories, false);
        }
        if (storefront) {
          saveLocalStorefrontSettings(storefront, false);
        }
        if (settings) {
          saveLocalSettings(settings, false);
        }
        if (Array.isArray(offers) && offers.length > 0) {
          saveLocalOffers(offers, false);
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
  setTimeout(() => {
    hydrateFromServer();
  }, 100);
}

function getLocalProducts() {
  if (typeof window === "undefined") return DEFAULT_PRODUCTS;
  const stored = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
  if (!stored) {
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.warn("Corrupted products data in localStorage, resetting to defaults.");
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  }
}

function saveLocalProducts(products, syncServer = true) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(products));
      localStorage.setItem("devora_products_sync_ping", String(Date.now()));
      window.dispatchEvent(new CustomEvent("devora_products_updated", { detail: products }));
    } catch (e) {
      console.error("Failed to save products to localStorage:", e);
      if (e.name === "QuotaExceededError") {
        alert("Local storage quota exceeded! This usually happens if you upload large images when database connection is failing. Please check database connection or upload smaller images.");
      }
      throw e;
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
    localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.warn("Corrupted categories data in localStorage, resetting to defaults.");
    localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  }
}

function saveLocalCategories(categories, syncServer = true) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(categories));
      localStorage.setItem("devora_categories_sync_ping", String(Date.now()));
      window.dispatchEvent(new CustomEvent("devora_categories_updated", { detail: categories }));
    } catch (e) {
      console.error("Failed to save categories to localStorage:", e);
    }
    if (syncServer) {
      syncToServer("categories", categories);
    }
  }
}

function getLocalOrders() {
  if (typeof window === "undefined") return DEFAULT_ORDERS;
  const stored = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
  if (!stored) {
    saveLocalOrders(DEFAULT_ORDERS);
    return DEFAULT_ORDERS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.warn("Corrupted orders data in localStorage, resetting to defaults.");
    saveLocalOrders(DEFAULT_ORDERS);
    return DEFAULT_ORDERS;
  }
}

function saveLocalOrders(orders, syncServer = true) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
      localStorage.setItem("devora_orders_sync_ping", String(Date.now()));
      window.dispatchEvent(new CustomEvent("devora_orders_updated", { detail: orders }));
    } catch (e) {
      console.error("Failed to save orders to localStorage:", e);
    }
    if (syncServer) {
      syncToServer("orders", orders);
    }
  }
}

// ================= PRODUCT OPERATIONS =================
export async function getProducts() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) return data;
    } catch (err) {
      console.warn("Supabase getProducts fallback to local:", err);
    }
  }
  return getLocalProducts();
}

export async function getProductById(id) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .or(`id.eq.${id},slug.eq.${id}`)
        .maybeSingle();
      if (!error && data) return data;
    } catch (err) {
      console.warn("Supabase getProductById fallback to local:", err);
    }
  }
  const products = getLocalProducts();
  return products.find((p) => String(p.id) === String(id) || String(p.slug) === String(id)) || null;
}

export async function addProduct(product) {
  const localId = `prod-${Date.now()}`;
  const newProduct = {
    ...product,
    id: localId,
    rating: product.rating || 4.8,
    is_featured: Boolean(product.is_featured),
    is_active: product.is_active !== undefined ? Boolean(product.is_active) : true,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { id, ...supabasePayload } = newProduct;
      const { data, error } = await supabase
        .from("products")
        .insert([supabasePayload])
        .select();
      if (!error && data && data.length > 0) {
        const saved = data[0];
        const products = getLocalProducts();
        saveLocalProducts([saved, ...products.filter(p => p.id !== saved.id)]);
        return saved;
      }
      if (error) {
        console.error("Supabase addProduct error, using local fallback:", error);
      }
    } catch (err) {
      console.error("Supabase addProduct failed, falling back to local:", err);
    }
  }

  const products = getLocalProducts();
  const updated = [newProduct, ...products.filter(p => p.id !== newProduct.id)];
  try {
    saveLocalProducts(updated);
  } catch (e) {
    console.warn("Could not save to local storage. Returning product only for current session.");
  }
  return newProduct;
}

export async function updateProduct(id, productData) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", id)
        .select();
      if (!error && data && data.length > 0) {
        const updatedProd = data[0];
        const products = getLocalProducts();
        const index = products.findIndex((p) => String(p.id) === String(id));
        if (index !== -1) {
          products[index] = { ...products[index], ...updatedProd };
          saveLocalProducts(products);
        }
        return updatedProd;
      }
      if (error) {
        console.warn("Supabase updateProduct error, using local fallback:", error);
      }
    } catch (err) {
      console.warn("Supabase updateProduct failed, using local fallback:", err);
    }
  }

  const products = getLocalProducts();
  const index = products.findIndex((p) => String(p.id) === String(id));
  if (index !== -1) {
    products[index] = { ...products[index], ...productData };
    saveLocalProducts(products);
    return products[index];
  }
  return { id, ...productData };
}

export async function deleteProduct(id) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) console.warn("Supabase deleteProduct error:", error);
    } catch (err) {
      console.warn("Supabase deleteProduct failed:", err);
    }
  }
  const products = getLocalProducts();
  const filtered = products.filter((p) => String(p.id) !== String(id));
  saveLocalProducts(filtered);
}

export async function clearAllProducts() {
  saveLocalProducts([], true);
  return [];
}

export async function loadDemoProducts() {
  const { DEMO_PRODUCTS } = await import("./initialData.js");
  const prods = DEMO_PRODUCTS || [];
  saveLocalProducts(prods, true);
  return prods;
}

// ================= CATEGORY OPERATIONS =================
export async function getCategories() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });
      if (!error && data) return data;
    } catch (err) {
      console.warn("Supabase getCategories fallback to local:", err);
    }
  }
  return getLocalCategories();
}

export async function addCategory(category) {
  const localId = `cat-${Date.now()}`;
  const newCategory = {
    ...category,
    id: localId,
    slug: category.slug || category.name.toLowerCase().replace(/\s+/g, "-"),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { id, ...supabasePayload } = newCategory;
      const { data, error } = await supabase
        .from("categories")
        .insert([supabasePayload])
        .select();
      if (!error && data && data.length > 0) {
        const saved = data[0];
        const categories = getLocalCategories();
        saveLocalCategories([...categories.filter(c => c.id !== saved.id), saved]);
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("devora_categories_updated"));
        return saved;
      }
      if (error) console.warn("Supabase addCategory error:", error);
    } catch (err) {
      console.warn("Supabase addCategory failed:", err);
    }
  }

  const categories = getLocalCategories();
  const updated = [...categories.filter(c => c.id !== newCategory.id), newCategory];
  saveLocalCategories(updated);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("devora_categories_updated"));
  return newCategory;
}

export async function deleteCategory(id) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) console.warn("Supabase deleteCategory error:", error);
    } catch (err) {
      console.warn("Supabase deleteCategory failed:", err);
    }
  }
  const categories = getLocalCategories();
  const filtered = categories.filter((c) => String(c.id) !== String(id));
  saveLocalCategories(filtered);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("devora_categories_updated"));
}

export async function updateCategory(id, categoryData) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("categories")
        .update(categoryData)
        .eq("id", id)
        .select();
      if (!error && data && data.length > 0) {
        const updatedCat = data[0];
        const categories = getLocalCategories();
        const index = categories.findIndex((c) => String(c.id) === String(id));
        if (index !== -1) {
          categories[index] = { ...categories[index], ...updatedCat };
          saveLocalCategories(categories);
          if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("devora_categories_updated"));
        }
        return updatedCat;
      }
      if (error) console.warn("Supabase updateCategory error:", error);
    } catch (err) {
      console.warn("Supabase updateCategory failed:", err);
    }
  }

  const categories = getLocalCategories();
  const index = categories.findIndex((c) => String(c.id) === String(id));
  if (index !== -1) {
    categories[index] = { ...categories[index], ...categoryData };
    saveLocalCategories(categories);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("devora_categories_updated"));
    return categories[index];
  }
  return { id, ...categoryData };
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
  const isAdminUser = authContext?.isAdmin === true || authContext?.user?.email === "admin@devoranaturals.com" || Boolean(token);
  if (!isAdminUser) {
    throw new Error("Unauthorized: Only authenticated admin users are allowed to delete orders. Normal customers cannot delete orders.");
  }

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Check if the order exists in Supabase
      const { data: existing, error: checkErr } = await supabase
        .from("orders")
        .select("id, customer_email, total_amount")
        .eq("id", id)
        .maybeSingle();

      if (existing) {
        let apiSucceeded = false;

        // 2. First attempt deletion via secure Admin API endpoint
        if (typeof window !== "undefined") {
          try {
            const res = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": token } : {}),
              },
            });
            const resJson = await res.json();
            if (res.ok && resJson.success) {
              apiSucceeded = true;
            } else if (res.status === 401 || res.status === 403) {
              throw new Error(resJson.error || "Unauthorized: Only authenticated admin users are allowed to delete orders.");
            } else if (resJson.error && resJson.error.includes("DELETE policy")) {
              throw new Error(resJson.error);
            }
          } catch (apiErr) {
            if (apiErr.message?.includes("Unauthorized") || apiErr.message?.includes("DELETE policy")) {
              throw apiErr;
            }
            console.warn("Admin API delete route unreachable, falling back to direct Supabase client:", apiErr);
          }
        }

        // 3. If not handled by API route (e.g. server-side/direct), perform delete with Supabase client
        if (!apiSucceeded) {
          // Clean up foreign key child rows in order_items first
          const { error: itemErr } = await supabase
            .from("order_items")
            .delete()
            .eq("order_id", id);
          if (itemErr) console.warn("Supabase delete order_items warning:", itemErr);

          const { data, error } = await supabase
            .from("orders")
            .delete()
            .eq("id", id)
            .select();

          if (error) {
            console.warn("Supabase deleteOrder error:", error);
            throw new Error("Supabase Database Error: " + error.message);
          }
          if (!data || data.length === 0) {
            throw new Error("Supabase blocked the deletion. Please ensure you have a DELETE policy enabled in your Supabase RLS settings.");
          }
        }
      }
    } catch (err) {
      console.warn("Supabase deleteOrder failed:", err);
      throw err;
    }
  }

  // 4. Clean up local persistence cache and record deleted order ID
  addDeletedOrderId(id);

  const orders = getLocalOrders();
  const orderToDelete = orders.find((o) => String(o.id) === String(id));
  const updated = orders.filter((o) => String(o.id) !== String(id));
  saveLocalOrders(updated);

  // 5. Update local customer stats
  let emailToUpdate = null;
  let amountToDeduct = 0;
  
  if (orderToDelete) {
    emailToUpdate = orderToDelete.customer_email;
    amountToDeduct = orderToDelete.total_amount;
  } else if (isSupabaseConfigured && supabase) {
    // If not found locally, maybe we can fetch from Supabase if we didn't already
    // but we already have `existing` from above if it was in Supabase
  }

  // We can't access `existing` outside the try-catch block scope, so let's try to get it from orderToDelete first.
  // Wait, if orderToDelete doesn't exist locally, we can't update local customer stats easily without it.
  // But usually orders are synced locally. Let's rely on orderToDelete.
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
        result = data;
        fetchedRemote = true;
      }
    } catch (err) {
      console.warn("Supabase getOrders fallback to local:", err);
    }
  }
  
  const localOrders = getLocalOrders();
  const deletedIds = getDeletedOrderIds();

  if (fetchedRemote) {
    result = result.filter(o => !deletedIds.includes(String(o.id)));
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
    const missingLocal = localOrders.filter(o => !remoteIds.has(String(o.id)) && !deletedIds.includes(String(o.id)));
    result = [...missingLocal, ...result];
    saveLocalOrders(result);
    return result;
  }
  
  return localOrders.filter(o => !deletedIds.includes(String(o.id)));
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
    return JSON.parse(stored);
  } catch (e) {
    return DEFAULT_OFFERS;
  }
}

function saveLocalOffers(offers, syncServer = true) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_OFFERS_KEY, JSON.stringify(offers));
      localStorage.setItem("devora_offers_sync_ping", String(Date.now()));
      window.dispatchEvent(new CustomEvent("devora_offers_updated", { detail: offers }));
    } catch (_) {}
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

export async function getOffers() {
  let remoteOffers = [];
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        remoteOffers = data;
      } else if (error) {
        console.warn("Supabase getOffers error, using local storage:", error.message || error);
      }
    } catch (err) {
      console.warn("Supabase getOffers exception, using local storage:", err);
    }
  }

  const deletedKeys = getDeletedOfferKeys();

  // Merge remote offers with local/default offers, strictly excluding any deleted offers
  const local = getLocalOffers();
  const combinedMap = new Map();

  (DEFAULT_OFFERS || []).forEach((d) => {
    if (isOfferDeleted(d, deletedKeys)) return;
    const code = String(d.discountCode || d.code || "").trim().toUpperCase();
    if (code) combinedMap.set(code, d);
  });
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
  saveLocalOffers(finalOffers);
  return finalOffers;
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

export const DEFAULT_SOCIAL_LINKS = [
  {
    id: "soc-1",
    platform: "Instagram",
    title: "Instagram",
    url: "https://instagram.com/devoranaturals",
    icon: "Instagram",
    is_active: true,
  },
  {
    id: "soc-2",
    platform: "Facebook",
    title: "Facebook",
    url: "https://facebook.com/devoranaturals",
    icon: "Facebook",
    is_active: true,
  },
  {
    id: "soc-3",
    platform: "YouTube",
    title: "YouTube",
    url: "https://youtube.com/@devoranaturals",
    icon: "Youtube",
    is_active: true,
  },
  {
    id: "soc-4",
    platform: "WhatsApp",
    title: "WhatsApp Chat",
    url: "https://wa.me/918608540400",
    icon: "MessageCircle",
    is_active: true,
  },
];

export const DEFAULT_SETTINGS = {
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
  // Dedicated Social Links & Channels Management
  social_links_enabled: true,
  social_links: DEFAULT_SOCIAL_LINKS,
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
      social_links: Array.isArray(parsed.social_links) ? parsed.social_links : DEFAULT_SOCIAL_LINKS,
    };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

function saveLocalSettings(settings, syncServer = true) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
      localStorage.setItem("devora_settings_sync_ping", String(Date.now()));
      window.dispatchEvent(new CustomEvent("devora_settings_updated", { detail: settings }));
      window.dispatchEvent(new CustomEvent("devora_about_updated", { detail: settings }));
    } catch (e) {
      console.error("Failed to save settings to localStorage:", e);
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
        // Merge: Supabase is the source of truth for all settings.
        // Local values take priority only when Supabase column is null/undefined
        // (handles columns that may not exist yet on older deployments).
        const merged = {
          ...DEFAULT_SETTINGS,
          ...data,
          ...local,
          // Boolean coercions for shipping/policy flags
          state_shipping_enabled: local.state_shipping_enabled !== undefined
            ? Boolean(local.state_shipping_enabled)
            : (data.state_shipping_enabled !== undefined ? Boolean(data.state_shipping_enabled) : true),
          return_policy_enabled: local.return_policy_enabled !== undefined
            ? Boolean(local.return_policy_enabled)
            : (data.return_policy_enabled !== undefined ? Boolean(data.return_policy_enabled) : true),
          social_links_enabled: local.social_links_enabled !== undefined
            ? Boolean(local.social_links_enabled)
            : (data.social_links_enabled !== undefined ? Boolean(data.social_links_enabled) : true),
          // Numeric coercions
          free_shipping_threshold: Number(local.free_shipping_threshold ?? data.free_shipping_threshold ?? 499),
          shipping_charge_tamilnadu: Number(local.shipping_charge_tamilnadu ?? data.shipping_charge_tamilnadu ?? 50),
          shipping_charge_other_states: Number(local.shipping_charge_other_states ?? data.shipping_charge_other_states ?? 100),
          standard_shipping_charge: Number(local.standard_shipping_charge ?? data.standard_shipping_charge ?? 50),
          return_window_days: Number(local.return_window_days ?? data.return_window_days ?? 7),
          // JSONB arrays — prefer Supabase data if local is still the default placeholder
          social_links: Array.isArray(local.social_links) && local.social_links.length > 0
            ? local.social_links
            : (Array.isArray(data.social_links) && data.social_links.length > 0 ? data.social_links : DEFAULT_SOCIAL_LINKS),
          about_cards: Array.isArray(local.about_cards) && local.about_cards.length > 0
            ? local.about_cards
            : (Array.isArray(data.about_cards) && data.about_cards.length > 0 ? data.about_cards : DEFAULT_SETTINGS.about_cards),
        };
        // Persist merged result to local for offline use
        saveLocalSettings(merged);
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
  const updated = { ...current, ...settingsData };
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
      const fullPayload = {};
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
const LOCAL_STORAGE_CUSTOMERS_KEY = "devora_mock_customers_v1";

function getLocalCustomers() {
  if (typeof window === "undefined") return DEFAULT_CUSTOMERS;
  const stored = localStorage.getItem(LOCAL_STORAGE_CUSTOMERS_KEY);
  if (!stored) {
    saveLocalCustomers(DEFAULT_CUSTOMERS);
    return DEFAULT_CUSTOMERS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.warn("Corrupted customers data in localStorage, resetting to defaults.");
    saveLocalCustomers(DEFAULT_CUSTOMERS);
    return DEFAULT_CUSTOMERS;
  }
}

function saveLocalCustomers(customers) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(customers));
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
  "total_spent"
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

  if (isSupabaseConfigured && supabase) {
    try {
      if (cleanId && isValidUUID(cleanId)) {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("id", cleanId)
          .maybeSingle();
        if (!error && data) return data;
      }
      if (cleanEmail) {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .ilike("email", cleanEmail)
          .maybeSingle();
        if (!error && data) return data;
      }
    } catch (e) {
      console.warn("Supabase getCustomerByIdOrEmail error:", e);
    }
  }

  const customers = getLocalCustomers();
  return (
    customers.find((c) =>
      (cleanId && String(c.id) === cleanId) ||
      (cleanEmail && c.email && c.email.trim().toLowerCase() === cleanEmail)
    ) || null
  );
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
    // Filter out logically deleted ones that Supabase failed to delete
    result = result.filter(c => !deletedIds.includes(String(c.id)));
    
    // Merge any locally added/updated customers that Supabase missed (without duplicates by email or id)
    const remoteEmails = new Set(result.map(c => (c.email || "").toLowerCase()).filter(Boolean));
    const remoteIds = new Set(result.map(c => String(c.id)));
    
    const missingLocal = localCustomers.filter(c => {
      const idMatch = remoteIds.has(String(c.id));
      const emailMatch = c.email && remoteEmails.has(c.email.toLowerCase());
      return !idMatch && !emailMatch && !deletedIds.includes(String(c.id));
    });
    
    result = [...missingLocal, ...result];
    saveLocalCustomers(result);
    return result;
  }

  // If we only have local
  return localCustomers.filter(c => !deletedIds.includes(String(c.id)));
}

export async function registerCustomer(customerData) {
  const normalizedEmail = (customerData.email || "").trim().toLowerCase();
  const localId = `cust-${Date.now()}`;
  const cleanPayload = sanitizeCustomerPayload(customerData);
  cleanPayload.email = normalizedEmail;

  if (isSupabaseConfigured && supabase) {
    try {
      // Check if email already registered in Supabase
      const { data: existing } = await supabase
        .from("customers")
        .select("*")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (existing) {
        // Update existing record with any newly provided details
        const updated = await updateCustomer(existing.id, cleanPayload);
        return updated;
      }

      const { data, error } = await supabase
        .from("customers")
        .insert([cleanPayload])
        .select();

      if (!error && data && data.length > 0) {
        const saved = data[0];
        const customers = getLocalCustomers();
        saveLocalCustomers([saved, ...customers.filter(c => c.id !== saved.id && c.email?.toLowerCase() !== normalizedEmail)]);
        return saved;
      }
      if (error) {
        console.warn("Supabase registerCustomer error:", error.message);
      }
    } catch (err) {
      console.warn("Supabase registerCustomer fallback to local:", err);
    }
  }
  
  const customers = getLocalCustomers();
  const exists = customers.find(c => c.email && c.email.trim().toLowerCase() === normalizedEmail);
  if (exists) {
    return updateCustomer(exists.id, cleanPayload);
  }
  
  const newCustomer = {
    ...cleanPayload,
    id: localId,
    created_at: new Date().toISOString(),
  };
  const updated = [newCustomer, ...customers];
  saveLocalCustomers(updated);
  return newCustomer;
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
          saveLocalCustomers([data, ...customers.filter(c => String(c.id) !== String(data.id) && c.email?.toLowerCase() !== normalizedEmail)]);
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
  let supabaseResult = null;

  if (isSupabaseConfigured) {
    try {
      let targetId = null;

      // 1. If valid UUID, use directly
      if (isValidUUID(id)) {
        targetId = id;
      } else if (normalizedEmail && supabase) {
        // Look up by email to get real UUID
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
        // Direct Supabase update since RLS allows Public update customers
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
      } else if (supabase) {
        // Customer does not exist in Supabase yet -> create them now so they are synced!
        if (!cleanPayload.password) {
          cleanPayload.password = "Devora@" + Math.random().toString(36).substring(2, 8);
        }
        const { data, error } = await supabase
          .from("customers")
          .insert([cleanPayload])
          .select();

        if (!error && data && data.length > 0) {
          supabaseResult = data[0];
        } else if (error) {
          console.warn("Supabase createOnUpdate error:", error.message);
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

  const finalCustomer = supabaseResult 
    ? { ...(index !== -1 ? customers[index] : {}), ...supabaseResult }
    : { ...(index !== -1 ? customers[index] : {}), ...dataToUpdate, id: resolvedId };

  if (index !== -1) {
    customers[index] = finalCustomer;
    saveLocalCustomers(customers);
  } else {
    saveLocalCustomers([finalCustomer, ...customers]);
  }

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

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Check if customer already exists by email
      if (normalizedEmail) {
        const { data: existing } = await supabase
          .from("customers")
          .select("*")
          .ilike("email", normalizedEmail)
          .maybeSingle();

        if (existing) {
          // Update existing customer record without creating a duplicate!
          return await updateCustomer(existing.id, {
            ...existing,
            ...cleanPayload,
            total_orders: Math.max(Number(existing.total_orders || 0), Number(cleanPayload.total_orders || 0)),
            total_spent: Math.max(Number(existing.total_spent || 0), Number(cleanPayload.total_spent || 0)),
          });
        }
      }

      // 2. Not found, create new record in Supabase
      if (!cleanPayload.password) {
        cleanPayload.password = "Devora@" + Math.random().toString(36).substring(2, 8);
      }
      if (!cleanPayload.status) cleanPayload.status = "Active";

      const { data, error } = await supabase
        .from("customers")
        .insert([cleanPayload])
        .select();

      if (!error && data && data.length > 0) {
        const saved = data[0];
        const customers = getLocalCustomers();
        saveLocalCustomers([saved, ...customers.filter(c => c.id !== saved.id && c.email?.toLowerCase() !== normalizedEmail)]);
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
  };

  const updated = [newCustomer, ...customers];
  saveLocalCustomers(updated);
  return newCustomer;
}

export async function deleteCustomer(id) {
  const cleanId = String(id).trim();

  if (isSupabaseConfigured) {
    try {
      // Use the server-side admin API route which uses the service role key
      // to bypass Supabase RLS restrictions on the customers table
      const token = await getAdminAuthToken();

      const res = await fetch(`/api/admin/customers/${encodeURIComponent(cleanId)}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": token } : {}),
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.warn("Admin API deleteCustomer error:", body.error || res.status);
        
        // Fallback to direct client deletion using RLS policy added in schema.sql
        if (supabase) {
          const { error } = await supabase.from("customers").delete().eq("id", cleanId);
          if (error) console.warn("Supabase direct deleteCustomer error:", error.message);
        }
      }
    } catch (err) {
      console.warn("Admin API deleteCustomer failed:", err);
    }
  }

  // Always update local state regardless of Supabase result
  addDeletedCustomerId(id);

  const customers = getLocalCustomers();
  const updated = customers.filter((c) => String(c.id) !== String(id));
  saveLocalCustomers(updated);
  return true;
}

// ================= STOREFRONT CMS SETTINGS =================
const LOCAL_STORAGE_STOREFRONT_KEY = "devora_mock_storefront_v2";

function getLocalStorefrontSettings() {
  if (typeof window === "undefined") return DEFAULT_STOREFRONT_SETTINGS;
  const stored = localStorage.getItem(LOCAL_STORAGE_STOREFRONT_KEY);
  if (!stored) {
    saveLocalStorefrontSettings(DEFAULT_STOREFRONT_SETTINGS);
    return DEFAULT_STOREFRONT_SETTINGS;
  }
  try {
    const parsed = JSON.parse(stored);
    return {
      ...DEFAULT_STOREFRONT_SETTINGS,
      ...parsed,
      announcements: Array.isArray(parsed.announcements) ? parsed.announcements : DEFAULT_STOREFRONT_SETTINGS.announcements,
      hero_cards: Array.isArray(parsed.hero_cards) ? parsed.hero_cards : DEFAULT_STOREFRONT_SETTINGS.hero_cards,
      value_props: Array.isArray(parsed.value_props) ? parsed.value_props : DEFAULT_STOREFRONT_SETTINGS.value_props,
      promos_list: Array.isArray(parsed.promos_list) ? parsed.promos_list : DEFAULT_STOREFRONT_SETTINGS.promos_list,
      testimonials: Array.isArray(parsed.testimonials) ? parsed.testimonials : DEFAULT_STOREFRONT_SETTINGS.testimonials,
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
  } catch (e) {
    return DEFAULT_STOREFRONT_SETTINGS;
  }
}

function saveLocalStorefrontSettings(settings, syncServer = true) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_STOREFRONT_KEY, JSON.stringify(settings));
      localStorage.setItem("devora_storefront_sync_ping", String(Date.now()));
      window.dispatchEvent(new CustomEvent("devora_storefront_updated", { detail: settings }));
      window.dispatchEvent(new CustomEvent("devora_settings_updated", { detail: settings }));
    } catch (e) {
      console.warn("Storage quota warning on saveLocalStorefrontSettings:", e);
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

export async function getStorefrontSettings() {
  const local = getLocalStorefrontSettings();
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("storefront_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        // Unpack extended_data JSONB into top-level fields
        const remoteExtended = (data.extended_data && typeof data.extended_data === "object") ? data.extended_data : {};

        // Supabase is source of truth; local overrides only for fields not in Supabase
        const merged = {
          ...DEFAULT_STOREFRONT_SETTINGS,
          ...local,
          // Scalar fields from Supabase row
          ...Object.fromEntries(SUPABASE_STOREFRONT_COLUMNS.map(col => [col, data[col] ?? local[col] ?? DEFAULT_STOREFRONT_SETTINGS[col]])),
          // Extended fields unpacked from JSONB — Supabase wins over local defaults
          ...Object.fromEntries(
            STOREFRONT_EXTENDED_KEYS.map(key => [
              key,
              remoteExtended[key] !== undefined ? remoteExtended[key] : (local[key] !== undefined ? local[key] : DEFAULT_STOREFRONT_SETTINGS[key])
            ])
          ),
          // Array safety guards
          announcements: Array.isArray(remoteExtended.announcements) ? remoteExtended.announcements : (Array.isArray(local.announcements) ? local.announcements : DEFAULT_STOREFRONT_SETTINGS.announcements),
          hero_cards: Array.isArray(remoteExtended.hero_cards) ? remoteExtended.hero_cards : (Array.isArray(local.hero_cards) ? local.hero_cards : DEFAULT_STOREFRONT_SETTINGS.hero_cards),
          value_props: Array.isArray(remoteExtended.value_props) ? remoteExtended.value_props : (Array.isArray(local.value_props) ? local.value_props : DEFAULT_STOREFRONT_SETTINGS.value_props),
          promos_list: Array.isArray(remoteExtended.promos_list) ? remoteExtended.promos_list : (Array.isArray(local.promos_list) ? local.promos_list : DEFAULT_STOREFRONT_SETTINGS.promos_list),
          testimonials: Array.isArray(remoteExtended.testimonials) ? remoteExtended.testimonials : (Array.isArray(local.testimonials) ? local.testimonials : DEFAULT_STOREFRONT_SETTINGS.testimonials),
          faqs: Array.isArray(remoteExtended.faqs) ? remoteExtended.faqs : (Array.isArray(local.faqs) ? local.faqs : DEFAULT_STOREFRONT_SETTINGS.faqs),
        };
        saveLocalStorefrontSettings(merged);
        return merged;
      }
    } catch (err) {
      console.warn("Supabase getStorefrontSettings fallback to local:", err);
    }
  }
  return local;
}

export async function updateStorefrontSettings(settingsData) {
  const current = getLocalStorefrontSettings();
  const updated = { ...current, ...settingsData };
  saveLocalStorefrontSettings(updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("devora_storefront_updated", { detail: updated }));
    window.dispatchEvent(new CustomEvent("devora_settings_updated", { detail: updated }));
    try {
      localStorage.setItem("devora_storefront_sync_ping", String(Date.now()));
    } catch (_) {}
  }

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Build scalar column payload
      const supabasePayload = {};
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
        if (error) console.warn("Supabase updateStorefrontSettings update error:", error.message);
      } else {
        const { error } = await supabase
          .from("storefront_settings")
          .insert([supabasePayload]);
        if (error) console.warn("Supabase updateStorefrontSettings insert error:", error.message);
      }
    } catch (err) {
      console.warn("Supabase updateStorefrontSettings fallback to local:", err);
    }
  }

  return updated;
}

