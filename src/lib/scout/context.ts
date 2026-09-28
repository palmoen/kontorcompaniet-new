import "server-only";
import { getSql } from "@/lib/db";
import { createMailer } from "@/lib/email";
import { env, siteUrl } from "@/lib/env";
import { getAiProvider } from "./ai";
import { scoutStore } from "./store";

/** Alt Scout trenger på serveren. Null når databasen ikke er konfigurert. */
export function scoutContext() {
  const sql = getSql();
  if (!sql) return null;
  return {
    store: scoutStore(sql),
    ai: getAiProvider(),
    mailer: createMailer({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM }),
    siteUrl,
  };
}
