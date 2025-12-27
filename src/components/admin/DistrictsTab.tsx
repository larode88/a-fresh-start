import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, MapPin, Pencil, Trash2, User, UserPlus, X } from "lucide-react";

export const DistrictsTab = () => {
  const [districts, setDistricts] = useState<any[]>([]);
  const [availableManagers, setAvailableManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignManagerDialogOpen, setAssignManagerDialogOpen] = useState(false);
  const [districtToEdit, setDistrictToEdit] = useState<any>(null);
  const [districtToDelete, setDistrictToDelete] = useState<any>(null);
  const [districtToAssign, setDistrictToAssign] = useState<any>(null);
  const [newDistrictName, setNewDistrictName] = useState("");
  const [editDistrictName, setEditDistrictName] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch districts with their managers
      const { data: districtsData, error: districtsError } = await supabase
        .from("districts")
        .select("*, salons(count)")
        .order("name");

      if (districtsError) throw districtsError;

      // Fetch district managers for each district
      const { data: managersData, error: managersError } = await supabase
        .from("users")
        .select("id, name, email, district_id")
        .eq("role", "district_manager");

      if (managersError) throw managersError;

      // Map managers to districts
      const districtsWithManagers = (districtsData || []).map(district => {
        const manager = managersData?.find(m => m.district_id === district.id);
        return { ...district, manager };
      });

      setDistricts(districtsWithManagers);

      // Get users that could be assigned as managers (district_managers without a district, or all users for role change)
      const { data: allUsers, error: usersError } = await supabase
        .from("users")
        .select("id, name, email, role, district_id")
        .order("name");

      if (usersError) throw usersError;
      setAvailableManagers(allUsers || []);
    } catch (error: any) {
      toast.error("Kunne ikke laste distrikter");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDistrict = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("districts")
        .insert({ name: newDistrictName });

      if (error) throw error;

      toast.success("Distrikt opprettet!");
      setNewDistrictName("");
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke opprette distrikt");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDistrict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!districtToEdit) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("districts")
        .update({ name: editDistrictName })
        .eq("id", districtToEdit.id);

      if (error) throw error;

      toast.success("Distrikt oppdatert!");
      setEditDialogOpen(false);
      setDistrictToEdit(null);
      setEditDistrictName("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke oppdatere distrikt");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDistrict = async () => {
    if (!districtToDelete) return;

    try {
      const { error } = await supabase
        .from("districts")
        .delete()
        .eq("id", districtToDelete.id);

      if (error) throw error;

      toast.success("Distrikt slettet");
      setDeleteDialogOpen(false);
      setDistrictToDelete(null);
      fetchData();
    } catch (error: any) {
      toast.error("Kunne ikke slette distrikt. Det kan ha tilknyttede salonger eller brukere.");
      console.error("Delete error:", error);
    }
  };

  const handleAssignManager = async () => {
    if (!districtToAssign || !selectedManagerId) return;
    setSubmitting(true);

    try {
      const selectedUser = availableManagers.find(u => u.id === selectedManagerId);
      
      // If existing manager exists for this district, remove their district_id
      if (districtToAssign.manager) {
        await supabase
          .from("users")
          .update({ district_id: null })
          .eq("id", districtToAssign.manager.id);
      }

      // Update the selected user's district_id
      const { error: updateError } = await supabase
        .from("users")
        .update({ district_id: districtToAssign.id })
        .eq("id", selectedManagerId);

      if (updateError) throw updateError;

      // If user is not already a district_manager, update their role
      if (selectedUser?.role !== "district_manager") {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: "district_manager" })
          .eq("user_id", selectedManagerId);

        if (roleError) throw roleError;

        const { error: userRoleError } = await supabase
          .from("users")
          .update({ role: "district_manager" })
          .eq("id", selectedManagerId);

        if (userRoleError) throw userRoleError;
      }

      toast.success("Distriktsleder tildelt!");
      setAssignManagerDialogOpen(false);
      setDistrictToAssign(null);
      setSelectedManagerId("");
      fetchData();
    } catch (error: any) {
      toast.error("Kunne ikke tildele distriktsleder");
      console.error("Assign error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveManager = async (district: any) => {
    if (!district.manager) return;
    
    try {
      // Remove district_id and change role to stylist
      const { error: updateError } = await supabase
        .from("users")
        .update({ district_id: null, role: "stylist" })
        .eq("id", district.manager.id);

      if (updateError) throw updateError;

      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: "stylist" })
        .eq("user_id", district.manager.id);

      if (roleError) throw roleError;

      toast.success("Distriktsleder fjernet");
      fetchData();
    } catch (error: any) {
      toast.error("Kunne ikke fjerne distriktsleder");
      console.error("Remove error:", error);
    }
  };

  const openEditDialog = (district: any) => {
    setDistrictToEdit(district);
    setEditDistrictName(district.name);
    setEditDialogOpen(true);
  };

  const openAssignManagerDialog = (district: any) => {
    setDistrictToAssign(district);
    setSelectedManagerId(district.manager?.id || "");
    setAssignManagerDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-8">Laster distrikter...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Distrikter</h2>
          <p className="text-muted-foreground">
            Administrer geografiske distrikter
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Nytt distrikt
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Opprett nytt distrikt</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateDistrict} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Distriktsnavn</Label>
                <Input
                  id="name"
                  placeholder="F.eks. Oslo Vest"
                  value={newDistrictName}
                  onChange={(e) => setNewDistrictName(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              <Button
                type="submit"
                className="w-full gradient-primary"
                disabled={submitting}
              >
                {submitting ? "Oppretter..." : "Opprett distrikt"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {districts.map((district) => (
          <Card key={district.id} className="p-6 shadow-card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-info" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 truncate">
                      {district.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {district.salons?.[0]?.count || 0} salonger
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(district)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        setDistrictToDelete(district);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {district.manager ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-info/5 border border-info/10">
                    <div className="w-8 h-8 rounded-full bg-info/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-info" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{district.manager.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{district.manager.email}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openAssignManagerDialog(district)}
                        title="Endre distriktsleder"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveManager(district)}
                        title="Fjern distriktsleder"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => openAssignManagerDialog(district)}
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Tildel distriktsleder
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {districts.length === 0 && (
        <Card className="p-12 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ingen distrikter ennå</h3>
          <p className="text-muted-foreground mb-4">
            Opprett ditt første distrikt for å komme i gang
          </p>
        </Card>
      )}

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rediger distrikt</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditDistrict} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Distriktsnavn</Label>
              <Input
                id="editName"
                value={editDistrictName}
                onChange={(e) => setEditDistrictName(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditDialogOpen(false)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Lagrer..." : "Lagre"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign manager dialog */}
      <Dialog open={assignManagerDialogOpen} onOpenChange={setAssignManagerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tildel distriktsleder</DialogTitle>
            <DialogDescription>
              Velg en bruker som skal være distriktsleder for {districtToAssign?.name}.
              Brukeren vil automatisk få rollen "Distriktsleder" hvis de ikke allerede har den.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Velg bruker</Label>
              <Select
                value={selectedManagerId}
                onValueChange={setSelectedManagerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg en bruker" />
                </SelectTrigger>
                <SelectContent>
                  {availableManagers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                      {user.role === "district_manager" && user.district_id && user.district_id !== districtToAssign?.id && (
                        <span className="text-muted-foreground ml-2">- Har allerede et distrikt</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignManagerDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleAssignManager} disabled={!selectedManagerId || submitting}>
              {submitting ? "Tildeler..." : "Tildel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slett distrikt</DialogTitle>
            <DialogDescription>
              Er du sikker på at du vil slette distriktet "{districtToDelete?.name}"? Denne handlingen kan ikke angres.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Avbryt
            </Button>
            <Button variant="destructive" onClick={handleDeleteDistrict}>
              Slett
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};