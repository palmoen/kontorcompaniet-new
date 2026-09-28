import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { getAdminUser } from "@/lib/supabase/auth";

export default async function AdminHome() {
  if (!hasSupabase) {
    return (
      <div className="stack measure">
        <h1>Admin er ikke konfigurert</h1>
        <p className="muted">
          Admin krever Supabase. Sett NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY og SUPABASE_SERVICE_ROLE_KEY (se .env.example).
        </p>
      </div>
    );
  }
  const user = await getAdminUser();
  if (!user) redirect("/admin/logg-inn");

  const tiles = [
    { id: "mobelscout", title: "Møbelscout", text: "Aktive Scouts og treff til godkjenning.", href: "/admin/mobelscout" },
    { id: "leads", title: "Leads", text: "Forespørsler fra skjema, «Be om tilbud» og Møbelscout. Kommer i fase 2–3." },
    { id: "innhold", title: "Innhold", text: "Merker, kategorier, produktkort, prosjekter, løsninger og folk. Kommer i fase 4." },
    { id: "seo", title: "SEO og redirects", text: "Redirects, 404-logg og kvalitetsport-status. Kommer i fase 4." },
    { id: "innstillinger", title: "Innstillinger", text: "Firma- og kontaktdata (site_settings)." },
  ];
  return (
    <div className="stack" style={{ ["--st" as string]: "2rem" }}>
      <div className="stack"><span className="eyebrow">Innlogget som {user.name} ({user.role})</span><h1>Oversikt</h1></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {tiles.map((t) => (
          <section key={t.id} id={t.id} style={{ border: "1px solid var(--line)", borderRadius: 6, padding: 20, background: "#fff" }}>
            <h2 style={{ fontSize: "1.2rem" }}>{"href" in t && t.href ? <a href={t.href}>{t.title}</a> : t.title}</h2>
            <p className="muted" style={{ marginTop: 8 }}>{t.text}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
