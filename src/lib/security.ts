// =====================================================================
// security.ts - Primitive di sicurezza
// OWASP A02 (Cryptographic Failures) + A07 (Identification & Auth)
// - Password: argon2id (64MB, 3 iterazioni, parallelismo 1)
// - Sessioni: JWT HS256 firmati server-side (httpOnly cookie)
// - MFA: TOTP RFC 6238 (SHA-1, 6 cifre, finestra ±30s)
// - Dati personali: AES-256-GCM a riposo
// - GDPR: anonimizzazione IP e pseudonimi giornalieri
// =====================================================================
import crypto from "crypto";
import { hash, verify } from "@node-rs/argon2";

// ------------------------------ Segreti ------------------------------
// In produzione: secret manager (Doppler/Vault). Mai valori hardcoded.
const AUTH_SECRET =
  process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me";
const ENC_KEY_HEX =
  process.env.APP_ENCRYPTION_KEY || "";

// Chiave AES-256 derivata in modo deterministico se non fornita (solo dev)
const ENC_KEY = ENC_KEY_HEX
  ? Buffer.from(ENC_KEY_HEX, "hex")
  : crypto.createHash("sha256").update("dev-fallback-encryption-key").digest();

// --------------------------- Argon2id --------------------------------
const ARGON2_OPTS = {
  algorithm: 2, // argon2id
  memorySize: 65536, // 64 MB
  iterations: 3,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTS);
}

export async function verifyPassword(
  digest: string,
  plain: string
): Promise<boolean> {
  try {
    return await verify(digest, plain, ARGON2_OPTS);
  } catch {
    return false;
  }
}

// ------------------------------ JWT ----------------------------------
// JWT HS256 firmato con AUTH_SECRET. Supporta scadenza scorrevole
// (sliding) con tetto assoluto (maxAgeSec).

export type JwtPayload = {
  sub: string;
  typ: "admin" | "customer" | "mfa_pending";
  role?: string;
  ver?: number;
  jti: string;
  iat: number;
  exp: number;
  abs?: number; // scadenza assoluta (login originale + maxAge)
};

function b64u(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signJwt(
  payload: Omit<JwtPayload, "jti" | "iat" | "exp">,
  ttlSec: number
): string {
  const now = Math.floor(Date.now() / 1000);
  const full: JwtPayload = {
    ...payload,
    jti: crypto.randomBytes(12).toString("hex"),
    iat: now,
    exp: now + ttlSec,
    abs: payload.abs ?? now + 8 * 3600, // max 8 ore dalla prima emissione
  };
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify(full));
  const sig = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(`${head}.${body}`)
    .digest("base64url");
  return `${head}.${body}.${sig}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const [head, body, sig] = token.split(".");
    if (!head || !body || !sig) return null;
    const expected = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(`${head}.${body}`)
      .digest("base64url");
    // confronto a tempo costante
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    if (payload.abs && payload.abs < now) return null;
    return payload;
  } catch {
    return null;
  }
}

// ------------------------------ TOTP ---------------------------------
// RFC 6238: SHA-1, 6 cifre, passo 30s. Compatibile con Google
// Authenticator / Authy. Segreto conservato cifrato AES-256-GCM.

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(bytes = 20): string {
  const buf = crypto.randomBytes(bytes);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function b32decode(secret: string): Buffer {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of secret.replace(/=+$/, "").toUpperCase()) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function totpCode(secret: string, step?: number): string {
  const counter = Math.floor((step ?? Date.now() / 1000) / 30);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter % 2 ** 32, 4);
  const hmac = crypto.createHmac("sha1", b32decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

export function verifyTotp(code: string, secret: string, window = 1): boolean {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const t = Math.floor(Date.now() / 1000);
  for (let i = -window; i <= window; i++) {
    if (totpCode(secret, t + i * 30) === clean) return true;
  }
  return false;
}

export function otpauthUri(secret: string, account: string, issuer: string) {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
    account
  )}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// ------------------------- AES-256-GCM a riposo ----------------------
// Formato: v1:<iv-b64url>:<tag-b64url>:<ciphertext-b64url>

export function encryptField(plain: string | null | undefined): string {
  if (plain === null || plain === undefined) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const enc = Buffer.concat([
    cipher.update(String(plain), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

export function decryptField(payload: string | null | undefined): string {
  if (!payload) return "";
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") return payload ?? "";
  try {
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const data = Buffer.from(parts[3], "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

// --------------------------- Backup codes ----------------------------
export function generateBackupCodes(n = 8): string[] {
  return Array.from({ length: n }, () =>
    crypto.randomBytes(5).toString("hex").toUpperCase().match(/.{1,5}/g)!.join("-")
  );
}

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

// ------------------------- GDPR: IP e pseudonimi ---------------------
// Anonimizzazione IP (Provvedimento Garante 231/2021):
// IPv4 -> ultimi octet azzerati; IPv6 -> troncato a /48.
export function anonymizeIp(ip: string): string {
  if (ip.includes(":")) {
    const parts = ip.split(":").slice(0, 3);
    while (parts.length < 3) parts.push("0");
    return `${parts.join("")}::`;
  }
  const seg = ip.split(".");
  if (seg.length === 4) return `${seg[0]}.${seg[1]}.${seg[2]}.0`;
  return "0.0.0.0";
}

// Pseudonimo giornaliero non persistente (no user ID persistente GDPR)
export function dailyVisitorHash(ip: string, userAgent: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(`${ip}|${userAgent}|${day}`)
    .digest("hex")
    .slice(0, 32);
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

export function getUserAgent(req: Request): string {
  return (req.headers.get("user-agent") || "unknown").slice(0, 250);
}
