// =====================================================================
// PUT /api/admin/policy/privacy - Pubblica nuova versione Privacy/Cookie
// policy (MANAGER+): salva sezioni, incrementa versione, conserva le
// ultime 20 versioni (rollback disponibile), audita la modifica e
// aggiorna la data di ultima revisione mostrata al pubblico.
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardCsrf, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { privacySectionsSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { toJson } from "@/lib/json";

export async function PUT(req: Request) {
  const session = await requireAdmin("MANAGER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const body = await req.json().catch(() => null);
  const parsed = privacySectionsSchema.safeParse(body?.sections);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", message: "Sezioni non valide" },
      { status: 400 }
    );
  }
  const changeNote: string =
    typeof body?.changeNote === "string" ? body.changeNote.slice(0, 300) : "Aggiornamento policy";

  const current = await db.privacyPolicy.findUnique({ where: { id: "main" } });
  const newVersion = (current?.version ?? 0) + 1;

  const updated = await db.privacyPolicy.upsert({
    where: { id: "main" },
    update: { sections: toJson(parsed.data), version: newVersion },
    create: { id: "main", sections: toJson(parsed.data), version: newVersion },
  });

  await db.policyVersion.create({
    data: {
      type: "PRIVACY",
      version: newVersion,
      sections: toJson(parsed.data),
      changeNote,
      authorName: session.user.username,
    },
  });

  // max 20 versioni conservate (spec 4.5)
  const all = await db.policyVersion.findMany({
    where: { type: "PRIVACY" },
    orderBy: { version: "desc" },
  });
  if (all.length > 20) {
    await db.policyVersion.deleteMany({
      where: { id: { in: all.slice(20).map((v) => v.id) } },
    });
  }

  await audit(req, {
    actorId: session.user.id,
    actorName: session.user.username,
    action: "UPDATE",
    entity: "PrivacyPolicy",
    entityId: "main",
    before: current ? { version: current.version } : null,
    after: { version: newVersion, changeNote },
  });

  return NextResponse.json({
    ok: true,
    version: newVersion,
    updatedAt: updated.updatedAt,
    message: "Policy pubblicata. Notifica email inviata agli amministratori (demo).",
  });
}
