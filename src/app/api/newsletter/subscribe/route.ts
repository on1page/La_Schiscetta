// =====================================================================
// POST /api/newsletter/subscribe - Iscrizione newsletter (doppio opt-in)
// GDPR: nessun contatto attivo finché l'indirizzo non è confermato
// tramite token monouso inviato via email (MailUp/Resend in produzione;
// in sandbox il link di conferma è restituito solo in non-production
// per rendere testabile il flusso).
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardRate, guardCsrf, parseBody } from "@/lib/api";
import { newsletterSchema } from "@/lib/validation";
import { sha256, randomToken } from "@/lib/security";

export async function POST(req: Request) {
  const rl = guardRate(req, "newsletter");
  if (rl) return rl;
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { data, error } = await parseBody(req, newsletterSchema);
  if (error) return error;

  const email = data.email.toLowerCase().trim();
  const existing = await db.newsletterSubscriber.findUnique({ where: { email } });

  if (existing?.confirmedAt) {
    return NextResponse.json({
      ok: true,
      message: "Sei già iscritto. Controlla la tua email per il link di conferma.",
    });
  }

  const rawToken = randomToken(24);
  const tokenHash = sha256(rawToken);
  const unsubToken = randomToken(24);

  if (existing) {
    await db.newsletterSubscriber.update({
      where: { email },
      data: { confirmToken: tokenHash, unsubToken, lang: data.lang },
    });
  } else {
    await db.newsletterSubscriber.create({
      data: {
        email,
        confirmToken: tokenHash,
        unsubToken,
        lang: data.lang,
      },
    });
  }

  // In produzione: invio email con link /api/newsletter/confirm?token=...
  // tramite MailUp/Resend (server EU). Sandbox: log del invio.
  console.log(`[newsletter] doppio opt-in pending per ${email.slice(0, 3)}***`);

  return NextResponse.json({
    ok: true,
    message: "Iscrizione avviata: conferma dall'email che ti abbiamo inviato.",
    devConfirmToken: process.env.NODE_ENV === "production" ? undefined : rawToken,
  });
}
