/**
 * Møbelscout – lagring (Postgres). All tilgang går via disse funksjonene.
 * KILDEDATA (scout.items: kilde-URL, kildepris, kilde) skilles fra
 * KUNDEPRESENTASJON (scout.item_presentation + kundepris). Kunden får kun sistnevnte.
 */
import type { Queryable, Sql } from "@/lib/db";
import type { InventoryItem, MatchResult } from "./matching";
import type { ScoutNeed } from "./need";
import type { PricingRule } from "./pricing";
import { dedupeKey, type ScoutItemInput } from "./sources/types";

export type Attribution = Partial<Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term" | "referrer" | "landing_page" | "gclid", string>>;

export type CreateScoutInput = {
  prompt: string;
  inputMode: "text" | "voice";
  transcript?: string | null;
  need: ScoutNeed;
  contact: { company: string; name: string; email: string; phone?: string | null };
  consent: { contact: boolean; textVersion: string };
  attribution: Attribution;
  sourcePath: string;
};

export type EventName =
  | "cta_click" | "contact_started" | "contact_submitted" | "scout_started" | "scout_parsed" | "scout_confirmed" | "scout_activated" | "match_found" | "match_approved"
  | "match_presented" | "match_viewed" | "match_interested" | "match_rejected" | "opportunity_qualified"
  | "scout_won" | "scout_lost" | "order_value_recorded";

export function scoutStore(sql: Sql) {
  const recordEvent = async (
    name: EventName,
    ids: { requestId?: string | null; matchId?: string | null; leadId?: string | null },
    props: Record<string, unknown> = {},
    path: string | null = null,
    tx: Queryable = sql,
  ) => {
    await tx`insert into ops.analytics_events (name, scout_request_id, scout_match_id, lead_id, path, props)
             values (${name}, ${ids.requestId ?? null}, ${ids.matchId ?? null}, ${ids.leadId ?? null}, ${path}, ${tx.json(props as never)})`;
  };

  const domainEvent = async (type: string, aggregate: "lead" | "scout_request" | "scout_match" | "opportunity", id: string, payload: Record<string, unknown>, tx: Queryable = sql) => {
    await tx`insert into ops.domain_events (type, aggregate, aggregate_id, payload) values (${type}, ${aggregate}, ${id}, ${tx.json(payload as never)})`;
  };

  return {
    recordEvent,

    async logAiCall(e: { purpose: string; ok: boolean; model?: string; provider?: string; inputTokens?: number; outputTokens?: number; latencyMs?: number; error?: string; requestId?: string }) {
      await sql`insert into ops.ai_calls (purpose, provider, model, input_tokens, output_tokens, latency_ms, ok, error, scout_request_id)
                values (${e.purpose}, ${e.provider ?? "openai"}, ${e.model ?? "ukjent"}, ${e.inputTokens ?? null}, ${e.outputTokens ?? null},
                        ${e.latencyMs ?? null}, ${e.ok}, ${e.error ?? null}, ${e.requestId ?? null})`;
    },

    /** Oppretter organisasjon, kontakt, lead, Scout, linjer, revisjon og hendelser i ÉN transaksjon */
    async createScout(input: CreateScoutInput): Promise<{ id: string; token: string; leadId: string }> {
      return sql.begin(async (tx) => {
        const [org] = await tx<{ id: string }[]>`insert into crm.organizations (name) values (${input.contact.company}) returning id`;
        const [contact] = await tx<{ id: string }[]>`
          insert into crm.contacts (organization_id, name, email, phone, consent)
          values (${org.id}, ${input.contact.name}, ${input.contact.email}, ${input.contact.phone ?? null},
                  ${tx.json({ contact: input.consent.contact, text_version: input.consent.textVersion, at: new Date().toISOString() })})
          returning id`;
        const [lead] = await tx<{ id: string }[]>`
          insert into crm.leads (kind, priority, organization_id, contact_id, message, payload, attribution, source_path)
          values ('scout', 'normal', ${org.id}, ${contact.id}, ${input.prompt}, ${tx.json({ need: input.need } as never)},
                  ${tx.json(input.attribution)}, ${input.sourcePath})
          returning id`;
        const [req] = await tx<{ id: string; result_token: string }[]>`
          insert into scout.requests (lead_id, contact_id, organization_id, original_prompt, input_mode, transcript, need, status,
                                      activated_at, expires_at, attribution)
          values (${lead.id}, ${contact.id}, ${org.id}, ${input.prompt}, ${input.inputMode}, ${input.transcript ?? null},
                  ${tx.json(input.need as never)}, 'active', now(),
                  now() + make_interval(days => coalesce((select (value)::int from scout.settings where key = 'request_ttl_days'), 90)),
                  ${tx.json(input.attribution)})
          returning id, result_token`;
        let lineNo = 0;
        for (const item of input.need.items) {
          lineNo++;
          await tx`
            insert into scout.request_lines (request_id, line_no, category, quantity_target, quantity_min, brands, models,
                                             max_unit_price_ex_vat, conditions, locations, accept_alternatives, hard, prefs)
            values (${req.id}, ${lineNo}, ${item.category}, ${item.quantity.target}, ${item.quantity.minimum},
                    ${tx.array(item.brands)}, ${tx.array(item.models)}, ${item.max_unit_price_ex_vat}, ${tx.array(item.condition)},
                    ${tx.array(input.need.locations)}, ${item.accept_alternatives},
                    ${tx.json(input.need.hard_constraints)}, ${tx.json(input.need.preferences)})`;
        }
        await tx`insert into scout.request_revisions (request_id, need, changed_by) values (${req.id}, ${tx.json(input.need as never)}, 'customer')`;
        await recordEvent("scout_confirmed", { requestId: req.id, leadId: lead.id }, {}, input.sourcePath, tx);
        await recordEvent("scout_activated", { requestId: req.id, leadId: lead.id }, { utm_source: input.attribution.utm_source ?? null }, input.sourcePath, tx);
        await domainEvent("scout.activated", "scout_request", req.id, { lead_id: lead.id }, tx);
        return { id: req.id, token: req.result_token, leadId: lead.id };
      });
    },

    async getPricingRules(): Promise<PricingRule[]> {
      const rows = await sql<{ scope: PricingRule["scope"]; scope_value: string | null; markup_pct: string; min_markup_nok: string; rounding: PricingRule["rounding"] }[]>`
        select scope, scope_value, markup_pct, min_markup_nok, rounding from scout.pricing_rules where is_active`;
      return rows.map((r) => ({ scope: r.scope, scopeValue: r.scope_value, markupPct: Number(r.markup_pct), minMarkupNok: Number(r.min_markup_nok), rounding: r.rounding }));
    },

    /** Aktive Scouts med behov (for matching) */
    async activeRequests(filter?: { requestId?: string }) {
      return sql<{ id: string; need: ScoutNeed }[]>`
        select id, need from scout.requests
        where status in ('active', 'matched') and (expires_at is null or expires_at > now())
          ${filter?.requestId ? sql`and id = ${filter.requestId}` : sql``}`;
    },

    /** Kategorier som faktisk etterspørres av aktive Scouts (styrer innhenting) */
    async demandedCategories(): Promise<string[]> {
      const rows = await sql<{ category: string }[]>`
        select distinct l.category from scout.request_lines l join scout.requests r on r.id = l.request_id
        where r.status in ('active', 'matched') and (r.expires_at is null or r.expires_at > now())`;
      return rows.map((r) => r.category);
    },

    async inventory(filter: { itemIds?: string[]; categories?: string[] }): Promise<(InventoryItem & { title: string })[]> {
      const rows = await sql<{ id: string; key: string; category: string; brand: string | null; model: string | null; quantity: number;
        condition: InventoryItem["condition"]; municipality: string | null; location_text: string | null; source_price: string | null;
        availability: InventoryItem["availability"]; title_raw: string | null }[]>`
        select i.id, s.key, i.category, i.brand, i.model, i.quantity, i.condition, i.municipality, i.location_text, i.source_price,
               i.availability, i.title_raw
        from scout.items i join scout.sources s on s.id = i.source_id
        where i.availability = 'available'
          ${filter.itemIds ? sql`and i.id = any(${sql.array(filter.itemIds)}::uuid[])` : sql``}
          ${filter.categories ? sql`and i.category = any(${sql.array(filter.categories)})` : sql``}`;
      return rows.map((r) => ({
        id: r.id, sourceKey: r.key, category: r.category, brand: r.brand, model: r.model, quantity: r.quantity, condition: r.condition,
        municipality: r.municipality, locationText: r.location_text, sourcePrice: r.source_price == null ? null : Number(r.source_price),
        availability: r.availability, title: r.title_raw ?? [r.brand, r.model].filter(Boolean).join(" "),
      }));
    },

    /** Nytt produkt for komplettering: publisert katalogprodukt i samme kategori. Merkene prioriteres i rekkefølgen de er gitt. */
    async completionProduct(scoutCategory: string, brands: string[]): Promise<{ slug: string; name: string } | null> {
      const map: Record<string, string> = {
        office_chair: "kontorstoler", meeting_chair: "moteromsstoler", canteen_chair: "kantinestoler", desk: "skrivebord",
        meeting_table: "motebord", storage: "oppbevaring", sofa_lounge: "sofa-og-lounge", acoustics: "akustikk",
      };
      const cat = map[scoutCategory];
      if (!cat) return null;
      const [row] = await sql<{ slug: string; name: string }[]>`
        select p.slug, p.name from content.products p
        join content.categories c on c.id = p.primary_category_id join content.brands b on b.id = p.brand_id
        where p.status = 'published' and c.slug = ${cat}
        order by array_position(array(select lower(x) from unnest(${sql.array(brands)}::text[]) x), lower(b.name)) nulls last, p.featured desc, p.sort
        limit 1`;
      return row ?? null;
    },

    /** Lagrer treff. Rører aldri treff som allerede er behandlet (godkjent/vist/avvist). */
    async saveMatches(requestId: string, results: MatchResult[]): Promise<number> {
      let created = 0;
      for (const m of results) {
        const [row] = await sql<{ id: string; inserted: boolean }[]>`
          insert into scout.matches (request_id, request_line_no, item_id, score, score_breakdown, explanation, covered_qty, completion,
                                     source_price_snapshot, customer_price_ex_vat, margin_nok)
          values (${requestId}, ${m.lineNo}, ${m.itemId}, ${m.score}, ${sql.json(m.breakdown)}, ${m.explanation}, ${m.coveredQty},
                  ${m.completion ? sql.json(m.completion) : null}, ${m.sourcePrice}, ${m.customerPrice}, ${m.margin})
          on conflict (request_id, request_line_no, item_id) do update
            set score = excluded.score, score_breakdown = excluded.score_breakdown, explanation = excluded.explanation,
                covered_qty = excluded.covered_qty, completion = excluded.completion, source_price_snapshot = excluded.source_price_snapshot,
                customer_price_ex_vat = excluded.customer_price_ex_vat, margin_nok = excluded.margin_nok
            where scout.matches.status = 'candidate'
          returning id, (xmax = 0) as inserted`;
        if (row?.inserted) {
          created++;
          await recordEvent("match_found", { requestId, matchId: row.id }, { score: m.score });
        }
      }
      await sql`update scout.requests set last_matched_at = now(),
                  status = case when status = 'active' and exists (select 1 from scout.matches where request_id = ${requestId}) then 'matched' else status end
                where id = ${requestId}`;
      return created;
    },

    /** Varer som ikke lenger finnes: markér og gjør berørte treff utilgjengelige */
    async markUnavailable(itemIds: string[]) {
      if (!itemIds.length) return;
      await sql`update scout.items set availability = 'gone' where id = any(${sql.array(itemIds)}::uuid[])`;
      await sql`update scout.matches set status = 'unavailable' where item_id = any(${sql.array(itemIds)}::uuid[]) and status in ('candidate', 'approved', 'presented')`;
    },

    // ------------------------------------------------------------------ kilder

    async dueSources() {
      return sql<{ id: string; key: string; adapter: string; config: Record<string, unknown>; categories: string[]; interval_minutes: number }[]>`
        select id, key, adapter, config, categories, interval_minutes from scout.sources
        where is_active and legal_status = 'approved' and next_run_at <= now() order by next_run_at`;
    },

    /** Upsert av normaliserte varer + historikk. Returnerer id-er for nye/endrede og forsvunne varer. */
    async upsertItems(sourceId: string, categories: string[], items: ScoutItemInput[]) {
      const changed: string[] = [];
      let created = 0;
      const seen: string[] = [];
      for (const i of items) {
        seen.push(i.externalId);
        const [prev] = await sql<{ quantity: number; source_price: string | null; availability: string }[]>`
          select quantity, source_price, availability from scout.items where source_id = ${sourceId} and external_id = ${i.externalId}`;
        const [row] = await sql<{ id: string; inserted: boolean; changed?: boolean }[]>`
          insert into scout.items (source_id, external_id, dedupe_key, category, brand, model, title_raw, description_raw, quantity,
                                   condition, color, material, location_text, municipality, source_price, source_url, source_images)
          values (${sourceId}, ${i.externalId}, ${dedupeKey(i)}, ${i.category}, ${i.brand}, ${i.model}, ${i.title}, ${i.description},
                  ${i.quantity}, ${i.condition}, ${i.color}, ${i.material}, ${i.locationText}, ${i.municipality}, ${i.sourcePrice},
                  ${i.sourceUrl}, ${sql.json(i.images)})
          on conflict (source_id, external_id) do update
            set quantity = excluded.quantity, source_price = excluded.source_price, availability = 'available',
                last_seen_at = now(), missed_runs = 0, title_raw = excluded.title_raw
          returning id, (xmax = 0) as inserted`;
        row.changed = Boolean(prev) && (prev.quantity !== i.quantity || Number(prev.source_price) !== Number(i.sourcePrice) || prev.availability !== "available");
        if (row.inserted) created++;
        if (row.inserted || row.changed) {
          changed.push(row.id);
          await sql`insert into scout.item_observations (item_id, quantity, source_price, availability)
                    values (${row.id}, ${i.quantity}, ${i.sourcePrice}, 'available')`;
        }
      }
      // Varer i de hentede kategoriene som ikke ble sett: tell opp, og marker som borte etter N kjøringer
      const missing = await sql<{ id: string }[]>`
        update scout.items set missed_runs = missed_runs + 1
        where source_id = ${sourceId} and category = any(${sql.array(categories)}) and availability = 'available'
          and not (external_id = any(${sql.array(seen.length ? seen : ["__ingen__"])}))
        returning id, missed_runs`;
      const [limit] = await sql<{ n: number }[]>`select coalesce((select (value)::int from scout.settings where key = 'gone_after_missed_runs'), 3) as n`;
      const gone = (await sql<{ id: string }[]>`
        select id from scout.items where id = any(${sql.array(missing.map((m) => m.id).length ? missing.map((m) => m.id) : ["00000000-0000-0000-0000-000000000000"])}::uuid[])
          and missed_runs >= ${limit.n}`).map((r) => r.id);
      return { changed, created, gone };
    },

    async finishSourceRun(sourceId: string, run: { categories: string[]; fetched: number; created: number; updated: number; gone: number; ok: boolean; error?: string }, intervalMinutes: number) {
      await sql`insert into scout.source_runs (source_id, finished_at, categories, fetched, new_items, updated_items, gone_items, ok, error)
                values (${sourceId}, now(), ${sql.array(run.categories)}, ${run.fetched}, ${run.created}, ${run.updated}, ${run.gone}, ${run.ok}, ${run.error ?? null})`;
      await sql`update scout.sources set last_run_at = now(), next_run_at = now() + make_interval(mins => ${intervalMinutes}) where id = ${sourceId}`;
    },

    // ------------------------------------------------------------------ kunde

    /** Kundens resultatside: KUN presentasjonsdata (scout.result_v) */
    async resultByToken(token: string) {
      const [req] = await sql<{ id: string; status: string; need: ScoutNeed; original_prompt: string; created_at: Date }[]>`
        select id, status, need, original_prompt, created_at from scout.requests where result_token = ${token}`;
      if (!req) return null;
      const matches = await sql<{ match_id: string; request_line_no: number; score: number; explanation: string; covered_qty: number;
        completion: { missing: number; text: string } | null; customer_price_ex_vat: string | null; match_status: string;
        display_name: string; display_description: string | null; quantity: number; condition: string | null; color: string | null;
        municipality: string | null }[]>`
        select match_id, request_line_no, score, explanation, covered_qty, completion, customer_price_ex_vat, match_status,
               display_name, display_description, quantity, condition, color, municipality
        from scout.result_v where result_token = ${token} order by score desc`;
      return { request: req, matches };
    },

    /** «Dette er interessant» → høyprioritert lead med intern sourcing-info. Idempotent. */
    async markInterested(token: string, matchId: string) {
      return sql.begin(async (tx) => {
        const [m] = await tx<{ request_id: string; status: string; lead_id: string | null; contact_id: string | null; organization_id: string | null;
          score: number; customer_price_ex_vat: string | null; source_price_snapshot: string | null; margin_nok: string | null;
          covered_qty: number; title_raw: string | null; source_url: string | null; source_key: string; display_name: string }[]>`
          select m.request_id, m.status, r.lead_id, r.contact_id, r.organization_id, m.score, m.customer_price_ex_vat,
                 m.source_price_snapshot, m.margin_nok, m.covered_qty, i.title_raw, i.source_url, s.key as source_key, ip.display_name
          from scout.matches m join scout.requests r on r.id = m.request_id
          join scout.items i on i.id = m.item_id join scout.sources s on s.id = i.source_id
          join scout.item_presentation ip on ip.item_id = i.id
          where m.id = ${matchId} and r.result_token = ${token} and m.status in ('approved', 'presented', 'interested')
          for update of m`;
        if (!m) return null;
        if (m.status === "interested") return { alreadyInterested: true, requestId: m.request_id };
        await tx`update scout.matches set status = 'interested', updated_at = now() where id = ${matchId}`;
        const [lead] = await tx<{ id: string }[]>`
          insert into crm.leads (kind, priority, organization_id, contact_id, message, payload, source_path)
          values ('scout_interest', 'high', ${m.organization_id}, ${m.contact_id}, ${`Interessert i ${m.display_name}`},
                  ${tx.json({
                    scout_request_id: m.request_id, match_id: matchId, product: m.display_name, quantity: m.covered_qty, score: m.score,
                    customer_price_ex_vat: m.customer_price_ex_vat, source_key: m.source_key, source_price: m.source_price_snapshot,
                    margin_nok: m.margin_nok, source_url: m.source_url, source_title: m.title_raw,
                  } as never)}, '/mobelscout/resultat')
          returning id`;
        await recordEvent("match_interested", { requestId: m.request_id, matchId, leadId: lead.id }, {}, null, tx);
        await domainEvent("scout.match_interested", "scout_match", matchId, { lead_id: lead.id, priority: "high" }, tx);
        return { alreadyInterested: false, requestId: m.request_id, leadId: lead.id, displayName: m.display_name };
      });
    },

    async markRejected(token: string, matchId: string, feedback: string | null) {
      const rows = await sql<{ request_id: string }[]>`
        update scout.matches m set status = 'rejected', customer_feedback = ${feedback}, updated_at = now()
        from scout.requests r where r.id = m.request_id and r.result_token = ${token} and m.id = ${matchId}
          and m.status in ('approved', 'presented')
        returning m.request_id`;
      if (rows[0]) await recordEvent("match_rejected", { requestId: rows[0].request_id, matchId }, { feedback: feedback ? "ja" : "nei" });
      return rows.length > 0;
    },

    async setStatusByToken(token: string, status: "paused" | "active" | "lost") {
      await sql`update scout.requests set status = ${status}, closed_reason = ${status === "lost" ? "Avsluttet av kunden" : null}
                where result_token = ${token} and status in ('active', 'matched', 'paused')`;
    },

    // ------------------------------------------------------------------ admin

    async adminRequests() {
      return sql<{ id: string; created_at: Date; status: string; company: string | null; contact: string | null; email: string | null;
        original_prompt: string; last_matched_at: Date | null; matches: number; to_review: number; best: number | null }[]>`
        select r.id, r.created_at, r.status, o.name as company, c.name as contact, c.email, r.original_prompt, r.last_matched_at,
               count(m.id)::int as matches, count(m.id) filter (where m.status = 'candidate')::int as to_review, max(m.score) as best
        from scout.requests r left join crm.organizations o on o.id = r.organization_id left join crm.contacts c on c.id = r.contact_id
        left join scout.matches m on m.request_id = r.id and m.status <> 'unavailable'
        group by r.id, o.name, c.name, c.email order by r.created_at desc limit 200`;
    },

    async adminRequest(id: string) {
      const [req] = await sql<{ id: string; created_at: Date; status: string; need: ScoutNeed; original_prompt: string; result_token: string;
        company: string | null; contact: string | null; email: string | null; phone: string | null; attribution: Attribution }[]>`
        select r.id, r.created_at, r.status, r.need, r.original_prompt, r.result_token, o.name as company, c.name as contact, c.email, c.phone, r.attribution
        from scout.requests r left join crm.organizations o on o.id = r.organization_id left join crm.contacts c on c.id = r.contact_id
        where r.id = ${id}`;
      if (!req) return null;
      const matches = await sql<{ id: string; status: string; score: number; explanation: string; covered_qty: number; request_line_no: number;
        customer_price_ex_vat: string | null; source_price_snapshot: string | null; margin_nok: string | null; item_id: string;
        title_raw: string | null; quantity: number; condition: string | null; municipality: string | null; source_url: string | null;
        source_name: string; display_name: string | null }[]>`
        select m.id, m.status, m.score, m.explanation, m.covered_qty, m.request_line_no, m.customer_price_ex_vat, m.source_price_snapshot,
               m.margin_nok, i.id as item_id, i.title_raw, i.quantity, i.condition, i.municipality, i.source_url, s.name as source_name,
               ip.display_name
        from scout.matches m join scout.items i on i.id = m.item_id join scout.sources s on s.id = i.source_id
        left join scout.item_presentation ip on ip.item_id = i.id
        where m.request_id = ${id} order by m.score desc`;
      return { request: req, matches };
    },

    /** Godkjenn treff for visning. Lager kundepresentasjon (uten kilde) hvis den mangler. */
    async approveMatch(matchId: string, reviewer: string | null, opts: { displayName?: string; customerPrice?: number } = {}) {
      return sql.begin(async (tx) => {
        const [m] = await tx<{ request_id: string; item_id: string; source_price_snapshot: string | null; brand: string | null; model: string | null; title_raw: string | null }[]>`
          select m.request_id, m.item_id, m.source_price_snapshot, i.brand, i.model, i.title_raw
          from scout.matches m join scout.items i on i.id = m.item_id where m.id = ${matchId} and m.status in ('candidate', 'approved')`;
        if (!m) return false;
        const name = opts.displayName?.trim() || [m.brand, m.model].filter(Boolean).join(" ") || m.title_raw || "Kontormøbel";
        await tx`insert into scout.item_presentation (item_id, display_name, approved_by, approved_at)
                 values (${m.item_id}, ${name}, ${reviewer}, now())
                 on conflict (item_id) do update set display_name = excluded.display_name, approved_at = coalesce(scout.item_presentation.approved_at, now())`;
        const price = opts.customerPrice ?? null;
        await tx`update scout.matches set status = 'approved', reviewed_by = ${reviewer}, reviewed_at = now(),
                   customer_price_ex_vat = coalesce(${price}::numeric, customer_price_ex_vat),
                   margin_nok = case when ${price}::numeric is not null and source_price_snapshot is not null
                                     then ${price}::numeric - source_price_snapshot else margin_nok end
                 where id = ${matchId}`;
        await recordEvent("match_approved", { requestId: m.request_id, matchId }, {}, null, tx);
        return true;
      });
    },

    async rejectMatchAdmin(matchId: string, reviewer: string | null) {
      await sql`update scout.matches set status = 'rejected', reviewed_by = ${reviewer}, reviewed_at = now() where id = ${matchId} and status in ('candidate', 'approved')`;
    },

    async setRequestStatusAdmin(id: string, status: "active" | "paused" | "won" | "lost" | "expired", reason?: string) {
      await sql`update scout.requests set status = ${status}, closed_reason = ${reason ?? null} where id = ${id}`;
      if (status === "won" || status === "lost") await recordEvent(status === "won" ? "scout_won" : "scout_lost", { requestId: id });
    },

    // ------------------------------------------------------------------ varsling

    /** Godkjente treff som ikke er vist + om Scouten er innenfor varslingsgrensen (maks én per døgn) */
    async pendingNotification(requestId: string) {
      const [r] = await sql<{ email: string; name: string; token: string; matches: string[]; recent: boolean }[]>`
        select c.email, c.name, r.result_token as token,
               array(select m.id::text from scout.matches m where m.request_id = r.id and m.status = 'approved') as matches,
               exists (select 1 from scout.notifications n where n.request_id = r.id and n.sent_at > now() - interval '1 day') as recent
        from scout.requests r join crm.contacts c on c.id = r.contact_id
        where r.id = ${requestId} and r.status in ('active', 'matched')`;
      return r ?? null;
    },

    async recordNotification(requestId: string, matchIds: string[], providerId: string | null) {
      await sql.begin(async (tx) => {
        await tx`insert into scout.notifications (request_id, match_ids, sent_at, provider_id) values (${requestId}, ${tx.array(matchIds)}::uuid[], now(), ${providerId})`;
        await tx`update scout.matches set status = 'presented' where id = any(${tx.array(matchIds)}::uuid[]) and status = 'approved'`;
        for (const id of matchIds) await recordEvent("match_presented", { requestId, matchId: id }, {}, null, tx);
      });
    },

    async requestsWithApprovedMatches(): Promise<string[]> {
      return (await sql<{ request_id: string }[]>`select distinct request_id from scout.matches where status = 'approved'`).map((r) => r.request_id);
    },
  };
}

export type ScoutStore = ReturnType<typeof scoutStore>;
