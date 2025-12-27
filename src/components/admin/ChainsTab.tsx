import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Building2, Users, Link2 } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

interface Chain {
  id: string;
  name: string;
  org_number: string | null;
  logo_url: string | null;
  created_at: string;
}

interface Salon {
  id: string;
  name: string;
  chain_id: string | null;
}

interface ChainOwner {
  id: string;
  user_id: string;
  chain_id: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
}

export const ChainsTab = () => {
  const [chains, setChains] = useState<Chain[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [chainOwners, setChainOwners] = useState<ChainOwner[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignSalonsDialogOpen, setAssignSalonsDialogOpen] = useState(false);
  const [assignOwnersDialogOpen, setAssignOwnersDialogOpen] = useState(false);

  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);

  // Form states
  const [newChainName, setNewChainName] = useState("");
  const [newChainOrgNumber, setNewChainOrgNumber] = useState("");
  const [newChainLogo, setNewChainLogo] = useState<File | null>(null);
  const [newChainLogoPreview, setNewChainLogoPreview] = useState<string | null>(null);
  const [editChainName, setEditChainName] = useState("");
  const [editChainOrgNumber, setEditChainOrgNumber] = useState("");
  const [editChainLogo, setEditChainLogo] = useState<File | null>(null);
  const [editChainLogoPreview, setEditChainLogoPreview] = useState<string | null>(null);
  const [selectedSalonId, setSelectedSalonId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [chainsRes, salonsRes, ownersRes, usersRes] = await Promise.all([
        supabase.from("chains").select("*").order("name"),
        supabase.from("salons").select("id, name, chain_id").order("name"),
        supabase.from("user_chain_roles").select(`
          id, user_id, chain_id,
          user:users(id, name, email)
        `),
        supabase.from("users").select("id, name, email").order("name"),
      ]);

      if (chainsRes.error) throw chainsRes.error;
      if (salonsRes.error) throw salonsRes.error;
      if (ownersRes.error) throw ownersRes.error;
      if (usersRes.error) throw usersRes.error;

      setChains(chainsRes.data || []);
      setSalons(salonsRes.data || []);
      setChainOwners(ownersRes.data?.map(o => ({
        ...o,
        user: Array.isArray(o.user) ? o.user[0] : o.user
      })) || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke laste data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `chain-logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("salon-logos")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading logo:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("salon-logos")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleCreateChain = async () => {
    if (!newChainName.trim()) {
      toast({
        title: "Feil",
        description: "Navn er påkrevd",
        variant: "destructive",
      });
      return;
    }

    try {
      let logoUrl: string | null = null;
      if (newChainLogo) {
        logoUrl = await uploadLogo(newChainLogo);
      }

      const { error } = await supabase.from("chains").insert({
        name: newChainName.trim(),
        org_number: newChainOrgNumber.trim() || null,
        logo_url: logoUrl,
      });

      if (error) throw error;

      toast({
        title: "Suksess",
        description: "Kjede opprettet",
      });

      setCreateDialogOpen(false);
      setNewChainName("");
      setNewChainOrgNumber("");
      setNewChainLogo(null);
      setNewChainLogoPreview(null);
      fetchData();
    } catch (error) {
      console.error("Error creating chain:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke opprette kjede",
        variant: "destructive",
      });
    }
  };

  const handleEditChain = async () => {
    if (!selectedChain || !editChainName.trim()) return;

    try {
      let logoUrl = selectedChain.logo_url;
      if (editChainLogo) {
        logoUrl = await uploadLogo(editChainLogo);
      }

      const { error } = await supabase
        .from("chains")
        .update({
          name: editChainName.trim(),
          org_number: editChainOrgNumber.trim() || null,
          logo_url: logoUrl,
        })
        .eq("id", selectedChain.id);

      if (error) throw error;

      toast({
        title: "Suksess",
        description: "Kjede oppdatert",
      });

      setEditDialogOpen(false);
      setSelectedChain(null);
      fetchData();
    } catch (error) {
      console.error("Error updating chain:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke oppdatere kjede",
        variant: "destructive",
      });
    }
  };

  const handleDeleteChain = async () => {
    if (!selectedChain) return;

    try {
      const { error } = await supabase
        .from("chains")
        .delete()
        .eq("id", selectedChain.id);

      if (error) throw error;

      toast({
        title: "Suksess",
        description: "Kjede slettet",
      });

      setDeleteDialogOpen(false);
      setSelectedChain(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting chain:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke slette kjede",
        variant: "destructive",
      });
    }
  };

  const handleAssignSalon = async () => {
    if (!selectedChain || !selectedSalonId) return;

    try {
      const { error } = await supabase
        .from("salons")
        .update({ chain_id: selectedChain.id })
        .eq("id", selectedSalonId);

      if (error) throw error;

      toast({
        title: "Suksess",
        description: "Salong lagt til i kjeden",
      });

      setSelectedSalonId("");
      fetchData();
    } catch (error) {
      console.error("Error assigning salon:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke legge til salong",
        variant: "destructive",
      });
    }
  };

  const handleRemoveSalonFromChain = async (salonId: string) => {
    try {
      const { error } = await supabase
        .from("salons")
        .update({ chain_id: null })
        .eq("id", salonId);

      if (error) throw error;

      toast({
        title: "Suksess",
        description: "Salong fjernet fra kjeden",
      });

      fetchData();
    } catch (error) {
      console.error("Error removing salon:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke fjerne salong",
        variant: "destructive",
      });
    }
  };

  const handleAssignOwner = async () => {
    if (!selectedChain || !selectedUserId) return;

    try {
      const { error } = await supabase.from("user_chain_roles").insert({
        user_id: selectedUserId,
        chain_id: selectedChain.id,
        role: "chain_owner",
      });

      if (error) throw error;

      toast({
        title: "Suksess",
        description: "Kjedeeier lagt til",
      });

      setSelectedUserId("");
      fetchData();
    } catch (error) {
      console.error("Error assigning owner:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke legge til eier",
        variant: "destructive",
      });
    }
  };

  const handleRemoveOwner = async (ownershipId: string) => {
    try {
      const { error } = await supabase
        .from("user_chain_roles")
        .delete()
        .eq("id", ownershipId);

      if (error) throw error;

      toast({
        title: "Suksess",
        description: "Kjedeeier fjernet",
      });

      fetchData();
    } catch (error) {
      console.error("Error removing owner:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke fjerne eier",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (chain: Chain) => {
    setSelectedChain(chain);
    setEditChainName(chain.name);
    setEditChainOrgNumber(chain.org_number || "");
    setEditChainLogo(null);
    setEditChainLogoPreview(null);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (chain: Chain) => {
    setSelectedChain(chain);
    setDeleteDialogOpen(true);
  };

  const openAssignSalonsDialog = (chain: Chain) => {
    setSelectedChain(chain);
    setSelectedSalonId("");
    setAssignSalonsDialogOpen(true);
  };

  const openAssignOwnersDialog = (chain: Chain) => {
    setSelectedChain(chain);
    setSelectedUserId("");
    setAssignOwnersDialogOpen(true);
  };

  const getChainSalons = (chainId: string) => {
    return salons.filter((s) => s.chain_id === chainId);
  };

  const getChainOwners = (chainId: string) => {
    return chainOwners.filter((o) => o.chain_id === chainId);
  };

  const getAvailableSalons = () => {
    return salons.filter((s) => !s.chain_id);
  };

  const getAvailableUsers = (chainId: string) => {
    const existingOwnerIds = chainOwners
      .filter((o) => o.chain_id === chainId)
      .map((o) => o.user_id);
    return users.filter((u) => !existingOwnerIds.includes(u.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Kjeder</h2>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ny kjede
        </Button>
      </div>

      {chains.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Ingen kjeder opprettet ennå</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chains.map((chain) => {
            const chainSalons = getChainSalons(chain.id);
            const owners = getChainOwners(chain.id);

            return (
              <Card key={chain.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {chain.logo_url ? (
                        <img
                          src={chain.logo_url}
                          alt={chain.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">{chain.name}</CardTitle>
                        {chain.org_number && (
                          <p className="text-sm text-muted-foreground">
                            Org.nr: {chain.org_number}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span>{chainSalons.length} salonger</span>
                    <Users className="w-4 h-4 ml-2" />
                    <span>{owners.length} eiere</span>
                  </div>

                  {owners.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {owners.map((owner) => (
                        <Badge key={owner.id} variant="secondary">
                          {owner.user?.name || "Ukjent"}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAssignSalonsDialog(chain)}
                    >
                      <Link2 className="w-3 h-3 mr-1" />
                      Salonger
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAssignOwnersDialog(chain)}
                    >
                      <Users className="w-3 h-3 mr-1" />
                      Eiere
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(chain)}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Rediger
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(chain)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Slett
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Chain Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Opprett ny kjede</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="chain-name">Navn *</Label>
              <Input
                id="chain-name"
                value={newChainName}
                onChange={(e) => setNewChainName(e.target.value)}
                placeholder="F.eks. Hansen Frisør AS"
              />
            </div>
            <div>
              <Label htmlFor="chain-org">Organisasjonsnummer</Label>
              <Input
                id="chain-org"
                value={newChainOrgNumber}
                onChange={(e) => setNewChainOrgNumber(e.target.value)}
                placeholder="123456789"
              />
            </div>
            <div>
              <Label>Logo</Label>
              <ImageUpload
                value={newChainLogoPreview}
                onChange={(file, previewUrl) => {
                  setNewChainLogo(file);
                  setNewChainLogoPreview(previewUrl);
                }}
                shape="square"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleCreateChain}>Opprett</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Chain Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rediger kjede</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-chain-name">Navn *</Label>
              <Input
                id="edit-chain-name"
                value={editChainName}
                onChange={(e) => setEditChainName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-chain-org">Organisasjonsnummer</Label>
              <Input
                id="edit-chain-org"
                value={editChainOrgNumber}
                onChange={(e) => setEditChainOrgNumber(e.target.value)}
              />
            </div>
            <div>
              <Label>Logo</Label>
              <ImageUpload
                value={editChainLogoPreview || selectedChain?.logo_url}
                onChange={(file, previewUrl) => {
                  setEditChainLogo(file);
                  setEditChainLogoPreview(previewUrl);
                }}
                shape="square"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleEditChain}>Lagre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Chain Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett kjede</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette kjeden "{selectedChain?.name}"?
              Salongene vil bli frakoblet, men ikke slettet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChain}>
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Salons Dialog */}
      <Dialog open={assignSalonsDialogOpen} onOpenChange={setAssignSalonsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Administrer salonger i {selectedChain?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Legg til salong</Label>
              <div className="flex gap-2 mt-1">
                <Select value={selectedSalonId} onValueChange={setSelectedSalonId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Velg salong..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableSalons().map((salon) => (
                      <SelectItem key={salon.id} value={salon.id}>
                        {salon.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAssignSalon} disabled={!selectedSalonId}>
                  Legg til
                </Button>
              </div>
            </div>

            <div>
              <Label>Salonger i kjeden</Label>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {selectedChain && getChainSalons(selectedChain.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ingen salonger ennå</p>
                ) : (
                  selectedChain &&
                  getChainSalons(selectedChain.id).map((salon) => (
                    <div
                      key={salon.id}
                      className="flex items-center justify-between p-2 border rounded-lg"
                    >
                      <span className="text-sm">{salon.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSalonFromChain(salon.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignSalonsDialogOpen(false)}
            >
              Lukk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Owners Dialog */}
      <Dialog open={assignOwnersDialogOpen} onOpenChange={setAssignOwnersDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Administrer eiere av {selectedChain?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Legg til kjedeeier</Label>
              <div className="flex gap-2 mt-1">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Velg bruker..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedChain &&
                      getAvailableUsers(selectedChain.id).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAssignOwner} disabled={!selectedUserId}>
                  Legg til
                </Button>
              </div>
            </div>

            <div>
              <Label>Kjedeeiere</Label>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {selectedChain && getChainOwners(selectedChain.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ingen eiere ennå</p>
                ) : (
                  selectedChain &&
                  getChainOwners(selectedChain.id).map((owner) => (
                    <div
                      key={owner.id}
                      className="flex items-center justify-between p-2 border rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium">{owner.user?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {owner.user?.email}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOwner(owner.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignOwnersDialogOpen(false)}
            >
              Lukk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
