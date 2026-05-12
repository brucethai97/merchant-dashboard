import type { Database } from "@/types/database";

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: string;
  is_available: boolean;
  /** ISO timestamp when soft-deleted; `null` if active. */
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Insert shape for `public.products` (PostgREST / `useInsertMutation`). */
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];

/** Payload for `useUpdateMutation` on `public.products` (include `id`; set `deleted_at` to soft-delete). */
export type ProductUpdatePayload =
  Database["public"]["Tables"]["products"]["Update"];

/** Columns loaded by `getProductsListPageForStore` for the store product grid. */
export type ProductListRow = Pick<
  Product,
  "id" | "store_id" | "name" | "description" | "price" | "is_available"
>;

export function buildProductUpdatePayload(
  product: ProductListRow,
  is_available: boolean,
): ProductUpdatePayload {
  const price = Number.parseFloat(String(product.price));
  return {
    id: product.id,
    store_id: product.store_id,
    name: product.name,
    description: product.description,
    price: Number.isNaN(price) ? 0 : price,
    is_available,
  };
}

/** Row sent through `useUpdateMutation` to soft-delete (sets `deleted_at`). */
export function buildProductSoftDeletePayload(
  product: ProductListRow,
): ProductUpdatePayload {
  const price = Number.parseFloat(String(product.price));
  return {
    id: product.id,
    store_id: product.store_id,
    name: product.name,
    description: product.description,
    price: Number.isNaN(price) ? 0 : price,
    is_available: product.is_available,
    deleted_at: new Date().toISOString(),
  };
}
