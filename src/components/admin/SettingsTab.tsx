import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, MailX, Loader2, Send, Users, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { Separator } from "@/components/ui/separator";

export function SettingsTab() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [sendingDMEmail, setSendingDMEmail] = useState(false);
  const [sendingSingleEmail, setSendingSingleEmail] = useState(false);
  const [dmDialogOpen, setDmDialogOpen] = useState(false);
  const [senderName, setSenderName] = useState(profile?.name || "");
  const [senderEmail, setSenderEmail] = useState(profile?.email || "");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");

  const { data: emailSetting, isLoading } = useQuery({
    queryKey: ["system-settings", "email_enabled"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("key", "email_enabled")
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: districtManagers } = useQuery({
    queryKey: ["district-managers-count"],
    queryFn: async () => {
      const { data: dmRoles, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "district_manager");
      
      if (error) throw error;
      
      if (!dmRoles || dmRoles.length === 0) return [];
      
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", dmRoles.map(r => r.user_id))
        .not("email", "is", null);
      
      if (usersError) throw usersError;
      return users || [];
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("system_settings")
        .update({ 
          value: enabled,
          updated_at: new Date().toISOString()
        })
        .eq("key", "email_enabled");
      
      if (error) throw error;
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast.success(enabled ? "E-postutsending aktivert" : "E-postutsending deaktivert");
    },
    onError: (error) => {
      console.error("Failed to update setting:", error);
      toast.error("Kunne ikke oppdatere innstilling");
    },
  });

  const handleSendSingleEmail = async () => {
    if (!senderName || !senderEmail) {
      toast.error("Fyll inn avsendernavn og avsender e-post");
      return;
    }
    if (!recipientName || !recipientEmail) {
      toast.error("Fyll inn mottakernavn og mottaker e-post");
      return;
    }

    setSendingSingleEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-dm-welcome-email", {
        body: {
          senderName,
          senderEmail,
          recipientName,
          recipientEmail,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Velkomst-epost sendt til ${recipientEmail}`);
        setRecipientName("");
        setRecipientEmail("");
      } else {
        toast.error(data.error || "Kunne ikke sende e-post");
      }
    } catch (error: any) {
      console.error("Failed to send single welcome email:", error);
      toast.error(error.message || "Kunne ikke sende e-post");
    } finally {
      setSendingSingleEmail(false);
    }
  };

  const handleSendDMWelcomeEmail = async () => {
    if (!senderName || !senderEmail) {
      toast.error("Fyll inn avsendernavn og e-post");
      return;
    }

    setSendingDMEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-dm-welcome-email", {
        body: {
          senderName,
          senderEmail,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Velkomst-epost sendt til ${data.sent} av ${data.total} distriktsjefer`);
        if (data.failed > 0) {
          toast.warning(`${data.failed} e-poster feilet`);
        }
        setDmDialogOpen(false);
      } else {
        toast.error(data.error || "Kunne ikke sende e-poster");
      }
    } catch (error: any) {
      console.error("Failed to send DM welcome email:", error);
      toast.error(error.message || "Kunne ikke sende e-poster");
    } finally {
      setSendingDMEmail(false);
    }
  };

  const isEmailEnabled = emailSetting?.value === true;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEmailEnabled ? (
              <Mail className="h-5 w-5 text-green-600" />
            ) : (
              <MailX className="h-5 w-5 text-destructive" />
            )}
            E-postinnstillinger
          </CardTitle>
          <CardDescription>
            Kontroller e-postutsending via Resend for hele applikasjonen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Laster innstillinger...
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <Label htmlFor="email-enabled" className="text-base font-medium">
                  E-postutsending
                </Label>
                <p className="text-sm text-muted-foreground">
                  Når deaktivert vil ingen e-poster bli sendt (invitasjoner, varsler, meldinger, rolleendringer)
                </p>
              </div>
              <Switch
                id="email-enabled"
                checked={isEmailEnabled}
                onCheckedChange={(checked) => updateSettingMutation.mutate(checked)}
                disabled={updateSettingMutation.isPending}
              />
            </div>
          )}

          <div className={`rounded-lg p-4 ${isEmailEnabled ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
            <p className={`text-sm font-medium ${isEmailEnabled ? "text-green-800" : "text-amber-800"}`}>
              Status: {isEmailEnabled ? "E-post er aktivert ✓" : "E-post er deaktivert ✕"}
            </p>
            <p className={`text-xs mt-1 ${isEmailEnabled ? "text-green-700" : "text-amber-700"}`}>
              {isEmailEnabled 
                ? "Alle e-poster sendes normalt via Resend" 
                : "Alle e-poster blir hoppet over - ingen e-poster sendes ut"}
            </p>
          </div>

          <div className="text-xs text-muted-foreground mt-4">
            <p className="font-medium mb-1">Påvirkede funksjoner:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Invitasjons-e-poster</li>
              <li>Meldingsvarsler</li>
              <li>Forsikringsvarsler</li>
              <li>Rolleendrings-e-poster</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Send Welcome Email to District Managers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Distriktsjef-kommunikasjon
          </CardTitle>
          <CardDescription>
            Send velkomst-epost til distriktsjefer om nye funksjoner i portalen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avsenderinfo */}
          <div className="space-y-4">
            <p className="text-sm font-medium">Avsenderinformasjon</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sender-name-main">Ditt navn</Label>
                <Input
                  id="sender-name-main"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Ditt navn"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender-email-main">Din e-post (avsender)</Label>
                <Input
                  id="sender-email-main"
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="din@har1.no"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Send til én mottaker */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <p className="text-sm font-medium">Send til én mottaker</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipient-name">Mottakernavn</Label>
                <Input
                  id="recipient-name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Mottakers navn"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipient-email">Til e-post</Label>
                <Input
                  id="recipient-email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="mottaker@epost.no"
                />
              </div>
            </div>
            <Button 
              onClick={handleSendSingleEmail} 
              disabled={!isEmailEnabled || sendingSingleEmail || !recipientEmail || !recipientName}
              variant="outline"
            >
              {sendingSingleEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sender...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send til én mottaker
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Send til alle distriktsjefer */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-base font-medium">
                Send til alle distriktsjefer
              </p>
              <p className="text-sm text-muted-foreground">
                {districtManagers?.length || 0} distriktsjefer vil motta e-posten
              </p>
            </div>
            <Dialog open={dmDialogOpen} onOpenChange={setDmDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!isEmailEnabled}>
                  <Users className="h-4 w-4 mr-2" />
                  Send til alle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send velkomst-epost til alle distriktsjefer</DialogTitle>
                  <DialogDescription>
                    E-posten inneholder informasjon om innlogging og nye funksjoner (Bonus & Vekstbonus).
                    Den vil bli sendt til {districtManagers?.length || 0} distriktsjefer.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="font-medium mb-1">Avsender:</p>
                    <p className="text-muted-foreground">{senderName} ({senderEmail})</p>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="font-medium mb-2">Mottakere:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {districtManagers?.map((dm) => (
                        <p key={dm.id} className="text-muted-foreground">
                          {dm.name} ({dm.email})
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDmDialogOpen(false)}>
                    Avbryt
                  </Button>
                  <Button onClick={handleSendDMWelcomeEmail} disabled={sendingDMEmail}>
                    {sendingDMEmail ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sender...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send til alle ({districtManagers?.length || 0})
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          {!isEmailEnabled && (
            <p className="text-xs text-amber-600">
              E-postutsending må aktiveres før du kan sende velkomst-epost
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
