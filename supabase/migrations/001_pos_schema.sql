-- Chiropractic clinic POS — v1 schema
-- Run in Supabase SQL Editor or via CLI

create sequence if not exists pos_order_number_seq start 1001;

create table if not exists pos_clinic_settings (
  id uuid primary key default gen_random_uuid(),
  clinic_name text not null default 'Wellness Clinic',
  tax_rate_bps integer not null default 0,
  points_per_dollar numeric(6, 2) not null default 1,
  updated_at timestamptz not null default now()
);

insert into pos_clinic_settings (clinic_name)
select 'Wellness Clinic'
where not exists (select 1 from pos_clinic_settings);

create table if not exists pos_patients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  stripe_customer_id text,
  stripe_default_payment_method_id text,
  loyalty_points integer not null default 0 check (loyalty_points >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pos_patients_name_idx
  on pos_patients (lower(last_name), lower(first_name));

create table if not exists pos_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique,
  price_cents integer not null check (price_cents >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  expires_on date,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pos_products_active_idx
  on pos_products (is_active) where is_active = true;

create table if not exists pos_orders (
  id uuid primary key default gen_random_uuid(),
  order_number integer not null default nextval('pos_order_number_seq'),
  patient_id uuid references pos_patients (id) on delete set null,
  staff_id uuid references auth.users (id) on delete set null,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  payment_method text not null check (payment_method in ('cash', 'card', 'saved_card')),
  stripe_payment_intent_id text,
  points_earned integer not null default 0,
  status text not null default 'completed' check (status in ('completed', 'refunded', 'void')),
  created_at timestamptz not null default now()
);

create index if not exists pos_orders_created_idx on pos_orders (created_at desc);

create table if not exists pos_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references pos_orders (id) on delete cascade,
  product_id uuid references pos_products (id) on delete set null,
  product_name text not null,
  product_sku text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0)
);

create index if not exists pos_order_items_order_idx on pos_order_items (order_id);

-- Sample products (safe to re-run: sku is unique)
insert into pos_products (name, sku, price_cents, stock_quantity, low_stock_threshold, category, expires_on)
values
  ('Vitamin D3 5000 IU', 'VIT-D3-5K', 2499, 24, 5, 'Vitamins', (current_date + interval '180 days')::date),
  ('Omega-3 Fish Oil', 'OMG-3-1000', 3299, 18, 5, 'Vitamins', (current_date + interval '120 days')::date),
  ('Magnesium Glycinate', 'MAG-GLY-400', 2799, 8, 5, 'Minerals', (current_date + interval '90 days')::date),
  ('Probiotic 50B', 'PROB-50B', 4499, 3, 5, 'Digestive', (current_date + interval '60 days')::date),
  ('Collagen Peptides', 'COL-PEP-20', 3999, 12, 5, 'Protein', (current_date + interval '200 days')::date)
on conflict (sku) do nothing;

alter table pos_clinic_settings enable row level security;
alter table pos_patients enable row level security;
alter table pos_products enable row level security;
alter table pos_orders enable row level security;
alter table pos_order_items enable row level security;

create policy "Staff read clinic settings"
  on pos_clinic_settings for select to authenticated using (true);
create policy "Staff update clinic settings"
  on pos_clinic_settings for update to authenticated using (true);

create policy "Staff manage patients"
  on pos_patients for all to authenticated using (true) with check (true);

create policy "Staff manage products"
  on pos_products for all to authenticated using (true) with check (true);

create policy "Staff manage orders"
  on pos_orders for all to authenticated using (true) with check (true);

create policy "Staff manage order items"
  on pos_order_items for all to authenticated using (true) with check (true);
