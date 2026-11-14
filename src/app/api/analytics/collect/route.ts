// =====================================================================
// POST /api/analytics/collect - Raccolta eventi analytics prima parte
//
// GDPR by design: il client inva SOLO se l'utente ha acconsentito
// (opt-in). Nessun cookie, IP anonimizzato (ultimi octet azzerati),
// pseudonimo giornaliero non persistente, retention 24 mesi.
// In produzione con più istanze: sostituire con Plausible self-hosted.
// =====================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardRate, parseBody } from "@/lib/api";
import { analyticsCollectSchema } from "@/lib/validation";
import { anonymizeIp, dailyVisitorHash, getClientIp, getUserAgent } from "@/lib/security";

// Parsing UA minimale lato server (nessuna dipendenza esterna)
function parseUa(ua: string) {
  const device = /iPad|Tablet/i.test(ua)
    ? "tablet"
    : /Mobi|Android.*Mobile/i.test(ua)
      ? "mobile"
      : "desktop";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Altro";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad|iOS/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Altro";
  return { device, browser, os };
}

function normalizeReferrer(ref: string | null | undefined): string {
  if (!ref) return "direct";
  try {
    const u = new URL(ref);
    const h = u.hostname.replace(/^www\./, "");
    if (/google|bing|duckduckgo|ecosia|search/.test(h)) return "organic";
    if (/instagram|facebook|tiktok|linkedin|pinterest|twitter|x\.com/.test(h)) return "social";
    if (/ads|adwords|cpc|meta\.com\/ads/.test(h)) return "paid";
    return `referral: ${h}`;
  } catch {
    return "direct";
  }
}

export async function POST(req: Request) {
  const rl = guardRate(req, "analytics");
  if (rl) return rl;

  const { data, error } = await parseBody(req, analyticsCollectSchema);
  if (error) return error;

  const ip = anonymizeIp(getClientIp(req));
  const ua = getUserAgent(req);
  const visitorHash = dailyVisitorHash(getClientIp(req), ua);
  const { device, browser, os } = parseUa(ua);
  // Nota produzione: la geo-localizzazione a livello REGIONE avviene con
  // DB MaxMind self-hosted (nessuna chiamata esterna). In sandbox la
  // regione è NULL per gli eventi live; i dati demo la includono.
  const region = null;

  await db.analyticsEvent.createMany({
    data: data.events.map((e) => ({
      type: e.type,
      path: e.path.slice(0, 200),
      title: e.title ?? null,
      visitorHash,
      referrer: normalizeReferrer(e.referrer),
      device,
      browser,
      os,
      region,
      name: e.name ?? null,
    })),
  });

  return NextResponse.json({ ok: true });
}
