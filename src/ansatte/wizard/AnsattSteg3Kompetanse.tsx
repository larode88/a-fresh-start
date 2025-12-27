import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AnsattWizardData } from '@/pages/AnsattWizard';

interface Props {
  data: AnsattWizardData;
  updateData: (updates: Partial<AnsattWizardData>) => void;
}

export default function AnsattSteg3Kompetanse({ data, updateData }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Kompetanse og utdanning</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Fagbrev, utdanning og personlige verdier
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fagbrev_dato">Fagbrev dato</Label>
          <Input
            id="fagbrev_dato"
            type="date"
            value={data.fagbrev_dato || ''}
            onChange={(e) => updateData({ fagbrev_dato: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Brukes for å beregne ansiennitet
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="utdanning_fagbrev">Utdanning / Fagbrev type</Label>
          <Input
            id="utdanning_fagbrev"
            value={data.utdanning_fagbrev || ''}
            onChange={(e) => updateData({ utdanning_fagbrev: e.target.value })}
            placeholder="F.eks. Frisørfag"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="verdier">Personlige verdier</Label>
        <Textarea
          id="verdier"
          value={data.verdier || ''}
          onChange={(e) => updateData({ verdier: e.target.value })}
          placeholder="Hva er viktig for deg i arbeidshverdagen?"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="motivasjon_i_jobben">Motivasjon i jobben</Label>
        <Textarea
          id="motivasjon_i_jobben"
          value={data.motivasjon_i_jobben || ''}
          onChange={(e) => updateData({ motivasjon_i_jobben: e.target.value })}
          placeholder="Hva motiverer deg?"
          rows={3}
        />
      </div>
    </div>
  );
}
