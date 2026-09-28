"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { scoutContext } from "@/lib/scout/context";
import { notifyRequest, tick } from "@/lib/scout/service";
import { requireAdmin } from "@/lib/supabase/auth";

function ctxOrThrow() {
  const ctx = scoutContext();
  if (!ctx) throw new Error("DATABASE_URL er ikke satt");
  return ctx;
}

export async function approveMatch(formData: FormData) {
  const user = await requireAdmin(["sales"]);
  const ctx = ctxOrThrow();
  const matchId = z.uuid().parse(formData.get("matchId"));
  const requestId = z.uuid().parse(formData.get("requestId"));
  const displayName = z.string().trim().max(120).optional().parse(formData.get("displayName") || undefined);
  const priceRaw = formData.get("customerPrice");
  const customerPrice = priceRaw ? z.coerce.number().positive().max(1_000_000).parse(String(priceRaw).replace(/\s/g, "").replace(",", ".")) : undefined;
  await ctx.store.approveMatch(matchId, user.id, { displayName, customerPrice });
  if (formData.get("notify") === "on") await notifyRequest(ctx, requestId);
  revalidatePath(`/admin/mobelscout/${requestId}`);
}

export async function rejectMatch(formData: FormData) {
  const user = await requireAdmin(["sales"]);
  const requestId = z.uuid().parse(formData.get("requestId"));
  await ctxOrThrow().store.rejectMatchAdmin(z.uuid().parse(formData.get("matchId")), user.id);
  revalidatePath(`/admin/mobelscout/${requestId}`);
}

export async function setRequestStatus(formData: FormData) {
  await requireAdmin(["sales"]);
  const id = z.uuid().parse(formData.get("requestId"));
  const status = z.enum(["active", "paused", "won", "lost", "expired"]).parse(formData.get("status"));
  await ctxOrThrow().store.setRequestStatusAdmin(id, status, z.string().max(200).optional().parse(formData.get("reason") || undefined));
  revalidatePath(`/admin/mobelscout/${id}`);
  revalidatePath("/admin/mobelscout");
}

export async function notifyNow(formData: FormData) {
  await requireAdmin(["sales"]);
  const id = z.uuid().parse(formData.get("requestId"));
  await notifyRequest(ctxOrThrow(), id);
  revalidatePath(`/admin/mobelscout/${id}`);
}

export async function runTickNow() {
  await requireAdmin(["sales"]);
  await tick(ctxOrThrow());
  revalidatePath("/admin/mobelscout");
}
