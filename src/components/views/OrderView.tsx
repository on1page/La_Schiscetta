// =====================================================================
// OrderView.tsx - Carrello + checkout (3 step) + conferma
// - prezzi mostrati dal client ma SEMPRE ricalcolati server-side
// - coupon validato via API
// - pagamento: STRIPE_TEST (autorizzazione simulata, nessun dato
//   carta transita dal server) oppure IN_NEGOZIO
// =====================================================================
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/site/bits";
import {
  useT, useContent, useRoute, useCart, useLang, useCustomerSession,
  cartLineTotal, cartLineMacros, trackEvent,
} from "@/lib/store";
import { api, ApiError } from "@/lib/client-api";
import { formatEUR } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import {
  ShoppingBag, Trash2, MapPin, Store, CreditCard, Banknote,
  CheckCircle2, TicketPercent, ArrowLeft, Loader2,
} from "lucide-react";

type Step = 1 | 2 | 3;

type PlacedOrder = {
  orderNumber: string;
  total: number;
  paymentStatus: string;
  lines: { nameIt: string; nameEn: string; weightG: number; lineTotal: number }[];
  nutrition: { kcal: number; proteinG: number; fatG: number; carbG: number; fiberG: number };
};

export function OrderView() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const { zones, company } = useContent();
  const navigate = useRoute((s) => s.navigate);
  const { items, remove, setWeight, clear } = useCart();
  const customer = useCustomerSession((s) => s.customer);

  const [step, setStep] = useState<Step>(1);
  const [fulfillment, setFulfillment] = useState<"RITIRO" | "CONSEGNA">("RITIRO");
  const [zone, setZone] = useState<string>("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number } | null>(null);
  const [payment, setPayment] = useState<"STRIPE_TEST" | "IN_NEGOZIO">("STRIPE_TEST");
  const [gdpr, setGdpr] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  const subtotal = useMemo(
    () => Math.round(items.reduce((s, it) => s + cartLineTotal(it), 0) * 100) / 100,
    [items]
  );
  const nutrition = useMemo(
    () =>
      items.reduce(
        (acc, it) => {
          const m = cartLineMacros(it);
          return {
            kcal: acc.kcal + m.kcal,
            proteinG: acc.proteinG + m.proteinG,
            fatG: acc.fatG + m.fatG,
            carbG: acc.carbG + m.carbG,
            fiberG: acc.fiberG + m.fiberG,
          };
        },
        { kcal: 0, proteinG: 0, fatG: 0, carbG: 0, fiberG: 0 }
      ),
    [items]
  );
  const selectedZone = zones.find((z) => z.name === zone);
  const deliveryFee = fulfillment === "CONSEGNA" ? (selectedZone?.fee ?? 0) : 0;
  const discount = couponApplied?.discount ?? 0;
  const total = Math.round(Math.max(0, subtotal - discount + deliveryFee) * 100) / 100;

  // prefill dai dati account
  const prefillFromAccount = () => {
    if (customer) {
      setForm((f) => ({
        ...f,
        name: f.name || (customer.name ?? ""),
        email: f.email || customer.email,
        phone: f.phone || (customer.phone ?? ""),
      }));
    }
  };

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    try {
      const res = await api.post<{ valid: boolean; code?: string; discount?: number; message?: string }>(
        "/api/coupon/validate",
        { code: coupon.trim(), subtotal }
      );
      if (res.valid && res.code && typeof res.discount === "number") {
        setCouponApplied({ code: res.code, discount: res.discount });
        toast({ title: "Codice applicato", description: `Sconto: ${formatEUR(res.discount)}` });
      } else {
        setCouponApplied(null);
        toast({ title: "Codice non valido", description: res.message, variant: "destructive" });
      }
    } catch (err) {
      toast({
        title: "Errore",
        description: err instanceof ApiError ? err.message : "Riprova",
        variant: "destructive",
      });
    }
  };

  const placeOrder = async () => {
    setPlacing(true);
    try {
      const res = await api.post<{ ok: boolean; order: PlacedOrder }>("/api/orders", {
        items: items.map((it) => ({
          slug: it.slug,
          weightG: it.weightG,
          addIns: (it.addIns ?? []).map((a) => ({ key: a.key, qty: a.qty })),
        })),
        name: form.name,
        email: form.email,
        phone: form.phone,
        fulfillment,
        zone: fulfillment === "CONSEGNA" ? zone : null,
        address: fulfillment === "CONSEGNA" ? form.address : null,
        paymentMethod: payment,
        couponCode: couponApplied?.code ?? null,
        gdprConsent: true,
        paymentToken: payment === "STRIPE_TEST" ? `pm_test_${Date.now().toString(36)}` : null,
      });
      setPlaced(res.order);
      clear();
      trackEvent("order_placed", "/ordina");
      useCustomerSession.getState().refresh();
    } catch (err) {
      toast({
        title: "Ordine non completato",
        description: err instanceof ApiError ? err.message : "Errore inatteso, riprova",
        variant: "destructive",
      });
    } finally {
      setPlacing(false);
    }
  };

  // ------------------------- CONFERMA -------------------------
  if (placed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="paper-card p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" aria-hidden />
          </div>
          <h1 className="mt-5 text-2xl font-bold">{t("checkout.done")}</h1>
          <p className="mt-2 text-muted-foreground">{t("checkout.doneMsg")}</p>
          <p className="font-data mt-4 rounded-lg bg-secondary px-4 py-2 text-lg font-bold" data-testid="order-number">
            {placed.orderNumber}
          </p>

          <div className="mt-6 space-y-2 text-left text-sm">
            {placed.lines.map((l, i) => (
              <div key={i} className="flex justify-between gap-4">
                <span>
                  {lang === "en" ? l.nameEn : l.nameIt} · {l.weightG} g
                </span>
                <span className="font-data">{formatEUR(l.lineTotal)}</span>
              </div>
            ))}
            <Separator className="my-3" />
            <div className="flex justify-between text-base font-bold">
              <span>{t("checkout.total")}</span>
              <span className="font-data">{formatEUR(placed.total)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Pagamento: {placed.paymentStatus === "PAGATO" ? "autorizzato (Stripe test)" : "in negozio"}
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("cart.nutrition")}
            </p>
            <div className="font-data mt-2 grid grid-cols-5 gap-2 text-center text-sm">
              <div><b>{placed.nutrition.kcal}</b><span className="block text-[10px] text-muted-foreground">kcal</span></div>
              <div><b>{placed.nutrition.proteinG}</b><span className="block text-[10px] text-muted-foreground">P g</span></div>
              <div><b>{placed.nutrition.fatG}</b><span className="block text-[10px] text-muted-foreground">G g</span></div>
              <div><b>{placed.nutrition.carbG}</b><span className="block text-[10px] text-muted-foreground">C g</span></div>
              <div><b>{placed.nutrition.fiberG}</b><span className="block text-[10px] text-muted-foreground">F g</span></div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={() => navigate("/account")}>
              {t("account.dashboard")}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate("/menu")}>
              {t("cart.emptyCta")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------- CARRELLO VUOTO -------------------------
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <ShoppingBag className="mx-auto h-14 w-14 text-muted-foreground/40" aria-hidden />
        <h1 className="mt-5 text-2xl font-bold">{t("cart.empty")}</h1>
        <Button size="lg" className="mt-6" onClick={() => navigate("/menu")}>
          {t("cart.emptyCta")}
        </Button>
      </div>
    );
  }

  const canStep2 =
    form.name.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.phone.trim().length >= 6 &&
    (fulfillment === "RITIRO" || (zone && form.address.trim().length >= 5));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Breadcrumbs items={[{ label: t("checkout.title") }]} />

      {/* step indicator */}
      <ol className="mb-8 flex items-center gap-2 text-sm font-semibold">
        {([1, 2, 3] as Step[]).map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                step >= s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
              aria-current={step === s ? "step" : undefined}
            >
              {s}
            </span>
            <span className={step >= s ? "" : "text-muted-foreground"}>
              {t(`checkout.step${s}`)}
            </span>
            {i < 2 && <span className="mx-1 h-px w-6 bg-border sm:w-10" aria-hidden />}
          </li>
        ))}
      </ol>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          {step === 1 && (
            <section aria-label={t("checkout.step1")}>
              <h1 className="section-title">{t("checkout.step1")}</h1>

              {customer && (
                <button
                  className="mt-3 text-sm text-primary underline decoration-1 underline-offset-4"
                  onClick={prefillFromAccount}
                >
                  Usa i dati del tuo account ({customer.email})
                </button>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="co-name">{t("checkout.name")}</Label>
                  <Input
                    id="co-name" className="mt-1.5 h-11" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    autoComplete="name"
                  />
                </div>
                <div>
                  <Label htmlFor="co-email">{t("checkout.email")}</Label>
                  <Input
                    id="co-email" type="email" className="mt-1.5 h-11" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <Label htmlFor="co-phone">{t("checkout.phone")}</Label>
                  <Input
                    id="co-phone" type="tel" className="mt-1.5 h-11" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    autoComplete="tel"
                  />
                </div>
              </div>

              <h2 className="mt-8 text-base font-bold">Consegna o ritiro</h2>
              <RadioGroup
                value={fulfillment}
                onValueChange={(v) => setFulfillment(v as "RITIRO" | "CONSEGNA")}
                className="mt-3 grid gap-3 sm:grid-cols-2"
              >
                <Label
                  className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value="RITIRO" className="mt-1" />
                  <div>
                    <span className="flex items-center gap-2 font-semibold">
                      <Store className="h-4 w-4" aria-hidden /> {t("checkout.pickup")}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {company?.street} {company?.streetNumber}, {company?.city} · {t("common.open")} 9:00-20:30
                    </span>
                  </div>
                </Label>
                <Label
                  className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value="CONSEGNA" className="mt-1" />
                  <div>
                    <span className="flex items-center gap-2 font-semibold">
                      <MapPin className="h-4 w-4" aria-hidden /> {t("checkout.delivery")}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      Cagliari · 30-40 min · {formatEUR(2.9)}+
                    </span>
                  </div>
                </Label>
              </RadioGroup>

              {fulfillment === "CONSEGNA" && (
                <div className="mt-4 grid gap-4">
                  <div>
                    <Label htmlFor="co-zone">{t("checkout.zone")}</Label>
                    <select
                      id="co-zone"
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      <option value="">— {lang === "en" ? "Select a zone" : "Seleziona una zona"} —</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.name}>
                          {z.name} · {formatEUR(z.fee)} · min {formatEUR(z.minOrder)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="co-address">{t("checkout.address")}</Label>
                    <Textarea
                      id="co-address" className="mt-1.5" rows={2} value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Via, civico, interno, CITOFONO"
                    />
                  </div>
                </div>
              )}

              <Button
                size="lg" className="mt-8 h-12 w-full sm:w-auto"
                disabled={!canStep2}
                onClick={() => setStep(2)}
                data-testid="to-step-2"
              >
                {t("checkout.step2")}
              </Button>
            </section>
          )}

          {step === 2 && (
            <section aria-label={t("checkout.step2")}>
              <h1 className="section-title">{t("checkout.step2")}</h1>
              <RadioGroup
                value={payment}
                onValueChange={(v) => setPayment(v as typeof payment)}
                className="mt-6 grid gap-3"
              >
                <Label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                  <RadioGroupItem value="STRIPE_TEST" className="mt-1" />
                  <div className="flex-1">
                    <span className="flex items-center gap-2 font-semibold">
                      <CreditCard className="h-4 w-4" aria-hidden /> {t("checkout.pay.card")}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      3D Secure SCA (PSD2). Ambiente test: l'autorizzazione viene simulata, nessun dato
                      carta transita dal server (tokenizzazione client-side, PCI-DSS SAQ-A).
                    </span>
                    <span className="font-data mt-2 block text-xs text-muted-foreground">
                      In produzione: Stripe Elements + PaymentIntents
                    </span>
                  </div>
                </Label>
                <Label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                  <RadioGroupItem value="IN_NEGOZIO" className="mt-1" />
                  <div>
                    <span className="flex items-center gap-2 font-semibold">
                      <Banknote className="h-4 w-4" aria-hidden /> {t("checkout.pay.store")}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      Contanti o POS al banco Via Roma 100.
                    </span>
                  </div>
                </Label>
              </RadioGroup>

              <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-4">
                <Checkbox
                  id="gdpr" checked={gdpr} onCheckedChange={(v) => setGdpr(v === true)}
                  className="mt-0.5" data-testid="gdpr-check"
                />
                <Label htmlFor="gdpr" className="cursor-pointer text-sm leading-relaxed font-normal">
                  {t("checkout.gdpr")}{" "}
                  <button
                    className="text-primary underline decoration-1 underline-offset-2"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/privacy");
                    }}
                  >
                    Privacy Policy
                  </button>
                </Label>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" size="lg" className="h-12" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" aria-hidden /> {t("checkout.back")}
                </Button>
                <Button
                  size="lg" className="h-12 flex-1" disabled={!gdpr}
                  onClick={() => setStep(3)}
                  data-testid="to-step-3"
                >
                  {t("checkout.step3")}
                </Button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section aria-label={t("checkout.step3")}>
              <h1 className="section-title">{t("checkout.step3")}</h1>
              <div className="paper-card mt-6 divide-y divide-border">
                <div className="p-5">
                  <p className="overline-label">{t("checkout.step1")}</p>
                  <p className="mt-2 text-sm font-medium">{form.name}</p>
                  <p className="text-sm text-muted-foreground">{form.email} · {form.phone}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {fulfillment === "RITIRO"
                      ? `${t("checkout.pickup")} — ${company?.street} ${company?.streetNumber}, ${company?.city}`
                      : `${t("checkout.delivery")} — ${zone} · ${form.address}`}
                  </p>
                </div>
                <div className="p-5">
                  <p className="overline-label">{t("checkout.step2")}</p>
                  <p className="mt-2 text-sm font-medium">
                    {payment === "STRIPE_TEST" ? t("checkout.pay.card") : t("checkout.pay.store")}
                  </p>
                </div>
                <div className="p-5">
                  <p className="overline-label">{t("cart.title")}</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {items.map((it, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span>{lang === "en" ? it.nameEn : it.nameIt} · {it.weightG} g</span>
                        <span className="font-data">{formatEUR(cartLineTotal(it))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" size="lg" className="h-12" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-1 h-4 w-4" aria-hidden /> {t("checkout.back")}
                </Button>
                <Button
                  size="lg" className="h-12 flex-1 text-base" disabled={placing}
                  onClick={placeOrder}
                  data-testid="place-order"
                >
                  {placing && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                  {t("checkout.place")} · {formatEUR(total)}
                </Button>
              </div>
            </section>
          )}
        </div>

        {/* ------------------------- RIEPILOGO LATERALE ------------------------- */}
        <aside className="lg:sticky lg:top-32 lg:self-start" aria-label={t("cart.title")}>
          <div className="paper-card p-5">
            <h2 className="text-base font-bold">
              {t("cart.title")} <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
            </h2>

            <ul className="thin-scroll mt-4 max-h-80 space-y-4 overflow-y-auto pr-1">
              {items.map((it, i) => (
                <li key={i} className="flex gap-3">
                  {it.imageUrl && (
                     
                    <img
                      src={it.imageUrl} alt="" width={56} height={56}
                      className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold">
                        {lang === "en" ? it.nameEn : it.nameIt}
                      </p>
                      <button
                        onClick={() => remove(i)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Rimuovi ${it.nameIt}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    {(it.addIns ?? []).length > 0 && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        + {(it.addIns ?? []).map((a) => (lang === "en" ? a.nameEn : a.nameIt)).join(", ")}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="range"
                        min={100}
                        max={800}
                        step={10}
                        value={it.weightG}
                        onChange={(e) => setWeight(i, Number(e.target.value))}
                        className="h-1.5 flex-1 accent-[oklch(0.42_0.055_148)]"
                        aria-label={`${t("dish.weight")} ${it.nameIt}`}
                      />
                      <span className="font-data w-14 text-right text-xs font-bold">{it.weightG} g</span>
                    </div>
                    <p className="font-data mt-1 text-sm font-semibold">{formatEUR(cartLineTotal(it))}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* coupon */}
            <div className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <TicketPercent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  placeholder={t("checkout.coupon")}
                  className="h-10 pl-9 font-data"
                  aria-label={t("checkout.coupon")}
                />
              </div>
              <Button variant="outline" className="h-10" onClick={applyCoupon}>
                {t("checkout.apply")}
              </Button>
            </div>

            <Separator className="my-4" />

            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("cart.subtotal")}</dt>
                <dd className="font-data">{formatEUR(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>{couponApplied?.code}</dt>
                  <dd className="font-data">-{formatEUR(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{lang === "en" ? "Delivery" : "Consegna"}</dt>
                <dd className="font-data">{deliveryFee === 0 ? "—" : formatEUR(deliveryFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                <dt>{t("checkout.total")}</dt>
                <dd className="font-data" data-testid="cart-total">{formatEUR(total)}</dd>
              </div>
            </dl>

            <div className="mt-4 rounded-lg border border-border bg-background p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("cart.nutrition")}
              </p>
              <div className="font-data mt-1.5 grid grid-cols-5 gap-1 text-center text-xs">
                <div><b>{nutrition.kcal}</b><span className="block text-[9px] text-muted-foreground">kcal</span></div>
                <div><b>{nutrition.proteinG}</b><span className="block text-[9px] text-muted-foreground">P g</span></div>
                <div><b>{nutrition.fatG}</b><span className="block text-[9px] text-muted-foreground">G g</span></div>
                <div><b>{nutrition.carbG}</b><span className="block text-[9px] text-muted-foreground">C g</span></div>
                <div><b>{nutrition.fiberG}</b><span className="block text-[9px] text-muted-foreground">F g</span></div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
