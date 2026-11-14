// =====================================================================
// validation.ts - Schemi Zod per la validazione lato server di OGNI
// endpoint (OWASP A03 Injection: input mai fidato).
// =====================================================================
import { z } from "zod";
import {
  ALLERGEN_CODES,
  CATEGORY_CODES,
  isValidIban,
  isValidItalianVat,
  isValidSdi,
  isValidZip,
} from "./constants";

// ------------------------------ Menu ---------------------------------

export const menuItemSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "slug: solo lettere minuscole, numeri e trattini"),
  nameIt: z.string().min(2).max(60),
  nameEn: z.string().min(2).max(60),
  descIt: z.string().min(10).max(500),
  descEn: z.string().min(10).max(500),
  category: z.enum(CATEGORY_CODES as [string, ...string[]]),
  imageUrl: z.string().max(500).optional().nullable(),
  pricePer100g: z.number().min(0.5).max(25),
  unitWeightG: z.number().int().min(50).max(2000),
  kcal: z.number().min(0).max(900),
  proteinG: z.number().min(0).max(100),
  fatG: z.number().min(0).max(100),
  carbG: z.number().min(0).max(100),
  fiberG: z.number().min(0).max(80),
  ingredientsIt: z.array(z.string().min(1).max(120)).min(1).max(40),
  ingredientsEn: z.array(z.string().min(1).max(120)).min(1).max(40),
  // Reg. UE 1169/2011: campo allergeni obbligatorio (anche lista vuota)
  allergens: z.array(z.enum(ALLERGEN_CODES as [string, ...string[]])),
  dietTags: z.array(z.string().max(20)),
  addInIds: z.array(z.string().max(40)).default([]),
  healthClaim: z.string().max(400).default(""),
  available: z.boolean().default(true),
  availableDays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5, 6, 0]),
  seasonalFrom: z.string().regex(/^\d{2}-\d{2}$/).optional().nullable(),
  seasonalTo: z.string().regex(/^\d{2}-\d{2}$/).optional().nullable(),
  isPopular: z.boolean().default(false),
  isSignature: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

// ------------------------------ Ordini -------------------------------

export const orderItemSchema = z.object({
  slug: z.string().min(2).max(80),
  weightG: z.number().int().min(50).max(1500),
  addIns: z
    .array(z.object({ key: z.string().max(40), qty: z.number().int().min(1).max(3) }))
    .max(6)
    .default([]),
});

export const orderSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(30),
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  phone: z.string().min(6).max(30),
  fulfillment: z.enum(["RITIRO", "CONSEGNA"]),
  zone: z.string().max(60).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  paymentMethod: z.enum(["STRIPE_TEST", "IN_NEGOZIO"]),
  couponCode: z.string().max(30).optional().nullable(),
  gdprConsent: z.literal(true, {
    message: "Consenso privacy obbligatorio (art. 6 GDPR)",
  }),
  // NB: i dati carta NON transitano dal server (tokenizzazione client-side,
  // PCI-DSS). In sandbox il "token" è simulato lato client.
  paymentToken: z.string().max(60).optional().nullable(),
});

// --------------------------- Autenticazione --------------------------

const passwordPolicy = (min: number) =>
  z
    .string()
    .min(min, `Password: minimo ${min} caratteri`)
    .regex(/[a-z]/, "Serve almeno una minuscola")
    .regex(/[A-Z]/, "Serve almeno una maiuscola")
    .regex(/\d/, "Serve almeno un numero")
    .regex(/[^A-Za-z0-9]/, "Serve almeno un simbolo");

export const adminLoginSchema = z.object({
  username: z.string().min(3).max(60),
  password: z.string().min(1).max(200), // il requisito 14 char è validato all'atto della CREAZIONE/RESET
});

export const customerRegisterSchema = z.object({
  email: z.string().email().max(120),
  password: passwordPolicy(12),
  name: z.string().min(2).max(80),
  phone: z.string().max(30).optional().nullable(),
  gdprConsent: z.literal(true),
});

export const customerLoginSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(1).max(200),
});

export const customerProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().max(30).optional().nullable(),
  dailyKcal: z.number().int().min(800).max(6000).optional(),
  dailyProteinG: z.number().int().min(20).max(400).optional(),
  goal: z.enum(["cut", "mantenimento", "bulk"]).optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordPolicy(14), // admin: 14 caratteri (spec 4.1)
});

// --------------------------- Form pubblici ---------------------------

export const cateringSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  phone: z.string().min(6).max(30),
  company: z.string().max(120).optional().nullable(),
  eventType: z.enum(["evento", "ufficio", "altro"]).optional().nullable(),
  guests: z.number().int().min(5).max(2000),
  date: z.string().max(20).optional().nullable(),
  message: z.string().min(10).max(2000),
  gdprConsent: z.literal(true),
});

export const contactSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  subject: z.string().max(120).optional().nullable(),
  message: z.string().min(10).max(2000),
  gdprConsent: z.literal(true),
});

export const newsletterSchema = z.object({
  email: z.string().email().max(120),
  lang: z.enum(["it", "en"]).default("it"),
});

// ------------------------------ Consenso -----------------------------

export const consentSchema = z.object({
  necessary: z.literal(true),
  analytics: z.boolean(),
  marketing: z.boolean(),
  policyVersion: z.string().max(10).default("1.0"),
});

export const analyticsCollectSchema = z.object({
  events: z
    .array(
      z.object({
        type: z.enum(["pageview", "event"]),
        path: z.string().max(200),
        title: z.string().max(200).optional().nullable(),
        referrer: z.string().max(500).optional().nullable(),
        name: z.string().max(60).optional().nullable(),
      })
    )
    .min(1)
    .max(20),
});

// ----------------------------- Azienda -------------------------------

export const companySchema = z.object({
  legalName: z.string().min(2).max(120),
  brandName: z.string().min(2).max(80),
  tagline: z.string().max(120).optional().nullable(),
  vatNumber: z
    .string()
    .refine((v) => !v || isValidItalianVat(v), "P.IVA non valida (11 cifre + checksum)")
    .optional().nullable(),
  taxCode: z.string().max(20).optional().nullable(),
  sdiCode: z
    .string()
    .refine((v) => !v || isValidSdi(v), "SDI: 7 caratteri alfanumerici")
    .optional().nullable(),
  pec: z.string().email().max(120).optional().nullable(),
  street: z.string().min(2).max(100),
  streetNumber: z.string().min(1).max(10),
  zip: z.string().refine(isValidZip, "CAP: 5 cifre"),
  city: z.string().min(2).max(60),
  province: z.string().min(2).max(4),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone: z.string().max(30).optional().nullable(),
  mobile: z.string().max(30).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  emailInfo: z.string().email().max(120).optional().nullable(),
  emailOrders: z.string().email().max(120).optional().nullable(),
  emailPrivacy: z.string().email().max(120).optional().nullable(),
  emailAdmin: z.string().email().max(120).optional().nullable(),
  cciaa: z.string().max(120).optional().nullable(),
  reaNumber: z.string().max(40).optional().nullable(),
  shareCapital: z.string().max(60).optional().nullable(),
  dpoName: z.string().max(80).optional().nullable(),
  dpoEmail: z.string().email().max(120).optional().nullable(),
  dpoPhone: z.string().max(30).optional().nullable(),
  instagram: z.string().max(200).optional().nullable(),
  facebook: z.string().max(200).optional().nullable(),
  tiktok: z.string().max(200).optional().nullable(),
  linkedin: z.string().max(200).optional().nullable(),
  gbpId: z.string().max(80).optional().nullable(),
  iban: z
    .string()
    .refine((v) => !v || isValidIban(v), "IBAN italiano non valido")
    .optional().nullable(),
  logoUrl: z.string().max(400).optional().nullable(),
  heroUrl: z.string().max(400).optional().nullable(),
  aboutUrl: z.string().max(400).optional().nullable(),
  openingHours: z.array(
    z.object({
      day: z.string().max(12),
      open: z.string().max(6),
      close: z.string().max(6),
      closed: z.boolean(),
    })
  ),
  holidays: z
    .array(z.object({ date: z.string().max(10), name: z.string().max(80) }))
    .default([]),
});

// ------------------------------ Policy -------------------------------

export const privacySectionsSchema = z.array(
  z.object({
    id: z.string().max(40),
    title: z.string().min(2).max(150),
    body: z.string().min(10).max(8000),
  })
);

export const cookieDefinitionSchema = z.object({
  name: z.string().min(1).max(80),
  provider: z.string().min(1).max(80),
  purpose: z.string().min(3).max(300),
  duration: z.string().min(1).max(40),
  category: z.enum(["TECNICI", "ANALITICI_1P", "ANALITICI_3P", "PROFILAZIONE"]),
  required: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const adminUserSchema = z.object({
  username: z.string().min(3).max(60).regex(/^[a-z0-9._-]+$/i),
  email: z.string().email().max(120),
  password: passwordPolicy(14),
  role: z.enum(["SUPERADMIN", "MANAGER", "EDITOR", "VIEWER"]),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
