import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Building2, Link2, Download, RefreshCw, Users, ChevronRight, Calendar, Store, UserPlus, Trash2, Search } from "lucide-react";
import { HubSpotSupplierImport } from "./HubSpotSupplierImport";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface Supplier {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  hubspot_company_id: string | null;
  hubspot_synced_at: string | null;
  partnerCount?: number;
  teamCount?: number;
}

interface Salon {
  id: string;
  name: string;
  city: string | null;
}

interface TeamUser {
  id: string;
  user_id: string;
  role: string;
  user: {
    name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

export const SuppliersTab = () => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [linkedSalons, setLinkedSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [hubspotImportOpen, setHubspotImportOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [linkingSupplier, setLinkingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [linkedSalonIds, setLinkedSalonIds] = useState<Set<string>>(new Set());
  const [savingLinks, setSavingLinks] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("supplier_sales");
  
  const [formData, setFormData] = useState({
    name: "",
  });

  const existingHubSpotIds = suppliers
    .filter((s) => s.hubspot_company_id)
    .map((s) => s.hubspot_company_id!);

  useEffect(() => {
    fetchSuppliers();
    fetchSalons();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");

      if (error) throw error;

      const { data: relationships } = await supabase
        .from("salon_suppliers")
        .select("supplier_id");

      const countMap = new Map<string, number>();
      relationships?.forEach((r) => {
        countMap.set(r.supplier_id, (countMap.get(r.supplier_id) || 0) + 1);
      });

      const { data: teamData } = await supabase
        .from("supplier_team_users")
        .select("supplier_id")
        .eq("active", true);

      const teamCountMap = new Map<string, number>();
      teamData?.forEach((t) => {
        if (t.supplier_id) {
          teamCountMap.set(t.supplier_id, (teamCountMap.get(t.supplier_id) || 0) + 1);
        }
      });

      const suppliersWithCount = (data || []).map((s) => ({
        ...s,
        partnerCount: countMap.get(s.id) || 0,
        teamCount: teamCountMap.get(s.id) || 0,
      }));

      setSuppliers(suppliersWithCount);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalons = async () => {
    try {
      const { data, error } = await supabase
        .from("salons")
        .select("id, name, city")
        .order("name");

      if (error) throw error;
      setSalons(data || []);
    } catch (error) {
      console.error("Error fetching salons:", error);
    }
  };

  const fetchLinkedSalons = async (supplierId: string) => {
    try {
      const { data, error } = await supabase
        .from("salon_suppliers")
        .select("salon_id")
        .eq("supplier_id", supplierId);

      if (error) throw error;
      setLinkedSalonIds(new Set(data?.map((r) => r.salon_id) || []));
    } catch (error) {
      console.error("Error fetching linked salons:", error);
    }
  };

  const fetchLinkedSalonDetails = async (supplierId: string) => {
    try {
      const { data, error } = await supabase
        .from("salon_suppliers")
        .select("salon:salons(id, name, city)")
        .eq("supplier_id", supplierId);

      if (error) throw error;
      const salonsList = (data || [])
        .map((r: any) => r.salon)
        .filter(Boolean);
      setLinkedSalons(salonsList);
    } catch (error) {
      console.error("Error fetching linked salon details:", error);
      setLinkedSalons([]);
    }
  };

  const fetchTeamUsers = async (supplierId: string) => {
    setLoadingTeam(true);
    try {
      const { data, error } = await supabase
        .from("supplier_team_users")
        .select(`
          id,
          user_id,
          role,
          user:users(name, email, avatar_url)
        `)
        .eq("supplier_id", supplierId)
        .eq("active", true);

      if (error) throw error;
      
      const formattedData = (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        role: item.role,
        user: item.user,
      }));
      
      setTeamUsers(formattedData);
    } catch (error) {
      console.error("Error fetching team users:", error);
      setTeamUsers([]);
    } finally {
      setLoadingTeam(false);
    }
  };

  const fetchAvailableUsers = async (supplierId: string) => {
    setLoadingUsers(true);
    try {
      // Get users already in this supplier team
      const { data: existingTeam } = await supabase
        .from("supplier_team_users")
        .select("user_id")
        .eq("supplier_id", supplierId)
        .eq("active", true);

      const existingUserIds = new Set((existingTeam || []).map((t) => t.user_id));

      // Get all users
      const { data: allUsers, error } = await supabase
        .from("users")
        .select("id, name, email, avatar_url")
        .order("name");

      if (error) throw error;

      // Filter out users already in team
      const available = (allUsers || []).filter((u) => !existingUserIds.has(u.id));
      setAvailableUsers(available);
    } catch (error) {
      console.error("Error fetching available users:", error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from("suppliers")
          .update({
            name: formData.name,
          })
          .eq("id", editingSupplier.id);

        if (error) throw error;
        toast({ title: "Leverandør oppdatert" });
      } else {
        const { error } = await supabase
          .from("suppliers")
          .insert({
            name: formData.name,
          });

        if (error) throw error;
        toast({ title: "Leverandør opprettet" });
      }

      setDialogOpen(false);
      setEditingSupplier(null);
      setFormData({ name: "" });
      fetchSuppliers();
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke lagre leverandør",
        variant: "destructive",
      });
    }
  };

  const handleSaveLinks = async () => {
    if (!linkingSupplier) return;
    
    setSavingLinks(true);
    try {
      await supabase
        .from("salon_suppliers")
        .delete()
        .eq("supplier_id", linkingSupplier.id);

      if (linkedSalonIds.size > 0) {
        const relationships = Array.from(linkedSalonIds).map((salonId) => ({
          supplier_id: linkingSupplier.id,
          salon_id: salonId,
        }));

        const { error } = await supabase
          .from("salon_suppliers")
          .insert(relationships);

        if (error) throw error;
      }

      toast({ title: "Partnersalonger oppdatert" });
      setLinkDialogOpen(false);
      setLinkingSupplier(null);
      fetchSuppliers();
    } catch (error) {
      console.error("Error saving links:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke oppdatere partnersalonger",
        variant: "destructive",
      });
    } finally {
      setSavingLinks(false);
    }
  };

  const handleAddUserToTeam = async () => {
    if (!selectedSupplier || !selectedUserId || !selectedRole) return;

    setAddingUser(true);
    try {
      const roleValue = selectedRole as "supplier_admin" | "supplier_sales" | "supplier_business_dev";
      
      // Update user's role in users table
      const { error: userError } = await supabase
        .from("users")
        .update({ role: roleValue })
        .eq("id", selectedUserId);

      if (userError) throw userError;

      // Update user_roles table - first delete existing, then insert new
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedUserId);

      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: selectedUserId,
          role: roleValue,
        });

      if (roleError) console.error("Role update error:", roleError);

      // Add to supplier_team_users
      const { error } = await supabase
        .from("supplier_team_users")
        .insert({
          supplier_id: selectedSupplier.id,
          user_id: selectedUserId,
          role: roleValue,
        });

      if (error) throw error;

      toast({ title: "Bruker lagt til i teamet" });
      setAddUserDialogOpen(false);
      setSelectedUserId("");
      setSelectedRole("supplier_sales");
      setUserSearch("");
      
      // Refresh team users
      await fetchTeamUsers(selectedSupplier.id);
      fetchSuppliers();
    } catch (error: any) {
      console.error("Error adding user to team:", error);
      toast({
        title: "Feil",
        description: error.message || "Kunne ikke legge til bruker",
        variant: "destructive",
      });
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveUserFromTeam = async (teamUserId: string) => {
    if (!confirm("Er du sikker på at du vil fjerne denne brukeren fra teamet?")) return;

    try {
      const { error } = await supabase
        .from("supplier_team_users")
        .update({ active: false })
        .eq("id", teamUserId);

      if (error) throw error;

      toast({ title: "Bruker fjernet fra teamet" });
      if (selectedSupplier) {
        await fetchTeamUsers(selectedSupplier.id);
        fetchSuppliers();
      }
    } catch (error) {
      console.error("Error removing user:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke fjerne bruker",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (supplier: Supplier) => {
    try {
      const { error } = await supabase
        .from("suppliers")
        .update({ active: !supplier.active })
        .eq("id", supplier.id);

      if (error) throw error;
      fetchSuppliers();
    } catch (error) {
      console.error("Error toggling supplier:", error);
    }
  };

  const openEditDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingSupplier(null);
    setFormData({ name: "" });
    setDialogOpen(true);
  };

  const openLinkDialog = async (supplier: Supplier) => {
    setLinkingSupplier(supplier);
    await fetchLinkedSalons(supplier.id);
    setLinkDialogOpen(true);
  };

  const openDetailDialog = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    await Promise.all([
      fetchTeamUsers(supplier.id),
      fetchLinkedSalonDetails(supplier.id),
    ]);
    setDetailDialogOpen(true);
  };

  const openAddUserDialog = async () => {
    if (!selectedSupplier) return;
    await fetchAvailableUsers(selectedSupplier.id);
    setAddUserDialogOpen(true);
  };

  const toggleSalonLink = (salonId: string) => {
    const newSet = new Set(linkedSalonIds);
    if (newSet.has(salonId)) {
      newSet.delete(salonId);
    } else {
      newSet.add(salonId);
    }
    setLinkedSalonIds(newSet);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "supplier_admin":
        return "Admin";
      case "supplier_sales":
        return "Salg";
      case "supplier_business_dev":
        return "Forretningsutvikling";
      default:
        return role;
    }
  };

  const filteredAvailableUsers = availableUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (loading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Leverandører ({suppliers.length})
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setHubspotImportOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Importer fra HubSpot
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Ny leverandør
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSupplier ? "Rediger leverandør" : "Ny leverandør"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Navn *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Avbryt
                  </Button>
                  <Button type="submit">
                    {editingSupplier ? "Oppdater" : "Opprett"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* HubSpot Import Dialog */}
      <HubSpotSupplierImport
        open={hubspotImportOpen}
        onOpenChange={setHubspotImportOpen}
        onImported={fetchSuppliers}
        existingHubSpotIds={existingHubSpotIds}
      />

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedSupplier?.name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="space-y-6 pr-4">
              {/* Status and Info */}
              <div className="flex flex-wrap items-center gap-3">
                {selectedSupplier?.hubspot_company_id && (
                  <Badge variant="outline" className="text-xs">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    HubSpot synkronisert
                  </Badge>
                )}
                <Badge variant={selectedSupplier?.active ? "default" : "secondary"}>
                  {selectedSupplier?.active ? "Aktiv" : "Inaktiv"}
                </Badge>
                {selectedSupplier?.created_at && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Opprettet {format(new Date(selectedSupplier.created_at), "d. MMMM yyyy", { locale: nb })}
                  </span>
                )}
              </div>

              <Separator />

              {/* Partner Salons */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Partnersalonger ({linkedSalons.length})
                </h4>
                {linkedSalons.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3 text-center border rounded-md">
                    Ingen partnersalonger
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {linkedSalons.map((salon) => (
                      <Badge key={salon.id} variant="secondary" className="text-xs">
                        {salon.name}
                        {salon.city && <span className="text-muted-foreground ml-1">({salon.city})</span>}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Team Members */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Teammedlemmer ({teamUsers.length})
                  </h4>
                  <Button size="sm" variant="outline" onClick={openAddUserDialog}>
                    <UserPlus className="h-4 w-4 mr-1" />
                    Legg til bruker
                  </Button>
                </div>
                {loadingTeam ? (
                  <div className="animate-pulse space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-14 bg-muted rounded-md" />
                    ))}
                  </div>
                ) : teamUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">
                    Ingen brukere tilknyttet denne leverandøren
                  </p>
                ) : (
                  <div className="space-y-2">
                    {teamUsers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 border rounded-md group"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.user.avatar_url || undefined} />
                          <AvatarFallback>
                            {member.user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {member.user.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.user.email}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {getRoleLabel(member.role)}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          onClick={() => handleRemoveUserFromTeam(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDetailDialogOpen(false);
                if (selectedSupplier) openLinkDialog(selectedSupplier);
              }}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Administrer salonger
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setDetailDialogOpen(false);
                if (selectedSupplier) openEditDialog(selectedSupplier);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Rediger
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Legg til bruker i team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Søk etter bruker</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Navn eller e-post..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Velg bruker</Label>
              {loadingUsers ? (
                <div className="h-32 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : (
                <ScrollArea className="h-40 border rounded-md">
                  <div className="p-2 space-y-1">
                    {filteredAvailableUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Ingen brukere funnet
                      </p>
                    ) : (
                      filteredAvailableUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                            selectedUserId === user.id
                              ? "bg-primary/10 border border-primary"
                              : "hover:bg-muted"
                          }`}
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {user.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>

            <div className="space-y-2">
              <Label>Rolle</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier_admin">Admin</SelectItem>
                  <SelectItem value="supplier_sales">Salg</SelectItem>
                  <SelectItem value="supplier_business_dev">Forretningsutvikling</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
                Avbryt
              </Button>
              <Button
                onClick={handleAddUserToTeam}
                disabled={!selectedUserId || addingUser}
              >
                {addingUser ? "Legger til..." : "Legg til"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Partnersalonger for {linkingSupplier?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Velg hvilke salonger som skal være partnere med denne leverandøren.
            </p>
            <ScrollArea className="h-64 border rounded-md p-4">
              <div className="space-y-3">
                {salons.map((salon) => (
                  <div key={salon.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={salon.id}
                      checked={linkedSalonIds.has(salon.id)}
                      onCheckedChange={() => toggleSalonLink(salon.id)}
                    />
                    <label
                      htmlFor={salon.id}
                      className="text-sm font-medium leading-none cursor-pointer flex-1"
                    >
                      {salon.name}
                      {salon.city && (
                        <span className="text-muted-foreground ml-2">({salon.city})</span>
                      )}
                    </label>
                  </div>
                ))}
                {salons.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Ingen salonger tilgjengelig
                  </p>
                )}
              </div>
            </ScrollArea>
            <p className="text-sm text-muted-foreground mt-2">
              {linkedSalonIds.size} salong(er) valgt
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSaveLinks} disabled={savingLinks}>
              {savingLinks ? "Lagrer..." : "Lagre"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {suppliers.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          Ingen leverandører registrert
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Navn</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Partnere</TableHead>
              <TableHead>HubSpot</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Handlinger</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow 
                key={supplier.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => openDetailDialog(supplier)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {supplier.name}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {supplier.teamCount} brukere
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{supplier.partnerCount} salonger</Badge>
                </TableCell>
                <TableCell>
                  {supplier.hubspot_company_id ? (
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Synkronisert
                      </Badge>
                      {supplier.hubspot_synced_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(supplier.hubspot_synced_at), "d. MMM", { locale: nb })}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={supplier.active ? "default" : "secondary"}>
                    {supplier.active ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openLinkDialog(supplier)}
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      Salonger
                    </Button>
                    <Switch
                      checked={supplier.active}
                      onCheckedChange={() => toggleActive(supplier)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(supplier)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
};
