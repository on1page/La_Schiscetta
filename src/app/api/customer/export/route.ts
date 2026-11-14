// =====================================================================
// POST /api/customer/export - Diritto alla portabilità dei dati
// (GDPR art. 15 e 20): export JSON completo dei dati del cliente,
// con PII decifrato solo per l'interessato stesso.
// =====================================================================
import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/auth";
import { decryptField } from "@/lib/security";
import { db } from "@/lib/db";

export async function POST() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Accesso richiesto" },
      { status: 401 }
    );
  }
  const { customer } = session;
  const orders = await db.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
  });

  const payload = {
    esportatoIl: new Date().toISOString(),
    nota: "Esportazione ai sensi degli artt. 15 e 20 GDPR (diritto di accesso e portabilità).",
    profilo: {
      email: customer.email,
      nome: decryptField(customer.nameEnc),
      telefono: decryptField(customer.phoneEnc),
      obiettivo: customer.goal,
      kcalGiornaliere: customer.dailyKcal,
      proteineGiornaliereG: customer.dailyProteinG,
      registrazione: customer.createdAt,
    },
    ordini: orders.map((o) => ({
      numero: o.orderNumber,
      data: o.createdAt,
      stato: o.status,
      pagamento: o.paymentStatus,
      totale: o.total,
      nutrizione: JSON.parse(o.nutritionSummary || "{}"),
      righe: JSON.parse(o.items),
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="dati-la-schiscetta-${customer.id.slice(0, 8)}.json"`,
    },
  });
}
