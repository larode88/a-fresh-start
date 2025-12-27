import { useState } from "react";
import { MoreHorizontal, Eye, Pencil, Archive, RotateCcw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { type AnsattUtvidet, archiveAnsatt, restoreAnsatt } from "@/integrations/supabase/ansatteService";
import { 
  getStatusColor, 
  getStatusLabel, 
  getFrisorfunksjonLabel, 
  getLederstillingLabel,
  calculateAnsiennitetYears 
} from "@/lib/ansattUtils";

interface AnsattTabellProps {
  ansatte: AnsattUtvidet[];
  isLoading: boolean;
  onEdit: (ansatt: AnsattUtvidet) => void;
  onView: (ansatt: AnsattUtvidet) => void;
  onRefetch: () => void;
  isArchived?: boolean;
}

export function AnsattTabell({ ansatte, isLoading, onEdit, onView, onRefetch, isArchived }: AnsattTabellProps) {
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedForAction, setSelectedForAction] = useState<AnsattUtvidet | null>(null);

  const handleArchive = async () => {
    if (!selectedForAction) return;
    
    const { error } = await archiveAnsatt(selectedForAction.id, "Arkivert fra ansattliste");
    if (error) {
      toast({ title: "Feil", description: "Kunne ikke arkivere ansatt", variant: "destructive" });
    } else {
      toast({ title: "Arkivert", description: `${selectedForAction.fornavn} er arkivert` });
      onRefetch();
    }
    setArchiveDialogOpen(false);
    setSelectedForAction(null);
  };

  const handleRestore = async (ansatt: AnsattUtvidet) => {
    const { error } = await restoreAnsatt(ansatt.id);
    if (error) {
      toast({ title: "Feil", description: "Kunne ikke gjenopprette ansatt", variant: "destructive" });
    } else {
      toast({ title: "Gjenopprettet", description: `${ansatt.fornavn} er gjenopprettet` });
      onRefetch();
    }
  };

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
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
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
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">Ansatt</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Stilling</TableHead>
              <TableHead className="text-right">Ansiennitet</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ansatte.map((ansatt) => {
              const roles = getRoleDisplay(ansatt);
              const ansiennitet = ansatt.ansatt_dato 
                ? calculateAnsiennitetYears(ansatt.ansatt_dato, ansatt.fagbrev_dato) 
                : null;
              
              return (
                <TableRow 
                  key={ansatt.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onView(ansatt)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={ansatt.profilbilde_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(ansatt.fornavn, ansatt.etternavn)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {ansatt.fornavn} {ansatt.etternavn}
                        </div>
                        {ansatt.epost && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {ansatt.epost}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {roles.length > 0 ? (
                        roles.map((role, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getStatusColor(ansatt.status)}`}
                    >
                      {getStatusLabel(ansatt.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {ansatt.stillingsprosent != null ? `${ansatt.stillingsprosent}%` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {ansiennitet != null ? (
                      <span>{ansiennitet.toFixed(1)} år</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(ansatt)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Se profil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(ansatt)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Rediger
                        </DropdownMenuItem>
                        {isArchived ? (
                          <DropdownMenuItem onClick={() => handleRestore(ansatt)}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Gjenopprett
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedForAction(ansatt);
                              setArchiveDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Arkiver
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arkiver ansatt</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil arkivere {selectedForAction?.fornavn} {selectedForAction?.etternavn}? 
              Ansatte kan gjenopprettes fra arkivert-fanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-destructive text-destructive-foreground">
              Arkiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
