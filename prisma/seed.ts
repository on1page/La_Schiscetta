// =====================================================================
// seed.ts - Popolamento database iniziale (La Schiscetta, Cagliari)
// Esecuzione: npm run db:seed  (oppure: npx tsx prisma/seed.ts)
// Contenuti conformi: Reg. UE 1169/2011 (allergeni, ingredienti in
// ordine decrescente), Reg. UE 1924/2006 (solo claim EFSA autorizzati),
// GDPR (policy, cookie, dati demo cifrati/anonimizzati).
// =====================================================================
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";
import { config as loadEnv } from "dotenv";
import { encryptField, hashPassword, sha256 } from "../src/lib/security";

// Carica il .env dalla root del progetto: l'esecuzione diretta con
// tsx/node non legge .env in automatico (lo fa solo la CLI di Prisma).
loadEnv({ path: resolve(__dirname, "../.env") });

const db = new PrismaClient();

// URL immagini raccolte con ricerca (hosting OSS, CSP img-src https:)
const IMG = JSON.parse(
  readFileSync(resolve(__dirname, "images.json"), "utf8")
) as Record<string, string>;

function img(key: string): string {
  return IMG[key] ?? "";
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

// PRNG deterministico per dati demo riproducibili
let seedState = 42;
function rnd(): number {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}

async function main() {
  console.log("Pulizia tabelle...");
  await db.$transaction([
    db.analyticsEvent.deleteMany(),
    db.consentRecord.deleteMany(),
    db.auditLog.deleteMany(),
    db.order.deleteMany(),
    db.customer.deleteMany(),
    db.menuItem.deleteMany(),
    db.addIn.deleteMany(),
    db.deliveryZone.deleteMany(),
    db.coupon.deleteMany(),
    db.blogPost.deleteMany(),
    db.review.deleteMany(),
    db.cookieDefinition.deleteMany(),
    db.policyVersion.deleteMany(),
    db.privacyPolicy.deleteMany(),
    db.cateringRequest.deleteMany(),
    db.contactMessage.deleteMany(),
    db.newsletterSubscriber.deleteMany(),
    db.adminUser.deleteMany(),
    db.companyInfo.deleteMany(),
  ]);

  // -------------------------------------------------- AZIENDA
  console.log("Azienda...");
  const openingHours = [
    { day: "Lunedì", open: "09:00", close: "20:30", closed: false },
    { day: "Martedì", open: "09:00", close: "20:30", closed: false },
    { day: "Mercoledì", open: "09:00", close: "20:30", closed: false },
    { day: "Giovedì", open: "09:00", close: "20:30", closed: false },
    { day: "Venerdì", open: "09:00", close: "20:30", closed: false },
    { day: "Sabato", open: "10:00", close: "20:30", closed: false },
    { day: "Domenica", open: "10:00", close: "20:30", closed: false },
  ];
  const holidays = [
    { date: "01-01", name: "Capodanno" },
    { date: "01-05", name: "Sant'Efisio (festa di Cagliari)" },
    { date: "01-06", name: "Epifania" },
    { date: "04-25", name: "Liberazione" },
    { date: "04-28", name: "Sa Die de sa Sardigna" },
    { date: "05-01", name: "Festa del Lavoro" },
    { date: "06-02", name: "Festa della Repubblica" },
    { date: "08-15", name: "Ferragosto" },
    { date: "11-01", name: "Ognissanti" },
    { date: "12-08", name: "Immacolata" },
    { date: "12-25", name: "Natale" },
    { date: "12-26", name: "Santo Stefano" },
  ];

  await db.companyInfo.create({
    data: {
      id: "main",
      legalName: "La Schiscetta S.r.l. (in costituzione)",
      brandName: "La Schiscetta",
      tagline: "Nutrizione di Precisione",
      vatNumber: "01234567897", // PLACEHOLDER: sostituire con P.IVA reale (valida al checksum)
      taxCode: "01234567897",
      sdiCode: "M5UXCR1", // PLACEHOLDER: codice destinatario reale
      pec: "laschiscetta@pec.it",
      street: "Via Roma",
      streetNumber: "100",
      zip: "09124",
      city: "Cagliari",
      province: "CA",
      country: "IT",
      lat: 39.2172,
      lng: 9.114,
      phone: "+39 070 123 4567",
      mobile: "+39 320 123 4567",
      whatsapp: "+39 320 123 4567",
      emailInfo: "info@laschiscetta.it",
      emailOrders: "ordini@laschiscetta.it",
      emailPrivacy: "privacy@laschiscetta.it",
      emailAdmin: "admin@laschiscetta.it",
      cciaa: "CCIAA Cagliari",
      reaNumber: "CA-123456",
      shareCapital: "10.000,00 EUR",
      dpoName: "Marco Puddu",
      dpoEmail: "dpo@laschiscetta.it",
      dpoPhone: "+39 070 123 4568",
      instagram: "https://instagram.com/laschiscetta",
      facebook: "https://facebook.com/laschiscetta",
      tiktok: "https://tiktok.com/@laschiscetta",
      linkedin: "https://linkedin.com/company/la-schiscetta",
      gbpId: "PLACEHOLDER-GBP-ID",
      iban: "IT60X0542811101000000123456",
      logoUrl: "",
      heroUrl: img("hero"),
      aboutUrl: img("interno"),
      openingHours: JSON.stringify(openingHours),
      holidays: JSON.stringify(holidays),
    },
  });

  // -------------------------------------------------- ADMIN
  console.log("Admin user (argon2id)...");
  await db.adminUser.create({
    data: {
      username: "admin",
      email: "admin@laschiscetta.it",
      passwordHash: await hashPassword("L4Schiscetta-2026!Cagliari"),
      role: "SUPERADMIN",
    },
  });
  await db.adminUser.create({
    data: {
      username: "manager",
      email: "manager@laschiscetta.it",
      passwordHash: await hashPassword("Manager-2026!Cagliari"),
      role: "MANAGER",
    },
  });

  // -------------------------------------------------- ADD-IN (EFSA)
  console.log("Add-in funzionali...");
  const addIns = [
    {
      key: "creatina",
      nameIt: "Creatina monoidrato (3 g)",
      nameEn: "Creatine monohydrate (3 g)",
      descIt: "Creatina monoidrato micronizzata. Claim autorizzato EFSA.",
      descEn: "Micronized creatine monohydrate. EFSA authorized claim.",
      price: 1.0,
      efsaClaim:
        "La creatina aumenta le prestazioni fisiche in caso di successivi sforzi di breve durata e ad alta intensità (3 g/die)",
      sortOrder: 1,
    },
    {
      key: "collagene",
      nameIt: "Collagene idrolizzato (10 g)",
      nameEn: "Hydrolyzed collagen (10 g)",
      descIt: "Peptidi di collagene idrolizzato di origine bovina, aroma neutro. Nessun claim autorizzato EFSA per il collagene: nessuna dichiarazione salute è associata a questo add-in.",
      descEn: "Bovine hydrolyzed collagen peptides, neutral flavor. No EFSA authorized claim exists for collagen.",
      price: 1.2,
      efsaClaim: "",
      sortOrder: 2,
    },
    {
      key: "lions-mane",
      nameIt: "Estratto di Hericium erinaceus (2 g)",
      nameEn: "Lion's mane extract (2 g)",
      descIt: "Estratto di fungo Hericium erinaceus (crin di leone) titolato. Fungo tradizionale della cucina orientale: nessun claim salute autorizzato, nessuna dichiarazione associata.",
      descEn: "Standardized lion's mane mushroom extract. Traditional mushroom: no authorized health claim.",
      price: 1.5,
      efsaClaim: "",
      sortOrder: 3,
    },
    {
      key: "probiotici",
      nameIt: "Blend probiotico (1 bustina)",
      nameEn: "Probiotic blend (1 stick)",
      descIt: "Colture lattiche vive liofilizzate. Integratore notificato ai sensi del D.Lgs. 169/2004. Nessun claim generale autorizzato per i probiotici.",
      descEn: "Freeze-dried live cultures. Notified supplement (Italian D.Lgs. 169/2004).",
      price: 1.0,
      efsaClaim: "",
      sortOrder: 4,
    },
  ];
  for (const a of addIns) {
    await db.addIn.create({ data: a });
  }

  // -------------------------------------------------- MENU
  console.log("Menu (27 voci, allergeni UE 1169/2011)...");
  type Item = {
    slug: string; nameIt: string; nameEn: string; descIt: string; descEn: string;
    category: string; image?: string; price: number; weight: number;
    kcal: number; p: number; f: number; c: number; fib: number;
    ingIt: string[]; ingEn: string[]; allergens: string[]; tags: string[];
    addInIds?: string[]; claim?: string; popular?: boolean; signature?: boolean;
    seasonalFrom?: string; seasonalTo?: string; order: number;
  };

  const menu: Item[] = [
    // ---------------- PLATES ----------------
    {
      slug: "pollo-mediterraneo", nameIt: "Pollo Mediterraneo", nameEn: "Mediterranean Chicken",
      descIt: "Petto di pollo alla griglia con pomodorini confit, olive taggiasche, zucchine e olio EVO aromatizzato al limone.",
      descEn: "Grilled chicken breast with confit cherry tomatoes, taggiasca olives, courgettes and lemon-infused EVO oil.",
      category: "Plates", image: img("pollo"), price: 5.2, weight: 350,
      kcal: 148, p: 24, f: 5.5, c: 3.5, fib: 1.2,
      ingIt: ["Petto di pollo", "Pomodorini", "Zucchine", "Olive taggiasche", "Olio EVO", "Limone", "Origano", "Aglio"],
      ingEn: ["Chicken breast", "Cherry tomatoes", "Courgettes", "Taggiasca olives", "EVO oil", "Lemon", "Oregano", "Garlic"],
      allergens: [], tags: ["GF", "P"], popular: true, order: 1,
    },
    {
      slug: "salmone-glassato-miso", nameIt: "Salmone Glassato al Miso", nameEn: "Miso Glazed Salmon",
      descIt: "Filetto di salmone glassato con miso e miele, completato da sesamo tostato e verdure al vapore.",
      descEn: "Salmon fillet glazed with miso and honey, topped with toasted sesame and steamed vegetables.",
      category: "Plates", image: img("salmone"), price: 6.8, weight: 320,
      kcal: 192, p: 20, f: 11, c: 4.2, fib: 1.0,
      ingIt: ["Salmone", "Miso", "Miele", "Tamari", "Semi di sesamo", "Broccolo", "Carote", "Olio EVO"],
      ingEn: ["Salmon", "Miso", "Honey", "Tamari", "Sesame seeds", "Broccoli", "Carrots", "EVO oil"],
      allergens: ["PESCE", "SOIA", "SESAMO"], tags: ["GF", "PESCO"], popular: true, order: 2,
    },
    {
      slug: "polpette-di-manzo-sarde", nameIt: "Polpette di Manzo Sarde", nameEn: "Sardinian Beef Meatballs",
      descIt: "Polpette di manzo macinato con pane carasau, pecorino sardo e prezzemolo, servite in salsa di pomodoro e basilico.",
      descEn: "Ground beef meatballs with carasau bread, Sardinian pecorino and parsley in a tomato basil sauce.",
      category: "Plates", image: img("polpette"), price: 4.9, weight: 340,
      kcal: 176, p: 18, f: 9, c: 5.5, fib: 1.1,
      ingIt: ["Manzo macinato", "Passata di pomodoro", "Pane carasau", "Pecorino sardo", "Uova", "Prezzemolo", "Aglio", "Basilico"],
      ingEn: ["Ground beef", "Tomato passata", "Carasau bread", "Sardinian pecorino", "Eggs", "Parsley", "Garlic", "Basil"],
      allergens: ["GLUTEN", "UOVA", "LATTE"], tags: ["P"], popular: true, order: 3,
    },
    {
      slug: "tofu-tamari-e-miele", nameIt: "Tofu al Tamari e Miele", nameEn: "Tamari Honey Tofu",
      descIt: "Tofu croccante saltato in padella con tamari e miele, peperoni croccanti e cavolo verza.",
      descEn: "Crispy pan-fried tofu with tamari and honey, crunchy peppers and savoy cabbage.",
      category: "Plates", image: img("tofu"), price: 4.2, weight: 330,
      kcal: 152, p: 12, f: 8, c: 8.5, fib: 2.8,
      ingIt: ["Tofu", "Peperoni", "Cavolo verza", "Tamari", "Miele", "Semi di sesamo", "Olio di semi", "Zenzero"],
      ingEn: ["Tofu", "Bell peppers", "Savoy cabbage", "Tamari", "Honey", "Sesame seeds", "Seed oil", "Ginger"],
      allergens: ["SOIA", "SESAMO"], tags: ["GF", "V"], order: 4,
    },
    {
      slug: "bowl-di-quinoa", nameIt: "Bowl di Quinoa", nameEn: "Quinoa Power Bowl",
      descIt: "Quinoa con ceci rossi, avocado, pomodorini, rucola e semi di zucca, condita con olio EVO e limone.",
      descEn: "Quinoa with red chickpeas, avocado, cherry tomatoes, rocket and pumpkin seeds with EVO oil and lemon.",
      category: "Plates", image: img("quinoa"), price: 4.5, weight: 380,
      kcal: 162, p: 6.5, f: 8.5, c: 17, fib: 5.0,
      ingIt: ["Quinoa", "Ceci", "Avocado", "Pomodorini", "Rucola", "Semi di zucca", "Olio EVO", "Limone"],
      ingEn: ["Quinoa", "Chickpeas", "Avocado", "Cherry tomatoes", "Rocket", "Pumpkin seeds", "EVO oil", "Lemon"],
      allergens: [], tags: ["GF", "VG"], popular: true, order: 5,
    },
    {
      slug: "insalata-caesar-di-pollo", nameIt: "Insalata Caesar di Pollo", nameEn: "Chicken Caesar Salad",
      descIt: "Lattuga romana, petto di pollo grigliato, scaglie di parmigiano e dressing leggero allo yogurt greco.",
      descEn: "Romaine lettuce, grilled chicken breast, parmesan shavings and a light Greek yogurt dressing.",
      category: "Plates", image: img("caesar"), price: 5.0, weight: 360,
      kcal: 128, p: 17, f: 5, c: 4.0, fib: 2.0,
      ingIt: ["Lattuga romana", "Petto di pollo", "Yogurt greco", "Parmigiano", "Uova", "Limone", "Pepe nero", "Olio EVO"],
      ingEn: ["Romaine lettuce", "Chicken breast", "Greek yogurt", "Parmesan", "Eggs", "Lemon", "Black pepper", "EVO oil"],
      allergens: ["LATTE", "UOVA"], tags: ["GF", "P"], order: 6,
    },
    {
      slug: "fregula-con-verdure", nameIt: "Fregula con Verdure e Zafferano", nameEn: "Fregula with Vegetables and Saffron",
      descIt: "Fregula sarda tostata con zucchine, carote e zafferano, un piatto della tradizione isolana rivisitato in chiave leggera.",
      descEn: "Toasted Sardinian fregula with courgettes, carrots and saffron, a light take on an island classic.",
      category: "Plates", image: img("quinoa_2"), price: 3.8, weight: 370,
      kcal: 156, p: 5, f: 4, c: 26, fib: 3.5,
      ingIt: ["Fregula di semola", "Zucchine", "Carote", "Zafferano", "Cipolla", "Olio EVO", "Prezzemolo", "Brodo vegetale"],
      ingEn: ["Semolina fregula", "Courgettes", "Carrots", "Saffron", "Onion", "EVO oil", "Parsley", "Vegetable stock"],
      allergens: ["GLUTEN"], tags: ["VG"], order: 7,
    },
    {
      slug: "pulled-pork-di-maialino", nameIt: "Pulled Pork di Maialino Sardo", nameEn: "Sardinian Porklet Pulled Pork",
      descIt: "Maialino sardo cotto a bassa temperatura e sfilacciato, marinato con senape e miele, servito con slaw di cavolo cappuccio.",
      descEn: "Slow-cooked pulled Sardinian porklet, mustard and honey marinade, served with cabbage slaw.",
      category: "Plates", image: img("pollo_2"), price: 5.5, weight: 350,
      kcal: 186, p: 21, f: 10, c: 2.5, fib: 1.5,
      ingIt: ["Maialino sardo", "Cavolo cappuccio", "Senape", "Miele", "Carote", "Aceto di mele", "Olio EVO", "Paprika affumicata"],
      ingEn: ["Sardinian porklet", "White cabbage", "Mustard", "Honey", "Carrots", "Apple vinegar", "EVO oil", "Smoked paprika"],
      allergens: ["SENAPE"], tags: ["P", "GF"], order: 8,
    },
    {
      slug: "bowl-di-lenticchie-e-spinaci", nameIt: "Bowl di Lenticchie e Spinaci", nameEn: "Lentil and Spinach Bowl",
      descIt: "Lenticchie di Ullastru con spinaci freschi, carote e dado aromatico leggero: comfort invernale ricco di fibre.",
      descEn: "Ullastru lentils with fresh spinach, carrots and light aromatic stock: a fibre-rich winter comfort bowl.",
      category: "Plates", image: img("grabgo"), price: 3.9, weight: 400,
      kcal: 118, p: 8, f: 3.2, c: 16, fib: 6.5,
      ingIt: ["Lenticchie", "Spinaci", "Carote", "Sedano", "Cipolla", "Olio EVO", "Alloro", "Pepe nero"],
      ingEn: ["Lentils", "Spinach", "Carrots", "Celery", "Onion", "EVO oil", "Bay leaf", "Black pepper"],
      allergens: ["SEDANO"], tags: ["GF", "VG"], seasonalFrom: "10-01", seasonalTo: "03-31", order: 9,
    },
    // ---------------- SMOOTHIES ----------------
    {
      slug: "verde-pulito", nameIt: "Verde Pulito", nameEn: "Clean Green",
      descIt: "Spinaci, banana, mela verde, sedano, zenzero e acqua di cocco: il reset verde di ogni giorno.",
      descEn: "Spinach, banana, green apple, celery, ginger and coconut water: your daily green reset.",
      category: "Smoothies", image: img("smoothie_verde"), price: 3.2, weight: 400,
      kcal: 58, p: 1.5, f: 0.5, c: 12, fib: 2.5,
      ingIt: ["Acqua di cocco", "Banana", "Spinaci", "Mela verde", "Sedano", "Zenzero", "Limone", "Semi di chia"],
      ingEn: ["Coconut water", "Banana", "Spinach", "Green apple", "Celery", "Ginger", "Lemon", "Chia seeds"],
      allergens: [], tags: ["GF", "VG"], addInIds: ["creatina", "collagene", "lions-mane", "probiotici"],
      signature: true, popular: true, order: 10,
    },
    {
      slug: "frutti-di-bosco-proteico", nameIt: "Frutti di Bosco Proteico", nameEn: "Protein Berry",
      descIt: "Mirtilli, lamponi, banana e proteine di pisello: 32 g di proteine per porzione senza compromessi.",
      descEn: "Blueberries, raspberries, banana and pea protein: 32 g of protein per serving.",
      category: "Smoothies", image: img("smoothie_bosco"), price: 4.1, weight: 420,
      kcal: 84, p: 8, f: 1.5, c: 10, fib: 3.0,
      ingIt: ["Bevanda di riso", "Mirtilli", "Lamponi", "Banana", "Proteine di pisello", "Semi di canapa", "Limone", "Stevia"],
      ingEn: ["Rice drink", "Blueberries", "Raspberries", "Banana", "Pea protein", "Hemp seeds", "Lemon", "Stevia"],
      allergens: [], tags: ["GF", "VG"], addInIds: ["creatina", "collagene", "lions-mane", "probiotici"],
      signature: true, popular: true, order: 11,
      claim: "Le proteine contribuiscono alla crescita e al mantenimento della massa muscolare",
    },
    {
      slug: "cacao-e-banana", nameIt: "Cacao e Banana", nameEn: "Cacao Banana",
      descIt: "Banana matura, cacao crudo, burro di mandorle e latte di mandorla: il dessert che si comporta bene.",
      descEn: "Ripe banana, raw cacao, almond butter and almond milk: dessert that behaves.",
      category: "Smoothies", image: img("smoothie_cacao"), price: 3.8, weight: 400,
      kcal: 96, p: 3, f: 3.8, c: 13, fib: 3.2,
      ingIt: ["Latte di mandorla", "Banana", "Cacao crudo", "Burro di mandorle", "Datteri", "Avena", "Cannella", "Sale rosa"],
      ingEn: ["Almond milk", "Banana", "Raw cacao", "Almond butter", "Dates", "Oats", "Cinnamon", "Pink salt"],
      allergens: ["FRUTTA_GUSCIO", "GLUTEN"], tags: ["VG"],
      addInIds: ["creatina", "collagene", "lions-mane", "probiotici"], signature: true, order: 12,
    },
    {
      slug: "zenzero-dorato", nameIt: "Zenzero Dorato", nameEn: "Golden Ginger",
      descIt: "Curcuma, zenzero fresco, arancia, carota e un pizzico di pepe nero: sole liquido con vitamina C naturale.",
      descEn: "Turmeric, fresh ginger, orange, carrot and a pinch of black pepper: liquid sunshine.",
      category: "Smoothies", image: img("smoothie_zenzero"), price: 3.6, weight: 380,
      kcal: 54, p: 1, f: 0.8, c: 10.5, fib: 2.2,
      ingIt: ["Arancia", "Carota", "Zenzero", "Curcuma", "Limone", "Pepe nero", "Acqua", "Mela"],
      ingEn: ["Orange", "Carrot", "Ginger", "Turmeric", "Lemon", "Black pepper", "Water", "Apple"],
      allergens: [], tags: ["GF", "VG"], addInIds: ["creatina", "collagene", "lions-mane", "probiotici"],
      signature: true, order: 13,
      claim: "La vitamina C contribuisce alla normale funzione del sistema immunitario",
    },
    {
      slug: "mango-e-yogurt-greco", nameIt: "Mango e Yogurt Greco", nameEn: "Mango Greek Yogurt",
      descIt: "Mango maturo, yogurt greco intero e cardamomo: cremoso, proteico, con 20 g di proteine per porzione.",
      descEn: "Ripe mango, whole Greek yogurt and cardamom: creamy and protein-rich.",
      category: "Smoothies", image: img("smoothie_bosco_2"), price: 3.9, weight: 400,
      kcal: 82, p: 5, f: 1.8, c: 12, fib: 1.8,
      ingIt: ["Yogurt greco", "Mango", "Banana", "Miele", "Cardamomo", "Limone", "Semi di chia", "Acqua"],
      ingEn: ["Greek yogurt", "Mango", "Banana", "Honey", "Cardamom", "Lemon", "Chia seeds", "Water"],
      allergens: ["LATTE"], tags: ["GF", "V"], addInIds: ["collagene", "probiotici"], order: 14,
    },
    {
      slug: "caffe-e-mandorle", nameIt: "Caffè e Mandorle", nameEn: "Almond Mocha",
      descIt: "Espresso doppio, latte di mandorla, cacao e dattero Medjool: energia lenta da bersi.",
      descEn: "Double espresso, almond milk, cacao and Medjool date: slow energy to drink.",
      category: "Smoothies", image: img("smoothie_cacao_2"), price: 3.7, weight: 350,
      kcal: 88, p: 2.5, f: 3.2, c: 12, fib: 2.0,
      ingIt: ["Latte di mandorla", "Espresso", "Datteri", "Cacao", "Vaniglia", "Cannella", "Ghiaccio", "Sale rosa"],
      ingEn: ["Almond milk", "Espresso", "Dates", "Cacao", "Vanilla", "Cinnamon", "Ice", "Pink salt"],
      allergens: ["FRUTTA_GUSCIO"], tags: ["VG"], addInIds: ["creatina", "collagene", "probiotici"], order: 15,
    },
    // ---------------- COLAZIONE ----------------
    {
      slug: "yogurt-granola-e-miele", nameIt: "Yogurt Greco, Granola e Miele", nameEn: "Greek Yogurt, Granola and Honey",
      descIt: "Yogurt greco intero, granola tostata ai cereali, miele di Sardegna e frutta fresca di stagione.",
      descEn: "Whole Greek yogurt, toasted granola, Sardinian honey and seasonal fresh fruit.",
      category: "Colazione", image: img("colazione"), price: 3.4, weight: 300,
      kcal: 152, p: 8, f: 5, c: 18, fib: 2.5,
      ingIt: ["Yogurt greco", "Granola ai cereali", "Miele di Sardegna", "Frutta fresca", "Semi di girasole", "Semi di lino", "Cannella", "Vaniglia"],
      ingEn: ["Greek yogurt", "Cereal granola", "Sardinian honey", "Fresh fruit", "Sunflower seeds", "Flax seeds", "Cinnamon", "Vanilla"],
      allergens: ["LATTE", "GLUTEN"], tags: ["V"], addInIds: ["collagene", "probiotici"], popular: true, order: 16,
    },
    {
      slug: "porridge-avena-e-frutti-rossi", nameIt: "Porridge di Avena e Frutti Rossi", nameEn: "Oat and Berry Porridge",
      descIt: "Porridge cremoso di avena con frutti rossi, sciroppo d'acero e semi di chia.",
      descEn: "Creamy oat porridge with red berries, maple syrup and chia seeds.",
      category: "Colazione", image: img("colazione_2"), price: 2.9, weight: 320,
      kcal: 118, p: 4, f: 3, c: 20, fib: 3.8,
      ingIt: ["Avena", "Bevanda di riso", "Frutti rossi", "Sciroppo d'acero", "Semi di chia", "Vaniglia", "Cannella", "Sale rosa"],
      ingEn: ["Oats", "Rice drink", "Red berries", "Maple syrup", "Chia seeds", "Vanilla", "Cinnamon", "Pink salt"],
      allergens: ["GLUTEN"], tags: ["VG"], addInIds: ["collagene", "probiotici"], order: 17,
    },
    {
      slug: "uova-strapazzate-e-spinaci", nameIt: "Uova Strapazzate e Spinaci", nameEn: "Scrambled Eggs and Spinach",
      descIt: "Uova pastorizzate strapazzate con spinaci freschi, olio EVO e pane carasau: la colazione cheto-friendly.",
      descEn: "Scrambled pasteurized eggs with fresh spinach, EVO oil and carasau bread: keto-friendly breakfast.",
      category: "Colazione", image: img("tofu_2"), price: 3.6, weight: 280,
      kcal: 158, p: 12, f: 11, c: 2.5, fib: 1.2,
      ingIt: ["Uova", "Spinaci", "Olio EVO", "Pane carasau", "Erba cipollina", "Pepe nero", "Sale rosa", "Scalogno"],
      ingEn: ["Eggs", "Spinach", "EVO oil", "Carasau bread", "Chives", "Black pepper", "Pink salt", "Shallot"],
      allergens: ["UOVA", "GLUTEN"], tags: ["P", "KETO"], order: 18,
    },
    // ---------------- GELATO ----------------
    {
      slug: "gelato-fior-di-panna", nameIt: "Gelato Artigianale Fior di Panna", nameEn: "Artisanal Fior di Panna Ice Cream",
      descIt: "Gelato artigianale a base di panna fresca pastorizzata, prodotto ogni mattina in laboratorio.",
      descEn: "Artisanal ice cream made with fresh pasteurized cream, churned every morning.",
      category: "Gelato", image: img("gelato"), price: 2.8, weight: 120,
      kcal: 192, p: 3.5, f: 11, c: 21, fib: 0,
      ingIt: ["Panna fresca", "Latte intero", "Zucchero", "Tuorli", "Vaniglia del Madagascar", "Destrosio", "Fibra di acacia", "Sale"],
      ingEn: ["Fresh cream", "Whole milk", "Sugar", "Egg yolks", "Madagascar vanilla", "Dextrose", "Acacia fibre", "Salt"],
      allergens: ["LATTE", "UOVA"], tags: ["V"], order: 19,
    },
    {
      slug: "sorbetto-al-limone-di-sardegna", nameIt: "Sorbetto al Limone di Sardegna", nameEn: "Sardinian Lemon Sorbet",
      descIt: "Sorbetto con limoni di Muravera, acqua e zucchero: tre ingredienti, zero lattosio.",
      descEn: "Sorbet with Muravera lemons, water and sugar: three ingredients, lactose free.",
      category: "Gelato", image: img("gelato_2"), price: 2.4, weight: 120,
      kcal: 112, p: 0.5, f: 0.2, c: 26, fib: 0.8,
      ingIt: ["Polpa di limone di Muravera", "Acqua", "Zucchero", "Scorza di limone", "Fibra di acacia", "Sale"],
      ingEn: ["Muravera lemon pulp", "Water", "Sugar", "Lemon zest", "Acacia fibre", "Salt"],
      allergens: [], tags: ["GF", "VG", "LACTOSE_FREE"], seasonalFrom: "05-01", seasonalTo: "09-30", order: 20,
    },
    // ---------------- GRAB & GO ----------------
    {
      slug: "hummus-e-verdure", nameIt: "Vasetto Hummus e Verdure", nameEn: "Hummus and Veggie Cup",
      descIt: "Hummus cremoso di ceci e tahini con bastoncini di carote, cetrioli e peperoni.",
      descEn: "Creamy chickpea and tahini hummus with carrot, cucumber and pepper sticks.",
      category: "Grab & Go", image: img("grabgo"), price: 2.6, weight: 240,
      kcal: 132, p: 4.5, f: 8, c: 11, fib: 4.5,
      ingIt: ["Ceci", "Tahini", "Carote", "Cetrioli", "Peperoni", "Olio EVO", "Limone", "Cumino"],
      ingEn: ["Chickpeas", "Tahini", "Carrots", "Cucumbers", "Bell peppers", "EVO oil", "Lemon", "Cumin"],
      allergens: ["SESAMO"], tags: ["GF", "VG"], order: 21,
    },
    {
      slug: "frittata-muffin-con-zucchine", nameIt: "Frittata Muffin con Zucchine", nameEn: "Courgette Frittata Muffins",
      descIt: "Mini frittate al forno con zucchine, pecorino e menta: snack proteico da portare via.",
      descEn: "Baked mini frittatas with courgettes, pecorino and mint: a protein snack on the go.",
      category: "Grab & Go", image: img("grabgo_2"), price: 2.9, weight: 180,
      kcal: 142, p: 10, f: 9.5, c: 3.0, fib: 1.0,
      ingIt: ["Uova", "Zucchine", "Pecorino sardo", "Menta fresca", "Erba cipollina", "Olio EVO", "Pepe nero", "Sale rosa"],
      ingEn: ["Eggs", "Courgettes", "Sardinian pecorino", "Fresh mint", "Chives", "EVO oil", "Black pepper", "Pink salt"],
      allergens: ["UOVA", "LATTE"], tags: ["GF", "V", "KETO"], order: 22,
    },
    // ---------------- BEVANDE ----------------
    {
      slug: "kombucha-alla-mela", nameIt: "Kombucha alla Mela", nameEn: "Apple Kombucha",
      descIt: "Kombucha artigianale fermentato con tè verde e mele dell'altopiano, leggermente frizzante.",
      descEn: "Artisanal kombucha brewed with green tea and highland apples, lightly sparkling.",
      category: "Bevande", image: img("smoothie_zenzero_2"), price: 0.9, weight: 330,
      kcal: 28, p: 0.2, f: 0, c: 6.5, fib: 0,
      ingIt: ["Tè verde", "Mela", "Zucchero di canna", "Colture SCOBY", "Zenzero", "Limone", "Acqua", "Fiori essiccati"],
      ingEn: ["Green tea", "Apple", "Cane sugar", "SCOBY cultures", "Ginger", "Lemon", "Water", "Dried flowers"],
      allergens: [], tags: ["GF", "VG"], order: 23,
    },
    {
      slug: "acqua-detoss-zenzero-limone", nameIt: "Acqua Detoss Zenzero e Limone", nameEn: "Ginger Lemon Detox Water",
      descIt: "Acqua depurata con infusione a freddo di zenzero, limone e menta. Zero zuccheri.",
      descEn: "Purified water with cold-brewed ginger, lemon and mint infusion. Zero sugars.",
      category: "Bevande", image: img("smoothie_verde_2"), price: 0.5, weight: 500,
      kcal: 3, p: 0, f: 0, c: 0.5, fib: 0,
      ingIt: ["Acqua depurata", "Zenzero", "Limone", "Menta fresca", "Cetriolo", "Rosmarino"],
      ingEn: ["Purified water", "Ginger", "Lemon", "Fresh mint", "Cucumber", "Rosemary"],
      allergens: [], tags: ["GF", "VG"], order: 24,
    },
    // ---------------- CAFFE / TE ----------------
    {
      slug: "espresso-italiano", nameIt: "Espresso Italiano", nameEn: "Italian Espresso",
      descIt: "Blend 100% arabica di torrefazione artigianale, estrazione a 25 secondi.",
      descEn: "100% arabica blend from artisan roasting, 25-second extraction.",
      category: "Caffe", image: img("caffe"), price: 6.0, weight: 30,
      kcal: 2, p: 0.1, f: 0, c: 0.3, fib: 0,
      ingIt: ["Caffè arabica tostato", "Acqua depurata"],
      ingEn: ["Roasted arabica coffee", "Purified water"],
      allergens: [], tags: ["GF", "VG"], order: 25,
    },
    {
      slug: "matcha-latte", nameIt: "Matcha Latte", nameEn: "Matcha Latte",
      descIt: "Matcha cerimoniale giapponese montato con latte d'avena cremoso.",
      descEn: "Ceremonial Japanese matcha whisked with creamy oat milk.",
      category: "Caffe", image: img("caffe_2"), price: 1.6, weight: 250,
      kcal: 62, p: 2, f: 2.2, c: 8.5, fib: 1.0,
      ingIt: ["Latte d'avena", "Matcha cerimoniale", "Miele", "Vaniglia", "Acqua calda"],
      ingEn: ["Oat milk", "Ceremonial matcha", "Honey", "Vanilla", "Hot water"],
      allergens: ["GLUTEN"], tags: ["V"], order: 26,
    },
    // ---------------- PLATTERS ----------------
    {
      slug: "platter-ufficio-mediterraneo", nameIt: "Platter Ufficio Mediterraneo", nameEn: "Mediterranean Office Platter",
      descIt: "Platter di condivisione con hummus, verdure, wraps integrali, formaggi sardi e frutta secca. Ideale per 4-6 persone.",
      descEn: "Sharing platter with hummus, vegetables, wholewheat wraps, Sardinian cheeses and nuts. Serves 4-6.",
      category: "Platters", image: img("platter"), price: 3.6, weight: 1000,
      kcal: 184, p: 7, f: 9, c: 18, fib: 5.5,
      ingIt: ["Wraps integrali", "Hummus", "Verdure fresche", "Formaggi sardi", "Frutta secca mista", "Olive", "Olio EVO", "Erbe aromatiche"],
      ingEn: ["Wholewheat wraps", "Hummus", "Fresh vegetables", "Sardinian cheeses", "Mixed nuts", "Olives", "EVO oil", "Fresh herbs"],
      allergens: ["GLUTEN", "LATTE", "SESAMO", "FRUTTA_GUSCIO"], tags: ["V"], order: 27,
    },
  ];

  for (const m of menu) {
    await db.menuItem.create({
      data: {
        slug: m.slug,
        nameIt: m.nameIt,
        nameEn: m.nameEn,
        descIt: m.descIt,
        descEn: m.descEn,
        category: m.category,
        imageUrl: m.image || null,
        pricePer100g: m.price,
        unitWeightG: m.weight,
        kcal: m.kcal,
        proteinG: m.p,
        fatG: m.f,
        carbG: m.c,
        fiberG: m.fib,
        ingredientsIt: JSON.stringify(m.ingIt),
        ingredientsEn: JSON.stringify(m.ingEn),
        allergens: JSON.stringify(m.allergens),
        dietTags: JSON.stringify(m.tags),
        addInIds: JSON.stringify(m.addInIds ?? []),
        healthClaim: m.claim ?? null,
        available: true,
        availableDays: JSON.stringify([1, 2, 3, 4, 5, 6, 0]),
        seasonalFrom: m.seasonalFrom ?? null,
        seasonalTo: m.seasonalTo ?? null,
        isPopular: m.popular ?? false,
        isSignature: m.signature ?? false,
        sortOrder: m.order,
      },
    });
  }

  // -------------------------------------------------- ZONE DELIVERY
  console.log("Zone delivery Cagliari...");
  const zones = [
    { name: "Centro Storico (Castello e Marina)", fee: 2.9, minOrder: 15, etaMinutes: 30, sortOrder: 1 },
    { name: "Stampace", fee: 2.9, minOrder: 15, etaMinutes: 30, sortOrder: 2 },
    { name: "Villanova", fee: 2.9, minOrder: 15, etaMinutes: 30, sortOrder: 3 },
    { name: "San Benedetto", fee: 3.5, minOrder: 18, etaMinutes: 35, sortOrder: 4 },
    { name: "Poetto e Quartiere Europeo", fee: 3.9, minOrder: 18, etaMinutes: 40, sortOrder: 5 },
  ];
  for (const z of zones) {
    await db.deliveryZone.create({ data: z });
  }

  // -------------------------------------------------- COUPON
  await db.coupon.create({
    data: { code: "BENVENUTO10", type: "PERCENT", value: 10, minOrder: 15, validTo: new Date(Date.now() + 90 * 86400_000) },
  });
  await db.coupon.create({
    data: { code: "PRANZO5", type: "FIXED", value: 5, minOrder: 25, maxUses: 100, validTo: new Date(Date.now() + 30 * 86400_000) },
  });

  // -------------------------------------------------- BLOG
  console.log("Blog...");
  const posts = [
    {
      slug: "nutrizione-di-precisione-cosa-significa",
      title: "Nutrizione di precisione: cosa significa mangiare secondo dati",
      excerpt: "Non una dieta universale ma un approccio misurato: obiettivi, grammi, ripetibilità. Ecco come traduciamo la scienza della nutrizione in un piatto.",
      category: "Nutrizione",
      readMinutes: 6,
      coverUrl: img("hero"),
      content: `## Dati, non mode

La nutrizione di precisione parte da un presupposto semplice: due persone diverse rispondono in modo diverso allo stesso pasto. Generalizzare è comodo, ma raramente funziona. Per questo a Cagliari abbiamo costruito La Schiscetta attorno a tre numeri che conosci già: calorie, proteine e ripartizione dei macronutrienti.

## Il metodo in quattro passi

1. **Definisci l'obiettivo.** Un deficit calorico moderato, un surplus per la massa muscolare o il mantenimento: ogni piatto del nostro menu dichiara i valori per 100 g, così sai sempre dove sei.
2. **Componi al grammo.** Il prezzo al peso (€/100 g) ti permette di calibrare la porzione, non subirla.
3. **Traccia.** Ogni ordine alimenta la tua dashboard nutrizionale: proteine, carboidrati, grassi e fibre aggregati automaticamente.
4. **Correggi.** I dati accumulati rendono evidenti gli squilibri: poca fibra, troppe calorie la sera, proteine distribuite male.

## Cosa NON è

Non è una terapia, non sostituisce il medico o il dietista. Le informazioni nutrizionali che pubblichiamo servono a scegliere consapevolmente, non a diagnosticare o trattare nulla. Per condizioni cliniche specifiche rivolgiti sempre a un professionista sanitario.

## Perché il peso conta

Pagare al grammo ha un effetto collaterale interessante: riportare la porzione sotto il tuo controllo. Se il tuo obiettivo sono 40 g di proteine a pranzo, sai esattamente quanti grammi di pollo mediterraneo servono. Nessun piatto 'grande' o 'piccolo': solo la tua misura.`,
    },
    {
      slug: "i-14-allergeni-obbligatori-italia-guida",
      title: "I 14 allergeni obbligatori in Italia: la guida pratica",
      excerpt: "Glutine, crostacei, uova, pesce e gli altri undici: cosa dice il Regolamento UE 1169/2011 e come li gestiamo in cucina e sul sito.",
      category: "Sicurezza alimentare",
      readMinutes: 5,
      coverUrl: img("grabgo"),
      content: `## Cosa prevede la legge

Il Regolamento UE 1169/2011, recepito in Italia, impone a ogni operatore del settore alimentare di dichiarare la presenza di 14 allergeni negli alimenti non preimballati: glutine, crostacei, uova, pesce, arachidi, soia, latte, frutta a guscio, sedano, senape, semi di sesamo, solfiti, lupini e molluschi.

## Come li gestiamo

- Ogni voce del nostro menu digitale ha un campo allergeni **obbligatorio**: non è possibile pubblicare un piatto senza dichiararli.
- Gli ingredienti sono elencati in ordine decrescente di quantità, come previsto dalla normativa.
- Il nostro backend verifica automaticamente incongruenze: se un piatto è etichettato vegetariano ma contiene ingredienti di origine animale, l'operatore riceve un avviso prima della pubblicazione.

## Cross contamination

La dichiarazione degli ingredienti non esaurisce il tema: le contaminazioni crociate in cucina sono il rischio più comune. Il nostro protocollo HACCP (Reg. CE 852/2004) prevede linee di lavorazione separate per gli alimenti senza glutine e formazione costante del personale.

## Se hai un'allergia

Diglielo sempre al momento dell'ordine, anche se il piatto risulta 'sicuro' online: in cucina verifichiamo ogni singola preparazione. In caso di dubbio, chiedi il registro allergeni aggiornato.`,
    },
    {
      slug: "macro-al-grammo-come-funziona-il-prezzo-al-peso",
      title: "Macro al grammo: come funziona il nostro prezzo al peso",
      excerpt: "Il modello €/100 g spiegato in cinque minuti: trasparenza sul prezzo, porzioni sotto controllo e zero sprechi.",
      category: "Come funziona",
      readMinutes: 4,
      coverUrl: img("quinoa"),
      content: `## Un prezzo, tre informazioni

Quando vedi '5,20 €/100 g' stai vedendo anche altro: è la dichiarazione che quel piatto ha un costo perfettamente proporzionale a ciò che prendi. 200 g? 10,40 €. 350 g? 18,20 €. Nessun sovrapprezzo per porzioni 'grandi', nessun obbligo di finire il piatto.

## Il calcolatore macro

Nella pagina di ogni piatto trovi il calcolatore: muovi il peso e vedi aggiornarsi calorie, proteine, grassi, carboidrati e fibre oltre al prezzo. È lo stesso strumento che usiamo al banco per comporre il tuo ordine.

## Perché funziona per il tracking

Chi traccia i macronutrienti sa quanto è frustrante stimare 'a occhio'. Con il prezzo al peso la stima sparisce: il grammo che paghi è il grammo che tracchi. La dashboard del tuo account aggrega i valori di ogni ordine, così il diario alimentare si compila da solo.

## Add-in: personalizzazione responsabile

Creatina, collagene, estratto di Hericium erinaceus e probiotici sono opzioni che aggiungiamo solo su richiesta. Per ognuno pubblichiamo esclusivamente claim autorizzati dal registro EFSA (Reg. UE 1924/2006): dove l'autorizzazione non esiste, non facciamo dichiarazioni.`,
    },
    {
      slug: "colazione-proteica-5-idee-veloci",
      title: "Colazione proteica: 5 idee veloci prima dell'ufficio",
      excerpt: "Partire con 25-30 g di proteine stabilizza l'appetito per tutta la mattina. Cinque combinazioni dal nostro banco colazione.",
      category: "Ricette",
      readMinutes: 4,
      coverUrl: img("colazione"),
      content: `## Perché la proteina a colazione

Diversi studi associano una colazione ricca di proteine a un maggiore senso di sazietà e a un migliore controllo dell'appetito nelle ore successive. Non servono stravolgimenti: bastano scelte puntuali.

## 1. Yogurt greco, granola e miele

La combinazione classica del nostro banco: yogurt greco intero (circa 10 g di proteine per 100 g), granola tostata e miele di Sardegna. Con una porzione da 300 g arrivi a 24 g di proteine.

## 2. Uova strapazzate e spinaci

La scelta cheto-friendly: uova pastorizzate, spinaci freschi e carasau. Aggiungi un espresso doppio e la mattina è sistemata.

## 3. Frutti di bosco proteico

Il smoothie da 32 g di proteine: mirtilli, lamponi, banana e proteine di pisello. Se hai una sessione di allenamento in agenda, è lui.

## 4. Frittata muffin con zucchine

Il grab & go perfetto: mini frittate al forno con pecorino e menta, da mangiare in ufficio senza posate.

## 5. Matcha latte + vasetto hummus

Accoppiata insolita ma efficace: il matcha latte con latte d'avena per la carica e l'hummus con verdure per arrivare a pranzo senza cali.`,
    },
    {
      slug: "prodotti-sardi-che-usiamo-ogni-giorno",
      title: "I prodotti sardi che usiamo ogni giorno",
      excerpt: "Dalle lenticchie di Ullastru al miele della Sardegna, dal pane carasau ai limoni di Muravera: la nostra short list di fornitori isolani.",
      category: "Territorio",
      readMinutes: 3,
      coverUrl: img("interno"),
      content: `## Filiera corta, piatti migliori

Un ristorante di precisione nutrizionale vive o muore per la qualità delle materie prime. La Sardegna ci rende il lavoro più facile: biodiversity, stagionalità e produttori a chilometro zero.

## La short list

- **Pane carasau** da forno artigianale: la base croccante delle nostre polpette.
- **Pecorino sardo DOP**: stagionato, grattugiato al momento.
- **Limoni di Muravera**: il sorbetto estivo e l'acqua detoss.
- **Miele di Sardegna**: millefiori e asfodelo per le colazioni.
- **Lenticchie di Ullastru**: piccole, scure, ricche di fibre: il cuore del bowl invernale.
- **Verdure da orti del Campidano**: consegne due volte a settimana.

## Perché conta anche per l'ambiente

Fresco significa meno trasporti, meno conservanti e più nutrienti. Non è un caso che i piatti più ricchi di fibre del nostro menu siano anche quelli a impronta più bassa.`,
    },
  ];
  for (const p of posts) {
    await db.blogPost.create({ data: p });
  }

  // -------------------------------------------------- RECENSIONI
  const reviews = [
    { author: "Giulia M.", rating: 5, text: "Finalmente un posto a Cagliari dove so esattamente cosa mangio. Il calcolatore macro è geniale e il pollo mediterraneo è ottimo." },
    { author: "Andrea S.", rating: 5, text: "Ordino per pranzo in ufficio due volte a settimana. Consegna puntuale e la dashboard nutrizionale mi ha fatto capire quanto poco mangiavo." },
    { author: "Martina L.", rating: 4, text: "Smoothie top, il frutti di bosco proteico con creatina è il mio post workout. Prezzi onesti per la qualità. Aspetto l'app!" },
    { author: "Luca R.", rating: 5, text: "Il sistema €/100g è trasparente e onesto. Polpette sarde eccezionali, si sente il pecorino vero." },
    { author: "Elena P.", rating: 5, text: "Sono celiaca e qui ho trovato declinazioni chiare degli allergeni su ogni piatto. Rare volte mi sento sicura a mangiare fuori." },
    { author: "Davide C.", rating: 4, text: "Bowl di quinoa abbondante e fresco. Un po' di attesa all'ora di punta ma la qualità ripaga." },
    { author: "Sara V.", rating: 5, text: "Il catering per il nostro ufficio è stato perfetto: platter mediterraneo, puntuale e curato nei dettagli." },
    { author: "Francesco T.", rating: 5, text: "Colazione da campioni: yogurt greco con miele sardo e granola. Rapporto qualità-prezzo imbattibile." },
  ];
  for (const r of reviews) {
    await db.review.create({
      data: { ...r, source: "Google", date: new Date(Date.now() - Math.floor(rnd() * 90) * 86400_000) },
    });
  }

  // -------------------------------------------------- PRIVACY POLICY
  console.log("Privacy policy GDPR...");
  const privacySections = [
    {
      id: "titolare",
      title: "1. Titolare del trattamento",
      body: `La Schiscetta S.r.l. (in costituzione), con sede in Via Roma 100, 09124 Cagliari (CA), Italia, P.IVA 01234567897, è il Titolare del trattamento dei dati personali ai sensi del Regolamento UE 2016/679 (GDPR) e del Codice Privacy italiano (D.Lgs. 196/2003 come modificato).\n\nContatti: privacy@laschiscetta.it - Responsabile della Protezione dei Dati (DPO): Marco Puddu, dpo@laschiscetta.it.`,
    },
    {
      id: "finalita",
      title: "2. Finalità e basi giuridiche del trattamento",
      body: `Trattiamo i tuoi dati per le seguenti finalità:\n\na) Erogazione del servizio di ristorazione e consegna (esecuzione contratto, art. 6.1.b GDPR): dati identificativi, contatti, indirizzo di consegna, contenuti dell'ordine.\n\nb) Gestione dell'account e della dashboard nutrizionale (esecuzione contratto): email, password (cifrata con hash argon2id), obiettivi nutrizionali facoltativi.\n\nc) Obblighi fiscali e contabili (obbligo legale, art. 6.1.c GDPR): dati di fatturazione, conservazione 10 anni come da normativa italiana.\n\nd) Analisi statistiche aggregate del sito, SOLO previo consenso esplicito (art. 6.1.a GDPR), con IP anonimizzato e senza identificatori persistenti.\n\ne) Newsletter, SOLO previo doppio opt-in (art. 6.1.a GDPR), revocabile in ogni momento.\n\nf) Sicurezza informatica e prevenzione frodi (legittimo interesse, art. 6.1.f GDPR): log di sicurezza, protezione dai tentativi di accesso non autorizzati.`,
    },
    {
      id: "dati",
      title: "3. Categorie di dati trattati",
      body: `Dati identificativi (nome, email, telefono), dati di consegna (indirizzo), dati relativi agli ordini (piatti, pesi, valori nutrizionali aggregati), dati tecnici (indirizzo IP anonimizzato per le statistiche consensuali, tipo di dispositivo, browser).\n\nNON trattiamo categorie particolari di dati (art. 9 GDPR) né prendiamo decisioni automatizzate (art. 22 GDPR). I dati di salute dichiarati volontariamente negli obiettivi nutrizionali sono auto-dichiarati, facoltativi, cifrati a riposo e cancellabili in ogni momento.`,
    },
    {
      id: "cookie",
      title: "4. Cookie e tecnologie simili",
      body: `Il sito utilizza cookie tecnici essenziali (sessione, sicurezza CSRF, lingua) che non richiedono consenso, e SOLO previo consenso esplicito strumenti di analisi statistica cookieless di prima parte.\n\nNessun cookie di profilazione o di terze parti viene installato in mancanza di consenso positivo (opt-in), come richiesto dal Provvedimento del Garante Privacy n. 231/2021. Il consenso è revocabile in ogni momento dal link "Gestisci cookie" nel footer. L'elenco dettagliato è disponibile nella Cookie Policy.`,
    },
    {
      id: "terzi",
      title: "5. Comunicazione a terzi e destinatari",
      body: `I dati sono comunicati esclusivamente a: fornitori che agiscono come responsabili del trattamento (hosting UE, provider email transazionale EU, provider pagamenti Stripe in qualità di titolare autonomo per i dati di pagamento), e alle autorità competenti ove richiesto da obbligo di legge.\n\nI dati sono conservati su server ubicati nell'Unione Europea. In caso di trasferimento verso paesi extra-UE (es. Stripe per i pagamenti) si applicano le garanzie adeguate previste dai capitoli V GDPR (decisioni di adeguatezza, clausole contrattuali standard).`,
    },
    {
      id: "conservazione",
      title: "6. Termini di conservazione",
      body: `Ordini e fatture: 10 anni (obbligo fiscale). Dati account: fino alla cancellazione richiesta dall'interessato. Registro dei consensi cookie: 12 mesi. Dati statistici aggregati: massimo 24 mesi. Log di sicurezza: 12 mesi. Newsletter: fino alla disiscrizione.`,
    },
    {
      id: "diritti",
      title: "7. Diritti dell'interessato",
      body: `Ai sensi degli artt. 15-22 GDPR hai il diritto di: accedere ai tuoi dati, rettificarli, cancellarli, limitarne il trattamento, portarli altrove (esportazione JSON), opporti al trattamento e revocare il consenso in ogni momento.\n\nPuoi esercitare i diritti direttamente dalla tua area account (sezione "Privacy e dati") o scrivendo a privacy@laschiscetta.it. Rispondiamo entro 30 giorni.\n\nHai inoltre il diritto di proporre reclamo al Garante per la Protezione dei Dati Personali (www.garanteprivacy.it).`,
    },
    {
      id: "sicurezza",
      title: "8. Misure di sicurezza",
      body: `Adottiamo misure tecniche e organizzative adeguate ai sensi dell'art. 32 GDPR: cifratura TLS in transito, cifratura AES-256-GCM a riposo per i dati personali nel database, hashing delle password con argon2id, autenticazione a due fattori obbligatoria per il personale, controllo degli accessi basato sui ruoli, audit log immutabile, backup cifrati e piano di disaster recovery.\n\nIn caso di violazione dei dati che presenti un rischio elevato per i diritti e le libertà delle persone fisiche, il Titolare notificherà il breach al Garante entro 72 ore (art. 33 GDPR) e comunicherà agli interessati quanto previsto dall'art. 34 GDPR.`,
    },
  ];
  await db.privacyPolicy.create({
    data: {
      id: "main",
      sections: JSON.stringify(privacySections),
      version: 1,
    },
  });
  await db.policyVersion.create({
    data: {
      type: "PRIVACY",
      version: 1,
      sections: JSON.stringify(privacySections),
      changeNote: "Versione iniziale",
      authorName: "sistema",
    },
  });

  // -------------------------------------------------- COOKIE TABLE
  console.log("Tabella cookie...");
  const cookieDefs = [
    { name: "sch_csrf", provider: "La Schiscetta (prima parte)", purpose: "Protezione CSRF: token di sicurezza dei moduli", duration: "Sessione", category: "TECNICI", required: true, active: true, sortOrder: 1 },
    { name: "sch_session", provider: "La Schiscetta (prima parte)", purpose: "Sessione di autenticazione del cliente (JWT httpOnly)", duration: "7 giorni", category: "TECNICI", required: true, active: true, sortOrder: 2 },
    { name: "sch_admin_session", provider: "La Schiscetta (prima parte)", purpose: "Sessione backend amministrativo (JWT httpOnly, SameSite=Strict)", duration: "8 ore max", category: "TECNICI", required: true, active: true, sortOrder: 3 },
    { name: "i18n_lang", provider: "La Schiscetta (prima parte)", purpose: "Memorizza la lingua preferita (IT/EN)", duration: "12 mesi", category: "TECNICI", required: true, active: true, sortOrder: 4 },
    { name: "raccolta anonimizzata (cookieless)", provider: "La Schiscetta (prima parte)", purpose: "Statistiche aggregate senza cookie: IP anonimizzato, pseudonimo giornaliero non persistente", duration: "N/A (nessun cookie)", category: "ANALITICI_1P", required: false, active: true, sortOrder: 5 },
    { name: "_ga / _ga_*", provider: "Google Ireland Ltd", purpose: "Google Analytics 4: statistiche aggregate di terza parte (ATTUALMENTE DISABILITATO)", duration: "fino a 24 mesi", category: "ANALITICI_3P", required: false, active: false, sortOrder: 6 },
    { name: "_fbp", provider: "Meta Platforms Ireland", purpose: "Meta Pixel: marketing e remarketing (ATTUALMENTE DISABILITATO)", duration: "3 mesi", category: "PROFILAZIONE", required: false, active: false, sortOrder: 7 },
    { name: "_ttclid", provider: "TikTok Technology", purpose: "TikTok Pixel: marketing e remarketing (ATTUALMENTE DISABILITATO)", duration: "13 mesi", category: "PROFILAZIONE", required: false, active: false, sortOrder: 8 },
  ];
  for (const c of cookieDefs) {
    await db.cookieDefinition.create({ data: c });
  }

  // -------------------------------------------------- CLIENTI DEMO
  console.log("Clienti demo (PII cifrato AES-256-GCM)...");
  const customers = [
    { email: "demo@laschiscetta.it", password: "Cliente-Demo-2026!", name: "Giulia Caredda", phone: "+39 320 111 2233", kcal: 1900, protein: 130, goal: "mantenimento" },
    { email: "marco@esempio.it", password: "Cliente-Demo-2026!", name: "Marco Spanu", phone: "+39 340 555 6677", kcal: 2600, protein: 160, goal: "bulk" },
    { email: "sara@esempio.it", password: "Cliente-Demo-2026!", name: "Sara Loi", phone: "+39 366 999 8877", kcal: 1600, protein: 110, goal: "cut" },
  ];
  for (const c of customers) {
    await db.customer.create({
      data: {
        email: c.email,
        passwordHash: await hashPassword(c.password),
        nameEnc: encryptField(c.name),
        phoneEnc: encryptField(c.phone),
        dailyKcal: c.kcal,
        dailyProteinG: c.protein,
        goal: c.goal,
      },
    });
  }

  // -------------------------------------------------- ORDINI DEMO
  console.log("Ordini demo...");
  const menuDb = await db.menuItem.findMany();
  const statuses = ["CONSEGNATO", "CONSEGNATO", "CONSEGNATO", "CONSEGNATO", "RICEVUTO", "IN_PREPARAZIONE", "PRONTO", "ANNULLATO"];
  const guestNames = ["Elisa Corda", "Paolo Fadda", "Chiara Mura", "Antonio Pili"];

  for (let i = 0; i < 34; i++) {
    const daysAgo = Math.floor(rnd() * 30);
    const createdAt = new Date(Date.now() - daysAgo * 86400_000 - Math.floor(rnd() * 10) * 3600_000);
    const status = pick(statuses, rnd);
    const cancelled = status === "ANNULLATO";
    const isCustomer = rnd() < 0.6;
    const customer = isCustomer ? customers[Math.floor(rnd() * customers.length)] : null;
    const guest = customer ? null : pick(guestNames, rnd);

    const nLines = 1 + Math.floor(rnd() * 3);
    const lines = [];
    for (let j = 0; j < nLines; j++) {
      const mi = pick(menuDb, rnd);
      const weightG = Math.round((mi.unitWeightG * (0.8 + rnd() * 0.5)) / 10) * 10;
      const foodPrice = Math.round(((mi.pricePer100g * weightG) / 100) * 100) / 100;
      lines.push({
        slug: mi.slug, nameIt: mi.nameIt, nameEn: mi.nameEn, weightG,
        pricePer100g: mi.pricePer100g, addIns: [], lineTotal: foodPrice,
        macros: {
          kcal: Math.round(mi.kcal * (weightG / 100)),
          proteinG: Math.round(mi.proteinG * (weightG / 100)),
          fatG: Math.round(mi.fatG * (weightG / 100)),
          carbG: Math.round(mi.carbG * (weightG / 100)),
          fiberG: Math.round(mi.fiberG * (weightG / 100)),
        },
      });
    }
    const subtotal = Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
    const fulfillment = rnd() < 0.55 ? "RITIRO" : "CONSEGNA";
    const zone = fulfillment === "CONSEGNA" ? pick(zones, rnd).name : null;
    const deliveryFee = zone ? (zones.find((z) => z.name === zone)?.fee ?? 0) : 0;
    const useCoupon = rnd() < 0.15;
    const discount = useCoupon ? Math.round(subtotal * 10) / 100 : 0;
    const total = Math.round((subtotal - discount + deliveryFee) * 100) / 100;
    const paymentMethod = rnd() < 0.6 ? "STRIPE_TEST" : "IN_NEGOZIO";
    const paymentStatus = cancelled
      ? "RIMBORSATO"
      : paymentMethod === "STRIPE_TEST"
        ? "PAGATO"
        : status === "CONSEGNATO" ? "PAGATO" : "IN_ATTESA";
    const nutrition = lines.reduce(
      (acc, l) => ({
        kcal: acc.kcal + l.macros.kcal,
        proteinG: acc.proteinG + l.macros.proteinG,
        fatG: acc.fatG + l.macros.fatG,
        carbG: acc.carbG + l.macros.carbG,
        fiberG: acc.fiberG + l.macros.fiberG,
      }),
      { kcal: 0, proteinG: 0, fatG: 0, carbG: 0, fiberG: 0 }
    );

    await db.order.create({
      data: {
        orderNumber: `SCH-2026${String(11).padStart(2, "0")}${String(Math.floor(rnd() * 28) + 1).padStart(2, "0")}-${randomBytes(3).toString("hex").toUpperCase()}`,
        customerId: customer
          ? (await db.customer.findUnique({ where: { email: customer.email } }))!.id
          : null,
        nameEnc: encryptField(customer ? customer.name : guest),
        emailEnc: encryptField(customer ? customer.email : `${guest!.toLowerCase().replace(/[^a-z]/g, ".")}@example.com`),
        phoneEnc: encryptField("+39 3xx xxx xxxx"),
        addressEnc: encryptField(fulfillment === "CONSEGNA" ? `Via ${pick(["Napoli", "Sassari", "Manno", "Paoli"], rnd)} ${10 + Math.floor(rnd() * 80)}, Cagliari` : null),
        fulfillment,
        zone,
        items: JSON.stringify(lines),
        subtotal,
        deliveryFee,
        discount,
        couponCode: useCoupon ? "BENVENUTO10" : null,
        total,
        paymentMethod,
        paymentStatus,
        status,
        nutritionSummary: JSON.stringify(nutrition),
        ipHash: sha256(`demo-${i}`).slice(0, 24),
        createdAt,
      },
    });
  }

  // -------------------------------------------------- ANALYTICS DEMO
  console.log("Analytics demo (GDPR-safe: IP anonimizzato, pseudonimi giornalieri)...");
  const paths: [string, number][] = [
    ["/", 0.30], ["/menu", 0.22], ["/piatto/pollo-mediterraneo", 0.05],
    ["/piatto/salmone-glassato-miso", 0.03], ["/piatto/bowl-di-quinoa", 0.03],
    ["/piatto/verde-pulito", 0.03], ["/piatto/frutti-di-bosco-proteico", 0.02],
    ["/ordina", 0.08], ["/nutrition", 0.05], ["/chi-siamo", 0.04],
    ["/locations", 0.04], ["/contatti", 0.03], ["/blog", 0.03], ["/faq", 0.02],
    ["/catering", 0.02], ["/cookie-policy", 0.01],
  ];
  const referrers: [string, number][] = [
    ["direct", 0.36], ["organic", 0.34], ["social", 0.16],
    ["referral: tripadvisor.it", 0.03], ["referral: thefork.it", 0.03], ["paid", 0.08],
  ];
  const devices: [string, number][] = [["mobile", 0.62], ["desktop", 0.33], ["tablet", 0.05]];
  const browsers: [string, number][] = [["Chrome", 0.54], ["Safari", 0.26], ["Firefox", 0.09], ["Edge", 0.08], ["Opera", 0.03]];
  const osList: [string, number][] = [["Android", 0.35], ["iOS", 0.27], ["Windows", 0.21], ["macOS", 0.13], ["Linux", 0.04]];
  const regions: [string, number][] = [
    ["Sardegna", 0.46], ["Lombardia", 0.11], ["Lazio", 0.08], ["Piemonte", 0.06],
    ["Emilia-Romagna", 0.05], ["Veneto", 0.05], ["Toscana", 0.04], ["Campania", 0.04],
    ["Sicilia", 0.03], ["Estero (aggregato)", 0.08],
  ];

  function weighted(pairs: [string, number][]): string {
    const total = pairs.reduce((s, [, w]) => s + w, 0);
    let r = rnd() * total;
    for (const [v, w] of pairs) {
      r -= w;
      if (r <= 0) return v;
    }
    return pairs[0][0];
  }

  const eventBatch: {
    type: string; path: string; visitorHash: string; referrer: string;
    device: string; browser: string; os: string; region: string; name: string | null; createdAt: Date;
  }[] = [];

  for (let d = 29; d >= 0; d--) {
    const date = new Date(Date.now() - d * 86400_000);
    const dow = date.getDay();
    const baseVisits = dow === 0 || dow === 6 ? 95 + Math.floor(rnd() * 35) : 60 + Math.floor(rnd() * 30);
    // crescita costante per rendere interessante il confronto periodi
    const growth = 1 + (29 - d) * 0.008;
    const visits = Math.round(baseVisits * growth);

    for (let v = 0; v < visits; v++) {
      const vh = randomBytes(16).toString("hex");
      const ref = weighted(referrers);
      const dev = weighted(devices);
      const brw = weighted(browsers);
      const os = weighted(osList);
      const reg = weighted(regions);
      const pagesCount = 1 + Math.floor(rnd() * 3.4);
      for (let p = 0; p < pagesCount; p++) {
        const path = weighted(paths);
        const at = new Date(date.getTime() + (8 + Math.floor(rnd() * 12)) * 3600_000 + Math.floor(rnd() * 3600_000));
        eventBatch.push({
          type: "pageview", path, visitorHash: vh, referrer: ref,
          device: dev, browser: brw, os, region: reg, name: null, createdAt: at,
        });
      }
      // eventi custom
      if (rnd() < 0.10) {
        eventBatch.push({
          type: "event", path: "/", visitorHash: vh, referrer: ref,
          device: dev, browser: brw, os, region: reg,
          name: pick(["cta_ordina", "download_app", "newsletter_signup", "share"], rnd),
          createdAt: new Date(date.getTime() + 12 * 3600_000),
        });
      }
    }
  }
  // inserimento a lotti (SQLite: max variabili per statement)
  for (let i = 0; i < eventBatch.length; i += 500) {
    await db.analyticsEvent.createMany({ data: eventBatch.slice(i, i + 500) });
  }
  console.log(`   ${eventBatch.length} eventi analytics (30 giorni)`);

  // Consensi demo (12 mesi retention): ~62% analytics ok, 22% rifiuto, 16% solo tecnici
  const consentBatch = [];
  for (let d = 29; d >= 0; d--) {
    const n = 8 + Math.floor(rnd() * 10);
    for (let c = 0; c < n; c++) {
      const r = rnd();
      const createdAt = new Date(Date.now() - d * 86400_000 - Math.floor(rnd() * 12) * 3600_000);
      consentBatch.push({
        visitorHash: randomBytes(16).toString("hex"),
        necessary: true,
        analytics: r < 0.62,
        marketing: r < 0.18,
        policyVersion: "1.0",
        createdAt,
        expiresAt: new Date(createdAt.getTime() + 365 * 86400_000),
      });
    }
  }
  for (let i = 0; i < consentBatch.length; i += 500) {
    await db.consentRecord.createMany({ data: consentBatch.slice(i, i + 500) });
  }
  console.log(`   ${consentBatch.length} registrazioni consenso`);

  // -------------------------------------------------- CATERING + CONTATTI
  await db.cateringRequest.create({
    data: {
      nameEnc: encryptField("Alessandra Pinna"),
      emailEnc: encryptField("alessandra.pinna@studiolegale.it"),
      phoneEnc: encryptField("+39 348 222 1199"),
      company: "Studio Legale Pinna & Partners",
      eventType: "ufficio",
      guests: 25,
      date: new Date(Date.now() + 12 * 86400_000).toISOString(),
      message: "Ciao, cerchiamo un catering salutare per un meeting aziendale di mezza giornata. Ci servono opzioni senza glutine per 4 persone. Potete inviarci un preventivo?",
      status: "NUOVA",
    },
  });
  await db.cateringRequest.create({
    data: {
      nameEnc: encryptField("Fabio Marras"),
      emailEnc: encryptField("fabio@marrasevents.it"),
      phoneEnc: encryptField("+39 339 876 5432"),
      company: "Marras Events",
      eventType: "evento",
      guests: 80,
      date: new Date(Date.now() + 30 * 86400_000).toISOString(),
      message: "Evento sportivo al Poetto a dicembre: 80 atleti, necessarie opzioni proteiche e vegetariane. Consegna prevista alle 12:30.",
      status: "CONTATTATA",
    },
  });
  await db.contactMessage.create({
    data: {
      name: "Valentina Sanna",
      email: "valentina.sanna@gmail.com",
      subject: "Complimenti!",
      message: "Ho scoperto La Schiscetta la settimana scorsa: complimenti per la chiarezza con cui indicate allergeni e valori nutrizionali. Quando aprite la consegna a Monserrato?",
      status: "NUOVA",
    },
  });

  // -------------------------------------------------- NEWSLETTER
  await db.newsletterSubscriber.create({
    data: {
      email: "francesco.todde@example.com",
      confirmToken: null,
      confirmedAt: new Date(Date.now() - 5 * 86400_000),
      unsubToken: randomBytes(18).toString("base64url"),
    },
  });

  console.log("Seed completato.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
