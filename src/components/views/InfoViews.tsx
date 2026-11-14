// =====================================================================
// InfoViews.tsx - Locations (mappa OSM senza cookie, orari, quartieri),
// Contatti (form), Catering (form preventivo).
// La mappa usa OpenStreetMap embed: nessun cookie Google, GDPR-friendly.
// =====================================================================
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Breadcrumbs, SectionHeading, JsonLd } from "@/components/site/bits";
import { useT, useContent, useRoute, useLang } from "@/lib/store";
import { api, ApiError } from "@/lib/client-api";
import { toast } from "@/hooks/use-toast";
import { MapPin, Phone, Mail, Clock, Loader2, Bike, Building2, PartyPopper, Users } from "lucide-react";

function useZoneList() {
  return useContent((s) => s.zones);
}

function OsmMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const d = 0.006;
  const bbox = `${lng - d}%2C${lat - d * 0.7}%2C${lng + d}%2C${lat + d * 0.7}`;
  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-lg">
      <iframe
        title={`Mappa: ${label}`}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`}
        className="h-72 w-full sm:h-96"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="flex items-center justify-between gap-3 bg-card px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden /> {label}
        </p>
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline decoration-1 underline-offset-4"
        >
          Apri mappa
        </a>
      </div>
    </div>
  );
}

// ------------------------------ LOCATIONS ------------------------------

export function LocationsView() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const { company, loaded } = useContent();
  const zones = useZoneList();
  const navigate = useRoute((s) => s.navigate);

  if (!loaded || !company) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden /></div>;
  }

  const hours = JSON.parse(company.openingHours) as { day: string; open: string; close: string; closed: boolean }[];
  const holidays = JSON.parse(company.holidays ?? "[]") as { date: string; name: string }[];
  const todayIdx = (new Date().getDay() + 6) % 7;

  const quartieri = [
    { name: "Castello", text: lang === "en" ? "The historic heart: we deliver to the fortified quarter in about 30 minutes." : "Il cuore storico: consegnamo nel quartiere fortificato in circa 30 minuti." },
    { name: "Marina", text: lang === "en" ? "The port district, our daily lunch break crowd." : "Il quartiere del porto, la nostra fauna del pranzo quotidiano." },
    { name: "Stampace", text: lang === "en" ? "From Piazza Yenne to Via Sassari: the delivery zone born for office lunches." : "Da piazza Yenne a via Sassari: la zona delivery nata per i pranzi d'ufficio." },
    { name: "Villanova", text: lang === "en" ? "East of the walls, quiet streets and fast deliveries." : "A est delle mura, strade tranquille e consegne rapide." },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Breadcrumbs items={[{ label: t("nav.locations") }]} />
      <SectionHeading
        overline={lang === "en" ? "Where to find us" : "Dove trovarci"}
        title={lang === "en" ? "One kitchen, four walls, a whole city" : "Una cucina, quattro mura, una città intera"}
        subtitle={
          lang === "en"
            ? `${company.street} ${company.streetNumber}, ${company.zip} ${company.city} (${company.province})`
            : `${company.street} ${company.streetNumber}, ${company.zip} ${company.city} (${company.province}) — a due passi da piazza Yenne e dal porto.`
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <OsmMap lat={company.lat} lng={company.lng} label={`${company.street} ${company.streetNumber}, ${company.city}`} />

        <div className="space-y-6">
          <div className="paper-card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Clock className="h-4 w-4 text-primary" aria-hidden /> {t("footer.hours")}
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {hours.map((h, i) => (
                <li
                  key={h.day}
                  className={`flex items-center justify-between rounded px-2 py-1 ${i === todayIdx ? "bg-secondary font-semibold" : ""}`}
                >
                  <span>{h.day}{i === todayIdx && <span className="ml-2 text-[10px] font-bold uppercase text-accent">{t("common.today")}</span>}</span>
                  <span className="font-data">{h.closed ? t("common.closed") : `${h.open}-${h.close}`}</span>
                </li>
              ))}
            </ul>
            {holidays.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {lang === "en" ? "Italian and Sardinian holidays" : "Festività italiane e sarde"}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {holidays.slice(0, 5).map((h) => `${h.name}`).join(" · ")}{" "}
                  {lang === "en" ? "and more" : "e altre"}
                </p>
              </div>
            )}
          </div>

          <div className="paper-card space-y-3 p-5 text-sm">
            <h2 className="text-base font-bold">{lang === "en" ? "Contacts" : "Contatti"}</h2>
            {company.phone && (
              <p className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <a href={`tel:${company.phone}`} className="font-data hover:underline">{company.phone}</a>
              </p>
            )}
            {company.mobile && (
              <p className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <a href={`tel:${company.mobile}`} className="font-data hover:underline">{company.mobile}</a>
                <span className="text-xs text-muted-foreground">(WhatsApp Business)</span>
              </p>
            )}
            {company.emailInfo && (
              <p className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <a href={`mailto:${company.emailInfo}`} className="hover:underline">{company.emailInfo}</a>
              </p>
            )}
            <Button variant="outline" className="mt-2 w-full" onClick={() => navigate("/contatti")}>
              {t("nav.contacts")}
            </Button>
          </div>
        </div>
      </div>

      {/* Zone delivery */}
      <div className="mt-14">
        <SectionHeading
          overline={lang === "en" ? "Delivery" : "Consegne"}
          title={lang === "en" ? "Delivery zones in Cagliari" : "Le zone di consegna a Cagliari"}
          subtitle={
            lang === "en"
              ? "Thirty to forty minutes from kitchen to desk, cold chain guaranteed."
              : "Da trenta a quaranta minuti dalla cucina alla scrivania, catena del freddo garantita."
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((z) => (
            <div key={z.id} className="paper-card flex items-start gap-3 p-5">
              <Bike className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
              <div>
                <p className="font-semibold">{z.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {z.etaMinutes} min · <span className="font-data">{z.fee.toFixed(2)} €</span> ·{" "}
                  {lang === "en" ? "min" : "minimo"} <span className="font-data">{z.minOrder.toFixed(2)} €</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quartieri: contenuti local SEO */}
      <div className="mt-14">
        <SectionHeading
          overline={lang === "en" ? "Neighbourhoods" : "Quartieri"}
          title={lang === "en" ? "Lunch where you live" : "Il pranzo dove vivi"}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {quartieri.map((q) => (
            <div key={q.name} className="paper-card p-5">
              <p className="flex items-center gap-2 font-semibold">
                <MapPin className="h-4 w-4 text-primary" aria-hidden /> {q.name}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{q.text}</p>
            </div>
          ))}
        </div>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: company.brandName,
          address: {
            "@type": "PostalAddress",
            streetAddress: `${company.street} ${company.streetNumber}`,
            postalCode: company.zip,
            addressLocality: company.city,
            addressRegion: company.province,
            addressCountry: "IT",
          },
          geo: { "@type": "GeoCoordinates", latitude: company.lat, longitude: company.lng },
          telephone: company.phone,
          openingHours: hours
            .filter((h) => !h.closed)
            .map((h) => `${h.day.slice(0, 3)} ${h.open}-${h.close}`),
        }}
      />
    </div>
  );
}

// ------------------------------ CONTATTI ------------------------------

export function ContactsView() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const { company } = useContent();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", consent: false });
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/api/contact", {
        name: form.name,
        email: form.email,
        subject: form.subject || null,
        message: form.message,
        gdprConsent: true,
      });
      toast({ title: "Messaggio inviato", description: "Ti risponderemo entro 48 ore lavorative." });
      setForm({ name: "", email: "", subject: "", message: "", consent: false });
    } catch (err) {
      toast({
        title: "Invio non riuscito",
        description: err instanceof ApiError ? err.message : "Riprova più tardi",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Breadcrumbs items={[{ label: t("nav.contacts") }]} />
      <SectionHeading
        overline={lang === "en" ? "Talk to us" : "Parla con noi"}
        title={t("nav.contacts")}
        subtitle={
          lang === "en"
            ? "Allergies, collaborations, lost Tupperware: we answer everything."
            : "Allergie, collaborazioni, portavivande smarriti: rispondiamo a tutto."
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={submit} className="paper-card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ct-name">{t("checkout.name")}</Label>
              <Input
                id="ct-name" required minLength={2} className="mt-1.5 h-11"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ct-email">{t("checkout.email")}</Label>
              <Input
                id="ct-email" type="email" required className="mt-1.5 h-11"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ct-subject">{lang === "en" ? "Subject" : "Oggetto"}</Label>
            <Input
              id="ct-subject" className="mt-1.5 h-11"
              value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="ct-msg">{lang === "en" ? "Message" : "Messaggio"}</Label>
            <Textarea
              id="ct-msg" required minLength={10} rows={5} className="mt-1.5"
              value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="ct-gdpr" required checked={form.consent}
              onCheckedChange={(v) => setForm({ ...form, consent: v === true })}
              className="mt-1"
            />
            <Label htmlFor="ct-gdpr" className="cursor-pointer text-sm font-normal leading-relaxed">
              {lang === "en"
                ? "I consent to the processing of my data to receive a reply (GDPR art. 6.1.b)."
                : "Acconsento al trattamento dei dati per ricevere una risposta (GDPR art. 6.1.b)."}
            </Label>
          </div>
          <Button type="submit" size="lg" className="h-12 w-full gap-2" disabled={sending || !form.consent}>
            {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {t("common.send")}
          </Button>
        </form>

        <div className="space-y-6">
          {company && (
            <OsmMap lat={company.lat} lng={company.lng} label={`${company.street} ${company.streetNumber}, ${company.city}`} />
          )}
          <div className="paper-card space-y-3 p-5 text-sm">
            {company?.phone && (
              <p className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-primary" aria-hidden />
                <a href={`tel:${company.phone}`} className="font-data hover:underline">{company.phone}</a>
              </p>
            )}
            {company?.whatsapp && (
              <p className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-primary" aria-hidden />
                WhatsApp: <a href={`https://wa.me/${company.whatsapp.replace(/\D/g, "")}`} className="font-data hover:underline">{company.whatsapp}</a>
              </p>
            )}
            {company?.emailPrivacy && (
              <p className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-muted-foreground">Privacy/DPO:</span>
                <a href={`mailto:${company.emailPrivacy}`} className="hover:underline">{company.emailPrivacy}</a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------ CATERING ------------------------------

export function CateringView() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const { company } = useContent();
  const navigate = useRoute((s) => s.navigate);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", eventType: "ufficio",
    guests: 15, date: "", message: "", consent: false,
  });
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/api/catering", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        company: form.company || null,
        eventType: form.eventType,
        guests: Number(form.guests),
        date: form.date || null,
        message: form.message,
        gdprConsent: true,
      });
      toast({
        title: lang === "en" ? "Request received" : "Richiesta ricevuta",
        description: lang === "en"
          ? "We will reply with a quote within 24 working hours."
          : "Risponderemo con un preventivo entro 24 ore lavorative.",
      });
      setForm({ ...form, name: "", email: "", phone: "", message: "", consent: false });
    } catch (err) {
      toast({
        title: "Invio non riuscito",
        description: err instanceof ApiError ? err.message : "Riprova più tardi",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Breadcrumbs items={[{ label: t("nav.catering") }]} />
      <SectionHeading
        overline={lang === "en" ? "Catering" : "Catering"}
        title={lang === "en" ? "Healthy catering for offices and events" : "Catering salutare per uffici ed eventi"}
        subtitle={
          lang === "en"
            ? "Platters, bowls and smoothies with declared nutrition for your team or your guests. Cagliari and province."
            : "Platter, bowl e smoothie con nutrizione dichiarata per il tuo team o i tuoi ospiti. Cagliari e provincia."
        }
      />

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Building2, title: lang === "en" ? "Office lunches" : "Pranzi d'ufficio", text: lang === "en" ? "Recurring or one-off, from 5 people. Individual macros or shared platters." : "Ricorrenti o una tantum, da 5 persone. Macro individuali o platter di condivisione." },
          { icon: PartyPopper, title: lang === "en" ? "Events" : "Eventi", text: lang === "en" ? "Sports events, meetings, openings. GF/V/keto options clearly labelled." : "Eventi sportivi, meeting, inaugurazioni. Opzioni GF/V/keto etichettate chiaramente." },
          { icon: Users, title: lang === "en" ? "Meal prep" : "Meal prep", text: lang === "en" ? "Weekly meal prep for studios and clinics, delivered on schedule." : "Meal prep settimanale per studi e ambulatori, consegnato su calendario." },
        ].map((c) => (
          <div key={c.title} className="paper-card p-5">
            <c.icon className="h-6 w-6 text-accent" aria-hidden />
            <h2 className="mt-3 font-bold">{c.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <form onSubmit={submit} className="paper-card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ca-name">{t("checkout.name")}</Label>
              <Input id="ca-name" required minLength={2} className="mt-1.5 h-11" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ca-company">{lang === "en" ? "Company (optional)" : "Azienda (opzionale)"}</Label>
              <Input id="ca-company" className="mt-1.5 h-11" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ca-email">{t("checkout.email")}</Label>
              <Input id="ca-email" type="email" required className="mt-1.5 h-11" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ca-phone">{t("checkout.phone")}</Label>
              <Input id="ca-phone" type="tel" required minLength={6} className="mt-1.5 h-11" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ca-type">{lang === "en" ? "Type" : "Tipologia"}</Label>
              <select
                id="ca-type"
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="ufficio">{lang === "en" ? "Office" : "Ufficio"}</option>
                <option value="evento">{lang === "en" ? "Event" : "Evento"}</option>
                <option value="altro">{lang === "en" ? "Other" : "Altro"}</option>
              </select>
            </div>
            <div>
              <Label htmlFor="ca-guests">{lang === "en" ? "Guests" : "Partecipanti"}</Label>
              <Input
                id="ca-guests" type="number" min={5} max={2000} required
                className="mt-1.5 h-11 font-data" value={form.guests}
                onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ca-date">{lang === "en" ? "Desired date" : "Data desiderata"}</Label>
            <Input id="ca-date" type="date" className="mt-1.5 h-11" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="ca-msg">{lang === "en" ? "Tell us about the event" : "Raccontaci l'evento"}</Label>
            <Textarea
              id="ca-msg" required minLength={10} rows={4} className="mt-1.5"
              placeholder={lang === "en" ? "Timings, dietary needs (GF, V, keto), budget..." : "Orari, esigenze dietetiche (GF, V, keto), budget..."}
              value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <div className="flex items-start gap-3">
            <Checkbox id="ca-gdpr" required checked={form.consent} onCheckedChange={(v) => setForm({ ...form, consent: v === true })} className="mt-1" />
            <Label htmlFor="ca-gdpr" className="cursor-pointer text-sm font-normal leading-relaxed">
              {lang === "en"
                ? "I consent to the processing of my data to receive a quote (GDPR art. 6.1.b)."
                : "Acconsento al trattamento dei dati per ricevere un preventivo (GDPR art. 6.1.b)."}
            </Label>
          </div>
          <Button type="submit" size="lg" className="h-12 w-full gap-2" disabled={sending || !form.consent}>
            {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {lang === "en" ? "Request a quote" : "Richiedi preventivo"}
          </Button>
        </form>

        <div className="space-y-6">
          <div className="paper-card p-6">
            <h2 className="text-base font-bold">{lang === "en" ? "How it works" : "Come funziona"}</h2>
            <ol className="mt-3 space-y-3 text-sm">
              {[
                lang === "en" ? "You send the request with date and guest count." : "Invii la richiesta con data e numero di partecipanti.",
                lang === "en" ? "Within 24 working hours you get a tailored quote (per-person macros included)." : "Entro 24 ore lavorative ricevi un preventivo su misura (macro a persona incluse).",
                lang === "en" ? "We confirm, prepare and deliver on schedule. Bank transfer or card." : "Confermiamo, prepariamo e consegniamo sui tempi. Bonifico o carta.",
              ].map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="font-data flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</span>
                  <span className="leading-relaxed text-muted-foreground">{s}</span>
                </li>
              ))}
            </ol>
          </div>
          {company?.iban && (
            <div className="paper-card p-6">
              <h2 className="text-base font-bold">{lang === "en" ? "Bank transfer" : "Bonifico" }</h2>
              <p className="font-data mt-2 break-all text-sm">{company.iban}</p>
              <p className="mt-1 text-xs text-muted-foreground">{company.legalName}</p>
            </div>
          )}
          <Button variant="outline" className="w-full" onClick={() => navigate("/menu")}>
            {lang === "en" ? "Browse platters in the menu" : "Vedi i platter nel menu"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ------------------------- DISPATCHER -------------------------

export function InfoViews({ view }: { view: string }) {
  switch (view) {
    case "locations": return <LocationsView />;
    case "catering": return <CateringView />;
    case "contacts": return <ContactsView />;
    default: return <LocationsView />;
  }
}
