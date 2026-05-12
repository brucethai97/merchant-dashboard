import type { MerchantInsert } from "@/types/merchant";
import { TypedSupabaseClient } from "@/utils/types";

export function selectMerchantByUserId(
  client: TypedSupabaseClient,
  userId: string,
) {
  return client.from("merchants").select("*").eq("id", userId).single();
}


export function createMerchant(
  client: TypedSupabaseClient,
  merchant: MerchantInsert,
) {
  return client.from("merchants").insert(merchant);
}