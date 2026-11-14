# La Schiscetta — Nutrizione di Precisione (Cagliari)

Web app gastronomica bilingue (IT/EN) ispirata al modello "precision nutrition" fast-casuale,
riadattata per un'attività a Cagliari (Sardegna): menu personalizzabile al grammo, calcolatore
macro real-time, ordine online con prezzo al peso (€/100 g), area account con dashboard
nutrizionale e backend amministrativo protetto da password con MFA obbligatoria.

> **Nota brand**: "La Schiscetta" è il nome del locale; i dati aziendali (P.IVA, SDI, IBAN,
> recapiti) sono placeholder validati ma da personalizzare dal backend → Azienda.

## Stack

| Livello | Tecnologia |
| --- | --- |
| Frontend | Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · shadcn/ui · Zustand · Recharts |
| Backend | Route Handlers Next.js · Prisma ORM · PostgreSQL (Supabase) |
| Auth | Sessioni JWT HS256 httpOnly custom · MFA TOTP RFC 6238 · RBAC (SUPERADMIN/MANAGER/EDITOR/VIEWER) |
| Crittografia | argon2id (64 MB, 3 iter.) · AES-256-GCM a riposo per i PII · TLS 1.3 (deploy) |
| Pagamenti | Stripe (ambiente test simulato in sandbox; integrazione PaymentIntent + 3DS PSD2 documentata) |
| Analytics | Prima parte cookieless, IP anonimizzati, solo previo consenso (in produzione: Plausible self-hosted) |

## Setup locale (npm + Supabase, funziona anche su Windows)

### 1. Requisiti

- **Node.js 20+** (https://nodejs.org — versione LTS)
- Un progetto **Supabase** gratuito (https://supabase.com)

### 2. Configura il file `.env`

Il file `.env` è già pronto nella root del progetto: vanno sostituiti solo due
segnaposto nelle stringhe di connessione del database.

Da **Supabase Dashboard** (https://supabase.com/dashboard) apri il tuo progetto e
premi il pulsante **Connect** in alto:

| Variabile | Dove si trova nel pannello Connect | A cosa serve |
| --- | --- | --- |
| `DATABASE_URL` | **Transaction pooler** (porta 6543) | connessione usata dal sito in esecuzione |
| `DIRECT_URL` | **Session pooler** (porta 5432) | usata da `prisma db push` / migrazioni |

In entrambe le stringhe sostituisci:

- `[PASSWORD-DB]` → la password del database scelta alla creazione del progetto
  (se non la ricordi: *Project Settings → Database → Reset database password*);
- `[REGIONE]` → la regione visibile nell'host della stringa (es. `eu-central-1`).

> Suggerimento: copia le stringhe complete dal pannello Connect e incollale
> direttamente nel `.env`, sovrascrivendo quelle presenti — sono già nel formato
> corretto per Prisma.

Le variabili `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
sono già compilate con le tue credenziali e servono solo se in futuro aggiungi
Supabase Auth/Storage: il sito attuale accede al database via Prisma.

### 3. Installa e popola il database

```bash
npm install        # installa le dipendenze e genera Prisma Client
npm run db:push    # crea le tabelle su Supabase (usa DIRECT_URL)
npm run db:seed    # popola: menu, allergeni, admin, ordini demo, policy GDPR
npm run dev        # avvia: http://localhost:3000
```

> Se usi bun al posto di npm: `bun install && bun run db:push && bun run db:seed && bun run dev`

### Cosa inserisce il seed

- Azienda (placeholder conformi), 27 voci di menu con ingredienti, allergeni
  UE 1169/2011 e claim EFSA, 4 add-in funzionali, 5 zone delivery Cagliari;
- 2 utenti admin (MFA da configurare al primo login), 3 clienti demo con PII
  cifrato, ordini e pagamenti demo, coupon, recensioni, 5 articoli blog;
- Privacy policy GDPR, tabella cookie, ~7.000 eventi analytics anonimizzati e
  registro consensi demo (per vedere subito grafici e statistiche in admin).

Il seed cancella e ricrea i dati: rieseguibile in qualsiasi momento, MA non
eseguirlo su un database con dati reali.

### Credenziali di test

| Ruolo | Username | Password |
| --- | --- | --- |
| Admin (SuperAdmin) | `admin` | `L4Schiscetta-2026!Cagliari` |
| Manager | `manager` | `Manager-2026!Cagliari` |
| Cliente demo | `demo@laschiscetta.it` | `Cliente-Demo-2026!` |

- Al **primo login admin** viene avviato l'enrollment MFA: scansionare il QR con Google
  Authenticator/Authy e inserire il codice. Vengono generati 8 backup codes monouso.
- Coupon demo: `BENVENUTO10` (10%, min 15 €) e `PRANZO5` (5 €, min 25 €).

### Export dati ordini e pagamenti (XLSX / PDF)

Dall'area admin → **Impostazioni** trovi la scheda **"Export dati e report"** con
bottoni dedicati per scaricare ordini e pagamenti in formato **XLSX** e **PDF**,
con filtro periodo (oggi / 7 / 30 / 365 giorni / tutto). I file includono i PII
decifrati al momento dell'export e ogni download è registrato nell'audit log.

### Risoluzione problemi

| Problema | Causa probabile | Soluzione |
| --- | --- | --- |
| Il sito resta su "Prepariamo la cucina..." | `/api/bootstrap` non risponde: database non raggiungibile | verifica `DATABASE_URL`/`DIRECT_URL` nel `.env` (password e regione) e che `npm run db:push && npm run db:seed` siano stati eseguiti |
| `Error validating datasource: the URL must start with postgresql://` | il `.env` non viene letto o ha vecchi valori | esegui i comandi dalla **root** del progetto; controlla di non avere variabili `DATABASE_URL` globali obsolete nel sistema |
| `Can't reach database server` | password errata o regione errata nell'host | riprendi le stringhe da Supabase → Connect |
| Porta 3000 occupata | altro processo in ascolto | `npm run dev -- -p 3001` |

In ogni caso la SPA non resta mai bloccata: dopo pochi secondi mostra il sito
con un banner di retry se il backend non risponde.

## Architettura

```
src/
├─ app/
│  ├─ page.tsx              # shell SPA (vedi nota deploy sotto)
│  ├─ layout.tsx            # metadata SEO complete (OG, Twitter, hreflang)
│  ├─ robots.ts, sitemap.ts # SEO tecnico (admin escluso)
│  └─ api/                  # 30+ route handlers con validazione Zod
├─ components/
│  ├─ site/                 # header, footer, banner cookie, card menu
│  ├─ views/                # viste pubbliche (home, menu, piatto, ordina, account…)
│  └─ admin/                # backend gestionale (login MFA, dashboard, CRUD…)
├─ lib/
│  ├─ security.ts           # argon2id, JWT, TOTP, AES-256-GCM, IP anonimizzati
│  ├─ auth.ts               # sessioni httpOnly, RBAC, sliding expiry
│  ├─ rate-limit.ts         # finestre scorrevoli per endpoint sensibili
│  ├─ validation.ts         # schemi Zod di ogni endpoint (OWASP A03)
│  ├─ constants.ts          # 14 allergeni UE, claim EFSA, validazioni IT (P.IVA/SDI/IBAN)
│  └─ audit.ts              # audit log immutabile
└─ middleware.ts            # CSP nonce-based (prod), HSTS, X-Frame-Options…
prisma/seed.ts              # menu sardo con allergeni, policy GDPR, analytics demo
```

**Nota deploy (rotte)**: la sandbox di preview serve tutto da `/` con navigazione hash
(`#/menu`, `#/ordina`, `#/admin`). Ogni vista mappa 1:1 a una rotta del App Router: per la
produzione spostare i componenti vista in `src/app/<route>/page.tsx` con SSR/SSG per il SEO.
Il backend API è già in route handlers standard. L'area admin va pubblicata su sottodominio
dedicato (`admin.materia-cagliari.it`), non linkata e esclusa da sitemap/robots.

## Sicurezza (OWASP Top 10)

- **A01 Access Control**: RBAC server-side su ogni endpoint admin; JWT ri-validato contro il
  DB (sessionVersion → revoca remota); nessun ID enumerabile nelle URL pubbliche.
- **A02 Crypto**: password argon2id (64 MB/3/1); PII (nome, telefono, indirizzi ordini e
  catering) cifrati AES-256-GCM a riposo; segreti solo in variabili ambiente.
- **A03 Injection**: query parametrizzate Prisma; validazione Zod su ogni payload; sanitizzazione.
- **A04 Design**: rate limiting (login 5/15 min, checkout 10/min, form 5/h); lockout 5 tentativi
  15 min; **prezzi e totali SEMPRE ricalcolati server-side** (il client invia solo slug+peso).
- **A05 Misconfig**: CSP (nonce in produzione), HSTS+preload, X-Frame-Options DENY,
  Referrer-Policy, Permissions-Policy restrittiva; directory listing disattivato.
- **A06 Components**: lockfile bloccato; `npm audit`/Dependabot raccomandati in CI.
- **A07 Auth Failures**: password admin min 14/clienti min 12 con complessità; MFA TOTP
  obbligatoria + backup codes monouso; risposte generiche anti-enumerazione; timing costante.
- **A08 Integrity**: firma commit e verifica webhook Stripe previste in CI (documentato).
- **A09 Logging**: audit log immutabile (utente, IP, UA, payload pre/post) + log login.
- **A10 SSRF**: nessuna URL utente passata a fetch server-side.

## GDPR / Conformità Italia

- Banner cookie conforme Provvedimento Garante **231/2021**: Rifiuta/Accetta di pari
  rilevanza, consenso granulare, riapribile dal footer, **nessun tracciamento prima del
  consenso**; registro dei consensi (pseudonimo giornaliero, retention 12 mesi).
- Analytics GDPR by design: IP anonimizzati, nessun cookie, nessun user ID persistente,
  retention 24 mesi, attivi solo dopo opt-in.
- Privacy Policy completa (titolare, basi giuridiche, conservazione, diritti) **modificabile
  e versionata dal backend** (max 20 versioni con rollback).
- Diritto di portabilità (export JSON artt. 15/20) e cancellazione (art. 17) self-service
  nell'area account e da admin.
- Allergeni Reg. UE 1169/2011 (14 obbligatori, campo obbligatorio in pubblicazione, warning
  di coerenza); claim nutrizionali SOLO dal registro EFSA autorizzato (Reg. UE 1924/2006);
  recesso D.Lgs. 206/2005 con eccezione deperibili personalizzati (art. 59 c.2).

## Da completare in produzione (stub documentati)

1. **Stripe**: sostituire l'autorizzazione simulata con PaymentIntent + Elements e webhook
   firmato (nessun dato carta transita già ora dal server).
2. **FatturaPA/SDI**: integrazione provider (Aruba/Dixan) per fatturazione elettronica e
   note di credito dei rimborsi; conservazione sostitutiva 10 anni.
3. **Email transazionali** (Resend/MailUp, server EU): conferme ordine, doppio opt-in reale,
   notifiche login admin (attualmente loggate).
4. **Plausible self-hosted** in sostituzione della raccolta interna (già cookieless).
5. **Upload immagini** su R2 con conversione AVIF/WebP (ora gli URL sono gestiti da admin).
6. CI/CD GitHub Actions (lint → typecheck → test → build), Sentry, backup automatici.

## SEO

- Metadata complete per pagina (title ≤60, description ≤155, canonical, OG, Twitter).
- JSON-LD: `Restaurant`+`LocalBusiness` (NAP, geo, orari, rating), `Menu`, `MenuItem`
  con `NutritionInformation`, `FAQPage`, `Article`, breadcrumb.
- Sitemap/robots dinamici (admin escluso), hreflang IT/EN, HTML semantico, immagini lazy
  con dimensioni esplicite, Core Web Vitals (LCP<2,5 s) presidiati da font system e CSS inline.
- Local SEO Cagliari: contenuti quartieri (Castello, Marina, Stampace, Villanova), zone
  delivery, keyword target nel copy (ristorante salute Cagliari, delivery sano, …).
