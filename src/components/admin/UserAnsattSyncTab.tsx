import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Link as LinkIcon, CheckCircle2, AlertTriangle, Users, Mail, Loader2 } from "lucide-react";

interface UnlinkedUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  salon_id: string | null;
  role: string | null;
  salon_name?: string;
}

interface UnlinkedAnsatt {
  id: string;
  fornavn: string;
  etternavn: string | null;
  epost: string | null;
}

interface AnsattWithoutUser {
  id: string;
  fornavn: string;
  etternavn: string | null;
  epost: string;
  telefon: string | null;
  salong_id: string;
  frisorfunksjon: string | null;
  lederstilling: string | null;
  salons: {
    id: string;
    name: string;
    hs_object_id: string | null;
  };
}

export function UserAnsattSyncTab() {
  const queryClient = useQueryClient();
  const [selectedAnsattMap, setSelectedAnsattMap] = useState<Record<string, string>>({});
  const [welcomeEmailMap, setWelcomeEmailMap] = useState<Record<string, boolean>>({});
  const [creatingUserId, setCreatingUserId] = useState<string | null>(null);

  // Fetch users with salon_id but no ansatte link
  const { data: unlinkedUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ['unlinked-users'],
    queryFn: async () => {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, phone, salon_id, role')
        .not('salon_id', 'is', null);

      if (usersError) throw usersError;

      const { data: linkedAnsatte, error: ansatteError } = await supabase
        .from('ansatte')
        .select('user_id')
        .not('user_id', 'is', null);

      if (ansatteError) throw ansatteError;

      const linkedUserIds = new Set(linkedAnsatte?.map(a => a.user_id) || []);
      const unlinked = (users || []).filter(u => !linkedUserIds.has(u.id));

      if (unlinked.length > 0) {
        const salonIds = [...new Set(unlinked.map(u => u.salon_id).filter(Boolean))];
        const { data: salons } = await supabase
          .from('salons')
          .select('id, name')
          .in('id', salonIds);

        const salonMap = new Map(salons?.map(s => [s.id, s.name]) || []);
        return unlinked.map(u => ({
          ...u,
          salon_name: u.salon_id ? salonMap.get(u.salon_id) || 'Ukjent' : undefined
        })) as UnlinkedUser[];
      }

      return unlinked as UnlinkedUser[];
    }
  });

  // Fetch ansatte without user accounts
  const { data: ansatteWithoutUser, isLoading: loadingAnsatte } = useQuery({
    queryKey: ['ansatte-without-user'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ansatte')
        .select(`
          id, fornavn, etternavn, epost, telefon, salong_id, frisorfunksjon, lederstilling,
          salons!inner(id, name, hs_object_id)
        `)
        .is('user_id', null)
        .neq('status', 'Arkivert')
        .not('epost', 'is', null);

      if (error) throw error;
      return (data || []) as unknown as AnsattWithoutUser[];
    }
  });

  // Fetch unlinked ansatte for a specific salon (for linking)
  const fetchUnlinkedAnsatte = async (salonId: string): Promise<UnlinkedAnsatt[]> => {
    const { data, error } = await supabase
      .from('ansatte')
      .select('id, fornavn, etternavn, epost')
      .eq('salong_id', salonId)
      .is('user_id', null)
      .neq('status', 'Arkivert');

    if (error) throw error;
    return data || [];
  };

  // Query for each user's potential ansatte matches
  const { data: ansatteByUser } = useQuery({
    queryKey: ['unlinked-ansatte-by-salon', unlinkedUsers?.map(u => u.salon_id)],
    queryFn: async () => {
      if (!unlinkedUsers) return {};
      
      const result: Record<string, UnlinkedAnsatt[]> = {};
      const uniqueSalonIds = [...new Set(unlinkedUsers.map(u => u.salon_id).filter(Boolean))];
      
      for (const salonId of uniqueSalonIds) {
        if (salonId) {
          result[salonId] = await fetchUnlinkedAnsatte(salonId);
        }
      }
      return result;
    },
    enabled: !!unlinkedUsers && unlinkedUsers.length > 0
  });

  // Mutation to create new ansatt profile
  const createAnsattMutation = useMutation({
    mutationFn: async (user: UnlinkedUser) => {
      const nameParts = (user.name || 'Ukjent').split(' ');
      const fornavn = nameParts[0];
      const etternavn = nameParts.slice(1).join(' ') || null;

      const { data, error } = await supabase
        .from('ansatte')
        .insert({
          fornavn,
          etternavn,
          epost: user.email,
          telefon: user.phone,
          salong_id: user.salon_id,
          user_id: user.id,
          status: 'Aktiv',
          stillingsprosent: 100,
          feriekrav_timer_per_aar: 150,
          inkluder_i_budsjett: true,
          inkluder_i_turnus: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Ansatt-profil opprettet og koblet');
      queryClient.invalidateQueries({ queryKey: ['unlinked-users'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-ansatte-by-salon'] });
      queryClient.invalidateQueries({ queryKey: ['ansatte-without-user'] });
    },
    onError: (error) => {
      toast.error(`Feil ved opprettelse: ${error.message}`);
    }
  });

  // Mutation to link user to existing ansatt
  const linkAnsattMutation = useMutation({
    mutationFn: async ({ userId, ansattId }: { userId: string; ansattId: string }) => {
      const { error } = await supabase
        .from('ansatte')
        .update({ user_id: userId })
        .eq('id', ansattId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Bruker koblet til ansatt-profil');
      queryClient.invalidateQueries({ queryKey: ['unlinked-users'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-ansatte-by-salon'] });
      queryClient.invalidateQueries({ queryKey: ['ansatte-without-user'] });
    },
    onError: (error) => {
      toast.error(`Feil ved kobling: ${error.message}`);
    }
  });

  // Mutation to create user account for ansatt
  const createUserForAnsattMutation = useMutation({
    mutationFn: async (ansatt: AnsattWithoutUser) => {
      const sendWelcomeEmail = welcomeEmailMap[ansatt.id] !== false; // Default true
      const stilling = ansatt.frisorfunksjon || ansatt.lederstilling || null;

      const { data, error } = await supabase.functions.invoke('create-employee-user', {
        body: {
          ansatt_id: ansatt.id,
          email: ansatt.epost,
          fornavn: ansatt.fornavn,
          etternavn: ansatt.etternavn,
          telefon: ansatt.telefon,
          salon_id: ansatt.salong_id,
          stilling,
          send_welcome_email: sendWelcomeEmail
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, ansatt) => {
      const messages: string[] = ['✅ Brukerkonto opprettet'];
      
      if (data.hubspot_contact_id) {
        messages.push('✅ HubSpot-kontakt opprettet (markedskontakt + GDPR)');
      } else if (data.hubspot_error) {
        messages.push(`⚠️ HubSpot: ${data.hubspot_error}`);
      }
      
      if (data.welcome_email_sent) {
        messages.push('✅ Velkomst-e-post sendt');
      } else if (data.email_error) {
        messages.push(`⚠️ E-post: ${data.email_error}`);
      } else if (welcomeEmailMap[ansatt.id] === false) {
        messages.push('ℹ️ Velkomst-e-post ikke sendt (ikke valgt)');
      }
      
      toast.success(
        <div className="space-y-1">
          <div className="font-medium">{ansatt.fornavn} {ansatt.etternavn || ''}</div>
          {messages.map((msg, i) => (
            <div key={i} className="text-sm">{msg}</div>
          ))}
        </div>
      );
      
      queryClient.invalidateQueries({ queryKey: ['ansatte-without-user'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-users'] });
      setCreatingUserId(null);
    },
    onError: (error, ansatt) => {
      toast.error(`Feil ved opprettelse for ${ansatt.fornavn}: ${error.message}`);
      setCreatingUserId(null);
    }
  });

  const handleCreateAnsatt = (user: UnlinkedUser) => {
    createAnsattMutation.mutate(user);
  };

  const handleLinkAnsatt = (userId: string) => {
    const ansattId = selectedAnsattMap[userId];
    if (!ansattId) {
      toast.error('Velg en ansatt å koble til');
      return;
    }
    linkAnsattMutation.mutate({ userId, ansattId });
  };

  const handleCreateUserForAnsatt = (ansatt: AnsattWithoutUser) => {
    setCreatingUserId(ansatt.id);
    createUserForAnsattMutation.mutate(ansatt);
  };

  const getStillingLabel = (ansatt: AnsattWithoutUser) => {
    if (ansatt.frisorfunksjon) {
      const labels: Record<string, string> = {
        frisor: 'Frisør',
        senior_frisor: 'Senior frisør',
        laerling: 'Lærling'
      };
      return labels[ansatt.frisorfunksjon] || ansatt.frisorfunksjon;
    }
    if (ansatt.lederstilling) {
      const labels: Record<string, string> = {
        daglig_leder: 'Daglig leder',
        avdelingsleder: 'Avdelingsleder',
        styreleder: 'Styreleder'
      };
      return labels[ansatt.lederstilling] || ansatt.lederstilling;
    }
    return null;
  };

  if (loadingUsers || loadingAnsatte) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const hasUnlinkedUsers = unlinkedUsers && unlinkedUsers.length > 0;
  const hasAnsatteWithoutUser = ansatteWithoutUser && ansatteWithoutUser.length > 0;

  return (
    <div className="space-y-6">
      {/* Section 1: Users without ansatt profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Brukere uten ansatt-profil
          </CardTitle>
          <CardDescription>
            Brukere med salongstilknytning som mangler ansatt-profil i systemet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasUnlinkedUsers ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
              <p className="text-muted-foreground">
                Alle brukere har en tilhørende ansatt-profil.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="text-sm">
                  {unlinkedUsers.length} bruker{unlinkedUsers.length > 1 ? 'e' : ''} mangler ansatt-profil
                </span>
              </div>

              <div className="divide-y divide-border">
                {unlinkedUsers.map((user) => {
                  const salonAnsatte = user.salon_id ? (ansatteByUser?.[user.salon_id] || []) : [];
                  
                  return (
                    <div key={user.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{user.name || 'Ukjent navn'}</span>
                            {user.role && (
                              <Badge variant="outline" className="text-xs">
                                {user.role}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-0.5">
                            {user.email}
                          </div>
                          {user.salon_name && (
                            <div className="text-sm text-muted-foreground">
                              Salong: {user.salon_name}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          {salonAnsatte.length > 0 && (
                            <div className="flex gap-2">
                              <Select
                                value={selectedAnsattMap[user.id] || ''}
                                onValueChange={(value) => 
                                  setSelectedAnsattMap(prev => ({ ...prev, [user.id]: value }))
                                }
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Velg eksisterende..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {salonAnsatte.map((ansatt) => (
                                    <SelectItem key={ansatt.id} value={ansatt.id}>
                                      {ansatt.fornavn} {ansatt.etternavn || ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleLinkAnsatt(user.id)}
                                disabled={!selectedAnsattMap[user.id] || linkAnsattMutation.isPending}
                              >
                                <LinkIcon className="h-4 w-4 mr-1" />
                                Koble
                              </Button>
                            </div>
                          )}

                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleCreateAnsatt(user)}
                            disabled={createAnsattMutation.isPending}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Opprett ny profil
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Ansatte without user account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Ansatte uten brukerkonto
          </CardTitle>
          <CardDescription>
            Ansatte som ikke har brukerkonto i systemet. Opprett brukerkonto for å gi dem tilgang til portalen.
            HubSpot-kontakt opprettes automatisk med markedskontakt-status og GDPR-samtykke.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasAnsatteWithoutUser ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
              <p className="text-muted-foreground">
                Alle ansatte med e-post har brukerkonto.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
                <span className="text-sm">
                  {ansatteWithoutUser.length} ansatt{ansatteWithoutUser.length > 1 ? 'e' : ''} uten brukerkonto
                </span>
              </div>

              <div className="divide-y divide-border">
                {ansatteWithoutUser.map((ansatt) => {
                  const stillingLabel = getStillingLabel(ansatt);
                  const hasHubSpot = !!ansatt.salons?.hs_object_id;
                  const isCreating = creatingUserId === ansatt.id;
                  
                  return (
                    <div key={ansatt.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {ansatt.fornavn} {ansatt.etternavn || ''}
                            </span>
                            {stillingLabel && (
                              <Badge variant="outline" className="text-xs">
                                {stillingLabel}
                              </Badge>
                            )}
                            {hasHubSpot && (
                              <Badge variant="secondary" className="text-xs">
                                HubSpot
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-0.5">
                            {ansatt.epost}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Salong: {ansatt.salons?.name || 'Ukjent'}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`welcome-${ansatt.id}`}
                              checked={welcomeEmailMap[ansatt.id] !== false}
                              onCheckedChange={(checked) => 
                                setWelcomeEmailMap(prev => ({ ...prev, [ansatt.id]: checked === true }))
                              }
                            />
                            <Label 
                              htmlFor={`welcome-${ansatt.id}`} 
                              className="text-sm cursor-pointer flex items-center gap-1"
                            >
                              <Mail className="h-3.5 w-3.5" />
                              Send velkomst-e-post
                            </Label>
                          </div>

                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleCreateUserForAnsatt(ansatt)}
                            disabled={isCreating || createUserForAnsattMutation.isPending}
                          >
                            {isCreating ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <UserPlus className="h-4 w-4 mr-1" />
                            )}
                            Opprett brukerkonto
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
