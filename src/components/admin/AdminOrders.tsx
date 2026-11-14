// =====================================================================
// AdminOrders.tsx - Gestione ordini: filtri, dettaglio, cambio stato,
// rimborso simulato. AdminClients.tsx - anagrafica con segmentazione
// e strumenti GDPR (export/cancellazione).
// =====================================================================
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/client-api";
import { ORDER_STATUSES, formatEUR } from "@/lib/constants";
import type { OrderDTO } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { Loader2, Search, RotateCcw, Download, Trash2, Eye, Phone, Mail } from "lucide-react";

type AdminOrder = OrderDTO & {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  address: string | null;
  zone: string | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  couponCode: string | null;
  paymentMethod: string;
};

// ------------------------------ ORDINI ------------------------------

export function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ orders: AdminOrder[] }>(
        `/api/admin/orders?status=${status}${query ? `&q=${encodeURIComponent(query)}` : ""}`
      );
      setOrders(res.orders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
     
  }, [status]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q
      ? orders.filter(
          (o) =>
            o.orderNumber.toLowerCase().includes(q) ||
            o.customerName?.toLowerCase().includes(q) ||
            o.customerEmail?.toLowerCase().includes(q)
        )
      : orders;
  }, [orders, query]);

  const nextStatuses: Record<string, string[]> = {
    RICEVUTO: ["IN_PREPARAZIONE", "ANNULLATO"],
    IN_PREPARAZIONE: ["PRONTO", "ANNULLATO"],
    PRONTO: ["CONSEGNATO", "ANNULLATO"],
    CONSEGNATO: [],
    ANNULLATO: [],
  };

  const updateOrder = async (order: AdminOrder, patch: Record<string, unknown>, msg: string) => {
    setBusy(true);
    try {
      await api.patch(`/api/admin/orders/${order.id}`, patch);
      toast({ title: msg });
      setSelected(null);
      await load();
    } catch (err) {
      toast({ title: "Operazione non riuscita", description: err instanceof ApiError ? err.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ordini</h1>
        <p className="text-sm text-muted-foreground">
          {orders.length} ordini · transizioni di stato validate · rimborsi tracciati nell'audit log
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="thin-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1">
          <button
            onClick={() => setStatus("ALL")}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${status === "ALL" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"}`}
          >
            Tutti ({orders.length})
          </button>
          {ORDER_STATUSES.map((s) => (
            <button
              key={s.code}
              onClick={() => setStatus(s.code)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${status === s.code ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"}`}
            >
              {s.it}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="N. ordine, nome, email..." className="h-9 pl-9" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Ordine</th>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Consegna</th>
              <th className="px-4 py-3 font-semibold">Totale</th>
              <th className="px-4 py-3 font-semibold">Stato</th>
              <th className="px-4 py-3 font-semibold">Pagamento</th>
              <th className="px-4 py-3 text-right font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" aria-hidden /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Nessun ordine</td></tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <p className="font-data font-semibold">{o.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{o.customerName}</p>
                    <p className="text-xs text-muted-foreground">{o.customerEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {o.fulfillment === "RITIRO" ? "Ritiro" : o.zone}
                  </td>
                  <td className="font-data px-4 py-3 font-bold">{formatEUR(o.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      o.status === "CONSEGNATO" ? "bg-emerald-100 text-emerald-800"
                      : o.status === "ANNULLATO" ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-800"
                    }`}>
                      {o.status.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${
                      o.paymentStatus === "PAGATO" ? "text-emerald-700"
                      : o.paymentStatus === "RIMBORSATO" ? "text-red-600"
                      : "text-muted-foreground"
                    }`}>
                      {o.paymentStatus.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(o)} aria-label={`Dettaglio ${o.orderNumber}`}>
                      <Eye className="h-4 w-4" aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="thin-scroll max-h-[92vh] max-w-xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-data">{selected.orderNumber}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="font-semibold">{selected.customerName}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3.5 w-3.5" aria-hidden />{selected.customerEmail}</p>
                  {selected.customerPhone && <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" aria-hidden />{selected.customerPhone}</p>}
                  {selected.address && <p className="mt-1 text-muted-foreground">{selected.address} · {selected.zone}</p>}
                </div>

                <ul className="space-y-1.5">
                  {selected.items.map((line, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span>{line.nameIt} · {line.weightG} g{line.addIns?.length ? ` (+${line.addIns.map((a) => a.nameIt).join(", ")})` : ""}</span>
                      <span className="font-data">{formatEUR(line.lineTotal)}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-1 border-t border-border pt-3">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotale</span><span className="font-data">{formatEUR(selected.subtotal)}</span></div>
                  {selected.discount > 0 && <div className="flex justify-between text-emerald-700"><span>{selected.couponCode}</span><span className="font-data">-{formatEUR(selected.discount)}</span></div>}
                  {selected.deliveryFee > 0 && <div className="flex justify-between text-muted-foreground"><span>Consegna</span><span className="font-data">{formatEUR(selected.deliveryFee)}</span></div>}
                  <div className="flex justify-between font-bold"><span>Totale</span><span className="font-data">{formatEUR(selected.total)}</span></div>
                </div>

                <div className="font-data grid grid-cols-5 gap-2 rounded-lg border border-border p-3 text-center text-xs">
                  <div><b>{selected.nutrition?.kcal ?? 0}</b><span className="block text-[10px] text-muted-foreground">kcal</span></div>
                  <div><b>{selected.nutrition?.proteinG ?? 0}</b><span className="block text-[10px] text-muted-foreground">P g</span></div>
                  <div><b>{selected.nutrition?.fatG ?? 0}</b><span className="block text-[10px] text-muted-foreground">G g</span></div>
                  <div><b>{selected.nutrition?.carbG ?? 0}</b><span className="block text-[10px] text-muted-foreground">C g</span></div>
                  <div><b>{selected.nutrition?.fiberG ?? 0}</b><span className="block text-[10px] text-muted-foreground">F g</span></div>
                </div>

                {selected.status !== "ANNULLATO" && selected.status !== "CONSEGNATO" && (
                  <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                    {nextStatuses[selected.status]?.map((next) => (
                      <Button
                        key={next}
                        size="sm"
                        variant={next === "ANNULLATO" ? "destructive" : "default"}
                        disabled={busy}
                        onClick={() => updateOrder(selected, { status: next }, `Stato aggiornato: ${next}`)}
                      >
                        {next.replace(/_/g, " ").toLowerCase()}
                      </Button>
                    ))}
                    {selected.paymentStatus === "PAGATO" && (
                      <Button
                        size="sm" variant="outline" className="gap-1.5" disabled={busy}
                        onClick={() => updateOrder(selected, { refund: true }, "Rimborso simulato registrato")}
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Rimborso
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------------------------------ CLIENTI ------------------------------

type AdminClient = {
  id: string; email: string; name: string | null; phone: string | null;
  goal: string | null; createdAt: string; ordersCount: number;
  totalSpend: number; lastOrder: string | null; segment: string;
};

const SEGMENT_STYLE: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-800",
  ATTIVO: "bg-emerald-100 text-emerald-800",
  NUOVO: "bg-sky-100 text-sky-800",
  INATTIVO: "bg-stone-200 text-stone-600",
};

export function AdminClients() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ clients: AdminClient[] }>("/api/admin/clients");
      setClients(res.clients);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const exportClient = async (client: AdminClient) => {
    try {
      const res = await fetch(`/api/admin/clients/${client.id}/export`, {
        headers: { "X-CSRF-Token": document.cookie.match(/sch_csrf=([^;]*)/)?.[1] ?? "" },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cliente-${client.id.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export GDPR completato" });
    } catch {
      toast({ title: "Export non riuscito", variant: "destructive" });
    }
  };

  const deleteClient = async (client: AdminClient) => {
    if (!window.confirm(`Cancellare definitivamente ${client.email} e tutti i suoi ordini (GDPR art. 17)?`)) return;
    try {
      await api.delete(`/api/admin/clients/${client.id}`);
      toast({ title: "Cliente cancellato", description: "Operazione registrata nell'audit log" });
      await load();
    } catch (err) {
      toast({ title: "Cancellazione non riuscita", description: err instanceof ApiError ? err.message : "", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clienti</h1>
        <p className="text-sm text-muted-foreground">
          {clients.length} registrati · segmentazione automatica · PII cifrato AES-256-GCM a riposo
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Segmento</th>
              <th className="px-4 py-3 font-semibold">Ordini</th>
              <th className="px-4 py-3 font-semibold">Spesa totale</th>
              <th className="px-4 py-3 font-semibold">Obiettivo</th>
              <th className="px-4 py-3 font-semibold">Registrato</th>
              <th className="px-4 py-3 text-right font-semibold">GDPR</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" aria-hidden /></td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Nessun cliente registrato</td></tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{c.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${SEGMENT_STYLE[c.segment] ?? ""}`}>
                      {c.segment}
                    </span>
                  </td>
                  <td className="font-data px-4 py-3">{c.ordersCount}</td>
                  <td className="font-data px-4 py-3 font-bold">{formatEUR(c.totalSpend)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.goal ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("it-IT")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportClient(c)} aria-label={`Export dati ${c.email}`}>
                        <Download className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteClient(c)} aria-label={`Cancella ${c.email}`}>
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
