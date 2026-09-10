-- ==============================================================================
-- DEVORA NATURALS - COMPLETE SUPABASE PRODUCTION DATABASE SCHEMA
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql
-- This file is idempotent: safe to run on a fresh DB or an existing DB.
-- ==============================================================================

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PRODUCTS TABLE (includes is_returnable & return_period_days for admin return policy)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    actual_price NUMERIC(10, 2),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    stock INTEGER DEFAULT 50 CHECK (stock >= 0),
    rating NUMERIC(2, 1) DEFAULT 4.8,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_returnable BOOLEAN DEFAULT true,
    return_period_days INTEGER DEFAULT 7,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ORDERS TABLE (includes financial breakdown columns: subtotal, discount, coupon, shipping)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT ('ord-' || floor(random() * 1000000000)::text),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2),
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    coupon_code TEXT DEFAULT '',
    shipping_charge NUMERIC(10, 2) DEFAULT 0,
    shipping_method TEXT DEFAULT 'Standard Delivery',
    status TEXT DEFAULT 'Order Placed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. CUSTOMERS CRM TABLE (includes status, total_orders, total_spent, notes for admin CRM)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    status TEXT DEFAULT 'Active',
    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. OFFERS & COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    "discountCode" TEXT,
    type TEXT DEFAULT 'festival',
    "isActive" BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. STORE SETTINGS TABLE (full admin settings: contact, shipping, return, social, about)
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Contact & Store Identity
    store_name TEXT DEFAULT 'Devora Naturals',
    tagline TEXT DEFAULT 'Pure Organic Botanical',
    logo_url TEXT DEFAULT '',
    email TEXT DEFAULT 'support@devoranaturals.com',
    phone TEXT DEFAULT '+91 8608540400',
    address TEXT DEFAULT 'Kerala Botanical Organic Farm, India',
    whatsapp TEXT DEFAULT '8608540400',
    -- Shipping Configuration
    free_shipping_threshold NUMERIC(10, 2) DEFAULT 499,
    state_shipping_enabled BOOLEAN DEFAULT true,
    shipping_charge_tamilnadu NUMERIC(10, 2) DEFAULT 50,
    shipping_charge_other_states NUMERIC(10, 2) DEFAULT 100,
    standard_shipping_charge NUMERIC(10, 2) DEFAULT 50,
    delivery_estimate TEXT DEFAULT 'Tamil Nadu: 1-2 Days | Other States: 3-5 Business Days',
    support_hours TEXT DEFAULT 'Mon - Sat: 9:00 AM - 7:00 PM IST',
    order_prefix TEXT DEFAULT 'DEV-',
    -- Return Policy
    return_policy_enabled BOOLEAN DEFAULT true,
    return_window_days INTEGER DEFAULT 7,
    return_policy_text TEXT DEFAULT '7-Day Easy Replacement Guarantee for damaged or defective items',
    -- Social Media (legacy individual fields)
    instagram_url TEXT DEFAULT 'https://instagram.com/devoranaturals',
    facebook_url TEXT DEFAULT 'https://facebook.com/devoranaturals',
    youtube_url TEXT DEFAULT 'https://youtube.com/@devoranaturals',
    -- Social Links & About Us (JSONB for flexible structures)
    social_links_enabled BOOLEAN DEFAULT true,
    social_links JSONB DEFAULT '[]'::jsonb,
    about_badge TEXT DEFAULT 'Our Ayurvedic Heritage',
    about_title TEXT DEFAULT 'Rooted in Nature, Crafted with Care',
    about_description TEXT DEFAULT '',
    about_cards JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. STOREFRONT CMS SETTINGS TABLE
--    extended_data JSONB stores: announcements, hero_cards, value_props, promos_list,
--    testimonials, faqs, spotlight_*, navbar, footer
CREATE TABLE IF NOT EXISTS public.storefront_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "heroBgGradientStart" TEXT DEFAULT '#064e3b',
    "heroBgGradientEnd" TEXT DEFAULT '#065f46',
    "heroBgImage" TEXT DEFAULT '',
    "heroHeading" TEXT DEFAULT 'Natural Care For Your Skin, Hair & Soul',
    "heroDescription" TEXT DEFAULT 'Elevate your daily self-care ritual with handcrafted Kumkumadi oils, wild-harvested Bhringraj scalp tonics, and sacred organic Sambrani dhoop.',
    "bestsellerEnabled" BOOLEAN DEFAULT true,
    "bestsellerTitle" TEXT DEFAULT 'Kumkumadi Saffron Glow Oil',
    "bestsellerSubtitle" TEXT DEFAULT 'Bestseller',
    "bestsellerImage" TEXT DEFAULT 'https://images.unsplash.com/photo-1608248597263-00079e96047c?auto=format&fit=crop&w=800&q=80',
    "promoBannerEnabled" BOOLEAN DEFAULT false,
    "promoBannerTitle" TEXT DEFAULT 'Discover Our New Collection',
    "promoBannerSubtitle" TEXT DEFAULT 'Special Offer',
    "promoBannerImage" TEXT DEFAULT 'https://images.unsplash.com/photo-1615397323282-311ab261291b?auto=format&fit=crop&w=1200&h=400&q=80',
    -- All extended storefront CMS data in one JSONB column
    extended_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- SAFE MIGRATIONS — Add missing columns to EXISTING tables (idempotent)
-- Run these if the tables were created from a previous schema version.
-- ==============================================================================

-- Products: return policy fields
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_returnable BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS return_period_days INTEGER DEFAULT 7;

-- Orders: financial breakdown fields
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_charge NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_method TEXT DEFAULT 'Standard Delivery';

-- Customers: CRM fields
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_spent NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes TEXT;

-- Settings: all extended admin settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS store_name TEXT DEFAULT 'Devora Naturals';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT 'Pure Organic Botanical';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS free_shipping_threshold NUMERIC(10, 2) DEFAULT 499;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS state_shipping_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS shipping_charge_tamilnadu NUMERIC(10, 2) DEFAULT 50;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS shipping_charge_other_states NUMERIC(10, 2) DEFAULT 100;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS standard_shipping_charge NUMERIC(10, 2) DEFAULT 50;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS delivery_estimate TEXT DEFAULT 'Tamil Nadu: 1-2 Days | Other States: 3-5 Business Days';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS support_hours TEXT DEFAULT 'Mon - Sat: 9:00 AM - 7:00 PM IST';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS order_prefix TEXT DEFAULT 'DEV-';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS return_policy_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS return_window_days INTEGER DEFAULT 7;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS return_policy_text TEXT DEFAULT '7-Day Easy Replacement Guarantee for damaged or defective items';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT 'https://instagram.com/devoranaturals';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS facebook_url TEXT DEFAULT 'https://facebook.com/devoranaturals';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS youtube_url TEXT DEFAULT 'https://youtube.com/@devoranaturals';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS social_links_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS about_badge TEXT DEFAULT 'Our Ayurvedic Heritage';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS about_title TEXT DEFAULT 'Rooted in Nature, Crafted with Care';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS about_description TEXT DEFAULT '';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS about_cards JSONB DEFAULT '[]'::jsonb;

-- Storefront Settings: extended_data JSONB
ALTER TABLE public.storefront_settings ADD COLUMN IF NOT EXISTS extended_data JSONB DEFAULT '{}'::jsonb;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_settings ENABLE ROW LEVEL SECURITY;

-- Public read access policies (use DO block to skip if already exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categories' AND policyname='Public read categories') THEN
    CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='products' AND policyname='Public read products') THEN
    CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='offers' AND policyname='Public read offers') THEN
    CREATE POLICY "Public read offers" ON public.offers FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='settings' AND policyname='Public read settings') THEN
    CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='storefront_settings' AND policyname='Public read storefront_settings') THEN
    CREATE POLICY "Public read storefront_settings" ON public.storefront_settings FOR SELECT USING (true);
  END IF;

  -- Orders & Order Items: anyone can insert (checkout), anyone can read, admin can delete
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='Public insert orders') THEN
    CREATE POLICY "Public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_items' AND policyname='Public insert order_items') THEN
    CREATE POLICY "Public insert order_items" ON public.order_items FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='Allow select orders') THEN
    CREATE POLICY "Allow select orders" ON public.orders FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_items' AND policyname='Allow select order_items') THEN
    CREATE POLICY "Allow select order_items" ON public.order_items FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='Allow update orders') THEN
    CREATE POLICY "Allow update orders" ON public.orders FOR UPDATE USING (true);
  END IF;

  -- DELETION: STRICTLY ADMIN ONLY
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='Admin delete orders') THEN
    CREATE POLICY "Admin delete orders" ON public.orders FOR DELETE TO authenticated USING (
      (auth.jwt() ->> 'email') = 'admin@devoranaturals.com'
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_items' AND policyname='Admin delete order_items') THEN
    CREATE POLICY "Admin delete order_items" ON public.order_items FOR DELETE TO authenticated USING (
      (auth.jwt() ->> 'email') = 'admin@devoranaturals.com'
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );
  END IF;

  -- Customers CRM
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customers' AND policyname='Public insert customers') THEN
    CREATE POLICY "Public insert customers" ON public.customers FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customers' AND policyname='Public read customers') THEN
    CREATE POLICY "Public read customers" ON public.customers FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customers' AND policyname='Public update customers') THEN
    CREATE POLICY "Public update customers" ON public.customers FOR UPDATE USING (true);
  END IF;

  -- Full access policies for catalog, settings
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categories' AND policyname='Allow all categories') THEN
    CREATE POLICY "Allow all categories" ON public.categories FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='products' AND policyname='Allow all products') THEN
    CREATE POLICY "Allow all products" ON public.products FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='offers' AND policyname='Allow all offers') THEN
    CREATE POLICY "Allow all offers" ON public.offers FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='settings' AND policyname='Allow all settings') THEN
    CREATE POLICY "Allow all settings" ON public.settings FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='storefront_settings' AND policyname='Allow all storefront_settings') THEN
    CREATE POLICY "Allow all storefront_settings" ON public.storefront_settings FOR ALL USING (true);
  END IF;
END $$;

-- ==============================================================================
-- INITIAL DEFAULT SEED DATA
-- ==============================================================================
INSERT INTO public.categories (name, slug, description) VALUES
('Skin Care', 'skin-care', 'Herbal face oils, glowing serums, and natural botanical creams'),
('Hair Care', 'hair-care', 'Pure hair growth oils, Ayurvedic shampoos, and scalp nourishers'),
('Pooja Items', 'pooja', 'Traditional organic dhoop, herbal camphor, and brass pooja essentials')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.settings (email, phone, address, whatsapp) VALUES
('support@devoranaturals.com', '+91 8608540400', 'Kerala Botanical Organic Farm, India', '8608540400')
ON CONFLICT DO NOTHING;

INSERT INTO public.storefront_settings ("heroBgGradientStart", "heroBgGradientEnd", "heroHeading", "heroDescription") VALUES
('#064e3b', '#065f46', 'Natural Care For Your Skin, Hair & Soul', 'Elevate your daily self-care ritual with handcrafted Kumkumadi oils, wild-harvested Bhringraj scalp tonics, and sacred organic Sambrani dhoop.')
ON CONFLICT DO NOTHING;
