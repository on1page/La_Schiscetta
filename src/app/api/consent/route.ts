// =====================================================================
// POST /api/consent - Registro del consenso cookie
// Provvedimento Garante Privacy n. 231/2021: registra chi (pseudonimo
// giornaliero non identificativo), quando e cosa ha consentito.
// Conservazione 12 mesi. Nessun cookie non essenziale prima del consenso.
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardRate, guardCsrf, parseBody } from "@/lib/api";
import { consentSchema } from "@/lib/validation";
import { dailyVisitorHash, getClientIp, getUserAgent } from "@/lib/security";

export async function POST(req: Request) {
  const rl = guardRate(req, "consent");
  if (rl) return rl;
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { data, error } = await parseBody(req, consentSchema);
  if (error) return error;

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 12); // retention 12 mesi

  await db.consentRecord.create({
    data: {
      visitorHash: dailyVisitorHash(getClientIp(req), getUserAgent(req)),
      necessary: true,
      analytics: data.analytics,
      marketing: data.marketing,
      policyVersion: data.policyVersion,
      expiresAt,
    },
  });

  return NextResponse.json({ ok: true });
}
