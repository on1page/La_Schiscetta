// =====================================================================
// GET /api/admin/clients - Anagrafica clienti con segmentazione
// (VIP / NUOVO / ATTIVO / INATTIVO) ed export GDPR (spec 4.7).
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { decryptField } from "@/lib/security";

export async function GET() {
  const session = await requireAdmin("MANAGER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }

  const customers = await db.customer.findMany({ orderBy: { createdAt: "desc" } });
  const orders = await db.order.findMany({
    select: { customerId: true, createdAt: true, total: true },
  });

  const clients = customers.map((c) => {
    const own = orders.filter((o) => o.customerId === c.id);
    const totalSpend = own.reduce((s, o) => s + o.total, 0);
    const lastOrder = own
      .map((o) => o.createdAt)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const daysSinceLast = lastOrder
      ? Math.floor((Date.now() - lastOrder.getTime()) / 86400_000)
      : null;
    let segment = "ATTIVO";
    if (own.length === 0) segment = "NUOVO";
    else if (own.length >= 5 || totalSpend >= 150) segment = "VIP";
    else if (daysSinceLast !== null && daysSinceLast > 90) segment = "INATTIVO";
    return {
      id: c.id,
      email: c.email,
      name: decryptField(c.nameEnc),
      phone: decryptField(c.phoneEnc),
      goal: c.goal,
      createdAt: c.createdAt,
      ordersCount: own.length,
      totalSpend: Math.round(totalSpend * 100) / 100,
      lastOrder: lastOrder ?? null,
      segment,
    };
  });

  return NextResponse.json({ clients });
}
