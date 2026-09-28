/**
 * Førsteparts attribusjon for denne økten (UTM, referrer, landingsside).
 * Lagres i sessionStorage og sendes KUN med skjemaer brukeren selv sender.
 */
const ATTR_KEY = "kc_attr";

export function readAttribution(): Record<string, string> {
  try {
    const saved = sessionStorage.getItem(ATTR_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* lagring kan være blokkert */ }
  return {};
}

export function captureAttribution() {
  try {
    if (sessionStorage.getItem(ATTR_KEY)) return;
    const p = new URLSearchParams(location.search);
    const a: Record<string, string> = { landing_page: location.pathname };
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid"]) {
      const v = p.get(k);
      if (v) a[k] = v.slice(0, 300);
    }
    if (document.referrer && !document.referrer.startsWith(location.origin)) a.referrer = document.referrer.slice(0, 300);
    sessionStorage.setItem(ATTR_KEY, JSON.stringify(a));
  } catch { /* ignorer */ }
}

export function track(name: "scout_started" | "cta_click" | "contact_started", props?: Record<string, string>) {
  try {
    navigator.sendBeacon?.("/api/events", new Blob([JSON.stringify({ name, path: location.pathname, props })], { type: "application/json" }));
  } catch { /* ignorer */ }
}
