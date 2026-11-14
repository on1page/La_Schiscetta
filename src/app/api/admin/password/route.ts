// =====================================================================
// POST /api/admin/password - Cambio password (min 14 char, spec 4.1)
// Al cambio: revoca tutte le sessioni (sessionVersion++).
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardCsrf, parseBody } from "@/lib/api";
import { getAdminSession } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/security";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Sessione non valida" }, { status: 401 });
  }
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { data, error } = await parseBody(req, changePasswordSchema);
  if (error) return error;

  const valid = await verifyPassword(session.user.passwordHash, data.currentPassword);
  if (!valid) {
    return NextResponse.json(
      { error: "INVALID_CREDENTIALS", message: "Password attuale non corretta" },
      { status: 401 }
    );
  }

  await db.adminUser.update({
    where: { id: session.user.id },
    data: {
      passwordHash: await hashPassword(data.newPassword),
      sessionVersion: { increment: 1 }, // logout forzato ovunque
    },
  });

  await audit(req, {
    actorId: session.user.id,
    actorName: session.user.username,
    action: "PASSWORD_CHANGED",
    entity: "AdminUser",
    entityId: session.user.id,
  });

  return NextResponse.json({ ok: true, message: "Password aggiornata: accedi di nuovo." });
}
