/**
 * Hovednavigasjon. `ready` styrer om lenken vises – vi lenker aldri til sider som
 * ikke finnes ennå (ingen 404 fra egen navigasjon). Slås på fase for fase.
 */
export type NavItem = { label: string; href: string; ready: boolean };

export const mainNav: NavItem[] = [
  { label: "Løsninger", href: "/losninger", ready: true },
  { label: "Produkter", href: "/produkter", ready: true },
  { label: "Prosjekter", href: "/prosjekter", ready: true },
  { label: "Om oss", href: "/om-oss", ready: true },
  { label: "Kontakt", href: "/kontakt", ready: true },
];

export const primaryCta = { label: "Start et prosjekt", href: "/kontakt" };

export const liveNav = () => mainNav.filter((i) => i.ready);

/** Sekundære sider i bunnteksten (kun sider som finnes) */
export const footerNav: NavItem[] = [
  { label: "Merkevarer", href: "/merkevarer", ready: true },
  { label: "Brukte møbler", href: "/brukt", ready: true },
  { label: "Møbelscout", href: "/mobelscout", ready: true },
  { label: "Miljø og bærekraft", href: "/baerekraft", ready: true },
  { label: "Inspirasjon og råd", href: "/inspirasjon", ready: true },
];

export const legalNav: NavItem[] = [
  { label: "Salgsbetingelser", href: "/salgsbetingelser", ready: true },
  { label: "Personvern", href: "/personvern", ready: true },
  { label: "Informasjonskapsler", href: "/informasjonskapsler", ready: true },
];
