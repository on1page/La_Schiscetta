// =====================================================================
// bits.tsx - Componenti di visualizzazione condivisi
// MacroChips, DietBadges, AllergenBadges, PriceTag, Breadcrumbs, JsonLd
// =====================================================================
"use client";

import { ALLERGENS_UE, DIET_TAGS } from "@/lib/constants";
import { useLang } from "@/lib/store";
import { cn } from "@/lib/utils";

// Chip dei valori nutrizionali (per 100 g o scalati)
export function MacroChips({
  kcal, proteinG, fatG, carbG, fiberG, compact = false,
}: {
  kcal: number; proteinG: number; fatG: number; carbG: number; fiberG: number;
  compact?: boolean;
}) {
  const lang = useLang((s) => s.lang);
  const chips = [
    { label: "kcal", value: `${Math.round(kcal)}`, cls: "bg-amber-50 text-amber-800 border-amber-200" },
    { label: `P ${lang === "en" ? "g" : "g"}`, value: `${Math.round(proteinG)}`, cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    { label: `G g`, value: `${Math.round(fatG)}`, cls: "bg-orange-50 text-orange-800 border-orange-200" },
    { label: `C g`, value: `${Math.round(carbG)}`, cls: "bg-sky-50 text-sky-800 border-sky-200" },
    { label: `F g`, value: `${Math.round(fiberG)}`, cls: "bg-lime-50 text-lime-800 border-lime-200" },
  ];
  return (
    <div className={cn("flex flex-wrap gap-1.5", compact && "gap-1")}>
      {chips.map((c) => (
        <span
          key={c.label}
          className={cn(
            "font-data inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
            c.cls,
            compact && "px-1 text-[10px]"
          )}
        >
          <span className="opacity-70">{c.label}</span>
          {c.value}
        </span>
      ))}
    </div>
  );
}

export function DietBadges({ tags, size = "sm" }: { tags: string[]; size?: "sm" | "xs" }) {
  const lang = useLang((s) => s.lang);
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((code) => {
        const d = DIET_TAGS.find((x) => x.code === code);
        if (!d) return null;
        return (
          <span
            key={code}
            title={d[lang]}
            className={cn(
              "inline-flex items-center rounded-full border border-primary/25 bg-primary/5 font-semibold text-primary",
              size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-1.5 py-px text-[10px]"
            )}
          >
            {code === "LACTOSE_FREE" ? "SL" : code}
          </span>
        );
      })}
    </div>
  );
}

export function AllergenBadges({ codes, warning = false }: { codes: string[]; warning?: boolean }) {
  const lang = useLang((s) => s.lang);
  if (codes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {codes.map((code) => {
        const a = ALLERGENS_UE.find((x) => x.code === code);
        if (!a) return null;
        return (
          <span
            key={code}
            title={`${lang === "en" ? "Allergen" : "Allergene"}: ${a[lang]}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
              warning
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-stone-300 bg-stone-100 text-stone-700"
            )}
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
            {a[lang]}
          </span>
        );
      })}
    </div>
  );
}

export function PriceTag({ pricePer100g, className }: { pricePer100g: number; className?: string }) {
  const lang = useLang((s) => s.lang);
  return (
    <span className={cn("font-data font-semibold text-foreground", className)}>
      {new Intl.NumberFormat(lang === "en" ? "en-IE" : "it-IT", {
        style: "currency",
        currency: "EUR",
      }).format(pricePer100g)}
      <span className="text-muted-foreground">/100g</span>
    </span>
  );
}

// Breadcrumb con markup semantico (SEO)
export function Breadcrumbs({ items }: { items: { label: string; path?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <button
            onClick={() => (window.location.hash = "#/")}
            className="hover:text-foreground hover:underline"
          >
            Home
          </button>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span aria-hidden>/</span>
            {item.path && i < items.length - 1 ? (
              <button
                onClick={() => (window.location.hash = `#${item.path}`)}
                className="hover:text-foreground hover:underline"
              >
                {item.label}
              </button>
            ) : (
              <span aria-current="page" className="font-medium text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// JSON-LD client-side (Google esegue il rendering JS)
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function SectionHeading({
  overline, title, subtitle, center = false,
}: {
  overline?: string; title: string; subtitle?: string; center?: boolean;
}) {
  return (
    <div className={cn("mb-8 max-w-2xl", center && "mx-auto text-center")}>
      {overline && <p className="overline-label mb-2">{overline}</p>}
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
