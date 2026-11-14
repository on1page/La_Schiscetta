// =====================================================================
// GET /api/admin/policy - Privacy sections + tabella cookie + versioni
// (spec 4.5). Versionamento max 20 con pruning automatico.
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const session = await requireAdmin("VIEWER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }
  const [privacy, versions, cookies] = await Promise.all([
    db.privacyPolicy.findUnique({ where: { id: "main" } }),
    db.policyVersion.findMany({
      where: { type: "PRIVACY" },
      orderBy: { version: "desc" },
      take: 20,
    }),
    db.cookieDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return NextResponse.json({
    privacy: privacy
      ? {
          sections: JSON.parse(privacy.sections || "[]"),
          version: privacy.version,
          updatedAt: privacy.updatedAt,
        }
      : null,
    versions: versions.map((v) => ({
      id: v.id,
      version: v.version,
      changeNote: v.changeNote,
      authorName: v.authorName,
      createdAt: v.createdAt,
    })),
    cookies,
  });
}
