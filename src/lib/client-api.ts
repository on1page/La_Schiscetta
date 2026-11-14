// =====================================================================
// client-api.ts - Client HTTP per la SPA
// - CSRF double-submit header automatico
// - Tracking analytics SOLO previo consenso (Garante 231/2021)
// - Nessun dato personale inviato senza necessità
// =====================================================================
"use client";

export type ConsentState = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  ts: string;
};

export const CONSENT_KEY = "sch_consent";
export const LANG_COOKIE = "i18n_lang";

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const exp = new Date(Date.now() + days * 86400_000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax`;
}

export function getConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as ConsentState) : null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  const csrf = getCookie("sch_csrf");
  if (csrf) headers["X-CSRF-Token"] = csrf;

  // Timeout di rete: una richiesta non può restare appesa per sempre
  // (tab ibernati dal browser, connessioni morte). 20 s poi abort.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers,
      credentials: "same-origin",
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Richiesta interrotta (timeout di rete)", 0, "NETWORK_TIMEOUT");
    }
    throw new ApiError("Errore di rete", 0, "NETWORK_ERROR");
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (data as { message?: string }).message || "Errore di rete",
      res.status,
      (data as { error?: string }).error || "ERROR"
    );
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }),
};

// ------------------- Analytics (consenso-gated) ----------------------

let pending: { type: "pageview" | "event"; path: string; title?: string; referrer?: string; name?: string }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  flushTimer = null;
  if (pending.length === 0) return;
  const events = pending;
  pending = [];
  api
    .post("/api/analytics/collect", { events })
    .catch(() => {
      /* analytics non deve mai rompere l'UX */
    });
}

function track(event: {
  type: "pageview" | "event";
  path: string;
  title?: string;
  referrer?: string;
  name?: string;
}) {
  const consent = getConsent();
  if (!consent?.analytics) return; // GDPR: nessuna raccolta senza opt-in
  pending.push(event);
  if (!flushTimer) flushTimer = setTimeout(flush, 1500);
}

export function trackPageview(path: string, title?: string) {
  track({ type: "pageview", path, title, referrer: document.referrer || undefined });
}

export function trackEvent(name: string, path = "/") {
  track({ type: "event", path, name });
}

export function saveConsentAndNotify(consent: {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}) {
  const state: ConsentState = {
    ...consent,
    ts: new Date().toISOString(),
  };
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
  // Registro del consenso lato server (12 mesi, pseudonimo non identificativo)
  api
    .post("/api/consent", { ...consent, policyVersion: "1.0" })
    .catch(() => undefined);
}
