import Link from "next/link";
import { LeadSection, PageIntro } from "@/components/blocks";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { content } from "@/lib/content/repository";
import { collectionPage } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAdvisor } from "@/lib/site/pages";

export const metadata = buildMetadata({
  title: "Merkevarer vi leverer",
  description: "HÅG, Vitra, Fora Form, Dencon, Sedus, Muuto, Abstracta og mange flere. Produsentene vi leverer kontormøbler fra, sortert etter kategori.",
  path: "/merkevarer",
});

export default async function BrandsHub() {
  const [brands, categories, settings, advisor] = await Promise.all([
    content.listBrands(), content.listCategories(), content.getSiteSettings(), getAdvisor(),
  ]);
  const featured = brands.filter((b) => b.hasPage);
  const sorted = [...brands].sort((a, b) => a.name.localeCompare(b.name, "nb"));

  return (
    <>
      <div className="wrap"><Breadcrumbs crumbs={[{ name: "Merkevarer", path: "/merkevarer" }]} /></div>
      <PageIntro
        title="Merkevarer"
        lead={`Vi leverer fra ${brands.length} produsenter, de fleste fra Norden. Vi velger dem vi vet holder, og som vi kan hjelpe dere med i mange år etter levering.`}
      />
      <section className="band tight" aria-labelledby="h-mest">
        <div className="wrap">
          <h2 id="h-mest" className="list-head">De vi bruker mest</h2>
          <ul className="brand-feature">
            {featured.map((b) => (
              <li key={b.slug}>
                <Link href={`/merkevarer/${b.slug}`}>
                  <span className="bname">{b.name}</span>
                  <span className="bmeta">{categories.filter((c) => b.categories.includes(c.slug)).map((c) => c.name).join(", ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="band tight" aria-labelledby="h-alle">
        <div className="wrap">
          <h2 id="h-alle" className="list-head">Alle merker</h2>
          <ul className="brand-index">
            {sorted.map((b) => <li key={b.slug}><Link href={`/merkevarer/${b.slug}`}>{b.name}</Link></li>)}
          </ul>
        </div>
      </section>
      <LeadSection settings={settings} advisor={advisor} kind="quote_request" title="Leter dere etter et bestemt merke?" intro="Vi leverer flere merker enn de som står her. Spør oss, så sjekker vi." />
      <JsonLd data={collectionPage({ name: "Merkevarer", path: "/merkevarer", items: sorted.map((b) => ({ name: b.name, path: `/merkevarer/${b.slug}` })) })} />
    </>
  );
}
