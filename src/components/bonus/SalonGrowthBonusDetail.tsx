import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Send, TrendingUp, TrendingDown, Trophy, Mail, User } from "lucide-react";

interface SalonGrowthData {
  salonId: string;
  salonName: string;
  districtName: string | null;
  currentYearToDate: number;
  previousYearSamePeriod: number;
  previousYearTotal: number;
  growthPercent: number;
  progressVsFullYear: number;
  remainingToMatch: number;
  tier: { threshold: number; bonusRate: number; label: string; color: string } | null;
  bonusAmount: number;
  hasExtraTier?: boolean;
}

interface SalonGrowthBonusDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salon: SalonGrowthData | null;
  year: number;
  latestPeriod: string | null;
}

interface Contact {
  id: string;
  fornavn: string;
  etternavn: string | null;
  epost: string;
  lederstilling: string | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
};

const getLederstillingLabel = (stilling: string | null) => {
  if (!stilling) return "";
  const labels: Record<string, string> = {
    daglig_leder: "Daglig leder",
    avdelingsleder: "Avdelingsleder",
    styreleder: "Styreleder",
  };
  return labels[stilling] || stilling;
};

// Calculate bonus components based on rules
const calculateBonusComponents = (salon: SalonGrowthData) => {
  const hasExtraTier = salon.hasExtraTier ?? (salon.growthPercent >= 5);
  
  // Calculate 5% threshold: previousYearSamePeriod * 1.05
  const fivePercentThreshold = salon.previousYearSamePeriod > 0 
    ? salon.previousYearSamePeriod * 1.05 
    : 0;
  
  let baseBonus: number;
  let extraBonus: number;
  let excessAmount: number;
  
  if (hasExtraTier) {
    // ≥5% growth: 5% of total + 10% of excess
    baseBonus = salon.currentYearToDate * 0.05;
    excessAmount = Math.max(0, salon.currentYearToDate - fivePercentThreshold);
    extraBonus = excessAmount * 0.10;
  } else {
    // 0-5% growth: 2.5% of total
    baseBonus = salon.currentYearToDate * 0.025;
    excessAmount = 0;
    extraBonus = 0;
  }
  
  return {
    hasExtraTier,
    baseBonus,
    extraBonus,
    fivePercentThreshold,
    excessAmount,
  };
};

export function SalonGrowthBonusDetail({
  open,
  onOpenChange,
  salon,
  year,
  latestPeriod,
}: SalonGrowthBonusDetailProps) {
  const { profile } = useAuth();
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Fetch contacts (leaders) for this salon
  const { data: contacts = [] } = useQuery({
    queryKey: ["salon-leaders", salon?.salonId],
    queryFn: async () => {
      if (!salon?.salonId) return [];
      const { data, error } = await supabase
        .from("ansatte")
        .select("id, fornavn, etternavn, epost, lederstilling")
        .eq("salong_id", salon.salonId)
        .not("lederstilling", "is", null)
        .not("epost", "is", null)
        .eq("status", "Aktiv");
      
      if (error) throw error;
      return (data || []) as Contact[];
    },
    enabled: !!salon?.salonId && open,
  });

  const selectedContact = contacts.find((c) => c.id === selectedContactId);
  const hasContacts = contacts.length > 0;
  const recipientEmail = hasContacts ? selectedContact?.epost : manualEmail;
  const recipientName = hasContacts
    ? selectedContact
      ? `${selectedContact.fornavn} ${selectedContact.etternavn || ""}`.trim()
      : ""
    : manualName || "";

  const canSend = recipientEmail && recipientEmail.includes("@") && profile?.email;

  // Calculate bonus components
  const bonusComponents = salon ? calculateBonusComponents(salon) : null;

  const handleSendReport = async () => {
    if (!salon || !recipientEmail || !profile?.email || !bonusComponents) return;

    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-growth-bonus-report", {
        body: {
          salonName: salon.salonName,
          recipientEmail,
          recipientName: recipientName || "Daglig leder",
          senderEmail: profile.email,
          senderName: profile.name || "Hår1",
          year,
          currentYearToDate: salon.currentYearToDate,
          previousYearSamePeriod: salon.previousYearSamePeriod,
          previousYearTotal: salon.previousYearTotal,
          growthPercent: salon.growthPercent,
          progressPercent: salon.progressVsFullYear,
          bonusAmount: salon.bonusAmount,
          latestPeriod: latestPeriod || `${year}`,
          isNewCustomer: salon.previousYearSamePeriod === 0 && salon.previousYearTotal === 0,
          hasExtraTier: bonusComponents.hasExtraTier,
          baseBonus: bonusComponents.baseBonus,
          extraBonus: bonusComponents.extraBonus,
          fivePercentThreshold: bonusComponents.fivePercentThreshold,
          excessAmount: bonusComponents.excessAmount,
        },
      });

      if (error) throw error;

      toast.success(`Rapport sendt til ${recipientEmail}`);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to send report:", error);
      toast.error("Kunne ikke sende rapport: " + (error.message || "Ukjent feil"));
    } finally {
      setIsSending(false);
    }
  };

  if (!salon) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">Vekstbonus-detaljer</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Salon Info */}
          <div>
            <h3 className="font-semibold text-lg">{salon.salonName}</h3>
            {salon.districtName && (
              <p className="text-sm text-muted-foreground">{salon.districtName}</p>
            )}
          </div>

          <Separator />

          {/* Key Figures */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">L'Oréal innkjøp {year}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hittil i år</span>
                <span className="font-medium">{formatCurrency(salon.currentYearToDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hittil i {year - 1}</span>
                <span className="font-medium">{formatCurrency(salon.previousYearSamePeriod)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Vekst vs. fjor</span>
                <span className={`font-medium flex items-center gap-1 ${salon.growthPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {salon.growthPercent >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {formatPercent(salon.growthPercent)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Totalt {year - 1}</span>
                <span className="font-medium">{formatCurrency(salon.previousYearTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">% av fjorår oppnådd</span>
                <span className="font-medium">{salon.progressVsFullYear.toFixed(1)}%</span>
              </div>
              {salon.remainingToMatch > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mangler til fjorår</span>
                  <span className="font-medium">{formatCurrency(salon.remainingToMatch)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bonus Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Vekstbonus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tier</span>
                {bonusComponents?.hasExtraTier ? (
                  <div className="flex gap-1">
                    <Badge className="bg-green-500 text-white">5%</Badge>
                    <Badge className="bg-emerald-600 text-white">+10%</Badge>
                  </div>
                ) : salon.growthPercent >= 0 ? (
                  <Badge className="bg-yellow-400 text-black">2,5%</Badge>
                ) : (
                  <Badge variant="outline">Ikke kvalifisert</Badge>
                )}
              </div>
              
              {/* Bonus breakdown */}
              {bonusComponents && salon.growthPercent >= 0 && (
                <div className="bg-muted/50 rounded-md p-3 space-y-2 text-sm">
                  {bonusComponents.hasExtraTier ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">5% av omsetning:</span>
                        <span>{formatCurrency(bonusComponents.baseBonus)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">+10% av overskudd:</span>
                        <span>{formatCurrency(bonusComponents.extraBonus)}</span>
                      </div>
                      {bonusComponents.excessAmount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          (Overskudd: {formatCurrency(bonusComponents.excessAmount)})
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">2,5% av omsetning:</span>
                      <span>{formatCurrency(bonusComponents.baseBonus)}</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">Estimert bonus</span>
                <span className="font-semibold text-lg">{formatCurrency(salon.bonusAmount)}</span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Send Report Section */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send rapport til salongen
            </h4>

            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Fra</Label>
                <div className="flex items-center gap-2 mt-1 p-2 bg-muted rounded-md">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profile?.email || "Ikke innlogget"}</span>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Til</Label>
                {hasContacts ? (
                  <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Velg mottaker" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.fornavn} {contact.etternavn || ""} 
                          {contact.lederstilling && ` (${getLederstillingLabel(contact.lederstilling)})`}
                          {" - "}{contact.epost}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1 space-y-2">
                    <Input
                      type="text"
                      placeholder="Mottakerens navn (valgfritt)"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                    />
                    <Input
                      type="email"
                      placeholder="Skriv inn e-postadresse"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ingen kontaktpersoner funnet for denne salongen
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleSendReport}
              disabled={!canSend || isSending}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSending ? "Sender..." : "Send vekstbonus-rapport"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
