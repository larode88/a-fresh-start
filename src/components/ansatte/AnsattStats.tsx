import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Cake, AlertTriangle } from "lucide-react";
import { type AnsattUtvidet } from "@/integrations/supabase/ansatteService";
import { 
  calculateAnsiennitetYears, 
  isBirthdayToday, 
  isBirthdayTomorrow, 
  isProvetidExpiringSoon 
} from "@/lib/ansattUtils";

interface AnsattStatsProps {
  ansatte: AnsattUtvidet[];
  isLoading: boolean;
}

export function AnsattStats({ ansatte, isLoading }: AnsattStatsProps) {
  const stats = useMemo(() => {
    if (!ansatte.length) return null;

    const aktive = ansatte.filter(a => a.status === 'Aktiv');
    // Prøvetid is now determined by provetid_til field, not status
    const provetid = ansatte.filter(a => a.status === 'Aktiv' && a.provetid_til && new Date(a.provetid_til) > new Date());
    const permisjon = ansatte.filter(a => a.status === 'Permisjon');

    // Calculate average ansiennitet
    const ansienniteter = aktive
      .filter(a => a.ansatt_dato)
      .map(a => calculateAnsiennitetYears(a.ansatt_dato!, a.fagbrev_dato));
    const avgAnsiennitet = ansienniteter.length > 0
      ? ansienniteter.reduce((sum, val) => sum + val, 0) / ansienniteter.length
      : 0;

    // Calculate average stillingsprosent
    const stillinger = aktive
      .filter(a => a.stillingsprosent != null)
      .map(a => a.stillingsprosent!);
    const avgStilling = stillinger.length > 0
      ? stillinger.reduce((a, b) => a + b, 0) / stillinger.length
      : 100;

    // Birthdays
    const bursdagerIdag = ansatte.filter(a => a.fodselsdato && isBirthdayToday(a.fodselsdato));
    const bursdagerIMorgen = ansatte.filter(a => a.fodselsdato && isBirthdayTomorrow(a.fodselsdato));

    // Prøvetid expiring
    const provetidUtloper = ansatte.filter(a => a.provetid_til && isProvetidExpiringSoon(a.provetid_til, 30));

    return {
      totalt: ansatte.length,
      aktive: aktive.length,
      provetid: provetid.length,
      permisjon: permisjon.length,
      avgAnsiennitet: Math.round(avgAnsiennitet * 10) / 10,
      avgStilling: Math.round(avgStilling),
      bursdagerIdag,
      bursdagerIMorgen,
      provetidUtloper,
    };
  }, [ansatte]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Ansatte Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Ansatte</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stats.aktive}</span>
                <span className="text-sm text-muted-foreground">aktive</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            {stats.provetid > 0 && (
              <Badge variant="secondary" className="text-xs">
                {stats.provetid} i prøvetid
              </Badge>
            )}
            {stats.permisjon > 0 && (
              <Badge variant="outline" className="text-xs">
                {stats.permisjon} i permisjon
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gjennomsnitt Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-secondary/50">
              <Clock className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Gjennomsnitt</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stats.avgAnsiennitet}</span>
                <span className="text-sm text-muted-foreground">år erfaring</span>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <Badge variant="outline" className="text-xs">
              {stats.avgStilling}% gj.snitt stilling
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Bursdager Card */}
      <Card className={stats.bursdagerIdag.length > 0 ? "border-primary/50 bg-primary/5" : ""}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${stats.bursdagerIdag.length > 0 ? "bg-primary/20" : "bg-muted"}`}>
              <Cake className={`h-5 w-5 ${stats.bursdagerIdag.length > 0 ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Bursdager</p>
              {stats.bursdagerIdag.length > 0 ? (
                <div className="text-sm font-medium text-primary">
                  🎂 {stats.bursdagerIdag.map(a => a.fornavn).join(", ")} i dag!
                </div>
              ) : stats.bursdagerIMorgen.length > 0 ? (
                <div className="text-sm">
                  {stats.bursdagerIMorgen.map(a => a.fornavn).join(", ")} i morgen
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Ingen kommende</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prøvetid Card */}
      <Card className={stats.provetidUtloper.length > 0 ? "border-warning/50 bg-warning/5" : ""}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${stats.provetidUtloper.length > 0 ? "bg-warning/20" : "bg-muted"}`}>
              <AlertTriangle className={`h-5 w-5 ${stats.provetidUtloper.length > 0 ? "text-warning" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Prøvetid utløper</p>
              {stats.provetidUtloper.length > 0 ? (
                <div className="text-sm font-medium">
                  {stats.provetidUtloper.length} ansatt{stats.provetidUtloper.length !== 1 ? "e" : ""} neste 30 dager
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Ingen varsler</div>
              )}
            </div>
          </div>
          {stats.provetidUtloper.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              {stats.provetidUtloper.map(a => a.fornavn).join(", ")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
