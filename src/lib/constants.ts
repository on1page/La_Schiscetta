// =====================================================================
// constants.ts - Costanti di dominio e conformità UE/Italia
// - 14 allergeni obbligatori (Allegato II Reg. UE 1169/2011)
// - Etichette dietetiche
// - Claim nutrizionali autorizzati EFSA (Reg. UE 1924/2006)
// - Validazione P.IVA / SDI / IBAN italiani
// =====================================================================

export const ALLERGENS_UE = [
  { code: "GLUTEN", it: "Glutine", en: "Gluten" },
  { code: "CROSTACEI", it: "Crostacei", en: "Crustaceans" },
  { code: "UOVA", it: "Uova", en: "Eggs" },
  { code: "PESCE", it: "Pesce", en: "Fish" },
  { code: "ARACHIDI", it: "Arachidi", en: "Peanuts" },
  { code: "SOIA", it: "Soia", en: "Soybeans" },
  { code: "LATTE", it: "Latte", en: "Milk" },
  { code: "FRUTTA_GUSCIO", it: "Frutta a guscio", en: "Tree nuts" },
  { code: "SEDANO", it: "Sedano", en: "Celery" },
  { code: "SENAPE", it: "Senape", en: "Mustard" },
  { code: "SESAMO", it: "Semi di sesamo", en: "Sesame seeds" },
  { code: "SOLFITI", it: "Solfiti (E220-E228)", en: "Sulphites" },
  { code: "LUPINI", it: "Lupini", en: "Lupins" },
  { code: "MOLLUSCHI", it: "Molluschi", en: "Molluscs" },
] as const;

export const ALLERGEN_CODES = ALLERGENS_UE.map((a) => a.code);

export type AllergenCode = (typeof ALLERGENS_UE)[number]["code"];

export const DIET_TAGS = [
  { code: "GF", it: "Senza glutine", en: "Gluten-free" },
  { code: "V", it: "Vegetariano", en: "Vegetarian" },
  { code: "VG", it: "Vegano", en: "Vegan" },
  { code: "P", it: "Paleo", en: "Paleo" },
  { code: "PESCO", it: "Pescetariano", en: "Pescatarian" },
  { code: "LACTOSE_FREE", it: "Senza lattosio", en: "Lactose-free" },
  { code: "KETO", it: "Keto", en: "Keto" },
  { code: "HALAL", it: "Halal", en: "Halal" },
  { code: "KOSHER", it: "Kosher", en: "Kosher" },
] as const;

export const CATEGORIES = [
  { code: "Plates", it: "Piatti", en: "Plates", slug: "piatti" },
  { code: "Smoothies", it: "Smoothie", en: "Smoothies", slug: "smoothie" },
  { code: "Colazione", it: "Colazione", en: "Breakfast", slug: "colazione" },
  { code: "Gelato", it: "Gelato artigianale", en: "Ice cream", slug: "gelato" },
  { code: "Grab & Go", it: "Grab & Go", en: "Grab & Go", slug: "grab-and-go" },
  { code: "Bevande", it: "Bevande", en: "Drinks", slug: "bevande" },
  { code: "Caffe", it: "Caffè e Tè", en: "Coffee & Tea", slug: "caffe-the" },
  { code: "Platters", it: "Platters per uffici", en: "Office platters", slug: "platters" },
] as const;

export const CATEGORY_CODES = CATEGORIES.map((c) => c.code);

// Claim nutrizionali: SOLO voci del registro EFSA autorizzato
// (Reg. UE 1924/2006). Nessun claim medico. "" = nessun claim.
export const EFSA_CLAIMS = [
  "",
  "Le proteine contribuiscono alla crescita e al mantenimento della massa muscolare",
  "La creatina aumenta le prestazioni fisiche in caso di successivi sforzi di breve durata e ad alta intensità (3 g/die)",
  "La vitamina C contribuisce alla normale funzione del sistema immunitario",
  "Il magnesio contribuisce a ridurre stanchezza e affaticamento",
  "Il potassio contribuisce al normale funzionamento del sistema nervoso",
  "Il calcio è necessario per il mantenimento di ossa normali",
  "Il ferro contribuisce al normale metabolismo energetico",
  "DHA ed EPA contribuiscono alla normale funzione cardiaca (250 mg/die)",
  "La fibra di psyllio contribuisce al mantenimento di livelli normali di colesterolo ematico",
  "Le colture live nello yogurt migliorano la digestione del lattosio in soggetti intolleranti",
] as const;

export const ORDER_STATUSES = [
  { code: "RICEVUTO", it: "Ricevuto", color: "bg-amber-100 text-amber-800" },
  { code: "IN_PREPARAZIONE", it: "In preparazione", color: "bg-yellow-100 text-yellow-800" },
  { code: "PRONTO", it: "Pronto", color: "bg-emerald-100 text-emerald-800" },
  { code: "CONSEGNATO", it: "Consegnato", color: "bg-stone-200 text-stone-700" },
  { code: "ANNULLATO", it: "Annullato", color: "bg-red-100 text-red-700" },
] as const;

export const PAYMENT_STATUSES = ["IN_ATTESA", "PAGATO", "RIMBORSATO", "FALLITO"] as const;

export const ADMIN_ROLES = [
  { code: "SUPERADMIN", it: "SuperAdmin (tutto)", min: 4 },
  { code: "MANAGER", it: "Manager (menu, ordini, report)", min: 3 },
  { code: "EDITOR", it: "Editor (contenuti e blog)", min: 2 },
  { code: "VIEWER", it: "Viewer (sola lettura)", min: 1 },
] as const;

// --------------------- Validazioni formato italiano ------------------

// P.IVA: 11 cifre con check digit (Luhn) conforme Agenzia delle Entrate
export function isValidItalianVat(vat: string): boolean {
  if (!/^\d{11}$/.test(vat)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let d = parseInt(vat[i], 10);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(vat[10], 10);
}

// SDI: 7 caratteri alfanumerici (o '0000000' per PEC)
export function isValidSdi(sdi: string): boolean {
  return /^[A-Z0-9]{7}$/.test(sdi);
}

// IBAN italiano: IT + 2 cifre di controllo + 1 lettera CIN + 10 cifre ABI+cab + 12 alfanumerici conto
export function isValidIban(iban: string): boolean {
  const v = iban.replace(/\s/g, "").toUpperCase();
  if (!/^IT\d{2}[A-Z]\d{10}[A-Z0-9]{12}$/.test(v)) return false;
  // verifica checksum modulo 97 (ridefinito IBAN)
  const rearranged = v.slice(4) + v.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of numeric) rem = (rem * 10 + parseInt(ch, 10)) % 97;
  return rem === 1;
}

export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

export function isValidItalianPhone(phone: string): boolean {
  return /^(\+39)?[\s.-]?3\d{2}[\s.-]?\d{6,7}$|^(\+39)?[\s.-]?0\d{1,4}[\s.-]?\d{5,8}$/.test(
    phone.replace(/\s/g, " ")
  );
}

// ---------------------- Utility formattazione ------------------------

export function formatEUR(value: number, locale = "it-IT"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

// Peso in grammi -> etichetta leggibile
export function formatWeight(g: number): string {
  return g >= 1000 ? `${(g / 1000).toFixed(2).replace(".", ",")} kg` : `${g} g`;
}

// macro per 100g -> macro per peso effettivo
export function scaleMacros(per100: number, weightG: number): number {
  return Math.round(per100 * (weightG / 100));
}
