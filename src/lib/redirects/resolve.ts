/**
 * Ren oppslagsfunksjon for redirects (testbar uten Next).
 * Regler: ett hopp til endelig mål · vertsnavn uten www · uten avsluttende «/» ·
 * WooCommerce-parametere fjernes · 410 for bevisst fjernet innhold.
 */
export type RedirectEntry = { to: string | null; status: 301 | 410 };
export type RedirectMap = Record<string, RedirectEntry>;

export type Resolution =
  | { kind: "none" }
  | { kind: "redirect"; location: string }
  | { kind: "gone" };

// Parametere fra WooCommerce/WordPress som aldri gir unike sider
const STRIP_PARAMS = /^(add-to-cart|orderby|product-page|min_price|max_price|rating_filter|filter_.*|query_type_.*|replytocom|_wpnonce)$/;

export function resolveRedirect(input: { url: URL; canonicalHost: string; maps: RedirectMap[] }): Resolution {
  const { url, canonicalHost } = input;
  let changed = false;

  const host = url.hostname.toLowerCase();
  const wantHost = canonicalHost.toLowerCase();
  // www → kanonisk domene i samme hopp. Andre verter (preview, localhost) beholder egen origin.
  const isWww = host === `www.${wantHost}`;
  if (isWww) changed = true;
  const origin = isWww ? `https://${wantHost}` : url.origin;

  const params = new URLSearchParams(url.search);
  for (const k of [...params.keys()]) {
    if (STRIP_PARAMS.test(k)) { params.delete(k); changed = true; }
  }
  const search = params.toString();

  let path = url.pathname;
  if (path.length > 1 && path.endsWith("/")) { path = path.replace(/\/+$/, "") || "/"; changed = true; }

  // Gamle WordPress/Yoast-sitemaps → ny sitemap
  if (/^\/(wp-sitemap|sitemap_index|[a-z0-9_-]+-sitemap\d*)\.xml$/.test(path)) {
    return { kind: "redirect", location: `${origin}/sitemap.xml` };
  }

  const withQuery = search ? `${path}?${search}` : path;
  const candidates = search ? [withQuery, path] : [path];
  for (const key of candidates) {
    for (const map of input.maps) {
      const hit = map[key] ?? map[safeDecode(key)];
      if (!hit) continue;
      if (hit.status === 410) return { kind: "gone" };
      const target = hit.to!;
      const location = /^https?:\/\//.test(target) ? target : `${origin}${target}`;
      return { kind: "redirect", location };
    }
  }

  if (!changed) return { kind: "none" };
  return { kind: "redirect", location: `${origin}${withQuery}` };
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}
