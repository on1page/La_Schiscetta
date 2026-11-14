// =====================================================================
// AdminMisc.tsx - Audit log, richieste catering/messaggi, impostazioni
// (password, reset TOTP, gestione utenti backend RBAC) ed export
// report ordini/pagamenti in XLSX e PDF.
// =====================================================================
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/client-api";
import { toast } from "@/hooks/use-toast";
import { Loader2, ScrollText, PartyPopper, Mail, KeyRound, ShieldCheck, Users2, Lock, Search, FileSpreadsheet, FileText, Download } from "lucide-react";

// ------------------------------ AUDIT ------------------------------

type AuditEntry = {
  id: string; actorName: string; action: string; entity: string | null;
  entityId: string | null; before: string | null; after: string | null;
  ip: string | null; userAgent: string | null; createdAt: string;
};

export function AdminAudit() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [entity, setEntity] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<{ logs: AuditEntry[] }>(`/api/admin/audit?entity=${entity}`);
        setLogs(res.logs);
      } finally {
        setLoading(false);
      }
    })();
  }, [entity]);

  const entities = ["ALL", "AdminUser", "MenuItem", "Order", "Customer", "CompanyInfo", "PrivacyPolicy", "CookieDefinition", "CateringRequest"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ScrollText className="h-6 w-6 text-primary" aria-hidden /> Audit log
        </h1>
        <p className="text-sm text-muted-foreground">
          Registro immutabile: ogni azione con utente, timestamp, IP, user agent e payload pre/post · retention 12 mesi
        </p>
      </div>

      <div className="thin-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {entities.map((e) => (
          <button
            key={e}
            onClick={() => setEntity(e)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${entity === e ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"}`}
          >
            {e === "ALL" ? "Tutte" : e}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden /></div>
      ) : (
        <div className="thin-scroll max-h-[70vh] space-y-2 overflow-y-auto pr-1">
          {logs.map((l) => (
            <details key={l.id} className="paper-card p-3.5">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <Badge variant={l.action.includes("FAILED") || l.action.includes("DELETE") ? "destructive" : "secondary"} className="font-data shrink-0">
                  {l.action}
                </Badge>
                <span className="font-semibold">{l.actorName}</span>
                {l.entity && <span className="text-xs text-muted-foreground">{l.entity}</span>}
                <span className="font-data ml-auto text-xs text-muted-foreground">
                  {new Date(l.createdAt).toLocaleString("it-IT")}
                </span>
              </summary>
              <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
                <p>IP: <span className="font-data">{l.ip}</span> · UA: {l.userAgent?.slice(0, 90)}</p>
                {l.before && <pre className="thin-scroll overflow-x-auto rounded bg-secondary p-2 text-[11px]">{l.before}</pre>}
                {l.after && <pre className="thin-scroll overflow-x-auto rounded bg-secondary p-2 text-[11px]">{l.after}</pre>}
              </div>
            </details>
          ))}
          {logs.length === 0 && <p className="py-10 text-center text-muted-foreground">Nessuna voce</p>}
        </div>
      )}
    </div>
  );
}

// --------------------------- CATERING + MESSAGGI ---------------------------

type CateringReq = {
  id: string; name: string; email: string; phone: string | null; company: string | null;
  eventType: string | null; guests: number; date: string | null; message: string;
  status: string; createdAt: string;
};
type Message = { id: string; name: string; email: string; subject: string | null; message: string; status: string; createdAt: string };

const CAT_STATUSES = ["NUOVA", "CONTATTATA", "PREVENTIVO", "CONFERMATA", "CHIUSA"];

export function AdminCatering() {
  const [requests, setRequests] = useState<CateringReq[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ requests: CateringReq[]; messages: Message[] }>("/api/admin/catering");
      setRequests(res.requests);
      setMessages(res.messages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (req: CateringReq, status: string) => {
    try {
      await api.patch(`/api/admin/catering/${req.id}`, { status });
      await load();
    } catch {
      toast({ title: "Aggiornamento non riuscito", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <PartyPopper className="h-6 w-6 text-primary" aria-hidden /> Catering e messaggi
        </h1>
        <p className="text-sm text-muted-foreground">
          {requests.length} richieste · {messages.length} messaggi · PII cifrato a riposo
        </p>
      </div>

      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="paper-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {r.name} {r.company && <span className="text-muted-foreground">· {r.company}</span>}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {r.email} · {r.phone} · {r.guests} persone
                  {r.date && ` · ${new Date(r.date).toLocaleDateString("it-IT")}`}
                </p>
              </div>
              <select
                value={r.status}
                onChange={(e) => setStatus(r, e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                aria-label={`Stato richiesta ${r.name}`}
              >
                {CAT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <p className="mt-3 rounded-lg bg-secondary/50 p-3 text-sm leading-relaxed">{r.message}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Ricevuta il {new Date(r.createdAt).toLocaleString("it-IT")}
            </p>
          </div>
        ))}
        {requests.length === 0 && <p className="paper-card p-6 text-center text-sm text-muted-foreground">Nessuna richiesta</p>}
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
          <Mail className="h-4 w-4 text-primary" aria-hidden /> Messaggi dai contatti
        </h2>
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="paper-card p-4">
              <p className="font-semibold">{m.name} <span className="font-normal text-muted-foreground">· {m.email}</span></p>
              {m.subject && <p className="text-sm font-medium">{m.subject}</p>}
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.message}</p>
              <p className="mt-2 text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString("it-IT")}</p>
            </div>
          ))}
          {messages.length === 0 && <p className="paper-card p-6 text-center text-sm text-muted-foreground">Nessun messaggio</p>}
        </div>
      </div>
    </div>
  );
}

// --------------------------- IMPOSTAZIONI ---------------------------

type AdminUserRow = {
  id: string; username: string; email: string; role: string; active: boolean;
  totpEnabled: boolean; lastLoginAt: string | null; lastLoginIp: string | null;
  lockedUntil: string | null;
};

export function AdminSettings() {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "EDITOR" });

  const loadUsers = async () => {
    try {
      const res = await api.get<{ users: AdminUserRow[] }>("/api/admin/users");
      setUsers(res.users);
    } catch {
      setUsers(null); // non SuperAdmin
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const changePassword = async () => {
    if (pw.next !== pw.confirm) {
      toast({ title: "Le password non coincidono" });
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/admin/password", { currentPassword: pw.current, newPassword: pw.next });
      toast({ title: "Password aggiornata", description: "Tutte le sessioni sono state revocate: accedi di nuovo." });
      setPw({ current: "", next: "", confirm: "" });
    } catch (err) {
      toast({ title: "Cambio password non riuscito", description: err instanceof ApiError ? err.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const resetTotp = async () => {
    const current = window.prompt("Conferma con la password attuale per reimpostare la MFA:");
    if (!current) return;
    try {
      await api.post("/api/admin/totp-reset", { currentPassword: current });
      toast({ title: "MFA reimpostata", description: "Al prossimo login dovrai rifare l'enrollment." });
    } catch (err) {
      toast({ title: "Reset non riuscito", description: err instanceof ApiError ? err.message : "", variant: "destructive" });
    }
  };

  const createUser = async () => {
    setBusy(true);
    try {
      await api.post("/api/admin/users", newUser);
      toast({ title: "Utente creato", description: `${newUser.username} (${newUser.role}): dovrà configurare la MFA al primo accesso.` });
      setNewUser({ username: "", email: "", password: "", role: "EDITOR" });
      await loadUsers();
    } catch (err) {
      toast({ title: "Creazione non riuscita", description: err instanceof ApiError ? err.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const patchUser = async (user: AdminUserRow, patch: Record<string, unknown>) => {
    try {
      await api.patch(`/api/admin/users/${user.id}`, patch);
      await loadUsers();
      toast({ title: "Utente aggiornato" });
    } catch (err) {
      toast({ title: "Aggiornamento non riuscito", description: err instanceof ApiError ? err.message : "", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Impostazioni e sicurezza</h1>
        <p className="text-sm text-muted-foreground">Gestione credenziali, MFA e utenti del backend</p>
      </div>

      <AdminExportCard />

      <div className="paper-card p-5">
        <h2 className="flex items-center gap-2 text-base font-bold"><KeyRound className="h-4 w-4 text-primary" aria-hidden /> Cambio password</h2>
        <p className="mt-1 text-sm text-muted-foreground">Minimo 14 caratteri con maiuscole, minuscole, numeri e simboli. Il cambio revoca tutte le sessioni attive.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="st-cur">Password attuale</Label>
            <Input id="st-cur" type="password" className="mt-1 h-10" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="st-new">Nuova password</Label>
            <Input id="st-new" type="password" className="mt-1 h-10" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="st-conf">Conferma</Label>
            <Input id="st-conf" type="password" className="mt-1 h-10" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          </div>
        </div>
        <Button className="mt-4 gap-2" disabled={busy} onClick={changePassword}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Aggiorna password
        </Button>
      </div>

      <div className="paper-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> Autenticazione a due fattori</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reimposta il segreto TOTP (ad es. telefono nuovo). Le sessioni attive verranno revocate.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={resetTotp}>
          <RotateCcwIcon className="h-4 w-4" aria-hidden /> Reset MFA
        </Button>
      </div>

      <div className="paper-card p-5">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Lock className="h-4 w-4 text-primary" aria-hidden /> Postura di sicurezza attiva
        </h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {[
            "Password hashate con argon2id (64MB, 3 iterazioni)",
            "Sessioni JWT httpOnly, SameSite=Strict, 30 min",
            "MFA TOTP obbligatoria + backup codes monouso",
            "Lockout 5 tentativi (15 minuti)",
            "Rate limiting login/checkout/form (OWASP A04)",
            "CSRF double-submit su ogni form",
            "Validazione Zod server-side su ogni endpoint",
            "CSP, HSTS, X-Frame-Options DENY, Permissions-Policy",
            "Audit log immutabile con IP e user agent",
            "PII cifrato AES-256-GCM a riposo",
            "IP anonimizzati negli analytics (231/2021)",
            "Prezzi e totali sempre ricalcolati server-side",
          ].map((s) => (
            <li key={s} className="flex items-start gap-2 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden /> {s}
            </li>
          ))}
        </ul>
      </div>

      {users && (
        <div className="paper-card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Users2 className="h-4 w-4 text-primary" aria-hidden /> Utenti backend (RBAC)
          </h2>

          <div className="thin-scroll mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Utente</th>
                  <th className="py-2 pr-3 font-semibold">Ruolo</th>
                  <th className="py-2 pr-3 font-semibold">MFA</th>
                  <th className="py-2 pr-3 font-semibold">Ultimo accesso</th>
                  <th className="py-2 pr-3 font-semibold">Stato</th>
                  <th className="py-2 font-semibold">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50">
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold">{u.username}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <select
                        value={u.role}
                        onChange={(e) => patchUser(u, { role: e.target.value })}
                        className="h-8 rounded border border-input bg-background px-2 text-xs"
                        aria-label={`Ruolo ${u.username}`}
                      >
                        <option value="SUPERADMIN">SUPERADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="EDITOR">EDITOR</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${u.totpEnabled ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {u.totpEnabled ? "attiva" : "pending"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("it-IT") : "mai"}
                      {u.lastLoginIp && <span className="font-data block">{u.lastLoginIp}</span>}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${u.active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
                        {u.active ? "attivo" : "disattivo"}
                      </span>
                      {u.lockedUntil && new Date(u.lockedUntil) > new Date() && (
                        <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">bloccato</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => patchUser(u, { active: !u.active })}>
                          {u.active ? "Disattiva" : "Attiva"}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => patchUser(u, { unlock: true, active: true })}>
                          Sblocca
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => patchUser(u, { revokeSessions: true })}>
                          Revoca sessioni
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-3 rounded-xl border border-dashed border-border p-4 sm:grid-cols-5">
            <div>
              <Label htmlFor="nu-user" className="text-xs">Username</Label>
              <Input id="nu-user" className="mt-1 h-9" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="nu-email" className="text-xs">Email</Label>
              <Input id="nu-email" type="email" className="mt-1 h-9" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="nu-pass" className="text-xs">Password (min 14)</Label>
              <Input id="nu-pass" type="password" className="mt-1 h-9" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="nu-role" className="text-xs">Ruolo</Label>
              <select
                id="nu-role" value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="mt-1 h-9 w-full rounded border border-input bg-background px-2 text-sm"
              >
                <option value="MANAGER">MANAGER</option>
                <option value="EDITOR">EDITOR</option>
                <option value="VIEWER">VIEWER</option>
                <option value="SUPERADMIN">SUPERADMIN</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button size="sm" className="h-9 w-full gap-1.5" disabled={busy} onClick={createUser}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Search className="hidden" aria-hidden />}
                Crea utente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RotateCcwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

// ------------------------ EXPORT REPORT (profilo) ------------------------
// Pulsanti dedicati per il download dei dati ordini e pagamenti in
// formato XLSX e PDF, con filtro periodo. Ogni export decifra PII e
// viene registrato nell'audit log dal backend.

const PERIODS = [
  { value: "all", label: "Tutto lo storico" },
  { value: "7", label: "Ultimi 7 giorni" },
  { value: "30", label: "Ultimi 30 giorni" },
  { value: "90", label: "Ultimi 90 giorni" },
  { value: "365", label: "Ultimo anno" },
];

type ExportKind = "ordini" | "pagamenti";
type ExportFmt = "xlsx" | "pdf";

export function AdminExportCard() {
  const [days, setDays] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (dataset: ExportKind, format: ExportFmt) => {
    const key = `${dataset}:${format}`;
    setBusy(key);
    try {
      const res = await fetch(
        `/api/admin/export?dataset=${dataset}&format=${format}&days=${days}`,
        {
          headers: {
            "X-CSRF-Token": document.cookie.match(/sch_csrf=([^;]*)/)?.[1] ?? "",
          },
        }
      );
      if (!res.ok) {
        const msg = await res
          .json()
          .then((j: { message?: string }) => j.message)
          .catch(() => undefined);
        throw new Error(msg || `Errore ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `${dataset}-la-schiscetta-${today}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({
        title: "Download avviato",
        description: `${dataset === "ordini" ? "Ordini" : "Pagamenti"} · ${format.toUpperCase()} · ${PERIODS.find((p) => p.value === days)?.label.toLowerCase()}`,
      });
    } catch (err) {
      toast({
        title: "Export non riuscito",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const btn = (dataset: ExportKind, format: ExportFmt, label: string) => (
    <Button
      variant={format === "pdf" ? "outline" : "default"}
      className="h-11 gap-2"
      disabled={busy !== null}
      onClick={() => download(dataset, format)}
      data-testid={`export-${dataset}-${format}`}
    >
      {busy === `${dataset}:${format}` ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : format === "xlsx" ? (
        <FileSpreadsheet className="h-4 w-4" aria-hidden />
      ) : (
        <FileText className="h-4 w-4" aria-hidden />
      )}
      {label}
    </Button>
  );

  return (
    <div className="paper-card p-5" data-testid="admin-export-card">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <Download className="h-4 w-4 text-primary" aria-hidden /> Export dati e report
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Scarica i dati di ordini e pagamenti in formato Excel (.xlsx) o PDF, pronti per la
        contabilità e l’archivio. Ogni download viene registrato nell’audit log.
      </p>

      <div className="mt-4 max-w-xs">
        <Label htmlFor="export-period" className="text-xs">Periodo</Label>
        <select
          id="export-period"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ordini
          </p>
          <div className="flex flex-wrap gap-2">
            {btn("ordini", "xlsx", "Ordini · Excel")}
            {btn("ordini", "pdf", "Ordini · PDF")}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pagamenti
          </p>
          <div className="flex flex-wrap gap-2">
            {btn("pagamenti", "xlsx", "Pagamenti · Excel")}
            {btn("pagamenti", "pdf", "Pagamenti · PDF")}
          </div>
        </div>
      </div>

      <p className="mt-4 rounded-lg bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
        Nota GDPR: i file contengono dati personali dei clienti (nome, email, telefono,
        indirizzo) decifrati al momento dell’export. Conservali su dispositivi cifrati e
        non condividerli con terzi senza base giuridica (art. 6 GDPR / policy interna).
      </p>
    </div>
  );
}
