# Merchant

A small secure multi-tenant merchant **Next.js** merchant dashboard: sign-in, a home dashboard with stats, a **store** grid (search, status filter, pagination), and **per-store** product management with the same list UX patterns.

This README records **why** certain approaches were chosen, not only **what** exists in the tree.

---

## Stack

| Layer       | Choice                                                                      | Notes                                                                          |
| ----------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Framework   | **Next.js 16** (App Router)                                                 | Follow `AGENTS.md` / `node_modules/next/dist/docs/` for version-specific APIs. |
| UI          | **React 19**, **Tailwind CSS 4**, **Radix UI**, **shadcn-style** components | `components/ui/*` for primitives.                                              |
| Backend     | **Supabase** (Auth + Postgres)                                              | RLS policies in `supabase/migrations/`.                                        |
| Forms       | **react-hook-form** + **Zod**                                               | Shared schemas where create and edit share fields.                             |
| Client data | **TanStack Query** + **`@supabase-cache-helpers/postgrest-react-query`**    | See **Data fetching flow** below.                                              |

---

## Data fetching flow

1. **Server components** use the Supabase server client for auth gates and small, page-scoped reads (for example loading one store for the detail layout). Large filtered grids are not driven from RSC props.

2. **`ReactQueryClientProvider`** in `app/provider.tsx` wraps the app so every client feature shares one TanStack **QueryClient** (default `staleTime` reduces immediate refetch on mount).

3. **List reads** call `useQuery` with PostgREST builders from `queries/*`. **Stores** use **`getStoresListPage`** (`queries/store.ts`) with **`STORE_LIST_SELECT`** (columns for the grid + edit, not `*`). **Per-store products** use **`getProductsListPageForStore`** (`queries/product.ts`) with **`PRODUCT_LIST_SELECT`**. Each list query is one `select(<columns>, { count: 'exact' }).range(...)` so the response includes the **page of rows** and the **filtered total** `count` for pagination (“Showing x–y of z”). A second **head-only** count (**`getStoresCount`** / **`getProductsCountForStore`** without filters) runs only to detect “empty resource” vs “no filter matches”.

4. **Cache-aware writes** use **`useUpdateMutation`** / **`useInsertMutation`** with the same `supabase.from('stores' | 'products')` builder the list queries use. Pass the same **`STORE_LIST_SELECT`** / **`PRODUCT_LIST_SELECT`** as the mutation’s **return column list** (third argument) so PostgREST rows match what **`useQuery`** caches for the grid. Examples: **`StoreFormDialog`** create (`useInsertMutation` in the dialog) and edit (`onUpdate` → parent **`useUpdateMutation`**); **`StoreProductsList`** wires **`useInsertMutation`** / **`useUpdateMutation`** and passes **`onProductInsert`** / **`onProductUpdate`** into **`ProductFormDialog`** (create/edit), **`ProductCard`** (**`is_available`** toggles), and **`DeleteProductDialog`** (soft-delete via **`deleted_at`** on the same update mutate, using **`buildProductSoftDeletePayload`** in `types/product.ts`). The library reconciles affected query caches after each mutation.

5. **Callbacks after success** — Even when a write goes through the helpers above, feature code often still calls **`onProductsMutated`** / **`refetchListQueries`** and **`router.refresh()`** so list **`useQuery`** data and any **server-rendered** slices (e.g. dashboard counts) stay aligned with what the user just did. One-off **browser client** usage remains for things that are not list mutations (for example **`StoreFormDialog`** reads **`auth.getUser()`** before insert to attach **`merchant_id`**).

---

## Technical decisions & reasoning

### Supabase + Row Level Security

All tenant data is scoped in the database with **RLS**. The app assumes an authenticated user and uses the browser Supabase client on the client and the server client on RSC routes. That keeps authorization logic **out of ad-hoc API routes** and consistent with PostgREST filters.

**`lib/supabase/server.ts`** and **`lib/supabase/client.ts`** use **`@supabase/ssr`** with **`cookies()`** on the server so RSC routes can read the session. The server client’s cookie **`setAll`** path tolerates RSC limitations (see inline comment there). Session refresh and route protection run in root **`proxy.ts`** (Next.js 16’s successor to `middleware.ts`); see [Supabase + Next.js (SSR / cookies)](https://supabase.com/docs/guides/auth/server-side/nextjs) for cookie patterns.

### `@supabase-cache-helpers/postgrest-react-query`

**Store list** and **store products list** use:

- **Stores:** `useQuery(getStoresListPage(...))` for the current page **and** filtered total `count`; plus `useQuery(getStoresCount())` without filters for the empty-merchant check.
- **Products (per store):** `useQuery(getProductsListPageForStore(...))` for the current page **and** filtered total `count`; plus `useQuery(getProductsCountForStore(storeId))` without filters for the empty-store check.
- **Mutations — stores:** `useUpdateMutation` for list patches (e.g. active flag); **`StoreFormDialog`** uses `useInsertMutation` for creates.
- **Mutations — products:** `useInsertMutation` and `useUpdateMutation` in **`StoreProductsList`** (same `products` builder and **`PRODUCT_LIST_SELECT`**) for **`ProductFormDialog`** (create/edit), **`ProductCard`** (availability), and **`DeleteProductDialog`** (soft-delete).

**Reasoning:** Mutations automatically reconcile related queries (same table / keys), so the grid, counts, and pagination stay aligned without hand-writing `queryClient.invalidateQueries` for every flow. Parent **`refetch`** / **`router.refresh()`** callbacks (see **Data fetching flow**, step 5) complement that for RSC-backed UI and explicit list reloads where needed.

### Forms & Validation: `react-hook-form` + Zod

Forms throughout the dashboard leverage **react-hook-form** for performant form state management, with **Zod** schemas for validation. This pairing provides:

- **Type safety**: Zod schemas define API & client form shapes, DRYing field definitions and validation logic.
- **Instant validation**: `react-hook-form` + Zod's resolver validates inputs on change/blur and before submission.
- **Schema centralization**: For most resources, shared schemas (`*_schema.ts`) ensure both create and edit forms reuse validation and (de)serialization logic.
- **All form components** follow this model: Zod schema for parsing/validation, react-hook-form for component wiring, and mapping errors consistently to fields.
- On successful mutation, forms close dialogs and optionally trigger parent query refreshes.

**Why?** This approach eliminates duplicated validation, minimizes manual wiring, delivers consistent UX for required/invalid fields, and future-proofs form components for evolving validation needs.

### Search, filter, and pagination parity (`store-list` vs `store-products-list`)

Both lists implement:

- **Debounced search** (400ms) to limit churn on `ilike` queries.
- **Sanitized search strings** in query helpers so PostgREST `or` / `ilike` filters are not broken by user punctuation.
- **Status-style filter** (stores: `is_active`; products: `is_available`).
- **Fixed page size** tied to the **4×2 grid** at large breakpoints so the UI and query `range()` stay in sync.

**Reasoning:** Merchants get predictable behavior between “all stores” and “one store’s products”; bugs are easier to spot when the patterns match.

### Merchant dashboard loading

While merchant profile data is loading, a **skeleton** mirrors the final layout (header, profile block, stat placeholders) with `aria-busy` for accessibility, instead of a single “Loading…” string.

### Store card UX

- **Double-click** the card (outside interactive controls) navigates to the store detail route; controls use `closest()` so toggles and links do not trigger navigation accidentally.
- **Active / inactive** use a clear visual treatment (badge + top accent where applicable).
- **Edit / View** as **icon-only** buttons with explicit `aria-label`s.
- **Delete** as a destructive button with a confirmation dialog.

### Product soft delete

Products use **`deleted_at timestamptz`** (null = active). **Remove** in **`DeleteProductDialog`** sets **`deleted_at`** through the same **`useUpdateMutation`** path as other product updates (not a separate direct `update()` call). **`products_select_own`** allows **select** on any product row for stores you own (including after soft-delete) so **UPDATE … RETURNING** still satisfies RLS; **catalog** queries in **`queries/product.ts`** add **`deleted_at is null`**, so the grid and dashboard counts only show active catalog rows while soft-deleted rows stay in the database for audit or restore flows.

**Reasoning:** Soft delete protects inventory and sales history, prevents accidental loss, and enables "undo" or restore scenarios as needed.

---

## Repository layout (high level)

| Path                   | Role                                                                             |
| ---------------------- | -------------------------------------------------------------------------------- |
| `app/`                 | Routes, layouts, RSC data entry for pages that still fetch on the server.        |
| `proxy.ts`             | Next.js **Proxy** (replaces `middleware.ts`): Supabase session refresh + auth gates. |
| `lib/supabase/`        | Browser, server, and proxy session helpers (`@supabase/ssr`).                     |
| `features/`            | Feature-oriented UI (merchant, store, product).                                  |
| `queries/`             | Supabase query builders shared by RSC and client hooks (counts, pages, filters). |
| `supabase/migrations/` | Schema + RLS.                                                                    |
| `types/`               | Shared TypeScript shapes and update payload builders where helpful.              |
| `components/ui/`       | Reusable primitives (Button, Card, Dialog, Skeleton, etc.).                      |

---

## Local development

```bash
npm install
npm run dev
```

Configure Supabase (URL, anon key, etc.) per your environment—typically `.env.local` for the Next app and a local or hosted Supabase project.

To **reset the local database** (migrations + seed, if configured), use the Supabase CLI from the repo root:

```bash
supabase db reset
```

---

## Further reading

- **`AGENTS.md`** — Next.js version notes for this repo.
- [Supabase local dev](https://supabase.com/docs/guides/cli) — CLI, migrations, and `db reset`.
- [Supabase + Next.js (SSR / cookies)](https://supabase.com/docs/guides/auth/server-side/nextjs) — aligns with `lib/supabase/*`.
