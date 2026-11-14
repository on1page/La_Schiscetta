// =====================================================================
// PATCH /api/admin/users/[id] - Ruolo/attivo/sblocco/revoca sessioni
// (SUPERADMIN). Guardia anti auto-lockout: non è possibile declassare
// o disattivare il proprio account.
// =====================================================================
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guardCsrf, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({
  role: z.enum(["SUPERADMIN", "MANAGER", "EDITOR", "VIEWER"]).optional(),
  active: z.boolean().optional(),
  unlock: z.boolean().optional(),
  revokeSessions: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await requireAdmin("SUPERADMIN");
  if (!session) {
    return NextResponse.json({ error: "FORBIDDEN", message: "Solo SuperAdmin" }, { status: 403 });
  }
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { id } = await ctx.params;
  const user = await db.adminUser.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Utente non trovato" }, { status: 404 });
  }

  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  // anti auto-lockout
  if (user.id === session.user.id) {
    if ((data.role && data.role !== "SUPERADMIN") || data.active === false) {
      return NextResponse.json(
        { error: "SELF_LOCKOUT", message: "Non puoi declassare o disattivare il tuo account" },
        { status: 409 }
      );
    }
  }

  const updated = await db.adminUser.update({
    where: { id },
    data: {
      role: data.role,
      active: data.active,
      lockedUntil: data.unlock ? null : undefined,
      failedAttempts: data.unlock ? 0 : undefined,
      sessionVersion: data.revokeSessions ? { increment: 1 } : undefined,
    },
  });

  await audit(req, {
    actorId: session.user.id,
    actorName: session.user.username,
    action: "UPDATE",
    entity: "AdminUser",
    entityId: id,
    before: { role: user.role, active: user.active, locked: !!user.lockedUntil },
    after: { role: updated.role, active: updated.active, unlocked: data.unlock },
  });

  return NextResponse.json({
    user: { id: updated.id, role: updated.role, active: updated.active },
  });
}
