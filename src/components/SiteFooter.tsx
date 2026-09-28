import Link from "next/link";
import { displayPhone, type SiteSettings } from "@/lib/site/settings";
import { footerNav, legalNav, liveNav } from "@/lib/site/navigation";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();
  const social = Object.entries(settings.social).filter(([, url]) => Boolean(url));
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="cols">
          <div className="stack" style={{ ["--st" as string]: ".8rem" }}>
            <address>
              {settings.legalName}<br />
              {settings.streetAddress}{settings.addressNote ? ` (${settings.addressNote})` : ""}<br />
              {settings.postalCode} {settings.city}<br />
              <span className="selectable">{displayPhone(settings.phone)}</span><br />
              <span className="selectable">{settings.emailGeneral}</span>
            </address>
            {settings.openingHours.map((h) => (
              <p key={h.days}>{h.label ?? "Åpent"} hverdager {h.opens.slice(0, 2)}–{h.closes.slice(0, 2)}</p>
            ))}
          </div>
          <div>
            <h2>Kontorcompaniet</h2>
            <ul>{liveNav().map((i) => <li key={i.href}><Link href={i.href}>{i.label}</Link></li>)}</ul>
          </div>
          <div>
            <h2>Mer fra oss</h2>
            <ul>{footerNav.map((i) => <li key={i.href}><Link href={i.href}>{i.label}</Link></li>)}</ul>
          </div>
          <div>
            <h2>Følg oss</h2>
            <ul>{social.map(([name, url]) => <li key={name}><a href={url} rel="noopener">{name[0].toUpperCase() + name.slice(1)}</a></li>)}</ul>
          </div>
          <div>
            <h2>Sertifisert</h2>
            <ul>{settings.certifications.map((c) => <li key={c}><Link href="/baerekraft">{c}</Link></li>)}</ul>
          </div>
        </div>
        <div className="legal">
          <span>© {year} {settings.legalName}{settings.orgNumber ? ` · Org.nr. ${settings.orgNumber}` : ""} · Siden {settings.foundedYear}</span>
          <ul className="legal-links">{legalNav.map((i) => <li key={i.href}><Link href={i.href}>{i.label}</Link></li>)}</ul>
        </div>
      </div>
    </footer>
  );
}
