import Image from "next/image";
import Link from "next/link";
import { PageIntro } from "@/components/blocks";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { readDoc } from "@/lib/content/files";
import { collectionPage } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { ARTICLES } from "@/lib/site/pages";

export const metadata = buildMetadata({
  title: "Inspirasjon og råd",
  description: "Råd om ergonomi, akustikk og innredning av kontoret, fra folk som har innredet kontorer siden 1981.",
  path: "/inspirasjon",
});

export default async function InspirationHub() {
  const docs = await Promise.all(ARTICLES.map(async (slug) => ({ slug, doc: await readDoc("inspirasjon", slug) })));
  const list = docs.filter((d) => d.doc);
  return (
    <>
      <div className="wrap"><Breadcrumbs crumbs={[{ name: "Inspirasjon", path: "/inspirasjon" }]} /></div>
      <PageIntro title="Inspirasjon og råd" lead="Konkrete råd om ergonomi, lyd og innredning. Skrevet av oss, basert på det vi ser ute hos kundene." />
      <section className="band tight">
        <div className="wrap">
          <ul className="article-list">
            {list.map(({ slug, doc }) => (
              <li key={slug}>
                <Link href={`/inspirasjon/${slug}`}>
                  {doc!.data.image && <span className="media"><Image src={doc!.data.image} alt="" fill sizes="(max-width: 700px) 100vw, 40vw" quality={60} /></span>}
                  <span className="al-title">{doc!.data.title}</span>
                  <span className="muted">{doc!.data.lead}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <JsonLd data={collectionPage({ name: "Inspirasjon", path: "/inspirasjon", items: list.map(({ slug, doc }) => ({ name: doc!.data.title, path: `/inspirasjon/${slug}` })) })} />
    </>
  );
}
