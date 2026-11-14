// =====================================================================
// POST /api/coupon/validate - Validazione codice sconto al checkout
// =====================================================================
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guardRate, parseBody, round2 } from "@/lib/api";

const schema = z.object({
  code: z.string().min(2).max(30),
  subtotal: z.number().min(0).max(10000),
});

export async function POST(req: Request) {
  const rl = guardRate(req, "api");
  if (rl) return rl;

  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  const c = await db.coupon.findUnique({
    where: { code: data.code.trim().toUpperCase() },
  });
  const now = new Date();
  if (
    !c ||
    !c.active ||
    c.validFrom > now ||
    (c.validTo && c.validTo < now) ||
    (c.maxUses && c.usedCount >= c.maxUses)
  ) {
    return NextResponse.json({ valid: false, message: "Codice non valido o scaduto" });
  }
  if (data.subtotal < c.minOrder) {
    return NextResponse.json({
      valid: false,
      message: `Ordine minimo ${c.minOrder.toFixed(2)} EUR per questo codice`,
    });
  }
  const discount =
    c.type === "PERCENT" ? round2((data.subtotal * c.value) / 100) : Math.min(c.value, data.subtotal);
  return NextResponse.json({
    valid: true,
    code: c.code,
    type: c.type,
    value: c.value,
    discount,
  });
}
