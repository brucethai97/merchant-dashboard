import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Shared Supabase client type for `queries/*` (browser or server `createServerClient`). */
export type TypedSupabaseClient = SupabaseClient<Database>;
