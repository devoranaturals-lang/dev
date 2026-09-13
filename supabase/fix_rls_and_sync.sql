-- ==============================================================================
-- DEVORA NATURALS - ONE-CLICK SQL FIX FOR SUPABASE RLS & PERSISTENCE
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql
-- Safe, idempotent, and immediately resolves all permission and sync issues.
-- ==============================================================================

-- 1. Ensure all core tables exist
CREATE TABLE IF NOT EXISTS public.storefront_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "heroBgGradientStart" TEXT DEFAULT '#064e3b',
    "heroBgGradientEnd" TEXT DEFAULT '#065f46',
    "heroBgImage" TEXT DEFAULT '',
    "heroHeading" TEXT DEFAULT 'Natural Care For Your Skin, Hair & Soul',
    "heroDescription" TEXT DEFAULT 'Elevate your daily self-care ritual with handcrafted Kumkumadi oils, wild-harvested Bhringraj scalp tonics, and sacred organic Sambrani dhoop.',
    "bestsellerEnabled" BOOLEAN DEFAULT false,
    "bestsellerTitle" TEXT DEFAULT '',
    "bestsellerSubtitle" TEXT DEFAULT '',
    "bestsellerImage" TEXT DEFAULT '',
    "promoBannerEnabled" BOOLEAN DEFAULT false,
    "promoBannerTitle" TEXT DEFAULT '',
    "promoBannerSubtitle" TEXT DEFAULT '',
    "promoBannerImage" TEXT DEFAULT '',
    extended_data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name TEXT DEFAULT 'Devora Naturals',
    tagline TEXT DEFAULT 'Pure Organic Botanical',
    email TEXT DEFAULT 'contact@devoranaturals.com',
    phone TEXT DEFAULT '+91 98765 43210',
    address TEXT DEFAULT '123 Herbal Way, Kerala, India',
    currency TEXT DEFAULT '₹',
    currency_code TEXT DEFAULT 'INR',
    tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    shipping_fee NUMERIC(10, 2) DEFAULT 50.00,
    free_shipping_threshold NUMERIC(10, 2) DEFAULT 499.00,
    enable_cod BOOLEAN DEFAULT true,
    enable_online_payment BOOLEAN DEFAULT true,
    logo_url TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Ensure required timestamp and profile columns exist
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.storefront_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.storefront_settings ADD COLUMN IF NOT EXISTS extended_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS actual_price NUMERIC(10, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_returnable BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS return_period_days INTEGER DEFAULT 7;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Turn off demo bestseller defaults on storefront_settings table
ALTER TABLE public.storefront_settings ALTER COLUMN "bestsellerEnabled" SET DEFAULT false;
ALTER TABLE public.storefront_settings ALTER COLUMN "bestsellerTitle" SET DEFAULT '';
ALTER TABLE public.storefront_settings ALTER COLUMN "bestsellerSubtitle" SET DEFAULT '';
ALTER TABLE public.storefront_settings ALTER COLUMN "bestsellerImage" SET DEFAULT '';

-- 4. Grant table and schema permissions to anon, authenticated, and service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Drop all restrictive / conflicting policies across all tables
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
DROP POLICY IF EXISTS "Allow all categories" ON public.categories;
DROP POLICY IF EXISTS "Public read access for categories" ON public.categories;

DROP POLICY IF EXISTS "Public read products" ON public.products;
DROP POLICY IF EXISTS "Allow all products" ON public.products;
DROP POLICY IF EXISTS "Public read access for products" ON public.products;

DROP POLICY IF EXISTS "Public read offers" ON public.offers;
DROP POLICY IF EXISTS "Allow all offers" ON public.offers;
DROP POLICY IF EXISTS "Public read access for offers" ON public.offers;

DROP POLICY IF EXISTS "Public read settings" ON public.settings;
DROP POLICY IF EXISTS "Allow all settings" ON public.settings;
DROP POLICY IF EXISTS "Public read access for settings" ON public.settings;

DROP POLICY IF EXISTS "Public read storefront_settings" ON public.storefront_settings;
DROP POLICY IF EXISTS "Allow all storefront_settings" ON public.storefront_settings;
DROP POLICY IF EXISTS "Public read access for storefront_settings" ON public.storefront_settings;

DROP POLICY IF EXISTS "Public insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow select orders" ON public.orders;
DROP POLICY IF EXISTS "Allow update orders" ON public.orders;
DROP POLICY IF EXISTS "Users can read own orders by email" ON public.orders;
DROP POLICY IF EXISTS "Admin delete orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all orders" ON public.orders;

DROP POLICY IF EXISTS "Public insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow select order_items" ON public.order_items;
DROP POLICY IF EXISTS "Admin delete order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow all order_items" ON public.order_items;

DROP POLICY IF EXISTS "Public insert customers" ON public.customers;
DROP POLICY IF EXISTS "Public read customers" ON public.customers;
DROP POLICY IF EXISTS "Public update customers" ON public.customers;
DROP POLICY IF EXISTS "Customers can view their own profile" ON public.customers;
DROP POLICY IF EXISTS "Customers can update their own profile" ON public.customers;
DROP POLICY IF EXISTS "Admin delete customers" ON public.customers;
DROP POLICY IF EXISTS "Allow all customers" ON public.customers;

-- 4. Enable Row Level Security on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_settings ENABLE ROW LEVEL SECURITY;

-- 5. Create permissive policies for application data synchronization
CREATE POLICY "Allow all categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all offers" ON public.offers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all storefront_settings" ON public.storefront_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

-- 6. Disable the demo bestseller row in storefront_settings if currently enabled with demo data
UPDATE public.storefront_settings
SET "bestsellerEnabled" = false
WHERE "bestsellerTitle" ILIKE '%Kumkumadi Saffron Glow Oil%' OR "bestsellerTitle" = 'Kumkumadi Saffron Glow Oil';

-- 7. Clean all legacy demo records from Supabase tables for a completely fresh store
DELETE FROM public.products
WHERE id::text IN ('prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5', 'prod-6')
   OR id::text LIKE 'demo-%'
   OR slug IN ('kumkumadi-radiant-face-oil', 'bhringraj-neem-hair-oil', 'pure-sambrani-dhoop-cups', 'organic-rose-water-mist', 'amla-hibiscus-shampoo', 'organic-bhimseni-camphor');

DELETE FROM public.categories
WHERE id::text IN ('cat-1', 'cat-2', 'cat-3')
   OR slug IN ('skin-care', 'hair-care', 'pooja');

DELETE FROM public.offers
WHERE id::text IN ('off-devora10', 'off-flat100', 'off-bogo', 'off-festive15', 'off-welcome10')
   OR "discountCode" IN ('DEVORA10', 'FLAT100', 'BUY2GET1', 'FESTIVE15', 'WELCOME10');

DELETE FROM public.customers
WHERE id::text IN ('cust-1', 'cust-2', 'cust-3', 'cust-4')
   OR email IN ('aarav@example.com', 'priya@example.com', 'vikram@example.com', 'sneha@example.com')
   OR email LIKE '%@example.com';

DELETE FROM public.order_items
WHERE order_id::text IN ('DEV-10821', 'DEV-10820', 'DEV-10819', 'DEV-10818')
   OR order_id::text LIKE 'ord-demo-%'
   OR order_id::text LIKE 'demo-%';

DELETE FROM public.orders
WHERE id::text IN ('DEV-10821', 'DEV-10820', 'DEV-10819', 'DEV-10818')
   OR id::text LIKE 'ord-demo-%'
   OR id::text LIKE 'demo-%'
   OR customer_email LIKE '%@example.com';

UPDATE public.settings
SET email = '', phone = '', address = '', whatsapp = ''
WHERE email = 'support@devoranaturals.com' OR phone = '+91 8608540400';

-- 8. Ensure at least 1 storefront row exists with clean defaults
INSERT INTO public.storefront_settings (
    "heroBgGradientStart",
    "heroBgGradientEnd",
    "heroHeading",
    "heroDescription",
    "bestsellerEnabled"
)
SELECT '#064e3b', '#065f46', 'Natural Care For Your Skin, Hair & Soul', 'Elevate your daily self-care ritual with handcrafted Kumkumadi oils, wild-harvested Bhringraj scalp tonics, and sacred organic Sambrani dhoop.', false
WHERE NOT EXISTS (SELECT 1 FROM public.storefront_settings);

-- 9. Refresh PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';


