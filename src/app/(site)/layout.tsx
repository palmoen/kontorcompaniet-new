import { JsonLd } from "@/components/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { content } from "@/lib/content/repository";
import { organization, website } from "@/lib/seo/jsonld";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const settings = await content.getSiteSettings();
  return (
    <>
      <a className="skip-link" href="#innhold">Hopp til innhold</a>
      <SiteHeader />
      <main id="innhold">{children}</main>
      <SiteFooter settings={settings} />
      <JsonLd data={[organization(settings), website()]} />
    </>
  );
}
