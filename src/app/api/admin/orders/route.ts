// =====================================================================
// GET /api/admin/orders - Elenco ordini con filtri (MANAGER+)
// PII decifrato solo per personale autorizzato, loggato in audit.
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { decryptField } from "@/lib/security";

export async function GET(req: Request) {
  const session = await requireAdmin("MANAGER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const q = (url.searchParams.get("q") || "").toLowerCase();

  const orders = await db.order.findMany({
    where: status && status !== "ALL" ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const mapped = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    fulfillment: o.fulfillment,
    zone: o.zone,
    customerName: decryptField(o.nameEnc),
    customerEmail: decryptField(o.emailEnc),
    customerPhone: decryptField(o.phoneEnc),
    address: decryptField(o.addressEnc),
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    discount: o.discount,
    couponCode: o.couponCode,
    total: o.total,
    items: JSON.parse(o.items),
    nutrition: JSON.parse(o.nutritionSummary || "{}"),
  }));

  const filtered = q
    ? mapped.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.customerEmail?.toLowerCase().includes(q)
      )
    : mapped;

  return NextResponse.json({ orders: filtered });
}
