import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { History, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface AuditEntry {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  old_role: string;
  new_role: string;
  changed_by_user_id: string;
  changed_by_name: string;
  changed_at: string;
}

const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    admin: "Admin",
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

export const AuditLogTab = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLog();
  }, []);

  const fetchAuditLog = async () => {
    try {
      const { data, error } = await supabase
        .from("role_change_audit")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setEntries((data as AuditEntry[]) || []);
    } catch (error: any) {
      toast.error("Kunne ikke laste audit log");
      console.error("Audit log fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Laster audit log...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Rolleendringer</h2>
        <p className="text-muted-foreground">
          Historikk over alle rolleendringer i systemet
        </p>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => (
          <Card key={entry.id} className="p-4 shadow-card">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <History className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">
                    {entry.user_name}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    ({entry.user_email})
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="outline">{getRoleLabel(entry.old_role)}</Badge>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <Badge variant="default">{getRoleLabel(entry.new_role)}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Endret av <span className="font-medium">{entry.changed_by_name}</span>
                  {" · "}
                  {format(new Date(entry.changed_at), "d. MMM yyyy 'kl.' HH:mm", {
                    locale: nb,
                  })}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {entries.length === 0 && (
        <Card className="p-12 text-center">
          <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ingen rolleendringer</h3>
          <p className="text-muted-foreground">
            Det er ingen registrerte rolleendringer ennå
          </p>
        </Card>
      )}
    </div>
  );
};
