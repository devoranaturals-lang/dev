import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
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

// In-memory cache for fast fallback
let memoryStore = null;

async function getPersistentStore() {
  if (memoryStore) {
    return memoryStore;
  }

  try {
    const fileContent = await fs.readFile(STORE_FILE, "utf-8");
    memoryStore = JSON.parse(fileContent);
    return memoryStore;
  } catch (err) {
    // If file does not exist, initialize with default initial data
    const initialStore = {
      products: DEFAULT_PRODUCTS,
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
    } else {
      // Direct keys passed (e.g. { products: [...], storefront: {...} })
      const allowedKeys = ["products", "categories", "offers", "settings", "storefront", "customers", "orders"];
      for (const key of allowedKeys) {
        if (body[key] !== undefined) {
          newStore[key] = body[key];
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
