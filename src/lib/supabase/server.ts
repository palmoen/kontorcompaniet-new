import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, hasSupabase } from "@/lib/env";

let publicClient: SupabaseClient | null = null;

/** Leser KUN offentlige views (anon-nøkkel). Null når Supabase ikke er konfigurert. */
export function getPublicClient(): SupabaseClient | null {
  if (!hasSupabase) return null;
  publicClient ??= createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return publicClient;
}

/**
 * Service-rolle: omgår RLS. Kun for server-kode som validerer input selv
 * (skjemainnsending, Scout, jobber). Aldri importert i klientkode.
 */
export function getServiceClient(): SupabaseClient | null {
  if (!hasSupabase || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
