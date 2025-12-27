import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { Loader2, RefreshCw, User, MapPin } from "lucide-react";

interface HubSpotOwner {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface District {
  id: string;
  name: string;
}

interface OwnerMapping {
  id: string;
  hubspot_owner_id: string;
  hubspot_owner_email: string | null;
  hubspot_owner_name: string | null;
  district_id: string | null;
}

export const HubSpotOwnerMapping = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [owners, setOwners] = useState<HubSpotOwner[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [mappings, setMappings] = useState<OwnerMapping[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [districtsRes, mappingsRes] = await Promise.all([
        supabase.from("districts").select("*").order("name"),
        supabase.from("hubspot_owner_district_mapping").select("*"),
      ]);

      setDistricts(districtsRes.data || []);
      setMappings(mappingsRes.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const syncOwners = async (retryCount = 0) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("hubspot-api", {
        body: { action: "get_owners" },
      });

      if (error) {
        // Retry on 401 errors (transient auth issues)
        if (error.message?.includes("401") && retryCount < 2) {
          console.log(`Retrying due to auth error (attempt ${retryCount + 1})...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return syncOwners(retryCount + 1);
        }
        throw error;
      }

      const hubspotOwners: HubSpotOwner[] = (data.results || []).map((o: any) => ({
        id: o.id,
        email: o.email,
        firstName: o.firstName,
        lastName: o.lastName,
      }));

      setOwners(hubspotOwners);

      // Upsert owners to mapping table (without district assignment)
      for (const owner of hubspotOwners) {
        const existing = mappings.find(m => m.hubspot_owner_id === owner.id);
        if (!existing) {
          await supabase.from("hubspot_owner_district_mapping").insert({
            hubspot_owner_id: owner.id,
            hubspot_owner_email: owner.email,
            hubspot_owner_name: `${owner.firstName} ${owner.lastName}`.trim(),
          });
        } else {
          // Update name/email if changed
          await supabase.from("hubspot_owner_district_mapping")
            .update({
              hubspot_owner_email: owner.email,
              hubspot_owner_name: `${owner.firstName} ${owner.lastName}`.trim(),
            })
            .eq("id", existing.id);
        }
      }

      await fetchData();
      toast.success(`Hentet ${hubspotOwners.length} HubSpot-eiere`);
    } catch (error: any) {
      console.error("Failed to sync owners:", error);
      toast.error("Kunne ikke hente HubSpot-eiere");
    } finally {
      setSyncing(false);
    }
  };

  const handleDistrictChange = async (mappingId: string, districtId: string | null) => {
    setSaving(mappingId);
    try {
      const { error } = await supabase
        .from("hubspot_owner_district_mapping")
        .update({ district_id: districtId || null })
        .eq("id", mappingId);

      if (error) throw error;

      setMappings(prev =>
        prev.map(m => (m.id === mappingId ? { ...m, district_id: districtId } : m))
      );

      toast.success("Distrikt oppdatert");
    } catch (error: any) {
      console.error("Failed to update mapping:", error);
      toast.error("Kunne ikke oppdatere mapping");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Owner-Distrikt Mapping
            </CardTitle>
            <CardDescription>
              Koble HubSpot Contact Owners til distrikter for automatisk tilordning ved import
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => syncOwners()} disabled={syncing}>
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Hent Owners fra HubSpot
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {mappings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Ingen HubSpot-eiere funnet.</p>
            <p className="text-sm mt-1">Klikk "Hent Owners fra HubSpot" for å synkronisere.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>HubSpot Owner</TableHead>
                <TableHead>E-post</TableHead>
                <TableHead>Distrikt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell className="font-medium">
                    {mapping.hubspot_owner_name || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {mapping.hubspot_owner_email || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={mapping.district_id || "none"}
                        onValueChange={(value) =>
                          handleDistrictChange(mapping.id, value === "none" ? null : value)
                        }
                        disabled={saving === mapping.id}
                      >
                        <SelectTrigger className="w-[240px]">
                          <SelectValue placeholder="Velg distrikt" />
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
                      {saving === mapping.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
