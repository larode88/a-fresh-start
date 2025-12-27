import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Copy, Calculator } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface TariffMal {
  id: string;
  aar: number;
  navn: string;
  fagbrev_status: "med_fagbrev" | "uten_fagbrev" | "mester";
  ansiennitet_min: number;
  ansiennitet_max: number | null;
  timesats: number;
  maanedslonn: number | null;
  gyldig_fra: string;
  gyldig_til: string | null;
  beskrivelse: string | null;
}

const fagbrevLabels: Record<string, string> = {
  med_fagbrev: "Med fagbrev",
  uten_fagbrev: "Uten fagbrev",
  mester: "Mester",
};

export const TariffAdminTab = () => {
  const { user } = useAuth();
  const [tariffer, setTariffer] = useState<TariffMal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showDialog, setShowDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [editingTariff, setEditingTariff] = useState<TariffMal | null>(null);
  const [copyYear, setCopyYear] = useState<number>(new Date().getFullYear() + 1);
  const [copyAdjustment, setCopyAdjustment] = useState<number>(0);
  const [form, setForm] = useState({
    navn: "",
    fagbrev_status: "med_fagbrev" as "med_fagbrev" | "uten_fagbrev" | "mester",
    ansiennitet_min: "0",
    ansiennitet_max: "",
    timesats: "",
    maanedslonn: "",
    gyldig_fra: new Date().toISOString().split("T")[0],
    gyldig_til: "",
    beskrivelse: "",
  });

  const availableYears = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i
  );

  useEffect(() => {
    fetchTariffer();
  }, [selectedYear]);

  const fetchTariffer = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tariff_maler")
        .select("*")
        .eq("aar", selectedYear)
        .order("fagbrev_status")
        .order("ansiennitet_min");

      if (error) throw error;
      setTariffer(data || []);
    } catch (error) {
      console.error("Error fetching tariffer:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke laste tariffer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyPay = (timesats: number): number => {
    return Math.round(timesats * 162.5);
  };

  const handleOpenDialog = (tariff?: TariffMal) => {
    if (tariff) {
      setEditingTariff(tariff);
      setForm({
        navn: tariff.navn,
        fagbrev_status: tariff.fagbrev_status,
        ansiennitet_min: tariff.ansiennitet_min.toString(),
        ansiennitet_max: tariff.ansiennitet_max?.toString() || "",
        timesats: tariff.timesats.toString(),
        maanedslonn: tariff.maanedslonn?.toString() || "",
        gyldig_fra: tariff.gyldig_fra,
        gyldig_til: tariff.gyldig_til || "",
        beskrivelse: tariff.beskrivelse || "",
      });
    } else {
      setEditingTariff(null);
      setForm({
        navn: "",
        fagbrev_status: "med_fagbrev",
        ansiennitet_min: "0",
        ansiennitet_max: "",
        timesats: "",
        maanedslonn: "",
        gyldig_fra: new Date().toISOString().split("T")[0],
        gyldig_til: "",
        beskrivelse: "",
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.navn || !form.timesats) {
      toast({
        title: "Mangler data",
        description: "Fyll ut alle påkrevde felt",
        variant: "destructive",
      });
      return;
    }

    try {
      const timesats = parseFloat(form.timesats);
      const maanedslonn = form.maanedslonn
        ? parseFloat(form.maanedslonn)
        : calculateMonthlyPay(timesats);

      const payload = {
        aar: selectedYear,
        navn: form.navn,
        fagbrev_status: form.fagbrev_status,
        ansiennitet_min: parseInt(form.ansiennitet_min) || 0,
        ansiennitet_max: form.ansiennitet_max ? parseInt(form.ansiennitet_max) : null,
        timesats,
        maanedslonn,
        gyldig_fra: form.gyldig_fra,
        gyldig_til: form.gyldig_til || null,
        beskrivelse: form.beskrivelse || null,
        opprettet_av: user?.id || null,
      };

      if (editingTariff) {
        const { error } = await supabase
          .from("tariff_maler")
          .update(payload)
          .eq("id", editingTariff.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tariff_maler").insert(payload);
        if (error) throw error;
      }

      toast({
        title: "Lagret",
        description: editingTariff ? "Tariff oppdatert" : "Ny tariff opprettet",
      });
      setShowDialog(false);
      fetchTariffer();
    } catch (error) {
      console.error("Error saving tariff:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke lagre tariff",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Er du sikker på at du vil slette denne tariffen?")) return;

    try {
      const { error } = await supabase.from("tariff_maler").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Slettet", description: "Tariff ble slettet" });
      fetchTariffer();
    } catch (error) {
      console.error("Error deleting tariff:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke slette tariff",
        variant: "destructive",
      });
    }
  };

  const handleCopyYear = async () => {
    if (tariffer.length === 0) {
      toast({
        title: "Ingen tariffer",
        description: "Det finnes ingen tariffer å kopiere fra dette året",
        variant: "destructive",
      });
      return;
    }

    try {
      const adjustmentMultiplier = 1 + copyAdjustment / 100;

      const newTariffer = tariffer.map((t) => ({
        aar: copyYear,
        navn: t.navn,
        fagbrev_status: t.fagbrev_status,
        ansiennitet_min: t.ansiennitet_min,
        ansiennitet_max: t.ansiennitet_max,
        timesats: Math.round(t.timesats * adjustmentMultiplier * 100) / 100,
        maanedslonn: t.maanedslonn
          ? Math.round(t.maanedslonn * adjustmentMultiplier)
          : null,
        gyldig_fra: `${copyYear}-01-01`,
        gyldig_til: null,
        beskrivelse: t.beskrivelse,
        opprettet_av: user?.id || null,
      }));

      const { error } = await supabase.from("tariff_maler").insert(newTariffer);
      if (error) throw error;

      toast({
        title: "Kopiert",
        description: `${tariffer.length} tariffer kopiert til ${copyYear} med ${copyAdjustment}% justering`,
      });
      setShowCopyDialog(false);
      setSelectedYear(copyYear);
    } catch (error) {
      console.error("Error copying tariffer:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke kopiere tariffer",
        variant: "destructive",
      });
    }
  };

  const formatSeniority = (min: number, max: number | null) => {
    if (max === null) return `${min}+ år`;
    if (min === max) return `${min} år`;
    return `${min}-${max} år`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sentrale Tariffmaler</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowCopyDialog(true)}>
              <Copy className="w-4 h-4 mr-2" />
              Kopier til nytt år
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Ny tariff
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : tariffer.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Ingen tariffer for {selectedYear}</p>
              <p className="text-sm mt-1">
                Opprett nye eller kopier fra et annet år
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Navn</TableHead>
                  <TableHead>Fagbrevstatus</TableHead>
                  <TableHead>Ansiennitet</TableHead>
                  <TableHead className="text-right">Timesats</TableHead>
                  <TableHead className="text-right">Månedslønn</TableHead>
                  <TableHead>Gyldig fra</TableHead>
                  <TableHead className="text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tariffer.map((tariff) => (
                  <TableRow key={tariff.id}>
                    <TableCell className="font-medium">{tariff.navn}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {fagbrevLabels[tariff.fagbrev_status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatSeniority(tariff.ansiennitet_min, tariff.ansiennitet_max)}
                    </TableCell>
                    <TableCell className="text-right">
                      {tariff.timesats.toLocaleString("nb-NO")} kr
                    </TableCell>
                    <TableCell className="text-right">
                      {tariff.maanedslonn?.toLocaleString("nb-NO")} kr
                    </TableCell>
                    <TableCell>{tariff.gyldig_fra}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(tariff)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(tariff.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTariff ? "Rediger tariff" : "Ny tariffmal"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="navn">Navn *</Label>
              <Input
                id="navn"
                value={form.navn}
                onChange={(e) => setForm({ ...form, navn: e.target.value })}
                placeholder="F.eks. Frisør med fagbrev 0-2 år"
              />
            </div>
            <div>
              <Label htmlFor="fagbrev_status">Fagbrevstatus *</Label>
              <Select
                value={form.fagbrev_status}
                onValueChange={(v: "med_fagbrev" | "uten_fagbrev" | "mester") =>
                  setForm({ ...form, fagbrev_status: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uten_fagbrev">Uten fagbrev</SelectItem>
                  <SelectItem value="med_fagbrev">Med fagbrev</SelectItem>
                  <SelectItem value="mester">Mester</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ansiennitet_min">Ansiennitet fra (år)</Label>
                <Input
                  id="ansiennitet_min"
                  type="number"
                  min="0"
                  value={form.ansiennitet_min}
                  onChange={(e) => setForm({ ...form, ansiennitet_min: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="ansiennitet_max">Ansiennitet til (år)</Label>
                <Input
                  id="ansiennitet_max"
                  type="number"
                  min="0"
                  value={form.ansiennitet_max}
                  onChange={(e) => setForm({ ...form, ansiennitet_max: e.target.value })}
                  placeholder="Tom = ubegrenset"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timesats">Timesats (kr) *</Label>
                <Input
                  id="timesats"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.timesats}
                  onChange={(e) => setForm({ ...form, timesats: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="maanedslonn">Månedslønn (kr)</Label>
                <Input
                  id="maanedslonn"
                  type="number"
                  min="0"
                  value={form.maanedslonn}
                  onChange={(e) => setForm({ ...form, maanedslonn: e.target.value })}
                  placeholder={
                    form.timesats
                      ? `Auto: ${calculateMonthlyPay(parseFloat(form.timesats)).toLocaleString("nb-NO")}`
                      : "Beregnes automatisk"
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gyldig_fra">Gyldig fra *</Label>
                <Input
                  id="gyldig_fra"
                  type="date"
                  value={form.gyldig_fra}
                  onChange={(e) => setForm({ ...form, gyldig_fra: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="gyldig_til">Gyldig til</Label>
                <Input
                  id="gyldig_til"
                  type="date"
                  value={form.gyldig_til}
                  onChange={(e) => setForm({ ...form, gyldig_til: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="beskrivelse">Beskrivelse</Label>
              <Input
                id="beskrivelse"
                value={form.beskrivelse}
                onChange={(e) => setForm({ ...form, beskrivelse: e.target.value })}
                placeholder="Valgfri beskrivelse"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSave}>
              {editingTariff ? "Oppdater" : "Opprett"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Year Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kopier tariffer til nytt år</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kopier fra</Label>
              <p className="text-sm font-medium">{selectedYear}</p>
              <p className="text-sm text-muted-foreground">
                {tariffer.length} tariffer
              </p>
            </div>
            <div>
              <Label htmlFor="copyYear">Kopier til år</Label>
              <Select
                value={copyYear.toString()}
                onValueChange={(v) => setCopyYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="copyAdjustment">Prosentjustering</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="copyAdjustment"
                  type="number"
                  step="0.1"
                  value={copyAdjustment}
                  onChange={(e) => setCopyAdjustment(parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                F.eks. 3.5 for 3.5% økning
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={handleCopyYear}>
              <Copy className="w-4 h-4 mr-2" />
              Kopier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
