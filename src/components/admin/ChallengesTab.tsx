// ChallengesTab component for managing salon challenges
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Target } from "lucide-react";

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  goal_description: string | null;
  kpi_focus: string;
  month: number;
  year: number;
  period_type: string;
  target_value: number | null;
}

type PeriodType = "month" | "quarter" | "half_year" | "year";

const periodLabels: Record<PeriodType, string> = {
  month: "Måned",
  quarter: "Kvartal",
  half_year: "Halvår",
  year: "År",
};

const kpiOptions = [
  { value: "addon_share_percent", label: "Merbehandling %" },
  { value: "rebooking_percent", label: "Rebooking %" },
  { value: "efficiency_percent", label: "Effektivitet %" },
  { value: "total_revenue", label: "Total omsetning" },
  { value: "revenue_per_hour", label: "Omsetning per time" },
];

export const ChallengesTab = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    goal_description: "",
    kpi_focus: "addon_share_percent",
    month: 1,
    year: currentYear,
    period_type: "month" as PeriodType,
    target_value: 75,
  });

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from("monthly_challenges")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke hente challenges",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingChallenge) {
        const { error } = await supabase
          .from("monthly_challenges")
          .update({
            title: formData.title,
            description: formData.description,
            goal_description: formData.goal_description,
            kpi_focus: formData.kpi_focus,
            month: formData.month,
            year: formData.year,
            period_type: formData.period_type,
            target_value: formData.target_value,
          })
          .eq("id", editingChallenge.id);

        if (error) throw error;
        toast({ title: "Challenge oppdatert" });
      } else {
        const { error } = await supabase
          .from("monthly_challenges")
          .insert({
            title: formData.title,
            description: formData.description,
            goal_description: formData.goal_description,
            kpi_focus: formData.kpi_focus,
            month: formData.month,
            year: formData.year,
            period_type: formData.period_type,
            target_value: formData.target_value,
          });

        if (error) throw error;
        toast({ title: "Challenge opprettet" });
      }

      setDialogOpen(false);
      resetForm();
      fetchChallenges();
    } catch (error) {
      console.error("Error saving challenge:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke lagre challenge",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      title: challenge.title,
      description: challenge.description || "",
      goal_description: challenge.goal_description || "",
      kpi_focus: challenge.kpi_focus,
      month: challenge.month,
      year: challenge.year,
      period_type: challenge.period_type as PeriodType,
      target_value: challenge.target_value || 75,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Er du sikker på at du vil slette denne challengen?")) return;

    try {
      const { error } = await supabase
        .from("monthly_challenges")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Challenge slettet" });
      fetchChallenges();
    } catch (error) {
      console.error("Error deleting challenge:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke slette challenge",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingChallenge(null);
    setFormData({
      title: "",
      description: "",
      goal_description: "",
      kpi_focus: "addon_share_percent",
      month: new Date().getMonth() + 1,
      year: currentYear,
      period_type: "month",
      target_value: 75,
    });
  };

  const getPeriodLabel = (challenge: Challenge) => {
    const periodType = challenge.period_type as PeriodType;
    const label = periodLabels[periodType] || "Måned";
    
    if (periodType === "month") {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Des"];
      return `${monthNames[challenge.month - 1]} ${challenge.year}`;
    } else if (periodType === "quarter") {
      return `Q${challenge.month} ${challenge.year}`;
    } else if (periodType === "half_year") {
      return `H${challenge.month} ${challenge.year}`;
    } else {
      return `${challenge.year}`;
    }
  };

  const getKpiLabel = (kpiFocus: string) => {
    return kpiOptions.find(opt => opt.value === kpiFocus)?.label || kpiFocus;
  };

  const getPeriodOptions = () => {
    if (formData.period_type === "month") {
      return Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"][i],
      }));
    } else if (formData.period_type === "quarter") {
      return [
        { value: 1, label: "Q1 (Jan-Mar)" },
        { value: 2, label: "Q2 (Apr-Jun)" },
        { value: 3, label: "Q3 (Jul-Sep)" },
        { value: 4, label: "Q4 (Okt-Des)" },
      ];
    } else if (formData.period_type === "half_year") {
      return [
        { value: 1, label: "H1 (Jan-Jun)" },
        { value: 2, label: "H2 (Jul-Des)" },
      ];
    } else {
      return [{ value: 1, label: "Hele året" }];
    }
  };

  if (loading) {
    return <div className="p-4">Laster challenges...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">Challenges</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ny Challenge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingChallenge ? "Rediger Challenge" : "Opprett Challenge"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tittel</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="F.eks. Merbehandling Desember"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="period_type">Periodetype</Label>
                <Select
                  value={formData.period_type}
                  onValueChange={(value: PeriodType) => setFormData({ ...formData, period_type: value, month: 1 })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Måned</SelectItem>
                    <SelectItem value="quarter">Kvartal</SelectItem>
                    <SelectItem value="half_year">Halvår</SelectItem>
                    <SelectItem value="year">År</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period">Periode</Label>
                  <Select
                    value={formData.month.toString()}
                    onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getPeriodOptions().map((opt) => (
                        <SelectItem key={opt.value} value={opt.value.toString()}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">År</Label>
                  <Select
                    value={formData.year.toString()}
                    onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kpi_focus">KPI-fokus</Label>
                <Select
                  value={formData.kpi_focus}
                  onValueChange={(value) => setFormData({ ...formData, kpi_focus: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {kpiOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_value">Målverdi</Label>
                <Input
                  id="target_value"
                  type="number"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: parseFloat(e.target.value) })}
                  placeholder="75"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal_description">Målbeskrivelse</Label>
                <Input
                  id="goal_description"
                  value={formData.goal_description}
                  onChange={(e) => setFormData({ ...formData, goal_description: e.target.value })}
                  placeholder="F.eks. Oppnå 75% merbehandling"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beskrivelse</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Utfyllende beskrivelse av challengen..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full">
                {editingChallenge ? "Oppdater" : "Opprett"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tittel</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>KPI</TableHead>
              <TableHead>Mål</TableHead>
              <TableHead className="text-right">Handlinger</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {challenges.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Ingen challenges opprettet ennå
                </TableCell>
              </TableRow>
            ) : (
              challenges.map((challenge) => (
                <TableRow key={challenge.id}>
                  <TableCell className="font-medium">{challenge.title}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-accent/10 text-accent">
                      {getPeriodLabel(challenge)}
                    </span>
                  </TableCell>
                  <TableCell>{getKpiLabel(challenge.kpi_focus)}</TableCell>
                  <TableCell>{challenge.target_value}%</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(challenge)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(challenge.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
