// =====================================================================
// test-export.ts - Test end-to-end della nuova API export.
// Esegue il login admin completo (password + TOTP decifrato dal DB
// locale di sviluppo), poi scarica i 4 export e verifica intestazioni
// e contenuto dei file. Solo per uso in sandbox di sviluppo.
// Avvio: bun scripts/test-export.ts
// =====================================================================
import { db } from "../src/lib/db";
import { decryptField, totpCode } from "../src/lib/security";
import { writeFileSync, statSync } from "node:fs";

const BASE = "http://localhost:3000";

// ------------------------- helpers -------------------------
let cookieJar = new Map<string, string>();

function storeCookies(res: Response) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) cookieJar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader(): string {
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function csrf(): string {
  return cookieJar.get("sch_csrf") ?? "";
}

// ------------------------- login flow -------------------------
async function adminLogin() {
  // 1) bootstrap per ottenere il cookie CSRF
  const b = await fetch(`${BASE}/api/bootstrap`);
  storeCookies(b);
  console.log("[1] bootstrap:", b.status, "csrf:", csrf() ? "ok" : "MANCANTE");

  const user = await db.adminUser.findUnique({ where: { username: "admin" } });
  if (!user) throw new Error("utente admin non trovato nel DB");
  const secret = decryptField(user.totpSecretEnc);
  const code = totpCode(secret);
  console.log("[2] TOTP generato per admin, totpEnabled =", user.totpEnabled);

  // 2) login step 1
  const l = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf(), Cookie: cookieHeader() },
    body: JSON.stringify({ username: "admin", password: "L4Schiscetta-2026!Cagliari" }),
  });
  storeCookies(l);
  const lj = (await l.json()) as { ok?: boolean; mfa?: boolean; enroll?: boolean; tempToken?: string };
  console.log("[3] login step1:", l.status, JSON.stringify({ ok: lj.ok, mfa: lj.mfa, enroll: lj.enroll }));
  if (!lj.tempToken) throw new Error("tempToken mancante: " + JSON.stringify(lj));

  // 3) MFA
  const m = await fetch(`${BASE}/api/admin/mfa`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf(), Cookie: cookieHeader() },
    body: JSON.stringify({ tempToken: lj.tempToken, code }),
  });
  storeCookies(m);
  const mj = (await m.json()) as { ok?: boolean; user?: { username: string; role: string } };
  console.log("[4] mfa step2:", m.status, JSON.stringify(mj.user ?? mj));
  if (m.status !== 200) throw new Error("login MFA fallito");
  return mj.user;
}

// ------------------------- export test -------------------------
async function tryExport(params: string, name: string): Promise<{ status: number; type: string; bytes: number }> {
  const res = await fetch(`${BASE}/api/admin/export?${params}`, {
    headers: { Cookie: cookieHeader(), "X-CSRF-Token": csrf() },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  if (res.status === 200) {
    writeFileSync(`/tmp/${name}`, buf);
  }
  console.log(
    `[export] ${name}: ${res.status} ${res.headers.get("content-type")} ${buf.length}B cd="${res.headers.get("content-disposition")}"`
  );
  return { status: res.status, type: res.headers.get("content-type") ?? "", bytes: buf.length };
}

async function main() {
  const u = await adminLogin();

  const xlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const results: Record<string, { status: number; type: string; bytes: number }> = {};

  results.ordiniXlsx = await tryExport("dataset=ordini&format=xlsx&days=all", "ordini.xlsx");
  results.ordiniPdf = await tryExport("dataset=ordini&format=pdf&days=all", "ordini.pdf");
  results.pagamentiXlsx = await tryExport("dataset=pagamenti&format=xlsx&days=30", "pagamenti.xlsx");
  results.pagamentiPdf = await tryExport("dataset=pagamenti&format=pdf&days=365", "pagamenti.pdf");

  // validazioni negative
  results.badDataset = await tryExport("dataset=fatture&format=xlsx", "nope");
  results.badFormat = await tryExport("dataset=ordini&format=csv", "nope");
  results.badDays = await tryExport("dataset=ordini&format=xlsx&days=12", "nope");

  // accesso senza sessione (nuovo jar)
  cookieJar = new Map();
  const anon = await fetch(`${BASE}/api/admin/export?dataset=ordini&format=xlsx`, {
    headers: { "X-CSRF-Token": "x" },
  });
  console.log("[export] senza sessione:", anon.status, "(atteso 401)");
  results.anon = { status: anon.status, type: "", bytes: 0 };

  // ------------------------- asserzioni -------------------------
  const checks: [string, boolean][] = [
    ["ordini XLSX 200 + mime", results.ordiniXlsx.status === 200 && results.ordiniXlsx.type === xlsxMime],
    ["ordini PDF 200 + mime", results.ordiniPdf.status === 200 && results.ordiniPdf.type === "application/pdf"],
    ["pagamenti XLSX 200 + mime", results.pagamentiXlsx.status === 200 && results.pagamentiXlsx.type === xlsxMime],
    ["pagamenti PDF 200 + mime", results.pagamentiPdf.status === 200 && results.pagamentiPdf.type === "application/pdf"],
    ["file non vuoti", Object.values(results).filter(r => r.status === 200).every(r => r.bytes > 1000)],
    ["dataset invalido -> 400", results.badDataset.status === 400],
    ["formato invalido -> 400", results.badFormat.status === 400],
    ["days invalido -> 400", results.badDays.status === 400],
    ["senza sessione -> 401", results.anon.status === 401],
  ];

  console.log("\n===== RISULTATI =====");
  let fail = 0;
  for (const [label, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
    if (!ok) fail += 1;
  }
  console.log(`\nAdmin: ${u?.username} (${u?.role})`);
  console.log(fail === 0 ? "\nTUTTI I TEST PASSATI" : `\n${fail} TEST FALLITI`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERRORE TEST:", e);
  process.exit(1);
});
