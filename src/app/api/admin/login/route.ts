// =====================================================================
// POST /api/admin/login - Fase 1 dell'accesso admin (username+password)
//
// OWASP A07: lockout dopo 5 tentativi (15 min), risposta generica,
// hash argon2id, audit di ogni tentativo.
// MFA obbligatoria: se TOTP attivo -> tempToken per la fase 2;
// se non ancora enrollato -> avvio enrollment (QR + verify).
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardRate, guardCsrf } from "@/lib/api";
import { adminLoginSchema } from "@/lib/validation";
import { verifyPassword, generateTotpSecret, encryptField, signJwt, getClientIp, getUserAgent } from "@/lib/security";
import { audit } from "@/lib/audit";

const LOCK_MINUTES = 15;
const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  // NB: il body della Request è uno stream leggibile UNA sola volta
  const raw = (await req.json().catch(() => null)) as
    | { username?: unknown; password?: unknown }
    | null;
  const usernameGuess = typeof raw?.username === "string" ? raw.username : "";

  const rl = guardRate(req, "login", usernameGuess.toLowerCase());
  if (rl) return rl;
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const parsed = adminLoginSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: "VALIDATION",
        message: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Dati non validi",
      },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const username = data.username.toLowerCase().trim();
  const user = await db.adminUser.findUnique({ where: { username } });

  // Utente non trovato: verifica comunque un hash per costanza di tempo
  if (!user) {
    await verifyPassword(
      "$argon2id$v=19$m=65536,t=3,p=1$decoy$decoy",
      data.password
    );
    await audit(req, {
      actorName: username,
      action: "LOGIN_FAILED",
      entity: "AdminUser",
      after: { motivo: "utente inesistente" },
    });
    return NextResponse.json(
      { error: "INVALID_CREDENTIALS", message: "Credenziali non valide" },
      { status: 401 }
    );
  }

  if (!user.active) {
    await audit(req, { actorName: username, action: "LOGIN_BLOCKED", entity: "AdminUser" });
    return NextResponse.json(
      { error: "ACCOUNT_DISABLED", message: "Account disattivato" },
      { status: 403 }
    );
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const min = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return NextResponse.json(
      {
        error: "LOCKED",
        message: `Account bloccato per tentativi errati. Riprova tra ${min} minuti o richiedi lo sblocco via email.`,
      },
      { status: 423 }
    );
  }

  const valid = await verifyPassword(user.passwordHash, data.password);
  if (!valid) {
    const attempts = user.failedAttempts + 1;
    const lock = attempts >= MAX_ATTEMPTS;
    await db.adminUser.update({
      where: { id: user.id },
      data: {
        failedAttempts: lock ? 0 : attempts,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
      },
    });
    await audit(req, {
      actorId: user.id,
      actorName: user.username,
      action: "LOGIN_FAILED",
      entity: "AdminUser",
      after: { tentativo: attempts, bloccato: lock },
    });
    return NextResponse.json(
      {
        error: "INVALID_CREDENTIALS",
        message: lock
          ? "Troppi tentativi: account bloccato per 15 minuti."
          : "Credenziali non valide",
      },
      { status: 401 }
    );
  }

  await db.adminUser.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });

  // Token temporaneo (5 minuti) per completare la MFA
  const tempToken = signJwt({ sub: user.id, typ: "mfa_pending" }, 300);

  if (!user.totpEnabled) {
    // Primo accesso: avvio enrollment TOTP (obbligatorio)
    const secret = generateTotpSecret();
    await db.adminUser.update({
      where: { id: user.id },
      data: { totpSecretEnc: encryptField(secret), totpEnabled: false },
    });
    await audit(req, {
      actorId: user.id,
      actorName: user.username,
      action: "MFA_ENROLLMENT_STARTED",
      entity: "AdminUser",
    });
    return NextResponse.json({
      ok: true,
      enroll: true,
      tempToken,
      secret,
      otpauth: `otpauth://totp/La%20Schiscetta%20Admin:${encodeURIComponent(
        user.email
      )}?secret=${secret}&issuer=La%20Schiscetta&algorithm=SHA1&digits=6&period=30`,
      message: "Configura l'autenticazione a due fattori per continuare.",
    });
  }

  await audit(req, {
    actorId: user.id,
    actorName: user.username,
    action: "LOGIN_STEP1_OK",
    entity: "AdminUser",
    after: { ip: getClientIp(req), userAgent: getUserAgent(req).slice(0, 80) },
  });

  return NextResponse.json({ ok: true, mfa: true, tempToken });
}
