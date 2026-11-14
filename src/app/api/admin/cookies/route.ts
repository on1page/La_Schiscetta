// =====================================================================
// POST /api/admin/cookies - Nuova voce tabella cookie (MANAGER+)
// La tabella alimenta la cookie policy pubblica e il banner
// (coerenza automatica, spec 4.5).
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardCsrf, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { cookieDefinitionSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { data, error } = await parseBody(req, cookieDefinitionSchema);
  if (error) return error;

  const count = await db.cookieDefinition.count();
  const def = await db.cookieDefinition.create({
    data: { ...data, sortOrder: count + 1 },
  });

  await audit(req, {
    actorId: session.user.id,
    actorName: session.user.username,
    action: "CREATE",
    entity: "CookieDefinition",
    entityId: def.id,
    after: { name: def.name, category: def.category },
  });

  return NextResponse.json({ def });
}
