alter table public.merchants enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;

-- Merchants: each user only sees and updates their own profile
create policy "merchants_select_own"
on public.merchants
for select
to authenticated
using (id = (select auth.uid ()));

create policy "merchants_update_own"
on public.merchants
for update
to authenticated
using (id = (select auth.uid ()))
with check (id = (select auth.uid ()));

-- Stores: scoped to owning merchant
create policy "stores_select_own"
on public.stores
for select
to authenticated
using (merchant_id = (select auth.uid ()));

create policy "stores_insert_own"
on public.stores
for insert
to authenticated
with check (merchant_id = (select auth.uid ()));

create policy "stores_update_own"
on public.stores
for update
to authenticated
using (merchant_id = (select auth.uid ()))
with check (merchant_id = (select auth.uid ()));

create policy "stores_delete_own"
on public.stores
for delete
to authenticated
using (merchant_id = (select auth.uid ()));

-- Products: scoped through parent store ownership
-- Select: any row for stores you own (including soft-deleted). Catalog/list queries
-- in the app must add `deleted_at is null` so removed SKUs stay out of the grid; this
-- shape is required so UPDATE … RETURNING * after setting `deleted_at` still passes RLS.
create policy "products_select_own"
on public.products
for select
to authenticated
using (
  exists (
    select 1
    from public.stores s
    where s.id = products.store_id
      and s.merchant_id = (select auth.uid ())
  )
);

create policy "products_insert_own"
on public.products
for insert
to authenticated
with check (
  exists (
    select 1
    from public.stores s
    where s.id = products.store_id
      and s.merchant_id = (select auth.uid ())
  )
);

-- Update: same store ownership; allows PATCH including `deleted_at` (soft-delete / restore).
create policy "products_update_own"
on public.products
for update
to authenticated
using (
  exists (
    select 1
    from public.stores s
    where s.id = products.store_id
      and s.merchant_id = (select auth.uid ())
  )
)
with check (
  exists (
    select 1
    from public.stores s
    where s.id = products.store_id
      and s.merchant_id = (select auth.uid ())
  )
);

create policy "products_delete_own"
on public.products
for delete
to authenticated
using (
  exists (
    select 1
    from public.stores s
    where s.id = products.store_id
      and s.merchant_id = (select auth.uid ())
  )
);
