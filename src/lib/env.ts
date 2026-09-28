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
  // Direkte Postgres-tilkobling (Supabase pooler) for server-kode: Møbelscout, leads, jobber
  DATABASE_URL: z.string().startsWith("postgres").optional(),
  // AI (OpenAI som standard; modell per oppgave kan byttes uten kodeendring)
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_SCOUT_MODEL: z.string().default("gpt-5.4-mini"),
  OPENAI_TRANSCRIBE_MODEL: z.string().default("gpt-4o-mini-transcribe"),
  // Beskytter jobb-endepunkter (pg_cron → /api/cron/*)
  CRON_SECRET: z.string().min(16).optional(),
  // E-post (Resend). Uten nøkkel logges varsler i stedet for å sendes.
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().default("Kontorcompaniet <post@kontorcompaniet.no>"),
  SALES_NOTIFY_EMAIL: z.email().optional(),
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
export const hasDatabase = Boolean(env.DATABASE_URL);
export const hasOpenAi = Boolean(env.OPENAI_API_KEY);
