// =====================================================================
// api.ts - Helper comuni per le route handlers
// - Rate limiting centralizzato (OWASP A04)
// - CSRF double-submit cookie (OWASP A05): proxy-safe, richiesto su
//   tutte le richieste state-changing
// - Parsing+validazione Zod (OWASP A03)
// =====================================================================
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ZodType } from "zod";
import { LIMITS, limitResponse, rateLimit } from "./rate-limit";
import { getClientIp, randomToken } from "./security";

export const CSRF_COOKIE = "sch_csrf";

// ------------------------- Rate limiting -----------------------------

export function guardRate(
  req: Request,
  bucket: keyof typeof LIMITS,
  extraKey?: string
): NextResponse | null {
  const ip = getClientIp(req);
  const cfg = LIMITS[bucket];
  const rl = rateLimit(`${bucket}:${extraKey ?? ip}`, cfg.max, cfg.window);
  return rl.ok ? null : limitResponse(rl.retryAfterSec);
}

// ------------------------------- CSRF --------------------------------

export async function ensureCsrfCookie(res: NextResponse): Promise<void> {
  const jar = await cookies();
  if (!jar.get(CSRF_COOKIE)?.value) {
    res.cookies.set(CSRF_COOKIE, randomToken(18), {
      httpOnly: false, // deve essere leggibile dal client per il double-submit
      sameSite: "strict",
      path: "/",
      maxAge: 24 * 3600,
    });
  }
}

export async function guardCsrf(req: Request): Promise<NextResponse | null> {
  const jar = await cookies();
  const cookieToken = jar.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get("x-csrf-token");
  if (
    !cookieToken ||
    !headerToken ||
    cookieToken.length < 16 ||
    cookieToken !== headerToken
  ) {
    return NextResponse.json(
      { error: "CSRF", message: "Token CSRF mancante o non valido" },
      { status: 403 }
    );
  }
  return null;
}

// --------------------------- Validazione -----------------------------

export async function parseBody<T>(
  req: Request,
  schema: ZodType<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        { error: "BAD_JSON", message: "Corpo della richiesta non valido" },
        { status: 400 }
      ),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      data: null,
      error: NextResponse.json(
        {
          error: "VALIDATION",
          message: first
            ? `${first.path.join(".") || "input"}: ${first.message}`
            : "Dati non validi",
        },
        { status: 400 }
      ),
    };
  }
  return { data: parsed.data, error: null };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
