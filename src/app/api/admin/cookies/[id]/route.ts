// =====================================================================
// PUT    /api/admin/cookies/[id] - Modifica voce cookie (MANAGER+)
// DELETE /api/admin/cookies/[id] - Elimina voce (MANAGER+)
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardCsrf, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { cookieDefinitionSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const session = await requireAdmin("MANAGER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { id } = await ctx.params;
  const existing = await db.cookieDefinition.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Voce non trovata" }, { status: 404 });
  }

  const { data, error } = await parseBody(req, cookieDefinitionSchema);
  if (error) return error;

  const def = await db.cookieDefinition.update({ where: { id }, data });

  await audit(req, {
    actorId: session.user.id,
    actorName: session.user.username,
    action: "UPDATE",
    entity: "CookieDefinition",
    entityId: id,
    before: { name: existing.name, active: existing.active },
    after: { name: def.name, active: def.active },
  });

  return NextResponse.json({ def });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const session = await requireAdmin("MANAGER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { id } = await ctx.params;
  const existing = await db.cookieDefinition.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Voce non trovata" }, { status: 404 });
  }

  await db.cookieDefinition.delete({ where: { id } });
  await audit(req, {
    actorId: session.user.id,
    actorName: session.user.username,
    action: "DELETE",
    entity: "CookieDefinition",
    entityId: id,
    before: { name: existing.name },
  });

  return NextResponse.json({ ok: true });
}
