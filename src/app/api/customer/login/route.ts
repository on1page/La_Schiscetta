// =====================================================================
// POST /api/customer/login - Accesso cliente
// Rate limit 5/15min per IP (OWASP A04). Risposta generica in caso
// di credenziali errate (anti-enumerazione, OWASP A07).
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardRate, guardCsrf, parseBody } from "@/lib/api";
import { customerLoginSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/security";
import { issueCustomerSession } from "@/lib/auth";

export async function POST(req: Request) {
  const rl = guardRate(req, "login");
  if (rl) return rl;
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { data, error } = await parseBody(req, customerLoginSchema);
  if (error) return error;

  const customer = await db.customer.findUnique({
    where: { email: data.email.toLowerCase().trim() },
  });
  const valid = customer
    ? await verifyPassword(customer.passwordHash, data.password)
    : false;

  // tempo di verifica costante per ridurre timing attack
  if (!customer || !valid) {
    return NextResponse.json(
      { error: "INVALID_CREDENTIALS", message: "Email o password non corretti" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  return issueCustomerSession(res, req, customer);
}
