// =====================================================================
// auth.ts - Gestione sessioni (JWT in cookie httpOnly)
// Admin: SameSite=Strict, 30 min di inattività, max 8 ore (sliding).
// OWASP A01: RBAC lato server su ogni richiesta, minimo privilegio.
// =====================================================================
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signJwt, verifyJwt, type JwtPayload } from "./security";
import { db } from "./db";
import type { AdminUser, Customer } from "@prisma/client";

export const ADMIN_COOKIE = "sch_admin_session";
export const CUSTOMER_COOKIE = "sch_session";

export const ADMIN_IDLE_SEC = 30 * 60; // 30 minuti di inattività
export const ADMIN_ABS_SEC = 8 * 3600; // massimo 8 ore
export const CUSTOMER_SEC = 7 * 24 * 3600;

export type AdminRole = "SUPERADMIN" | "MANAGER" | "EDITOR" | "VIEWER";

// Gerarchia RBAC: ogni ruolo include i privilegi dei successivi
const ROLE_RANK: Record<AdminRole, number> = {
  SUPERADMIN: 4,
  MANAGER: 3,
  EDITOR: 2,
  VIEWER: 1,
};

export function roleAtLeast(role: string, min: AdminRole): boolean {
  const r = ROLE_RANK[role as AdminRole] ?? 0;
  return r >= ROLE_RANK[min];
}

function isSecureRequest(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}

// --------------------------- Emissione -------------------------------

export function issueAdminSession(
  res: NextResponse,
  req: Request,
  user: Pick<AdminUser, "id" | "role" | "sessionVersion">
) {
  const token = signJwt(
    { sub: user.id, typ: "admin", role: user.role, ver: user.sessionVersion },
    ADMIN_IDLE_SEC
  );
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_ABS_SEC,
  });
  return res;
}

export function issueCustomerSession(
  res: NextResponse,
  req: Request,
  customer: Pick<Customer, "id">
) {
  const token = signJwt({ sub: customer.id, typ: "customer" }, CUSTOMER_SEC);
  res.cookies.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: "lax",
    path: "/",
    maxAge: CUSTOMER_SEC,
  });
  return res;
}

export function clearSession(res: NextResponse, admin = false) {
  res.cookies.set(admin ? ADMIN_COOKIE : CUSTOMER_COOKIE, "", {
    httpOnly: true,
    sameSite: admin ? "strict" : "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

// ---------------------------- Lettura --------------------------------

async function readToken(name: string): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(name)?.value;
}

export type AdminSession = { user: AdminUser; payload: JwtPayload };

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = await readToken(ADMIN_COOKIE);
  if (!token) return null;
  const payload = verifyJwt(token);
  if (!payload || payload.typ !== "admin") return null;
  const user = await db.adminUser.findUnique({ where: { id: payload.sub } });
  if (!user || !user.active) return null;
  // OWASP A01: il JWT è ri-validato contro il DB ad ogni richiesta;
  // sessionVersion consente il logout forzato da remoto.
  if (payload.ver !== user.sessionVersion) return null;
  if (user.lockedUntil && user.lockedUntil > new Date()) return null;
  return { user, payload };
}

export async function requireAdmin(
  minRole: AdminRole = "VIEWER"
): Promise<AdminSession | null> {
  const session = await getAdminSession();
  if (!session) return null;
  if (!roleAtLeast(session.user.role, minRole)) return null;
  return session;
}

export type CustomerSession = { customer: Customer };

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const token = await readToken(CUSTOMER_COOKIE);
  if (!token) return null;
  const payload = verifyJwt(token);
  if (!payload || payload.typ !== "customer") return null;
  const customer = await db.customer.findUnique({ where: { id: payload.sub } });
  if (!customer) return null;
  return { customer };
}

// ------------------------------ CSRF ---------------------------------
// OWASP A05/A01: per le richieste state-changing verifica che l'Origin
// (o Referer) corrisponda all'host della richiesta (SameSite + doppio
// check). Se assenti entrambi, la richiesta viene rifiutata.

export function sameOriginOk(req: Request): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const allowed = new Set<string>([host]);
  // il gateway di preview può presentsi con host diversi
  const fxHost = req.headers.get("x-forwarded-host");
  if (fxHost) allowed.add(fxHost);
  try {
    const u = new URL(req.url);
    allowed.add(u.host);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      allowed.add("localhost:3000");
      allowed.add("127.0.0.1:3000");
    }
  } catch {
    /* ignore */
  }
  const source = origin || referer;
  if (!source) return false;
  try {
    const su = new URL(source);
    return allowed.has(su.host);
  } catch {
    return false;
  }
}

export function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: code ?? "BAD_REQUEST", message }, { status });
}
