import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS — only for background workers, system writes
 * (matches, audit logs, events authored by AI) and staff routes after a role check.
 * Never import this from a Client Component.
 */
export function createAdminClient() {
  if (admin) return admin;
  admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
