import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AnsattWizardData } from '@/pages/AnsattWizard';

interface Props {
  data: AnsattWizardData;
  updateData: (updates: Partial<AnsattWizardData>) => void;
}

export default function AnsattSteg1Grunninfo({ data, updateData }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Personalia</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Grunnleggende informasjon om den ansatte
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fornavn">Fornavn *</Label>
          <Input
            id="fornavn"
            value={data.fornavn}
            onChange={(e) => updateData({ fornavn: e.target.value })}
            placeholder="Ola"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="etternavn">Etternavn</Label>
          <Input
            id="etternavn"
            value={data.etternavn || ''}
            onChange={(e) => updateData({ etternavn: e.target.value })}
            placeholder="Nordmann"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="epost">E-post</Label>
          <Input
            id="epost"
            type="email"
            value={data.epost || ''}
            onChange={(e) => updateData({ epost: e.target.value })}
            placeholder="ola@example.com"
          />
          <p className="text-xs text-muted-foreground">
            Brukes til brukerkonto og HubSpot-synk
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefon">Telefon</Label>
          <Input
            id="telefon"
            value={data.telefon || ''}
            onChange={(e) => updateData({ telefon: e.target.value })}
            placeholder="+47 123 45 678"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fodselsdato">Fødselsdato</Label>
          <Input
            id="fodselsdato"
            type="date"
            value={data.fodselsdato || ''}
            onChange={(e) => updateData({ fodselsdato: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
