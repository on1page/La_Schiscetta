// =====================================================================
// GET /api/admin/dashboard - KPI gestionali + analytics aggregata
// Accesso: MANAGER+ (spec 4.6/4.7).
// Tutto calcolato server-side; analytics GDPR-compliant (dati demo
// con consenso simulato + eventi live previo opt-in).
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseJson } from "@/lib/json";

type AnalyticsEvent = {
  type: string; path: string; visitorHash: string; referrer: string | null;
  device: string; browser: string | null; os: string | null; region: string | null;
  name: string | null; createdAt: Date;
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const session = await requireAdmin("MANAGER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }

  const url = new URL(req.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get("days") || "30", 10) || 30, 7), 90);
  const since = new Date(Date.now() - days * 86400_000);
  const prevSince = new Date(since.getTime() - days * 86400_000);

  const [orders, events, prevEvents, consents, recentOrders, menuCount, subscribers] =
    await Promise.all([
      db.order.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" } }),
      db.analyticsEvent.findMany({ where: { createdAt: { gte: since } } }),
      db.analyticsEvent.findMany({ where: { createdAt: { gte: prevSince, lt: since } } }),
      db.consentRecord.findMany({ where: { createdAt: { gte: since } } }),
      db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      db.menuItem.count(),
      db.newsletterSubscriber.count({ where: { confirmedAt: { not: null } } }),
    ]);

  // ---- KPI ordini ----
  const todayKey = dayKey(new Date());
  const paidOrders = orders.filter((o) => o.paymentStatus !== "ANNULLATO" && o.status !== "ANNULLATO");
  const revenue = paidOrders.reduce((s, o) => s + o.total, 0);
  const ordersToday = orders.filter((o) => dayKey(o.createdAt) === todayKey).length;
  const avgTicket = paidOrders.length ? revenue / paidOrders.length : 0;

  // ---- Top piatti (aggregazione righe) ----
  const itemCount = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of paidOrders) {
    for (const line of parseJson<
      { nameIt: string; lineTotal: number; weightG: number }[]
    >(o.items, [])) {
      const cur = itemCount.get(line.nameIt) ?? { name: line.nameIt, qty: 0, revenue: 0 };
      cur.qty += 1;
      cur.revenue += line.lineTotal;
      itemCount.set(line.nameIt, cur);
    }
  }
  const topItems = [...itemCount.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);

  // ---- Serie giornaliera analytics ----
  const series = new Map<string, { date: string; visits: Set<string>; pageviews: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = dayKey(new Date(Date.now() - i * 86400_000));
    series.set(d, { date: d, visits: new Set(), pageviews: 0 });
  }
  for (const e of events as AnalyticsEvent[]) {
    if (e.type !== "pageview") continue;
    const s = series.get(dayKey(e.createdAt));
    if (s) {
      s.pageviews += 1;
      s.visits.add(e.visitorHash);
    }
  }
  const daily = [...series.values()].map((s) => ({
    date: s.date,
    visite: s.visits.size,
    pagine: s.pageviews,
  }));

  // ---- Sorgenti / pagine / dispositivi / regioni / browser / OS ----
  const count = (list: (string | null | undefined)[]) => {
    const m = new Map<string, number>();
    for (const k of list) {
      const key = k || "direct";
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };

  const sources = count(events.map((e) => e.referrer));
  const pages = count(events.filter((e) => e.type === "pageview").map((e) => e.path)).slice(0, 10);
  const devices = count(events.map((e) => e.device));
  const browsers = count(events.map((e) => e.browser));
  const osList = count(events.map((e) => e.os));
  const regions = count(events.map((e) => e.region));

  // ---- Eventi custom ----
  const customEvents = count(
    events.filter((e) => e.type === "event").map((e) => e.name)
  );

  // ---- Funnel conversione ----
  const pathCount = (p: string) =>
    events.filter((e) => e.type === "pageview" && e.path === p).length;
  const homeViews = pathCount("/");
  const menuViews = pathCount("/menu");
  const dishViews = events.filter(
    (e) => e.type === "pageview" && e.path.startsWith("/piatto/")
  ).length;
  const checkoutViews = pathCount("/ordina");
  const ordersCount = orders.length;
  const funnel = [
    { step: "Home", value: homeViews },
    { step: "Menu", value: menuViews },
    { step: "Piatto", value: dishViews },
    { step: "Checkout", value: checkoutViews },
    { step: "Ordine", value: ordersCount },
  ];

  // ---- Confronto periodo precedente ----
  const prevVisits = new Set(prevEvents.map((e) => `${dayKey(e.createdAt)}:${e.visitorHash}`)).size;
  const curVisits = daily.reduce((s, d) => s + d.visite, 0);
  const visitsDelta = prevVisits ? Math.round(((curVisits - prevVisits) / prevVisits) * 100) : null;

  // ---- Consensi cookie ----
  const consentStats = {
    total: consents.length,
    analytics: consents.filter((c) => c.analytics).length,
    marketing: consents.filter((c) => c.marketing).length,
    rejected: consents.filter((c) => !c.analytics && !c.marketing).length,
  };

  return NextResponse.json({
    kpi: {
      ordersTotal: orders.length,
      ordersToday,
      revenue: Math.round(revenue * 100) / 100,
      avgTicket: Math.round(avgTicket * 100) / 100,
      menuCount,
      subscribers,
      visits: curVisits,
      visitsDelta,
    },
    topItems,
    daily,
    sources,
    pages,
    devices,
    browsers,
    os: osList,
    regions,
    customEvents,
    funnel,
    consentStats,
    recentOrders: recentOrders.map((o) => ({
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      status: o.status,
      paymentStatus: o.paymentStatus,
      total: o.total,
      fulfillment: o.fulfillment,
    })),
  });
}
