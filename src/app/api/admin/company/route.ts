// =====================================================================
// GET /api/admin/company - Info aziendali complete (VIEWER+)
// PUT /api/admin/company - Aggiornamento (SUPERADMIN, spec 4.4)
// Validazioni: P.IVA con checksum, SDI 7 char, CAP, IBAN, coordinate.
// Propagazione automatica a footer/privacy/fatture via lettura DB.
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardCsrf, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { companySchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { toJson } from "@/lib/json";

export async function GET() {
  const session = await requireAdmin("VIEWER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }
  const company = await db.companyInfo.findUnique({ where: { id: "main" } });
  return NextResponse.json({ company });
}

export async function PUT(req: Request) {
  const session = await requireAdmin("SUPERADMIN");
  if (!session) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Solo il SuperAdmin può modificare i dati aziendali" },
      { status: 403 }
    );
  }
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { data, error } = await parseBody(req, companySchema);
  if (error) return error;

  const existing = await db.companyInfo.findUnique({ where: { id: "main" } });

  const company = await db.companyInfo.upsert({
    where: { id: "main" },
    update: {
      legalName: data.legalName,
      brandName: data.brandName,
      tagline: data.tagline ?? null,
      vatNumber: data.vatNumber || null,
      taxCode: data.taxCode || null,
      sdiCode: data.sdiCode || null,
      pec: data.pec || null,
      street: data.street,
      streetNumber: data.streetNumber,
      zip: data.zip,
      city: data.city,
      province: data.province,
      lat: data.lat,
      lng: data.lng,
      phone: data.phone || null,
      mobile: data.mobile || null,
      whatsapp: data.whatsapp || null,
      emailInfo: data.emailInfo || null,
      emailOrders: data.emailOrders || null,
      emailPrivacy: data.emailPrivacy || null,
      emailAdmin: data.emailAdmin || null,
      cciaa: data.cciaa || null,
      reaNumber: data.reaNumber || null,
      shareCapital: data.shareCapital || null,
      dpoName: data.dpoName || null,
      dpoEmail: data.dpoEmail || null,
      dpoPhone: data.dpoPhone || null,
      instagram: data.instagram || null,
      facebook: data.facebook || null,
      tiktok: data.tiktok || null,
      linkedin: data.linkedin || null,
      gbpId: data.gbpId || null,
      iban: data.iban || null,
      logoUrl: data.logoUrl || null,
      heroUrl: data.heroUrl || null,
      aboutUrl: data.aboutUrl || null,
      openingHours: toJson(data.openingHours),
      holidays: toJson(data.holidays),
    },
    create: {
      id: "main",
      legalName: data.legalName,
      brandName: data.brandName,
      tagline: data.tagline ?? null,
      vatNumber: data.vatNumber || null,
      taxCode: data.taxCode || null,
      sdiCode: data.sdiCode || null,
      pec: data.pec || null,
      street: data.street,
      streetNumber: data.streetNumber,
      zip: data.zip,
      city: data.city,
      province: data.province,
      lat: data.lat,
      lng: data.lng,
      phone: data.phone || null,
      mobile: data.mobile || null,
      whatsapp: data.whatsapp || null,
      emailInfo: data.emailInfo || null,
      emailOrders: data.emailOrders || null,
      emailPrivacy: data.emailPrivacy || null,
      emailAdmin: data.emailAdmin || null,
      cciaa: data.cciaa || null,
      reaNumber: data.reaNumber || null,
      shareCapital: data.shareCapital || null,
      dpoName: data.dpoName || null,
      dpoEmail: data.dpoEmail || null,
      dpoPhone: data.dpoPhone || null,
      instagram: data.instagram || null,
      facebook: data.facebook || null,
      tiktok: data.tiktok || null,
      linkedin: data.linkedin || null,
      gbpId: data.gbpId || null,
      iban: data.iban || null,
      logoUrl: data.logoUrl || null,
      heroUrl: data.heroUrl || null,
      aboutUrl: data.aboutUrl || null,
      openingHours: toJson(data.openingHours),
      holidays: toJson(data.holidays),
    },
  });

  await audit(req, {
    actorId: session.user.id,
    actorName: session.user.username,
    action: "UPDATE",
    entity: "CompanyInfo",
    entityId: "main",
    before: existing
      ? { brand: existing.brandName, vat: existing.vatNumber, sdi: existing.sdiCode }
      : null,
    after: { brand: company.brandName, vat: company.vatNumber, sdi: company.sdiCode },
  });

  return NextResponse.json({ company });
}
