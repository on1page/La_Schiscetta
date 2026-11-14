// =====================================================================
// AdminMenu.tsx - Gestione menu con allergeni (spec 4.3)
// Editor completo: nome IT/EN, descrizione, categoria, foto, prezzo,
// peso, nutrizione per 100g, ingredienti ordinati, 14 allergeni UE,
// etichette dietetiche, add-in, claim EFSA, disponibilità, stagionalità.
// Validazione client + warning di coerenza dal server.
// =====================================================================
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/client-api";
import { ALLERGENS_UE, CATEGORIES, DIET_TAGS, EFSA_CLAIMS, formatEUR } from "@/lib/constants";
import { parseJson } from "@/lib/json";
import type { MenuItemDTO } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Search, TriangleAlert, Utensils } from "lucide-react";

type MenuItemForm = {
  slug: string; nameIt: string; nameEn: string; descIt: string; descEn: string;
  category: string; imageUrl: string; pricePer100g: number; unitWeightG: number;
  kcal: number; proteinG: number; fatG: number; carbG: number; fiberG: number;
  ingredientsIt: string; ingredientsEn: string;
  allergens: string[]; dietTags: string[]; addInIds: string[];
  healthClaim: string; available: boolean; isPopular: boolean; isSignature: boolean;
  seasonalFrom: string; seasonalTo: string; sortOrder: number;
};

const EMPTY: MenuItemForm = {
  slug: "", nameIt: "", nameEn: "", descIt: "", descEn: "", category: "Plates",
  imageUrl: "", pricePer100g: 4.0, unitWeightG: 300,
  kcal: 150, proteinG: 15, fatG: 6, carbG: 10, fiberG: 3,
  ingredientsIt: "", ingredientsEn: "", allergens: [], dietTags: [], addInIds: [],
  healthClaim: "", available: true, isPopular: false, isSignature: false,
  seasonalFrom: "", seasonalTo: "", sortOrder: 50,
};

function toForm(item: MenuItemDTO): MenuItemForm {
  return {
    slug: item.slug,
    nameIt: item.nameIt, nameEn: item.nameEn,
    descIt: item.descIt, descEn: item.descEn,
    category: item.category,
    imageUrl: item.imageUrl ?? "",
    pricePer100g: item.pricePer100g, unitWeightG: item.unitWeightG,
    kcal: item.kcal, proteinG: item.proteinG, fatG: item.fatG, carbG: item.carbG, fiberG: item.fiberG,
    ingredientsIt: parseJson<string[]>(item.ingredientsIt, []).join("\n"),
    ingredientsEn: parseJson<string[]>(item.ingredientsEn, []).join("\n"),
    allergens: parseJson<string[]>(item.allergens, []),
    dietTags: parseJson<string[]>(item.dietTags, []),
    addInIds: parseJson<string[]>(item.addInIds, []),
    healthClaim: item.healthClaim ?? "",
    available: item.available,
    isPopular: item.isPopular,
    isSignature: item.isSignature,
    seasonalFrom: item.seasonalFrom ?? "",
    seasonalTo: item.seasonalTo ?? "",
    sortOrder: item.isPopular ? 10 : 50,
  };
}

export function AdminMenu() {
  const [items, setItems] = useState<MenuItemDTO[]>([]);
  const [addInKeys, setAddInKeys] = useState<{ key: string; nameIt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<MenuItemDTO | "new" | null>(null);
  const [form, setForm] = useState<MenuItemForm>(EMPTY);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [menuRes, addinRes] = await Promise.all([
        api.get<{ items: MenuItemDTO[] }>("/api/admin/menu"),
        fetch("/api/bootstrap").then((r) => r.json()),
      ]);
      setItems(menuRes.items);
      setAddInKeys((addinRes.addIns as { key: string; nameIt: string }[]) ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q ? items.filter((i) => `${i.nameIt} ${i.nameEn} ${i.slug} ${i.category}`.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const openEditor = (item: MenuItemDTO | "new") => {
    setWarnings([]);
    if (item === "new") {
      setForm(EMPTY);
      setEditing("new");
    } else {
      setForm(toForm(item));
      setEditing(item);
    }
  };

  const toggleIn = (list: string[], code: string): string[] =>
    list.includes(code) ? list.filter((c) => c !== code) : [...list, code];

  const save = async () => {
    setSaving(true);
    setWarnings([]);
    const payload = {
      ...form,
      imageUrl: form.imageUrl || null,
      ingredientsIt: form.ingredientsIt.split("\n").map((s) => s.trim()).filter(Boolean),
      ingredientsEn: form.ingredientsEn.split("\n").map((s) => s.trim()).filter(Boolean),
      addInIds: form.addInIds,
      healthClaim: form.healthClaim ?? "",
      seasonalFrom: form.seasonalFrom || null,
      seasonalTo: form.seasonalTo || null,
      availableDays: [1, 2, 3, 4, 5, 6, 0],
    };
    try {
      const res =
        editing === "new"
          ? await api.post<{ item: MenuItemDTO; warnings: string[] }>("/api/admin/menu", payload)
          : await api.put<{ item: MenuItemDTO; warnings: string[] }>(`/api/admin/menu/${(editing as MenuItemDTO).id}`, payload);
      setWarnings(res.warnings ?? []);
      toast({
        title: editing === "new" ? "Voce creata" : "Voce aggiornata",
        description: res.warnings?.length ? "Attenzione: vedi avvisi di coerenza." : "Salvato nell'audit log.",
      });
      await load();
      if (!res.warnings?.length) setEditing(null);
    } catch (err) {
      toast({
        title: "Salvataggio non riuscito",
        description: err instanceof ApiError ? err.message : "Controlla i campi e riprova",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: MenuItemDTO) => {
    if (!window.confirm(`Eliminare definitivamente "${item.nameIt}"? L'operazione è tracciata nell'audit log.`)) return;
    try {
      await api.delete(`/api/admin/menu/${item.id}`);
      toast({ title: "Voce eliminata" });
      await load();
    } catch (err) {
      toast({ title: "Eliminazione non riuscita", description: err instanceof ApiError ? err.message : "", variant: "destructive" });
    }
  };

  const num = (v: string) => (v === "" ? 0 : Number(v.replace(",", ".")));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestione menu</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} voci · allergeni UE 1169/2011 obbligatori · claim solo EFSA
          </p>
        </div>
        <Button onClick={() => openEditor("new")} className="gap-2" data-testid="new-menu-item">
          <Plus className="h-4 w-4" aria-hidden /> Nuova voce
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per nome, slug o categoria..." className="h-10 pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Piatto</th>
              <th className="px-4 py-3 font-semibold">Categoria</th>
              <th className="px-4 py-3 font-semibold">€/100g</th>
              <th className="px-4 py-3 font-semibold">kcal</th>
              <th className="px-4 py-3 font-semibold">Allergeni</th>
              <th className="px-4 py-3 font-semibold">Stato</th>
              <th className="px-4 py-3 text-right font-semibold">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" aria-hidden /></td></tr>
            ) : (
              filtered.map((item) => {
                const allergens = parseJson<string[]>(item.allergens, []);
                return (
                  <tr key={item.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                           
                          <img src={item.imageUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-lg border border-border object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary"><Utensils className="h-4 w-4 text-muted-foreground" aria-hidden /></div>
                        )}
                        <div>
                          <p className="font-semibold">{item.nameIt}</p>
                          <p className="text-xs text-muted-foreground">{item.nameEn}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                    <td className="font-data px-4 py-3 font-semibold">{formatEUR(item.pricePer100g)}</td>
                    <td className="font-data px-4 py-3">{item.kcal}</td>
                    <td className="px-4 py-3">
                      {allergens.length === 0 ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">nessuno</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{allergens.length} dichiarati</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${item.available ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"}`}>
                        {item.available ? "attivo" : "sospeso"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditor(item)} aria-label={`Modifica ${item.nameIt}`}>
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => remove(item)} aria-label={`Elimina ${item.nameIt}`}>
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ------------- EDITOR ------------- */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="thin-scroll max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Nuova voce menu" : `Modifica: ${form.nameIt}`}</DialogTitle>
          </DialogHeader>

          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3" role="alert">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
                <TriangleAlert className="h-4 w-4" aria-hidden /> Avvisi di coerenza
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-amber-800">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="mi-nameIt">Nome (IT) *</Label>
              <Input id="mi-nameIt" maxLength={60} className="mt-1.5" value={form.nameIt} onChange={(e) => setForm({ ...form, nameIt: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="mi-nameEn">Nome (EN) *</Label>
              <Input id="mi-nameEn" maxLength={60} className="mt-1.5" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="mi-slug">Slug URL *</Label>
              <Input id="mi-slug" className="font-data mt-1.5" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="pollo-mediterraneo" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="mi-descIt">Descrizione (IT) *</Label>
              <Textarea id="mi-descIt" maxLength={500} rows={2} className="mt-1.5" value={form.descIt} onChange={(e) => setForm({ ...form, descIt: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="mi-descEn">Descrizione (EN) *</Label>
              <Textarea id="mi-descEn" maxLength={500} rows={2} className="mt-1.5" value={form.descEn} onChange={(e) => setForm({ ...form, descEn: e.target.value })} />
            </div>
            <div>
              <Label>Categoria *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.it}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="mi-img">URL foto (AVIF/WebP 1200x800)</Label>
              <Input id="mi-img" className="mt-1.5" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="mi-price">Prezzo €/100g (0,50-25,00) *</Label>
              <Input id="mi-price" inputMode="decimal" className="font-data mt-1.5" value={form.pricePer100g} onChange={(e) => setForm({ ...form, pricePer100g: num(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="mi-weight">Peso unitario (g) *</Label>
              <Input id="mi-weight" inputMode="numeric" className="font-data mt-1.5" value={form.unitWeightG} onChange={(e) => setForm({ ...form, unitWeightG: Math.round(num(e.target.value)) })} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">Valori nutrizionali per 100 g *</p>
            <div className="grid grid-cols-5 gap-2">
              {([
                ["kcal", "kcal"], ["proteinG", "Proteine g"], ["fatG", "Grassi g"],
                ["carbG", "Carboidrati g"], ["fiberG", "Fibre g"],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <Label htmlFor={`mi-${key}`} className="text-xs">{label}</Label>
                  <Input
                    id={`mi-${key}`} inputMode="decimal"
                    className="font-data mt-1 h-9"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: num(e.target.value) })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="mi-ingIt">Ingredienti (IT) — uno per riga, ordine decrescente *</Label>
              <Textarea id="mi-ingIt" rows={6} className="font-data mt-1.5 text-sm" value={form.ingredientsIt} onChange={(e) => setForm({ ...form, ingredientsIt: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="mi-ingEn">Ingredienti (EN) *</Label>
              <Textarea id="mi-ingEn" rows={6} className="font-data mt-1.5 text-sm" value={form.ingredientsEn} onChange={(e) => setForm({ ...form, ingredientsEn: e.target.value })} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">Allergeni (Reg. UE 1169/2011) — campo obbligatorio *</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {ALLERGENS_UE.map((a) => (
                <label key={a.code} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                  <Checkbox
                    checked={form.allergens.includes(a.code)}
                    onCheckedChange={() => setForm({ ...form, allergens: toggleIn(form.allergens, a.code) })}
                  />
                  {a.it}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-bold">Etichette dietetiche</p>
              <div className="flex flex-wrap gap-1.5">
                {DIET_TAGS.map((d) => (
                  <button
                    key={d.code}
                    type="button"
                    onClick={() => setForm({ ...form, dietTags: toggleIn(form.dietTags, d.code) })}
                    className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                      form.dietTags.includes(d.code)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-secondary"
                    }`}
                  >
                    {d.code === "LACTOSE_FREE" ? "SL" : d.code}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">Add-in disponibili</p>
              <div className="flex flex-wrap gap-1.5">
                {addInKeys.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => setForm({ ...form, addInIds: toggleIn(form.addInIds, a.key) })}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      form.addInIds.includes(a.key)
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-background hover:bg-secondary"
                    }`}
                  >
                    {a.nameIt.split("(")[0].trim()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label>Claim nutrizionale (SOLO registro EFSA autorizzato — Reg. UE 1924/2006)</Label>
            <Select value={form.healthClaim} onValueChange={(v) => setForm({ ...form, healthClaim: v === "" ? "" : EFSA_CLAIMS[Number(v)] })}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Nessun claim" /></SelectTrigger>
              <SelectContent>
                {EFSA_CLAIMS.map((c, i) => (
                  <SelectItem key={i} value={String(i)}>{c === "" ? "— Nessun claim —" : c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5">
              <Label htmlFor="mi-avail" className="cursor-pointer text-sm">Disponibile</Label>
              <Switch id="mi-avail" checked={form.available} onCheckedChange={(v) => setForm({ ...form, available: v })} />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5">
              <Label htmlFor="mi-pop" className="cursor-pointer text-sm">Popolare</Label>
              <Switch id="mi-pop" checked={form.isPopular} onCheckedChange={(v) => setForm({ ...form, isPopular: v })} />
            </div>
            <div>
              <Label htmlFor="mi-seasFrom" className="text-xs">Stagionale da (MM-GG)</Label>
              <Input id="mi-seasFrom" placeholder="05-01" className="font-data mt-1 h-9" value={form.seasonalFrom} onChange={(e) => setForm({ ...form, seasonalFrom: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="mi-seasTo" className="text-xs">Stagionale a (MM-GG)</Label>
              <Input id="mi-seasTo" placeholder="09-30" className="font-data mt-1 h-9" value={form.seasonalTo} onChange={(e) => setForm({ ...form, seasonalTo: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annulla</Button>
            <Button onClick={save} disabled={saving} className="gap-2" data-testid="save-menu-item">
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {editing === "new" ? "Crea voce" : "Salva modifiche"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
