// =====================================================================
// CookieBanner.tsx - Banner consenso cookie
// Conforme al Provvedimento Garante Privacy n. 231/2021:
// - pulsanti Accetta/Rifiuta di pari rilevanza visiva
// - consenso granulare via "Personalizza"
// - nessun cookie non essenziale prima della scelta
// - riapribile dal footer ("Gestisci cookie")
// =====================================================================
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cookie, Lock, BarChart3, Megaphone } from "lucide-react";
import { useConsentUI, useT } from "@/lib/store";
import { getConsent, saveConsentAndNotify } from "@/lib/client-api";

export function CookieBanner() {
  const t = useT();
  const { bannerOpen, openBanner, closeBanner } = useConsentUI();
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  // idratazione lazy: nessun consenso salvato -> banner da aprire
  const [decided, setDecided] = useState<boolean>(() =>
    typeof window === "undefined" ? true : !!getConsent()
  );

  useEffect(() => {
    // apertura tramite store esterno (pattern subscribe/sync effect)
    if (!getConsent()) openBanner();
  }, [openBanner]);

  if (!bannerOpen) return null;

  const decide = (choice: { analytics: boolean; marketing: boolean }) => {
    saveConsentAndNotify({ necessary: true, analytics: choice.analytics, marketing: choice.marketing });
    setDecided(true);
    closeBanner();
    setCustomizing(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t("cookie.title")}
      className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-5"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-secondary p-2 text-secondary-foreground">
            <Cookie className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold">{t("cookie.title")}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("cookie.text")}</p>

            {customizing && (
              <div className="mt-4 space-y-3" data-testid="cookie-customize">
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3">
                  <div className="flex items-start gap-2.5">
                    <Lock className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
                    <div>
                      <p className="text-sm font-semibold">{t("cookie.necessary")}</p>
                      <p className="text-xs text-muted-foreground">{t("cookie.necessaryD")}</p>
                    </div>
                  </div>
                  <Switch checked disabled aria-label={t("cookie.necessary")} />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3">
                  <div className="flex items-start gap-2.5">
                    <BarChart3 className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
                    <div>
                      <p className="text-sm font-semibold">{t("cookie.analytics")}</p>
                      <p className="text-xs text-muted-foreground">{t("cookie.analyticsD")}</p>
                    </div>
                  </div>
                  <Switch
                    checked={analytics}
                    onCheckedChange={setAnalytics}
                    aria-label={t("cookie.analytics")}
                    data-testid="toggle-analytics"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3">
                  <div className="flex items-start gap-2.5">
                    <Megaphone className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
                    <div>
                      <p className="text-sm font-semibold">{t("cookie.marketing")}</p>
                      <p className="text-xs text-muted-foreground">{t("cookie.marketingD")}</p>
                    </div>
                  </div>
                  <Switch
                    checked={marketing}
                    onCheckedChange={setMarketing}
                    aria-label={t("cookie.marketing")}
                  />
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {customizing ? (
                <Button
                  className="h-11 flex-1"
                  onClick={() => decide({ analytics, marketing })}
                  data-testid="cookie-save"
                >
                  {t("cookie.save")}
                </Button>
              ) : (
                <>
                  {/* Pari rilevanza visiva: stessi stili, stessa altezza */}
                  <Button
                    variant="outline"
                    className="h-11 flex-1 font-semibold"
                    onClick={() => decide({ analytics: false, marketing: false })}
                    data-testid="cookie-reject"
                  >
                    {t("cookie.rejectAll")}
                  </Button>
                  <Button
                    className="h-11 flex-1 font-semibold"
                    onClick={() => decide({ analytics: true, marketing: true })}
                    data-testid="cookie-accept"
                  >
                    {t("cookie.acceptAll")}
                  </Button>
                </>
              )}
              {!customizing && (
                <Button
                  variant="ghost"
                  className="h-11 px-4 underline decoration-1 underline-offset-4"
                  onClick={() => setCustomizing(true)}
                >
                  {t("cookie.customize")}
                </Button>
              )}
            </div>
            {!decided && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Chiudendo senza scegliere non verranno installati cookie non essenziali.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
