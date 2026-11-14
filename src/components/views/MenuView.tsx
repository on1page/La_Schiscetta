// =====================================================================
// MenuView.tsx - Menu completo con filtri (GF/V/VG/P/Pesco/Keto/SL),
// ricerca e tab categorie. Include JSON-LD Menu.
// =====================================================================
"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { MenuCard } from "@/components/site/MenuCard";
import { Breadcrumbs, SectionHeading, JsonLd } from "@/components/site/bits";
import { useT, useContent, useLang } from "@/lib/store";
import { CATEGORIES, DIET_TAGS } from "@/lib/constants";
import { Search } from "lucide-react";

const FILTER_KEYS = ["GF", "V", "VG", "P", "PESCO", "KETO", "LACTOSE_FREE"];

export function MenuView() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const menu = useContent((s) => s.menu);
  const [category, setCategory] = useState<string>("ALL");
  const [filters, setFilters] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return menu.filter((m) => {
      if (category !== "ALL" && m.category !== category) return false;
      if (filters.size > 0) {
        const tags = JSON.parse(m.dietTags) as string[];
        for (const f of filters) {
          if (f === "V") {
            // chi filtra "vegetariano" accetta anche vegano
            if (!tags.includes("V") && !tags.includes("VG")) return false;
          } else if (!tags.includes(f)) {
            return false;
          }
        }
      }
      if (q) {
        const hay = `${m.nameIt} ${m.nameEn} ${m.descIt} ${m.descEn}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [menu, category, filters, query]);

  const toggleFilter = (code: string) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Breadcrumbs items={[{ label: t("nav.menu") }]} />
      <SectionHeading overline="La Schiscetta" title={t("menu.title")} subtitle={t("menu.subtitle")} />

      {/* Barra filtri sticky */}
      <div className="sticky top-16 z-30 -mx-4 mb-8 border-y border-border bg-background/95 px-4 py-3 backdrop-blur-md">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("menu.search")}
                className="h-10 pl-9"
                aria-label={t("menu.search")}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTER_KEYS.map((code) => (
                <Toggle
                  key={code}
                  size="sm"
                  pressed={filters.has(code)}
                  onPressedChange={() => toggleFilter(code)}
                  aria-label={`Filtro ${DIET_TAGS.find((d) => d.code === code)?.[lang] ?? code}`}
                  className="h-8 rounded-full border px-3 text-xs font-bold"
                >
                  {code === "LACTOSE_FREE" ? "SL" : code}
                </Toggle>
              ))}
            </div>
          </div>
          <div className="thin-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Categorie">
            <button
              role="tab"
              aria-selected={category === "ALL"}
              onClick={() => setCategory("ALL")}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                category === "ALL" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              }`}
            >
              {t("menu.all")}
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.code}
                role="tab"
                aria-selected={category === c.code}
                onClick={() => setCategory(c.code)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                  category === c.code ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                }`}
              >
                {c[lang]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground" data-testid="menu-empty">
          {t("menu.empty")}
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Menu",
          name: "Menu La Schiscetta",
          hasMenuSection: CATEGORIES.map((c) => ({
            "@type": "MenuSection",
            name: c[lang],
            hasMenuItem: menu
              .filter((m) => m.category === c.code)
              .map((m) => ({
                "@type": "MenuItem",
                name: lang === "en" ? m.nameEn : m.nameIt,
                description: lang === "en" ? m.descEn : m.descIt,
                offers: {
                  "@type": "Offer",
                  price: m.pricePer100g.toFixed(2),
                  priceCurrency: "EUR",
                },
              })),
          })),
        }}
      />
    </div>
  );
}
