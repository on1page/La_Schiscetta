// =====================================================================
// GET  /api/customer/session - Profilo + obiettivi nutrizionali + ordini
// PUT  /api/customer/session - Aggiorna profilo e obiettivi (Zod validato)
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardCsrf, parseBody } from "@/lib/api";
import { getCustomerSession } from "@/lib/auth";
import { customerProfileSchema } from "@/lib/validation";
import { decryptField, encryptField } from "@/lib/security";

function unauthorized() {
  return NextResponse.json(
    { error: "UNAUTHORIZED", message: "Accesso richiesto" },
    { status: 401 }
  );
}

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return unauthorized();
  const { customer } = session;
  const orders = await db.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    customer: {
      id: customer.id,
      email: customer.email,
      name: decryptField(customer.nameEnc),
      phone: decryptField(customer.phoneEnc),
      dailyKcal: customer.dailyKcal,
      dailyProteinG: customer.dailyProteinG,
      goal: customer.goal,
      createdAt: customer.createdAt,
    },
    orders: orders.map((o) => ({
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      status: o.status,
      paymentStatus: o.paymentStatus,
      fulfillment: o.fulfillment,
      total: o.total,
      items: JSON.parse(o.items),
      nutrition: JSON.parse(o.nutritionSummary || "{}"),
    })),
  });
}

export async function PUT(req: Request) {
  const session = await getCustomerSession();
  if (!session) return unauthorized();
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { data, error } = await parseBody(req, customerProfileSchema);
  if (error) return error;

  await db.customer.update({
    where: { id: session.customer.id },
    data: {
      nameEnc: data.name !== undefined ? encryptField(data.name) : undefined,
      phoneEnc: data.phone !== undefined ? encryptField(data.phone) : undefined,
      dailyKcal: data.dailyKcal,
      dailyProteinG: data.dailyProteinG,
      goal: data.goal,
    },
  });
  return NextResponse.json({ ok: true });
}
