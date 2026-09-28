import { NextResponse, type NextRequest } from "next/server";
import generated from "@/generated/redirects.json";
import { resolveRedirect, type RedirectMap } from "@/lib/redirects/resolve";

/**
 * Proxy (tidligere «middleware» – omdøpt i Next 16, kjører i Node-runtime).
 * Håndterer migrerings-redirects, redirects redigert i admin, 410 og URL-normalisering.
 */
const staticMap = generated.map as RedirectMap;
const canonicalHost = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://kontorcompaniet.no").hostname;

// Redirects fra admin (ops.redirects via public.redirects_v), bufret i minnet
let dbMap: RedirectMap = {};
let dbFetchedAt = 0;
const DB_TTL_MS = 5 * 60 * 1000;

async function loadDbRedirects(): Promise<RedirectMap> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || Date.now() - dbFetchedAt < DB_TTL_MS) return dbMap;
  dbFetchedAt = Date.now();
  try {
    const res = await fetch(`${url}/rest/v1/redirects_v?select=from_path,to_path,status_code`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const rows = (await res.json()) as { from_path: string; to_path: string | null; status_code: number }[];
      dbMap = Object.fromEntries(
        rows.map((r) => [r.from_path.replace(/\/+$/, "") || "/", { to: r.to_path, status: r.status_code === 410 ? 410 : 301 }]),
      );
    }
  } catch {
    // Behold forrige versjon ved feil – statiske migrerings-redirects virker uansett
  }
  return dbMap;
}

const goneHtml = `<!doctype html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Siden finnes ikke lenger | Kontorcompaniet</title><style>body{font-family:system-ui,sans-serif;background:#FBFAF7;color:#211E19;max-width:40rem;margin:0 auto;padding:4rem 1.25rem;line-height:1.6}a{color:#211E19;font-weight:600}</style></head><body><h1>Siden finnes ikke lenger</h1><p>Innholdet er fjernet. Kanskje finner du det du leter etter her:</p><ul><li><a href="/">Forsiden</a></li><li><a href="/produkter">Produkter</a></li><li><a href="/mobelscout">Møbelscout – brukte kontormøbler</a></li><li><a href="/kontakt">Kontakt oss</a></li></ul></body></html>`;

export async function proxy(request: NextRequest) {
  const db = await loadDbRedirects();
  const result = resolveRedirect({ url: request.nextUrl, canonicalHost, maps: [db, staticMap] });
  if (result.kind === "redirect") return NextResponse.redirect(result.location, 301);
  if (result.kind === "gone") {
    return new NextResponse(goneHtml, { status: 410, headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Alt unntatt Next-interne ressurser og statiske filer med filendelse
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|woff2?)$).*)",
  ],
};
