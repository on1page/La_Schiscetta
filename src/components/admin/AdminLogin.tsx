// =====================================================================
// AdminLogin.tsx - Accesso backend in due fattori (spec 4.1)
// Step 1: username + password (lockout 5 tentativi, rate limit)
// Step 2a: enrollment TOTP al primo accesso (QR + verifica)
// Step 2b: codice TOTP o backup code monouso
// =====================================================================
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdmin, useRoute } from "@/lib/store";
import { api, ApiError } from "@/lib/client-api";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, ShieldCheck, KeyRound, Lock, ArrowLeft } from "lucide-react";

type LoginResponse = {
  ok: boolean;
  enroll?: boolean;
  mfa?: boolean;
  tempToken?: string;
  secret?: string;
  otpauth?: string;
  message?: string;
};

export function AdminLogin() {
  const navigate = useRoute((s) => s.navigate);
  const { refresh } = useAdmin();

  const [stage, setStage] = useState<"credentials" | "mfa" | "enroll">("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [otpauth, setOtpauth] = useState("");
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Area riservata | La Schiscetta";
  }, []);

  const submitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<LoginResponse>("/api/admin/login", { username, password });
      if (res.enroll && res.tempToken) {
        setTempToken(res.tempToken);
        setOtpauth(res.otpauth ?? "");
        setSecret(res.secret ?? "");
        setStage("enroll");
      } else if (res.mfa && res.tempToken) {
        setTempToken(res.tempToken);
        setStage("mfa");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore inatteso");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{
        ok: boolean;
        enrolled?: boolean;
        backupCodes?: string[];
        user: { username: string; role: string };
      }>("/api/admin/mfa", { tempToken, code });
      if (res.enrolled && res.backupCodes) {
        setBackupCodes(res.backupCodes);
        toast({ title: "MFA configurata", description: "Autenticazione a due fattori attivata." });
        // mostra i backup codes, poi entra
        setTimeout(async () => {
          await refresh();
          navigate("/admin");
        }, 100);
      } else {
        await refresh();
        toast({ title: `Bentornato, ${res.user.username}` });
        navigate("/admin");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Codice non valido");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[oklch(0.245_0.014_145)] px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[oklch(0.655_0.145_42)] shadow-lg">
            <Lock className="h-7 w-7 text-white" aria-hidden />
          </div>
          <h1 className="mt-4 text-xl font-bold text-white">La Schiscetta · Backend</h1>
          <p className="mt-1 text-sm text-white/60">Area riservata al personale autorizzato</p>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-2xl sm:p-8">
          {stage === "credentials" && (
            <form onSubmit={submitCredentials} className="space-y-4">
              <div>
                <Label htmlFor="ad-user">Username</Label>
                <Input
                  id="ad-user" required className="mt-1.5 h-11" autoComplete="username"
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  data-testid="admin-username"
                />
              </div>
              <div>
                <Label htmlFor="ad-pass">Password</Label>
                <Input
                  id="ad-pass" type="password" required className="mt-1.5 h-11" autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  data-testid="admin-password"
                />
              </div>
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="h-12 w-full gap-2" disabled={busy} data-testid="admin-login-btn">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
                Accedi
              </Button>
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                Accesso protetto: lockout dopo 5 tentativi, MFA obbligatoria,
                sessione 30 min. Ogni accesso è notificato via email e registrato nell'audit log.
              </p>
            </form>
          )}

          {stage === "enroll" && (
            <form onSubmit={submitCode} className="space-y-4">
              <div className="text-center">
                <ShieldCheck className="mx-auto h-10 w-10 text-primary" aria-hidden />
                <h2 className="mt-3 text-lg font-bold">Configura la MFA</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Scansiona il QR con Google Authenticator o Authy, poi inserisci il codice a 6 cifre.
                </p>
              </div>
              <div className="flex justify-center rounded-xl border border-border bg-white p-4">
                <QRCodeSVG value={otpauth} size={160} level="M" fgColor="#1F231C" />
              </div>
              <div>
                <Label htmlFor="ad-secret">Chiave manuale (se il QR non funziona)</Label>
                <p className="font-data mt-1.5 break-all rounded-lg bg-secondary px-3 py-2 text-xs">{secret}</p>
              </div>
              <div>
                <Label htmlFor="ad-code">Codice a 6 cifre</Label>
                <Input
                  id="ad-code" required inputMode="numeric" pattern="[0-9 ]*"
                  className="font-data mt-1.5 h-12 text-center text-xl tracking-[0.4em]"
                  placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)}
                  data-testid="admin-mfa-code"
                />
              </div>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">{error}</p>}
              <Button type="submit" className="h-12 w-full gap-2" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Verifica e attiva
              </Button>
            </form>
          )}

          {stage === "mfa" && (
            <form onSubmit={submitCode} className="space-y-4">
              <div className="text-center">
                <ShieldCheck className="mx-auto h-10 w-10 text-primary" aria-hidden />
                <h2 className="mt-3 text-lg font-bold">Verifica in due passaggi</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Inserisci il codice a 6 cifre dall'app authenticator, oppure un backup code.
                </p>
              </div>
              <div>
                <Label htmlFor="ad-code2">Codice TOTP o backup code</Label>
                <Input
                  id="ad-code2" required
                  className="font-data mt-1.5 h-12 text-center text-xl tracking-[0.3em]"
                  placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)}
                  data-testid="admin-mfa-code"
                />
              </div>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">{error}</p>}
              <Button type="submit" className="h-12 w-full gap-2" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Accedi
              </Button>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => { setStage("credentials"); setCode(""); setError(null); }}
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Torna alle credenziali
              </button>
            </form>
          )}

          {backupCodes && (
            <div className="space-y-3">
              <h2 className="text-center text-lg font-bold">Backup codes</h2>
              <p className="text-center text-sm text-muted-foreground">
                Conservali in un posto sicuro: ognuno è utilizzabile una sola volta se perdi il telefono.
              </p>
              <ul className="grid grid-cols-2 gap-2">
                {backupCodes.map((c) => (
                  <li key={c} className="font-data rounded-lg bg-secondary px-3 py-2 text-center text-sm font-bold">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-white/40">
          Sessioni JWT httpOnly · SameSite=Strict · scadenza 30 min · tetto 8 ore
        </p>
      </div>
    </div>
  );
}
