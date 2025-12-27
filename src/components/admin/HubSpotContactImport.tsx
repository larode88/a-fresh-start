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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Search, User, Mail, Phone, Building2, Loader2, UserPlus, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HubSpotContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    company?: string;
  };
}

interface District {
  id: string;
  name: string;
}

interface Salon {
  id: string;
  name: string;
}

interface HubSpotContactImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
  existingEmails: string[];
  districts: District[];
  salons: Salon[];
}

type AppRole = "admin" | "district_manager" | "salon_owner" | "chain_owner" | "daglig_leder" | "avdelingsleder" | "styreleder" | "stylist" | "seniorfrisor" | "apprentice" | "supplier_admin" | "supplier_sales" | "supplier_business_dev";

const roleLabels: Record<AppRole, string> = {
  admin: "Administrator",
  district_manager: "Distriktssjef",
  salon_owner: "Salongeier",
  chain_owner: "Kjedeeier",
  daglig_leder: "Daglig leder",
  avdelingsleder: "Avdelingsleder",
  styreleder: "Styreleder",
  stylist: "Frisør",
  seniorfrisor: "Seniorfrisør",
  apprentice: "Lærling",
  supplier_admin: "Leverandør Admin",
  supplier_sales: "Leverandør Salg",
  supplier_business_dev: "Leverandør Forretningsutvikling",
};

export const HubSpotContactImport = ({
  open,
  onOpenChange,
  onImported,
  existingEmails,
  districts,
  salons,
}: HubSpotContactImportProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [results, setResults] = useState<HubSpotContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<HubSpotContact | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("stylist");
  const [selectedSalonId, setSelectedSalonId] = useState<string>("none");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("none");

  useEffect(() => {
    if (open) {
      checkHubSpotConnection();
      setSearchQuery("");
      setResults([]);
      setSelectedContact(null);
      setSelectedRole("stylist");
      setSelectedSalonId("none");
      setSelectedDistrictId("none");
    }
  }, [open]);

  const checkHubSpotConnection = async () => {
    setCheckingConnection(true);
    try {
      const { data, error } = await supabase
        .from("hubspot_oauth_tokens")
        .select("id")
        .limit(1)
        .maybeSingle();

      setIsConnected(!error && !!data);
    } catch {
      setIsConnected(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSelectedContact(null);

    try {
      const { data, error } = await supabase.functions.invoke("hubspot-api", {
        body: { action: "search_contacts", query: searchQuery },
      });

      if (error) throw error;

      // Filter out contacts that already exist as users
      const filtered = (data.results || []).filter((contact: HubSpotContact) => {
        const email = contact.properties.email?.toLowerCase();
        return email && !existingEmails.includes(email);
      });

      setResults(filtered);

      if (filtered.length === 0 && (data.results || []).length > 0) {
        toast.info("Alle treff er allerede registrert som brukere");
      }
    } catch (error: any) {
      console.error("Search error:", error);
      toast.error("Kunne ikke søke i HubSpot");
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelectContact = (contact: HubSpotContact) => {
    setSelectedContact(contact);
  };

  const getContactName = (contact: HubSpotContact) => {
    const { firstname, lastname } = contact.properties;
    if (firstname && lastname) return `${firstname} ${lastname}`;
    if (firstname) return firstname;
    if (lastname) return lastname;
    return contact.properties.email || "Ukjent";
  };

  const requiresSalon = (role: AppRole) => {
    return ["salon_owner", "daglig_leder", "avdelingsleder", "styreleder", "stylist", "seniorfrisor", "apprentice"].includes(role);
  };

  const requiresDistrict = (role: AppRole) => {
    return role === "district_manager";
  };

  const handleImport = async () => {
    if (!selectedContact || !selectedContact.properties.email) return;

    // Validation
    if (requiresSalon(selectedRole) && selectedSalonId === "none") {
      toast.error("Velg en salong for denne rollen");
      return;
    }
    if (requiresDistrict(selectedRole) && selectedDistrictId === "none") {
      toast.error("Velg et distrikt for denne rollen");
      return;
    }

    setImporting(true);
    try {
      const { properties } = selectedContact;
      const token = `inv_${crypto.randomUUID()}`;

      // Create invitation
      const { error } = await supabase.from("invitations").insert({
        email: properties.email,
        role: selectedRole,
        token,
        salon_id: requiresSalon(selectedRole) && selectedSalonId !== "none" ? selectedSalonId : null,
        district_id: requiresDistrict(selectedRole) && selectedDistrictId !== "none" ? selectedDistrictId : null,
      });

      if (error) throw error;

      // Send invitation email
      try {
        const PRODUCTION_URL = "https://har1portalen.no";
        const selectedSalon = salons.find(s => s.id === selectedSalonId);
        const invitationUrl = `${PRODUCTION_URL}/onboarding?token=${token}`;
        await supabase.functions.invoke("send-invitation-email", {
          body: {
            email: properties.email,
            role: selectedRole,
            salonName: selectedSalon?.name,
            invitationUrl,
          },
        });
      } catch (emailError) {
        console.error("Could not send invitation email:", emailError);
      }

      toast.success(`Invitasjon sendt til ${properties.email}!`);
      onImported();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Kunne ikke opprette invitasjon");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Inviter bruker fra HubSpot
          </DialogTitle>
          <DialogDescription>
            Søk etter kontakter i HubSpot og send invitasjoner
          </DialogDescription>
        </DialogHeader>

        {checkingConnection ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !isConnected ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-muted-foreground text-center">
              HubSpot er ikke tilkoblet. Koble til HubSpot først i HubSpot-fanen.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Search */}
            <div className="flex gap-2">
              <Input
                placeholder="Søk etter navn eller e-post..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Results */}
            <ScrollArea className="flex-1 min-h-0 max-h-[250px]">
              <div className="space-y-2 pr-4">
                {results.length === 0 && searchQuery && !searching && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Ingen resultater funnet. Prøv et annet søkeord.
                  </p>
                )}

                {results.map((contact) => (
                  <Card
                    key={contact.id}
                    className={`p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedContact?.id === contact.id ? "ring-2 ring-primary bg-muted/50" : ""
                    }`}
                    onClick={() => handleSelectContact(contact)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {getContactName(contact)}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                          {contact.properties.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {contact.properties.email}
                            </span>
                          )}
                          {contact.properties.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {contact.properties.phone}
                            </span>
                          )}
                          {contact.properties.company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {contact.properties.company}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {/* Import form */}
            {selectedContact && (
              <div className="border-t pt-4 space-y-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm font-medium text-foreground mb-1">Valgt kontakt:</p>
                  <p className="text-sm text-muted-foreground">
                    {getContactName(selectedContact)} – {selectedContact.properties.email}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Rolle</Label>
                    <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {requiresSalon(selectedRole) && (
                    <div className="space-y-2">
                      <Label>Salong</Label>
                      <Select value={selectedSalonId} onValueChange={setSelectedSalonId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Velg salong..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Velg salong...</SelectItem>
                          {salons.map((salon) => (
                            <SelectItem key={salon.id} value={salon.id}>
                              {salon.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {requiresDistrict(selectedRole) && (
                    <div className="space-y-2">
                      <Label>Distrikt</Label>
                      <Select value={selectedDistrictId} onValueChange={setSelectedDistrictId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Velg distrikt..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Velg distrikt...</SelectItem>
                          {districts.map((district) => (
                            <SelectItem key={district.id} value={district.id}>
                              {district.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sender invitasjon...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Send invitasjon
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
