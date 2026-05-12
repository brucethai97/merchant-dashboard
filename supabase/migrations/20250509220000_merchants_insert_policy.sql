-- Allow a signed-in user to create their own merchant row (backup if trigger is missing or delayed).
create policy "merchants_insert_own"
on public.merchants
for insert
to authenticated
with check (id = (select auth.uid ()));
