/**
 * «Legg til i prosjekt»: en forespørselsliste i nettleseren (localStorage) som sendes
 * med kontaktskjemaet. Ikke en handlekurv – ingen priser, ingen bestilling.
 */
export type ListItem = { slug: string; name: string; brand?: string; qty?: number | null };

const KEY = "kc_prosjektliste";
const EVENT = "kc-prosjektliste";
const EMPTY: ListItem[] = [];
let cache: { raw: string | null; items: ListItem[] } = { raw: null, items: EMPTY };

function read(): ListItem[] {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { /* blokkert lagring */ }
  if (raw === cache.raw) return cache.items;
  let items = EMPTY;
  try { items = raw ? (JSON.parse(raw) as ListItem[]).slice(0, 50) : EMPTY; } catch { items = EMPTY; }
  cache = { raw, items };
  return items;
}

function write(items: ListItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignorer */ }
  window.dispatchEvent(new Event(EVENT));
}

export const projectList = {
  subscribe(cb: () => void) {
    window.addEventListener(EVENT, cb);
    window.addEventListener("storage", cb);
    return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
  },
  getSnapshot: read,
  getServerSnapshot: () => EMPTY,
  toggle(item: ListItem) {
    const items = read();
    write(items.some((i) => i.slug === item.slug) ? items.filter((i) => i.slug !== item.slug) : [...items, item]);
  },
  setQty(slug: string, qty: number | null) {
    write(read().map((i) => (i.slug === slug ? { ...i, qty } : i)));
  },
  remove(slug: string) { write(read().filter((i) => i.slug !== slug)); },
  clear() { write([]); },
};
