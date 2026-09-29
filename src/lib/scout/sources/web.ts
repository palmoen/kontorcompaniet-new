import { createHash } from "node:crypto";
import type { ExtractedListing } from "../ai/provider";
import { SCOUT_CATEGORIES, type CategoryKey } from "../need";
import type { ScoutItemInput, ScoutRawItem, ScoutSourceAdapter } from "./types";

/**
 * NETTSIDE-KILDE: leser offentlige oversiktssider hos en forhandler og lar AI lese ut varene.
 * Brukes bare for kilder med legal_status «test» (intern test før avklaring) eller «approved».
 *
 * Hensyn: følger robots.txt, identifiserer seg, henter få sider med pause mellom, og lagrer
 * bare det matchingen trenger (ingen bilder). Kilden og lenken vises aldri til kunden.
 *
 * config: { pages: { office_chair: ["https://…"], … }, maxPages?: 3, delayMs?: 2000 }
 */
export const USER_AGENT = "KontorcompanietScout/1.0 (+https://kontorcompaniet.no/mobelscout)";
const MAX_TEXT = 60_000;

type Deps = { fetch: typeof fetch; sleep: (ms: number) => Promise<void> };
const defaultDeps: Deps = { fetch: (...a) => fetch(...a), sleep: (ms) => new Promise((r) => setTimeout(r, ms)) };

/** Enkel robots.txt-tolkning: grupper for vår agent eller «*», lengste treff av Allow/Disallow vinner */
export function robotsAllows(robotsTxt: string, path: string, agent = "KontorcompanietScout"): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const [, key, value] = m;
    const k = key.toLowerCase();
    if (k === "user-agent") {
      if (!current || !lastWasAgent) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((k === "allow" || k === "disallow") && current) {
      if (value) current.rules.push({ allow: k === "allow", path: value });
      lastWasAgent = false;
    } else lastWasAgent = false;
  }
  const mine = groups.filter((g) => g.agents.some((a) => a !== "*" && agent.toLowerCase().includes(a)));
  const rules = (mine.length ? mine : groups.filter((g) => g.agents.includes("*"))).flatMap((g) => g.rules);
  let best: { allow: boolean; len: number } | null = null;
  for (const r of rules) {
    const pattern = new RegExp("^" + r.path.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
    if (pattern.test(path) && (!best || r.path.length > best.len || (r.path.length === best.len && r.allow))) {
      best = { allow: r.allow, len: r.path.length };
    }
  }
  return best ? best.allow : true;
}

/** HTML → lesbar tekst der lenker beholdes som «tekst [url]», så AI kan knytte varer til adresser */
export function htmlToText(html: string, baseUrl: string): string {
  const abs = (href: string) => { try { return new URL(href, baseUrl).toString(); } catch { return href; } };
  return html
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<a\b[^>]*?href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, inner: string) => ` ${inner} [${abs(href)}] `)
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/article|\/section)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{2,}/g, "\n").trim()
    .slice(0, MAX_TEXT);
}

export function createWebAdapter(deps: Deps = defaultDeps): ScoutSourceAdapter {
  const robotsCache = new Map<string, { text: string; at: number }>();

  async function allowed(url: URL): Promise<boolean> {
    const cached = robotsCache.get(url.origin);
    let text = cached && Date.now() - cached.at < 3_600_000 ? cached.text : null;
    if (text === null) {
      const res = await deps.fetch(`${url.origin}/robots.txt`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10_000) }).catch(() => null);
      // 4xx = ingen regler; nettverksfeil/5xx = vær forsiktig og hopp over
      if (!res) return false;
      text = res.ok ? await res.text() : res.status >= 400 && res.status < 500 ? "" : null;
      if (text === null) return false;
      robotsCache.set(url.origin, { text, at: Date.now() });
    }
    return robotsAllows(text, url.pathname + url.search);
  }

  return {
    adapter: "web",

    async fetchItems({ category, config, ai }) {
      if (!ai?.extractListings) throw new Error("Nettside-kilder krever AI (OPENAI_API_KEY)");
      const pages = ((config.pages ?? {}) as Record<string, string[]>)[category] ?? [];
      const maxPages = Math.min(Number(config.maxPages ?? 3), 10);
      const delayMs = Math.max(Number(config.delayMs ?? 2000), 1000);
      const out: ScoutRawItem[] = [];
      for (const [i, page] of pages.slice(0, maxPages).entries()) {
        const url = new URL(page);
        if (url.protocol !== "https:") continue;
        if (!(await allowed(url))) throw new Error(`robots.txt tillater ikke ${url.pathname}`);
        if (i > 0) await deps.sleep(delayMs);
        const res = await deps.fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, signal: AbortSignal.timeout(20_000) });
        if (!res.ok) throw new Error(`${url.host} svarte ${res.status}`);
        const text = htmlToText(await res.text(), url.toString());
        const { items } = await ai.extractListings({ pageText: text, pageUrl: url.toString(), categoryLabel: SCOUT_CATEGORIES[category].many });
        out.push(...items.map((it) => ({ ...it, category, pageUrl: url.toString() })));
      }
      return out;
    },

    normalize(raw) {
      const r = raw as ExtractedListing & { category: CategoryKey; pageUrl: string };
      if (!r.title?.trim() || !r.category) return null;
      const sourceUrl = r.url && /^https:\/\//.test(r.url) ? r.url : null;
      const externalId = sourceUrl ?? createHash("sha1").update(`${r.pageUrl}|${r.title}|${r.brand}|${r.model}`).digest("hex").slice(0, 16);
      return {
        externalId, category: r.category, brand: r.brand?.trim() || null, model: r.model?.trim() || null, title: r.title.trim(),
        description: null, quantity: Math.max(1, Math.round(r.quantity ?? 1)), condition: r.condition ?? "used", color: null, material: null,
        locationText: r.location?.trim() || null, municipality: r.location?.split(/[,(]/)[0].trim() || null,
        sourcePrice: r.price_nok && r.price_nok > 0 ? Math.round(r.price_nok) : null, sourceUrl, images: [],
      } satisfies ScoutItemInput;
    },
  };
}

export const webAdapter = createWebAdapter();
