// =====================================================================
// POST /api/customer/register - Registrazione cliente
// Password min 12 char (OWASP A07), hash argon2id, PII cifrato a riposo.
// Il consenso privacy (art. 6 GDPR) è obbligatorio e tracciato.
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardRate, guardCsrf, parseBody } from "@/lib/api";
import { customerRegisterSchema } from "@/lib/validation";
import { hashPassword, encryptField } from "@/lib/security";
import { issueCustomerSession } from "@/lib/auth";

export async function POST(req: Request) {
  const rl = guardRate(req, "register");
  if (rl) return rl;
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { data, error } = await parseBody(req, customerRegisterSchema);
  if (error) return error;

  const email = data.email.toLowerCase().trim();
  const existing = await db.customer.findUnique({ where: { email } });
  if (existing) {
    // messaggio generico per non favorire enumerazione account (OWASP A07)
    return NextResponse.json(
      { error: "EMAIL_TAKEN", message: "Non è possibile completare la registrazione con questa email" },
      { status: 409 }
    );
  }

  const customer = await db.customer.create({
    data: {
      email,
      passwordHash: await hashPassword(data.password),
      nameEnc: encryptField(data.name),
      phoneEnc: encryptField(data.phone ?? null),
    },
  });

  const res = NextResponse.json({
    ok: true,
    customer: { id: customer.id, email: customer.email },
  });
  return issueCustomerSession(res, req, customer);
}
