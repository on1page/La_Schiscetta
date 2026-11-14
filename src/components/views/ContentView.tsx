// =====================================================================
// ContentView.tsx - Viste statiche: Nutrition (metodologia),
// Chi siamo, App, 404, Termini d'uso.
// =====================================================================
"use client";

import { Button } from "@/components/ui/button";
import { Breadcrumbs, SectionHeading } from "@/components/site/bits";
import { useT, useContent, useRoute, useLang } from "@/lib/store";
import { QRCodeSVG } from "qrcode.react";
import {
  Scale, FlaskConical, ListChecks, LineChart, ShieldCheck, Apple, Play,
  Compass, Home as HomeIcon,
} from "lucide-react";

// ------------------------------ NUTRITION ------------------------------

export function NutritionView() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const navigate = useRoute((s) => s.navigate);

  const pillars = [
    {
      icon: Scale,
      title: lang === "en" ? "Declared like a label" : "Dichiarato come un'etichetta",
      text:
        lang === "en"
          ? "Every dish declares calories, protein, fat, carbohydrates and fibre per 100 g, with ingredients listed by decreasing weight as required by EU Reg. 1169/2011. No estimates, no guesswork."
          : "Ogni piatto dichiara calorie, proteine, grassi, carboidrati e fibre per 100 g, con ingredienti elencati in ordine decrescente di quantità come richiesto dal Reg. UE 1169/2011. Nessuna stima, nessuna approssimazione.",
    },
    {
      icon: FlaskConical,
      title: lang === "en" ? "EFSA-compliant claims only" : "Solo claim conformi EFSA",
      text:
        lang === "en"
          ? "Where a nutrition claim appears, it comes exclusively from the EFSA authorized register (EU Reg. 1924/2006). For creatine, collagen, lion's mane and probiotics we publish only what science and law allow."
          : "Dove compare un claim nutrizionale, proviene esclusivamente dal registro EFSA autorizzato (Reg. UE 1924/2006). Per creatina, collagene, lion's mane e probiotici pubblichiamo solo ciò che scienza e legge consentono.",
    },
    {
      icon: ListChecks,
      title: lang === "en" ? "The 14 allergens, always" : "I 14 allergeni, sempre",
      text:
        lang === "en"
          ? "Gluten, crustaceans, eggs, fish, peanuts, soy, milk, tree nuts, celery, mustard, sesame, sulphites, lupins, molluscs: declared on every dish, cross-contamination protocols per HACCP (EC 852/2004)."
          : "Glutine, crostacei, uova, pesce, arachidi, soia, latte, frutta a guscio, sedano, senape, sesamo, solfiti, lupini, molluschi: dichiarati su ogni piatto, protocolli anti-contaminazione HACCP (CE 852/2004).",
    },
    {
      icon: LineChart,
      title: lang === "en" ? "Feedback loops" : "Cicli di feedback",
      text:
        lang === "en"
          ? "Your orders build an automatic nutrition log. Compare what you eat with your targets, spot imbalances, adjust. Data you can act on, not vanity metrics."
          : "I tuoi ordini costruiscono un diario nutrizionale automatico. Confronta ciò che mangi con i tuoi obiettivi, individua gli squilibri, correggi. Dati su cui agire, non metriche di vanità.",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Breadcrumbs items={[{ label: t("nav.nutrition") }]} />
      <SectionHeading
        overline={lang === "en" ? "The science" : "La scienza"}
        title={lang === "en" ? "Precision is a method, not a slogan" : "La precisione è un metodo, non uno slogan"}
        subtitle={
          lang === "en"
            ? "We translate evidence-based nutrition into dishes you can measure. Here is exactly how."
            : "Traduciamo la nutrizione basata sulle evidenze in piatti che puoi misurare. Ecco come, esattamente."
        }
      />

      <div className="grid gap-5 sm:grid-cols-2">
        {pillars.map((p) => (
          <div key={p.title} className="paper-card p-6">
            <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
              <p.icon className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="text-base font-bold">{p.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
          </div>
        ))}
      </div>

      <div className="paper-card mt-8 border-l-4 !border-l-accent p-6">
        <h2 className="text-base font-bold">
          {lang === "en" ? "What precision nutrition is NOT" : "Cosa NON è la nutrizione di precisione"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {lang === "en"
            ? "It is not a medical therapy, it does not diagnose, treat or prevent any disease, and it does not replace your doctor or dietitian. For clinical conditions, always consult a healthcare professional. Our data is a compass for everyday choices: informative, transparent, never therapeutic."
            : "Non è una terapia medica, non diagnostica, non cura e non previene alcuna malattia, e non sostituisce il tuo medico o dietista. Per condizioni cliniche consulta sempre un professionista sanitario. I nostri dati sono una bussola per le scelte di tutti i giorni: informativi, trasparenti, mai terapeutici."}
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={() => navigate("/menu")}>{t("hero.cta.menu")}</Button>
        <Button size="lg" variant="outline" onClick={() => navigate("/faq")}>{t("nav.faq")}</Button>
      </div>
    </div>
  );
}

// ------------------------------ CHI SIAMO ------------------------------

export function AboutView() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const { company } = useContent();
  const navigate = useRoute((s) => s.navigate);

  const team = [
    { name: "Elena Carta", role: lang === "en" ? "Founder & Head Chef" : "Fondatrice & Head Chef", bio: lang === "en" ? "Ten years between Milan and Copenhagen, back home to prove that healthy can taste like Sardinia." : "Dieci anni tra Milano e Copenaghen, tornata a casa per dimostrare che sano può avere il gusto della Sardegna." },
    { name: "Pietro Mura", role: lang === "en" ? "Nutrition Science Lead" : "Responsabile Nutrizione", bio: lang === "en" ? "Food technologist. He builds the recipes the way others write lab reports: with declared values." : "Tecnologo alimentare. Costruisce le ricette come altri scrivono relazioni di laboratorio: con valori dichiarati." },
    { name: "Giacomo Dessì", role: lang === "en" ? "Operations & Delivery" : "Operazioni & Delivery", bio: lang === "en" ? "From the kitchen to your office in thirty minutes, with the cold chain intact." : "Dalla cucina al tuo ufficio in trenta minuti, con la catena del freddo intatta." },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Breadcrumbs items={[{ label: t("nav.about") }]} />
      <SectionHeading
        overline={lang === "en" ? "Our story" : "La nostra storia"}
        title={lang === "en" ? "Born from a lunchbox, raised on data" : "Nata da una schiscetta, cresciuta sui dati"}
        subtitle={
          lang === "en"
            ? "La Schiscetta is the Milanese word for a lunchbox: the humble container of every office lunch. We turned it into a philosophy."
            : "La schiscetta è il contenitore di ogni pranzo d'ufficio. Noi l'abbiamo trasformata in una filosofia."
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border shadow-lg">
          {company?.aboutUrl ? (
             
            <img
              src={company.aboutUrl}
              alt="Interno del ristorante La Schiscetta"
              width={880} height={660}
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center bg-secondary text-6xl" aria-hidden>🏛️</div>
          )}
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            {lang === "en"
              ? "It started in 2025 with a spreadsheet and a question: why does eating well at work have to be either sad or expensive? Elena was meal-prepping for the whole studio, Pietro was calculating macros by hand, and the two ideas collided."
              : "È iniziata nel 2025 con un foglio di calcolo e una domanda: perché mangiare bene al lavoro deve essere o triste o costoso? Elena preparava pasti per tutto lo studio, Pietro calcolava macro a mano: le due idee si sono scontrate."}
          </p>
          <p>
            {lang === "en"
              ? "Today we are a fast-casual restaurant in the heart of Cagliari where every dish is born from a chef recipe and is declared like a nutrition label. You pick the weight, the price follows the grams, and your account turns history into insight."
              : "Oggi siamo un ristorante fast-casuale nel cuore di Cagliari dove ogni piatto nasce da una ricetta chef ed è dichiarato come un'etichetta nutrizionale. Scegli il peso, il prezzo segue i grammi, e il tuo account trasforma lo storico in consapevolezza."}
          </p>
          <p>
            {lang === "en"
              ? "We buy Sardinian: carasau bread, pecorino, Muravera lemons, Ullastru lentils, Campidano vegetables. Short supply chains, less waste, better data."
              : "Compriamo sardo: pane carasau, pecorino, limoni di Muravera, lenticchie di Ullastru, ortaggi del Campidano. Filiera corta, meno sprechi, dati migliori."}
          </p>
        </div>
      </div>

      <div className="mt-14">
        <SectionHeading overline={lang === "en" ? "The team" : "Il team"} title={lang === "en" ? "Three people, one lunchbox" : "Tre persone, una schiscetta"} />
        <div className="grid gap-5 sm:grid-cols-3">
          {team.map((m) => (
            <div key={m.name} className="paper-card p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {m.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <h3 className="mt-4 font-bold">{m.name}</h3>
              <p className="text-sm font-medium text-accent">{m.role}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.bio}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="paper-card mt-10 flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="font-semibold">
          {lang === "en" ? "Come say hello: Via Roma 100, Cagliari." : "Vieni a trovarci: Via Roma 100, Cagliari."}
        </p>
        <Button onClick={() => navigate("/locations")}>{t("nav.locations")}</Button>
      </div>
    </div>
  );
}

// ------------------------------ APP ------------------------------

export function AppView() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const navigate = useRoute((s) => s.navigate);

  const features = [
    lang === "en" ? "Order in two taps, saved cards" : "Ordina in due tocchi, carte salvate",
    lang === "en" ? "Automatic meal tracking" : "Tracciamento pasti automatico",
    lang === "en" ? "Personalized insights" : "Insight personalizzati",
    lang === "en" ? "Progress monitoring" : "Monitoraggio dei progressi",
    lang === "en" ? "Manual food logging" : "Diario alimentare manuale",
    lang === "en" ? "Favourites and one-tap reorder" : "Preferiti e riordino con un tocco",
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Breadcrumbs items={[{ label: t("nav.app") }]} />
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <SectionHeading
            overline={lang === "en" ? "La Schiscetta App" : "App La Schiscetta"}
            title={lang === "en" ? "Your precision nutrition, pocket-sized" : "La tua nutrizione di precisione, in tasca"}
            subtitle={
              lang === "en"
                ? "The same experience as the web, with the speed of native. Free, EU servers, no third-party trackers."
                : "La stessa esperienza del web, con la velocità del nativo. Gratis, server UE, nessun tracker di terze parti."
            }
          />
          <ul className="space-y-2.5">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-foreground px-5 transition-opacity hover:opacity-85"
              style={{ color: "oklch(0.981 0.011 92)" }}
              aria-label="Scarica su App Store"
            >
              <Apple className="h-5 w-5" aria-hidden />
              <span className="text-left leading-none">
                <span className="block text-[9px] uppercase tracking-wide opacity-70">Scarica su</span>
                <span className="block text-sm font-semibold">App Store</span>
              </span>
            </button>
            <button
              className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-foreground px-5 transition-opacity hover:opacity-85"
              style={{ color: "oklch(0.981 0.011 92)" }}
              aria-label="Disponibile su Google Play"
            >
              <Play className="h-5 w-5" aria-hidden />
              <span className="text-left leading-none">
                <span className="block text-[9px] uppercase tracking-wide opacity-70">Disponibile su</span>
                <span className="block text-sm font-semibold">Google Play</span>
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-5">
          {/* mockup telefono in CSS puro */}
          <div className="relative w-64 rounded-[2.2rem] border-[10px] border-foreground bg-card p-4 shadow-2xl" aria-hidden>
            <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-muted-foreground/30" />
            <div className="rounded-xl bg-primary p-4 text-primary-foreground">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Ciao Giulia</p>
              <p className="mt-1 text-lg font-bold leading-tight">Oggi hai<br />mangiato così</p>
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                {[
                  ["1.240", "kcal"],
                  ["96 g", "P"],
                  ["21 g", "F"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-lg bg-white/15 py-1.5">
                    <p className="font-data text-xs font-bold">{v}</p>
                    <p className="text-[9px] opacity-75">{l}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {["Pollo Mediterraneo · 350 g", "Verde Pulito · 400 g"].map((x) => (
                <div key={x} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-[11px] font-medium">{x}</span>
                  <span className="font-data text-[11px] font-bold text-primary">✓</span>
                </div>
              ))}
              <div className="rounded-lg bg-secondary px-3 py-2 text-center text-[11px] font-bold text-primary">
                Riordina i preferiti
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-3 shadow-lg">
            <QRCodeSVG value="https://laschiscetta.example.it/app" size={120} level="M" fgColor="#1F231C" />
          </div>
          <p className="font-data text-xs text-muted-foreground">laschiscetta.example.it/app</p>
        </div>
      </div>
    </div>
  );
}

// ------------------------------ 404 ------------------------------

export function NotFoundView({ path }: { path: string }) {
  const t = useT();
  const navigate = useRoute((s) => s.navigate);
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <Compass className="h-14 w-14 text-muted-foreground/40" aria-hidden />
      <p className="font-data mt-6 text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t("notfound.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("notfound.text")}</p>
      {path && <p className="font-data mt-2 text-xs text-muted-foreground">#/{path}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => navigate("/")}>
          <HomeIcon className="mr-2 h-4 w-4" aria-hidden /> {t("notfound.cta")}
        </Button>
        <Button variant="outline" onClick={() => navigate("/menu")}>{t("nav.menu")}</Button>
      </div>
    </div>
  );
}

// ------------------------------ TERMINI ------------------------------

export function TermsView() {
  const t = useT();
  const { company } = useContent();
  const lang = useLang((s) => s.lang);
  const en = lang === "en";

  const sections: [string, string[]][] = [
    [
      en ? "1. Scope" : "1. Ambito",
      [
        en
          ? `These terms govern the use of the website and app of ${company?.legalName ?? "La Schiscetta S.r.l."} ("La Schiscetta"), with registered office in ${company?.street ?? "Via Roma"} ${company?.streetNumber ?? "100"}, ${company?.zip ?? "09124"} ${company?.city ?? "Cagliari"} (CA), Italy.`
          : `I presenti termini disciplinano l'utilizzo del sito e dell'app di ${company?.legalName ?? "La Schiscetta S.r.l."} ("La Schiscetta"), con sede in ${company?.street ?? "Via Roma"} ${company?.streetNumber ?? "100"}, ${company?.zip ?? "09124"} ${company?.city ?? "Cagliari"} (CA), Italia.`,
      ],
    ],
    [
      en ? "2. Orders and pricing" : "2. Ordini e prezzi",
      [
        en
          ? "Prices are displayed per 100 grams (EUR/100 g). The final price is calculated server-side based on the selected weight and any add-ins. An order is binding once the confirmation email is received. For deliveries, the applicable zones and minimum orders are shown at checkout."
          : "I prezzi sono esposti per 100 grammi (EUR/100 g). Il prezzo finale è calcolato dal server in base al peso selezionato e agli eventuali add-in. L'ordine si perfeziona con la ricezione dell'email di conferma. Per le consegne, le zone applicabili e gli ordini minimi sono indicati al checkout.",
      ],
    ],
    [
      en ? "3. Withdrawal (Consumer Code)" : "3. Diritto di recesso (Codice del Consumo)",
      [
        en
          ? "For distance sales, the consumer has 14 days to withdraw (D.Lgs. 206/2005). Exception: perishable goods customized to your specifications (weight, add-ins) are excluded from withdrawal pursuant to art. 59(c)(2), as they deteriorate rapidly."
          : "Per le vendite a distanza il consumatore ha 14 giorni di tempo per esercitare il recesso (D.Lgs. 206/2005). Eccezione: i prodotti deperibili personalizzati secondo le tue specifiche (peso, add-in) sono esclusi dal recesso ai sensi dell'art. 59 c.2, in quanto soggetti a rapida deteriorazione.",
      ],
    ],
    [
      en ? "4. Nutrition information" : "4. Informazioni nutrizionali",
      [
        en
          ? "Nutritional values are provided for information purposes and do not constitute medical advice. Health claims, where present, are exclusively from the EFSA authorized register (EU Reg. 1924/2006). Allergen declarations follow EU Reg. 1169/2011: always inform staff of allergies."
          : "I valori nutrizionali sono forniti a scopo informativo e non costituiscono consiglio medico. I claim salute, dove presenti, provengono esclusivamente dal registro EFSA autorizzato (Reg. UE 1924/2006). Le dichiarazioni allergeni seguono il Reg. UE 1169/2011: segnala sempre al personale le tue allergie.",
      ],
    ],
    [
      en ? "5. Liability" : "5. Responsabilità",
      [
        en
          ? "La Schiscetta is liable per Italian law for damages caused by its products. Liability for indirect damages is excluded to the extent permitted by law. Nothing here limits consumer statutory rights."
          : "La Schiscetta risponde secondo la legge italiana per i danni causati dai propri prodotti. La responsabilità per danni indiretti è esclusa nei limiti consentiti dalla legge. Nulla limita i diritti statutari del consumatore.",
      ],
    ],
    [
      en ? "6. Applicable law and jurisdiction" : "6. Legge applicabile e foro competente",
      [
        en
          ? "These terms are governed by Italian law. For disputes, the competent court is the Court of Cagliari, without prejudice to mandatory consumer protections."
          : "I presenti termini sono disciplinati dalla legge italiana. Per le controversie è competente il Foro di Cagliari, salvo quanto previsto a tutela del consumatore.",
      ],
    ],
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumbs items={[{ label: "Termini d'uso" }]} />
      <SectionHeading overline={en ? "Legal" : "Legale"} title={en ? "Terms of use" : "Termini d'uso"} />
      <div className="space-y-6">
        {sections.map(([title, paras]) => (
          <section key={title}>
            <h2 className="mb-2 text-base font-bold">{title}</h2>
            {paras.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-muted-foreground">{p}</p>
            ))}
          </section>
        ))}
      </div>
      <p className="mt-8 text-xs text-muted-foreground">
        {en ? "Last revision: current version." : "Ultima revisione: versione corrente."}
      </p>
    </div>
  );
}

// ------------------------- DISPATCHER -------------------------

export function ContentView({ view, path }: { view: string; path?: string }) {
  switch (view) {
    case "nutrition": return <NutritionView />;
    case "about": return <AboutView />;
    case "app": return <AppView />;
    case "terms": return <TermsView />;
    case "notfound": return <NotFoundView path={path ?? ""} />;
    default: return <NotFoundView path="" />;
  }
}
