import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { env, hasOpenAi, hasSupabase } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Kjente feilkoder fra postgres.js / Supabase-pooleren → hva som bør sjekkes */
const HINTS: Record<string, string> = {
  ENOTFOUND: "Vertsnavnet i DATABASE_URL finnes ikke. Kopier strengen på nytt fra Supabase → Connect → Transaction pooler.",
  ECONNREFUSED: "Databasen avviste tilkoblingen. Sjekk vert og port (6543) i DATABASE_URL.",
  ETIMEDOUT: "Tidsavbrudd mot databasen. Bruk pooler-adressen (aws-…pooler.supabase.com:6543), ikke db.….supabase.co (bare IPv6).",
  CONNECT_TIMEOUT: "Tidsavbrudd mot databasen. Bruk pooler-adressen (aws-…pooler.supabase.com:6543), ikke db.….supabase.co (bare IPv6).",
  "28P01": "Feil passord i DATABASE_URL. Inneholder passordet spesialtegn (@ # / : ?), må de URL-kodes, eller velg et nytt passord uten dem.",
  XX000: "Pooleren kjenner ikke brukeren. Brukernavnet må være postgres.<prosjekt-ref>, og regionen i vertsnavnet må stemme.",
  ERR_INVALID_URL: "DATABASE_URL er ikke en gyldig adresse. Spesialtegn i passordet må URL-kodes.",
};

/**
 * Enkel helsesjekk for drift: er databasen nåbar, og hvilke tjenester er konfigurert?
 * Viser aldri hemmeligheter – bare vertsnavn og feilkode.
 */
export async function GET() {
  const started = Date.now();
  let host: string | null = null;
  try { host = env.DATABASE_URL ? new URL(env.DATABASE_URL).hostname : null; } catch { host = "(ugyldig adresse)"; }

  let database: { status: "ok" | "feil" | "ikke konfigurert"; ms?: number; kode?: string; hint?: string };
  const sql = getSql();
  if (!sql) database = { status: "ikke konfigurert", hint: "DATABASE_URL er ikke satt." };
  else {
    try {
      await sql`select 1`;
      database = { status: "ok", ms: Date.now() - started };
    } catch (e) {
      const err = e as { code?: string; name?: string };
      const kode = err.code ?? err.name ?? "ukjent";
      console.error("[api:helse] database", e);
      database = { status: "feil", kode, hint: HINTS[kode] ?? "Se Vercel → Logs for detaljer ([api:helse])." };
    }
  }

  return NextResponse.json(
    {
      database: { ...database, vert: host },
      supabase: hasSupabase, openai: hasOpenAi, epost: Boolean(env.RESEND_API_KEY), salgsvarsel: Boolean(env.SALES_NOTIFY_EMAIL),
    },
    { status: database.status === "feil" ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
