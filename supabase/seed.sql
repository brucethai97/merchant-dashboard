-- Dev seed: two merchants (auth users), stores, and products.
-- Password for both demo accounts: demo123456
-- Run after migrations via `supabase db reset` or `supabase db seed`.

create extension if not exists pgcrypto;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'demo@merchant.local',
    extensions.crypt('demo123456', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Demo Merchant"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'other@merchant.local',
    extensions.crypt('demo123456', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Other Merchant"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    gen_random_uuid (),
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"demo@merchant.local"}'::jsonb,
    'email',
    now(),
    now(),
    now ()
  ),
  (
    gen_random_uuid (),
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"other@merchant.local"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  );

-- handle_new_user trigger already created merchant rows

insert into public.stores (
  id,
  merchant_id,
  name,
  street,
  city,
  state,
  zip_code,
  phone,
  timezone,
  is_active
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Downtown Kitchen',
    '100 Main St',
    'San Francisco',
    'CA',
    '94102',
    '+14155550100',
    'America/Los_Angeles',
    true
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    'Mission Outpost',
    '2500 Mission St',
    'San Francisco',
    'CA',
    '94110',
    '+14155550200',
    'America/Los_Angeles',
    true
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '22222222-2222-2222-2222-222222222222',
    'Uptown Deli',
    '9 Broadway',
    'Oakland',
    'CA',
    '94607',
    '+15105550300',
    'America/Los_Angeles',
    true
  );

insert into public.products (id, store_id, name, description, price, is_available)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Margherita Pizza',
    'San Marzano tomatoes, mozzarella, basil',
    18.50,
    true
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Caesar Salad',
    'Romaine, parmesan, croutons, house dressing',
    12.00,
    true
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Breakfast Burrito',
    'Eggs, beans, cheese, salsa',
    11.25,
    false
  ),
  (
    '99999999-9999-9999-9999-999999999999',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Pastrami on Rye',
    'House-cured pastrami, mustard, pickles',
    14.75,
    true
  );
