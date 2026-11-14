// =====================================================================
// rate-limit.ts - Rate limiting in-memory a finestra scorrevole
// OWASP A04 (Insecure Design): limiti per endpoint sensibile.
// In produzione multi-istanza: sostituire con Redis/Upstash.
// =====================================================================

type Bucket = { count: number; resetAt: number; blockedUntil?: number };

const store = new Map<string, Bucket>();

// Pulizia periodica per evitare memory leak
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  if (Date.now() - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = Date.now();
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.resetAt < now && (!v.blockedUntil || v.blockedUntil < now)) {
      store.delete(k);
    }
  }
}

export type LimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function rateLimit(key: string, limit: number, windowMs: number): LimitResult {
  cleanup();
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
  return { ok: bucket.count <= limit, remaining, retryAfterSec };
}

// Configurazione centralizzata (spec: login 5/15min, checkout 10/min, reset 3/ora)
export const LIMITS = {
  login: { max: 5, window: 15 * 60 * 1000 },
  mfa: { max: 10, window: 15 * 60 * 1000 },
  checkout: { max: 10, window: 60 * 1000 },
  register: { max: 5, window: 60 * 60 * 1000 },
  reset: { max: 3, window: 60 * 60 * 1000 },
  api: { max: 100, window: 60 * 1000 },
  contact: { max: 5, window: 60 * 60 * 1000 },
  newsletter: { max: 5, window: 60 * 60 * 1000 },
  analytics: { max: 120, window: 60 * 1000 },
  consent: { max: 30, window: 60 * 1000 },
  export: { max: 10, window: 5 * 60 * 1000 },
} as const;

export function limitResponse(retryAfterSec: number): Response {
  return new Response(
    JSON.stringify({
      error: "RATE_LIMITED",
      message: "Troppe richieste. Riprova più tardi.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}
