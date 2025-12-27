import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    samarbeidspartnerleverandr?: string;
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
  alreadyExists?: boolean;
}

interface HubSpotSupplierImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
  existingHubSpotIds: string[];
}

// Map HubSpot leverandrrolle to supplier app role
const mapSupplierRole = (leverandrrolle: string | undefined): AppRole => {
  if (!leverandrrolle) return "supplier_sales";
  
  const role = leverandrrolle.toLowerCase();
  
  if (role.includes("admin") || role.includes("administrator") || role.includes("leder")) {
    return "supplier_admin";
  }
  if (role.includes("salg") || role.includes("sales") || role.includes("selger")) {
    return "supplier_sales";
  }
  if (role.includes("forretning") || role.includes("business") || role.includes("utvikling") || role.includes("dev")) {
    return "supplier_business_dev";
  }
  
  return "supplier_sales";
};

const roleLabels: Record<string, string> = {
  supplier_admin: "Leverandør Admin",
  supplier_sales: "Leverandør Salg",
  supplier_business_dev: "Leverandør Forretningsutvikling",
};

const supplierRoles: AppRole[] = ["supplier_admin", "supplier_sales", "supplier_business_dev"];

export const HubSpotSupplierImport = ({
  open,
  onOpenChange,
  onImported,
  existingHubSpotIds,
}: HubSpotSupplierImportProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [results, setResults] = useState<HubSpotCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<HubSpotCompany | null>(null);
  
  // Contact import state
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contacts, setContacts] = useState<HubSpotContact[]>([]);
  const [contactsExpanded, setContactsExpanded] = useState(true);
  const [existingEmails, setExistingEmails] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      checkHubSpotConnection();
      fetchExistingEmails();
      setSearchQuery("");
      setResults([]);
      setSelectedCompany(null);
      setContacts([]);
    }
  }, [open]);

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
    setSearching(true);
    setSelectedCompany(null);
    setContacts([]);

    try {
      const { data, error } = await supabase.functions.invoke("hubspot-api", {
        body: { action: "search_suppliers", query: searchQuery.trim() || undefined },
      });

      if (error) throw error;

      // Filter out companies already linked
      const filteredResults = (data.results || []).filter(
        (company: HubSpotCompany) => !existingHubSpotIds.includes(company.id)
      );

      setResults(filteredResults);

      if (filteredResults.length === 0 && data.results?.length > 0) {
        toast.info("Alle leverandører er allerede importert");
      } else if (filteredResults.length === 0) {
        toast.info("Ingen leverandører funnet i HubSpot");
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
        const suggestedRole = mapSupplierRole(contact.properties?.leverandrrolle);
        
        return {
          ...contact,
          selected: !alreadyExists && !!email,
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

      // Create supplier with HubSpot data
      const { data: supplierData, error: supplierError } = await supabase.from("suppliers").insert({
        name: properties.name || "Ukjent",
        hubspot_company_id: selectedCompany.id,
        hubspot_synced_at: new Date().toISOString(),
      }).select().single();

      if (supplierError) throw supplierError;

      // Get current user for invitation creation
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create invitations for selected contacts
      const selectedContacts = contacts.filter(c => c.selected && c.properties.email);
      let invitationsSent = 0;

      for (const contact of selectedContacts) {
        const email = contact.properties.email!;
        const role = contact.overrideRole || contact.suggestedRole || "supplier_sales";
        const token = crypto.randomUUID();

        // Create invitation with hubspot_contact_id and supplier_id
        const { error: invError } = await supabase.from("invitations").insert({
          email,
          role,
          supplier_id: supplierData.id,
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
              supplierName: properties.name,
              recipientName: `${contact.properties.firstname || ""} ${contact.properties.lastname || ""}`.trim() || undefined,
            },
          });
          invitationsSent++;
        } catch (emailError) {
          console.error(`Failed to send invitation email to ${email}:`, emailError);
        }
      }

      if (invitationsSent > 0) {
        toast.success(`Leverandør "${properties.name}" importert med ${invitationsSent} invitasjon${invitationsSent > 1 ? "er" : ""} sendt!`);
      } else {
        toast.success(`Leverandør "${properties.name}" importert fra HubSpot!`);
      }
      
      onImported();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Kunne ikke importere leverandør");
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
            Importer leverandør fra HubSpot
          </DialogTitle>
          <DialogDescription>
            Søk etter leverandører (samarbeidspartnerleverandør = Ja) i HubSpot og importer dem med teammedlemmer.
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
                  placeholder="Søk etter leverandørnavn (eller trykk søk for alle)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Results */}
              <div className="space-y-2">
                {results.length === 0 && !searching && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Trykk søk for å hente leverandører fra HubSpot
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
                          <Badge variant="secondary" className="text-xs">Leverandør</Badge>
                          {selectedCompany?.id === company.id && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {company.properties.orgnr && (
                            <span className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {company.properties.orgnr}
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
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Selected company details & contacts */}
              {selectedCompany && (
                <div className="border-t pt-4 space-y-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium text-foreground mb-1">Valgt leverandør:</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCompany.properties.name}
                      {selectedCompany.properties.city && ` – ${selectedCompany.properties.city}`}
                    </p>
                  </div>

                  {/* Contacts section */}
                  <Collapsible open={contactsExpanded} onOpenChange={setContactsExpanded}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">
                            Teammedlemmer {contacts.length > 0 && `(${selectedContactsCount}/${contacts.length} valgt)`}
                          </span>
                        </div>
                        {contactsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      {loadingContacts ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : contacts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Ingen kontakter funnet for denne leverandøren
                        </p>
                      ) : (
                        <ScrollArea className="max-h-[350px]">
                          <div className="space-y-2 pr-4">
                            {contacts.map((contact) => (
                              <div
                                key={contact.id}
                                className={`flex items-start gap-3 p-2 rounded-lg border ${
                                  contact.alreadyExists 
                                    ? "bg-muted/30 opacity-60" 
                                    : contact.selected 
                                      ? "bg-primary/5 border-primary/20" 
                                      : ""
                                }`}
                              >
                                <Checkbox
                                  checked={contact.selected}
                                  disabled={contact.alreadyExists}
                                  onCheckedChange={() => toggleContactSelection(contact.id)}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm truncate">
                                      {contact.properties.firstname} {contact.properties.lastname}
                                    </span>
                                    {contact.alreadyExists && (
                                      <Badge variant="outline" className="text-xs">Finnes allerede</Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                                    {contact.properties.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {contact.properties.email}
                                      </span>
                                    )}
                                    {contact.properties.leverandrrolle && (
                                      <span className="flex items-center gap-1">
                                        <Briefcase className="h-3 w-3" />
                                        {contact.properties.leverandrrolle}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {!contact.alreadyExists && (
                                  <Select
                                    value={contact.overrideRole || contact.suggestedRole}
                                    onValueChange={(value) => updateContactRole(contact.id, value as AppRole)}
                                    disabled={contact.alreadyExists}
                                  >
                                    <SelectTrigger className="w-[160px] h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {supplierRoles.map((role) => (
                                        <SelectItem key={role} value={role} className="text-xs">
                                          {roleLabels[role]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
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
                        Importer leverandør
                        {selectedContactsCount > 0 && ` med ${selectedContactsCount} invitasjon${selectedContactsCount > 1 ? "er" : ""}`}
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
