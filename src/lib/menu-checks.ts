// =====================================================================
// menu-checks.ts - Controlli di coerenza menu (supporto all'operatore)
// Euristiche lato server per prevenire incongruenze pericolose per la
// sicurezza alimentare (spec 4.3): etichette dietetiche vs ingredienti,
// allergeni suggeriti dagli ingredienti, sanity keto.
// =====================================================================

const ANIMAL_HINTS = [
  "pollo", "manzo", "maiale", "salmone", "tonno", "pesce", "gamber",
  "pancetta", "prosciutto", "sgombro", "orata", "branzino", "fesa",
  "bresaola", "carne", "petto di pollo",
];
const GLUTEN_HINTS = [
  "pane", "pasta di grano", "farina di grano", "farina 00", "orzo",
  "segale", "couscous", "bulgur", "seitan", "cracker", "panko", "birra",
];
const LACTOSE_HINTS = [
  "latte", "panna", "burro", "formaggio", "parmigiano", "pecorino",
  "mozzarella", "yogurt", "ricotta",
];
const EGG_HINTS = ["uova", "albume", "tuorlo", "maionese"];
const SOY_HINTS = ["soia", "tamari", "teriyaki", "tofu", "edamame", "miso"];
const NUT_HINTS = [
  "mandorle", "noci", "nocciole", "pistacchi", "anacardi", "cashew",
  "pinoli", "burro di arachidi", "arachidi",
];

export function consistencyWarnings(input: {
  ingredientsIt: string[];
  allergens: string[];
  dietTags: string[];
  carbG?: number;
}): string[] {
  const w: string[] = [];
  const text = input.ingredientsIt.join(" ").toLowerCase();
  const has = (hints: string[]) => hints.some((h) => text.includes(h));
  const tags = input.dietTags;

  if ((tags.includes("V") || tags.includes("VG")) && has(ANIMAL_HINTS)) {
    w.push("Etichetta vegetariano/vegano ma un ingrediente sembra di origine animale: verificare.");
  }
  if (tags.includes("GF") && has(GLUTEN_HINTS)) {
    w.push("Etichetta senza glutine ma un ingrediente sembra contenere glutine: verificare la certificazione.");
  }
  if (!input.allergens.includes("LATTE") && has(LACTOSE_HINTS)) {
    w.push("Ingredienti lattiero-caseari rilevati: valutare l'aggiunta dell'allergene 'Latte'.");
  }
  if (!input.allergens.includes("UOVA") && has(EGG_HINTS)) {
    w.push("Uova rilevate negli ingredienti: valutare l'aggiunta dell'allergene 'Uova'.");
  }
  if (!input.allergens.includes("SOIA") && has(SOY_HINTS)) {
    w.push("Soia o derivati (es. tamari, miso) rilevati: valutare l'aggiunta dell'allergene 'Soia'.");
  }
  if (!input.allergens.includes("FRUTTA_GUSCIO") && has(NUT_HINTS)) {
    w.push("Frutta a guscio rilevata: valutare l'aggiunta dell'allergene corrispondente.");
  }
  if (tags.includes("KETO") && (input.carbG ?? 0) > 15) {
    w.push("Etichetta keto ma carboidrati elevati (> 15 g/100g): verificare.");
  }
  return w;
}
