// =====================================================================
// PATCH /api/admin/orders/[id] - Cambio stato / rimborso (MANAGER+)
// Transizioni valide: RICEVUTO -> IN_PREPARAZIONE -> PRONTO -> CONSEGNATO
// (più ANNULLATO da qualsiasi stato). Rimborso simulato Stripe con
// TODO FatturaPA/SDI per note di credito.
// =====================================================================
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guardCsrf, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/constants";

const schema = z.object({
  status: z.enum(ORDER_STATUSES.map((s) => s.code) as [string, ...string[]]).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  refund: z.boolean().optional(),
});

const FLOW: Record<string, string[]> = {
  RICEVUTO: ["IN_PREPARAZIONE", "ANNULLATO"],
  IN_PREPARAZIONE: ["PRONTO", "ANNULLATO"],
  PRONTO: ["CONSEGNATO", "ANNULLATO"],
  CONSEGNATO: [],
  ANNULLATO: [],
};

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await requireAdmin("MANAGER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { id } = await ctx.params;
  const existing = await db.order.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Ordine non trovato" }, { status: 404 });
  }

  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  const updates: Record<string, string> = {};

  if (data.status && data.status !== existing.status) {
    const allowed = FLOW[existing.status] ?? [];
    if (!allowed.includes(data.status)) {
      return NextResponse.json(
        {
          error: "INVALID_TRANSITION",
          message: `Transizione non consentita: ${existing.status} -> ${data.status}`,
        },
        { status: 409 }
      );
    }
    updates.status = data.status;
  }

  if (data.refund) {
    if (existing.paymentStatus !== "PAGATO") {
      return NextResponse.json(
        { error: "NOT_REFUNDABLE", message: "Solo ordini pagati possono essere rimborsati" },
        { status: 409 }
      );
    }
    // Produzione: stripe.refunds.create({ payment_intent }) + nota di
    // credito FatturaPA via SDI. Sandbox: rimborso simulato.
    updates.paymentStatus = "RIMBORSATO";
    if (!updates.status) updates.status = "ANNULLATO";
  } else if (data.paymentStatus && data.paymentStatus !== existing.paymentStatus) {
    updates.paymentStatus = data.paymentStatus;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const updated = await db.order.update({ where: { id }, data: updates });

  await audit(req, {
    actorId: session.user.id,
    actorName: session.user.username,
    action: data.refund ? "REFUND" : "UPDATE",
    entity: "Order",
    entityId: id,
    before: { status: existing.status, paymentStatus: existing.paymentStatus },
    after: { status: updated.status, paymentStatus: updated.paymentStatus },
  });

  return NextResponse.json({ ok: true, order: { id: updated.id, status: updated.status, paymentStatus: updated.paymentStatus } });
}
