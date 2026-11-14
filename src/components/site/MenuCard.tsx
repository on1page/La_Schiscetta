// =====================================================================
// MenuCard.tsx - Card voce menu (usata in home e nel menu completo)
// =====================================================================
"use client";

import { DietBadges, MacroChips, PriceTag } from "@/components/site/bits";
import { useLang, useRoute, type MenuItemDTO } from "@/lib/store";
import { parseJson } from "@/lib/json";
import { CATEGORIES } from "@/lib/constants";

export function MenuCard({ item }: { item: MenuItemDTO }) {
  const lang = useLang((s) => s.lang);
  const navigate = useRoute((s) => s.navigate);
  const name = lang === "en" ? item.nameEn : item.nameIt;
  const desc = lang === "en" ? item.descEn : item.descIt;
  const tags = parseJson<string[]>(item.dietTags, []);

  return (
    <article
      className="paper-card group flex cursor-pointer flex-col overflow-hidden transition-shadow hover:shadow-[0_2px_4px_rgba(31,35,26,0.05),0_16px_40px_-20px_rgba(31,35,26,0.25)]"
      onClick={() => navigate(`/piatto/${item.slug}`)}
      data-testid={`menu-card-${item.slug}`}
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-secondary">
        {item.imageUrl ? (
           
          <img
            src={item.imageUrl}
            alt={`${name} — ${desc.slice(0, 80)}`}
            loading="lazy"
            width={600}
            height={400}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl" aria-hidden>
            🥗
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary backdrop-blur">
          {CATEGORIES.find((c) => c.code === item.category)?.[lang] ?? item.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15px] font-bold leading-snug">{name}</h3>
          <PriceTag pricePer100g={item.pricePer100g} className="shrink-0 text-sm" />
        </div>
        <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{desc}</p>
        <div className="mt-auto flex flex-col gap-2 pt-1">
          <MacroChips
            kcal={item.kcal} proteinG={item.proteinG} fatG={item.fatG}
            carbG={item.carbG} fiberG={item.fiberG} compact
          />
          <DietBadges tags={tags} size="xs" />
        </div>
      </div>
    </article>
  );
}
