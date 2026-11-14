// =====================================================================
// SiteHeader.tsx - Navigazione principale sticky + carrello + lingua
// =====================================================================
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu, ShoppingBag, User, Globe, Smartphone,
} from "lucide-react";
import { useT, useCart, useRoute, useLang, type Route } from "@/lib/store";
import { cn } from "@/lib/utils";

// Logo "schiscetta" (portavivande): pittogramma SVG originale
function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      <rect x="4" y="11" width="24" height="16" rx="3" stroke="currentColor" strokeWidth="2.4" />
      <path d="M11 11V9a5 5 0 0 1 10 0v2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M4 17h24" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="16" cy="23" r="2" fill="currentColor" />
    </svg>
  );
}

const NAV: { key: string; path: string }[] = [
  { key: "nav.menu", path: "/menu" },
  { key: "nav.nutrition", path: "/nutrition" },
  { key: "nav.about", path: "/chi-siamo" },
  { key: "nav.locations", path: "/locations" },
  { key: "nav.catering", path: "/catering" },
  { key: "nav.blog", path: "/blog" },
  { key: "nav.faq", path: "/faq" },
  { key: "nav.contacts", path: "/contatti" },
];

export function SiteHeader() {
  const t = useT();
  const navigate = useRoute((s) => s.navigate);
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const cartCount = useCart((s) => s.items.length);
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      {/* barra superiore informativa */}
      <div className="hidden bg-primary text-primary-foreground sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-[12px]">
          <p className="font-medium">
            Via Roma 100, Cagliari · lun-ven 9:00-20:30 · sab-dom 10:00-20:30
          </p>
          <button
            onClick={() => go("/app")}
            className="inline-flex items-center gap-1.5 font-medium underline decoration-1 underline-offset-2 hover:decoration-2"
          >
            <Smartphone className="h-3.5 w-3.5" aria-hidden />
            {t("nav.app")}
          </button>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <button
          onClick={() => go("/")}
          className="flex items-center gap-2.5"
          aria-label="La Schiscetta - Home"
        >
          <LogoMark className="h-8 w-8 text-primary" />
          <span className="text-left leading-none">
            <span className="block text-lg font-bold tracking-tight">La Schiscetta</span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Nutrizione di Precisione
            </span>
          </span>
        </button>

        <nav className="ml-6 hidden flex-1 items-center gap-1 lg:flex" aria-label="Navigazione principale">
          {NAV.map((item) => (
            <button
              key={item.path}
              onClick={() => go(item.path)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {t(item.key)}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setLang(lang === "it" ? "en" : "it")}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={lang === "it" ? "Switch to English" : "Passa all'italiano"}
            data-testid="lang-switch"
          >
            <Globe className="h-4 w-4" aria-hidden />
            {lang.toUpperCase()}
          </button>

          <button
            onClick={() => go("/account")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={t("nav.account")}
          >
            <User className="h-4.5 w-4.5" aria-hidden />
          </button>

          <Button
            onClick={() => go("/ordina")}
            className="relative h-10 gap-2"
            data-testid="cart-button"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{t("nav.order")}</span>
            {cartCount > 0 && (
              <span className="font-data absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground">
                {cartCount}
              </span>
            )}
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground lg:hidden"
                aria-label="Apri menu di navigazione"
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="text-left">La Schiscetta</SheetTitle>
              <nav className="mt-4 flex flex-col gap-1" aria-label="Navigazione mobile">
                {NAV.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => go(item.path)}
                    className="rounded-lg px-3 py-3 text-left text-base font-medium hover:bg-secondary"
                  >
                    {t(item.key)}
                  </button>
                ))}
                <button
                  onClick={() => go("/ordina")}
                  className="mt-2 rounded-lg bg-primary px-3 py-3 text-left text-base font-semibold text-primary-foreground"
                >
                  {t("nav.order")}
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
