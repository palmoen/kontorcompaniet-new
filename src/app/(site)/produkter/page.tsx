import Image from "next/image";
import Link from "next/link";
import { LeadSection, PageIntro } from "@/components/blocks";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { readDoc } from "@/lib/content/files";
import { content } from "@/lib/content/repository";
import { collectionPage } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAdvisor } from "@/lib/site/pages";

export const metadata = buildMetadata({
  title: "Kontormøbler",
  description: "Kontorstoler, skrivebord, møtebord, kantinestoler, sofaer, oppbevaring og akustikk fra produsenter vi kjenner godt. Be om tilbud.",
  path: "/produkter",
});

export default async function ProductsHub() {
  const [categories, brands, settings, advisor] = await Promise.all([
    content.listCategories(), content.listBrands(), content.getSiteSettings(), getAdvisor(),
  ]);
  const docs = await Promise.all(categories.map((c) => readDoc("produkter", c.slug)));
  const items = categories.map((c, i) => ({ c, d: docs[i] })).filter((x) => x.d);

  return (
    <>
      <div className="wrap"><Breadcrumbs crumbs={[{ name: "Produkter", path: "/produkter" }]} /></div>
      <PageIntro
        title="Kontormøbler"
        lead={`Vi leverer møbler fra ${brands.length} produsenter, og vi velger dem vi vet holder. Her er det vi leverer mest av. Vi har ingen nettbutikk: dere får et tilbud tilpasset prosjektet.`}
      />
      <section className="band tight">
        <div className="wrap">
          <ul className="tiles">
            {items.map(({ c, d }) => (
              <li key={c.slug}>
                <Link href={`/produkter/${c.slug}`} className="tile">
                  {d!.data.image && <span className="tile-img"><Image src={d!.data.image} alt="" fill sizes="(max-width: 700px) 100vw, 33vw" quality={60} /></span>}
                  <span className="tile-title">{c.name}</span>
                  <span className="tile-text">{d!.data.lead}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="muted after-list">Se også <Link className="textlink" href="/merkevarer">alle merkene vi leverer</Link> og <Link className="textlink" href="/brukt">brukte kontormøbler</Link>.</p>
        </div>
      </section>
      <LeadSection settings={settings} advisor={advisor} kind="quote_request" showList title="Be om tilbud" />
      <JsonLd data={collectionPage({ name: "Kontormøbler", path: "/produkter", items: items.map(({ c }) => ({ name: c.name, path: `/produkter/${c.slug}` })) })} />
    </>
  );
}
