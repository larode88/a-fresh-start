import { Mail, Phone, Briefcase, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { type AnsattUtvidet } from "@/integrations/supabase/ansatteService";
import { 
  getStatusColor, 
  getStatusLabel, 
  getFrisorfunksjonLabel, 
  getLederstillingLabel,
  calculateAnsiennitetYears 
} from "@/lib/ansattUtils";

interface AnsattKortProps {
  ansatte: AnsattUtvidet[];
  isLoading: boolean;
  onEdit: (ansatt: AnsattUtvidet) => void;
  onView: (ansatt: AnsattUtvidet) => void;
  isArchived?: boolean;
}

export function AnsattKort({ ansatte, isLoading, onView, isArchived }: AnsattKortProps) {
  const getInitials = (fornavn?: string, etternavn?: string) => {
    const first = fornavn?.[0] || "";
    const last = etternavn?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const getRoleDisplay = (ansatt: AnsattUtvidet) => {
    const parts: string[] = [];
    if (ansatt.frisorfunksjon) {
      parts.push(getFrisorfunksjonLabel(ansatt.frisorfunksjon) || "");
    }
    if (ansatt.lederstilling) {
      parts.push(getLederstillingLabel(ansatt.lederstilling) || "");
    }
    return parts.filter(Boolean);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (ansatte.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {isArchived ? "Ingen arkiverte ansatte" : "Ingen ansatte funnet"}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {ansatte.map((ansatt) => {
        const roles = getRoleDisplay(ansatt);
        const ansiennitet = ansatt.ansatt_dato 
          ? calculateAnsiennitetYears(ansatt.ansatt_dato, ansatt.fagbrev_dato) 
          : null;

        return (
          <Card 
            key={ansatt.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => onView(ansatt)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                    <AvatarImage src={ansatt.profilbilde_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(ansatt.fornavn, ansatt.etternavn)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {ansatt.fornavn} {ansatt.etternavn}
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {roles.map((role, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs shrink-0 ${getStatusColor(ansatt.status)}`}
                >
                  {getStatusLabel(ansatt.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {ansatt.epost && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{ansatt.epost}</span>
                </div>
              )}
              {ansatt.telefon && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{ansatt.telefon}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t">
                {ansatt.stillingsprosent != null && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{ansatt.stillingsprosent}% stilling</span>
                  </div>
                )}
                {ansiennitet != null && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{ansiennitet.toFixed(1)} år</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
