// =====================================================================
// POST /api/newsletter/confirm - Conferma doppio opt-in (token monouso)
// =====================================================================
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guardRate, parseBody } from "@/lib/api";
import { sha256 } from "@/lib/security";

const schema = z.object({ token: z.string().min(10).max(200) });

export async function POST(req: Request) {
  const rl = guardRate(req, "api");
  if (rl) return rl;

  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  const sub = await db.newsletterSubscriber.findFirst({
    where: { confirmToken: sha256(data.token) },
  });
  if (!sub) {
    return NextResponse.json(
      { error: "INVALID_TOKEN", message: "Token non valido o già usato" },
      { status: 400 }
    );
  }

  await db.newsletterSubscriber.update({
    where: { id: sub.id },
    data: { confirmedAt: new Date(), confirmToken: null },
  });

  return NextResponse.json({ ok: true, message: "Iscrizione confermata. Benvenuto!" });
}
