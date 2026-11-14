// =====================================================================
// GET /api/admin/catering - Richieste catering/contatti (MANAGER+)
// PII decifrato solo per personale autorizzato.
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
  const [requests, messages] = await Promise.all([
    db.cateringRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
  ]);
  return NextResponse.json({
    requests: requests.map((r) => ({
      id: r.id,
      name: decryptField(r.nameEnc),
      email: decryptField(r.emailEnc),
      phone: decryptField(r.phoneEnc),
      company: r.company,
      eventType: r.eventType,
      guests: r.guests,
      date: r.date,
      message: r.message,
      status: r.status,
      createdAt: r.createdAt,
    })),
    messages,
  });
}
