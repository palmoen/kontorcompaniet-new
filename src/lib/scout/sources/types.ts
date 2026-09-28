import type { CategoryKey, Condition } from "../need";

/** Rådata fra en kilde – formatet varierer per kilde */
export type ScoutRawItem = Record<string, unknown>;

/** Normalisert vare slik den lagres i scout.items (KILDEDATA – aldri vist til kunde) */
export type ScoutItemInput = {
  externalId: string;
  category: CategoryKey;
  brand: string | null;
  model: string | null;
  title: string;
  description: string | null;
  quantity: number;
  condition: Condition | null;
  color: string | null;
  material: string | null;
  locationText: string | null;
  municipality: string | null;
  sourcePrice: number | null;
  sourceUrl: string | null;
  images: string[];
};

/**
 * Kilde-adapter. Møbelscout er ikke hardkodet til én kilde: API, feed, partner-feed,
 * manuell import eller (tillatt) strukturert web legges til som nye adaptere.
 * En kilde kan ikke aktiveres i databasen uten godkjent juridisk vurdering.
 */
export interface ScoutSourceAdapter {
  readonly adapter: "mock" | "manual" | "own_stock" | "feed" | "api";
  /** Hent varer for ÉN kategori (kalles én gang per kilde × etterspurt kategori, aldri per Scout) */
  fetchItems(scope: { category: CategoryKey; config: Record<string, unknown> }): Promise<ScoutRawItem[]>;
  normalize(raw: ScoutRawItem): ScoutItemInput | null;
  refreshItem?(externalId: string): Promise<ScoutItemInput | "gone">;
}

/** Stabil nøkkel for duplikatsjekk på tvers av kilder */
export function dedupeKey(i: Pick<ScoutItemInput, "category" | "brand" | "model" | "quantity" | "municipality">): string {
  const n = (s: string | null) => (s ?? "").toLowerCase().replace(/[^a-z0-9æøå]/g, "");
  return [i.category, n(i.brand), n(i.model), i.quantity, n(i.municipality)].join("|");
}
