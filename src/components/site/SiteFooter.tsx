// =====================================================================
// SiteFooter.tsx - Footer completo con dati aziendali dal DB,
// "Gestisci cookie", informazioni legali (P.IVA, REA, SDI).
// =====================================================================
"use client";

import { useT, useContent, useRoute, useConsentUI } from "@/lib/store";
import { parseJson } from "@/lib/json";
import { cn } from "@/lib/utils";
import { formatEUR } from "@/lib/constants";

export function SiteFooter({ className }: { className?: string }) {
  const t = useT();
  const company = useContent((s) => s.company);
  const navigate = useRoute((s) => s.navigate);
  const openBanner = useConsentUI((s) => s.openBanner);

  const hours = parseJson<{ day: string; open: string; close: string; closed: boolean }[]>(
    company?.openingHours ?? "[]",
    []
  );

  const go = (path: string) => navigate(path);

  return (
    <footer className={cn("mt-20 border-t border-border bg-[oklch(0.245_0.014_145)] text-[oklch(0.92_0.01_120)]", className)}>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-bold text-white">{company?.brandName ?? "La Schiscetta"}</p>
          <p className="mt-1 text-sm opacity-70">{company?.tagline ?? "Nutrizione di Precisione"}</p>
          <div className="mt-4 space-y-1 text-sm opacity-90">
            <p>{company?.street} {company?.streetNumber}</p>
            <p>{company?.zip} {company?.city} ({company?.province})</p>
            {company?.phone && <p className="font-data">Tel {company.phone}</p>}
            {company?.emailInfo && <p className="break-all">{company.emailInfo}</p>}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {company?.instagram && (
              <a href={company.instagram} target="_blank" rel="noopener noreferrer" className="underline decoration-1 underline-offset-4 hover:text-white">
                Instagram
              </a>
            )}
            {company?.facebook && (
              <a href={company.facebook} target="_blank" rel="noopener noreferrer" className="underline decoration-1 underline-offset-4 hover:text-white">
                Facebook
              </a>
            )}
            {company?.tiktok && (
              <a href={company.tiktok} target="_blank" rel="noopener noreferrer" className="underline decoration-1 underline-offset-4 hover:text-white">
                TikTok
              </a>
            )}
          </div>
        </div>

        <nav aria-label={t("footer.menuOrder")}>
          <p className="overline-label mb-3 !text-[oklch(0.75_0.02_120)]">{t("footer.menuOrder")}</p>
          <ul className="space-y-2 text-sm">
            <li><button onClick={() => go("/menu")} className="link-underline">{t("nav.menu")}</button></li>
            <li><button onClick={() => go("/ordina")} className="link-underline">{t("nav.order")}</button></li>
            <li><button onClick={() => go("/app")} className="link-underline">{t("nav.app")}</button></li>
            <li><button onClick={() => go("/catering")} className="link-underline">{t("nav.catering")}</button></li>
            <li><button onClick={() => go("/account")} className="link-underline">{t("nav.account")}</button></li>
          </ul>

          <p className="overline-label mb-3 mt-6 !text-[oklch(0.75_0.02_120)]">{t("footer.company")}</p>
          <ul className="space-y-2 text-sm">
            <li><button onClick={() => go("/chi-siamo")} className="link-underline">{t("nav.about")}</button></li>
            <li><button onClick={() => go("/nutrition")} className="link-underline">{t("nav.nutrition")}</button></li>
            <li><button onClick={() => go("/locations")} className="link-underline">{t("nav.locations")}</button></li>
            <li><button onClick={() => go("/blog")} className="link-underline">{t("nav.blog")}</button></li>
            <li><button onClick={() => go("/contatti")} className="link-underline">{t("nav.contacts")}</button></li>
          </ul>
        </nav>

        <nav aria-label={t("footer.legal")}>
          <p className="overline-label mb-3 !text-[oklch(0.75_0.02_120)]">{t("footer.legal")}</p>
          <ul className="space-y-2 text-sm">
            <li><button onClick={() => go("/termini")} className="link-underline">Termini d'uso</button></li>
            <li><button onClick={() => go("/privacy")} className="link-underline">Privacy Policy</button></li>
            <li><button onClick={() => go("/cookie-policy")} className="link-underline">{t("cookie.policy")}</button></li>
            <li>
              <button
                onClick={openBanner}
                className="link-underline"
                data-testid="manage-cookies"
              >
                {t("cookie.manage")}
              </button>
            </li>
            <li><button onClick={() => go("/faq")} className="link-underline">FAQ</button></li>
          </ul>
        </nav>

        <div>
          <p className="overline-label mb-3 !text-[oklch(0.75_0.02_120)]">{t("footer.hours")}</p>
          <ul className="space-y-1 text-sm opacity-90">
            {hours.map((h) => (
              <li key={h.day} className="flex items-center justify-between gap-4">
                <span>{h.day}</span>
                <span className="font-data">{h.closed ? "chiuso" : `${h.open}-${h.close}`}</span>
              </li>
            ))}
          </ul>
          {company?.iban && (
            <p className="mt-4 text-xs opacity-60">
              Bonifici catering: <span className="font-data">{company.iban}</span>
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs opacity-70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {company?.legalName ?? "La Schiscetta S.r.l."} · {t("footer.rights")}
          </p>
          <p className="font-data">
            {company?.vatNumber && <>P.IVA {company.vatNumber} · </>}
            {company?.reaNumber && <>REA {company.reaNumber} · </>}
            {company?.sdiCode && <>SDI {company.sdiCode}</>}
          </p>
        </div>
      </div>
    </footer>
  );
}

export function formatPriceSafe(v: number) {
  return formatEUR(v);
}
