-- Extensions used by triggers, password hashing in seeds, and UUID defaults
create extension if not exists pgcrypto;

-- Merchant profile (1:1 with auth.users)
create table public.merchants (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid (),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null,
  street text not null,
  city text not null,
  state text not null,
  zip_code text not null,
  phone text not null,
  timezone text not null default 'America/Los_Angeles',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stores_merchant_id_idx on public.stores (merchant_id);

create table public.products (
  id uuid primary key default gen_random_uuid (),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  is_available boolean not null default true,
  -- null = active row; set to now() (or any timestamp) to soft-delete (hidden from default selects via RLS)
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_store_id_idx on public.products (store_id);

create index products_store_id_active_idx on public.products (store_id)
where
  deleted_at is null;

-- Keeps updated_at in sync on row changes
create or replace function public.set_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger merchants_set_updated_at
before update on public.merchants
for each row
execute function public.set_updated_at ();

create trigger stores_set_updated_at
before update on public.stores
for each row
execute function public.set_updated_at ();

create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at ();

-- Auto-create merchant row when a user signs up
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.merchants (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(coalesce(new.email, ''), '@', 1),
      'Merchant'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user ();
