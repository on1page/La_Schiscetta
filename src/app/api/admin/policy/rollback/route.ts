// =====================================================================
// POST /api/admin/policy/rollback - Ripristina una versione precedente
// della policy (MANAGER+). Il rollback è esso stesso una nuova versione
// e viene audited.
// =====================================================================
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guardCsrf, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { toJson } from "@/lib/json";

const schema = z.object({ versionId: z.string().min(5).max(40) });

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  const version = await db.policyVersion.findUnique({ where: { id: data.versionId } });
  if (!version || version.type !== "PRIVACY") {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Versione non trovata" },
      { status: 404 }
    );
  }

  const current = await db.privacyPolicy.findUnique({ where: { id: "main" } });
  const newVersion = (current?.version ?? 0) + 1;

  await db.privacyPolicy.update({
    where: { id: "main" },
    data: { sections: version.sections, version: newVersion },
  });

  await db.policyVersion.create({
    data: {
      type: "PRIVACY",
      version: newVersion,
      sections: version.sections,
      changeNote: `Rollback alla versione ${version.version}`,
      authorName: session.user.username,
    },
  });

  await audit(req, {
    actorId: session.user.id,
    actorName: session.user.username,
    action: "ROLLBACK",
    entity: "PrivacyPolicy",
    entityId: "main",
    before: { version: current?.version },
    after: { rollbackTo: version.version, newVersion },
  });

  return NextResponse.json({ ok: true, version: newVersion });
}
