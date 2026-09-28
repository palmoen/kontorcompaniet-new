/**
 * E-post via Resend (REST). Uten RESEND_API_KEY logges e-posten i stedet for å sendes,
 * slik at flyten virker i utvikling og test. Kanalgrensesnittet gjør SMS/Donna/CRM mulig senere.
 */
export type Email = { to: string; subject: string; text: string; html?: string };
export type Mailer = (mail: Email) => Promise<string | null>;

export function createMailer(opts: { apiKey?: string; from: string }): Mailer {
  return async (mail) => {
    if (!opts.apiKey) {
      console.info(`[e-post ikke sendt – RESEND_API_KEY mangler] til=${mail.to} emne="${mail.subject}"`);
      return null;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: opts.from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return ((await res.json()) as { id?: string }).id ?? null;
  };
}

export function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
