import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import type { Metadata } from "next";

// Next legger selv til noindex på 404-svar
export const metadata: Metadata = { title: { absolute: "Fant ikke siden | Kontorcompaniet" } };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="innhold" className="band">
        <div className="wrap stack measure">
          <span className="eyebrow">404</span>
          <h1>Fant ikke siden</h1>
          <p className="muted">Siden kan ha blitt flyttet eller slettet.</p>
          <div className="btn-row"><Link className="btn btn-primary" href="/">Til forsiden</Link><Link className="btn btn-secondary" href="/kontakt">Kontakt oss</Link></div>
        </div>
      </main>
    </>
  );
}
