import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { addMonths, format } from 'date-fns';
import { calculateArbeidstidPerUke } from '@/lib/ansattUtils';
import type { AnsattWizardData } from '@/pages/AnsattWizard';

interface Props {
  data: AnsattWizardData;
  updateData: (updates: Partial<AnsattWizardData>) => void;
}

export default function AnsattSteg2Stilling({ data, updateData }: Props) {
  // Auto-calculate arbeidstid when stillingsprosent changes
  useEffect(() => {
    const arbeidstid = calculateArbeidstidPerUke(data.stillingsprosent);
    updateData({ arbeidstid_per_uke: arbeidstid });
  }, [data.stillingsprosent]);

  // Auto-calculate provetid_til when ansatt_dato or har_provetid changes
  useEffect(() => {
    if (data.har_provetid && data.ansatt_dato) {
      const ansattDate = new Date(data.ansatt_dato);
      const provetidDate = addMonths(ansattDate, 6);
      updateData({ provetid_til: format(provetidDate, 'yyyy-MM-dd') });
    } else if (!data.har_provetid) {
      updateData({ provetid_til: undefined });
    }
  }, [data.ansatt_dato, data.har_provetid]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Stilling og arbeidstid</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Rolle, ansettelsesdato og arbeidstid
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Frisørfunksjon</Label>
          <Select
            value={data.frisorfunksjon || 'none'}
            onValueChange={(v) => updateData({ frisorfunksjon: v === 'none' ? undefined : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Velg funksjon" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ingen</SelectItem>
              <SelectItem value="frisor">Frisør</SelectItem>
              <SelectItem value="senior_frisor">Seniorfrisør</SelectItem>
              <SelectItem value="laerling">Lærling</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Lederstilling</Label>
          <Select
            value={data.lederstilling || 'none'}
            onValueChange={(v) => updateData({ lederstilling: v === 'none' ? undefined : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Velg stilling" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ingen</SelectItem>
              <SelectItem value="daglig_leder">Daglig leder</SelectItem>
              <SelectItem value="avdelingsleder">Avdelingsleder</SelectItem>
              <SelectItem value="styreleder">Styreleder</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ansatt_dato">Ansettelsesdato *</Label>
          <Input
            id="ansatt_dato"
            type="date"
            value={data.ansatt_dato || ''}
            onChange={(e) => updateData({ ansatt_dato: e.target.value })}
          />
        </div>
      </div>

      {/* Prøvetid */}
      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Har den ansatte prøvetid?</Label>
            <p className="text-xs text-muted-foreground">
              {data.har_provetid ? 'Automatisk satt til 6 måneder fra ansettelsesdato' : 'Ingen prøvetid'}
            </p>
          </div>
          <Switch
            checked={data.har_provetid}
            onCheckedChange={(checked) => updateData({ har_provetid: checked })}
          />
        </div>
        
        {data.har_provetid && (
          <div className="space-y-2">
            <Label htmlFor="provetid_til">Prøvetid til</Label>
            <Input
              id="provetid_til"
              type="date"
              value={data.provetid_til || ''}
              onChange={(e) => updateData({ provetid_til: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Kan justeres om ønskelig
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stillingsprosent">Stillingsprosent (%)</Label>
          <Input
            id="stillingsprosent"
            type="number"
            min={0}
            max={100}
            value={data.stillingsprosent}
            onChange={(e) => updateData({ stillingsprosent: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="arbeidstid_per_uke">Timer per uke</Label>
          <Input
            id="arbeidstid_per_uke"
            type="number"
            step={0.5}
            value={data.arbeidstid_per_uke}
            onChange={(e) => updateData({ arbeidstid_per_uke: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="arbeidsdager_pr_uke">Arbeidsdager per uke</Label>
          <Input
            id="arbeidsdager_pr_uke"
            type="number"
            min={1}
            max={7}
            value={data.arbeidsdager_pr_uke}
            onChange={(e) => updateData({ arbeidsdager_pr_uke: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}
