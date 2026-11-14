// =====================================================================
// POST /api/catering - Richiesta preventivo catering
// PII cifrato AES-256-GCM a riposo (OWASP A02).
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardRate, guardCsrf, parseBody } from "@/lib/api";
import { cateringSchema } from "@/lib/validation";
import { encryptField } from "@/lib/security";

export async function POST(req: Request) {
  const rl = guardRate(req, "contact");
  if (rl) return rl;
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { data, error } = await parseBody(req, cateringSchema);
  if (error) return error;

  await db.cateringRequest.create({
    data: {
      nameEnc: encryptField(data.name),
      emailEnc: encryptField(data.email),
      phoneEnc: encryptField(data.phone),
      company: data.company ?? null,
      eventType: data.eventType ?? null,
      guests: data.guests,
      date: data.date ?? null,
      message: data.message,
    },
  });

  return NextResponse.json({ ok: true });
}
