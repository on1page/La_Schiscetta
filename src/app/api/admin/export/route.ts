// =====================================================================
// GET /api/admin/export?dataset=ordini|pagamenti&format=xlsx|pdf&days=…
// Export ordini e pagamenti in formato XLSX o PDF (MANAGER+).
//
// Sicurezza:
// - sessione admin obbligatoria con RBAC MANAGER+ (OWASP A01);
// - rate limiting dedicato (OWASP A04);
// - ogni export decifra PII e viene registrato nell'audit log
//   immutabile con utente, IP e user agent (OWASP A09 / GDPR art. 30);
// - validazione stretta dei parametri query (whitelist).
// =====================================================================
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { guardRate } from "@/lib/api";
import {
  fetchOrderRows, fetchPaymentRows, summarize,
  buildXlsx, buildPdf,
  type Dataset, type ExportFormat,
} from "@/lib/reports";

const DATASETS: Dataset[] = ["ordini", "pagamenti"];
const FORMATS: ExportFormat[] = ["xlsx", "pdf"];
const DAYS_ALLOWED = ["all", "7", "30", "90", "365"] as const;

function periodLabel(days: number | "all"): string {
  if (days === "all") return "tutto lo storico";
  const from = new Date(Date.now() - days * 24 * 3600 * 1000);
  return `ultimi ${days} giorni (dal ${new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(from)})`;
}

export async function GET(req: Request) {
  // Rate limit: max 10 export ogni 5 minuti per IP
  const limited = guardRate(req, "export");
  if (limited) return limited;

  const session = await requireAdmin("MANAGER");
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Non autorizzato" }, { status: 401 });
  }

  // ---------- Validazione parametri (whitelist) ----------
  const url = new URL(req.url);
  const dataset = url.searchParams.get("dataset") as Dataset | null;
  const format = url.searchParams.get("format") as ExportFormat | null;
  const daysParam = url.searchParams.get("days") ?? "all";

  if (!dataset || !DATASETS.includes(dataset)) {
    return NextResponse.json(
      { error: "VALIDATION", message: "Parametro 'dataset' non valido (ordini|pagamenti)" },
      { status: 400 }
    );
  }
  if (!format || !FORMATS.includes(format)) {
    return NextResponse.json(
      { error: "VALIDATION", message: "Parametro 'format' non valido (xlsx|pdf)" },
      { status: 400 }
    );
  }
  if (!(DAYS_ALLOWED as readonly string[]).includes(daysParam)) {
    return NextResponse.json(
      { error: "VALIDATION", message: "Parametro 'days' non valido (all|7|30|90|365)" },
      { status: 400 }
    );
  }
  const days: number | "all" = daysParam === "all" ? "all" : parseInt(daysParam, 10);

  const period = periodLabel(days);
  const today = new Date().toISOString().slice(0, 10);
  const filename = `${dataset}-la-schiscetta-${today}.${format}`;

  try {
    let buffer: Buffer;

    if (dataset === "ordini") {
      const { rows, raw } = await fetchOrderRows(days);
      const s = summarize(raw);
      if (format === "xlsx") {
        buffer = buildXlsx([
          { name: "Ordini", rows },
          {
            name: "Riepilogo",
            rows: [
              { Indicatore: "Ordini nel periodo", Valore: s.count },
              { Indicatore: "Ordini validi (esclusi annullati)", Valore: s.count - s.annullati },
              { Indicatore: "Totale €", Valore: s.total },
              { Indicatore: "Incassato €", Valore: s.incassato },
              { Indicatore: "Rimborsato €", Valore: s.rimborsato },
              { Indicatore: "In attesa / fallito €", Valore: s.inAttesa },
              { Indicatore: "Valore medio ordine €", Valore: s.medio },
              { Indicatore: "Periodo", Valore: period },
            ],
          },
        ]);
      } else {
        // Nel PDF il prefisso "Consegna · " è ridondante (la colonna si
        // chiama già così) e ruba spazio: si mostra solo la zona.
        const pdfRows = rows.map((r) => ({
          ...r,
          "Consegna": r["Consegna"].replace(/^Consegna · /, ""),
        }));
        buffer = await buildPdf({
          title: "Report ordini",
          subtitle: "Elenco completo degli ordini con stato, consegna e pagamenti",
          generatedBy: session.user.username,
          period,
          orientation: "landscape",
          summary: [
            { label: "Ordini", value: String(s.count) },
            { label: "Valore totale", value: fmtEur(s.total) },
            { label: "Incassato", value: fmtEur(s.incassato) },
            { label: "Rimborsato", value: fmtEur(s.rimborsato) },
            { label: "Medio", value: fmtEur(s.medio) },
          ],
          columns: [
            { header: "Numero", key: "Numero ordine", width: 105 },
            { header: "Data", key: "Data", width: 80 },
            { header: "Cliente", key: "Cliente", width: 118 },
            { header: "Consegna", key: "Consegna", width: 108 },
            { header: "Articoli", key: "Articoli", width: 44, align: "right" },
            { header: "Sconto", key: "Sconto €", width: 58, align: "right" },
            { header: "Totale", key: "Totale €", width: 68, align: "right" },
            { header: "Stato", key: "Stato ordine", width: 80 },
            { header: "Pagamento", key: "Stato pagamento", width: 73 },
          ],
          rows: pdfRows as unknown as Record<string, string | number>[],
        });
      }
    } else {
      const [rows, { raw }] = await Promise.all([fetchPaymentRows(days), fetchOrderRows(days)]);
      const s = summarize(raw);
      if (format === "xlsx") {
        buffer = buildXlsx([
          { name: "Pagamenti", rows },
          {
            name: "Riepilogo",
            rows: [
              { Indicatore: "Movimenti nel periodo", Valore: s.count },
              { Indicatore: "Incassato €", Valore: s.incassato },
              { Indicatore: "Rimborsato €", Valore: s.rimborsato },
              { Indicatore: "In attesa / fallito €", Valore: s.inAttesa },
              { Indicatore: "Valore medio ordine €", Valore: s.medio },
              { Indicatore: "Periodo", Valore: period },
            ],
          },
        ]);
      } else {
        buffer = await buildPdf({
          title: "Report pagamenti",
          subtitle: "Registro movimenti: incassi, rimborsi e stati di pagamento",
          generatedBy: session.user.username,
          period,
          orientation: "landscape",
          summary: [
            { label: "Movimenti", value: String(s.count) },
            { label: "Incassato", value: fmtEur(s.incassato) },
            { label: "Rimborsato", value: fmtEur(s.rimborsato) },
            { label: "In attesa", value: fmtEur(s.inAttesa) },
          ],
          columns: [
            { header: "Numero", key: "Numero ordine", width: 105 },
            { header: "Data", key: "Data", width: 78 },
            { header: "Cliente", key: "Cliente", width: 120 },
            { header: "Metodo", key: "Metodo", width: 90 },
            { header: "Stato", key: "Stato", width: 72 },
            { header: "Sconto", key: "Sconto €", width: 58, align: "right" },
            { header: "Totale", key: "Totale €", width: 68, align: "right" },
            { header: "Incassato", key: "Incassato €", width: 68, align: "right" },
            { header: "Rimborsato", key: "Rimborsato €", width: 68, align: "right" },
          ],
          rows: rows as unknown as Record<string, string | number>[],
        });
      }
    }

    // Audit: l'export decifra PII, quindi va tracciato (GDPR art. 30)
    await audit(req, {
      actorId: session.user.id,
      actorName: session.user.username,
      action: "EXPORT",
      entity: dataset === "ordini" ? "Order" : "Payment",
      after: { dataset, format, days: daysParam, bytes: buffer.length },
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[export] errore generazione:", err);
    return NextResponse.json(
      { error: "EXPORT_FAILED", message: "Generazione del file non riuscita" },
      { status: 500 }
    );
  }
}

function fmtEur(v: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency", currency: "EUR",
  }).format(v);
}
