// =====================================================================
// POST /api/admin/totp-reset - Reset MFA TOTP (nuovo enrollment)
// Richiede la password attuale. sessionVersion++ revoca le sessioni.
// =====================================================================
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guardCsrf, parseBody } from "@/lib/api";
import { getAdminSession } from "@/lib/auth";
import {
  verifyPassword,
  generateTotpSecret,
  encryptField,
} from "@/lib/security";
import { audit } from "@/lib/audit";

const schema = z.object({ currentPassword: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Sessione non valida" }, { status: 401 });
  }
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  const valid = await verifyPassword(session.user.passwordHash, data.currentPassword);
  if (!valid) {
    return NextResponse.json(
      { error: "INVALID_CREDENTIALS", message: "Password non corretta" },
      { status: 401 }
    );
  }

  const secret = generateTotpSecret();
  await db.adminUser.update({
    where: { id: session.user.id },
    data: {
      totpSecretEnc: encryptField(secret),
      totpEnabled: false,
      backupCodesEnc: null,
      sessionVersion: { increment: 1 },
    },
  });

  await audit(req, {
    actorId: session.user.id,
    actorName: session.user.username,
    action: "TOTP_RESET",
    entity: "AdminUser",
    entityId: session.user.id,
  });

  return NextResponse.json({
    ok: true,
    secret,
    otpauth: `otpauth://totp/La%20Schiscetta%20Admin:${encodeURIComponent(
      session.user.email
    )}?secret=${secret}&issuer=La%20Schiscetta&algorithm=SHA1&digits=6&period=30`,
    message: "MFA reimpostata: rifai il login per il nuovo enrollment.",
  });
}
