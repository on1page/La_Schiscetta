// =====================================================================
// GET /api/bootstrap - Contenuti pubblici per la SPA
// Ritorna: azienda, menu disponibile, add-in, zone, recensioni, blog,
// privacy policy, tabella cookie. Imposta il cookie CSRF al primo uso.
// Nessun dato personale. Cache pubblica breve in produzione.
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureCsrfCookie } from "@/lib/api";

export async function GET() {
  const [company, menuItems, addIns, zones, reviews, posts, privacy, cookieDefs] =
    await Promise.all([
      db.companyInfo.findUnique({ where: { id: "main" } }),
      db.menuItem.findMany({
        where: { available: true },
        orderBy: [{ sortOrder: "asc" }, { nameIt: "asc" }],
      }),
      db.addIn.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
      db.deliveryZone.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
      db.review.findMany({ where: { visible: true }, orderBy: { date: "desc" }, take: 12 }),
      db.blogPost.findMany({
        where: { published: true },
        orderBy: { publishedAt: "desc" },
      }),
      db.privacyPolicy.findUnique({ where: { id: "main" } }),
      db.cookieDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);

  const res = NextResponse.json({
    company: company
      ? { ...company, emailAdmin: undefined, updatedAt: undefined }
      : null,
    menu: menuItems,
    addIns,
    zones,
    reviews,
    blog: posts,
    privacy: privacy
      ? {
          sections: JSON.parse(privacy.sections || "[]"),
          version: privacy.version,
          updatedAt: privacy.updatedAt,
        }
      : { sections: [], version: 1, updatedAt: new Date() },
    cookies: cookieDefs,
  });
  await ensureCsrfCookie(res);
  return res;
}
