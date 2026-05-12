import { TypedSupabaseClient } from "@/utils/types";

/** PostgREST select list matching {@link StoreListRow} (omit `merchant_id`, timestamps). */
export const STORE_LIST_SELECT: string = [
  "id",
  "name",
  "street",
  "city",
  "state",
  "zip_code",
  "phone",
  "timezone",
  "is_active",
].join(",");

/** Page size for the merchant store grid (4×2). */
export const STORE_LIST_PAGE_SIZE = 8;

export type StoreListStatusFilter = "all" | "active" | "inactive";

export type StoreListFilterOptions = {
  search?: string;
  status?: StoreListStatusFilter;
};

/** Strip characters that break PostgREST `or` / `ilike` filter strings. */
function sanitizeStoreSearchInput(raw: string): string {
  return raw
    .trim()
    .replace(/[,()*%_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function applyStoreListFilters<Q extends { eq: unknown; or: unknown }>(
  query: Q,
  options?: StoreListFilterOptions,
): Q {
  let q = query;
  const status = options?.status ?? "all";
  if (status === "active") {
    q = (q as { eq: (c: string, v: boolean) => Q }).eq("is_active", true);
  } else if (status === "inactive") {
    q = (q as { eq: (c: string, v: boolean) => Q }).eq("is_active", false);
  }
  const phrase = sanitizeStoreSearchInput(options?.search ?? "");
  if (phrase.length > 0) {
    const like = `%${phrase}%`;
    const orExpr = [
      `name.ilike.${like}`,
      `street.ilike.${like}`,
      `city.ilike.${like}`,
      `state.ilike.${like}`,
      `zip_code.ilike.${like}`,
      `phone.ilike.${like}`,
      `timezone.ilike.${like}`,
    ].join(",");
    q = (q as { or: (expr: string) => Q }).or(orExpr);
  }
  return q;
}

/**
 * **Listing + paging in one PostgREST call:** returns the current page of rows
 * (ordered by name) and `count: "exact"` for the **total** number of rows matching
 * `filters` (not just the page size). Use the response `count` for “Showing x–y of z”
 * and `Math.ceil(count / pageSize)` for total pages—no separate filtered count query.
 */
export function getStoresListPage(
  client: TypedSupabaseClient,
  page: number,
  pageSize: number = STORE_LIST_PAGE_SIZE,
  filters?: StoreListFilterOptions,
) {
  const safePage = Math.max(1, Math.floor(page));
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;
  const base = client
    .from("stores")
    .select(STORE_LIST_SELECT, { count: "exact" })
    .order("name", { ascending: true });
  return applyStoreListFilters(base, filters).range(from, to);
}

/** Row count only (no rows). Prefer {@link getStoresListPage} when you also need the page of stores. */
export function getStoresCount(
  client: TypedSupabaseClient,
  filters?: StoreListFilterOptions,
) {
  const base = client
    .from("stores")
    .select("id", { count: "exact", head: true });
  return applyStoreListFilters(base, filters);
}

/** Active stores only (RLS limits to the current merchant). */
export function getActiveStoresCount(client: TypedSupabaseClient) {
  return client
    .from("stores")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
}

export function selectStoreById(client: TypedSupabaseClient, storeId: string) {
  return client.from("stores").select("*").eq("id", storeId).single();
}
