import { z } from "zod";

/**
 * Miljøvariabler. Supabase er valgfritt i utvikling og CI: uten konfigurasjon
 * brukes seed-innhold (src/lib/content/seed.ts), og admin er utilgjengelig.
 */
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("https://kontorcompaniet.no"),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  // Stopper indeksering av preview/staging. Settes til "true" kun i produksjon.
  SITE_INDEXABLE: z.enum(["true", "false"]).default("false"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Ugyldige miljøvariabler: ${z.prettifyError(parsed.error)}`);
}

export const env = parsed.data;

export const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
export const isIndexable = env.SITE_INDEXABLE === "true";
export const hasSupabase = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
