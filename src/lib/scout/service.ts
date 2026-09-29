/**
 * Møbelscout – orkestrering. Én tick = én henting per (kilde × etterspurt kategori),
 * deretter matching av KUN nye/endrede varer mot alle aktive Scouts.
 */
import { escapeHtml, type Mailer } from "@/lib/email";
import type { AiProvider } from "./ai/provider";
import { matchItem, needsSemanticCheck, type MatchResult } from "./matching";
import { adapters } from "./sources";
import type { ScoutStore } from "./store";

const MAX_SEMANTIC_CHECKS_PER_RUN = 10;

export async function runMatching(store: ScoutStore, scope: { requestId?: string; itemIds?: string[] }, ai?: AiProvider | null) {
  if (scope.itemIds && scope.itemIds.length === 0) return { created: 0 };
  const [requests, rules] = await Promise.all([store.activeRequests({ requestId: scope.requestId }), store.getPricingRules()]);
  let created = 0;
  let semanticBudget = MAX_SEMANTIC_CHECKS_PER_RUN;
  for (const req of requests) {
    const results: MatchResult[] = [];
    for (const [idx, line] of req.need.items.entries()) {
      const items = await store.inventory({ itemIds: scope.itemIds, categories: [line.category] });
      // Komplettering: helst samme merke som varen i treffet, deretter kundens ønskede merker
      const completionCache = new Map<string, Awaited<ReturnType<typeof store.completionProduct>>>();
      const completionFor = async (brand: string | null) => {
        const key = brand ?? "";
        if (!completionCache.has(key)) completionCache.set(key, await store.completionProduct(line.category, [...(brand ? [brand] : []), ...line.brands]));
        return completionCache.get(key)!;
      };
      for (const item of items) {
        const completion = await completionFor(item.brand);
        let semanticBonus = 0;
        if (ai?.judgeEquivalent && semanticBudget > 0 && needsSemanticCheck(line, item)) {
          semanticBudget--;
          try {
            const j = await ai.judgeEquivalent({ need: req.need, itemTitle: item.title });
            semanticBonus = j.equivalent ? Math.round(Math.max(0, Math.min(1, j.confidence)) * 15) : 0;
            await store.logAiCall({ purpose: "scout_semantic", ok: true, model: j.usage.model, inputTokens: j.usage.inputTokens, outputTokens: j.usage.outputTokens, latencyMs: j.usage.latencyMs, requestId: req.id });
          } catch (e) {
            await store.logAiCall({ purpose: "scout_semantic", ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "ukjent", requestId: req.id });
          }
        }
        const m = matchItem({ need: req.need, line, lineNo: idx + 1, item, rules, completionProduct: completion, semanticBonus });
        if (m) results.push(m);
      }
    }
    created += await store.saveMatches(req.id, results);
  }
  return { created };
}

export type TickSummary = { sources: number; fetched: number; changed: number; gone: number; matches: number; notified: number };

export async function tick(deps: { store: ScoutStore; ai?: AiProvider | null; mailer: Mailer; siteUrl: string; allowTestSources?: boolean }): Promise<TickSummary> {
  const { store } = deps;
  const summary: TickSummary = { sources: 0, fetched: 0, changed: 0, gone: 0, matches: 0, notified: 0 };
  const demanded = await store.demandedCategories();
  const changed: string[] = [];
  const gone: string[] = [];

  for (const src of await store.dueSources({ allowTest: deps.allowTestSources })) {
    const adapter = adapters[src.adapter as keyof typeof adapters];
    const categories = (src.categories.length ? src.categories.filter((c) => demanded.includes(c)) : demanded) as never[];
    const run = { categories: categories as string[], fetched: 0, created: 0, updated: 0, gone: 0, ok: true as boolean, error: undefined as string | undefined };
    summary.sources++;
    try {
      if (!adapter) throw new Error(`Ingen adapter for «${src.adapter}»`);
      for (const category of categories) {
        const raw = await adapter.fetchItems({ category, config: src.config ?? {}, ai: deps.ai });
        const items = raw.map((r) => adapter.normalize(r)).filter((x): x is NonNullable<typeof x> => x !== null);
        run.fetched += items.length;
        const res = await store.upsertItems(src.id, [category], items);
        run.created += res.created;
        run.updated += res.changed.length - res.created;
        run.gone += res.gone.length;
        changed.push(...res.changed);
        gone.push(...res.gone);
      }
    } catch (e) {
      run.ok = false;
      run.error = e instanceof Error ? e.message.slice(0, 500) : "ukjent feil";
    }
    summary.fetched += run.fetched;
    await store.finishSourceRun(src.id, run, src.interval_minutes);
  }

  await store.markUnavailable(gone);
  summary.gone = gone.length;
  summary.changed = changed.length;
  summary.matches = (await runMatching(store, { itemIds: changed }, deps.ai)).created;
  summary.notified = await notifyAll(deps);
  return summary;
}

/** Samlet varsel: maks én e-post per Scout per døgn, med alle godkjente treff */
export async function notifyRequest(deps: { store: ScoutStore; mailer: Mailer; siteUrl: string }, requestId: string): Promise<boolean> {
  const p = await deps.store.pendingNotification(requestId);
  if (!p || p.recent || p.matches.length === 0) return false;
  const url = `${deps.siteUrl}/mobelscout/resultat/${p.token}`;
  const count = p.matches.length;
  const text = `Hei ${p.name},\n\nMøbelscout har funnet ${count === 1 ? "et forslag" : `${count} forslag`} som kan passe behovet deres.\n\nSe forslagene: ${url}\n\nVi bekrefter alltid tilgjengelighet, stand og levering før dere får et tilbud.\n\nVennlig hilsen\nKontorcompaniet`;
  const html = `<p>Hei ${escapeHtml(p.name)},</p><p>Møbelscout har funnet <strong>${count === 1 ? "et forslag" : `${count} forslag`}</strong> som kan passe behovet deres.</p><p><a href="${url}">Se forslagene</a></p><p>Vi bekrefter alltid tilgjengelighet, stand og levering før dere får et tilbud.</p><p>Vennlig hilsen<br>Kontorcompaniet</p>`;
  const id = await deps.mailer({ to: p.email, subject: "Møbelscout har funnet noe", text, html });
  await deps.store.recordNotification(requestId, p.matches, id);
  return true;
}

export async function notifyAll(deps: { store: ScoutStore; mailer: Mailer; siteUrl: string }): Promise<number> {
  let n = 0;
  for (const id of await deps.store.requestsWithApprovedMatches()) if (await notifyRequest(deps, id)) n++;
  return n;
}
