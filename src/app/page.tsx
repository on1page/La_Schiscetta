// =====================================================================
// page.tsx - Application shell
//
// NOTA ARCHITETTURALE (deploy in produzione): la sandbox di preview
// serve il sito da "/" con navigazione hash (#/menu, #/ordina, ...).
// Ogni vista qui sotto mappa 1:1 a una rotta del App Router: per il
// deploy pubblico basta spostare i componenti in src/app/<route>/page.tsx
// e sostituire lo hash-router con la navigazione nativa di Next.js.
// Il backend API è già organizzato in route handlers standard.
//
// ROBUSTEZZA: loader con timeout di sicurezza + ErrorBoundary per vista
// + retry automatico quando la connessione torna. Un errore client-side
// non può mai lasciare la pagina bloccata su "Prepariamo la cucina...".
// =====================================================================
"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { useRoute, useContent, useCustomerSession, useAdmin, useLang } from "@/lib/store";
import { getCookie } from "@/lib/client-api";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CookieBanner } from "@/components/site/CookieBanner";
import { HomeView } from "@/components/views/HomeView";
import { MenuView } from "@/components/views/MenuView";
import { DishView } from "@/components/views/DishView";
import { OrderView } from "@/components/views/OrderView";
import { AccountView } from "@/components/views/AccountView";
import { ContentView } from "@/components/views/ContentView";
import { InfoViews } from "@/components/views/InfoViews";
import { BlogView, BlogPostView } from "@/components/views/BlogViews";
import { FaqView, PrivacyView, CookiePolicyView } from "@/components/views/LegalViews";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminApp } from "@/components/admin/AdminApp";
import { Loader2, TriangleAlert, RotateCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

// --------------------------- ErrorBoundary ---------------------------

type EBProps = { children: ReactNode };
type EBState = { error: Error | null };

class ViewErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }
  componentDidCatch(error: Error) {
    // Log lato console per diagnostica, senza dati personali
    console.error("[La Schiscetta] Errore di rendering:", error?.message);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
          <TriangleAlert className="h-10 w-10 text-amber-500" aria-hidden />
          <h1 className="mt-4 text-xl font-bold">Qualcosa è andato storto</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Questa sezione non si carica correttamente. Gli altri contenuti del sito
            restano disponibili: torna alla home oppure ricarica la pagina.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => this.setState({ error: null })} variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4" aria-hidden /> Riprova
            </Button>
            <Button onClick={() => { window.location.hash = "#/"; this.setState({ error: null }); }}>
              Torna alla home
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ------------------------------- Vista -------------------------------

function View() {
  const route = useRoute((s) => s.route);

  // Area admin: layout autonomo (senza header/footer pubblici),
  // esclusa da sitemap/robots e non linkata dal sito pubblico.
  if (route.name === "admin") {
    return <AdminGate section={route.section} />;
  }

  switch (route.name) {
    case "menu": return <MenuView />;
    case "piatto": return <DishView slug={route.slug} />;
    case "ordina": return <OrderView />;
    case "account": return <AccountView />;
    case "nutrition": return <ContentView view="nutrition" />;
    case "chi-siamo": return <ContentView view="about" />;
    case "app": return <ContentView view="app" />;
    case "locations": return <InfoViews view="locations" />;
    case "catering": return <InfoViews view="catering" />;
    case "contatti": return <InfoViews view="contacts" />;
    case "blog": return <BlogView />;
    case "blog-post": return <BlogPostView slug={route.slug} />;
    case "faq": return <FaqView />;
    case "termini": return <ContentView view="terms" />;
    case "privacy": return <PrivacyView />;
    case "cookie-policy": return <CookiePolicyView />;
    case "notfound": return <ContentView view="notfound" path={route.path} />;
    default: return <HomeView />;
  }
}

function AdminGate({ section }: { section?: string }) {
  const { user, loading, refresh } = useAdmin();
  useEffect(() => {
    refresh();
  }, [refresh]);
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[oklch(0.245_0.014_145)]">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" aria-hidden />
      </div>
    );
  }
  if (!user) return <AdminLogin />;
  return <AdminApp section={section} />;
}

// ------------------------- Loader con timeout -------------------------

// Se bootstrap non arriva entro questo tempo mostriamo comunque il sito
// con un avviso e un pulsante di retry: mai un loader infinito.
const LOADER_TIMEOUT_MS = 8_000;

function AppLoader({ onTimeout }: { onTimeout: () => void }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setSlow(true);
      onTimeout();
    }, LOADER_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [onTimeout]);
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Caricamento">
      <div className="text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden />
        <p className="mt-4 text-sm text-muted-foreground">Prepariamo la cucina...</p>
        {slow && (
          <p className="mt-2 text-xs text-muted-foreground">
            Ci sta volendo più del previsto: puoi attendere qualche secondo
            oppure ricaricare la pagina.
          </p>
        )}
      </div>
    </div>
  );
}

// ------------------------------ Banner -------------------------------

function OfflineBanner({ onRetry, busy }: { onRetry: () => void; busy: boolean }) {
  return (
    <div
      className="border-b border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
      role="alert"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
        <p className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
          Non riusciamo a scaricare menu e contenuti aggiornati. Il sito resta
          navigabile con i dati già caricati.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-2 border-amber-400 bg-transparent text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
          onClick={onRetry}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden />}
          Riprova
        </Button>
      </div>
    </div>
  );
}

// ------------------------------- Page --------------------------------

export default function Page() {
  const initRoute = useRoute((s) => s.init);
  const loadContent = useContent((s) => s.load);
  const loaded = useContent((s) => s.loaded);
  const failed = useContent((s) => s.failed);
  const refreshCustomer = useCustomerSession((s) => s.refresh);
  const setLang = useLang((s) => s.setLang);
  // "forceShow": dopo il timeout il contenuto viene mostrato comunque
  const [forceShow, setForceShow] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;

    // lingua dal cookie tecnico i18n_lang
    try {
      const saved = getCookie("i18n_lang");
      if (saved === "en" || saved === "it") setLang(saved);
      document.documentElement.lang = saved === "en" ? "en" : "it";
    } catch {
      /* cookie tecnico opzionale */
    }

    let cleanupRoute: (() => void) | undefined;
    try {
      cleanupRoute = initRoute();
    } catch {
      // il router non deve mai bloccare il caricamento dei contenuti
      cleanupRoute = undefined;
    }
    loadContent();
    refreshCustomer();

    // Tab ibernato/risvegliato o rete tornata: ritenta il bootstrap
    // (utile dopo sospensione del dispositivo o cambio rete).
    const retryIfNotLoaded = () => {
      if (!useContent.getState().loaded) void useContent.getState().load();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") retryIfNotLoaded();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", retryIfNotLoaded);

    return () => {
      mounted.current = false;
      cleanupRoute?.();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", retryIfNotLoaded);
    };
  }, [initRoute, loadContent, refreshCustomer, setLang]);

  const retry = async () => {
    setRetrying(true);
    try {
      await useContent.getState().load();
    } finally {
      if (mounted.current) setRetrying(false);
    }
  };

  const route = useRoute((s) => s.route);
  const isAdmin = route.name === "admin";
  const showContent = loaded || forceShow || isAdmin;

  return (
    <div className="flex min-h-screen flex-col">
      {!isAdmin && (
        <>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            Salta al contenuto principale
          </a>
          <SiteHeader />
        </>
      )}

      <main id="main-content" className={isAdmin ? "flex-1" : "flex-1"}>
        {failed && !isAdmin && <OfflineBanner onRetry={retry} busy={retrying} />}
        {showContent ? (
          <ViewErrorBoundary key={`${route.name}-${(route as { slug?: string }).slug ?? ""}`}>
            <View />
          </ViewErrorBoundary>
        ) : (
          <AppLoader onTimeout={() => setForceShow(true)} />
        )}
      </main>

      {!isAdmin && <SiteFooter className="mt-auto" />}
      <CookieBanner />
    </div>
  );
}
