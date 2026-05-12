import type { Database } from "@/types/database";

export interface Store {
  id: string;
  merchant_id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  timezone: string;
  is_active: boolean;
}
/** Fields collected in forms before `merchant_id` is attached for insert. */
export interface StoreInsert {
  name: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  timezone: string;
  is_active: boolean;
}

/** Payload for `useUpdateMutation` on `public.stores` (include `id` when patching a row). */
export type StoreUpdatePayload =
  Database["public"]["Tables"]["stores"]["Update"];

/** Columns loaded by {@link getStoresListPage} for the dashboard grid (card + edit). */
export type StoreListRow = Pick<
  Store,
  | "id"
  | "name"
  | "street"
  | "city"
  | "state"
  | "zip_code"
  | "phone"
  | "timezone"
  | "is_active"
>;