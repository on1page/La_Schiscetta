// =====================================================================
// LegalViews.tsx - FAQ (con FAQPage JSON-LD), Privacy Policy (sezioni
// dal DB, gestite dal backend con versionamento) e Cookie Policy
// (tabella cookie dal DB + link "Gestisci cookie").
// =====================================================================
"use client";

import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Breadcrumbs, SectionHeading, JsonLd } from "@/components/site/bits";
import { useT, useContent, useConsentUI } from "@/lib/store";
import { Settings2 } from "lucide-react";

// ------------------------------ FAQ ------------------------------

const FAQS: { q: string; a: string }[] = [
  {
    q: "Come funziona il prezzo al peso (€/100 g)?",
    a: "Ogni voce del menu ha un prezzo per 100 grammi. Quando personalizzi il peso del piatto, il calcolatore aggiorna in tempo reale prezzo e valori nutrizionali. Paghi esattamente i grammi che prendi: nessuna porzione standard, nessuno spreco.",
  },
  {
    q: "I valori nutrizionali sono esatti?",
    a: "Sono dichiarati per 100 g come un'etichetta nutrizionale, sulla base delle ricette standard del laboratorio. Piccole variazioni sono possibili con la stagionalità degli ingredienti; le variazioni sostanziali aggiornano subito la scheda del piatto.",
  },
  {
    q: "Come dichiarate gli allergeni?",
    a: "Ogni piatto dichiara esplicitamente gli allergeni del Regolamento UE 1169/2011 (i 14 obbligatori: glutine, crostacei, uova, pesce, arachidi, soia, latte, frutta a guscio, sedano, senape, sesamo, solfiti, lupini, molluschi). Il nostro backend non permette la pubblicazione di un piatto senza dichiarazione allergeni. In cucina applichiamo protocolli HACCP per le contaminazioni crociate: in caso di allergia segnala sempre al momento dell'ordine.",
  },
  {
    q: "Cosa sono gli add-in e sono sicuri?",
    a: "Sono integrazioni facoltative (creatina, collagene, estratto di lion's mane, probiotici) che puoi aggiungere a smoothie e colazioni. Sono integratori notificati ai sensi del D.Lgs. 169/2004 e pubblichiamo esclusivamente claim autorizzati dal registro EFSA (Reg. UE 1924/2006): dove la scienza non autorizza dichiarazioni, non ne facciamo. Non sono adatti a tutti: in caso di patologie, gravidanza o terapie consulta il medico.",
  },
  {
    q: "Quali zone di consegna coprite?",
    a: "Consegniamo nelle zone centrali di Cagliari: Centro Storico (Castello e Marina), Stampace, Villanova, San Benedetto e Poetto/Quartiere Europo. I tempi sono di 30-40 minuti con catena del freddo garantita. Ogni zona ha un ordine minimo indicato al checkout.",
  },
  {
    q: "Posso pagare con la carta?",
    a: "Sì: online con carta tramite il nostro gateway di pagamento con autenticazione forte 3D Secure (SCA, PSD2). I dati carta non transitano dai nostri server (tokenizzazione client-side, PCI-DSS). Puoi anche scegliere di pagare al ritiro o alla consegna.",
  },
  {
    q: "Come funzionano i cookie e la privacy?",
    a: "Installiamo solo cookie tecnici necessari (sessione, sicurezza, lingua). Le statistiche aggregate si attivano solo se dai il consenso, e avvengono senza cookie e con IP anonimizzato. Nessun cookie di profilazione senza consenso esplicito. Puoi cambiare idea in ogni momento dal link 'Gestisci cookie' nel footer.",
  },
  {
    q: "Fate catering per uffici ed eventi?",
    a: "Sì, da 5 a 500 persone: pranzi d'ufficio ricorrenti, meal prep settimanale, eventi sportivi e aziendali. Ogni proposta include macro per persona e opzioni GF/V/keto etichettate. Richiedi il preventivo dalla pagina Catering: rispondiamo entro 24 ore lavorative.",
  },
];

export function FaqView() {
  const t = useT();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumbs items={[{ label: "FAQ" }]} />
      <SectionHeading
        overline="Domande e risposte"
        title="Tutto quello che ci chiedete"
        subtitle="Prezzi, allergeni, privacy e consegne: le risposte dirette, senza giri di parole."
      />
      <Accordion type="single" collapsible className="mt-2">
        {FAQS.map((f, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left text-[15px] font-semibold">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-muted-foreground">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
    </div>
  );
}

// ------------------------------ PRIVACY ------------------------------

export function PrivacyView() {
  const t = useT();
  const { privacy, loaded } = useContent();

  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumbs items={[{ label: "Privacy Policy" }]} />
      <SectionHeading
        overline="GDPR · Reg. UE 2016/679 · D.Lgs. 196/2003"
        title="Privacy Policy"
        subtitle={`Versione ${privacy.version} · aggiornata il ${new Date(privacy.updatedAt).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}`}
      />
      <div className="space-y-8">
        {privacy.sections.map((s) => (
          <section key={s.id}>
            <h2 className="mb-2 text-base font-bold">{s.title}</h2>
            {s.body.split("\n\n").map((p, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

// ------------------------------ COOKIE POLICY ------------------------------

export function CookiePolicyView() {
  const t = useT();
  const { cookies, privacy } = useContent();
  const openBanner = useConsentUI((s) => s.openBanner);

  const categories: { code: string; title: string; desc: string }[] = [
    {
      code: "TECNICI",
      title: "1. Cookie tecnici essenziali",
      desc: "Necessari al funzionamento del sito e alla sicurezza. Non richiedono consenso (art. 122 Codice Privacy). Include sessione, token CSRF, sessione admin e preferenza lingua.",
    },
    {
      code: "ANALITICI_1P",
      title: "2. Analitici di prima parte (opt-in)",
      desc: "Statistiche aggregate raccolte in modo cookieless: IP anonimizzato (ultimi octet azzerati), pseudonimo giornaliero non persistente, conservazione massima 24 mesi. Attivi solo dopo consenso esplicito.",
    },
    {
      code: "ANALITICI_3P",
      title: "3. Analitici di terza parte (opt-in, disabilitati)",
      desc: "Google Analytics 4. Attualmente DISABILITATI: nessuno script di Google viene caricato. Se attivati in futuro, verranno installati solo dopo consenso positivo.",
    },
    {
      code: "PROFILAZIONE",
      title: "4. Profilazione e marketing (opt-in, disabilitati)",
      desc: "Meta Pixel e TikTok Pixel. Attualmente DISABILITATI e mai caricati senza consenso positivo esplicito.",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumbs items={[{ label: t("cookie.policy") }]} />
      <SectionHeading
        overline="Provvedimento Garante Privacy n. 231/2021"
        title="Cookie Policy"
        subtitle={`Versione ${privacy.version} · aggiornata al ${new Date(privacy.updatedAt).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}`}
      />

      <div className="paper-card mb-8 flex flex-wrap items-center justify-between gap-4 border-l-4 !border-l-accent p-5">
        <p className="max-w-md text-sm">
          Puoi modificare le tue preferenze in qualsiasi momento: il consenso è revocabile con effetto immediato.
        </p>
        <Button onClick={openBanner} className="gap-2" data-testid="open-cookie-banner">
          <Settings2 className="h-4 w-4" aria-hidden /> {t("cookie.manage")}
        </Button>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Questo sito utilizza cookie e tecnologie simili come descritto di seguito. La scelta del consenso è libera,
        granulare per categoria e non condiziona l'accesso ai contenuti del sito.
      </p>

      {categories.map((cat) => {
        const rows = cookies.filter((c) => c.category === cat.code);
        return (
          <section key={cat.code} className="mt-8">
            <h2 className="text-base font-bold">{cat.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{cat.desc}</p>
            {rows.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2.5 font-semibold">Cookie</th>
                      <th className="px-3 py-2.5 font-semibold">Fornitore</th>
                      <th className="px-3 py-2.5 font-semibold">Finalità</th>
                      <th className="px-3 py-2.5 font-semibold">Durata</th>
                      <th className="px-3 py-2.5 font-semibold">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.id} className="border-b border-border/60 last:border-0">
                        <td className="font-data px-3 py-2.5 font-semibold">{c.name}</td>
                        <td className="px-3 py-2.5">{c.provider}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{c.purpose}</td>
                        <td className="px-3 py-2.5">{c.duration}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              c.required
                                ? "bg-emerald-100 text-emerald-800"
                                : c.active
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-stone-200 text-stone-600"
                            }`}
                          >
                            {c.required ? "Sempre attivo" : c.active ? "Con consenso" : "Disabilitato"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}

      <section className="mt-8">
        <h2 className="text-base font-bold">Come esercitare i diritti</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Per revocare il consenso usa il pulsante qui sopra o il link nel footer. Per tutti i diritti GDPR
          (accesso, rettifica, cancellazione, portabilità) puoi usare gli strumenti della tua area personale o
          scrivere al DPO. La registrazione del consenso è conservata per 12 mesi.
        </p>
      </section>
    </div>
  );
}
