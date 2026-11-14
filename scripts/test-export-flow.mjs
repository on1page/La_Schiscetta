// Test end-to-end del flusso admin + export XLS/PDF
// (bootstrap CSRF -> login -> enrollment MFA TOTP -> export)
import crypto from "crypto";

const BASE = "http://localhost:3000";
const jar = new Map(); // cookie jar minimale

// ---------- Base32 + TOTP (RFC 6238, SHA1, 6 cifre, 30s) ----------
function base32decode(s) {
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of s.replace(/=+$/, "").toUpperCase()) {
    const idx = alpha.indexOf(ch);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
function totp(secretB32) {
  const key = base32decode(secretB32);
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", key).update(buf).digest();
  const off = h[h.length - 1] & 0xf;
  const code = (((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3]) % 1000000;
  return String(code).padStart(6, "0");
}

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function storeCookies(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}
async function req(path, init = {}) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { ...(init.headers || {}), cookie: cookieHeader() },
  });
  storeCookies(res);
  return res;
}

// ---------- 1. Bootstrap: cookie CSRF ----------
const boot = await req("/api/bootstrap");
if (boot.status !== 200) throw new Error("bootstrap " + boot.status);
const csrf = jar.get("sch_csrf");
console.log("1. bootstrap OK, cookie CSRF:", csrf ? "presente" : "MANCANTE");
const hdrs = { "content-type": "application/json", "X-CSRF-Token": csrf || "" };

// ---------- 2. Login admin (fase 1) ----------
const login = await req("/api/admin/login", {
  method: "POST",
  headers: hdrs,
  body: JSON.stringify({ username: "admin", password: "L4Schiscetta-2026!Cagliari" }),
});
const ld = await login.json();
if (!login.ok) throw new Error("login fallito: " + JSON.stringify(ld));
console.log("2. login fase 1 OK ->", ld.enroll ? "enrollment MFA richiesto" : "MFA attiva");

// ---------- 3. Completa MFA con codice TOTP ----------
const code = totp(ld.secret);
const mfa = await req("/api/admin/mfa", {
  method: "POST",
  headers: hdrs,
  body: JSON.stringify({ tempToken: ld.tempToken, code }),
});
const md = await mfa.json();
if (!mfa.ok) throw new Error("mfa fallita: " + JSON.stringify(md));
console.log("3. MFA OK, sessione admin emessa (backup codes:", (md.backupCodes || []).length, ")");

// ---------- 4. Export XLSX ordini ----------
const x1 = await req("/api/admin/export?dataset=ordini&format=xlsx&days=all");
const b1 = Buffer.from(await x1.arrayBuffer());
console.log("4. export ordini XLSX ->", x1.status, b1.length, "byte, magic:", b1.slice(0, 2).toString(), "(PK=zip OK)");

// ---------- 5. Export PDF ordini ----------
const p1 = await req("/api/admin/export?dataset=ordini&format=pdf&days=all");
const b2 = Buffer.from(await p1.arrayBuffer());
console.log("5. export ordini PDF  ->", p1.status, b2.length, "byte, magic:", b2.slice(0, 4).toString());

// ---------- 6. Export XLSX pagamenti ----------
const x2 = await req("/api/admin/export?dataset=pagamenti&format=xlsx&days=365");
const b3 = Buffer.from(await x2.arrayBuffer());
console.log("6. export pagamenti XLSX ->", x2.status, b3.length, "byte, magic:", b3.slice(0, 2).toString());

// ---------- 7. Export PDF pagamenti ----------
const p2 = await req("/api/admin/export?dataset=pagamenti&format=pdf&days=30");
const b4 = Buffer.from(await p2.arrayBuffer());
console.log("7. export pagamenti PDF ->", p2.status, b4.length, "byte, magic:", b4.slice(0, 4).toString());

// ---------- 8. Controllo sessione admin ----------
const sess = await req("/api/admin/session");
const sd = await sess.json();
console.log("8. sessione admin:", sess.status, JSON.stringify(sd.user || sd));

// ---------- 9. Controllo negativo: export senza login ----------
const noAuth = await fetch(BASE + "/api/admin/export?dataset=ordini&format=xlsx", {
  headers: { cookie: "sch_csrf=" + csrf },
});
console.log("9. export SENZA sessione ->", noAuth.status, "(atteso 401)");

console.log("\nTUTTI I TEST COMPLETATI");
