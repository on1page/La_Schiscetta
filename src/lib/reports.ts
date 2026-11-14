// =====================================================================
// reports.ts - Export dati ordini e pagamenti in formato XLSX e PDF
// per l'area amministrativa (La Schiscetta).
//
// Sicurezza/GDPR:
// - i PII vengono decifrati solo all'atto dell'export, su richiesta
//   di un MANAGER+ autenticato (la route registra l'audit log);
// - i documenti sono da considerarsi interni e riservati.
// =====================================================================
import { db } from "./db";
import { decryptField } from "./security";
import type { Order } from "@prisma/client";

// ----------------------------- Etichette -----------------------------

export const ORDER_STATUS_LABEL: Record<string, string> = {
  RICEVUTO: "Ricevuto",
  IN_PREPARAZIONE: "In preparazione",
  PRONTO: "Pronto",
  CONSEGNATO: "Consegnato",
  ANNULLATO: "Annullato",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  IN_ATTESA: "In attesa",
  PAGATO: "Pagato",
  RIMBORSATO: "Rimborsato",
  FALLITO: "Fallito",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  STRIPE_TEST: "Carta (Stripe test)",
  IN_NEGOZIO: "In negozio",
};

// ------------------------------ Dataset ------------------------------

export type OrderRow = {
  "Numero ordine": string;
  "Data": string;
  "Cliente": string;
  "Email": string;
  "Telefono": string;
  "Consegna": string;
  "Indirizzo": string;
  "Articoli": number;
  "Subtotale €": number;
  "Sconto €": number;
  "Coupon": string;
  "Spese consegna €": number;
  "Totale €": number;
  "Stato ordine": string;
  "Metodo pagamento": string;
  "Stato pagamento": string;
};

export type PaymentRow = {
  "Numero ordine": string;
  "Data": string;
  "Cliente": string;
  "Email": string;
  "Metodo": string;
  "Stato": string;
  "Subtotale €": number;
  "Sconto €": number;
  "Spese consegna €": number;
  "Totale €": number;
  "Incassato €": number;
  "Rimborsato €": number;
};

export type Dataset = "ordini" | "pagamenti";
export type ExportFormat = "xlsx" | "pdf";

function fmtDateTime(d: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
}

function countItems(order: Order): number {
  try {
    const items = JSON.parse(order.items) as unknown[];
    return Array.isArray(items) ? items.length : 0;
  } catch {
    return 0;
  }
}

export async function fetchOrderRows(days: number | "all"): Promise<{ rows: OrderRow[]; raw: Order[] }> {
  const since =
    days === "all"
      ? undefined
      : { gte: new Date(Date.now() - days * 24 * 3600 * 1000) };
  const orders = await db.order.findMany({
    where: since ? { createdAt: since } : undefined,
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  const rows: OrderRow[] = orders.map((o) => ({
    "Numero ordine": o.orderNumber,
    "Data": fmtDateTime(o.createdAt),
    "Cliente": decryptField(o.nameEnc) || "—",
    "Email": decryptField(o.emailEnc) || "—",
    "Telefono": decryptField(o.phoneEnc) || "—",
    "Consegna": o.fulfillment === "RITIRO" ? "Ritiro in negozio" : `Consegna · ${o.zone ?? "—"}`,
    "Indirizzo": decryptField(o.addressEnc) || "—",
    "Articoli": countItems(o),
    "Subtotale €": o.subtotal,
    "Sconto €": o.discount,
    "Coupon": o.couponCode ?? "—",
    "Spese consegna €": o.deliveryFee,
    "Totale €": o.total,
    "Stato ordine": ORDER_STATUS_LABEL[o.status] ?? o.status,
    "Metodo pagamento": PAYMENT_METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod,
    "Stato pagamento": PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus,
  }));
  return { rows, raw: orders };
}

export async function fetchPaymentRows(days: number | "all"): Promise<PaymentRow[]> {
  const { raw } = await fetchOrderRows(days);
  return raw.map((o) => ({
    "Numero ordine": o.orderNumber,
    "Data": fmtDateTime(o.createdAt),
    "Cliente": decryptField(o.nameEnc) || "—",
    "Email": decryptField(o.emailEnc) || "—",
    "Metodo": PAYMENT_METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod,
    "Stato": PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus,
    "Subtotale €": o.subtotal,
    "Sconto €": o.discount,
    "Spese consegna €": o.deliveryFee,
    "Totale €": o.total,
    "Incassato €": o.paymentStatus === "PAGATO" ? o.total : 0,
    "Rimborsato €": o.paymentStatus === "RIMBORSATO" ? o.total : 0,
  }));
}

// --------------------------- Riepiloghi ------------------------------

export type Summary = {
  count: number;
  total: number;
  incassato: number;
  rimborsato: number;
  inAttesa: number;
  annullati: number;
  medio: number;
};

export function summarize(raw: Order[]): Summary {
  const validi = raw.filter((o) => o.status !== "ANNULLATO");
  const total = validi.reduce((s, o) => s + o.total, 0);
  const incassato = validi
    .filter((o) => o.paymentStatus === "PAGATO")
    .reduce((s, o) => s + o.total, 0);
  const rimborsato = raw
    .filter((o) => o.paymentStatus === "RIMBORSATO")
    .reduce((s, o) => s + o.total, 0);
  const inAttesa = validi
    .filter((o) => o.paymentStatus === "IN_ATTESA" || o.paymentStatus === "FALLITO")
    .reduce((s, o) => s + o.total, 0);
  return {
    count: raw.length,
    total: Math.round(total * 100) / 100,
    incassato: Math.round(incassato * 100) / 100,
    rimborsato: Math.round(rimborsato * 100) / 100,
    inAttesa: Math.round(inAttesa * 100) / 100,
    annullati: raw.length - validi.length,
    medio: validi.length ? Math.round((total / validi.length) * 100) / 100 : 0,
  };
}

// ------------------------------- XLSX --------------------------------

export function buildXlsx(
  sheets: { name: string; rows: Record<string, unknown>[] }[]
): Buffer {
  // Import dinamico: carica SheetJS solo lato server su richiesta
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require("xlsx") as typeof import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows.length ? sheet.rows : [{}]);
    // larghezze colonna basate sulla chiave più lunga / contenuto
    const keys = sheet.rows.length ? Object.keys(sheet.rows[0]) : [];
    ws["!cols"] = keys.map((k) => {
      const maxLen = Math.max(
        k.length,
        ...sheet.rows.slice(0, 200).map((r) => String(r[k] ?? "").length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 42) };
    });
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// -------------------------------- PDF --------------------------------

type PdfTableCol = { header: string; key: string; width: number; align?: "left" | "right" };

const BRAND = {
  green: "#3F5A36",
  gold: "#B07D2B",
  ink: "#1F2419",
  muted: "#6B7280",
  zebra: "#F4F2EC",
  line: "#D8D4C8",
};

// pdfkit emette i chunk in modo asincrono: la funzione restituisce una
// Promise risolta a fine stream, con il buffer PDF completo.
export function buildPdf(opts: {
  title: string;
  subtitle: string;
  generatedBy: string;
  period: string;
  summary: { label: string; value: string }[];
  columns: PdfTableCol[];
  rows: Record<string, string | number>[];
  orientation?: "portrait" | "landscape";
}): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
  // Import dinamico: pdfkit solo lato server
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFDocument = require("pdfkit") as typeof import("pdfkit");
  const doc = new PDFDocument({
    size: "A4",
    layout: opts.orientation ?? "portrait",
    margins: { top: 56, bottom: 64, left: 40, right: 40 },
    info: {
      Title: opts.title,
      Author: "La Schiscetta S.r.l.",
      Subject: opts.subtitle,
      Creator: "Gestionale La Schiscetta",
    },
    bufferPages: true,
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  doc.on("end", () => resolve(Buffer.concat(chunks)));
  doc.on("error", reject);

  const pageWidth = doc.page.width;
  const left = doc.page.margins.left;
  const contentWidth = pageWidth - left - doc.page.margins.right;

  // ---------- Intestazione ----------
  doc.rect(0, 0, pageWidth, 92).fill(BRAND.green);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(19)
    .text("LA SCHISCETTA", left, 26, { continued: false });
  doc.font("Helvetica").fontSize(9.5).fillColor("#E8E3D5")
    .text("Nutrizione di Precisione · Via Roma 100, 09124 Cagliari · gestionale interno", left, 50);
  doc.fontSize(14).font("Helvetica-Bold").fillColor("#FFFFFF")
    .text(opts.title, left, 68);

  // ---------- Meta + riepilogo ----------
  let y = 116;
  doc.fillColor(BRAND.muted).font("Helvetica").fontSize(8.5)
    .text(`${opts.subtitle}  ·  Periodo: ${opts.period}`, left, y);
  doc.text(
    `Generato il ${new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeStyle: "short" }).format(new Date())} da ${opts.generatedBy}`,
    left, y + 12
  );

  // card riepilogo
  const cardW = (contentWidth - (opts.summary.length - 1) * 8) / opts.summary.length;
  y += 34;
  opts.summary.forEach((s, i) => {
    const x = left + i * (cardW + 8);
    doc.roundedRect(x, y, cardW, 46, 5).fillAndStroke(BRAND.zebra, BRAND.line);
    doc.fillColor(BRAND.muted).font("Helvetica").fontSize(7)
      .text(s.label.toUpperCase(), x + 8, y + 9, { width: cardW - 16 });
    doc.fillColor(BRAND.ink).font("Helvetica-Bold").fontSize(s.value.length > 12 ? 11 : 13)
      .text(s.value, x + 8, y + 22, { width: cardW - 16 });
  });

  // ---------- Tabella ----------
  y += 62;
  const drawHeader = () => {
    let x = left;
    doc.rect(left, y, contentWidth, 22).fill(BRAND.green);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(7.5);
    for (const col of opts.columns) {
      doc.text(col.header, x + 6, y + 7, {
        width: col.width - 12,
        align: col.align ?? "left",
      });
      x += col.width;
    }
    y += 22;
  };

  drawHeader();
  doc.font("Helvetica").fontSize(7.5);

  const rowH = 18;
  let zebra = false;
  for (const row of opts.rows) {
    if (y + rowH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeader();
      doc.font("Helvetica").fontSize(7.5);
    }
    if (zebra) {
      doc.rect(left, y, contentWidth, rowH).fill(BRAND.zebra);
    }
    let x = left;
    doc.fillColor(BRAND.ink);
    for (const col of opts.columns) {
      const v = row[col.key];
      // solo le colonne monetarie (chiave con "€") sono formattate in euro;
      // gli altri numeri (es. numero articoli) restano numeri semplici
      const isMoney = typeof v === "number" && /€/.test(col.key);
      const text =
        typeof v === "number"
          ? isMoney
            ? new Intl.NumberFormat("it-IT", {
                style: "currency", currency: "EUR",
                minimumFractionDigits: 2,
              }).format(v)
            : new Intl.NumberFormat("it-IT").format(v)
          : String(v ?? "");
      doc.text(text, x + 6, y + 5, {
        width: col.width - 12,
        align: col.align ?? "left",
        ellipsis: true, height: rowH - 8, lineBreak: false,
      });
      x += col.width;
    }
    y += rowH;
    zebra = !zebra;
  }

  if (opts.rows.length === 0) {
    doc.fillColor(BRAND.muted).fontSize(9.5)
      .text("Nessun dato nel periodo selezionato.", left, y + 14);
  }

  // ---------- Piè di pagina su tutte le pagine ----------
  // Il footer viene disegnato nella fascia sotto il margine inferiore:
  // azzeriamo temporaneamente margins.bottom, altrimenti pdfkit
  // aggiunge una pagina fantasma per ogni testo sotto il margine.
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const bottom = doc.page.height - 42;
    doc.moveTo(left, bottom).lineTo(pageWidth - doc.page.margins.right, bottom)
      .strokeColor(BRAND.line).lineWidth(0.75).stroke();
    doc.fillColor(BRAND.muted).font("Helvetica").fontSize(6.5)
      .text(
        "Documento interno — La Schiscetta · contiene dati personali (GDPR UE 2016/679): uso e conservazione secondo policy interna.",
        left, bottom + 8, { width: contentWidth - 110, lineBreak: false, ellipsis: true }
      );
    doc.text(
      `Pagina ${i - range.start + 1} di ${range.count}`,
      pageWidth - doc.page.margins.right - 100, bottom + 8,
      { width: 100, align: "right", lineBreak: false }
    );
    doc.page.margins.bottom = savedBottom;
  }

  doc.end();
  });
}
