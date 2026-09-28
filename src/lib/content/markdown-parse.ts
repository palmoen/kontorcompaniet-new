/**
 * Rene markdown-funksjoner (ingen React): frontmatter, blokker, FAQ, ordtelling.
 * Brukes av renderer (markdown.tsx), kvalitetsporter og skript.
 */
export type Frontmatter = Record<string, string>;
export type Doc = { data: Frontmatter; body: string };

/** Enkle `nøkkel: verdi`-linjer mellom `---`-skiller */
export function parseFrontmatter(src: string): Doc {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: src.trim() };
  const data: Frontmatter = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { data, body: src.slice(m[0].length).trim() };
}

export function countWords(md?: string | null): number {
  return (md ?? "").replace(/[#*_[\]()`>-]/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

type Block =
  | { t: "h2" | "h3" | "p"; text: string }
  | { t: "ul" | "ol"; items: string[] };

export function parseBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { t: "ul" | "ol"; items: string[] } | null = null;
  const flush = () => {
    if (para.length) blocks.push({ t: "p", text: para.join(" ") });
    if (list) blocks.push(list);
    para = [];
    list = null;
  };
  for (const raw of md.split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const h = line.match(/^(#{2,3})\s+(.*)$/);
    if (h) { flush(); blocks.push({ t: h[1].length === 2 ? "h2" : "h3", text: h[2] }); continue; }
    const ul = line.match(/^[-*•]\s+(.*)$/);
    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      const t = ul ? "ul" : "ol";
      if (para.length) { blocks.push({ t: "p", text: para.join(" ") }); para = []; }
      if (!list || list.t !== t) { if (list) blocks.push(list); list = { t, items: [] }; }
      list.items.push((ul ?? ol)![1]);
      continue;
    }
    if (list) { blocks.push(list); list = null; }
    para.push(line);
  }
  flush();
  return blocks;
}

export function slugifyHeading(s: string): string {
  return s.toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Overskrifter på nivå 2 – brukes til innholdsfortegnelse */
export function headings(md: string): { id: string; text: string }[] {
  return parseBlocks(md).filter((b) => b.t === "h2").map((b) => ({ id: slugifyHeading((b as { text: string }).text), text: (b as { text: string }).text }));
}

export const FAQ_HEADING = "Spørsmål vi ofte får";

/** Skiller ut FAQ-seksjonen (## Spørsmål vi ofte får, ### spørsmål + avsnitt) fra resten av teksten */
export function splitFaq(md: string): { body: string; faq: { q: string; a: string }[] } {
  const re = new RegExp(`^##\\s+${FAQ_HEADING}\\s*$`, "m");
  const m = md.match(re);
  if (!m || m.index === undefined) return { body: md, faq: [] };
  const rest = md.slice(m.index + m[0].length);
  const next = rest.search(/^##\s/m);
  const section = next === -1 ? rest : rest.slice(0, next);
  const body = (md.slice(0, m.index) + (next === -1 ? "" : rest.slice(next))).trim();
  const faq: { q: string; a: string }[] = [];
  let cur: { q: string; a: string[] } | null = null;
  for (const b of parseBlocks(section)) {
    if (b.t === "h3") { if (cur) faq.push({ q: cur.q, a: cur.a.join(" ") }); cur = { q: b.text, a: [] }; }
    else if (cur && b.t === "p") cur.a.push(b.text);
  }
  if (cur) faq.push({ q: cur.q, a: cur.a.join(" ") });
  return { body, faq: faq.filter((f) => f.a) };
}

/** Fjerner inline-markdown for bruk i ren tekst (JSON-LD, meta) */
export function plain(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}
