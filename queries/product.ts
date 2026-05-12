import { TypedSupabaseClient } from "@/utils/types";

/** PostgREST select list matching `ProductListRow` in `@/types/product`. */
export const PRODUCT_LIST_SELECT: string = [
  "id",
  "store_id",
  "name",
  "description",
  "price",
  "is_available",
].join(",");

/** Page size for the store product grid (4×2 at `lg+`). */
export const STORE_PRODUCT_LIST_PAGE_SIZE = 8;

export type ProductListStatusFilter = "all" | "available" | "unavailable";

export type ProductListFilterOptions = {
  search?: string;
  status?: ProductListStatusFilter;
};

/** Strip characters that break PostgREST `or` / `ilike` filter strings. */
function sanitizeProductSearchInput(raw: string): string {
  return raw
    .trim()
    .replace(/[,()*%_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function applyProductStoreListFilters<Q extends { eq: unknown; or: unknown }>(
  query: Q,
  storeId: string,
  options?: ProductListFilterOptions,
): Q {
  let q = (query as { eq: (c: string, v: string) => Q }).eq(
    "store_id",
    storeId,
  );
  const status = options?.status ?? "all";
  if (status === "available") {
    q = (q as { eq: (c: string, v: boolean) => Q }).eq("is_available", true);
  } else if (status === "unavailable") {
    q = (q as { eq: (c: string, v: boolean) => Q }).eq("is_available", false);
  }
  const phrase = sanitizeProductSearchInput(options?.search ?? "");
  if (phrase.length > 0) {
    const like = `%${phrase}%`;
    const orExpr = [`name.ilike.${like}`, `description.ilike.${like}`].join(
      ",",
    );
    q = (q as { or: (expr: string) => Q }).or(orExpr);
  }
  return q;
}

/**
 * **Listing + paging in one PostgREST call** for a store: current page of rows
 * (ordered by name) and `count: "exact"` for the **total** rows matching `filters`.
 * Use the response `count` for “Showing x–y of z” and total pages.
 */
export function getProductsListPageForStore(
  client: TypedSupabaseClient,
  storeId: string,
  page: number,
  pageSize: number = STORE_PRODUCT_LIST_PAGE_SIZE,
  filters?: ProductListFilterOptions,
) {
  const safePage = Math.max(1, Math.floor(page));
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;
  const base = client
    .from("products")
    .select(PRODUCT_LIST_SELECT, { count: "exact" })
    .is("deleted_at", null)
    .order("name", { ascending: true });
  return applyProductStoreListFilters(base, storeId, filters).range(from, to);
}

/** Row count only (no rows). Prefer {@link getProductsListPageForStore} when you also need the page. */
export function getProductsCountForStore(
  client: TypedSupabaseClient,
  storeId: string,
  filters?: ProductListFilterOptions,
) {
  const base = client
    .from("products")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  return applyProductStoreListFilters(base, storeId, filters);
}

/** All products across the merchant’s stores (RLS scopes rows). */
export function getProductsCount(client: TypedSupabaseClient) {
  return client
    .from("products")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
}

/** Products with `is_available` true (RLS scopes rows). */
export function getAvailableProductsCount(client: TypedSupabaseClient) {
  return client
    .from("products")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("is_available", true);
}
