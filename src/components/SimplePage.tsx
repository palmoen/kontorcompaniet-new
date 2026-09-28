import { notFound } from "next/navigation";
import { LeadSection, PageIntro } from "@/components/blocks";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { readDoc } from "@/lib/content/files";
import { Markdown } from "@/lib/content/markdown";
import { content } from "@/lib/content/repository";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAdvisor, SIMPLE_PAGES } from "@/lib/site/pages";

type Slug = keyof typeof SIMPLE_PAGES;

export async function simpleMetadata(slug: Slug) {
  const doc = await readDoc("sider", slug);
  const page = SIMPLE_PAGES[slug];
  return buildMetadata({
    title: page.title, description: doc?.data.description ?? page.title, path: `/${slug}`, noindex: page.draft,
    image: doc?.data.image ? { url: doc.data.image, alt: doc.data.imageAlt } : undefined,
  });
}

/** Enkle innholdssider (om oss, bærekraft, vilkår …) fra content/sider/{slug}.md */
export async function SimplePage({ slug, withLead = true }: { slug: Slug; withLead?: boolean }) {
  const doc = await readDoc("sider", slug);
  if (!doc) notFound();
  const page = SIMPLE_PAGES[slug];
  const [settings, advisor] = await Promise.all([content.getSiteSettings(), getAdvisor()]);
  return (
    <>
      <div className="wrap"><Breadcrumbs crumbs={[{ name: page.title, path: `/${slug}` }]} /></div>
      <PageIntro title={page.title} lead={doc.data.lead} image={doc.data.image} imageAlt={doc.data.imageAlt}>
        {page.draft && <p className="draft-note">Utkast: teksten må gjennomgås før lansering.</p>}
      </PageIntro>
      <section className="band">
        <div className="wrap"><Markdown source={doc.body} className="prose prose-narrow" /></div>
      </section>
      {withLead && <LeadSection settings={settings} advisor={advisor} />}
    </>
  );
}
