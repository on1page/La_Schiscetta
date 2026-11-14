// =====================================================================
// POST /api/admin/mfa - Fase 2 dell'accesso admin
// Verifica il codice TOTP (o backup code monouso) e, se valido,
// emette la sessione JWT httpOnly SameSite=Strict.
// Al primo accesso (enrollment) verifica e attiva il TOTP, quindi
// restituisce i backup codes da conservare.
// =====================================================================
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guardRate, guardCsrf, parseBody } from "@/lib/api";
import {
  verifyTotp,
  decryptField,
  encryptField,
  generateBackupCodes,
  sha256,
  getClientIp,
  getUserAgent,
} from "@/lib/security";
import { verifyJwt } from "@/lib/security";
import { issueAdminSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({
  tempToken: z.string().min(20),
  code: z.string().min(6).max(12),
});

// Notifica login via email (spec 4.1): in produzione Resend/MailUp
function notifyAdminLogin(email: string, ip: string, ua: string) {
  // Placeholder: invio email transazionale con IP, user agent e geo approx.
  console.log(
    `[security] Nuovo login admin per ${email.slice(0, 3)}*** da ${ip} (${ua.slice(0, 60)})`
  );
}

export async function POST(req: Request) {
  const rl = guardRate(req, "mfa");
  if (rl) return rl;
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  const payload = verifyJwt(data.tempToken);
  if (!payload || payload.typ !== "mfa_pending") {
    return NextResponse.json(
      { error: "TOKEN_EXPIRED", message: "Sessione di verifica scaduta: ripeti il login" },
      { status: 401 }
    );
  }

  const user = await db.adminUser.findUnique({ where: { id: payload.sub } });
  if (!user || !user.active || !user.totpSecretEnc) {
    return NextResponse.json(
      { error: "INVALID_STATE", message: "Stato non valido" },
      { status: 400 }
    );
  }

  const secret = decryptField(user.totpSecretEnc);
  const code = data.code.replace(/\s/g, "").toUpperCase();
  let verified = verifyTotp(code, secret);
  let usedBackup: string | null = null;

  // Backup code monouso (fallback TOTP)
  if (!verified && user.backupCodesEnc) {
    const codes = JSON.parse(decryptField(user.backupCodesEnc)) as string[];
    const idx = codes.findIndex((c) => sha256(code) === c);
    if (idx >= 0) {
      codes.splice(idx, 1);
      await db.adminUser.update({
        where: { id: user.id },
        data: { backupCodesEnc: encryptField(JSON.stringify(codes)) },
      });
      verified = true;
      usedBackup = code;
    }
  }

  if (!verified) {
    await audit(req, {
      actorId: user.id,
      actorName: user.username,
      action: "MFA_FAILED",
      entity: "AdminUser",
    });
    return NextResponse.json(
      { error: "MFA_INVALID", message: "Codice non valido" },
      { status: 401 }
    );
  }

  const wasEnrolling = !user.totpEnabled;
  let backupCodes: string[] | undefined;

  if (wasEnrolling) {
    backupCodes = generateBackupCodes(8);
    await db.adminUser.update({
      where: { id: user.id },
      data: {
        totpEnabled: true,
        backupCodesEnc: encryptField(
          JSON.stringify(backupCodes.map((c) => sha256(c)))
        ),
      },
    });
  }

  const ip = getClientIp(req);
  const ua = getUserAgent(req);
  await db.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastLoginIp: ip },
  });

  await audit(req, {
    actorId: user.id,
    actorName: user.username,
    action: usedBackup ? "LOGIN_BACKUP_CODE" : "LOGIN",
    entity: "AdminUser",
    after: { ip, userAgent: ua, mfa: "TOTP", enrollment: wasEnrolling },
  });

  notifyAdminLogin(user.email, ip, ua);

  const res = NextResponse.json({
    ok: true,
    enrolled: wasEnrolling,
    backupCodes,
    user: { username: user.username, role: user.role, email: user.email },
  });
  return issueAdminSession(res, req, user);
}
