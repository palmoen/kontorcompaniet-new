import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaqList, LeadSection } from "@/components/blocks";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { headings, Markdown, splitFaq } from "@/lib/content/markdown";
import { content } from "@/lib/content/repository";
import { article, faqPage } from "@/lib/seo/jsonld";
import { buildMetadata, SITE_NAME } from "@/lib/seo/metadata";
import { ARTICLES, articlePage, getAdvisor } from "@/lib/site/pages";

export function generateStaticParams() {
  return ARTICLES.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/inspirasjon/[slug]">) {
  const { slug } = await params;
  const p = await articlePage(slug);
  if (!p) return {};
  return buildMetadata({
    title: p.doc.data.title, description: p.doc.data.description, path: `/inspirasjon/${slug}`, type: "article",
    image: p.doc.data.image ? { url: p.doc.data.image, alt: p.doc.data.imageAlt } : undefined, noindex: !p.index,
  });
}

const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" }) : null);

export default async function ArticlePage({ params }: PageProps<"/inspirasjon/[slug]">) {
  const { slug } = await params;
  const p = await articlePage(slug);
  if (!p) notFound();
  const [settings, advisor] = await Promise.all([content.getSiteSettings(), getAdvisor()]);
  const { data } = p.doc;
  const { body, faq } = splitFaq(p.doc.body);
  const toc = headings(body);
  const path = `/inspirasjon/${slug}`;

  return (
    <>
      <div className="wrap"><Breadcrumbs crumbs={[{ name: "Inspirasjon", path: "/inspirasjon" }, { name: data.title, path }]} /></div>
      <article>
        <header className="article-head wrap">
          <h1>{data.title}</h1>
          <p className="lead measure">{data.lead}</p>
          <p className="byline">
            {data.author}{data.updated ? ` · Oppdatert ${date(data.updated)}` : data.published ? ` · ${date(data.published)}` : ""}
          </p>
        </header>
        {data.image && (
          <div className="wrap"><div className="article-hero"><Image src={data.image} alt={data.imageAlt ?? ""} fill priority sizes="(max-width: 900px) 100vw, 900px" quality={70} /></div></div>
        )}
        <section className="band">
          <div className="wrap article-grid">
            <Markdown source={body} />
            {toc.length > 2 && (
              <aside className="side">
                <nav className="side-block toc" aria-label="Innhold">
                  <h2>Innhold</h2>
                  <ol className="link-list">{toc.map((h) => <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>)}</ol>
                </nav>
              </aside>
            )}
          </div>
        </section>
      </article>
      <FaqList items={faq} />
      <section className="band tight">
        <div className="wrap"><Link className="textlink" href="/inspirasjon">Flere artikler</Link></div>
      </section>
      <LeadSection settings={settings} advisor={advisor} kind="advisor_request" title="Vil dere ha hjelp?" />
      <JsonLd data={[
        article({
          headline: data.title, path, datePublished: data.published, dateModified: data.updated ?? data.published,
          author: data.author && data.author !== SITE_NAME ? data.author : undefined, image: data.image,
        }),
        ...(faq.length ? [faqPage(faq)] : []),
      ]} />
    </>
  );
}
