// =====================================================================
// GET  /api/admin/users  - Elenco utenti backend (SUPERADMIN)
// POST /api/admin/users  - Crea utente backend (SUPERADMIN, spec 4.7)
// Nuovi utenti: password min 14 char, MFA da enrollare al primo login.
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardCsrf, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { adminUserSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/security";
import { audit } from "@/lib/audit";

export async function GET() {
  const session = await requireAdmin("SUPERADMIN");
  if (!session) {
    return NextResponse.json({ error: "FORBIDDEN", message: "Solo SuperAdmin" }, { status: 403 });
  }
  const users = await db.adminUser.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      active: u.active,
      totpEnabled: u.totpEnabled,
      lastLoginAt: u.lastLoginAt,
      lastLoginIp: u.lastLoginIp,
      lockedUntil: u.lockedUntil,
      createdAt: u.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const session = await requireAdmin("SUPERADMIN");
  if (!session) {
    return NextResponse.json({ error: "FORBIDDEN", message: "Solo SuperAdmin" }, { status: 403 });
  }
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { data, error } = await parseBody(req, adminUserSchema);
  if (error) return error;

  const username = data.username.toLowerCase();
  const dup = await db.adminUser.findFirst({
    where: { OR: [{ username }, { email: data.email.toLowerCase() }] },
  });
  if (dup) {
    return NextResponse.json(
      { error: "EXISTS", message: "Username o email già in uso" },
      { status: 409 }
    );
  }

  const user = await db.adminUser.create({
    data: {
      username,
      email: data.email.toLowerCase(),
      passwordHash: await hashPassword(data.password),
      role: data.role,
    },
  });

  await audit(req, {
    actorId: session.user.id,
    actorName: session.user.username,
    action: "CREATE",
    entity: "AdminUser",
    entityId: user.id,
    after: { username: user.username, role: user.role },
  });

  return NextResponse.json({
    user: { id: user.id, username: user.username, role: user.role },
  });
}
