// =====================================================================
// i18n.ts - Dizionario IT/EN per l'interfaccia (switch persistito su
// cookie tecnico i18n_lang + localStorage). I contenuti editoriali
// (blog, legali) sono in italiano; il menu è bilingue da database.
// =====================================================================

export type Lang = "it" | "en";

type Entry = { it: string; en: string };

export const dict: Record<string, Entry> = {
  // ---- navigazione ----
  "nav.nutrition": { it: "Nutrizione", en: "Nutrition" },
  "nav.about": { it: "Chi siamo", en: "About us" },
  "nav.locations": { it: "Locations", en: "Locations" },
  "nav.catering": { it: "Catering", en: "Catering" },
  "nav.blog": { it: "Blog", en: "Blog" },
  "nav.faq": { it: "FAQ", en: "FAQ" },
  "nav.contacts": { it: "Contatti", en: "Contact us" },
  "nav.order": { it: "Ordina ora", en: "Order now" },
  "nav.app": { it: "Scarica l'app", en: "Get the app" },
  "nav.menu": { it: "Menu", en: "Menu" },
  "nav.account": { it: "Account", en: "Account" },
  "nav.login": { it: "Accedi", en: "Sign in" },
  "nav.logout": { it: "Esci", en: "Sign out" },
  "nav.cart": { it: "Carrello", en: "Cart" },

  // ---- hero / home ----
  "hero.overline": { it: "Cagliari · Nutrizione di precisione", en: "Cagliari · Precision nutrition" },
  "hero.title": { it: "Il tuo benessere, ridefinito.", en: "Your health, re-engineered." },
  "hero.subtitle": {
    it: "Nutrizione intelligente per la vita di tutti i giorni. Valori nutrizionali dichiarati, prezzo al peso, personalizzazione al grammo.",
    en: "Intelligent nutrition for everyday life. Declared nutrition, weight-based pricing, gram-level customization.",
  },
  "hero.cta.menu": { it: "Scopri il menu", en: "Explore the menu" },
  "hero.cta.order": { it: "Ordina ora", en: "Order now" },
  "hero.stat.macros": { it: "macro tracciati per piatto", en: "macros tracked per dish" },
  "hero.stat.allergens": { it: "allergeni UE dichiarati", en: "EU allergens declared" },
  "hero.stat.price": { it: "prezzo trasparente al peso", en: "transparent weight pricing" },
  "value.title": {
    it: "Il tuo chef privato incontra il tuo nutrizionista",
    en: "Your private chef meets your personal nutritionist",
  },
  "value.subtitle": {
    it: "Ogni piatto nasce da una ricetta chef ed è dichiarato come un'etichetta nutrizionale: calorie, proteine, grassi, carboidrati e fibre per 100 g. Tu decidi il peso, noi facciamo il resto.",
    en: "Every dish starts as a chef recipe and is declared like a nutrition label: calories, protein, fat, carbs and fibre per 100 g. You pick the weight, we do the rest.",
  },
  "home.popular": { it: "Piatti popolari", en: "Popular plates" },
  "home.smoothies": { it: "Smoothie signature", en: "Signature smoothies" },
  "home.how": { it: "Come funziona", en: "How it works" },
  "home.features": { it: "Costruito sui tuoi obiettivi", en: "Built around your goals" },
  "home.reviews": { it: "Dicono di noi", en: "What people say" },
  "home.appCta": { it: "Portaci in tasca", en: "Take us with you" },
  "steps.1.t": { it: "Scegli", en: "Choose" },
  "steps.1.d": { it: "Seleziona un piatto dal menu e filtra per le tue esigenze: senza glutine, vegetariano, keto.", en: "Pick a dish and filter by your needs: gluten-free, vegetarian, keto." },
  "steps.2.t": { it: "Personalizza", en: "Customize" },
  "steps.2.d": { it: "Calibra il peso al grammo con il calcolatore macro in tempo reale e aggiungi gli add-in.", en: "Dial in the weight with the real-time macro calculator and add functional add-ins." },
  "steps.3.t": { it: "Traccia", en: "Track" },
  "steps.3.d": { it: "Ogni ordine alimenta la tua dashboard nutrizionale: proteine, calorie e fibre aggregati.", en: "Every order feeds your nutrition dashboard: aggregated protein, calories and fibre." },
  "steps.4.t": { it: "Migliora", en: "Improve" },
  "steps.4.d": { it: "Osserva i trend, correggi gli squilibri e raggiungi i tuoi obiettivi senza rinunciare al gusto.", en: "Watch trends, fix imbalances and hit your goals without giving up flavour." },
  "feat.1.t": { it: "Personalizza al grammo", en: "Customize by the gram" },
  "feat.1.d": { it: "Nessuna porzione standard: il calcolatore macro aggiorna prezzo e valori nutrizionali in tempo reale mentre scegli il peso.", en: "No standard portions: the macro calculator updates price and nutrition in real time." },
  "feat.2.t": { it: "Piano alimentare", en: "Set your meal plan" },
  "feat.2.d": { it: "Imposta kcal e proteine giornaliere nell'account e confrontale con ciò che ordini davvero.", en: "Set daily kcal and protein targets in your account and compare with what you actually order." },
  "feat.3.t": { it: "Traccia i pasti", en: "Track your meals" },
  "feat.3.d": { it: "Lo storico ordini diventa un diario nutrizionale automatico, esportabile in qualsiasi momento.", en: "Your order history becomes an automatic nutrition log, exportable anytime." },

  // ---- menu ----
  "menu.title": { it: "Il menu", en: "The menu" },
  "menu.subtitle": {
    it: "Valori nutrizionali e prezzo per 100 g, allergeni dichiarati ai sensi del Reg. UE 1169/2011.",
    en: "Nutrition and price per 100 g, allergens declared per EU Reg. 1169/2011.",
  },
  "menu.search": { it: "Cerca nel menu...", en: "Search the menu..." },
  "menu.all": { it: "Tutto", en: "All" },
  "menu.empty": { it: "Nessun piatto corrisponde ai filtri selezionati.", en: "No dish matches the selected filters." },
  "menu.per100": { it: "/100 g", en: "/100 g" },
  "menu.details": { it: "Dettagli e calcolatore", en: "Details & calculator" },

  // ---- piatto ----
  "dish.weight": { it: "Peso", en: "Weight" },
  "dish.nutrition": { it: "Valori nutrizionali", en: "Nutrition facts" },
  "dish.ingredients": { it: "Ingredienti (in ordine di quantità)", en: "Ingredients (by quantity)" },
  "dish.allergens": { it: "Allergeni", en: "Allergens" },
  "dish.noAllergens": { it: "Nessuno dei 14 allergeni UE obbligatori", en: "None of the 14 mandatory EU allergens" },
  "dish.addins": { it: "Add-in funzionali", en: "Functional add-ins" },
  "dish.addinsNote": {
    it: "Solo claim autorizzati dal registro EFSA (Reg. UE 1924/2006). Integratori notificati D.Lgs. 169/2004.",
    en: "EFSA-authorized claims only (EU Reg. 1924/2006).",
  },
  "dish.add": { it: "Aggiungi al carrello", en: "Add to cart" },
  "dish.added": { it: "Aggiunto al carrello", en: "Added to cart" },
  "dish.unavailable": { it: "Piatto non disponibile", en: "Dish unavailable" },
  "dish.claim": { it: "Claim nutrizionale autorizzato", en: "Authorized nutrition claim" },

  // ---- carrello / checkout ----
  "cart.title": { it: "Il tuo ordine", en: "Your order" },
  "cart.empty": { it: "Il carrello è vuoto", en: "Your cart is empty" },
  "cart.emptyCta": { it: "Sfoglia il menu", en: "Browse the menu" },
  "cart.subtotal": { it: "Subtotale", en: "Subtotal" },
  "cart.nutrition": { it: "Riepilogo nutrizionale", en: "Nutrition summary" },
  "cart.toCheckout": { it: "Vai al checkout", en: "Go to checkout" },
  "checkout.title": { it: "Checkout", en: "Checkout" },
  "checkout.step1": { it: "Contatti e consegna", en: "Contact & delivery" },
  "checkout.step2": { it: "Pagamento", en: "Payment" },
  "checkout.step3": { it: "Conferma", en: "Confirmation" },
  "checkout.pickup": { it: "Ritiro in negozio", en: "Store pickup" },
  "checkout.delivery": { it: "Consegna a domicilio", en: "Home delivery" },
  "checkout.zone": { it: "Zona di consegna", en: "Delivery zone" },
  "checkout.address": { it: "Indirizzo completo", en: "Full address" },
  "checkout.name": { it: "Nome e cognome", en: "Full name" },
  "checkout.email": { it: "Email", en: "Email" },
  "checkout.phone": { it: "Telefono", en: "Phone" },
  "checkout.coupon": { it: "Codice sconto", en: "Discount code" },
  "checkout.apply": { it: "Applica", en: "Apply" },
  "checkout.pay.card": { it: "Carta di credito (Stripe test)", en: "Credit card (Stripe test)" },
  "checkout.pay.store": { it: "Paga al ritiro / in negozio", en: "Pay at pickup / in store" },
  "checkout.place": { it: "Conferma ordine", en: "Place order" },
  "checkout.back": { it: "Indietro", en: "Back" },
  "checkout.done": { it: "Ordine confermato", en: "Order confirmed" },
  "checkout.doneMsg": {
    it: "Grazie! Il tuo ordine è stato ricevuto. Riceverai una email di conferma a breve.",
    en: "Thank you! Your order has been received. A confirmation email is on its way.",
  },
  "checkout.total": { it: "Totale", en: "Total" },
  "checkout.gdpr": {
    it: "Acconsento al trattamento dei dati per la gestione dell'ordine (art. 6.1.b GDPR).",
    en: "I consent to data processing for order management (GDPR art. 6.1.b).",
  },

  // ---- account ----
  "account.title": { it: "Area personale", en: "Your account" },
  "account.login": { it: "Accedi", en: "Sign in" },
  "account.register": { it: "Crea account", en: "Create account" },
  "account.password": { it: "Password", en: "Password" },
  "account.passwordHint": { it: "Minimo 12 caratteri con maiuscole, minuscole, numeri e simboli", en: "Minimum 12 characters with upper, lower case, numbers and symbols" },
  "account.profile": { it: "Profilo e obiettivi", en: "Profile & goals" },
  "account.orders": { it: "Storico ordini", en: "Order history" },
  "account.dashboard": { it: "Dashboard nutrizionale", en: "Nutrition dashboard" },
  "account.privacy": { it: "Privacy e dati", en: "Privacy & data" },
  "account.dailyKcal": { it: "Obiettivo kcal/giorno", en: "Daily kcal target" },
  "account.dailyProtein": { it: "Obiettivo proteine/giorno", en: "Daily protein target (g)" },
  "account.goal": { it: "Obiettivo", en: "Goal" },
  "account.exportData": { it: "Esporta i miei dati (JSON)", en: "Export my data (JSON)" },
  "account.deleteData": { it: "Cancella il mio account", en: "Delete my account" },
  "account.deleteWarn": {
    it: "La cancellazione elimina definitivamente account e ordini (GDPR art. 17). L'operazione è irreversibile.",
    en: "Deletion permanently removes your account and orders (GDPR art. 17). This cannot be undone.",
  },
  "account.noOrders": { it: "Nessun ordino ancora: il primo è a un clic di distanza.", en: "No orders yet: your first is one click away." },

  // ---- cookie banner ----
  "cookie.title": { it: "La tua privacy, le tue scelte", en: "Your privacy, your choice" },
  "cookie.text": {
    it: "Usiamo cookie tecnici necessari al funzionamento (sessione, sicurezza, lingua). Con il tuo consenso raccogliamo statistiche aggregate anonime di prima parte per migliorare il sito. Nessun cookie di profilazione senza consenso esplicito (Provvedimento Garante n. 231/2021).",
    en: "We use strictly necessary technical cookies (session, security, language). With your consent we collect anonymous first-party aggregate statistics. No profiling cookies without explicit consent.",
  },
  "cookie.acceptAll": { it: "Accetta tutti", en: "Accept all" },
  "cookie.rejectAll": { it: "Rifiuta tutti", en: "Reject all" },
  "cookie.customize": { it: "Personalizza", en: "Customize" },
  "cookie.save": { it: "Salva preferenze", en: "Save preferences" },
  "cookie.necessary": { it: "Tecnici essenziali", en: "Strictly necessary" },
  "cookie.necessaryD": { it: "Sessione, sicurezza CSRF, lingua. Sempre attivi.", en: "Session, CSRF security, language. Always on." },
  "cookie.analytics": { it: "Analitici prima parte", en: "First-party analytics" },
  "cookie.analyticsD": { it: "Statistiche aggregate cookieless: IP anonimizzato, nessun identificatore persistente.", en: "Cookieless aggregate statistics: anonymized IP, no persistent identifiers." },
  "cookie.marketing": { it: "Profilazione e marketing", en: "Profiling & marketing" },
  "cookie.marketingD": { it: "Attualmente disabilitato. Nessun pixel di terze parti viene caricato.", en: "Currently disabled. No third-party pixels are loaded." },
  "cookie.manage": { it: "Gestisci cookie", en: "Manage cookies" },
  "cookie.policy": { it: "Cookie policy", en: "Cookie policy" },

  // ---- footer ----
  "footer.menuOrder": { it: "Menu e ordini", en: "Menu & ordering" },
  "footer.company": { it: "Azienda", en: "Company" },
  "footer.legal": { it: "Legale", en: "Legal" },
  "footer.hours": { it: "Orari", en: "Opening hours" },
  "footer.rights": { it: "Tutti i diritti riservati.", en: "All rights reserved." },

  // ---- generici ----
  "common.loading": { it: "Caricamento...", en: "Loading..." },
  "common.error": { it: "Si è verificato un errore. Riprova.", en: "Something went wrong. Please retry." },
  "common.save": { it: "Salva", en: "Save" },
  "common.cancel": { it: "Annulla", en: "Cancel" },
  "common.close": { it: "Chiudi", en: "Close" },
  "common.delete": { it: "Elimina", en: "Delete" },
  "common.edit": { it: "Modifica", en: "Edit" },
  "common.confirm": { it: "Confermi?", en: "Are you sure?" },
  "common.search": { it: "Cerca", en: "Search" },
  "common.send": { it: "Invia", en: "Send" },
  "common.back": { it: "Torna indietro", en: "Go back" },
  "common.today": { it: "oggi", en: "today" },
  "common.closed": { it: "chiuso", en: "closed" },
  "common.open": { it: "aperto", en: "open" },
  "common.kcal": { it: "kcal", en: "kcal" },
  "common.protein": { it: "proteine", en: "protein" },
  "common.fat": { it: "grassi", en: "fat" },
  "common.carb": { it: "carboidrati", en: "carbs" },
  "common.fiber": { it: "fibre", en: "fibre" },
  "common.grams": { it: "g", en: "g" },
  "notfound.title": { it: "Pagina non trovata", en: "Page not found" },
  "notfound.text": { it: "La pagina che cerchi non esiste o è stata spostata.", en: "The page you are looking for does not exist or has moved." },
  "notfound.cta": { it: "Torna alla home", en: "Back to home" },
};

export function makeT(lang: Lang) {
  return (key: string): string => {
    const entry = dict[key];
    if (!entry) return key;
    return entry[lang];
  };
}
