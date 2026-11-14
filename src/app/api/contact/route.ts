// =====================================================================
// POST /api/contact - Form contatti pubblico
// Rate limit 5/ora per IP (anti-spam, OWASP A04).
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardRate, guardCsrf, parseBody } from "@/lib/api";
import { contactSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const rl = guardRate(req, "contact");
  if (rl) return rl;
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { data, error } = await parseBody(req, contactSchema);
  if (error) return error;

  await db.contactMessage.create({
    data: {
      name: data.name,
      email: data.email,
      subject: data.subject ?? null,
      message: data.message,
    },
  });

  return NextResponse.json({ ok: true });
}
