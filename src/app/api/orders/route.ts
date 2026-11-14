// =====================================================================
// POST /api/orders   - Creazione ordine (checkout)
// GET  /api/orders   - Storico ordini del cliente autenticato
//
// SICUREZZA (OWASP A04/A03): prezzi, totali e nutrition calcolati
// SOLO server-side dai dati DB; l'input del client contiene soltanto
// slug, peso e add-in richiesti. PII cifrato AES-256-GCM a riposo.
// Pagamenti: in produzione Stripe PaymentIntent + 3D Secure (PSD2);
// in sandbox l'autorizzazione è simulata (nessun dato carta transita).
// =====================================================================
import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { guardRate, guardCsrf, parseBody, round2 } from "@/lib/api";
import { orderSchema } from "@/lib/validation";
import { getCustomerSession } from "@/lib/auth";
import { encryptField, sha256, getClientIp } from "@/lib/security";
import { parseJson } from "@/lib/json";

type Line = {
  slug: string;
  nameIt: string;
  nameEn: string;
  weightG: number;
  pricePer100g: number;
  addIns: { key: string; nameIt: string; qty: number; price: number }[];
  lineTotal: number;
  macros: { kcal: number; proteinG: number; fatG: number; carbG: number; fiberG: number };
};

function orderNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const rnd = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `SCH-${ymd}-${rnd}`;
}

export async function POST(req: Request) {
  const rl = guardRate(req, "checkout");
  if (rl) return rl;
  const csrf = await guardCsrf(req);
  if (csrf) return csrf;

  const { data: input, error } = await parseBody(req, orderSchema);
  if (error) return error;

  // ---- Ricalcolo server-side di ogni riga ----
  const slugs = input.items.map((i) => i.slug);
  const [dbItems, addInRows] = await Promise.all([
    db.menuItem.findMany({ where: { slug: { in: slugs } } }),
    db.addIn.findMany({ where: { active: true } }),
  ]);

  const lines: Line[] = [];
  for (const item of input.items) {
    const mi = dbItems.find((d) => d.slug === item.slug);
    if (!mi) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `Articolo inesistente: ${item.slug}` },
        { status: 409 }
      );
    }
    if (!mi.available) {
      return NextResponse.json(
        { error: "UNAVAILABLE", message: `Articolo non disponibile: ${mi.nameIt}` },
        { status: 409 }
      );
    }
    const allowed = parseJson<string[]>(mi.addInIds, []);
    const adds = item.addIns
      .filter((a) => allowed.includes(a.key))
      .map((a) => {
        const ai = addInRows.find((x) => x.key === a.key);
        return {
          key: a.key,
          nameIt: ai?.nameIt ?? a.key,
          qty: a.qty,
          price: ai ? round2(ai.price * a.qty) : 0,
        };
      });
    const foodPrice = round2((mi.pricePer100g * item.weightG) / 100);
    const addTotal = round2(adds.reduce((s, a) => s + a.price, 0));
    const k = item.weightG / 100;
    lines.push({
      slug: mi.slug,
      nameIt: mi.nameIt,
      nameEn: mi.nameEn,
      weightG: item.weightG,
      pricePer100g: mi.pricePer100g,
      addIns: adds,
      lineTotal: round2(foodPrice + addTotal),
      macros: {
        kcal: Math.round(mi.kcal * k),
        proteinG: Math.round(mi.proteinG * k),
        fatG: Math.round(mi.fatG * k),
        carbG: Math.round(mi.carbG * k),
        fiberG: Math.round(mi.fiberG * k),
      },
    });
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));

  // ---- Consegna ----
  let deliveryFee = 0;
  let zoneName: string | null = null;
  if (input.fulfillment === "CONSEGNA") {
    if (!input.zone || !input.address) {
      return NextResponse.json(
        { error: "VALIDATION", message: "Zona e indirizzo obbligatori per la consegna" },
        { status: 400 }
      );
    }
    const zone = await db.deliveryZone.findFirst({
      where: { name: input.zone, active: true },
    });
    if (!zone) {
      return NextResponse.json(
        { error: "ZONE_INVALID", message: "Zona di consegna non attiva" },
        { status: 400 }
      );
    }
    if (subtotal < zone.minOrder) {
      return NextResponse.json(
        {
          error: "MIN_ORDER",
          message: `Ordine minimo per ${zone.name}: ${zone.minOrder.toFixed(2)} EUR`,
        },
        { status: 400 }
      );
    }
    deliveryFee = zone.fee;
    zoneName = zone.name;
  }

  // ---- Coupon ----
  let discount = 0;
  let couponCode: string | null = null;
  let couponId: string | null = null;
  if (input.couponCode) {
    const c = await db.coupon.findUnique({
      where: { code: input.couponCode.trim().toUpperCase() },
    });
    const now = new Date();
    const valid =
      c &&
      c.active &&
      c.validFrom <= now &&
      (!c.validTo || c.validTo >= now) &&
      subtotal >= c.minOrder &&
      (!c.maxUses || c.usedCount < c.maxUses);
    if (!valid) {
      return NextResponse.json(
        { error: "COUPON_INVALID", message: "Codice sconto non valido o scaduto" },
        { status: 400 }
      );
    }
    discount =
      c.type === "PERCENT"
        ? round2((subtotal * c.value) / 100)
        : Math.min(c.value, subtotal);
    couponCode = c.code;
    couponId = c.id;
  }

  const total = round2(Math.max(0, subtotal - discount + deliveryFee));

  // ---- Pagamento ----
  let paymentStatus = "IN_ATTESA";
  if (input.paymentMethod === "STRIPE_TEST") {
    // Produzione: crea PaymentIntent Stripe e verifica esito 3DS SCA via
    // webhook firmato. Sandbox: autorizzazione simulata (paymentToken mock).
    paymentStatus = "PAGATO";
  }

  // ---- Riepilogo nutrizionale aggregato ----
  const nutrition = lines.reduce(
    (acc, l) => ({
      kcal: acc.kcal + l.macros.kcal,
      proteinG: acc.proteinG + l.macros.proteinG,
      fatG: acc.fatG + l.macros.fatG,
      carbG: acc.carbG + l.macros.carbG,
      fiberG: acc.fiberG + l.macros.fiberG,
    }),
    { kcal: 0, proteinG: 0, fatG: 0, carbG: 0, fiberG: 0 }
  );

  const session = await getCustomerSession();

  const order = await db.order.create({
    data: {
      orderNumber: orderNumber(),
      customerId: session?.customer.id ?? null,
      nameEnc: encryptField(input.name),
      emailEnc: encryptField(input.email),
      phoneEnc: encryptField(input.phone),
      addressEnc: encryptField(input.fulfillment === "CONSEGNA" ? input.address : null),
      fulfillment: input.fulfillment,
      zone: zoneName,
      items: JSON.stringify(lines),
      subtotal,
      deliveryFee,
      discount,
      couponCode,
      total,
      paymentMethod: input.paymentMethod,
      paymentStatus,
      status: "RICEVUTO",
      nutritionSummary: JSON.stringify(nutrition),
      ipHash: sha256(getClientIp(req)).slice(0, 24),
    },
  });

  if (couponId) {
    await db.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    });
  }

  return NextResponse.json({
    ok: true,
    order: {
      orderNumber: order.orderNumber,
      total,
      subtotal,
      discount,
      deliveryFee,
      paymentStatus,
      status: order.status,
      lines,
      nutrition,
      createdAt: order.createdAt,
    },
  });
}

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Accesso richiesto" }, { status: 401 });
  }
  const orders = await db.order.findMany({
    where: { customerId: session.customer.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    orders: orders.map((o) => ({
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      status: o.status,
      paymentStatus: o.paymentStatus,
      fulfillment: o.fulfillment,
      total: o.total,
      items: JSON.parse(o.items),
      nutrition: JSON.parse(o.nutritionSummary || "{}"),
    })),
  });
}
