import Link from "next/link";

/**
 * Koblingslinjen: viser hvordan siden henger sammen med produkt, prosjekt,
 * løsning, merke, rådgiver og Møbelscout. Første node er siden selv.
 */
export type Connection = { type: string; name: string; href?: string; scout?: boolean };

export function ConnectionLine({ items, label = "Henger sammen med" }: { items: Connection[]; label?: string }) {
  if (items.length < 2) return null;
  return (
    <nav className="kobl" aria-label={label}>
      <div className="wrap">
        <span className="kobl-label">{label}</span>
        <ol>
          {items.map((it, i) => (
            <li key={`${it.type}-${it.name}`} className={it.scout ? "scout" : undefined}>
              {i === 0 || !it.href ? (
                <span className="here" aria-current={i === 0 ? "page" : undefined}>
                  <span className="kt">{it.type}</span><span className="kn">{it.name}</span>
                </span>
              ) : (
                <Link href={it.href}><span className="kt">{it.type}</span><span className="kn">{it.name}</span></Link>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
