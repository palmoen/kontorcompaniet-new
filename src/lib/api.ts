import "server-only";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Pakker en API-rute slik at uventede feil (database, AI, e-post) alltid gir
 * JSON med en forståelig melding – aldri en HTML-feilside som klienten ikke kan lese.
 * Detaljene logges på serveren (Vercel → Logs) med rutenavnet som prefiks.
 */
export function jsonRoute(name: string, handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (e) {
      console.error(`[api:${name}]`, e);
      return NextResponse.json({ error: "Noe gikk galt hos oss. Prøv igjen om litt, eller ring oss." }, { status: 500 });
    }
  };
}
