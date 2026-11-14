// =====================================================================
// AdminPolicy.tsx - Gestione Privacy/Cookie policy (spec 4.5):
// editor sezioni, versionamento (max 20) con rollback, tabella cookie
// modificabile, anteprima banner.
// =====================================================================
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/client-api";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Plus, Trash2, History, RotateCcw, Cookie, FileText } from "lucide-react";

type Section = { id: string; title: string; body: string };
type Version = { id: string; version: number; changeNote: string | null; authorName: string; createdAt: string };
type CookieDef = {
  id: string; name: string; provider: string; purpose: string; duration: string;
  category: string; required: boolean; active: boolean;
};

export function AdminPolicy() {
  const [sections, setSections] = useState<Section[]>([]);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [versions, setVersions] = useState<Version[]>([]);
  const [cookies, setCookies] = useState<CookieDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changeNote, setChangeNote] = useState("");
  const [showVersions, setShowVersions] = useState(false);
  const [newCookie, setNewCookie] = useState<Partial<CookieDef>>({
    name: "", provider: "", purpose: "", duration: "", category: "ANALITICI_1P", required: false, active: false,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{
        privacy: { sections: Section[]; version: number } | null;
        versions: Version[];
        cookies: CookieDef[];
      }>("/api/admin/policy");
      setSections(res.privacy?.sections ?? []);
      setCurrentVersion(res.privacy?.version ?? 1);
      setVersions(res.versions);
      setCookies(res.cookies);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const publish = async () => {
    if (sections.length === 0) return;
    setSaving(true);
    try {
      const res = await api.put<{ version: number; message: string }>("/api/admin/policy/privacy", {
        sections,
        changeNote: changeNote || "Aggiornamento sezioni policy",
      });
      setCurrentVersion(res.version);
      setChangeNote("");
      toast({ title: `Policy pubblicata (v${res.version})`, description: res.message });
      await load();
    } catch (err) {
      toast({ title: "Pubblicazione non riuscita", description: err instanceof ApiError ? err.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const rollback = async (versionId: string) => {
    try {
      await api.post("/api/admin/policy/rollback", { versionId });
      toast({ title: "Rollback completato" });
      setShowVersions(false);
      await load();
    } catch (err) {
      toast({ title: "Rollback non riuscito", description: err instanceof ApiError ? err.message : "", variant: "destructive" });
    }
  };

  const updateCookie = async (cookie: CookieDef) => {
    try {
      await api.put(`/api/admin/cookies/${cookie.id}`, {
        name: cookie.name, provider: cookie.provider, purpose: cookie.purpose,
        duration: cookie.duration, category: cookie.category,
        required: cookie.required, active: cookie.active,
      });
      toast({ title: "Cookie aggiornato" });
    } catch (err) {
      toast({ title: "Aggiornamento non riuscito", description: err instanceof ApiError ? err.message : "", variant: "destructive" });
    }
  };

  const addCookie = async () => {
    if (!newCookie.name || !newCookie.provider || !newCookie.purpose) {
      toast({ title: "Compila nome, fornitore e finalità" });
      return;
    }
    try {
      await api.post("/api/admin/cookies", {
        name: newCookie.name, provider: newCookie.provider, purpose: newCookie.purpose,
        duration: newCookie.duration || "Sessione", category: newCookie.category,
        required: newCookie.required ?? false, active: newCookie.active ?? false,
      });
      setNewCookie({ name: "", provider: "", purpose: "", duration: "", category: "ANALITICI_1P", required: false, active: false });
      await load();
      toast({ title: "Cookie aggiunto" });
    } catch (err) {
      toast({ title: "Creazione non riuscita", description: err instanceof ApiError ? err.message : "", variant: "destructive" });
    }
  };

  const deleteCookie = async (cookie: CookieDef) => {
    if (!window.confirm(`Eliminare il cookie "${cookie.name}" dalla tabella?`)) return;
    try {
      await api.delete(`/api/admin/cookies/${cookie.id}`);
      await load();
    } catch {
      toast({ title: "Eliminazione non riuscita", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden /></div>;
  }

  const setSection = (i: number, patch: Partial<Section>) =>
    setSections(sections.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Policy e cookie</h1>
          <p className="text-sm text-muted-foreground">
            Privacy Policy v{currentVersion} · versionamento max 20 · audit automatico · esportazione PDF per archivio 24 mesi
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowVersions(true)}>
            <History className="h-4 w-4" aria-hidden /> Versioni ({versions.length})
          </Button>
          <Button onClick={publish} disabled={saving} className="gap-2" data-testid="publish-policy">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
            Pubblica nuova versione
          </Button>
        </div>
      </div>

      <div className="paper-card p-5">
        <Label htmlFor="pn-note">Nota di modifica (andrà nello storico versioni)</Label>
        <Input
          id="pn-note" className="mt-1.5" placeholder="es. aggiornata sezione conservazione dati"
          value={changeNote} onChange={(e) => setChangeNote(e.target.value)}
        />
      </div>

      {/* Sezioni privacy */}
      <div className="space-y-4">
        {sections.map((s, i) => (
          <div key={s.id} className="paper-card p-5">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <Input
                value={s.title} className="h-10 font-semibold"
                onChange={(e) => setSection(i, { title: e.target.value })}
                aria-label={`Titolo sezione ${i + 1}`}
              />
            </div>
            <Textarea
              rows={6} className="mt-3 text-sm leading-relaxed"
              value={s.body} onChange={(e) => setSection(i, { body: e.target.value })}
              aria-label={`Contenuto sezione ${i + 1}`}
            />
          </div>
        ))}
        <Button
          variant="outline" className="gap-2"
          onClick={() => setSections([...sections, { id: `sec-${Date.now()}`, title: "Nuova sezione", body: "" }])}
        >
          <Plus className="h-4 w-4" aria-hidden /> Aggiungi sezione
        </Button>
      </div>

      {/* Tabella cookie */}
      <div className="paper-card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold">
          <Cookie className="h-4 w-4 text-primary" aria-hidden /> Tabella cookie
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Alimenta automaticamente la cookie policy pubblica e il banner. I cookie non tecnici richiedono consenso.
        </p>
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">Nome</th>
                <th className="py-2 pr-3 font-semibold">Fornitore</th>
                <th className="py-2 pr-3 font-semibold">Finalità</th>
                <th className="py-2 pr-3 font-semibold">Durata</th>
                <th className="py-2 pr-3 font-semibold">Categoria</th>
                <th className="py-2 pr-3 font-semibold">Richiesto</th>
                <th className="py-2 pr-3 font-semibold">Attivo*</th>
                <th className="py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {cookies.map((c) => (
                <tr key={c.id} className="border-b border-border/50">
                  <td className="font-data py-2 pr-3 font-semibold">{c.name}</td>
                  <td className="py-2 pr-3">{c.provider}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{c.purpose}</td>
                  <td className="py-2 pr-3">{c.duration}</td>
                  <td className="py-2 pr-3">
                    <select
                      value={c.category}
                      onChange={(e) => setCookies(cookies.map((x) => (x.id === c.id ? { ...x, category: e.target.value } : x)))}
                      onBlur={() => updateCookie(cookies.find((x) => x.id === c.id)!)}
                      className="h-8 rounded border border-input bg-background px-2 text-xs"
                      aria-label={`Categoria ${c.name}`}
                    >
                      <option value="TECNICI">Tecnici</option>
                      <option value="ANALITICI_1P">Analitici 1P</option>
                      <option value="ANALITICI_3P">Analitici 3P</option>
                      <option value="PROFILAZIONE">Profilazione</option>
                    </select>
                  </td>
                  <td className="py-2 pr-3"><Switch checked={c.required} disabled aria-label={`Richiesto ${c.name}`} /></td>
                  <td className="py-2 pr-3">
                    <Switch
                      checked={c.active} disabled={c.required}
                      onCheckedChange={(v) => {
                        setCookies(cookies.map((x) => (x.id === c.id ? { ...x, active: v } : x)));
                        updateCookie({ ...c, active: v });
                      }}
                      aria-label={`Attivo ${c.name}`}
                    />
                  </td>
                  <td className="py-2 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCookie(c)} aria-label={`Elimina ${c.name}`}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))}
              <tr className="bg-secondary/30">
                <td className="py-2 pr-3"><Input className="h-8" placeholder="nome cookie" value={newCookie.name ?? ""} onChange={(e) => setNewCookie({ ...newCookie, name: e.target.value })} aria-label="Nuovo cookie nome" /></td>
                <td className="py-2 pr-3"><Input className="h-8" placeholder="fornitore" value={newCookie.provider ?? ""} onChange={(e) => setNewCookie({ ...newCookie, provider: e.target.value })} aria-label="Nuovo cookie fornitore" /></td>
                <td className="py-2 pr-3"><Input className="h-8" placeholder="finalità" value={newCookie.purpose ?? ""} onChange={(e) => setNewCookie({ ...newCookie, purpose: e.target.value })} aria-label="Nuovo cookie finalità" /></td>
                <td className="py-2 pr-3"><Input className="h-8" placeholder="durata" value={newCookie.duration ?? ""} onChange={(e) => setNewCookie({ ...newCookie, duration: e.target.value })} aria-label="Nuovo cookie durata" /></td>
                <td className="py-2 pr-3">
                  <select
                    value={newCookie.category ?? "ANALITICI_1P"}
                    onChange={(e) => setNewCookie({ ...newCookie, category: e.target.value })}
                    className="h-8 rounded border border-input bg-background px-2 text-xs"
                    aria-label="Nuovo cookie categoria"
                  >
                    <option value="TECNICI">Tecnici</option>
                    <option value="ANALITICI_1P">Analitici 1P</option>
                    <option value="ANALITICI_3P">Analitici 3P</option>
                    <option value="PROFILAZIONE">Profilazione</option>
                  </select>
                </td>
                <td className="py-2 pr-3"><Switch checked={newCookie.required ?? false} onCheckedChange={(v) => setNewCookie({ ...newCookie, required: v })} aria-label="Nuovo cookie richiesto" /></td>
                <td className="py-2 pr-3"><Switch checked={newCookie.active ?? false} onCheckedChange={(v) => setNewCookie({ ...newCookie, active: v })} aria-label="Nuovo cookie attivo" /></td>
                <td className="py-2 text-right"><Button size="sm" variant="outline" className="h-8 gap-1" onClick={addCookie}><Plus className="h-3.5 w-3.5" aria-hidden />Aggiungi</Button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          * "Attivo" = installabile previo consenso della categoria. I cookie tecnici sono sempre necessari e non disattivabili.
        </p>
      </div>

      {/* Versioni */}
      <Dialog open={showVersions} onOpenChange={setShowVersions}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Storico versioni</DialogTitle></DialogHeader>
          <div className="thin-scroll max-h-96 space-y-2 overflow-y-auto">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-bold">v{v.version} {v.version === currentVersion && <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">corrente</span>}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.changeNote} · {v.authorName} · {new Date(v.createdAt).toLocaleString("it-IT")}
                  </p>
                </div>
                {v.version !== currentVersion && (
                  <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => rollback(v.id)}>
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Ripristina
                  </Button>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersions(false)}>Chiudi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
