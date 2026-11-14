// =====================================================================
// PUT    /api/admin/menu/[id] - Aggiornamento voce menu (MANAGER+)
// DELETE /api/admin/menu/[id] - Eliminazione (MANAGER+)
// Ogni modifica è tracciata nell'audit log con payload pre/post.
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardCsrf, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { menuItemSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { toJson } from "@/lib/json";
import { consistencyWarnings } from "@/lib/menu-checks";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const session = await requireAdmin("MANAGER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { id } = await ctx.params;
  const existing = await db.menuItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Voce non trovata" }, { status: 404 });
  }

  const { data, error } = await parseBody(req, menuItemSchema);
  if (error) return error;

  const slugDup = await db.menuItem.findFirst({
    where: { slug: data.slug, NOT: { id } },
  });
  if (slugDup) {
    return NextResponse.json({ error: "SLUG_EXISTS", message: "Slug già in uso" }, { status: 409 });
  }

  const item = await db.menuItem.update({
    where: { id },
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
    action: "UPDATE",
    entity: "MenuItem",
    entityId: id,
    before: { slug: existing.slug, prezzo: existing.pricePer100g, disponibile: existing.available },
    after: { slug: item.slug, prezzo: item.pricePer100g, disponibile: item.available },
  });

  return NextResponse.json({ item, warnings: consistencyWarnings(data) });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const session = await requireAdmin("MANAGER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { id } = await ctx.params;
  const existing = await db.menuItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Voce non trovata" }, { status: 404 });
  }

  await db.menuItem.delete({ where: { id } });
  await audit(req, {
    actorId: session.user.id,
    actorName: session.user.username,
    action: "DELETE",
    entity: "MenuItem",
    entityId: id,
    before: { slug: existing.slug, name: existing.nameIt, category: existing.category },
  });

  return NextResponse.json({ ok: true });
}
