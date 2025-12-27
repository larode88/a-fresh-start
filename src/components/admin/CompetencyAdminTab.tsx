import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, Star, FileText, Trash2, Edit, GripVertical } from "lucide-react";

interface Competency {
  id: string;
  navn: string;
  beskrivelse: string | null;
  kategori: string | null;
  rekkefølge: number;
  aktiv: boolean;
  rubrikk: { nivaa: number; tittel: string; beskrivelse: string }[];
}

interface Template {
  id: string;
  navn: string;
  type: string;
  beskrivelse: string | null;
  aktiv: boolean;
}

const CATEGORIES = [
  { value: "faglig", label: "Faglig kompetanse" },
  { value: "kunde", label: "Kundebehandling" },
  { value: "samarbeid", label: "Samarbeid" },
  { value: "ledelse", label: "Ledelse" },
  { value: "salg", label: "Salg" },
  { value: "annet", label: "Annet" }
];

const TEMPLATE_TYPES = [
  { value: "aarlig", label: "Årlig medarbeidersamtale" },
  { value: "halvaarlig", label: "Halvårlig oppfølging" },
  { value: "oppstart", label: "Oppstartssamtale" },
  { value: "lonn", label: "Lønnssamtale" },
  { value: "annet", label: "Annet" }
];

export function CompetencyAdminTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [compDialogOpen, setCompDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingComp, setEditingComp] = useState<Competency | null>(null);

  // Competency form
  const [formNavn, setFormNavn] = useState("");
  const [formBeskrivelse, setFormBeskrivelse] = useState("");
  const [formKategori, setFormKategori] = useState("faglig");
  const [formRubrikk, setFormRubrikk] = useState<{ nivaa: number; tittel: string; beskrivelse: string }[]>([
    { nivaa: 1, tittel: "Under forventning", beskrivelse: "" },
    { nivaa: 2, tittel: "Nær forventning", beskrivelse: "" },
    { nivaa: 3, tittel: "Møter forventning", beskrivelse: "" },
    { nivaa: 4, tittel: "Over forventning", beskrivelse: "" },
    { nivaa: 5, tittel: "Eksepsjonell", beskrivelse: "" }
  ]);

  // Template form
  const [tFormNavn, setTFormNavn] = useState("");
  const [tFormType, setTFormType] = useState("aarlig");
  const [tFormBeskrivelse, setTFormBeskrivelse] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, tempRes] = await Promise.all([
        supabase.from("kompetanse_definisjoner").select("*").order("rekkefølge"),
        supabase.from("samtale_maler").select("*").order("navn")
      ]);

      if (compRes.error) throw compRes.error;
      if (tempRes.error) throw tempRes.error;

      setCompetencies((compRes.data || []).map(c => ({
        ...c,
        rubrikk: Array.isArray(c.rubrikk) ? c.rubrikk as any : []
      })));
      setTemplates((tempRes.data || []).map(t => ({
        id: t.id,
        navn: t.navn,
        type: t.type,
        beskrivelse: t.beskrivelse,
        aktiv: t.aktiv
      })));
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Feil", description: "Kunne ikke hente data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveCompetency = async () => {
    if (!formNavn) return;
    setSaving(true);
    try {
      const payload = {
        navn: formNavn,
        beskrivelse: formBeskrivelse || null,
        kategori: formKategori,
        rubrikk: formRubrikk,
        rekkefølge: editingComp ? editingComp.rekkefølge : competencies.length + 1
      };

      if (editingComp) {
        const { error } = await supabase
          .from("kompetanse_definisjoner")
          .update(payload)
          .eq("id", editingComp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("kompetanse_definisjoner").insert(payload);
        if (error) throw error;
      }

      toast({ title: "Lagret", description: "Kompetanse lagret" });
      setCompDialogOpen(false);
      resetCompForm();
      fetchData();
    } catch (error) {
      console.error("Error saving competency:", error);
      toast({ title: "Feil", description: "Kunne ikke lagre", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!tFormNavn) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("samtale_maler").insert({
        navn: tFormNavn,
        type: tFormType,
        beskrivelse: tFormBeskrivelse || null,
        struktur: { seksjoner: [] },
        aktiv: true
      });

      if (error) throw error;
      toast({ title: "Lagret", description: "Mal opprettet" });
      setTemplateDialogOpen(false);
      resetTemplateForm();
      fetchData();
    } catch (error) {
      console.error("Error saving template:", error);
      toast({ title: "Feil", description: "Kunne ikke lagre", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleCompetencyActive = async (id: string, aktiv: boolean) => {
    try {
      const { error } = await supabase
        .from("kompetanse_definisjoner")
        .update({ aktiv })
        .eq("id", id);
      if (error) throw error;
      setCompetencies(prev => prev.map(c => c.id === id ? { ...c, aktiv } : c));
    } catch (error) {
      console.error("Error toggling:", error);
      toast({ title: "Feil", description: "Kunne ikke oppdatere", variant: "destructive" });
    }
  };

  const toggleTemplateActive = async (id: string, aktiv: boolean) => {
    try {
      const { error } = await supabase
        .from("samtale_maler")
        .update({ aktiv })
        .eq("id", id);
      if (error) throw error;
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, aktiv } : t));
    } catch (error) {
      console.error("Error toggling:", error);
      toast({ title: "Feil", description: "Kunne ikke oppdatere", variant: "destructive" });
    }
  };

  const editCompetency = (comp: Competency) => {
    setEditingComp(comp);
    setFormNavn(comp.navn);
    setFormBeskrivelse(comp.beskrivelse || "");
    setFormKategori(comp.kategori || "faglig");
    setFormRubrikk(comp.rubrikk.length > 0 ? comp.rubrikk : [
      { nivaa: 1, tittel: "Under forventning", beskrivelse: "" },
      { nivaa: 2, tittel: "Nær forventning", beskrivelse: "" },
      { nivaa: 3, tittel: "Møter forventning", beskrivelse: "" },
      { nivaa: 4, tittel: "Over forventning", beskrivelse: "" },
      { nivaa: 5, tittel: "Eksepsjonell", beskrivelse: "" }
    ]);
    setCompDialogOpen(true);
  };

  const resetCompForm = () => {
    setEditingComp(null);
    setFormNavn("");
    setFormBeskrivelse("");
    setFormKategori("faglig");
    setFormRubrikk([
      { nivaa: 1, tittel: "Under forventning", beskrivelse: "" },
      { nivaa: 2, tittel: "Nær forventning", beskrivelse: "" },
      { nivaa: 3, tittel: "Møter forventning", beskrivelse: "" },
      { nivaa: 4, tittel: "Over forventning", beskrivelse: "" },
      { nivaa: 5, tittel: "Eksepsjonell", beskrivelse: "" }
    ]);
  };

  const resetTemplateForm = () => {
    setTFormNavn("");
    setTFormType("aarlig");
    setTFormBeskrivelse("");
  };

  const updateRubrikk = (index: number, field: "tittel" | "beskrivelse", value: string) => {
    setFormRubrikk(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  if (loading) {
    return <Skeleton className="h-64" />;
  }

  return (
    <Tabs defaultValue="competencies" className="space-y-4">
      <TabsList>
        <TabsTrigger value="competencies" className="flex items-center gap-2">
          <Star className="h-4 w-4" />
          Kompetanser
        </TabsTrigger>
        <TabsTrigger value="templates" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Samtalemaler
        </TabsTrigger>
      </TabsList>

      <TabsContent value="competencies">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Kompetansedefinisjoner</CardTitle>
                <CardDescription>Definer kompetanser med rubrikker for scoring</CardDescription>
              </div>
              <Dialog open={compDialogOpen} onOpenChange={(open) => { setCompDialogOpen(open); if (!open) resetCompForm(); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Ny kompetanse</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingComp ? "Rediger kompetanse" : "Opprett kompetanse"}</DialogTitle>
                    <DialogDescription>Definer kompetanse med nivåbeskrivelser</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Navn *</Label>
                        <Input value={formNavn} onChange={e => setFormNavn(e.target.value)} placeholder="F.eks. Kundebehandling" />
                      </div>
                      <div className="space-y-2">
                        <Label>Kategori</Label>
                        <Select value={formKategori} onValueChange={setFormKategori}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(c => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Beskrivelse</Label>
                      <Textarea value={formBeskrivelse} onChange={e => setFormBeskrivelse(e.target.value)} placeholder="Hva måler denne kompetansen?" rows={2} />
                    </div>
                    <div className="space-y-3">
                      <Label>Rubrikk (nivåbeskrivelser)</Label>
                      {formRubrikk.map((r, i) => (
                        <div key={r.nivaa} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{r.nivaa}</Badge>
                            <Input 
                              value={r.tittel} 
                              onChange={e => updateRubrikk(i, "tittel", e.target.value)} 
                              placeholder="Nivåtittel" 
                              className="flex-1"
                            />
                          </div>
                          <Textarea 
                            value={r.beskrivelse} 
                            onChange={e => updateRubrikk(i, "beskrivelse", e.target.value)} 
                            placeholder="Beskriv hva som kjennetegner dette nivået" 
                            rows={2}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveCompetency} disabled={saving || !formNavn}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingComp ? "Oppdater" : "Opprett"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {competencies.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Ingen kompetanser definert.</p>
            ) : (
              <div className="space-y-3">
                {competencies.map(comp => (
                  <div key={comp.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{comp.navn}</span>
                          <Badge variant="outline">{CATEGORIES.find(c => c.value === comp.kategori)?.label || comp.kategori}</Badge>
                          {!comp.aktiv && <Badge variant="secondary">Inaktiv</Badge>}
                        </div>
                        {comp.beskrivelse && <p className="text-sm text-muted-foreground">{comp.beskrivelse}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon" onClick={() => editCompetency(comp)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Switch checked={comp.aktiv} onCheckedChange={(checked) => toggleCompetencyActive(comp.id, checked)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="templates">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Samtalemaler</CardTitle>
                <CardDescription>Maler for ulike typer medarbeidersamtaler</CardDescription>
              </div>
              <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Ny mal</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Opprett samtalemal</DialogTitle>
                    <DialogDescription>Definer struktur for samtaletypen</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Navn *</Label>
                      <Input value={tFormNavn} onChange={e => setTFormNavn(e.target.value)} placeholder="F.eks. Årlig utviklingssamtale" />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={tFormType} onValueChange={setTFormType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TEMPLATE_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Beskrivelse</Label>
                      <Textarea value={tFormBeskrivelse} onChange={e => setTFormBeskrivelse(e.target.value)} placeholder="Formål og innhold" rows={3} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveTemplate} disabled={saving || !tFormNavn}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Opprett
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Ingen maler opprettet.</p>
            ) : (
              <div className="space-y-3">
                {templates.map(template => (
                  <div key={template.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.navn}</span>
                        <Badge variant="outline">{TEMPLATE_TYPES.find(t => t.value === template.type)?.label || template.type}</Badge>
                        {!template.aktiv && <Badge variant="secondary">Inaktiv</Badge>}
                      </div>
                      {template.beskrivelse && <p className="text-sm text-muted-foreground">{template.beskrivelse}</p>}
                    </div>
                    <Switch checked={template.aktiv} onCheckedChange={(checked) => toggleTemplateActive(template.id, checked)} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
