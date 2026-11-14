// =====================================================================
// AdminCompany.tsx - Info aziendali (spec 4.4): tutti i campi modificabili
// con validazioni (P.IVA checksum, SDI, CAP, IBAN). Solo SuperAdmin.
// =====================================================================
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/client-api";
import { parseJson } from "@/lib/json";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Building2 } from "lucide-react";

type Company = Record<string, string | number | null>;

type Hour = { day: string; open: string; close: string; closed: boolean };

const FIELDS: { key: string; label: string; type?: string; group: string }[] = [
  { key: "legalName", label: "Ragione sociale", group: "Identità" },
  { key: "brandName", label: "Nome commerciale", group: "Identità" },
  { key: "tagline", label: "Claim / tagline", group: "Identità" },
  { key: "vatNumber", label: "P.IVA (11 cifre)", group: "Fiscale" },
  { key: "taxCode", label: "Codice fiscale", group: "Fiscale" },
  { key: "sdiCode", label: "Codice destinatario SDI (7 char)", group: "Fiscale" },
  { key: "pec", label: "PEC", type: "email", group: "Fiscale" },
  { key: "cciaa", label: "Iscrizione CCIAA", group: "Fiscale" },
  { key: "reaNumber", label: "Numero REA", group: "Fiscale" },
  { key: "shareCapital", label: "Capitale sociale", group: "Fiscale" },
  { key: "iban", label: "IBAN (bonifici catering)", group: "Fiscale" },
  { key: "street", label: "Via", group: "Sede" },
  { key: "streetNumber", label: "Civico", group: "Sede" },
  { key: "zip", label: "CAP", group: "Sede" },
  { key: "city", label: "Città", group: "Sede" },
  { key: "province", label: "Provincia", group: "Sede" },
  { key: "lat", label: "Latitudine GPS", group: "Sede" },
  { key: "lng", label: "Longitudine GPS", group: "Sede" },
  { key: "phone", label: "Telefono fisso", group: "Contatti" },
  { key: "mobile", label: "Mobile", group: "Contatti" },
  { key: "whatsapp", label: "WhatsApp Business", group: "Contatti" },
  { key: "emailInfo", label: "Email info", type: "email", group: "Contatti" },
  { key: "emailOrders", label: "Email ordini", type: "email", group: "Contatti" },
  { key: "emailPrivacy", label: "Email privacy", type: "email", group: "Contatti" },
  { key: "emailAdmin", label: "Email amministrazione", type: "email", group: "Contatti" },
  { key: "dpoName", label: "DPO - nome", group: "Privacy" },
  { key: "dpoEmail", label: "DPO - email", type: "email", group: "Privacy" },
  { key: "dpoPhone", label: "DPO - telefono", group: "Privacy" },
  { key: "instagram", label: "Instagram URL", group: "Social" },
  { key: "facebook", label: "Facebook URL", group: "Social" },
  { key: "tiktok", label: "TikTok URL", group: "Social" },
  { key: "linkedin", label: "LinkedIn URL", group: "Social" },
  { key: "gbpId", label: "Google Business Profile ID", group: "Social" },
  { key: "heroUrl", label: "URL immagine hero", group: "Media" },
  { key: "aboutUrl", label: "URL immagine chi-siamo", group: "Media" },
];

export function AdminCompany() {
  const [company, setCompany] = useState<Company | null>(null);
  const [hours, setHours] = useState<Hour[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await api.get<{ company: Company }>("/api/admin/company");
      setCompany(res.company);
      setHours(parseJson<Hour[]>((res.company.openingHours as string) ?? "[]", []));
    })();
  }, []);

  const set = (key: string, value: string | number) =>
    setCompany((c) => (c ? { ...c, [key]: value } : c));

  const save = async () => {
    if (!company) return;
    setSaving(true);
    try {
      await api.put("/api/admin/company", {
        ...company,
        lat: Number(company.lat ?? 0),
        lng: Number(company.lng ?? 0),
        openingHours: hours,
        holidays: parseJson(company.holidays as string, []),
      });
      toast({ title: "Dati aziendali aggiornati", description: "Propagati a footer, privacy, schema.org e fatture." });
    } catch (err) {
      toast({
        title: "Salvataggio non riuscito",
        description: err instanceof ApiError ? err.message : "Controlla i formati (P.IVA, SDI, CAP, IBAN)",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!company) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden /></div>;
  }

  const groups = [...new Set(FIELDS.map((f) => f.group))];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Azienda</h1>
          <p className="text-sm text-muted-foreground">
            Modifiche riservate al SuperAdmin · validazione P.IVA/SDI/IBAN · propagazione automatica
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2" data-testid="save-company">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
          Salva
        </Button>
      </div>

      {groups.map((group) => (
        <div key={group} className="paper-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
            <Building2 className="h-4 w-4 text-primary" aria-hidden /> {group}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS.filter((f) => f.group === group).map((f) => (
              <div key={f.key}>
                <Label htmlFor={`cp-${f.key}`} className="text-xs">{f.label}</Label>
                <Input
                  id={`cp-${f.key}`}
                  type={f.type ?? "text"}
                  className="mt-1 h-10"
                  value={String(company[f.key] ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="paper-card p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide">Orari di apertura</h2>
        <div className="space-y-2">
          {hours.map((h, i) => (
            <div key={h.day} className="flex flex-wrap items-center gap-3">
              <span className="w-24 text-sm font-medium">{h.day}</span>
              <Input
                type="time" value={h.open} disabled={h.closed}
                className="font-data h-9 w-28"
                onChange={(e) => setHours(hours.map((x, j) => (j === i ? { ...x, open: e.target.value } : x)))}
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="time" value={h.close} disabled={h.closed}
                className="font-data h-9 w-28"
                onChange={(e) => setHours(hours.map((x, j) => (j === i ? { ...x, close: e.target.value } : x)))}
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox" checked={h.closed}
                  onChange={(e) => setHours(hours.map((x, j) => (j === i ? { ...x, closed: e.target.checked } : x)))}
                  className="h-4 w-4 accent-[oklch(0.42_0.055_148)]"
                />
                chiuso
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
