// =====================================================================
// GET /api/admin/clients/[id]/export - Export GDPR del cliente (JSON)
// Accesso MANAGER+, operazione audited.
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { decryptField } from "@/lib/security";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
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

  await audit(req, {
    actorId: session.user.id,
    actorName: session.user.username,
    action: "GDPR_EXPORT",
    entity: "Customer",
    entityId: id,
    after: { email: customer.email },
  });

  const payload = {
    esportatoDa: session.user.username,
    esportatoIl: new Date().toISOString(),
    profilo: {
      email: customer.email,
      nome: decryptField(customer.nameEnc),
      telefono: decryptField(customer.phoneEnc),
      obiettivo: customer.goal,
      kcal: customer.dailyKcal,
      proteineG: customer.dailyProteinG,
    },
    ordini: orders.map((o) => ({
      numero: o.orderNumber,
      data: o.createdAt,
      stato: o.status,
      pagamento: o.paymentStatus,
      totale: o.total,
      righe: JSON.parse(o.items),
      nutrizione: JSON.parse(o.nutritionSummary || "{}"),
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="cliente-${id.slice(0, 8)}.json"`,
    },
  });
}
