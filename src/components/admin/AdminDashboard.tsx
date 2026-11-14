// =====================================================================
// AdminDashboard.tsx - Panoramica gestionale + analytics GDPR-safe
// (spec 4.6): visite, sorgenti, pagine, funnel, dispositivi, regioni,
// eventi custom, confronto periodi, consensi cookie.
// =====================================================================
"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/client-api";
import { formatEUR } from "@/lib/constants";
import {
  Users, ClipboardList, Euro, TrendingUp, TrendingDown, Cookie,
  Loader2, RefreshCw,
} from "lucide-react";

type DashboardData = {
  kpi: {
    ordersTotal: number; ordersToday: number; revenue: number; avgTicket: number;
    menuCount: number; subscribers: number; visits: number; visitsDelta: number | null;
  };
  topItems: { name: string; qty: number; revenue: number }[];
  daily: { date: string; visite: number; pagine: number }[];
  sources: { name: string; value: number }[];
  pages: { name: string; value: number }[];
  devices: { name: string; value: number }[];
  browsers: { name: string; value: number }[];
  os: { name: string; value: number }[];
  regions: { name: string; value: number }[];
  customEvents: { name: string; value: number }[];
  funnel: { step: string; value: number }[];
  consentStats: { total: number; analytics: number; marketing: number; rejected: number };
  recentOrders: { orderNumber: string; createdAt: string; status: string; paymentStatus: string; total: number; fulfillment: string }[];
};

const COLORS = ["oklch(0.52 0.09 148)", "oklch(0.655 0.145 42)", "oklch(0.78 0.115 85)", "oklch(0.62 0.06 160)", "oklch(0.48 0.12 30)", "oklch(0.6 0.02 120)"];

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = async (d = days) => {
    setLoading(true);
    try {
      const res = await api.get<DashboardData>(`/api/admin/dashboard?days=${d}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(days);
     
  }, [days]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }
  if (!data) return null;

  const k = data.kpi;
  const kpis = [
    { label: "Ordini (periodo)", value: String(k.ordersTotal), sub: `${k.ordersToday} oggi`, icon: ClipboardList },
    { label: "Ricavi (periodo)", value: formatEUR(k.revenue), sub: `ticket medio ${formatEUR(k.avgTicket)}`, icon: Euro },
    { label: "Visite (analytics)", value: String(k.visits), sub: k.visitsDelta === null ? "nessun confronto" : `${k.visitsDelta >= 0 ? "+" : ""}${k.visitsDelta}% vs periodo prec.`, icon: Users, trend: k.visitsDelta },
    { label: "Voci menu attive", value: String(k.menuCount), sub: `${k.subscribers} iscritti newsletter`, icon: TrendingUp },
  ];

  const funnelMax = Math.max(...data.funnel.map((f) => f.value), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panoramica</h1>
          <p className="text-sm text-muted-foreground">
            Dati analytics raccolti solo previo consenso opt-in · IP anonimizzati · retention 24 mesi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            aria-label="Periodo"
          >
            <option value={7}>Ultimi 7 giorni</option>
            <option value={30}>Ultimi 30 giorni</option>
            <option value={90}>Ultimi 90 giorni</option>
          </select>
          <button
            onClick={() => load()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-input hover:bg-secondary"
            aria-label="Ricarica"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
                <kpi.icon className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <p className="font-data mt-2 text-2xl font-bold">{kpi.value}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                {typeof kpi.trend === "number" && kpi.trend !== 0 && (
                  kpi.trend > 0
                    ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                    : <TrendingDown className="h-3.5 w-3.5 text-red-500" aria-hidden />
                )}
                {kpi.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visite + sorgenti */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Visite e pagine viste</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5c7a4b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#5c7a4b" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gPages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c9703f" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#c9703f" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,35,26,0.08)" />
                <XAxis
                  dataKey="date" tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(8, 10) + "/" + v.slice(5, 7)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid rgba(31,35,26,0.1)", fontSize: 13 }}
                  labelFormatter={(v: string) => ` ${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}`}
                />
                <Area type="monotone" dataKey="pagine" stroke="#c9703f" fill="url(#gPages)" strokeWidth={2} name="Pagine" />
                <Area type="monotone" dataKey="visite" stroke="#5c7a4b" fill="url(#gVisits)" strokeWidth={2.5} name="Visite" />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Sorgenti di traffico</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.sources.slice(0, 6)} dataKey="value" nameKey="name"
                  innerRadius={55} outerRadius={90} paddingAngle={2}
                >
                  {data.sources.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Funnel + dispositivi */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Funnel di conversione</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.funnel.map((f, i) => {
                const prev = i > 0 ? data.funnel[i - 1].value : null;
                const conv = prev ? Math.round((f.value / prev) * 100) : null;
                return (
                  <div key={f.step}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{f.step}</span>
                      <span className="font-data font-bold">
                        {f.value}
                        {conv !== null && <span className="ml-2 text-xs font-normal text-muted-foreground">({conv}%)</span>}
                      </span>
                    </div>
                    <div className="h-7 overflow-hidden rounded-lg bg-secondary">
                      <div
                        className="flex h-full items-center justify-end rounded-lg bg-[oklch(0.52_0.09_148)] pr-2 text-[11px] font-bold text-white transition-all"
                        style={{ width: `${Math.max(6, (f.value / funnelMax) * 100)}%`, opacity: 1 - i * 0.13 }}
                      >
                        {f.value > 0 && `${Math.round((f.value / funnelMax) * 100)}%`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Dispositivi</CardTitle></CardHeader>
          <CardContent className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.devices} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {data.devices.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pagine top + regioni */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Pagine più viste</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.pages.slice(0, 8)} layout="vertical" margin={{ left: 30, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,35,26,0.08)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} />
                <Bar dataKey="value" fill="#5c7a4b" radius={[0, 6, 6, 0]} name="View" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Localizzazione per regione</CardTitle>
            <p className="text-xs text-muted-foreground">Livello regione (mai città), dati aggregati</p>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.regions.slice(0, 8)} margin={{ left: -18, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,35,26,0.08)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-24} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} />
                <Bar dataKey="value" fill="#c9703f" radius={[6, 6, 0, 0]} name="Eventi" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Consensi + eventi + top items + ordini recenti */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cookie className="h-4 w-4 text-primary" aria-hidden /> Consensi cookie (periodo)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Banner mostrati (regstri consenso)", value: data.consentStats.total, cls: "bg-secondary" },
              { label: "Analytics accettato", value: data.consentStats.analytics, cls: "bg-emerald-100" },
              { label: "Marketing accettato", value: data.consentStats.marketing, cls: "bg-amber-100" },
              { label: "Rifiuto totale", value: data.consentStats.rejected, cls: "bg-stone-200" },
            ].map((row) => {
              const pct = data.consentStats.total ? Math.round((row.value / data.consentStats.total) * 100) : 0;
              return (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-data font-bold">{row.value} ({pct}%)</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className={`h-full rounded-full ${row.cls}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="pt-1 text-xs text-muted-foreground">
              Registro conservato 12 mesi (Provvedimento Garante 231/2021)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Eventi personalizzati</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {data.customEvents.length === 0 && <p className="text-sm text-muted-foreground">Nessun evento nel periodo.</p>}
            {data.customEvents.map((e, i) => (
              <div key={e.name} className="rounded-xl border border-border p-3">
                <p className="font-data text-xl font-bold">{e.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{e.name.replace(/_/g, " ")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top piatti per ricavi</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-2.5">
              {data.topItems.map((item, i) => (
                <li key={item.name} className="flex items-center gap-3">
                  <span className="font-data flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">{item.name}</span>
                  <span className="font-data text-sm font-bold">{formatEUR(item.revenue)}</span>
                </li>
              ))}
              {data.topItems.length === 0 && <p className="text-sm text-muted-foreground">Nessun ordine nel periodo.</p>}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Ordini recenti</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {data.recentOrders.map((o) => (
                <li key={o.orderNumber} className="flex items-center gap-3 text-sm">
                  <span className="font-data font-semibold">{o.orderNumber.slice(-4)}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    o.status === "CONSEGNATO" ? "bg-emerald-100 text-emerald-800"
                    : o.status === "ANNULLATO" ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-800"
                  }`}>
                    {o.status.replace(/_/g, " ").toLowerCase()}
                  </span>
                  <span className="font-data ml-auto font-bold">{formatEUR(o.total)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
