import Link from "next/link";
import { breadcrumbList, type Crumb } from "@/lib/seo/jsonld";
import { JsonLd } from "./JsonLd";

/** Synlige brødsmuler + BreadcrumbList-schema fra samme kilde */
export function Breadcrumbs({ crumbs, className }: { crumbs: Crumb[]; className?: string }) {
  const all = [{ name: "Forside", path: "/" }, ...crumbs];
  return (
    <nav aria-label="Brødsmuler" className={`crumbs ${className ?? ""}`}>
      <ol>
        {all.map((c, i) =>
          i === all.length - 1 ? (
            <li key={c.path} aria-current="page">{c.name}</li>
          ) : (
            <li key={c.path}><Link href={c.path}>{c.name}</Link></li>
          ),
        )}
      </ol>
      <JsonLd data={breadcrumbList(all)} />
    </nav>
  );
}
