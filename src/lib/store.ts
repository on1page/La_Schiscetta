// =====================================================================
// store.ts - Stato client (Zustand): router hash, lingua, contenuti,
// carrello, sessioni cliente/admin, consenso cookie.
// =====================================================================
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { makeT, type Lang } from "./i18n";
import { api, setCookie, getCookie, trackPageview, trackEvent } from "./client-api";

// ------------------------------- Lingua -------------------------------

type LangState = {
  lang: Lang;
  setLang: (l: Lang) => void;
};

export const useLang = create<LangState>()(
  persist(
    (set) => ({
      lang: "it",
      setLang: (lang) => {
        set({ lang });
        setCookie("i18n_lang", lang, 365); // cookie tecnico
        document.documentElement.lang = lang;
      },
    }),
    { name: "sch_lang" }
  )
);

export function useT() {
  const lang = useLang((s) => s.lang);
  return makeT(lang);
}

// ------------------------------- Router -------------------------------

export type Route =
  | { name: "home" }
  | { name: "menu" }
  | { name: "piatto"; slug: string }
  | { name: "ordina" }
  | { name: "account" }
  | { name: "nutrition" }
  | { name: "chi-siamo" }
  | { name: "locations" }
  | { name: "catering" }
  | { name: "app" }
  | { name: "blog" }
  | { name: "blog-post"; slug: string }
  | { name: "faq" }
  | { name: "contatti" }
  | { name: "termini" }
  | { name: "privacy" }
  | { name: "cookie-policy" }
  | { name: "admin"; section?: string }
  | { name: "notfound"; path: string };

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, "").replace(/\/+$/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "home" };
  const [root, second] = parts;
  switch (root) {
    case "menu": return { name: "menu" };
    case "piatto": return second ? { name: "piatto", slug: second } : { name: "menu" };
    case "ordina": return { name: "ordina" };
    case "account": return { name: "account" };
    case "nutrition": return { name: "nutrition" };
    case "chi-siamo": return { name: "chi-siamo" };
    case "locations": return { name: "locations" };
    case "catering": return { name: "catering" };
    case "app": return { name: "app" };
    case "blog": return second ? { name: "blog-post", slug: second } : { name: "blog" };
    case "faq": return { name: "faq" };
    case "contatti": return { name: "contatti" };
    case "termini": return { name: "termini" };
    case "privacy": return { name: "privacy" };
    case "cookie-policy": return { name: "cookie-policy" };
    case "admin": return { name: "admin", section: second };
    default: return { name: "notfound", path: clean };
  }
}

const ROUTE_TITLES: Record<string, { it: string; en: string }> = {
  home: { it: "Ristorante di Nutrizione di Precisione a Cagliari", en: "Precision Nutrition Restaurant in Cagliari" },
  menu: { it: "Menu", en: "Menu" },
  ordina: { it: "Ordina online", en: "Order online" },
  account: { it: "Area personale", en: "Your account" },
  nutrition: { it: "La metodologia", en: "Our method" },
  "chi-siamo": { it: "Chi siamo", en: "About us" },
  locations: { it: "Dove siamo", en: "Locations" },
  catering: { it: "Catering", en: "Catering" },
  app: { it: "L'app", en: "The app" },
  blog: { it: "Blog", en: "Blog" },
  faq: { it: "Domande frequenti", en: "FAQ" },
  contatti: { it: "Contatti", en: "Contact us" },
  termini: { it: "Termini d'uso", en: "Terms of use" },
  privacy: { it: "Privacy Policy", en: "Privacy Policy" },
  "cookie-policy": { it: "Cookie Policy", en: "Cookie Policy" },
  admin: { it: "Area riservata", en: "Admin area" },
  notfound: { it: "Pagina non trovata", en: "Page not found" },
};

type RouteState = {
  route: Route;
  navigate: (path: string) => void;
  setRoute: (r: Route) => void;
  init: () => () => void;
};

export const useRoute = create<RouteState>((set, get) => ({
  route: { name: "home" },
  navigate: (path) => {
    const target = `#${path.startsWith("/") ? path : `/${path}`}`;
    if (window.location.hash === target) return;
    window.location.hash = target; // il listener hashchange aggiorna lo store
  },
  setRoute: (route) => {
    set({ route });
    // SEO: title dinamico per ogni vista + analytics consensuale
    try {
      const lang = useLang.getState().lang;
      const base = ROUTE_TITLES[route.name];
      let title = "La Schiscetta";
      if (route.name === "piatto") title = route.slug.replace(/-/g, " ");
      else if (route.name === "blog-post") title = route.slug.replace(/-/g, " ");
      else if (base) title = base[lang];
      document.title =
        route.name === "home"
          ? "La Schiscetta | Ristorante di Nutrizione di Precisione a Cagliari"
          : `${title.charAt(0).toUpperCase() + title.slice(1)} | La Schiscetta`;
    } catch {
      /* il title non deve mai bloccare la navigazione */
    }
    try {
      trackPageview(`#/${hashPath(route)}`, document.title);
    } catch {
      /* analytics non deve mai bloccare la navigazione */
    }
    try {
      // Safari vecchi rifiuta behavior:"instant": mai lasciare che
      // un'eccezione qui interrompa il flusso di init della pagina.
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    } catch {
      window.scrollTo(0, 0);
    }
  },
  init: () => {
    const apply = () => get().setRoute(parseHash(window.location.hash));
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  },
}));

export function hashPath(route: Route): string {
  switch (route.name) {
    case "home": return "";
    case "piatto": return `piatto/${route.slug}`;
    case "blog-post": return `blog/${route.slug}`;
    case "admin": return route.section ? `admin/${route.section}` : "admin";
    case "notfound": return route.path;
    default: return route.name;
  }
}

// ------------------------------ Contenuti -----------------------------

export type MenuItemDTO = {
  id: string; slug: string; nameIt: string; nameEn: string; descIt: string; descEn: string;
  category: string; imageUrl: string | null; pricePer100g: number; unitWeightG: number;
  kcal: number; proteinG: number; fatG: number; carbG: number; fiberG: number;
  ingredientsIt: string; ingredientsEn: string; allergens: string; dietTags: string;
  addInIds: string; healthClaim: string | null; available: boolean;
  seasonalFrom: string | null; seasonalTo: string | null;
  isPopular: boolean; isSignature: boolean;
};

export type AddInDTO = {
  id: string; key: string; nameIt: string; nameEn: string; descIt: string; descEn: string;
  price: number; efsaClaim: string | null;
};

export type CompanyDTO = {
  brandName: string; legalName: string; tagline: string | null;
  vatNumber: string | null; sdiCode: string | null; pec: string | null;
  street: string; streetNumber: string; zip: string; city: string; province: string;
  lat: number; lng: number; phone: string | null; mobile: string | null; whatsapp: string | null;
  emailInfo: string | null; emailOrders: string | null; emailPrivacy: string | null;
  cciaa: string | null; reaNumber: string | null; shareCapital: string | null;
  dpoName: string | null; dpoEmail: string | null; dpoPhone: string | null;
  instagram: string | null; facebook: string | null; tiktok: string | null; linkedin: string | null;
  iban: string | null; heroUrl: string | null; aboutUrl: string | null;
  openingHours: string; holidays: string | null;
};

export type ZoneDTO = { id: string; name: string; fee: number; minOrder: number; etaMinutes: number };
export type ReviewDTO = { id: string; author: string; rating: number; text: string; source: string; date: string };
export type BlogDTO = {
  id: string; slug: string; title: string; excerpt: string; content: string;
  coverUrl: string | null; author: string; category: string; readMinutes: number; publishedAt: string;
};
export type PrivacySection = { id: string; title: string; body: string };
export type CookieDefDTO = {
  id: string; name: string; provider: string; purpose: string; duration: string;
  category: string; required: boolean; active: boolean;
};

type ContentState = {
  loaded: boolean;
  failed: boolean;
  company: CompanyDTO | null;
  menu: MenuItemDTO[];
  addIns: AddInDTO[];
  zones: ZoneDTO[];
  reviews: ReviewDTO[];
  blog: BlogDTO[];
  privacy: { sections: PrivacySection[]; version: number; updatedAt: string };
  cookies: CookieDefDTO[];
  load: () => Promise<void>;
};

// Retry automatico con backoff: se /api/bootstrap fallisce (rete,
// tab ibernata, riavvio del server) si riprova senza lasciare la
// pagina bloccata sul loader.
let bootstrapAttempts = 0;
let bootstrapRetryTimer: ReturnType<typeof setTimeout> | null = null;

export const useContent = create<ContentState>((set) => ({
  loaded: false,
  failed: false,
  company: null,
  menu: [],
  addIns: [],
  zones: [],
  reviews: [],
  blog: [],
  privacy: { sections: [], version: 1, updatedAt: new Date().toISOString() },
  cookies: [],
  load: async () => {
    try {
      const data = await api.get<{
        company: CompanyDTO | null;
        menu: MenuItemDTO[];
        addIns: AddInDTO[];
        zones: ZoneDTO[];
        reviews: ReviewDTO[];
        blog: BlogDTO[];
        privacy: { sections: PrivacySection[]; version: number; updatedAt: string };
        cookies: CookieDefDTO[];
      }>("/api/bootstrap");
      bootstrapAttempts = 0;
      set({ ...data, loaded: true, failed: false });
    } catch {
      if (bootstrapAttempts < 3) {
        // backoff 2s, 5s, 10s
        const delay = 2000 * (bootstrapAttempts + 1) + 1000 * bootstrapAttempts;
        bootstrapAttempts += 1;
        if (bootstrapRetryTimer) clearTimeout(bootstrapRetryTimer);
        bootstrapRetryTimer = setTimeout(() => {
          bootstrapRetryTimer = null;
          void useContent.getState().load();
        }, delay);
      } else {
        // Dopo 3 tentativi: mostra comunque il sito con i dati di default
        // e un banner di retry, mai un loader infinito.
        set({ loaded: true, failed: true });
      }
    }
  },
}));

// ------------------------------ Carrello ------------------------------

export type CartAddIn = { key: string; nameIt: string; nameEn: string; price: number; qty: number };
export type CartItem = {
  slug: string;
  nameIt: string;
  nameEn: string;
  imageUrl: string | null;
  pricePer100g: number;
  weightG: number;
  macrosPer100: { kcal: number; proteinG: number; fatG: number; carbG: number; fiberG: number };
  addIns: CartAddIn[];
};

export function cartLineTotal(item: CartItem): number {
  // Difensivo: carrelli salvati da versioni precedenti dell'app possono
  // non avere addIns/macrosPer100: mai sollevare un'eccezione per dati vecchi.
  const food = (item.pricePer100g * item.weightG) / 100;
  const adds = (item.addIns ?? []).reduce((s, a) => s + a.price * a.qty, 0);
  return Math.round((food + adds) * 100) / 100;
}

export function cartLineMacros(item: CartItem) {
  const m = item.macrosPer100 ?? { kcal: 0, proteinG: 0, fatG: 0, carbG: 0, fiberG: 0 };
  const k = item.weightG / 100;
  return {
    kcal: Math.round(m.kcal * k),
    proteinG: Math.round(m.proteinG * k),
    fatG: Math.round(m.fatG * k),
    carbG: Math.round(m.carbG * k),
    fiberG: Math.round(m.fiberG * k),
  };
}

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (index: number) => void;
  setWeight: (index: number, weightG: number) => void;
  clear: () => void;
};

// Migrazione dei carrelli salvati da versioni precedenti: ogni riga senza
// slug/prezzo o senza i campi attuali viene ripulita o normalizzata, così un
// localStorage vecchio non può mai mandare in crash la vista ordine.
function sanitizeCart(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter(
      (it): it is CartItem =>
        !!it && typeof it === "object" &&
        typeof (it as CartItem).slug === "string" &&
        typeof (it as CartItem).pricePer100g === "number" &&
        typeof (it as CartItem).weightG === "number"
    )
    .map((it) => ({
      ...it,
      addIns: Array.isArray(it.addIns) ? it.addIns : [],
      macrosPer100: it.macrosPer100 ?? { kcal: 0, proteinG: 0, fatG: 0, carbG: 0, fiberG: 0 },
    }));
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) => set((s) => ({ items: [...s.items, item] })),
      remove: (index) => set((s) => ({ items: s.items.filter((_, i) => i !== index) })),
      setWeight: (index, weightG) =>
        set((s) => ({
          items: s.items.map((it, i) => (i === index ? { ...it, weightG } : it)),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "sch_cart", // carrello in localStorage, nessun cookie
      version: 1,
      migrate: (persisted) => {
        const state = persisted as { items?: unknown } | undefined;
        return { items: sanitizeCart(state?.items) };
      },
      merge: (persisted, current) => {
        // anche senza bump di versione, righe malformate vengono ripulite
        const state = persisted as { items?: unknown } | undefined;
        return { ...current, items: sanitizeCart(state?.items) };
      },
    }
  )
);

// ------------------------- Sessione cliente ---------------------------

export type CustomerDTO = {
  id: string; email: string; name: string | null; phone: string | null;
  dailyKcal: number; dailyProteinG: number; goal: string | null; createdAt: string;
};
export type OrderDTO = {
  orderNumber: string; createdAt: string; status: string; paymentStatus: string;
  fulfillment: string; total: number;
  items: { slug: string; nameIt: string; nameEn: string; weightG: number; lineTotal: number; addIns: CartAddIn[] }[];
  nutrition: { kcal: number; proteinG: number; fatG: number; carbG: number; fiberG: number };
};

type CustomerSessionState = {
  customer: CustomerDTO | null;
  orders: OrderDTO[];
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useCustomerSession = create<CustomerSessionState>((set) => ({
  customer: null,
  orders: [],
  loading: true,
  refresh: async () => {
    try {
      const data = await api.get<{ customer: CustomerDTO; orders: OrderDTO[] }>(
        "/api/customer/session"
      );
      set({ customer: data.customer, orders: data.orders, loading: false });
    } catch {
      set({ customer: null, orders: [], loading: false });
    }
  },
  logout: async () => {
    await api.post("/api/customer/logout").catch(() => undefined);
    set({ customer: null, orders: [] });
  },
}));

// ------------------------- Banner cookie ------------------------------

type ConsentUIState = {
  bannerOpen: boolean;
  openBanner: () => void;
  closeBanner: () => void;
};

export const useConsentUI = create<ConsentUIState>((set) => ({
  bannerOpen: false,
  openBanner: () => set({ bannerOpen: true }),
  closeBanner: () => set({ bannerOpen: false }),
}));

// --------------------------- Admin session ----------------------------

export type AdminUserDTO = { username: string; email: string; role: string };

type AdminState = {
  user: AdminUserDTO | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (u: AdminUserDTO | null) => void;
};

export const useAdmin = create<AdminState>((set) => ({
  user: null,
  loading: true,
  refresh: async () => {
    try {
      const data = await api.get<{ user: AdminUserDTO }>("/api/admin/session");
      set({ user: data.user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  setUser: (user) => set({ user, loading: false }),
}));

export { trackEvent };
