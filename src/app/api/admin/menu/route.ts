// =====================================================================
// GET  /api/admin/menu - Elenco completo (anche non disponibili)
// POST /api/admin/menu - Creazione voce menu (MANAGER+)
//
// Validazione backend (spec 4.3):
// - allergeni obbligatori (anche lista vuota = dichiarazione esplicita)
// - controlli di coerenza: V/VG con ingredienti animali, GF con glutine,
//   ingredienti che suggeriscono allergeni non dichiarati
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardCsrf, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { menuItemSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { toJson } from "@/lib/json";
import { consistencyWarnings } from "@/lib/menu-checks";

export async function GET() {
  const session = await requireAdmin("VIEWER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }
  const items = await db.menuItem.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { nameIt: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato (richiesto ruolo Manager)" }, { status: 401 });
  }
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { data, error } = await parseBody(req, menuItemSchema);
  if (error) return error;

  const dup = await db.menuItem.findUnique({ where: { slug: data.slug } });
  if (dup) {
    return NextResponse.json(
      { error: "SLUG_EXISTS", message: "Slug già in uso" },
      { status: 409 }
    );
  }

  const item = await db.menuItem.create({
    data: {
      slug: data.slug,
      nameIt: data.nameIt,
      nameEn: data.nameEn,
      descIt: data.descIt,
      descEn: data.descEn,
      category: data.category,
      imageUrl: data.imageUrl || null,
      pricePer100g: data.pricePer100g,
      unitWeightG: data.unitWeightG,
      kcal: data.kcal,
      proteinG: data.proteinG,
      fatG: data.fatG,
      carbG: data.carbG,
      fiberG: data.fiberG,
      ingredientsIt: toJson(data.ingredientsIt),
      ingredientsEn: toJson(data.ingredientsEn),
      allergens: toJson(data.allergens),
      dietTags: toJson(data.dietTags),
      addInIds: toJson(data.addInIds),
      healthClaim: data.healthClaim || null,
      available: data.available,
      availableDays: toJson(data.availableDays),
      seasonalFrom: data.seasonalFrom || null,
      seasonalTo: data.seasonalTo || null,
      isPopular: data.isPopular,
      isSignature: data.isSignature,
      sortOrder: data.sortOrder,
    },
  });

  await audit(req, {
    actorId: session.user.id,
    actorName: session.user.username,
    action: "CREATE",
    entity: "MenuItem",
    entityId: item.id,
    after: { slug: item.slug, name: item.nameIt },
  });

  return NextResponse.json({ item, warnings: consistencyWarnings(data) });
}
