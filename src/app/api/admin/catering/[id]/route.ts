// =====================================================================
// PATCH /api/admin/catering/[id] - Aggiorna stato richiesta (MANAGER+)
// Stati: NUOVA -> CONTATTATA -> PREVENTIVO -> CONFERMATA / CHIUSA
// =====================================================================
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guardCsrf, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["NUOVA", "CONTATTATA", "PREVENTIVO", "CONFERMATA", "CHIUSA"]),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await requireAdmin("MANAGER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { id } = await ctx.params;
  const existing = await db.cateringRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Richiesta non trovata" }, { status: 404 });
  }

  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  const updated = await db.cateringRequest.update({
    where: { id },
    data: { status: data.status },
  });

  await audit(req, {
    actorId: session.user.id,
    actorName: session.user.username,
    action: "UPDATE",
    entity: "CateringRequest",
    entityId: id,
    before: { status: existing.status },
    after: { status: updated.status },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
