export interface Merchant {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface MerchantInsert {
  id: string;
  display_name: string;
}