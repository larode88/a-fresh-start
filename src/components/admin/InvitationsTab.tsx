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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Mail, CheckCircle2, Clock, XCircle, Copy, RefreshCw, Trash2, Search, Loader2, User } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HubSpotContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
  };
}

type RoleType = "admin" | "district_manager" | "salon_owner" | "daglig_leder" | "avdelingsleder" | "styreleder" | "stylist" | "seniorfrisor" | "apprentice" | "supplier_admin" | "supplier_sales" | "supplier_business_dev";

const SALON_ROLES: RoleType[] = ["salon_owner", "daglig_leder", "avdelingsleder", "styreleder", "stylist", "seniorfrisor", "apprentice"];
const DISTRICT_ROLES: RoleType[] = ["district_manager"];
const SUPPLIER_ROLES: RoleType[] = ["supplier_admin", "supplier_sales", "supplier_business_dev"];

const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    admin: "Administrator",
    district_manager: "Distriktsleder",
    salon_owner: "Salongeier",
    daglig_leder: "Daglig leder",
    avdelingsleder: "Avdelingsleder",
    styreleder: "Styreleder",
    stylist: "Frisør",
    seniorfrisor: "Seniorfrisør",
    apprentice: "Lærling",
    supplier_admin: "Leverandør Admin",
    supplier_sales: "Leverandør Salg",
    supplier_business_dev: "Leverandør Business Dev",
  };
  return labels[role] || role;
};

export const InvitationsTab = () => {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [salons, setSalons] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invitationToDelete, setInvitationToDelete] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    role: "stylist" as RoleType,
    salon_id: "",
    district_id: "",
    supplier_id: "",
  });

  // HubSpot search state
  const [hubspotSearchOpen, setHubspotSearchOpen] = useState(false);
  const [hubspotQuery, setHubspotQuery] = useState("");
  const [hubspotResults, setHubspotResults] = useState<HubSpotContact[]>([]);
  const [hubspotSearching, setHubspotSearching] = useState(false);
  const [hubspotConnected, setHubspotConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (dialogOpen) {
      checkHubSpotConnection();
    }
  }, [dialogOpen]);

  const checkHubSpotConnection = async () => {
    try {
      const { data, error } = await supabase
        .from("hubspot_oauth_tokens")
        .select("id")
        .limit(1)
        .maybeSingle();
      setHubspotConnected(!error && !!data);
    } catch {
      setHubspotConnected(false);
    }
  };

  const searchHubSpotContacts = async () => {
    if (!hubspotQuery.trim()) return;
    
    setHubspotSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("hubspot-api", {
        body: { action: "search_contacts", query: hubspotQuery },
      });

      if (error) throw error;

      const existingEmails = invitations.map(inv => inv.email?.toLowerCase());
      const filtered = (data.results || []).filter((contact: HubSpotContact) => {
        const email = contact.properties.email?.toLowerCase();
        return email && !existingEmails.includes(email);
      });

      setHubspotResults(filtered);
    } catch (error: any) {
      console.error("HubSpot search error:", error);
      toast.error("Kunne ikke søke i HubSpot");
    } finally {
      setHubspotSearching(false);
    }
  };

  const selectHubSpotContact = (contact: HubSpotContact) => {
    if (contact.properties.email) {
      setFormData({ ...formData, email: contact.properties.email });
      setHubspotSearchOpen(false);
      setHubspotQuery("");
      setHubspotResults([]);
    }
  };

  const getContactName = (contact: HubSpotContact) => {
    const { firstname, lastname } = contact.properties;
    if (firstname && lastname) return `${firstname} ${lastname}`;
    if (firstname) return firstname;
    if (lastname) return lastname;
    return contact.properties.email || "Ukjent";
  };

  const fetchData = async () => {
    try {
      const [invitationsRes, salonsRes, districtsRes, suppliersRes] = await Promise.all([
        supabase
          .from("invitations")
          .select("*, salons(name), districts(name), suppliers(name)")
          .order("created_at", { ascending: false }),
        supabase.from("salons").select("id, name").order("name"),
        supabase.from("districts").select("id, name").order("name"),
        supabase.from("suppliers").select("id, name").eq("active", true).order("name"),
      ]);

      if (salonsRes.error) {
        console.error("Failed to load salons:", salonsRes.error);
      } else {
        setSalons(salonsRes.data || []);
      }

      if (districtsRes.error) {
        console.error("Failed to load districts:", districtsRes.error);
      } else {
        setDistricts(districtsRes.data || []);
      }

      if (suppliersRes.error) {
        console.error("Failed to load suppliers:", suppliersRes.error);
      } else {
        setSuppliers(suppliersRes.data || []);
      }

      if (invitationsRes.error) {
        console.error("Failed to load invitations:", invitationsRes.error);
        toast.error("Kunne ikke laste invitasjoner");
      } else {
        setInvitations(invitationsRes.data || []);
      }
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast.error("Kunne ikke laste data");
    } finally {
      setLoading(false);
    }
  };

  const requiresSalon = SALON_ROLES.includes(formData.role);
  const requiresDistrict = DISTRICT_ROLES.includes(formData.role);
  const requiresSupplier = SUPPLIER_ROLES.includes(formData.role);

  const isFormValid = () => {
    if (!formData.email) return false;
    if (requiresSalon && !formData.salon_id) return false;
    if (requiresDistrict && !formData.district_id) return false;
    if (requiresSupplier && !formData.supplier_id) return false;
    return true;
  };

  const handleRoleChange = (value: RoleType) => {
    setFormData({
      ...formData,
      role: value,
      salon_id: "",
      district_id: "",
      supplier_id: "",
    });
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      toast.error("Vennligst fyll ut alle påkrevde felt");
      return;
    }

    setSubmitting(true);

    try {
      const token = crypto.randomUUID();
      const PRODUCTION_URL = "https://har1portalen.no";

      const { error } = await supabase.from("invitations").insert({
        email: formData.email,
        role: formData.role as any,
        salon_id: requiresSalon ? formData.salon_id : null,
        district_id: requiresDistrict ? formData.district_id : null,
        supplier_id: requiresSupplier ? formData.supplier_id : null,
        token: token,
      });

      if (error) throw error;

      const invitationUrl = `${PRODUCTION_URL}/onboarding?token=${token}`;

      const selectedSalon = salons.find(s => s.id === formData.salon_id);
      const selectedDistrict = districts.find(d => d.id === formData.district_id);
      const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);

      try {
        await supabase.functions.invoke("send-invitation-email", {
          body: {
            email: formData.email,
            role: formData.role,
            salonName: selectedSalon?.name,
            districtName: selectedDistrict?.name,
            supplierName: selectedSupplier?.name,
            invitationUrl,
          },
        });
        toast.success("Invitasjon sendt på e-post!", {
          description: `E-post sendt til ${formData.email}`,
        });
      } catch (emailError) {
        console.error("Failed to send invitation email:", emailError);
        toast.success("Invitasjon opprettet", {
          description: "E-post kunne ikke sendes, men lenken er kopiert",
        });
      }

      navigator.clipboard.writeText(invitationUrl);

      setFormData({
        email: "",
        role: "stylist",
        salon_id: "",
        district_id: "",
        supplier_id: "",
      });
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke sende invitasjon");
    } finally {
      setSubmitting(false);
    }
  };

  const copyInvitationLink = (token: string) => {
    const PRODUCTION_URL = "https://har1portalen.no";
    const url = `${PRODUCTION_URL}/onboarding?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Invitasjonslenke kopiert!");
  };

  const resendInvitation = async (invitation: any) => {
    try {
      const PRODUCTION_URL = "https://har1portalen.no";
      const invitationUrl = `${PRODUCTION_URL}/onboarding?token=${invitation.token}`;
      
      await supabase.functions.invoke("send-invitation-email", {
        body: {
          email: invitation.email,
          role: invitation.role,
          salonName: invitation.salons?.name,
          districtName: invitation.districts?.name,
          supplierName: invitation.suppliers?.name,
          invitationUrl,
        },
      });
      
      toast.success("Invitasjon sendt på nytt!", {
        description: `E-post sendt til ${invitation.email}`,
      });
    } catch (error) {
      console.error("Failed to resend invitation:", error);
      toast.error("Kunne ikke sende e-post på nytt");
    }
  };

  const handleDeleteInvitation = async () => {
    if (!invitationToDelete) return;

    try {
      const { error } = await supabase
        .from("invitations")
        .delete()
        .eq("id", invitationToDelete.id);

      if (error) throw error;

      toast.success("Invitasjon slettet");
      setDeleteDialogOpen(false);
      setInvitationToDelete(null);
      fetchData();
    } catch (error: any) {
      toast.error("Kunne ikke slette invitasjon");
      console.error("Delete error:", error);
    }
  };

  const getStatusBadge = (invitation: any) => {
    if (invitation.accepted) {
      return (
        <Badge className="bg-success/10 text-success border-success/20">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Akseptert
        </Badge>
      );
    }

    const isExpired = new Date(invitation.expires_at) < new Date();
    if (isExpired) {
      return (
        <Badge variant="destructive" className="bg-destructive/10">
          <XCircle className="w-3 h-3 mr-1" />
          Utløpt
        </Badge>
      );
    }

    return (
      <Badge className="bg-warning/10 text-warning border-warning/20">
        <Clock className="w-3 h-3 mr-1" />
        Venter
      </Badge>
    );
  };

  const getEntityName = (invitation: any) => {
    if (invitation.salons?.name) return `Salong: ${invitation.salons.name}`;
    if (invitation.districts?.name) return `Distrikt: ${invitation.districts.name}`;
    if (invitation.suppliers?.name) return `Leverandør: ${invitation.suppliers.name}`;
    return null;
  };

  if (loading) {
    return <div className="text-center py-8">Laster invitasjoner...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Invitasjoner</h2>
          <p className="text-muted-foreground">
            Send invitasjoner til nye brukere
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Send invitasjon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send ny invitasjon</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-postadresse *</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder="bruker@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    disabled={submitting}
                    className="flex-1"
                  />
                  {hubspotConnected && (
                    <Popover open={hubspotSearchOpen} onOpenChange={setHubspotSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={submitting}
                          title="Søk i HubSpot"
                        >
                          <Search className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-3" align="end">
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Søk navn eller e-post..."
                              value={hubspotQuery}
                              onChange={(e) => setHubspotQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  searchHubSpotContacts();
                                }
                              }}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={searchHubSpotContacts}
                              disabled={hubspotSearching || !hubspotQuery.trim()}
                            >
                              {hubspotSearching ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Search className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                          {hubspotResults.length > 0 && (
                            <ScrollArea className="max-h-48">
                              <div className="space-y-1">
                                {hubspotResults.map((contact) => (
                                  <button
                                    key={contact.id}
                                    type="button"
                                    onClick={() => selectHubSpotContact(contact)}
                                    className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left text-sm"
                                  >
                                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium truncate">{getContactName(contact)}</p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {contact.properties.email}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </ScrollArea>
                          )}
                          {hubspotQuery && hubspotResults.length === 0 && !hubspotSearching && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              Ingen resultater funnet
                            </p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rolle *</Label>
                <Select
                  value={formData.role}
                  onValueChange={handleRoleChange}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salon_owner">Salongeier</SelectItem>
                    <SelectItem value="daglig_leder">Daglig leder</SelectItem>
                    <SelectItem value="avdelingsleder">Avdelingsleder</SelectItem>
                    <SelectItem value="styreleder">Styreleder</SelectItem>
                    <SelectItem value="seniorfrisor">Seniorfrisør</SelectItem>
                    <SelectItem value="stylist">Frisør</SelectItem>
                    <SelectItem value="apprentice">Lærling</SelectItem>
                    <SelectItem value="district_manager">Distriktsleder</SelectItem>
                    <SelectItem value="supplier_admin">Leverandør Admin</SelectItem>
                    <SelectItem value="supplier_sales">Leverandør Salg</SelectItem>
                    <SelectItem value="supplier_business_dev">Leverandør Business Dev</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {requiresSalon && (
                <div className="space-y-2">
                  <Label htmlFor="salon">Salong *</Label>
                  <Select
                    value={formData.salon_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, salon_id: value })
                    }
                    disabled={submitting}
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
                  {salons.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Ingen salonger funnet. Opprett en salong først.
                    </p>
                  )}
                </div>
              )}

              {requiresDistrict && (
                <div className="space-y-2">
                  <Label htmlFor="district">Distrikt *</Label>
                  <Select
                    value={formData.district_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, district_id: value })
                    }
                    disabled={submitting}
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
                  {districts.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Ingen distrikter funnet. Opprett et distrikt først.
                    </p>
                  )}
                </div>
              )}

              {requiresSupplier && (
                <div className="space-y-2">
                  <Label htmlFor="supplier">Leverandør *</Label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, supplier_id: value })
                    }
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Velg leverandør" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {suppliers.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Ingen leverandører funnet. Opprett en leverandør først.
                    </p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full gradient-primary"
                disabled={submitting || !isFormValid()}
              >
                {submitting ? "Sender..." : "Send invitasjon"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {invitations.map((invitation) => (
          <Card key={invitation.id} className="p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-medium text-foreground">
                      {invitation.email}
                    </p>
                    {getStatusBadge(invitation)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span>Rolle: {getRoleLabel(invitation.role)}</span>
                    {getEntityName(invitation) && (
                      <span>{getEntityName(invitation)}</span>
                    )}
                    <span>
                      Sendt:{" "}
                      {format(new Date(invitation.created_at), "d. MMM yyyy", {
                        locale: nb,
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {!invitation.accepted && new Date(invitation.expires_at) >= new Date() && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resendInvitation(invitation)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Send på nytt
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInvitationLink(invitation.token)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Kopier
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInvitationToDelete(invitation);
                    setDeleteDialogOpen(true);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {invitations.length === 0 && (
        <Card className="p-12 text-center">
          <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Ingen invitasjoner ennå
          </h3>
          <p className="text-muted-foreground mb-4">
            Send din første invitasjon for å legge til brukere
          </p>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slett invitasjon</DialogTitle>
            <DialogDescription>
              Er du sikker på at du vil slette invitasjonen til {invitationToDelete?.email}? Denne handlingen kan ikke angres.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Avbryt
            </Button>
            <Button variant="destructive" onClick={handleDeleteInvitation}>
              Slett
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};