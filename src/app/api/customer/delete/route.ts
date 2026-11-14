// =====================================================================
// POST /api/customer/delete - Diritto alla cancellazione (GDPR art. 17)
// Elimina cliente e ordini associati. Il consenso privacy resta
// anonimizzato (nessun PII) per obblighi fiscali di conservazione
// differenziata (fatturazione: 10 anni, solo dati fiscali).
// =====================================================================
import { NextResponse } from "next/server";
import { guardCsrf } from "@/lib/api";
import { getCustomerSession, clearSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Accesso richiesto" },
      { status: 401 }
    );
  }
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const customerId = session.customer.id;
  await db.order.deleteMany({ where: { customerId } });
  await db.customer.delete({ where: { id: customerId } });

  const res = NextResponse.json({ ok: true });
  return clearSession(res, false);
}
