import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Briefcase, GraduationCap, Banknote, Mail, Check } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { AnsattWizardData } from '@/pages/AnsattWizard';

interface Props {
  data: AnsattWizardData;
  updateData: (updates: Partial<AnsattWizardData>) => void;
  onComplete: () => void;
  isSubmitting: boolean;
}

const getFrisorfunksjonLabel = (val: string | undefined) => {
  const map: Record<string, string> = {
    'frisor': 'Frisør',
    'senior_frisor': 'Seniorfrisør',
    'laerling': 'Lærling',
  };
  return val ? map[val] || val : null;
};

const getLederstillingLabel = (val: string | undefined) => {
  const map: Record<string, string> = {
    'daglig_leder': 'Daglig leder',
    'avdelingsleder': 'Avdelingsleder',
    'styreleder': 'Styreleder',
  };
  return val ? map[val] || val : null;
};

const getLonnstypeLabel = (val: string | undefined) => {
  const map: Record<string, string> = {
    'timelonn': 'Timelønn',
    'fastlonn': 'Fastlønn',
    'provisjon': 'Kun provisjon',
    'timelonn_provisjon': 'Timelønn + provisjon',
  };
  return val ? map[val] || val : 'Ikke valgt';
};

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '–';
  try {
    return format(new Date(dateStr), 'd. MMMM yyyy', { locale: nb });
  } catch {
    return dateStr;
  }
};

export default function AnsattSteg5Fullforing({ data, updateData, onComplete, isSubmitting }: Props) {
  const hasEmail = data.epost && data.epost.includes('@');
  const stillingParts = [
    getFrisorfunksjonLabel(data.frisorfunksjon),
    getLederstillingLabel(data.lederstilling),
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Oppsummering</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Kontroller informasjonen før du fullfører
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Personalia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Navn:</span> {data.fornavn} {data.etternavn || ''}</p>
            <p><span className="text-muted-foreground">E-post:</span> {data.epost || '–'}</p>
            <p><span className="text-muted-foreground">Telefon:</span> {data.telefon || '–'}</p>
            <p><span className="text-muted-foreground">Fødselsdato:</span> {formatDate(data.fodselsdato)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Stilling
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Stilling:</span>{' '}
              {stillingParts.length > 0 ? stillingParts.join(', ') : '–'}
            </p>
            <p><span className="text-muted-foreground">Ansettelsesdato:</span> {formatDate(data.ansatt_dato)}</p>
            <p>
              <span className="text-muted-foreground">Prøvetid:</span>{' '}
              {data.har_provetid ? `Til ${formatDate(data.provetid_til)}` : 'Ingen'}
            </p>
            <p><span className="text-muted-foreground">Stillingsprosent:</span> {data.stillingsprosent}%</p>
            <p><span className="text-muted-foreground">Timer/uke:</span> {data.arbeidstid_per_uke}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Kompetanse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Fagbrev:</span> {formatDate(data.fagbrev_dato)}</p>
            <p><span className="text-muted-foreground">Utdanning:</span> {data.utdanning_fagbrev || '–'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Lønn
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Type:</span> {getLonnstypeLabel(data.lonnstype_enum)}</p>
            {data.timesats && <p><span className="text-muted-foreground">Timesats:</span> kr {data.timesats}</p>}
            {data.fastlonn && <p><span className="text-muted-foreground">Månedslønn:</span> kr {data.fastlonn}</p>}
            <p><span className="text-muted-foreground">Ferietimer/år:</span> {data.feriekrav_timer_per_aar}</p>
          </CardContent>
        </Card>
      </div>

      {/* Welcome email toggle */}
      {hasEmail && (
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Send velkomst-e-post
                </div>
                <p className="text-xs text-muted-foreground">
                  Sender en velkomst-e-post til {data.epost}
                </p>
              </div>
              <Switch
                checked={data.send_velkomst}
                onCheckedChange={(checked) => updateData({ send_velkomst: checked })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* What will happen */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <h4 className="font-medium mb-3">Ved fullføring:</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Oppretter ansatt i systemet
            </li>
            {hasEmail && (
              <>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Oppretter brukerkonto automatisk
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Synkroniserer til HubSpot automatisk
                </li>
                {data.send_velkomst && (
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Sender velkomst-e-post
                  </li>
                )}
              </>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Submit button */}
      <div className="flex justify-end pt-4">
        <Button 
          size="lg" 
          onClick={onComplete} 
          disabled={isSubmitting}
          className="min-w-[200px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Oppretter...
            </>
          ) : (
            'Fullfør registrering'
          )}
        </Button>
      </div>
    </div>
  );
}
