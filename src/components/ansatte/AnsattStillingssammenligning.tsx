// AnsattStillingssammenligning - Viser sammenligning mellom avtalt stilling og faktisk turnus
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Info, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  beregnGjennomsnittTurnus, 
  getTurnusTypeLabel,
  type TurnusType,
  type WeekPreference 
} from "@/lib/turnusUtils";

interface Props {
  ansattId: string;
  salongId: string;
  avtaltStillingsprosent: number;
}

export function AnsattStillingssammenligning({
  ansattId,
  salongId,
  avtaltStillingsprosent
}: Props) {
  // Hent aktive turnuspreferanser fra ansatt_turnus (bruker ansatt_id direkte)
  const { data: turnusData, isLoading } = useQuery({
    queryKey: ['turnus-stillingsprosent', ansattId, salongId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ansatt_turnus')
        .select('*')
        .eq('ansatt_id', ansattId)
        .eq('salon_id', salongId)
        .is('gyldig_til', null);

      if (error) throw error;
      return data;
    },
    enabled: !!ansattId && !!salongId
  });

  // Beregn stillingsprosent fra turnus (med deduplisering)
  const beregnetData = useMemo(() => {
    if (!turnusData?.length) return null;

    // Fjern duplikater: grupper unike maler per uke_type + ukedag
    const uniqueTemplates = new Map<string, typeof turnusData[0]>();
    turnusData.forEach(t => {
      const key = `${t.uke_type || 'alle'}-${t.ukedag}`;
      if (!uniqueTemplates.has(key)) {
        uniqueTemplates.set(key, t);
      }
    });

    const uniqueList = Array.from(uniqueTemplates.values());

    // Detekter turnustype fra unike maler
    const hasUke1 = uniqueList.some(m => m.uke_type === 'uke1');
    const hasUke2 = uniqueList.some(m => m.uke_type === 'uke2');
    const hasUke3 = uniqueList.some(m => m.uke_type === 'uke3');
    const hasPartall = uniqueList.some(m => m.uke_type === 'partall');
    const hasOddetall = uniqueList.some(m => m.uke_type === 'oddetall');

    let turnusType: TurnusType = 'enkel';
    if (hasUke1 || hasUke2 || hasUke3) {
      turnusType = 'treuke';
    } else if (hasPartall || hasOddetall) {
      turnusType = 'touke';
    }

    // Grupper preferanser per uketype fra unike maler
    const preferanserPerUke: Record<string, WeekPreference[]> = {};
    
    for (const turnus of uniqueList) {
      const ukeType = turnus.uke_type || 'alle';
      if (!preferanserPerUke[ukeType]) {
        preferanserPerUke[ukeType] = [];
      }
      preferanserPerUke[ukeType].push({
        ukedag: turnus.ukedag,
        jobber: !turnus.fridag,
        onsket_start_tid: turnus.start_tid,
        onsket_slutt_tid: turnus.slutt_tid
      });
    }

    return beregnGjennomsnittTurnus(turnusType, preferanserPerUke);
  }, [turnusData]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 animate-pulse" />
            <span>Laster turnusdata...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!beregnetData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>Ingen aktiv turnusmal funnet</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Beregn avvik
  const avvik = beregnetData.stillingsprosent - avtaltStillingsprosent;
  const absAvvik = Math.abs(avvik);

  const getStatus = () => {
    if (absAvvik <= 2) return {
      label: 'OK',
      icon: CheckCircle,
      variant: 'default' as const,
      bgClass: 'bg-green-500/10'
    };
    if (absAvvik <= 5) return {
      label: 'Lite avvik',
      icon: Info,
      variant: 'secondary' as const,
      bgClass: 'bg-yellow-500/10'
    };
    return {
      label: 'Stort avvik',
      icon: AlertTriangle,
      variant: 'destructive' as const,
      bgClass: 'bg-destructive/10'
    };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  const getUkeTypeLabel = (ukeType: string) => {
    switch (ukeType) {
      case 'partall': return 'Partallsuke';
      case 'oddetall': return 'Oddetallsuke';
      case 'uke1': return 'Uke 1';
      case 'uke2': return 'Uke 2';
      case 'uke3': return 'Uke 3';
      case 'alle': return 'Alle uker';
      default: return ukeType;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Stilling vs. Turnus</CardTitle>
          <Badge variant={status.variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sammenligning */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Avtalt stilling</p>
            <p className="text-2xl font-bold">{avtaltStillingsprosent}%</p>
            <Progress value={avtaltStillingsprosent} className="h-2" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Faktisk turnus</p>
            <p className="text-2xl font-bold">{beregnetData.stillingsprosent}%</p>
            <Progress
              value={Math.min(beregnetData.stillingsprosent, 100)}
              className={`h-2 ${beregnetData.stillingsprosent > 100 ? '[&>div]:bg-destructive' : ''}`}
            />
          </div>
        </div>

        {/* Avvik-varsel */}
        {absAvvik > 2 && (
          <div className={`p-3 rounded-lg ${status.bgClass}`}>
            <p className="text-sm font-medium">
              {avvik > 0
                ? `⚠️ Turnus er ${absAvvik.toFixed(1)}% høyere enn avtalt stilling`
                : `⚠️ Turnus er ${absAvvik.toFixed(1)}% lavere enn avtalt stilling`
              }
            </p>
          </div>
        )}

        {/* Turnus-detaljer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {getTurnusTypeLabel(beregnetData.turnusType)}
            </p>
            <p className="text-sm text-muted-foreground">
              Snitt: {beregnetData.gjennomsnittTimer} t/uke
            </p>
          </div>

          <div className="grid gap-2">
            {beregnetData.ukerDetaljer.map((uke) => (
              <div
                key={uke.ukeType}
                className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
              >
                <span>{getUkeTypeLabel(uke.ukeType)}</span>
                <span className="font-medium">
                  {uke.timer.toFixed(1)}t ({uke.prosent.toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}