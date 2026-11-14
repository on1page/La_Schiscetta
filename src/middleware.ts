// =====================================================================
// middleware.ts - Security headers globali (OWASP A05)
// CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy.
// In sviluppo Next.js richiede unsafe-eval/unsafe-inline per HMR;
// in produzione la CSP è nonce-based e restrittiva (spec 5.3).
// =====================================================================
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const isDev = process.env.NODE_ENV !== "production";

  // Nonce generato ad ogni richiesta server-side (Web Crypto, Edge-safe)
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes, (b) => b.toString(16).padStart(2, "0")).join("");

  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : `'self' 'nonce-${nonce}'`;

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    // mappa OpenStreetMap (embed senza cookie, GDPR-friendly)
    "frame-src https://www.openstreetmap.org",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), interest-cohort=()"
  );
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("X-Permitted-Cross-Domain-Policies", "none");

  // il nonce è reso disponibile a Next per firmare i propri script
  res.headers.set("x-nonce", nonce);
  return res;
}

export const config = {
  matcher: [
    // tutti tranne asset statici
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|icon.png).*)",
  ],
};
