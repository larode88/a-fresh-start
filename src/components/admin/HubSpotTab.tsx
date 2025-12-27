import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Link2, Link2Off, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { HubSpotOwnerMapping } from "./HubSpotOwnerMapping";

const HUBSPOT_CLIENT_ID = "8a0758c6-2459-4085-ac06-d672f42b0adc";

interface ConnectionStatus {
  connected: boolean;
  expires_at?: string;
  updated_at?: string;
  is_expired?: boolean;
}

const HubSpotTab = () => {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [subscriptionTypes, setSubscriptionTypes] = useState<any[]>([]);

  const checkStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("hubspot-auth", {
        body: { action: "status" },
      });

      if (error) throw error;
      setStatus(data);
    } catch (err) {
      console.error("Failed to check HubSpot status:", err);
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleConnect = () => {
    const redirectUri = `${window.location.origin}/auth/hubspot/callback`;
    const scopes = "oauth crm.objects.companies.write crm.objects.companies.read crm.objects.contacts.read crm.objects.contacts.write crm.objects.subscriptions.read crm.objects.subscriptions.write crm.objects.owners.read crm.schemas.contacts.read";
    // EU HubSpot OAuth endpoint
    const authUrl = `https://app-eu1.hubspot.com/oauth/authorize?client_id=${HUBSPOT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
    
    console.log("HubSpot OAuth redirect URI:", redirectUri);
    console.log("HubSpot OAuth full URL:", authUrl);
    
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    if (!confirm("Er du sikker på at du vil koble fra HubSpot?")) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke("hubspot-auth", {
        body: { action: "disconnect" },
      });

      if (error) throw error;

      toast.success("HubSpot er frakoblet");
      setStatus({ connected: false });
    } catch (err) {
      console.error("Failed to disconnect:", err);
      toast.error("Kunne ikke koble fra HubSpot");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("hubspot-auth", {
        body: { action: "refresh" },
      });

      if (error) throw error;

      toast.success("Token oppdatert");
      checkStatus();
    } catch (err) {
      console.error("Failed to refresh token:", err);
      toast.error("Kunne ikke oppdatere token");
    } finally {
      setActionLoading(false);
    }
  };

  const fetchSubscriptionTypes = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("hubspot-api", {
        body: { action: "get_subscription_types" },
      });

      if (error) throw error;

      console.log("Subscription types:", data);
      setSubscriptionTypes(data.subscriptionTypes || []);
      toast.success(`Fant ${data.subscriptionTypes?.length || 0} subscription types`);
    } catch (err) {
      console.error("Failed to fetch subscription types:", err);
      toast.error("Kunne ikke hente subscription types");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img 
              src="https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png" 
              alt="HubSpot" 
              className="h-6 w-6"
            />
            HubSpot Integrasjon
          </CardTitle>
          <CardDescription>
            Koble til HubSpot for å synkronisere salonger og brukere med ditt CRM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              {status?.connected ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Tilkoblet
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Ikke tilkoblet
                </Badge>
              )}
            </div>

            {status?.is_expired && (
              <Badge variant="destructive">Token utløpt</Badge>
            )}
          </div>

          {status?.connected && status.updated_at && (
            <div className="text-sm text-muted-foreground">
              <p>
                Sist oppdatert:{" "}
                {format(new Date(status.updated_at), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb })}
              </p>
              {status.expires_at && (
                <p>
                  Token utløper:{" "}
                  {format(new Date(status.expires_at), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb })}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {status?.connected ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleRefreshToken}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Oppdater Token
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Link2Off className="h-4 w-4 mr-2" />
                  )}
                  Koble fra
                </Button>
              </>
            ) : (
              <Button onClick={handleConnect}>
                <Link2 className="h-4 w-4 mr-2" />
                Koble til HubSpot
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {status?.connected && (
        <>
          <HubSpotOwnerMapping />

          <Card>
            <CardHeader>
              <CardTitle>Subscription Types (Test)</CardTitle>
              <CardDescription>
                Hent og vis subscription types fra HubSpot for nyhetsbrev-funksjonalitet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                onClick={fetchSubscriptionTypes}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Hent Subscription Types
              </Button>

              {subscriptionTypes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Fant {subscriptionTypes.length} subscription types:</p>
                  <div className="bg-muted p-4 rounded-lg overflow-auto max-h-64">
                    <pre className="text-xs">{JSON.stringify(subscriptionTypes, null, 2)}</pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Synkronisering</CardTitle>
              <CardDescription>
                Du kan nå koble salonger, leverandører og brukere til HubSpot fra deres respektive faner.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Gå til <strong>Salonger</strong>-fanen for å koble salonger til HubSpot companies</li>
                <li>Gå til <strong>Leverandører</strong>-fanen for å koble leverandører til HubSpot companies</li>
                <li>Gå til <strong>Brukere</strong>-fanen for å koble brukere til HubSpot contacts</li>
                <li>Tokens oppdateres automatisk ved behov</li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default HubSpotTab;
