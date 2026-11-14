// =====================================================================
// AccountView.tsx - Area personale: login/registrazione, profilo con
// obiettivi, storico ordini, dashboard nutrizionale, diritti GDPR
// (esportazione art. 15/20 e cancellazione art. 17).
// =====================================================================
"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Breadcrumbs, SectionHeading } from "@/components/site/bits";
import {
  useT, useCustomerSession, useRoute, useLang, useContent,
} from "@/lib/store";
import { api, ApiError } from "@/lib/client-api";
import { formatEUR } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import {
  LogIn, UserPlus, Target, ClipboardList, Activity, ShieldCheck,
  Download, Trash2, Loader2, CalendarDays,
} from "lucide-react";

function NutritionDashboard() {
  const t = useT();
  const { customer, orders } = useCustomerSession();
  const lang = useLang((s) => s.lang);

  const today = useMemo(() => {
    const d = new Date();
    return orders.filter((o) => {
      const od = new Date(o.createdAt);
      return (
        od.getFullYear() === d.getFullYear() &&
        od.getMonth() === d.getMonth() &&
        od.getDate() === d.getDate() &&
        o.status !== "ANNULLATO"
      );
    });
  }, [orders]);

  const todayNutrition = today.reduce(
    (acc, o) => ({
      kcal: acc.kcal + (o.nutrition?.kcal ?? 0),
      proteinG: acc.proteinG + (o.nutrition?.proteinG ?? 0),
      fatG: acc.fatG + (o.nutrition?.fatG ?? 0),
      carbG: acc.carbG + (o.nutrition?.carbG ?? 0),
      fiberG: acc.fiberG + (o.nutrition?.fiberG ?? 0),
    }),
    { kcal: 0, proteinG: 0, fatG: 0, carbG: 0, fiberG: 0 }
  );

  const proteinPct = customer
    ? Math.min(100, Math.round((todayNutrition.proteinG / customer.dailyProteinG) * 100))
    : 0;
  const kcalPct = customer
    ? Math.min(100, Math.round((todayNutrition.kcal / customer.dailyKcal) * 100))
    : 0;

  const bars = [
    { label: "Calorie", value: todayNutrition.kcal, target: customer?.dailyKcal ?? 2000, unit: "kcal", pct: kcalPct, cls: "bg-amber-400" },
    { label: "Proteine", value: todayNutrition.proteinG, target: customer?.dailyProteinG ?? 120, unit: "g", pct: proteinPct, cls: "bg-emerald-500" },
  ];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {bars.map((b) => (
          <div key={b.label} className="paper-card p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-bold">{b.label} {lang === "en" ? "today" : "di oggi"}</p>
              <p className="font-data text-lg font-bold">
                {b.value}
                <span className="text-xs font-normal text-muted-foreground"> / {b.target} {b.unit}</span>
              </p>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary">
              <div className={`h-full rounded-full ${b.cls} transition-all`} style={{ width: `${b.pct}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{b.pct}% {lang === "en" ? "of target" : "dell'obiettivo"}</p>
          </div>
        ))}
      </div>

      <div className="paper-card mt-4 p-5">
        <p className="text-sm font-bold">
          {lang === "en" ? "Macros today" : "Macro di oggi"}
        </p>
        <div className="font-data mt-3 grid grid-cols-5 gap-2 text-center">
          <div className="rounded-lg bg-secondary py-2"><b>{todayNutrition.kcal}</b><span className="block text-[10px] text-muted-foreground">kcal</span></div>
          <div className="rounded-lg bg-secondary py-2"><b>{todayNutrition.proteinG}</b><span className="block text-[10px] text-muted-foreground">P g</span></div>
          <div className="rounded-lg bg-secondary py-2"><b>{todayNutrition.fatG}</b><span className="block text-[10px] text-muted-foreground">G g</span></div>
          <div className="rounded-lg bg-secondary py-2"><b>{todayNutrition.carbG}</b><span className="block text-[10px] text-muted-foreground">C g</span></div>
          <div className="rounded-lg bg-secondary py-2"><b>{todayNutrition.fiberG}</b><span className="block text-[10px] text-muted-foreground">F g</span></div>
        </div>
        {today.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            {lang === "en"
              ? "No orders today yet: your dashboard fills in automatically with each order."
              : "Nessun ordine oggi: la dashboard si popola automaticamente a ogni ordine."}
          </p>
        )}
      </div>
    </div>
  );
}

function OrdersList() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const { orders } = useCustomerSession();

  if (orders.length === 0) {
    return <p className="paper-card p-6 text-center text-sm text-muted-foreground">{t("account.noOrders")}</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <details key={o.orderNumber} className="paper-card group p-4">
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-data font-bold">{o.orderNumber}</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {new Date(o.createdAt).toLocaleDateString(lang === "en" ? "en-GB" : "it-IT")}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              o.status === "CONSEGNATO" ? "bg-emerald-100 text-emerald-800"
              : o.status === "ANNULLATO" ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-800"
            }`}>
              {o.status.replace(/_/g, " ").toLowerCase()}
            </span>
            <span className="font-data ml-auto text-sm font-bold">{formatEUR(o.total)}</span>
          </summary>
          <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            {o.items.map((line, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{lang === "en" ? line.nameEn : line.nameIt} · {line.weightG} g</span>
                <span className="font-data">{formatEUR(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="font-data mt-3 flex gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
            <span>{o.nutrition?.kcal ?? 0} kcal</span>
            <span>P {o.nutrition?.proteinG ?? 0} g</span>
            <span>G {o.nutrition?.fatG ?? 0} g</span>
            <span>C {o.nutrition?.carbG ?? 0} g</span>
            <span>F {o.nutrition?.fiberG ?? 0} g</span>
          </div>
        </details>
      ))}
    </div>
  );
}

export function AccountView() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const navigate = useRoute((s) => s.navigate);
  const { customer, orders, loading, refresh, logout } = useCustomerSession();
  const content = useContent((s) => s.loaded);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "", consent: false });
  const [busy, setBusy] = useState(false);

  // profilo
  const [profile, setProfile] = useState({ name: "", phone: "", dailyKcal: 2000, dailyProteinG: 120, goal: "mantenimento" });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (customer) {
      setProfile({
        name: customer.name ?? "",
        phone: customer.phone ?? "",
        dailyKcal: customer.dailyKcal,
        dailyProteinG: customer.dailyProteinG,
        goal: customer.goal ?? "mantenimento",
      });
    }
  }, [customer]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        await api.post("/api/customer/login", { email: form.email, password: form.password });
      } else {
        await api.post("/api/customer/register", {
          email: form.email,
          password: form.password,
          name: form.name,
          phone: form.phone || null,
          gdprConsent: true,
        });
      }
      await refresh();
      toast({ title: mode === "login" ? "Bentornato!" : "Benvenuto!" });
    } catch (err) {
      toast({
        title: "Errore",
        description: err instanceof ApiError ? err.message : "Riprova",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.put("/api/customer/session", {
        name: profile.name,
        phone: profile.phone || null,
        dailyKcal: Number(profile.dailyKcal),
        dailyProteinG: Number(profile.dailyProteinG),
        goal: profile.goal,
      });
      await refresh();
      toast({ title: "Profilo aggiornato" });
    } catch (err) {
      toast({
        title: "Errore",
        description: err instanceof ApiError ? err.message : "Riprova",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const exportData = async () => {
    try {
      const res = await fetch("/api/customer/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document.cookie.match(/sch_csrf=([^;]*)/)?.[1] ?? "",
        },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dati-la-schiscetta.json";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export completato", description: "Download avviato (GDPR artt. 15 e 20)" });
    } catch {
      toast({ title: "Export non riuscito", variant: "destructive" });
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm(t("account.deleteWarn"))) return;
    try {
      await api.post("/api/customer/delete");
      await refresh();
      toast({ title: "Account eliminato", description: "Dati cancellati ai sensi dell'art. 17 GDPR." });
      navigate("/");
    } catch {
      toast({ title: "Cancellazione non riuscita", variant: "destructive" });
    }
  };

  if (loading || !content) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  // ------------------------- NON AUTENTICATO -------------------------
  if (!customer) {
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <SectionHeading
          overline={t("account.title")}
          title={mode === "login" ? t("account.login") : t("account.register")}
          subtitle={
            lang === "en"
              ? "Track your nutrition, save your targets, reorder favourites."
              : "Traccia la tua nutrizione, salva gli obiettivi, riordina i preferiti."
          }
        />
        <form onSubmit={submit} className="paper-card space-y-4 p-6">
          {mode === "register" && (
            <>
              <div>
                <Label htmlFor="ac-name">{t("checkout.name")}</Label>
                <Input
                  id="ac-name" className="mt-1.5 h-11" required minLength={2}
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="ac-phone">{t("checkout.phone")} ({lang === "en" ? "optional" : "opzionale"})</Label>
                <Input
                  id="ac-phone" type="tel" className="mt-1.5 h-11"
                  value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="ac-email">{t("checkout.email")}</Label>
            <Input
              id="ac-email" type="email" required className="mt-1.5 h-11"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="ac-pass">{t("account.password")}</Label>
            <Input
              id="ac-pass" type="password" required className="mt-1.5 h-11"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            {mode === "register" && (
              <p className="mt-1.5 text-xs text-muted-foreground">{t("account.passwordHint")}</p>
            )}
          </div>

          <Button type="submit" size="lg" className="h-12 w-full gap-2" disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : mode === "login" ? (
              <LogIn className="h-4 w-4" aria-hidden />
            ) : (
              <UserPlus className="h-4 w-4" aria-hidden />
            )}
            {mode === "login" ? t("account.login") : t("account.register")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login"
              ? lang === "en" ? "No account yet?" : "Non hai un account?"
              : lang === "en" ? "Already registered?" : "Già registrato?"}{" "}
            <button
              type="button"
              className="font-semibold text-primary underline decoration-1 underline-offset-4"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? t("account.register") : t("account.login")}
            </button>
          </p>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {lang === "en"
            ? "Demo credentials: demo@laschiscetta.it / Cliente-Demo-2026!"
            : "Credenziali demo: demo@laschiscetta.it / Cliente-Demo-2026!"}
        </p>
      </div>
    );
  }

  // ------------------------- AUTENTICATO -------------------------
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Breadcrumbs items={[{ label: t("account.title") }]} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="section-title">{customer.name ?? customer.email}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{customer.email}</p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await logout();
            toast({ title: "Sessione terminata" });
          }}
        >
          {t("nav.logout")}
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="mt-8">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <Activity className="h-4 w-4" aria-hidden /> {t("account.dashboard")}
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5">
            <ClipboardList className="h-4 w-4" aria-hidden /> {t("account.orders")} ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5">
            <Target className="h-4 w-4" aria-hidden /> {t("account.profile")}
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" aria-hidden /> {t("account.privacy")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <NutritionDashboard />
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <OrdersList />
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <div className="paper-card grid gap-4 p-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="pf-name">{t("checkout.name")}</Label>
              <Input
                id="pf-name" className="mt-1.5 h-11" value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="pf-phone">{t("checkout.phone")}</Label>
              <Input
                id="pf-phone" type="tel" className="mt-1.5 h-11" value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="pf-kcal">{t("account.dailyKcal")}</Label>
              <Input
                id="pf-kcal" type="number" min={800} max={6000} className="mt-1.5 h-11 font-data"
                value={profile.dailyKcal}
                onChange={(e) => setProfile({ ...profile, dailyKcal: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="pf-protein">{t("account.dailyProtein")}</Label>
              <Input
                id="pf-protein" type="number" min={20} max={400} className="mt-1.5 h-11 font-data"
                value={profile.dailyProteinG}
                onChange={(e) => setProfile({ ...profile, dailyProteinG: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="pf-goal">{t("account.goal")}</Label>
              <select
                id="pf-goal"
                value={profile.goal}
                onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
                className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="cut">Cut (deficit calorico)</option>
                <option value="mantenimento">Mantenimento</option>
                <option value="bulk">Bulk (surplus calorico)</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button className="h-11 gap-2" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {t("common.save")}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="privacy" className="mt-6">
          <div className="space-y-4">
            <div className="paper-card flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="font-semibold">{t("account.exportData")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lang === "en"
                    ? "Download all your data in JSON (GDPR arts. 15 and 20)."
                    : "Scarica tutti i tuoi dati in JSON (GDPR artt. 15 e 20)."}
                </p>
              </div>
              <Button variant="outline" className="gap-2" onClick={exportData}>
                <Download className="h-4 w-4" aria-hidden /> JSON
              </Button>
            </div>
            <div className="paper-card flex flex-wrap items-center justify-between gap-4 border-red-200 p-6">
              <div>
                <p className="font-semibold text-destructive">{t("account.deleteData")}</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">{t("account.deleteWarn")}</p>
              </div>
              <Button variant="destructive" className="gap-2" onClick={deleteAccount}>
                <Trash2 className="h-4 w-4" aria-hidden /> {t("common.delete")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {lang === "en"
                ? "Your personal data is encrypted at rest (AES-256-GCM). Passwords are hashed with argon2id."
                : "I tuoi dati personali sono cifrati a riposo (AES-256-GCM). Le password sono hashate con argon2id."}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
