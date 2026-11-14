// =====================================================================
// AdminApp.tsx - Layout area amministrativa: sidebar, heartbeat sessione
// (rinnovo scorrevole 30 min), routing sezioni, RBAC sui menu.
// =====================================================================
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAdmin, useRoute, type Route } from "@/lib/store";
import { api } from "@/lib/client-api";
import { AdminDashboard } from "./AdminDashboard";
import { AdminMenu } from "./AdminMenu";
import { AdminOrders, AdminClients } from "./AdminOrders";
import { AdminCompany } from "./AdminCompany";
import { AdminPolicy } from "./AdminPolicy";
import { AdminAudit, AdminCatering, AdminSettings } from "./AdminMisc";
import {
  LayoutDashboard, Utensils, ClipboardList, Users, Building2,
  FileText, ScrollText, PartyPopper, Settings, ExternalLink, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { key: undefined, label: "Panoramica", icon: LayoutDashboard, minRole: "MANAGER" },
  { key: "menu", label: "Menu e allergeni", icon: Utensils, minRole: "MANAGER" },
  { key: "ordini", label: "Ordini", icon: ClipboardList, minRole: "MANAGER" },
  { key: "clienti", label: "Clienti", icon: Users, minRole: "MANAGER" },
  { key: "catering", label: "Catering e messaggi", icon: PartyPopper, minRole: "MANAGER" },
  { key: "azienda", label: "Azienda", icon: Building2, minRole: "SUPERADMIN" },
  { key: "policy", label: "Policy e cookie", icon: FileText, minRole: "MANAGER" },
  { key: "audit", label: "Audit log", icon: ScrollText, minRole: "MANAGER" },
  { key: "impostazioni", label: "Impostazioni", icon: Settings, minRole: "VIEWER" },
];

const ROLE_RANK: Record<string, number> = { SUPERADMIN: 4, MANAGER: 3, EDITOR: 2, VIEWER: 1 };

export function AdminApp({ section }: { section?: string }) {
  const { user, refresh, setUser } = useAdmin();
  const navigate = useRoute((s) => s.navigate);

  // Heartbeat: rinnovo scorrevole della sessione (30 min inattività)
  useEffect(() => {
    const beat = setInterval(() => {
      api.get("/api/admin/session").catch(() => {
        setUser(null);
      });
    }, 10 * 60 * 1000);
    return () => clearInterval(beat);
  }, [setUser]);

  const logout = async () => {
    await api.post("/api/admin/logout").catch(() => undefined);
    setUser(null);
    navigate("/admin");
  };

  const role = user?.role ?? "VIEWER";
  const visible = SECTIONS.filter((s) => (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[s.minRole] ?? 4));

  const renderSection = () => {
    switch (section) {
      case "menu": return <AdminMenu />;
      case "ordini": return <AdminOrders />;
      case "clienti": return <AdminClients />;
      case "catering": return <AdminCatering />;
      case "azienda": return <AdminCompany />;
      case "policy": return <AdminPolicy />;
      case "audit": return <AdminAudit />;
      case "impostazioni": return <AdminSettings />;
      default: return <AdminDashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-[oklch(0.245_0.014_145)] text-[oklch(0.92_0.01_120)] lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-lg font-bold text-white">La Schiscetta</p>
          <p className="text-[11px] uppercase tracking-[0.14em] opacity-60">Backend gestionale</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Sezioni admin">
          {visible.map((s) => {
            const active = section === s.key || (s.key === undefined && !section);
            return (
              <button
                key={s.label}
                onClick={() => navigate(s.key ? `/admin/${s.key}` : "/admin")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[oklch(0.655_0.145_42)] text-white"
                    : "opacity-75 hover:bg-white/10 hover:opacity-100"
                )}
                aria-current={active ? "page" : undefined}
              >
                <s.icon className="h-4.5 w-4.5" aria-hidden />
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="rounded-lg bg-white/5 px-3 py-2.5">
            <p className="text-sm font-bold text-white">{user?.username}</p>
            <p className="text-[11px] uppercase tracking-wide opacity-60">{user?.role}</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm opacity-70 hover:bg-white/10 hover:opacity-100"
          >
            <ExternalLink className="h-4 w-4" aria-hidden /> Vedi sito pubblico
          </button>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[oklch(0.75_0.15_30)] hover:bg-white/10"
            data-testid="admin-logout"
          >
            <LogOut className="h-4 w-4" aria-hidden /> Esci
          </button>
        </div>
      </aside>

      {/* Contenuto */}
      <div className="min-w-0 flex-1">
        {/* topbar mobile */}
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md lg:hidden">
          <p className="font-bold">La Schiscetta · Backend</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/")}>Sito</Button>
            <Button size="sm" variant="outline" onClick={logout}>Esci</Button>
          </div>
        </div>
        <div className="thin-scroll overflow-x-auto p-3 lg:hidden">
          <div className="flex gap-1.5">
            {visible.map((s) => {
              const active = section === s.key || (s.key === undefined && !section);
              return (
                <button
                  key={s.label}
                  onClick={() => navigate(s.key ? `/admin/${s.key}` : "/admin")}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{renderSection()}</main>
      </div>
    </div>
  );
}
