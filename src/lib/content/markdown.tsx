import Link from "next/link";
import type { ReactNode } from "react";
import { parseBlocks, slugifyHeading } from "./markdown-parse";

/**
 * Liten, trygg markdown-renderer for redaksjonelt innhold (filer i /content og *_md-felt i Supabase).
 * Støtter: ## / ### overskrifter, avsnitt, punkt- og nummerlister, **fet**, *kursiv* og [lenker](/sti).
 * Ingen rå HTML slippes gjennom – alt blir React-elementer.
 */

export { countWords, FAQ_HEADING, headings, parseBlocks, parseFrontmatter, plain, slugifyHeading, splitFaq } from "./markdown-parse";
export type { Doc, Frontmatter } from "./markdown-parse";

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;

function inline(text: string, key: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    const k = `${key}-${i}`;
    if (part.startsWith("**")) return <strong key={k}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={k}>{part.slice(1, -1)}</em>;
    const a = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (a) {
      const href = a[2];
      if (href.startsWith("/")) return <Link key={k} href={href}>{a[1]}</Link>;
      if (/^https:\/\//.test(href)) return <a key={k} href={href} rel="noopener">{a[1]}</a>;
      return a[1]; // ukjente skjema (javascript: o.l.) blir ren tekst
    }
    return part;
  });
}

export function Markdown({ source, className }: { source?: string | null; className?: string }) {
  if (!source) return null;
  return (
    <div className={className ?? "prose"}>
      {parseBlocks(source).map((b, i) => {
        const k = `b${i}`;
        switch (b.t) {
          case "h2": return <h2 key={k} id={slugifyHeading(b.text)}>{inline(b.text, k)}</h2>;
          case "h3": return <h3 key={k}>{inline(b.text, k)}</h3>;
          case "p": return <p key={k}>{inline(b.text, k)}</p>;
          case "ul": return <ul key={k}>{b.items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}</ul>;
          case "ol": return <ol key={k}>{b.items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}</ol>;
        }
      })}
    </div>
  );
}
