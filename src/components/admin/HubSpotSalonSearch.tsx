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
import { toast } from "sonner";
import { Search, Loader2, Link2, Building2, Globe, Phone, MapPin, Link2Off, AlertTriangle, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HubSpotCompany {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    city?: string;
    phone?: string;
    industry?: string;
  };
}

interface HubSpotSalonSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salon: {
    id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    org_number?: string | null;
    hs_object_id?: string | null;
    hubspot_synced_at?: string | null;
  } | null;
  onLinked: () => void;
}

export const HubSpotSalonSearch = ({
  open,
  onOpenChange,
  salon,
  onLinked,
}: HubSpotSalonSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<HubSpotCompany[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);

  useEffect(() => {
    if (open) {
      checkHubSpotConnection();
      setSearchQuery("");
      setResults([]);
      setHasSearched(false);
    }
  }, [open]);

  const checkHubSpotConnection = async () => {
    setCheckingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke("hubspot-auth", {
        body: { action: "status" },
      });
      if (error) throw error;
      setIsConnected(data?.connected || false);
    } catch (err) {
      console.error("Failed to check HubSpot status:", err);
      setIsConnected(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("hubspot-api", {
        body: {
          action: "search_companies",
          query: searchQuery,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResults(data?.results || []);
    } catch (err) {
      console.error("HubSpot search error:", err);
      toast.error("Kunne ikke søke i HubSpot");
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleLink = async (companyId: string) => {
    if (!salon) return;

    setLinking(true);
    try {
      const { error } = await supabase
        .from("salons")
        .update({
          hs_object_id: companyId,
          hubspot_synced_at: new Date().toISOString(),
        })
        .eq("id", salon.id);

      if (error) throw error;

      toast.success("Salong koblet til HubSpot company");
      onLinked();
      onOpenChange(false);
    } catch (err) {
      console.error("Link error:", err);
      toast.error("Kunne ikke koble til HubSpot");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (!salon) return;

    setLinking(true);
    try {
      const { error } = await supabase
        .from("salons")
        .update({
          hs_object_id: null,
          hubspot_synced_at: null,
        })
        .eq("id", salon.id);

      if (error) throw error;

      toast.success("HubSpot-kobling fjernet");
      onLinked();
      onOpenChange(false);
    } catch (err) {
      console.error("Unlink error:", err);
      toast.error("Kunne ikke fjerne HubSpot-kobling");
    } finally {
      setLinking(false);
    }
  };

  const handleSyncToHubSpot = async () => {
    if (!salon || !salon.hs_object_id) return;

    setSyncing(true);
    try {
      // Prepare properties to sync
      const properties: Record<string, string> = {
        name: salon.name,
      };
      
      if (salon.address) properties.address = salon.address;
      if (salon.city) {
        // Extract city name from "postnummer city" format if present
        const cityParts = salon.city.split(' ');
        properties.city = cityParts.length > 1 ? cityParts.slice(1).join(' ') : salon.city;
        if (cityParts.length > 1 && /^\d+$/.test(cityParts[0])) {
          properties.zip = cityParts[0];
        }
      }

      const { data, error } = await supabase.functions.invoke("hubspot-api", {
        body: {
          action: "update_company",
          companyId: salon.hs_object_id,
          properties,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update sync timestamp
      await supabase
        .from("salons")
        .update({ hubspot_synced_at: new Date().toISOString() })
        .eq("id", salon.id);

      toast.success("Salongdata synkronisert til HubSpot");
      onLinked();
    } catch (err: any) {
      console.error("Sync error:", err);
      toast.error(err.message || "Kunne ikke synkronisere til HubSpot");
    } finally {
      setSyncing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const formatSyncDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleString("nb-NO", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img
              src="https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png"
              alt="HubSpot"
              className="h-5 w-5"
            />
            {salon?.hs_object_id ? "HubSpot-kobling" : "Koble til HubSpot"} – {salon?.name}
          </DialogTitle>
          <DialogDescription>
          {salon?.hs_object_id 
              ? "Administrer HubSpot-kobling og synkroniser data"
              : "Søk etter et selskap i HubSpot og koble det til denne salongen"}
          </DialogDescription>
        </DialogHeader>

        {checkingConnection ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !isConnected ? (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
            <div>
              <p className="font-medium">HubSpot er ikke tilkoblet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Du må koble til HubSpot først i HubSpot-fanen før du kan søke etter selskaper.
              </p>
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
            >
              Lukk
            </Button>
          </div>
        ) : (
          <>
            {salon?.hs_object_id && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Koblet til HubSpot</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnlink}
                    disabled={linking}
                    className="text-destructive hover:text-destructive"
                  >
                    {linking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Link2Off className="h-4 w-4 mr-1" />
                        Fjern kobling
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Company ID: <code>{salon.hs_object_id}</code></p>
                  {salon.hubspot_synced_at && (
                    <p>Sist synkronisert: {formatSyncDate(salon.hubspot_synced_at)}</p>
                  )}
                </div>

                <Button
                  onClick={handleSyncToHubSpot}
                  disabled={syncing}
                  className="w-full"
                  variant="outline"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Synkroniserer...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Synkroniser til HubSpot
                    </>
                  )}
                </Button>
              </div>
            )}

            {!salon?.hs_object_id && (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Søk etter selskapsnavn..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={searching}
                  />
                  <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                    {searching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <ScrollArea className="h-[300px]">
                  {results.length > 0 ? (
                    <div className="space-y-2">
                      {results.map((company) => (
                        <div
                          key={company.id}
                          className="p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium truncate">
                                  {company.properties.name || "Uten navn"}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                {company.properties.domain && (
                                  <div className="flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    {company.properties.domain}
                                  </div>
                                )}
                                {company.properties.city && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {company.properties.city}
                                  </div>
                                )}
                                {company.properties.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {company.properties.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleLink(company.id)}
                              disabled={linking}
                            >
                              {linking ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Link2 className="h-3 w-3 mr-1" />
                                  Koble
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : hasSearched && !searching ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Ingen selskaper funnet</p>
                      <p className="text-xs">Prøv et annet søkeord</p>
                    </div>
                  ) : !hasSearched ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Søk etter et selskap i HubSpot</p>
                    </div>
                  ) : null}
                </ScrollArea>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
