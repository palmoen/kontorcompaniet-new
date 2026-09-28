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
  title: "Løsninger for kontoret",
  description: "Kontorlandskap, møterom, kantine, akustikk og ergonomi. Og tjenestene rundt: gjenbruk, leasing, prosjektledelse, levering og montering.",
  path: "/losninger",
});

export default async function SolutionsHub() {
  const [solutions, settings, advisor] = await Promise.all([content.listSolutions(), content.getSiteSettings(), getAdvisor()]);
  const docs = await Promise.all(solutions.map((s) => readDoc("losninger", s.slug)));
  const withDoc = solutions.map((s, i) => ({ s, d: docs[i] })).filter((x) => x.d);
  const rooms = withDoc.filter((x) => x.s.group === "rom");
  const services = withDoc.filter((x) => x.s.group === "tjeneste");

  return (
    <>
      <div className="wrap"><Breadcrumbs crumbs={[{ name: "Løsninger", path: "/losninger" }]} /></div>
      <PageIntro
        title="Hva skal dere få til?"
        lead="Vi starter med hvordan dere jobber, ikke med møblene. Velg et rom eller en tjeneste, eller ta kontakt, så finner vi ut av det sammen."
      />
      <section className="band tight">
        <div className="wrap">
          <h2 className="list-head">Rom og arbeidsplasser</h2>
          <ul className="tiles">
            {rooms.map(({ s, d }) => (
              <li key={s.slug}>
                <Link href={`/losninger/${s.slug}`} className="tile">
                  {d!.data.image && <span className="tile-img"><Image src={d!.data.image} alt="" fill sizes="(max-width: 700px) 100vw, 33vw" quality={60} /></span>}
                  <span className="tile-title">{s.name}</span>
                  <span className="tile-text">{d!.data.lead}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="band tight">
        <div className="wrap">
          <h2 className="list-head">Tjenester</h2>
          <ul className="rows">
            {services.map(({ s, d }) => (
              <li key={s.slug}>
                <Link href={`/losninger/${s.slug}`}><span className="row-title">{s.name}</span><span className="row-text">{d!.data.lead}</span></Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <LeadSection settings={settings} advisor={advisor} />
      <JsonLd data={collectionPage({ name: "Løsninger", path: "/losninger", items: withDoc.map(({ s }) => ({ name: s.name, path: `/losninger/${s.slug}` })) })} />
    </>
  );
}
