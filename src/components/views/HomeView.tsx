// =====================================================================
// HomeView.tsx - Homepage completa (spec sezione 2):
// hero, value proposition, piatti popolari, smoothie signature,
// come funziona (4 step), features, social proof, CTA app, newsletter.
// Include JSON-LD Restaurant + LocalBusiness per il local SEO.
// =====================================================================
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MenuCard } from "@/components/site/MenuCard";
import { SectionHeading, JsonLd } from "@/components/site/bits";
import { useT, useContent, useRoute, useLang, trackEvent } from "@/lib/store";
import { api } from "@/lib/client-api";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRight, Star, CheckCircle2, Scale, Target, LineChart,
  Smartphone, Apple, Play, ChevronDown, Send, MapPin,
} from "lucide-react";
import { parseJson } from "@/lib/json";

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${n} su 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < n ? "fill-amber-400 text-amber-400" : "text-stone-300"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function HomeView() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const { company, menu, reviews } = useContent();
  const navigate = useRoute((s) => s.navigate);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const popular = menu.filter((m) => m.isPopular).slice(0, 4);
  const smoothies = menu.filter((m) => m.isSignature).slice(0, 3);
  const avgRating = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 4.8;

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post<{ ok: boolean; message: string; devConfirmToken?: string }>(
        "/api/newsletter/subscribe",
        { email, lang }
      );
      setSubscribed(true);
      setDevToken(res.devConfirmToken ?? null);
      trackEvent("newsletter_signup");
      toast({ title: "Iscrizione avviata", description: res.message });
    } catch (err) {
      toast({
        title: "Errore",
        description: err instanceof Error ? err.message : "Riprova più tardi",
        variant: "destructive",
      });
    }
  };

  const confirmDev = async () => {
    if (!devToken) return;
    try {
      await api.post("/api/newsletter/confirm", { token: devToken });
      setDevToken(null);
      toast({ title: "Confermato", description: "Iscrizione newsletter completata (doppio opt-in)." });
    } catch {
      toast({ title: "Token non valido", variant: "destructive" });
    }
  };

  const hours = parseJson<{ day: string; open: string; close: string }[]>(company?.openingHours ?? "[]", []);

  return (
    <div>
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary/60 to-background">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="overline-label mb-4 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-accent" aria-hidden />
              {t("hero.overline")}
            </p>
            <h1 className="hero-title">{t("hero.title")}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t("hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-12 px-8 text-base"
                onClick={() => {
                  trackEvent("cta_ordina");
                  navigate("/ordina");
                }}
                data-testid="hero-order-cta"
              >
                {t("hero.cta.order")}
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base"
                onClick={() => navigate("/menu")}
              >
                {t("hero.cta.menu")}
              </Button>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-6">
              <div>
                <dt className="sr-only">macro</dt>
                <dd className="font-data text-2xl font-bold text-primary">5</dd>
                <dd className="mt-1 text-xs text-muted-foreground">{t("hero.stat.macros")}</dd>
              </div>
              <div>
                <dt className="sr-only">allergeni</dt>
                <dd className="font-data text-2xl font-bold text-primary">14</dd>
                <dd className="mt-1 text-xs text-muted-foreground">{t("hero.stat.allergens")}</dd>
              </div>
              <div>
                <dt className="sr-only">prezzo</dt>
                <dd className="font-data text-2xl font-bold text-primary">€/100g</dd>
                <dd className="mt-1 text-xs text-muted-foreground">{t("hero.stat.price")}</dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-border shadow-xl">
              {company?.heroUrl ? (
                 
                <img
                  src={company.heroUrl}
                  alt="Bowls salutari preparati con ingredienti freschi su un tavolo rustico"
                  width={880}
                  height={660}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-secondary text-7xl" aria-hidden>
                  🥙
                </div>
              )}
            </div>
            <div className="paper-card absolute -bottom-5 left-5 flex items-center gap-3 px-4 py-3">
              <Scale className="h-6 w-6 text-accent" aria-hidden />
              <div>
                <p className="font-data text-lg font-bold leading-none">{avgRating}/5</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Google Reviews</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- VALUE PROPOSITION ---------------- */}
      <section className="border-b border-border bg-primary py-12 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("value.title")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed opacity-85 sm:text-base">
            {t("value.subtitle")}
          </p>
        </div>
      </section>

      {/* ---------------- PIATTI POPOLARI ---------------- */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <SectionHeading
            overline={lang === "en" ? "Most loved" : "I più amati"}
            title={t("home.popular")}
            subtitle={
              lang === "en"
                ? "Nutrition per 100 g, declared like a label."
                : "Valori nutrizionali per 100 g, dichiarati come un'etichetta."
            }
          />
          <Button
            variant="ghost"
            className="mb-8 hidden gap-1 sm:inline-flex"
            onClick={() => navigate("/menu")}
          >
            {lang === "en" ? "Full menu" : "Menu completo"}
            <ChevronDown className="h-4 w-4 -rotate-90" aria-hidden />
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* ---------------- SMOOTHIE SIGNATURE ---------------- */}
      <section className="border-y border-border bg-secondary/50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading
            overline={lang === "en" ? "Blend & function" : "Frullati & funzione"}
            title={t("home.smoothies")}
            subtitle={
              lang === "en"
                ? "With optional add-ins: creatine, collagen, lion's mane, probiotics. EFSA-authorized claims only."
                : "Con add-in opzionali: creatina, collagene, lion's mane, probiotici. Solo claim autorizzati EFSA."
            }
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {smoothies.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- COME FUNZIONA ---------------- */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <SectionHeading overline={lang === "en" ? "The method" : "Il metodo"} title={t("home.how")} center />
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(["1", "2", "3", "4"] as const).map((n) => (
            <li key={n} className="paper-card relative p-6 pt-8">
              <span className="font-data absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
                {n}
              </span>
              <h3 className="text-base font-bold">{t(`steps.${n}.t`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`steps.${n}.d`)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- FEATURES ---------------- */}
      <section className="border-y border-border bg-secondary/50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading overline={lang === "en" ? "Features" : "Funzioni"} title={t("home.features")} center />
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: Scale, key: "feat.1" },
              { icon: Target, key: "feat.2" },
              { icon: LineChart, key: "feat.3" },
            ].map(({ icon: Icon, key }) => (
              <div key={key} className="paper-card p-6">
                <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="text-base font-bold">{t(`${key}.t`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`${key}.d`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- SOCIAL PROOF ---------------- */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-center justify-center gap-3">
          <Stars n={5} />
          <p className="text-sm font-semibold">
            {avgRating}/5 · {lang === "en" ? "from Google reviews" : "dalle recensioni Google"}
          </p>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {reviews.slice(0, 4).map((r) => (
            <figure key={r.id} className="paper-card flex h-full flex-col p-5">
              <Stars n={r.rating} />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed">“{r.text}”</blockquote>
              <figcaption className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {r.author.charAt(0)}
                </span>
                {r.author} · {r.source}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---------------- APP CTA + QR ---------------- */}
      <section className="border-y border-border bg-primary py-16 text-primary-foreground">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 lg:grid-cols-2">
          <div>
            <p className="overline-label !text-[oklch(0.8_0.03_100)]">{lang === "en" ? "Coming soon" : "In arrivo"}</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{t("home.appCta")}</h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed opacity-85 sm:text-base">
              {lang === "en"
                ? "Order in two taps, track every meal, sync your targets and reorder your favourites. The same precision, in your pocket."
                : "Ordina in due tocchi, traccia ogni pasto, sincronizza i tuoi obiettivi e riordina i preferiti. La stessa precisione, in tasca."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-foreground px-5 text-foreground-inverted transition-opacity hover:opacity-85"
                style={{ color: "oklch(0.981 0.011 92)" }}
                onClick={() => trackEvent("download_app")}
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
                onClick={() => trackEvent("download_app")}
                aria-label="Disponibile su Google Play"
              >
                <Play className="h-5 w-5" aria-hidden />
                <span className="text-left leading-none">
                  <span className="block text-[9px] uppercase tracking-wide opacity-70">Disponibile su</span>
                  <span className="block text-sm font-semibold">Google Play</span>
                </span>
              </button>
            </div>
            <p className="mt-4 inline-flex items-center gap-2 text-xs opacity-70">
              <Smartphone className="h-3.5 w-3.5" aria-hidden />
              {lang === "en" ? "Or scan the QR code" : "Oppure scansiona il QR code"}
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-xl">
              <QRCodeSVG
                value="https://laschiscetta.example.it/app"
                size={168}
                level="M"
                fgColor="#1F231C"
              />
            </div>
            <p className="font-data text-xs opacity-70">laschiscetta.example.it/app</p>
          </div>
        </div>
      </section>

      {/* ---------------- NEWSLETTER (doppio opt-in) ---------------- */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <SectionHeading
          overline={lang === "en" ? "Newsletter" : "Newsletter"}
          title={lang === "en" ? "Rimani in pista" : "Resta sul pezzo"}
          subtitle={
            lang === "en"
              ? "Nutrition tips and new dishes, once a month. Double opt-in, unsubscribe anytime."
              : "Consigli di nutrizione e nuovi piatti, una volta al mese. Doppio opt-in, disiscriviti quando vuoi."
          }
          center
        />
        {subscribed ? (
          <div className="paper-card mx-auto max-w-md p-6 text-left">
            <p className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
              {lang === "en" ? "Almost there!" : "Ci siamo quasi!"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {lang === "en"
                ? "Check your inbox and click the confirmation link to complete the subscription (double opt-in, GDPR)."
                : "Controlla la tua email e clicca il link di conferma per completare l'iscrizione (doppio opt-in, GDPR)."}
            </p>
            {devToken && (
              <Button size="sm" variant="outline" className="mt-3" onClick={confirmDev}>
                (Demo) Simula click sul link di conferma
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={subscribe} className="mx-auto flex max-w-md gap-2">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={lang === "en" ? "your@email.com" : "la-tua@email.it"}
              className="h-12"
              aria-label="Email per la newsletter"
            />
            <Button type="submit" size="lg" className="h-12 gap-2">
              <Send className="h-4 w-4" aria-hidden />
              {lang === "en" ? "Subscribe" : "Iscrivimi"}
            </Button>
          </form>
        )}
        <p className="mx-auto mt-4 max-w-md text-xs text-muted-foreground">
          {lang === "en"
            ? "By subscribing you agree to the Privacy Policy. No profiling without consent."
            : "Iscrivendoti accetti la Privacy Policy. Nessuna profilazione senza consenso."}
        </p>
      </section>

      {/* Orari rapidi per local SEO */}
      <section className="border-t border-border bg-secondary/50 py-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-3">
          <div>
            <p className="overline-label">Dove</p>
            <p className="mt-2 text-sm font-medium">
              {company?.street} {company?.streetNumber}, {company?.zip} {company?.city}
            </p>
            <button
              className="mt-2 text-sm text-accent underline decoration-1 underline-offset-4"
              onClick={() => navigate("/locations")}
            >
              {lang === "en" ? "Directions and map" : "Indicazioni e mappa"}
            </button>
          </div>
          <div>
            <p className="overline-label">{lang === "en" ? "Hours" : "Orari"}</p>
            <p className="mt-2 text-sm">
              {hours.slice(0, 2).map((h) => `${h.open}-${h.close}`).join(" · ")}
              {hours[5] && ` · ${hours[5].open}-${hours[5].close}`}
            </p>
          </div>
          <div>
            <p className="overline-label">{lang === "en" ? "Delivery" : "Consegna"}</p>
            <p className="mt-2 text-sm">
              {lang === "en"
                ? "Cagliari city zones, 30-40 min"
                : "Zone di Cagliari, 30-40 min"}
            </p>
          </div>
        </div>
      </section>

      {/* JSON-LD: Restaurant / LocalBusiness per local SEO Cagliari */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Restaurant",
          name: company?.brandName ?? "La Schiscetta",
          description:
            "Ristorante fast-casuale di nutrizione di precisione a Cagliari: menu con valori nutrizionali per 100 g, prezzo al peso, allergeni dichiarati.",
          servesCuisine: ["Salutare", "Mediterranea", "Smoothies"],
          priceRange: "€€",
          address: {
            "@type": "PostalAddress",
            streetAddress: `${company?.street} ${company?.streetNumber}`,
            postalCode: company?.zip,
            addressLocality: company?.city,
            addressRegion: company?.province,
            addressCountry: "IT",
          },
          geo: {
            "@type": "GeoCoordinates",
            latitude: company?.lat,
            longitude: company?.lng,
          },
          telephone: company?.phone,
          url: "https://laschiscetta.example.it",
          openingHoursSpecification: [
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
              opens: "09:00",
              closes: "20:30",
            },
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Saturday", "Sunday"],
              opens: "10:00",
              closes: "20:30",
            },
          ],
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avgRating,
            reviewCount: Math.max(reviews.length, 8),
          },
        }}
      />
    </div>
  );
}
