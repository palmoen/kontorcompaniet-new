import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasSupabase, siteUrl } from "@/lib/env";
import { getAdminUser, getAuthClient } from "@/lib/supabase/auth";

async function sendMagicLink(formData: FormData) {
  "use server";
  const email = z.email().safeParse(formData.get("email"));
  if (!email.success) redirect("/admin/logg-inn?feil=epost");
  const supabase = await getAuthClient();
  if (!supabase) redirect("/admin");
  const origin = (await headers()).get("origin") ?? siteUrl;
  // shouldCreateUser: false – kun eksisterende brukere (opprettes av admin)
  await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${origin}/admin/auth/callback`, shouldCreateUser: false },
  });
  // Samme svar uansett om adressen finnes (avslører ikke brukere)
  redirect("/admin/logg-inn?sendt=1");
}

export default async function LoginPage({ searchParams }: PageProps<"/admin/logg-inn">) {
  if (!hasSupabase) redirect("/admin");
  if (await getAdminUser()) redirect("/admin");
  const sp = await searchParams;
  return (
    <div className="stack measure" style={{ maxWidth: 440 }}>
      <h1 style={{ fontSize: "2rem" }}>Logg inn</h1>
      {sp.sendt ? (
        <p role="status">Hvis adressen har tilgang, har vi sendt en innloggingslenke. Sjekk e-posten.</p>
      ) : (
        <form action={sendMagicLink} className="stack">
          <label htmlFor="email" style={{ fontWeight: 600, display: "block" }}>E-post</label>
          <input id="email" name="email" type="email" autoComplete="email" required
            style={{ width: "100%", font: "inherit", padding: ".8em", border: "1.5px solid var(--sand-2)", borderRadius: 3 }} />
          {sp.feil && <p role="alert" style={{ color: "var(--signal-deep)" }}>Skriv inn en gyldig e-postadresse.</p>}
          <button className="btn btn-primary" type="submit">Send innloggingslenke</button>
        </form>
      )}
    </div>
  );
}
