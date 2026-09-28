/**
 * Hovednavigasjon. `ready` styrer om lenken vises – vi lenker aldri til sider som
 * ikke finnes ennå (ingen 404 fra egen navigasjon). Slås på fase for fase.
 */
export type NavItem = { label: string; href: string; ready: boolean };

export const mainNav: NavItem[] = [
  { label: "Løsninger", href: "/losninger", ready: false },
  { label: "Produkter", href: "/produkter", ready: false },
  { label: "Prosjekter", href: "/prosjekter", ready: false },
  { label: "Møbelscout", href: "/mobelscout", ready: true },
  { label: "Om oss", href: "/om-oss", ready: false },
  { label: "Kontakt", href: "/kontakt", ready: true },
];

export const primaryCta = { label: "Start et prosjekt", href: "/kontakt" };

export const liveNav = () => mainNav.filter((i) => i.ready);
