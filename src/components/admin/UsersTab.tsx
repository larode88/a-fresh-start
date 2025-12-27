import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Search, Settings, X, Pencil, Trash2, Download } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { HubSpotContactImport } from "./HubSpotContactImport";

type AppRole = Database["public"]["Enums"]["app_role"];

const SALON_ROLES: AppRole[] = ["salon_owner", "daglig_leder", "avdelingsleder", "styreleder", "seniorfrisor", "stylist", "apprentice"];
const DISTRICT_ROLES: AppRole[] = ["district_manager"];
const SUPPLIER_ROLES: AppRole[] = ["supplier_admin", "supplier_sales", "supplier_business_dev"];
const CHAIN_ROLES: AppRole[] = ["chain_owner"];

export const UsersTab = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [salons, setSalons] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [newRole, setNewRole] = useState<AppRole | "">("");
  const [roleDistrictId, setRoleDistrictId] = useState("");
  const [roleSalonId, setRoleSalonId] = useState("");
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    salon_id: "",
    district_id: "",
  });
  
  // Bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkNewRole, setBulkNewRole] = useState<AppRole | "">("");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  
  // HubSpot import
  const [hubspotImportOpen, setHubspotImportOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, salonsRes, districtsRes] = await Promise.all([
        supabase
          .from("users")
          .select(`
            *,
            salons:salon_id(name),
            districts:district_id(name)
          `)
          .order("created_at", { ascending: false }),
        supabase.from("salons").select("id, name").order("name"),
        supabase.from("districts").select("id, name").order("name"),
      ]);

      if (usersRes.error) throw usersRes.error;
      setUsers(usersRes.data || []);
      setSalons(salonsRes.data || []);
      setDistricts(districtsRes.data || []);
    } catch (error: any) {
      toast.error("Kunne ikke laste brukere");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-destructive/10 text-destructive border-destructive/20",
      district_manager: "bg-info/10 text-info border-info/20",
      salon_owner: "bg-primary/10 text-primary border-primary/20",
      daglig_leder: "bg-primary/10 text-primary border-primary/20",
      avdelingsleder: "bg-secondary/10 text-secondary-foreground border-secondary/20",
      styreleder: "bg-secondary/10 text-secondary-foreground border-secondary/20",
      chain_owner: "bg-primary/10 text-primary border-primary/20",
      seniorfrisor: "bg-accent/10 text-accent border-accent/20",
      stylist: "bg-accent/10 text-accent border-accent/20",
      apprentice: "bg-warning/10 text-warning border-warning/20",
      supplier_admin: "bg-muted text-muted-foreground border-muted",
      supplier_sales: "bg-muted text-muted-foreground border-muted",
      supplier_business_dev: "bg-muted text-muted-foreground border-muted",
    };
    return colors[role] || "";
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      district_manager: "Distriktsleder",
      chain_owner: "Kjedeeier",
      salon_owner: "Salongeier",
      daglig_leder: "Daglig leder",
      avdelingsleder: "Avdelingsleder",
      styreleder: "Styreleder",
      seniorfrisor: "Seniorfrisør",
      stylist: "Frisør",
      apprentice: "Lærling",
      supplier_admin: "Leverandør Admin",
      supplier_sales: "Leverandør Salg",
      supplier_business_dev: "Leverandør Business Dev",
    };
    return labels[role] || role;
  };

  const openRoleDialog = (user: any) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setRoleDistrictId(user.district_id || "");
    setRoleSalonId(user.salon_id || "");
    setRoleDialogOpen(true);
  };

  const openEditDialog = (user: any) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      salon_id: user.salon_id || "",
      district_id: user.district_id || "",
    });
    setEditDialogOpen(true);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const selectAllFiltered = () => {
    const allFilteredIds = new Set(filteredUsers.map((u) => u.id));
    setSelectedUserIds(allFilteredIds);
  };

  const clearSelection = () => {
    setSelectedUserIds(new Set());
  };

  const requiresSalon = (role: AppRole | "") => SALON_ROLES.includes(role as AppRole);
  const requiresDistrict = (role: AppRole | "") => DISTRICT_ROLES.includes(role as AppRole);

  const handleRoleUpdate = async () => {
    if (!selectedUser || !newRole || !profile) return;

    // Validate required associations
    if (requiresDistrict(newRole) && !roleDistrictId) {
      toast.error("Distriktsleder må ha et tilknyttet distrikt");
      return;
    }
    if (requiresSalon(newRole) && !roleSalonId) {
      toast.error("Denne rollen må ha en tilknyttet salong");
      return;
    }

    const oldRole = selectedUser.role;

    try {
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", selectedUser.id);

      if (roleError) throw roleError;

      // Update user with role and appropriate associations
      const updateData: any = { role: newRole };
      
      if (requiresDistrict(newRole)) {
        updateData.district_id = roleDistrictId;
        // Behold eksisterende salon_id - distriktsledere kan fortsatt være tilknyttet en salong
      } else if (requiresSalon(newRole)) {
        updateData.salon_id = roleSalonId;
        updateData.district_id = null; // Clear district when becoming salon role
      } else if (newRole === "admin") {
        updateData.salon_id = null;
        updateData.district_id = null;
      }

      const { error: userError } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", selectedUser.id);

      if (userError) throw userError;

      await supabase.from("role_change_audit").insert({
        user_id: selectedUser.id,
        user_email: selectedUser.email,
        user_name: selectedUser.name,
        old_role: oldRole,
        new_role: newRole,
        changed_by_user_id: profile.id,
        changed_by_name: profile.name,
      });

      try {
        await supabase.functions.invoke("send-role-change-notification", {
          body: {
            userEmail: selectedUser.email,
            userName: selectedUser.name,
            oldRole,
            newRole,
          },
        });
      } catch (emailError) {
        console.error("Failed to send notification email:", emailError);
      }

      toast.success("Rolle oppdatert og bruker varslet");
      setRoleDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error("Kunne ikke oppdatere rolle");
      console.error("Role update error:", error);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from("users")
        .update({
          name: editFormData.name,
          phone: editFormData.phone,
          salon_id: editFormData.salon_id || null,
          district_id: editFormData.district_id || null,
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success("Bruker oppdatert");
      setEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error("Kunne ikke oppdatere bruker");
      console.error("Edit error:", error);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Delete from user_roles first
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userToDelete.id);

      // Then delete from users
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", userToDelete.id);

      if (error) throw error;

      toast.success("Bruker slettet");
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchData();
    } catch (error: any) {
      toast.error("Kunne ikke slette bruker");
      console.error("Delete error:", error);
    }
  };

  const handleBulkRoleUpdate = async () => {
    if (!bulkNewRole || !profile || selectedUserIds.size === 0) return;

    setBulkUpdating(true);
    const selectedUsers = users.filter((u) => selectedUserIds.has(u.id));
    let successCount = 0;
    let errorCount = 0;

    for (const user of selectedUsers) {
      if (user.role === bulkNewRole) continue;

      const oldRole = user.role;

      try {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: bulkNewRole })
          .eq("user_id", user.id);

        if (roleError) throw roleError;

        const { error: userError } = await supabase
          .from("users")
          .update({ role: bulkNewRole })
          .eq("id", user.id);

        if (userError) throw userError;

        await supabase.from("role_change_audit").insert({
          user_id: user.id,
          user_email: user.email,
          user_name: user.name,
          old_role: oldRole,
          new_role: bulkNewRole,
          changed_by_user_id: profile.id,
          changed_by_name: profile.name,
        });

        try {
          await supabase.functions.invoke("send-role-change-notification", {
            body: {
              userEmail: user.email,
              userName: user.name,
              oldRole,
              newRole: bulkNewRole,
            },
          });
        } catch (emailError) {
          console.error("Failed to send notification email:", emailError);
        }

        successCount++;
      } catch (error) {
        console.error(`Failed to update role for ${user.email}:`, error);
        errorCount++;
      }
    }

    setBulkUpdating(false);
    setBulkDialogOpen(false);
    setBulkNewRole("");
    clearSelection();
    fetchData();

    if (successCount > 0) {
      toast.success(`${successCount} bruker(e) oppdatert`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} bruker(e) kunne ikke oppdateres`);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Laster brukere...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Brukere</h2>
          <p className="text-muted-foreground">
            Oversikt over alle registrerte brukere
          </p>
        </div>
        <Button onClick={() => setHubspotImportOpen(true)}>
          <Download className="h-4 w-4 mr-2" />
          Inviter fra HubSpot
        </Button>
      </div>

      <HubSpotContactImport
        open={hubspotImportOpen}
        onOpenChange={setHubspotImportOpen}
        onImported={fetchData}
        existingEmails={users.map(u => u.email.toLowerCase())}
        districts={districts}
        salons={salons}
      />

      {/* Bulk action toolbar */}
      {selectedUserIds.size > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedUserIds.size} bruker(e) valgt
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkNewRole("");
                  setBulkDialogOpen(true);
                }}
              >
                Endre rolle
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={selectAllFiltered}>
                Velg alle ({filteredUsers.length})
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="w-4 h-4 mr-1" />
                Fjern valg
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Søk etter navn eller e-post..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <Card key={user.id} className={`p-4 shadow-card ${selectedUserIds.has(user.id) ? 'ring-2 ring-primary' : ''}`}>
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedUserIds.has(user.id)}
                onCheckedChange={() => toggleUserSelection(user.id)}
                className="flex-shrink-0"
              />
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-medium text-foreground">{user.name}</p>
                  <Badge className={getRoleBadgeColor(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => openRoleDialog(user)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{user.email}</span>
                  {user.salons && <span>Salong: {user.salons.name}</span>}
                  {user.districts && (
                    <span>Distrikt: {user.districts.name}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEditDialog(user)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => {
                    setUserToDelete(user);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ingen brukere funnet</h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? "Prøv et annet søk"
              : "Send invitasjoner for å legge til brukere"}
          </p>
        </Card>
      )}

      {/* Single user role dialog with association selection */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Endre brukerrolle</DialogTitle>
            <DialogDescription>
              Velg en ny rolle for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rolle</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg rolle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="district_manager">Distriktsleder</SelectItem>
                  <SelectItem value="chain_owner">Kjedeeier</SelectItem>
                  <SelectItem value="salon_owner">Salongeier</SelectItem>
                  <SelectItem value="daglig_leder">Daglig leder</SelectItem>
                  <SelectItem value="avdelingsleder">Avdelingsleder</SelectItem>
                  <SelectItem value="styreleder">Styreleder</SelectItem>
                  <SelectItem value="seniorfrisor">Seniorfrisør</SelectItem>
                  <SelectItem value="stylist">Frisør</SelectItem>
                  <SelectItem value="apprentice">Lærling</SelectItem>
                  <SelectItem value="supplier_admin">Leverandør Admin</SelectItem>
                  <SelectItem value="supplier_sales">Leverandør Salg</SelectItem>
                  <SelectItem value="supplier_business_dev">Leverandør Business Dev</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {requiresDistrict(newRole) && (
              <div className="space-y-2">
                <Label>Distrikt *</Label>
                <Select value={roleDistrictId} onValueChange={setRoleDistrictId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg distrikt" />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((district) => (
                      <SelectItem key={district.id} value={district.id}>
                        {district.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Distriktsleder må ha et tilknyttet distrikt
                </p>
              </div>
            )}

            {requiresSalon(newRole) && (
              <div className="space-y-2">
                <Label>Salong *</Label>
                <Select value={roleSalonId} onValueChange={setRoleSalonId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg salong" />
                  </SelectTrigger>
                  <SelectContent>
                    {salons.map((salon) => (
                      <SelectItem key={salon.id} value={salon.id}>
                        {salon.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Denne rollen må ha en tilknyttet salong
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleRoleUpdate}>Oppdater rolle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rediger bruker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Navn</Label>
              <Input
                id="editName"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">E-post (kan ikke endres)</Label>
              <Input
                id="editEmail"
                value={editFormData.email}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhone">Telefon</Label>
              <Input
                id="editPhone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editSalon">Salong</Label>
              <Select
                value={editFormData.salon_id}
                onValueChange={(value) => setEditFormData({ ...editFormData, salon_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg salong" />
                </SelectTrigger>
                <SelectContent>
                  {salons.map((salon) => (
                    <SelectItem key={salon.id} value={salon.id}>
                      {salon.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDistrict">Distrikt</Label>
              <Select
                value={editFormData.district_id}
                onValueChange={(value) => setEditFormData({ ...editFormData, district_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg distrikt" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((district) => (
                    <SelectItem key={district.id} value={district.id}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleEditUser}>Lagre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete user confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slett bruker</DialogTitle>
            <DialogDescription>
              Er du sikker på at du vil slette brukeren "{userToDelete?.name}" ({userToDelete?.email})? Denne handlingen kan ikke angres.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Avbryt
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Slett
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk role update dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Endre rolle for {selectedUserIds.size} brukere</DialogTitle>
            <DialogDescription>
              Velg en ny rolle for alle valgte brukere. De vil bli varslet på e-post.
              Merk: Bulk-endring støtter ikke roller som krever tilknytning (distriktsleder, salongeier, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={bulkNewRole} onValueChange={(value) => setBulkNewRole(value as AppRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Velg rolle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="seniorfrisor">Seniorfrisør</SelectItem>
                <SelectItem value="stylist">Frisør</SelectItem>
                <SelectItem value="apprentice">Lærling</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)} disabled={bulkUpdating}>
              Avbryt
            </Button>
            <Button onClick={handleBulkRoleUpdate} disabled={!bulkNewRole || bulkUpdating}>
              {bulkUpdating ? "Oppdaterer..." : `Oppdater ${selectedUserIds.size} brukere`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};