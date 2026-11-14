// =====================================================================
// GET    /api/admin/clients/[id]  - Dettaglio + ordini
// DELETE /api/admin/clients/[id]  - Cancellazione GDPR (art. 17)
// L'operazione è audited (chi, quando, quale cliente).
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardCsrf } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { decryptField } from "@/lib/security";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await requireAdmin("MANAGER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Cliente non trovato" }, { status: 404 });
  }
  const orders = await db.order.findMany({
    where: { customerId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    customer: {
      id: customer.id,
      email: customer.email,
      name: decryptField(customer.nameEnc),
      phone: decryptField(customer.phoneEnc),
      goal: customer.goal,
      dailyKcal: customer.dailyKcal,
      dailyProteinG: customer.dailyProteinG,
      createdAt: customer.createdAt,
    },
    orders: orders.map((o) => ({
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      status: o.status,
      total: o.total,
      items: JSON.parse(o.items),
    })),
  });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const session = await requireAdmin("MANAGER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { id } = await ctx.params;
  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Cliente non trovato" }, { status: 404 });
  }

  await db.order.deleteMany({ where: { customerId: id } });
  await db.customer.delete({ where: { id } });

  await audit(req, {
    actorId: session.user.id,
    actorName: session.user.username,
    action: "GDPR_DELETE",
    entity: "Customer",
    entityId: id,
    before: { email: customer.email },
  });

  return NextResponse.json({ ok: true });
}
