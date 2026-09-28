import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env, hasSupabase } from "@/lib/env";

export type AdminRole = "admin" | "editor" | "sales";
export type AdminUser = { id: string; email: string | null; name: string; role: AdminRole };

/** Supabase-klient med brukerens sesjon (cookies). Null uten konfigurasjon. */
export async function getAuthClient() {
  if (!hasSupabase) return null;
  const store = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Kalt fra en Server Component – sesjonen oppdateres ved neste Server Action/Route Handler
        }
      },
    },
  });
}

/** Innlogget bruker MED admin-rolle, ellers null. */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await getAuthClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // public.current_admin() er security definer – ops-skjemaet eksponeres ikke via API-et
  const { data } = await supabase.rpc("current_admin");
  const row = (data as { display_name: string; role: AdminRole }[] | null)?.[0];
  if (!row) return null;
  return { id: user.id, email: user.email ?? null, name: row.display_name, role: row.role };
}

/** Krev innlogget admin med en av rollene (admin har alltid tilgang). Brukes i sider og serverhandlinger. */
export async function requireAdmin(roles: AdminRole[]): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/logg-inn");
  if (user.role !== "admin" && !roles.includes(user.role)) redirect("/admin?ingen-tilgang=1");
  return user;
}
