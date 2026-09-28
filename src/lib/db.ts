import "server-only";
import postgres from "postgres";
import { env } from "@/lib/env";

/**
 * Direkte Postgres for server-kode (service-nivå, omgår RLS – valider alltid input først).
 * Supabase-pooler i transaksjonsmodus krever prepare: false.
 */
type Sql = postgres.Sql<Record<string, never>>;
const g = globalThis as unknown as { __kcSql?: Sql };

export function getSql(url = env.DATABASE_URL): Sql | null {
  if (!url) return null;
  g.__kcSql ??= postgres(url, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10, onnotice: () => {} });
  return g.__kcSql;
}

export function requireSql(): Sql {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL er ikke satt");
  return sql;
}

/** Hovedklient eller transaksjon – begge kan kjøre spørringer */
export type Queryable = Sql | postgres.TransactionSql<Record<string, never>>;

export type { Sql };
