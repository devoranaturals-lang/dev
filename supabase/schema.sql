-- ==============================================================================
-- DEVORA NATURALS - COMPLETE SUPABASE PRODUCTION DATABASE SCHEMA
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql
-- ==============================================================================

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PRODUCTS TABLE
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ORDERS TABLE
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

-- 5. CUSTOMERS CRM TABLE
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

-- 7. STORE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT DEFAULT 'support@devoranaturals.com',
    phone TEXT DEFAULT '+91 (800) 456-7890',
    address TEXT DEFAULT 'Kerala Botanical Organic Farm, India',
    whatsapp TEXT DEFAULT '8608540400',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. STOREFRONT CMS SETTINGS TABLE
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- Public read access policies
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public read offers" ON public.offers FOR SELECT USING (true);
CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Public read storefront_settings" ON public.storefront_settings FOR SELECT USING (true);

-- Orders & Order Items RLS policies:
-- 1. Anyone (including guest / logged-in customer during checkout) can place an order:
CREATE POLICY "Public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert order_items" ON public.order_items FOR INSERT WITH CHECK (true);

-- 2. Reading orders (Admin reads all orders; customers can query their orders):
CREATE POLICY "Allow select orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow select order_items" ON public.order_items FOR SELECT USING (true);

-- 3. Updating orders (Admin status update, shipping update; customer order status update like Cancelled):
CREATE POLICY "Allow update orders" ON public.orders FOR UPDATE USING (true);

-- 4. DELETION POLICY: STRICTLY ALLOWED ONLY FOR AUTHENTICATED ADMIN USERS.
-- Normal customers and unauthenticated (anon) users are strictly blocked from deleting orders.
CREATE POLICY "Admin delete orders" ON public.orders FOR DELETE TO authenticated USING (
    (auth.jwt() ->> 'email') = 'admin@devoranaturals.com'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "Admin delete order_items" ON public.order_items FOR DELETE TO authenticated USING (
    (auth.jwt() ->> 'email') = 'admin@devoranaturals.com'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Customers CRM policies
CREATE POLICY "Public insert customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Public update customers" ON public.customers FOR UPDATE USING (true);

-- Full access policies for categories, products, offers, settings
CREATE POLICY "Allow all categories" ON public.categories FOR ALL USING (true);
CREATE POLICY "Allow all products" ON public.products FOR ALL USING (true);
CREATE POLICY "Allow all offers" ON public.offers FOR ALL USING (true);
CREATE POLICY "Allow all settings" ON public.settings FOR ALL USING (true);
CREATE POLICY "Allow all storefront_settings" ON public.storefront_settings FOR ALL USING (true);

-- ==============================================================================
-- INITIAL DEFAULT SEED DATA
-- ==============================================================================
INSERT INTO public.categories (name, slug, description) VALUES
('Skin Care', 'skin-care', 'Herbal face oils, glowing serums, and natural botanical creams'),
('Hair Care', 'hair-care', 'Pure hair growth oils, Ayurvedic shampoos, and scalp nourishers'),
('Pooja Items', 'pooja', 'Traditional organic dhoop, herbal camphor, and brass pooja essentials')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.settings (email, phone, address, whatsapp) VALUES
('support@devoranaturals.com', '+91 (800) 456-7890', 'Kerala Botanical Organic Farm, India', '8608540400')
ON CONFLICT DO NOTHING;

INSERT INTO public.storefront_settings ("heroBgGradientStart", "heroBgGradientEnd", "heroHeading", "heroDescription") VALUES
('#064e3b', '#065f46', 'Natural Care For Your Skin, Hair & Soul', 'Elevate your daily self-care ritual with handcrafted Kumkumadi oils, wild-harvested Bhringraj scalp tonics, and sacred organic Sambrani dhoop.')
ON CONFLICT DO NOTHING;
