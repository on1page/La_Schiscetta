// =====================================================================
// DishView.tsx - Pagina singolo piatto: calcolatore macro real-time,
// peso variabile, add-in EFSA, ingredienti (UE 1169/2011), allergeni.
// Prezzo ricalcolato client-side per feedback immediato, ma l'ordine
// viene SEMPRE ricalcolato server-side (anti-manipolazione).
// =====================================================================
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumbs, DietBadges, AllergenBadges, JsonLd, PriceTag,
} from "@/components/site/bits";
import {
  useT, useContent, useRoute, useLang, useCart, trackEvent,
  type CartAddIn,
} from "@/lib/store";
import { parseJson } from "@/lib/json";
import { CATEGORIES, EFSA_CLAIMS, formatEUR } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { Minus, Plus, ShieldCheck, Leaf, Flame, ShoppingBag } from "lucide-react";

export function DishView({ slug }: { slug: string }) {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const { menu, addIns, company } = useContent();
  const navigate = useRoute((s) => s.navigate);
  const addToCart = useCart((s) => s.add);
  const item = menu.find((m) => m.slug === slug);

  const [weight, setWeight] = useState<number>(item?.unitWeightG ?? 300);
  const [selectedAddIns, setSelectedAddIns] = useState<Record<string, number>>({});
  const [qty, setQty] = useState(1);

  const ingredients = parseJson<string[]>(
    item ? (lang === "en" ? item.ingredientsEn : item.ingredientsIt) : "[]",
    []
  );
  const allergens = parseJson<string[]>(item?.allergens ?? "[]", []);
  const tags = parseJson<string[]>(item?.dietTags ?? "[]", []);
  const itemAddInIds = parseJson<string[]>(item?.addInIds ?? "[]", []);

  const k = weight / 100;
  const macros = {
    kcal: Math.round((item?.kcal ?? 0) * k),
    proteinG: Math.round((item?.proteinG ?? 0) * k),
    fatG: Math.round((item?.fatG ?? 0) * k),
    carbG: Math.round((item?.carbG ?? 0) * k),
    fiberG: Math.round((item?.fiberG ?? 0) * k),
  };

  const addTotal = (() => {
    let sum = 0;
    for (const [key, q] of Object.entries(selectedAddIns)) {
      const ai = addIns.find((a) => a.key === key);
      if (ai) sum += ai.price * q;
    }
    return sum;
  })();

  const foodPrice = item ? (item.pricePer100g * weight) / 100 : 0;
  const unitTotal = Math.round((foodPrice + addTotal) * 100) / 100;
  const total = Math.round(unitTotal * qty * 100) / 100;

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="section-title">{t("dish.unavailable")}</h1>
        <Button className="mt-6" onClick={() => navigate("/menu")}>
          {t("cart.emptyCta")}
        </Button>
      </div>
    );
  }

  const name = lang === "en" ? item.nameEn : item.nameIt;
  const desc = lang === "en" ? item.descEn : item.descIt;
  const categoryLabel = CATEGORIES.find((c) => c.code === item.category)?.[lang] ?? item.category;

  const changeAddIn = (key: string, delta: number) => {
    setSelectedAddIns((prev) => {
      const cur = prev[key] ?? 0;
      const next = Math.min(3, Math.max(0, cur + delta));
      const copy = { ...prev };
      if (next === 0) delete copy[key];
      else copy[key] = next;
      return copy;
    });
  };

  const handleAdd = () => {
    const cartAddIns: CartAddIn[] = Object.entries(selectedAddIns).map(([key, q]) => {
      const ai = addIns.find((a) => a.key === key)!;
      return { key, nameIt: ai.nameIt, nameEn: ai.nameEn, price: ai.price, qty: q };
    });
    for (let i = 0; i < qty; i++) {
      addToCart({
        slug: item.slug,
        nameIt: item.nameIt,
        nameEn: item.nameEn,
        imageUrl: item.imageUrl,
        pricePer100g: item.pricePer100g,
        weightG: weight,
        macrosPer100: {
          kcal: item.kcal, proteinG: item.proteinG, fatG: item.fatG,
          carbG: item.carbG, fiberG: item.fiberG,
        },
        addIns: cartAddIns,
      });
    }
    trackEvent("add_to_cart", `/piatto/${item.slug}`);
    toast({ title: t("dish.added"), description: `${name} · ${weight} g · ${formatEUR(total)}` });
    navigate("/ordina");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Breadcrumbs
        items={[
          { label: t("nav.menu"), path: "/menu" },
          { label: categoryLabel, path: `/menu?cat=${item.category}` },
          { label: name },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Colonna sinistra: foto + info */}
        <div>
          <div className="overflow-hidden rounded-2xl border border-border shadow-lg">
            {item.imageUrl ? (
               
              <img
                src={item.imageUrl}
                alt={`${name} — ${desc.slice(0, 100)}`}
                width={1200}
                height={800}
                className="aspect-[3/2] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[3/2] items-center justify-center bg-secondary text-7xl" aria-hidden>
                🍽️
              </div>
            )}
          </div>

          <div className="mt-6 space-y-6">
            <section aria-labelledby="ing-title">
              <h2 id="ing-title" className="mb-3 text-base font-bold">
                {t("dish.ingredients")}
              </h2>
              <ol className="space-y-1.5 text-sm">
                {ingredients.map((ing, i) => (
                  <li key={i} className="flex items-baseline gap-2.5">
                    <span className="font-data w-6 shrink-0 text-right text-xs text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={i === 0 ? "font-semibold" : ""}>{ing}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-muted-foreground">
                Reg. UE 1169/2011: ingredienti in ordine decrescente di quantità.
              </p>
            </section>

            <section aria-labelledby="all-title">
              <h2 id="all-title" className="mb-3 text-base font-bold">
                {t("dish.allergens")}
              </h2>
              {allergens.length > 0 ? (
                <AllergenBadges codes={allergens} warning />
              ) : (
                <p className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  {t("dish.noAllergens")}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Segnala sempre al personale eventuali allergie o intolleranze:{" "}
                <a href={`mailto:${company?.emailInfo ?? "info@laschiscetta.it"}`} className="underline">
                  {company?.emailInfo ?? "info@laschiscetta.it"}
                </a>
              </p>
            </section>

            {item.healthClaim && (
              <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4" aria-labelledby="claim-title">
                <h2 id="claim-title" className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                  <Leaf className="h-4 w-4" aria-hidden />
                  {t("dish.claim")}
                </h2>
                <p className="mt-1.5 text-sm text-emerald-900">{item.healthClaim}</p>
                <p className="mt-1 text-xs text-emerald-700">
                  Claim autorizzato registro EFSA (Reg. UE 1924/2006)
                </p>
              </section>
            )}
          </div>
        </div>

        {/* Colonna destra: calcolatore macro + carrello */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="overline-label">{categoryLabel}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{name}</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">{desc}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <PriceTag pricePer100g={item.pricePer100g} className="text-lg" />
            <DietBadges tags={tags} />
          </div>

          {/* Calcolatore */}
          <div className="paper-card mt-6 p-5" data-testid="macro-calculator">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide">
                {t("dish.nutrition")}
              </h2>
              <span className="font-data rounded-lg bg-secondary px-3 py-1 text-sm font-bold" data-testid="calc-weight">
                {weight} g
              </span>
            </div>

            <Slider
              value={[weight]}
              onValueChange={([v]) => setWeight(Math.round(v / 10) * 10)}
              min={100}
              max={800}
              step={10}
              className="mt-4"
              aria-label={t("dish.weight")}
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>100 g</span>
              <span>800 g</span>
            </div>

            <table className="mt-5 w-full text-sm" aria-label={t("dish.nutrition")}>
              <tbody>
                {[
                  { label: "Calorie", unit: "kcal", v: macros.kcal, icon: Flame, pct: Math.min(100, (macros.kcal / 700) * 100), cls: "bg-amber-400" },
                  { label: "Proteine", unit: "g", v: macros.proteinG, icon: null, pct: Math.min(100, (macros.proteinG / 50) * 100), cls: "bg-emerald-500" },
                  { label: "Grassi", unit: "g", v: macros.fatG, icon: null, pct: Math.min(100, (macros.fatG / 30) * 100), cls: "bg-orange-400" },
                  { label: "Carboidrati", unit: "g", v: macros.carbG, icon: null, pct: Math.min(100, (macros.carbG / 60) * 100), cls: "bg-sky-400" },
                  { label: "Fibre", unit: "g", v: macros.fiberG, icon: null, pct: Math.min(100, (macros.fiberG / 15) * 100), cls: "bg-lime-500" },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 font-medium">{row.label}</td>
                    <td className="py-2.5">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div className={`h-full rounded-full ${row.cls}`} style={{ width: `${row.pct}%` }} />
                      </div>
                    </td>
                    <td className="font-data py-2.5 pl-3 text-right font-bold">
                      {row.v} <span className="text-xs font-normal text-muted-foreground">{row.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              Valori dichiarati per 100 g, scalati al peso selezionato.
            </p>
          </div>

          {/* Add-in */}
          {itemAddInIds.length > 0 && (
            <div className="paper-card mt-4 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide">{t("dish.addins")}</h2>
              <div className="mt-3 space-y-3">
                {addIns
                  .filter((a) => itemAddInIds.includes(a.key))
                  .map((ai) => {
                    const qty = selectedAddIns[ai.key] ?? 0;
                    return (
                      <div key={ai.key} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{lang === "en" ? ai.nameEn : ai.nameIt}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {lang === "en" ? ai.descEn : ai.descIt}
                          </p>
                          {ai.efsaClaim && (
                            <p className="mt-1 inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800">
                              {ai.efsaClaim}
                            </p>
                          )}
                          <p className="font-data mt-1 text-xs font-semibold">+{formatEUR(ai.price)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="outline" size="icon" className="h-8 w-8"
                            onClick={() => changeAddIn(ai.key, -1)}
                            disabled={qty === 0}
                            aria-label={`Rimuovi ${ai.nameIt}`}
                          >
                            <Minus className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                          <span className="font-data w-6 text-center text-sm font-bold" data-testid={`addin-qty-${ai.key}`}>{qty}</span>
                          <Button
                            variant="outline" size="icon" className="h-8 w-8"
                            onClick={() => changeAddIn(ai.key, 1)}
                            disabled={qty >= 3}
                            aria-label={`Aggiungi ${ai.nameIt}`}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{t("dish.addinsNote")}</p>
            </div>
          )}

          {/* Totale + aggiungi */}
          <div className="paper-card mt-4 flex items-center gap-4 p-5">
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="icon" className="h-10 w-10"
                onClick={() => setQty(Math.max(1, qty - 1))}
                aria-label="Riduci quantità"
              >
                <Minus className="h-4 w-4" aria-hidden />
              </Button>
              <span className="font-data w-8 text-center text-lg font-bold">{qty}</span>
              <Button
                variant="outline" size="icon" className="h-10 w-10"
                onClick={() => setQty(Math.min(10, qty + 1))}
                aria-label="Aumenta quantità"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <Button size="lg" className="h-12 flex-1 gap-2 text-base" onClick={handleAdd} data-testid="add-to-cart">
              <ShoppingBag className="h-5 w-5" aria-hidden />
              {formatEUR(total)}
            </Button>
          </div>
        </div>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "MenuItem",
          name,
          description: desc,
          offers: { "@type": "Offer", price: item.pricePer100g.toFixed(2), priceCurrency: "EUR" },
          nutrition: {
            "@type": "NutritionInformation",
            calories: `${item.kcal} kcal per 100g`,
            proteinContent: `${item.proteinG} g per 100g`,
            fatContent: `${item.fatG} g per 100g`,
            carbohydrateContent: `${item.carbG} g per 100g`,
            fiberContent: `${item.fiberG} g per 100g`,
          },
        }}
      />
    </div>
  );
}
