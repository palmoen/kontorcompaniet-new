import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Admin | Kontorcompaniet" },
  robots: { index: false, follow: false },
};

const sections = [
  { label: "Oversikt", href: "/admin" },
  { label: "Møbelscout", href: "/admin/mobelscout" },
  { label: "Leads", href: "/admin#leads" },
  { label: "Innhold", href: "/admin#innhold" },
  { label: "SEO og redirects", href: "/admin#seo" },
  { label: "Innstillinger", href: "/admin#innstillinger" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateRows: "auto 1fr" }}>
      <header className="site-header" style={{ position: "static" }}>
        <div className="wrap">
          <Link href="/admin" style={{ fontWeight: 700, textDecoration: "none" }}>Kontorcompaniet · Admin</Link>
          <nav className="mainnav" aria-label="Admin">
            {sections.map((s) => <Link key={s.href} href={s.href}>{s.label}</Link>)}
          </nav>
        </div>
      </header>
      <main id="innhold" className="band tight"><div className="wrap">{children}</div></main>
    </div>
  );
}
