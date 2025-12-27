import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { calculateFeriekravTimer } from '@/lib/ansattUtils';
import { calculateRecommendedHourlyRate, type TariffRecommendation } from '@/lib/tariffUtils';
import type { AnsattWizardData } from '@/pages/AnsattWizard';

interface Props {
  data: AnsattWizardData;
  updateData: (updates: Partial<AnsattWizardData>) => void;
  salongId: string;
}

export default function AnsattSteg4Lonn({ data, updateData, salongId }: Props) {
  const [tariffRecommendation, setTariffRecommendation] = useState<TariffRecommendation | null>(null);

  // Auto-calculate feriekrav when type changes
  useEffect(() => {
    if (data.feriekrav_type_enum) {
      const timer = calculateFeriekravTimer(data.feriekrav_type_enum, data.stillingsprosent);
      updateData({ feriekrav_timer_per_aar: timer });
    }
  }, [data.feriekrav_type_enum, data.stillingsprosent]);

  // Fetch tariff recommendation
  useEffect(() => {
    const fetchTariff = async () => {
      if (!salongId || !data.ansatt_dato) {
        setTariffRecommendation(null);
        return;
      }
      const recommendation = await calculateRecommendedHourlyRate(
        salongId,
        data.fagbrev_dato || null,
        data.ansatt_dato
      );
      setTariffRecommendation(recommendation);
    };
    fetchTariff();
  }, [salongId, data.fagbrev_dato, data.ansatt_dato]);

  const showTimesats = data.lonnstype_enum === 'timelonn' || data.lonnstype_enum === 'timelonn_provisjon';
  const showFastlonn = data.lonnstype_enum === 'fastlonn';
  const showProvisjon = data.lonnstype_enum === 'provisjon' || data.lonnstype_enum === 'timelonn_provisjon';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Lønn og provisjon</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Lønnstype, satser og ferieavtale
        </p>
      </div>

      <div className="space-y-2">
        <Label>Lønnstype</Label>
        <Select
          value={data.lonnstype_enum || 'none'}
          onValueChange={(v) => updateData({ lonnstype_enum: v === 'none' ? undefined : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Velg lønnstype" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ikke valgt</SelectItem>
            <SelectItem value="timelonn">Timelønn</SelectItem>
            <SelectItem value="fastlonn">Fastlønn</SelectItem>
            <SelectItem value="provisjon">Kun provisjon</SelectItem>
            <SelectItem value="timelonn_provisjon">Timelønn + provisjon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tariff recommendation */}
      {tariffRecommendation && showTimesats && (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Anbefalt timesats fra tariff</p>
                <p className="text-2xl font-semibold text-primary">
                  kr {tariffRecommendation.timesats?.toFixed(2) || '–'}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{tariffRecommendation.fagbrevStatusLabel}</Badge>
                  <Badge variant="outline">{tariffRecommendation.ansiennitetAar} års ansiennitet</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {showTimesats && (
          <div className="space-y-2">
            <Label htmlFor="timesats">Timesats (kr) *</Label>
            <Input
              id="timesats"
              type="number"
              step={0.5}
              value={data.timesats || ''}
              onChange={(e) => updateData({ timesats: e.target.value ? Number(e.target.value) : undefined })}
              placeholder={tariffRecommendation?.timesats?.toString() || ''}
            />
          </div>
        )}
        {showFastlonn && (
          <div className="space-y-2">
            <Label htmlFor="fastlonn">Månedslønn (kr)</Label>
            <Input
              id="fastlonn"
              type="number"
              value={data.fastlonn || ''}
              onChange={(e) => updateData({ fastlonn: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        )}
      </div>

      {showProvisjon && (
        <div className="space-y-4 p-4 border rounded-lg">
          <h4 className="font-medium">Provisjonssatser</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provisjon_behandling_prosent">Behandling (%)</Label>
              <Input
                id="provisjon_behandling_prosent"
                type="number"
                min={0}
                max={100}
                value={data.provisjon_behandling_prosent}
                onChange={(e) => updateData({ provisjon_behandling_prosent: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provisjon_vare_prosent">Varesalg (%)</Label>
              <Input
                id="provisjon_vare_prosent"
                type="number"
                min={0}
                max={100}
                value={data.provisjon_vare_prosent}
                onChange={(e) => updateData({ provisjon_vare_prosent: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provisjon_behandling_hoy_prosent">Høy provisjon (%)</Label>
              <Input
                id="provisjon_behandling_hoy_prosent"
                type="number"
                min={0}
                max={100}
                value={data.provisjon_behandling_hoy_prosent}
                onChange={(e) => updateData({ provisjon_behandling_hoy_prosent: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provisjon_terskel">Terskel for høy provisjon (kr)</Label>
              <Input
                id="provisjon_terskel"
                type="number"
                min={0}
                value={data.provisjon_terskel}
                onChange={(e) => updateData({ provisjon_terskel: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Ferieavtale</Label>
          <Select
            value={data.feriekrav_type_enum || 'tariffavtale'}
            onValueChange={(v) => updateData({ feriekrav_type_enum: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lovfestet">Lovfestet (21 dager)</SelectItem>
              <SelectItem value="tariffavtale">Tariffavtale (25 dager)</SelectItem>
              <SelectItem value="utvidet">Utvidet (30 dager)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="feriekrav_timer_per_aar">Ferietimer per år</Label>
          <Input
            id="feriekrav_timer_per_aar"
            type="number"
            step={0.5}
            value={data.feriekrav_timer_per_aar}
            onChange={(e) => updateData({ feriekrav_timer_per_aar: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}
