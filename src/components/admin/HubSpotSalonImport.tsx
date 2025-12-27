import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { 
  Search, Building2, MapPin, Phone, Globe, Loader2, Check, AlertCircle, 
  Download, Hash, Users, ChevronDown, ChevronUp, Mail, Briefcase 
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface HubSpotCompany {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    city?: string;
    phone?: string;
    industry?: string;
    address?: string;
    zip?: string;
    orgnr?: string;
    organisasjonsnummer?: string;
    lifecyclestage?: string;
    type?: string;
    hs_object_id?: string;
    // Membership fields
    medlemsavgift?: string;
    medlmestype?: string;
    type_medlemskap?: string;
    bankkontonummer?: string;
    kundenummer?: string;
  };
  owner?: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

interface HubSpotContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    stilling?: string;
    leverandrrolle?: string;
  };
  selected?: boolean;
  suggestedRole?: AppRole;
  overrideRole?: AppRole;
}

interface District {
  id: string;
  name: string;
}

interface HubSpotSalonImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
  existingHubSpotIds: string[];
  districts: District[];
}

// Map HubSpot supplier role ("leverandrrolle") to app role
const mapSupplierRoleToAppRole = (leverandrrolle: string | undefined): AppRole | null => {
  if (!leverandrrolle) return null;
  
  const role = leverandrrolle.toLowerCase();
  
  if (role.includes("admin") || role.includes("administrator")) {
    return "supplier_admin";
  }
  if (role.includes("salg") || role.includes("sales")) {
    return "supplier_sales";
  }
  if (role.includes("forretning") || role.includes("business") || role.includes("utvikling") || role.includes("dev")) {
    return "supplier_business_dev";
  }
  
  return null;
};

// Map HubSpot stilling to app role
// Priority order is critical - "Kjede Eier" must be checked before "Eier"
// Also checks leverandrrolle for supplier roles
const mapStillingToRole = (stilling: string | undefined, leverandrrolle?: string): AppRole => {
  // First check if this is a supplier role
  const supplierRole = mapSupplierRoleToAppRole(leverandrrolle);
  if (supplierRole) {
    return supplierRole;
  }
  
  if (!stilling) return "stylist";
  
  const title = stilling.toLowerCase();
  
  // Priority 1: Chain owner (must check before generic "eier")
  if (title.includes("kjede eier") || title.includes("kjedeeier") || title.includes("chain owner")) {
    return "chain_owner";
  }
  // Priority 2: Daglig leder
  if (title.includes("daglig leder") || title.includes("ceo") || title.includes("managing director")) {
    return "daglig_leder";
  }
  // Priority 3: Avdelingsleder
  if (title.includes("avdelingsleder") || title.includes("department manager") || title.includes("team lead")) {
    return "avdelingsleder";
  }
  // Priority 4: Styreleder
  if (title.includes("styreleder") || title.includes("chairman") || title.includes("board")) {
    return "styreleder";
  }
  // Priority 5: Salon owner (generic "eier")
  if (title.includes("eier") || title.includes("owner") || title.includes("innehaver")) {
    return "salon_owner";
  }
  // Priority 6: Apprentice
  if (title.includes("lærling") || title.includes("apprentice") || title.includes("trainee")) {
    return "apprentice";
  }
  // Priority 7: Stylist
  if (title.includes("frisør") || title.includes("stylist") || title.includes("hairdresser")) {
    return "stylist";
  }
  
  // Default: Stylist
  return "stylist";
};

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

const salonRoles: AppRole[] = ["salon_owner", "daglig_leder", "avdelingsleder", "styreleder", "stylist", "seniorfrisor", "apprentice"];

export const HubSpotSalonImport = ({
  open,
  onOpenChange,
  onImported,
  existingHubSpotIds,
  districts,
}: HubSpotSalonImportProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [results, setResults] = useState<HubSpotCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<HubSpotCompany | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  
  // Contact import state
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contacts, setContacts] = useState<HubSpotContact[]>([]);
  const [contactsExpanded, setContactsExpanded] = useState(true);
  const [existingEmails, setExistingEmails] = useState<string[]>([]);
  
  // Owner-district mapping for auto-assignment
  const [ownerDistrictMapping, setOwnerDistrictMapping] = useState<Record<string, string>>({});
  const [districtAutoSelected, setDistrictAutoSelected] = useState(false);

  useEffect(() => {
    if (open) {
      checkHubSpotConnection();
      fetchExistingEmails();
      fetchOwnerDistrictMapping();
      setSearchQuery("");
      setResults([]);
      setSelectedCompany(null);
      setSelectedDistrictId("");
      setContacts([]);
      setDistrictAutoSelected(false);
    }
  }, [open]);

  const fetchOwnerDistrictMapping = async () => {
    const { data } = await supabase
      .from("hubspot_owner_district_mapping")
      .select("hubspot_owner_id, district_id");
    
    if (data) {
      const mapping: Record<string, string> = {};
      data.forEach(row => {
        if (row.district_id) {
          mapping[row.hubspot_owner_id] = row.district_id;
        }
      });
      setOwnerDistrictMapping(mapping);
    }
  };

  const fetchExistingEmails = async () => {
    const { data } = await supabase.from("users").select("email");
    setExistingEmails((data || []).map(u => u.email.toLowerCase()));
  };

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
    setSelectedCompany(null);
    setContacts([]);

    try {
      const { data, error } = await supabase.functions.invoke("hubspot-api", {
        body: { action: "search_companies", query: searchQuery },
      });

      if (error) throw error;

      // Filter out companies already linked
      const filteredResults = (data.results || []).filter(
        (company: HubSpotCompany) => !existingHubSpotIds.includes(company.id)
      );

      setResults(filteredResults);

      if (filteredResults.length === 0 && data.results?.length > 0) {
        toast.info("Alle treff er allerede koblet til salonger");
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

  const handleSelectCompany = async (company: HubSpotCompany) => {
    setSelectedCompany(company);
    setContacts([]);
    setDistrictAutoSelected(false);
    
    // Auto-set district based on HubSpot owner mapping
    if (company.owner?.id && ownerDistrictMapping[company.owner.id]) {
      setSelectedDistrictId(ownerDistrictMapping[company.owner.id]);
      setDistrictAutoSelected(true);
    } else {
      setSelectedDistrictId("");
    }
    
    // Fetch associated contacts
    setLoadingContacts(true);
    try {
      const { data, error } = await supabase.functions.invoke("hubspot-api", {
        body: { action: "get_company_contacts", companyId: company.id },
      });

      if (error) throw error;

      // Process contacts and suggest roles
      const processedContacts: HubSpotContact[] = (data.contacts || []).map((contact: any) => {
        const email = contact.properties?.email?.toLowerCase() || "";
        const alreadyExists = existingEmails.includes(email);
        const suggestedRole = mapStillingToRole(contact.properties?.stilling, contact.properties?.leverandrrolle);
        
        return {
          ...contact,
          selected: !alreadyExists && !!email, // Auto-select if not already exists and has email
          suggestedRole,
          overrideRole: undefined,
          alreadyExists,
        };
      });

      setContacts(processedContacts);
      setContactsExpanded(true);
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
      toast.error("Kunne ikke hente kontakter fra HubSpot");
    } finally {
      setLoadingContacts(false);
    }
  };

  const toggleContactSelection = (contactId: string) => {
    setContacts(prev => prev.map(c => 
      c.id === contactId ? { ...c, selected: !c.selected } : c
    ));
  };

  const updateContactRole = (contactId: string, role: AppRole) => {
    setContacts(prev => prev.map(c => 
      c.id === contactId ? { ...c, overrideRole: role } : c
    ));
  };

  const handleImport = async () => {
    if (!selectedCompany) return;

    setImporting(true);
    try {
      const { properties } = selectedCompany;

      // Fetch full company data from HubSpot to get all membership fields
      let fullProps = properties;
      try {
        const { data: fullData } = await supabase.functions.invoke("hubspot-api", {
          body: { action: "get_company", companyId: selectedCompany.id },
        });
        if (fullData?.properties) {
          fullProps = { ...properties, ...fullData.properties };
        }
      } catch (e) {
        console.warn("Could not fetch full HubSpot data, using search results:", e);
      }

      // Create salon with ALL HubSpot data saved locally (Hår1 as master)
      const salonInsertData: Record<string, any> = {
        name: fullProps.name || "Ukjent",
        address: fullProps.address || null,
        city: fullProps.city ? (fullProps.zip ? `${fullProps.zip} ${fullProps.city}` : fullProps.city) : null,
        district_id: selectedDistrictId && selectedDistrictId !== "none" ? selectedDistrictId : null,
        hs_object_id: selectedCompany.id,
        hubspot_synced_at: new Date().toISOString(),
        org_number: fullProps.orgnr || fullProps.organisasjonsnummer || null,
        // Membership fields from HubSpot (saved locally - Hår1 is now master)
        lifecyclestage: fullProps.lifecyclestage || null,
        medlemsavgift: fullProps.medlemsavgift ? parseFloat(fullProps.medlemsavgift) : null,
        medlemsstatus: fullProps.medlmestype || null,
        bankkontonummer: fullProps.bankkontonummer || null,
        medlemsnummer: fullProps.kundenummer || null, // kundenummer = medlemsnummer/tripletex_kunde_id
      };
      
      // Map type_medlemskap only if it matches enum values
      const validTypeMedlemskap = ['salong', 'skole', 'stol', 'hjemmesalong', 'barber'];
      if (fullProps.type_medlemskap && validTypeMedlemskap.includes(fullProps.type_medlemskap.toLowerCase())) {
        salonInsertData.type_medlemskap = fullProps.type_medlemskap.toLowerCase();
      }
      
      const { data: salonData, error: salonError } = await supabase
        .from("salons")
        .insert(salonInsertData as any)
        .select()
        .single();

      if (salonError) throw salonError;

      // Get current user for invitation creation
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create invitations for selected contacts
      const selectedContacts = contacts.filter(c => c.selected && c.properties.email);
      let invitationsSent = 0;

      for (const contact of selectedContacts) {
        const email = contact.properties.email!;
        const role = contact.overrideRole || contact.suggestedRole || "stylist";
        const token = crypto.randomUUID();

        // Create invitation with hubspot_contact_id
        const { error: invError } = await supabase.from("invitations").insert({
          email,
          role,
          salon_id: salonData.id,
          token,
          hubspot_contact_id: contact.id,
          created_by_user_id: user?.id,
        });

        if (invError) {
          console.error(`Failed to create invitation for ${email}:`, invError);
          continue;
        }

        // Send invitation email
        try {
          await supabase.functions.invoke("send-invitation-email", {
            body: {
              email,
              token,
              role,
              salonName: fullProps.name,
              recipientName: `${contact.properties.firstname || ""} ${contact.properties.lastname || ""}`.trim() || undefined,
            },
          });
          invitationsSent++;
        } catch (emailError) {
          console.error(`Failed to send invitation email to ${email}:`, emailError);
        }
      }

      if (invitationsSent > 0) {
        toast.success(`Salong "${fullProps.name}" importert med ${invitationsSent} invitasjon${invitationsSent > 1 ? "er" : ""} sendt!`);
      } else {
        toast.success(`Salong "${fullProps.name}" importert fra HubSpot!`);
      }
      
      onImported();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Kunne ikke importere salong");
    } finally {
      setImporting(false);
    }
  };

  const selectedContactsCount = contacts.filter(c => c.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Importer salong fra HubSpot
          </DialogTitle>
          <DialogDescription>
            Søk etter selskaper i HubSpot og importer dem som nye salonger med tilhørende kontakter.
          </DialogDescription>
        </DialogHeader>

        {checkingConnection ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !isConnected ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <p className="font-medium text-foreground">HubSpot ikke tilkoblet</p>
              <p className="text-sm text-muted-foreground">
                Du må koble til HubSpot først i HubSpot-fanen.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0 pr-2">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="flex gap-2">
                <Input
                  placeholder="Søk etter selskapsnavn..."
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
              <div className="space-y-2">
                {results.length === 0 && searchQuery && !searching && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Ingen resultater funnet. Prøv et annet søkeord.
                  </p>
                )}

                {results.map((company) => (
                  <Card
                    key={company.id}
                    className={`p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedCompany?.id === company.id ? "ring-2 ring-primary bg-muted/50" : ""
                    }`}
                    onClick={() => handleSelectCompany(company)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground truncate">
                            {company.properties.name || "Ukjent"}
                          </span>
                          {selectedCompany?.id === company.id && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {company.properties.organisasjonsnummer && (
                            <span className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {company.properties.organisasjonsnummer}
                            </span>
                          )}
                          {company.properties.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {company.properties.city}
                            </span>
                          )}
                          {company.properties.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {company.properties.phone}
                            </span>
                          )}
                          {company.properties.domain && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {company.properties.domain}
                            </span>
                          )}
                        </div>
                        {company.properties.industry && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {company.properties.industry}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Import form */}
              {selectedCompany && (
                <div className="border-t pt-4 space-y-4">
                  {/* Company Info Card */}
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-3 h-auto bg-muted/50 hover:bg-muted">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span className="font-medium">Selskapsinfo</span>
                        </div>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="max-h-[200px] overflow-y-auto border rounded-md mt-2 p-3 bg-background">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Navn</p>
                            <p className="font-medium truncate">{selectedCompany.properties.name || "–"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Org.nummer</p>
                            <p className="font-medium">{selectedCompany.properties.orgnr || selectedCompany.properties.organisasjonsnummer || "–"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Domene</p>
                            <p className="font-medium truncate">{selectedCompany.properties.domain || "–"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Telefon</p>
                            <p className="font-medium">{selectedCompany.properties.phone || "–"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Adresse</p>
                            <p className="font-medium truncate">{selectedCompany.properties.address || "–"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">By</p>
                            <p className="font-medium">{selectedCompany.properties.city || "–"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Postnummer</p>
                            <p className="font-medium">{selectedCompany.properties.zip || "–"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Livssyklus</p>
                            <p className="font-medium">{selectedCompany.properties.lifecyclestage || "–"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Type</p>
                            <p className="font-medium">{selectedCompany.properties.type || "–"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Bransje</p>
                            <p className="font-medium">{selectedCompany.properties.industry || "–"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">HubSpot ID</p>
                            <p className="font-medium font-mono text-xs">{selectedCompany.id}</p>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="space-y-2">
                    <Label htmlFor="district">Tilknytt distrikt</Label>
                    <Select value={selectedDistrictId} onValueChange={(val) => {
                      setSelectedDistrictId(val);
                      setDistrictAutoSelected(false);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Velg distrikt..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ingen</SelectItem>
                        {districts.map((district) => (
                          <SelectItem key={district.id} value={district.id}>
                            {district.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {districtAutoSelected && (
                      <p className="text-xs text-muted-foreground">
                        Automatisk valgt basert på HubSpot-eier
                      </p>
                    )}
                  </div>

                  {/* Contacts section */}
                  <Collapsible open={contactsExpanded} onOpenChange={setContactsExpanded}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">
                            Tilknyttede kontakter
                            {contacts.length > 0 && (
                              <Badge variant="secondary" className="ml-2">
                                {selectedContactsCount} av {contacts.length} valgt
                              </Badge>
                            )}
                          </span>
                        </div>
                        {contactsExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {loadingContacts ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">Henter kontakter...</span>
                        </div>
                      ) : contacts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Ingen kontakter funnet for dette selskapet i HubSpot.
                        </p>
                      ) : (
                        <div className="max-h-[250px] overflow-y-auto border rounded-md p-2">
                          <div className="space-y-2">
                            {contacts.map((contact) => {
                              const alreadyExists = existingEmails.includes(contact.properties.email?.toLowerCase() || "");
                              const hasEmail = !!contact.properties.email;
                              
                              return (
                                <Card 
                                  key={contact.id} 
                                  className={`p-3 ${alreadyExists ? "opacity-50" : ""}`}
                                >
                                  <div className="flex items-start gap-3">
                                    <Checkbox
                                      checked={contact.selected}
                                      onCheckedChange={() => toggleContactSelection(contact.id)}
                                      disabled={alreadyExists || !hasEmail}
                                    />
                                    <div className="flex-1 min-w-0 space-y-2">
                                      <div>
                                        <p className="font-medium text-foreground text-sm">
                                          {contact.properties.firstname || ""} {contact.properties.lastname || ""}
                                          {!contact.properties.firstname && !contact.properties.lastname && "Ukjent"}
                                        </p>
                                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
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
                                          {contact.properties.stilling && (
                                            <span className="flex items-center gap-1">
                                              <Briefcase className="h-3 w-3" />
                                              {contact.properties.stilling}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {alreadyExists && (
                                        <Badge variant="outline" className="text-xs">
                                          Allerede registrert
                                        </Badge>
                                      )}
                                      
                                      {!alreadyExists && !hasEmail && (
                                        <Badge variant="outline" className="text-xs text-destructive">
                                          Mangler e-post
                                        </Badge>
                                      )}
                                      
                                      {contact.selected && hasEmail && !alreadyExists && (
                                        <div className="flex items-center gap-2">
                                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Rolle:</Label>
                                          <Select
                                            value={contact.overrideRole || contact.suggestedRole || "stylist"}
                                            onValueChange={(value) => updateContactRole(contact.id, value as AppRole)}
                                          >
                                            <SelectTrigger className="h-7 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {salonRoles.map((role) => (
                                                <SelectItem key={role} value={role}>
                                                  {roleLabels[role]}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  <Button
                    onClick={handleImport}
                    disabled={importing}
                    className="w-full"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Importerer...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Importer salong
                        {selectedContactsCount > 0 && ` og send ${selectedContactsCount} invitasjon${selectedContactsCount > 1 ? "er" : ""}`}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};