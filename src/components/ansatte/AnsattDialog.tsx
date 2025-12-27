import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { type AnsattUtvidet, createAnsatt, updateAnsatt } from "@/integrations/supabase/ansatteService";
import { calculateArbeidstidPerUke, calculateFeriekravTimer } from "@/lib/ansattUtils";
import { calculateRecommendedHourlyRate, type TariffRecommendation } from "@/lib/tariffUtils";
import { supabase } from "@/integrations/supabase/client";
import { Info, Lock, UserPlus, Loader2 } from "lucide-react";

const ansattSchema = z.object({
  fornavn: z.string().min(1, "Fornavn er påkrevd"),
  etternavn: z.string().optional(),
  epost: z.string().email("Ugyldig e-post").optional().or(z.literal("")),
  telefon: z.string().optional(),
  frisorfunksjon: z.enum(["frisor", "senior_frisor", "laerling"]).nullable().optional(),
  lederstilling: z.enum(["daglig_leder", "avdelingsleder", "styreleder"]).nullable().optional(),
  status: z.enum(["Aktiv", "Permisjon", "Arkivert"]).default("Aktiv"),
  stillingsprosent: z.coerce.number().min(0).max(100).default(100),
  arbeidstid_per_uke: z.coerce.number().optional(),
  arbeidsdager_pr_uke: z.coerce.number().min(1).max(7).default(5),
  ansatt_dato: z.string().optional(),
  provetid_til: z.string().optional(),
  fodselsdato: z.string().optional(),
  adresse: z.string().optional(),
  postnummer: z.string().optional(),
  poststed: z.string().optional(),
  lonnstype_enum: z.enum(["timelonn", "fastlonn", "provisjon", "timelonn_provisjon"]).nullable().optional(),
  timesats: z.coerce.number().optional(),
  fastlonn: z.coerce.number().optional(),
  provisjon_behandling_prosent: z.coerce.number().min(0).max(100).default(33),
  provisjon_vare_prosent: z.coerce.number().min(0).max(100).default(10),
  provisjon_behandling_hoy_prosent: z.coerce.number().min(0).max(100).default(35),
  provisjon_terskel: z.coerce.number().min(0).default(0),
  lonn_sist_justert: z.string().optional(),
  feriekrav_type_enum: z.enum(["lovfestet", "tariffavtale", "utvidet"]).nullable().optional(),
  feriekrav_timer_per_aar: z.coerce.number().default(157.5),
  fagbrev_dato: z.string().optional(),
  utdanning_fagbrev: z.string().optional(),
  verdier: z.string().optional(),
  motivasjon_i_jobben: z.string().optional(),
  inkluder_i_turnus: z.boolean().default(true),
  inkluder_i_budsjett: z.boolean().default(true),
});

type AnsattFormData = z.infer<typeof ansattSchema>;

interface AnsattDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ansatt: AnsattUtvidet | null;
  salongId: string;
  onSuccess: () => void;
}

export function AnsattDialog({ open, onOpenChange, ansatt, salongId, onSuccess }: AnsattDialogProps) {
  const isEditing = !!ansatt;
  const [tariffRecommendation, setTariffRecommendation] = useState<TariffRecommendation | null>(null);
  const [createUserAccount, setCreateUserAccount] = useState(true);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  const form = useForm<AnsattFormData>({
    resolver: zodResolver(ansattSchema),
    defaultValues: {
      fornavn: "",
      etternavn: "",
      epost: "",
      telefon: "",
      frisorfunksjon: null,
      lederstilling: null,
      status: "Aktiv",
      stillingsprosent: 100,
      arbeidstid_per_uke: 37.5,
      arbeidsdager_pr_uke: 5,
      feriekrav_timer_per_aar: 157.5,
      provisjon_behandling_prosent: 33,
      provisjon_vare_prosent: 10,
      provisjon_behandling_hoy_prosent: 35,
      provisjon_terskel: 0,
      inkluder_i_turnus: true,
      inkluder_i_budsjett: true,
    },
  });
  // Reset form when ansatt changes
  useEffect(() => {
    if (ansatt) {
      form.reset({
        fornavn: ansatt.fornavn || "",
        etternavn: ansatt.etternavn || "",
        epost: ansatt.epost || "",
        telefon: ansatt.telefon || "",
        frisorfunksjon: ansatt.frisorfunksjon as any,
        lederstilling: ansatt.lederstilling as any,
        status: (ansatt.status as any) || "Aktiv",
        stillingsprosent: ansatt.stillingsprosent || 100,
        arbeidstid_per_uke: ansatt.arbeidstid_per_uke || 37.5,
        arbeidsdager_pr_uke: ansatt.arbeidsdager_pr_uke || 5,
        ansatt_dato: ansatt.ansatt_dato || "",
        provetid_til: ansatt.provetid_til || "",
        fodselsdato: ansatt.fodselsdato || "",
        adresse: ansatt.adresse || "",
        postnummer: ansatt.postnummer || "",
        poststed: ansatt.poststed || "",
        lonnstype_enum: ansatt.lonnstype_enum as any,
        timesats: ansatt.timesats || undefined,
        fastlonn: ansatt.fastlonn || undefined,
        provisjon_behandling_prosent: ansatt.provisjon_behandling_prosent ?? 33,
        provisjon_vare_prosent: ansatt.provisjon_vare_prosent ?? 10,
        provisjon_behandling_hoy_prosent: ansatt.provisjon_behandling_hoy_prosent ?? 35,
        provisjon_terskel: ansatt.provisjon_terskel ?? 0,
        lonn_sist_justert: (ansatt as any).lonn_sist_justert || "",
        feriekrav_type_enum: ansatt.feriekrav_type_enum as any,
        feriekrav_timer_per_aar: ansatt.feriekrav_timer_per_aar || 157.5,
        fagbrev_dato: ansatt.fagbrev_dato || "",
        utdanning_fagbrev: ansatt.utdanning_fagbrev || "",
        verdier: ansatt.verdier || "",
        motivasjon_i_jobben: ansatt.motivasjon_i_jobben || "",
        inkluder_i_turnus: ansatt.inkluder_i_turnus ?? true,
        inkluder_i_budsjett: ansatt.inkluder_i_budsjett ?? true,
      });
    } else {
      form.reset({
        fornavn: "",
        etternavn: "",
        epost: "",
        telefon: "",
        frisorfunksjon: null,
        lederstilling: null,
        status: "Aktiv",
        stillingsprosent: 100,
        arbeidstid_per_uke: 37.5,
        arbeidsdager_pr_uke: 5,
        feriekrav_timer_per_aar: 157.5,
        provisjon_behandling_prosent: 33,
        provisjon_vare_prosent: 10,
        provisjon_behandling_hoy_prosent: 35,
        provisjon_terskel: 0,
        inkluder_i_turnus: true,
        inkluder_i_budsjett: true,
      });
    }
  }, [ansatt, form]);

  // Auto-calculate arbeidstid when stillingsprosent changes
  const stillingsprosent = form.watch("stillingsprosent");
  useEffect(() => {
    const arbeidstid = calculateArbeidstidPerUke(stillingsprosent);
    form.setValue("arbeidstid_per_uke", arbeidstid);
  }, [stillingsprosent, form]);

  // Auto-calculate feriekrav when type changes
  const feriekravType = form.watch("feriekrav_type_enum");
  useEffect(() => {
    if (feriekravType) {
      const timer = calculateFeriekravTimer(feriekravType);
      form.setValue("feriekrav_timer_per_aar", timer);
    }
  }, [feriekravType, form]);

  // Watch lonnstype for conditional rendering
  const lonnstype = form.watch("lonnstype_enum");
  const watchedFagbrevDato = form.watch("fagbrev_dato");
  const watchedAnsattDato = form.watch("ansatt_dato");

  // Fetch tariff recommendation when relevant fields change
  useEffect(() => {
    const fetchTariff = async () => {
      if (!salongId || !watchedAnsattDato) {
        setTariffRecommendation(null);
        return;
      }
      const recommendation = await calculateRecommendedHourlyRate(
        salongId,
        watchedFagbrevDato || null,
        watchedAnsattDato
      );
      setTariffRecommendation(recommendation);
    };
    fetchTariff();
  }, [salongId, watchedFagbrevDato, watchedAnsattDato]);

  const watchedEpost = form.watch("epost");

  const onSubmit = async (data: AnsattFormData) => {
    try {
      // Hjelpefunksjon for å konvertere tomme strenger til null
      const emptyToNull = (value: string | null | undefined): string | null => 
        value === '' || value === undefined ? null : value;

      const payload = {
        ...data,
        salong_id: salongId,
        // Tekstfelter
        epost: emptyToNull(data.epost),
        telefon: emptyToNull(data.telefon),
        adresse: emptyToNull(data.adresse),
        postnummer: emptyToNull(data.postnummer),
        poststed: emptyToNull(data.poststed),
        utdanning_fagbrev: emptyToNull(data.utdanning_fagbrev),
        verdier: emptyToNull(data.verdier),
        motivasjon_i_jobben: emptyToNull(data.motivasjon_i_jobben),
        // Enums - konverter til riktig type eller null
        frisorfunksjon: emptyToNull(data.frisorfunksjon) as typeof data.frisorfunksjon | null,
        lederstilling: emptyToNull(data.lederstilling) as typeof data.lederstilling | null,
        lonnstype_enum: emptyToNull(data.lonnstype_enum) as typeof data.lonnstype_enum | null,
        feriekrav_type_enum: emptyToNull(data.feriekrav_type_enum) as typeof data.feriekrav_type_enum | null,
        // Datofelter
        ansatt_dato: emptyToNull(data.ansatt_dato),
        provetid_til: emptyToNull(data.provetid_til),
        fodselsdato: emptyToNull(data.fodselsdato),
        fagbrev_dato: emptyToNull(data.fagbrev_dato),
        lonn_sist_justert: emptyToNull(data.lonn_sist_justert),
      };

      if (isEditing) {
        const { error } = await updateAnsatt(ansatt.id, payload);
        if (error) throw error;
        toast({ title: "Oppdatert", description: "Ansatt er oppdatert" });
      } else {
        const { data: newAnsatt, error } = await createAnsatt(payload as any);
        if (error) throw error;
        
        // Create user account if email is provided and toggle is on
        if (newAnsatt && createUserAccount && data.epost && data.epost.includes("@")) {
          setIsCreatingUser(true);
          try {
            // Build stilling string
            const stillingParts: string[] = [];
            if (data.frisorfunksjon) {
              const stillingMap: Record<string, string> = {
                'frisor': 'Frisør',
                'senior_frisor': 'Senior Frisør',
                'laerling': 'Lærling',
              };
              stillingParts.push(stillingMap[data.frisorfunksjon] || data.frisorfunksjon);
            }
            if (data.lederstilling) {
              const lederMap: Record<string, string> = {
                'daglig_leder': 'Daglig leder',
                'avdelingsleder': 'Avdelingsleder',
                'styreleder': 'Styreleder',
              };
              stillingParts.push(lederMap[data.lederstilling] || data.lederstilling);
            }

            const { data: result, error: userError } = await supabase.functions.invoke("create-employee-user", {
              body: {
                ansatt_id: newAnsatt.id,
                email: data.epost,
                fornavn: data.fornavn,
                etternavn: data.etternavn || undefined,
                telefon: data.telefon || undefined,
                salon_id: salongId,
                stilling: stillingParts.join(", ") || undefined,
                send_welcome_email: true,
              },
            });

            if (userError) {
              console.error("Error creating user:", userError);
              toast({ 
                title: "Ansatt opprettet", 
                description: "Ansatt er opprettet, men brukerkonto kunne ikke opprettes", 
                variant: "default" 
              });
            } else {
              const messages: string[] = ["Ansatt og brukerkonto er opprettet"];
              if (result?.hubspot_contact_id) messages.push("synkronisert til HubSpot");
              if (result?.welcome_email_sent) messages.push("velkomst-e-post sendt");
              
              toast({ 
                title: "Opprettet", 
                description: messages.join(", ") 
              });
            }
          } catch (userErr) {
            console.error("User creation error:", userErr);
            toast({ 
              title: "Ansatt opprettet", 
              description: "Ansatt er opprettet, men det oppstod en feil ved brukeropprettelse" 
            });
          } finally {
            setIsCreatingUser(false);
          }
        } else {
          toast({ title: "Opprettet", description: "Ny ansatt er opprettet" });
        }
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving ansatt:", error);
      toast({ title: "Feil", description: "Kunne ikke lagre ansatt", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Rediger ansatt" : "Ny ansatt"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="grunninfo" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="grunninfo">Grunninfo</TabsTrigger>
                <TabsTrigger value="stilling">Stilling</TabsTrigger>
                <TabsTrigger value="lonn">Lønn</TabsTrigger>
                <TabsTrigger value="kompetanse">Kompetanse</TabsTrigger>
              </TabsList>

              {/* Grunninfo Tab */}
              <TabsContent value="grunninfo" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fornavn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fornavn *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="etternavn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Etternavn</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="epost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-post</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="telefon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* User Account Toggle - only for new employees */}
                {!isEditing && (
                  <Card className={`border-dashed ${!watchedEpost || !watchedEpost.includes("@") ? "opacity-50" : ""}`}>
                    <CardContent className="pt-4">
                      <div className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Opprett brukerkonto og send velkomst
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {watchedEpost && watchedEpost.includes("@") 
                              ? "Oppretter brukerkonto, synkroniserer til HubSpot, og sender velkomst-e-post"
                              : "Fyll inn e-post for å aktivere"
                            }
                          </p>
                        </div>
                        <Switch
                          checked={createUserAccount && !!watchedEpost && watchedEpost.includes("@")}
                          onCheckedChange={setCreateUserAccount}
                          disabled={!watchedEpost || !watchedEpost.includes("@")}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="frisorfunksjon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stilling</FormLabel>
                        <Select 
                          value={field.value || ""} 
                          onValueChange={(v) => field.onChange(v || null)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Velg stilling" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="frisor">Frisør</SelectItem>
                            <SelectItem value="senior_frisor">Senior Frisør</SelectItem>
                            <SelectItem value="laerling">Lærling</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lederstilling"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lederstilling</FormLabel>
                        <Select 
                          value={field.value || ""} 
                          onValueChange={(v) => field.onChange(v || null)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Velg lederstilling" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daglig_leder">Daglig leder</SelectItem>
                            <SelectItem value="avdelingsleder">Avdelingsleder</SelectItem>
                            <SelectItem value="styreleder">Styreleder</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Budget and Schedule Inclusion Toggles */}
                <Card className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      Inkludering i turnus og budsjett
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Ansatte med stilling inkluderes automatisk. For ledere uten stilling kan dette konfigureres manuelt.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="inkluder_i_turnus"
                      render={({ field }) => {
                        const hasFrisorfunksjon = !!form.watch("frisorfunksjon");
                        return (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm font-medium flex items-center gap-2">
                                Inkluder i turnus
                                {hasFrisorfunksjon && <Lock className="h-3 w-3 text-muted-foreground" />}
                              </FormLabel>
                              <FormDescription className="text-xs">
                                {hasFrisorfunksjon 
                                  ? "Automatisk inkludert (har stilling)"
                                  : "Vil vises i turnusplanlegging"
                                }
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={hasFrisorfunksjon ? true : field.value}
                                onCheckedChange={field.onChange}
                                disabled={hasFrisorfunksjon}
                              />
                            </FormControl>
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name="inkluder_i_budsjett"
                      render={({ field }) => {
                        const hasFrisorfunksjon = !!form.watch("frisorfunksjon");
                        return (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm font-medium flex items-center gap-2">
                                Inkluder i budsjett
                                {hasFrisorfunksjon && <Lock className="h-3 w-3 text-muted-foreground" />}
                              </FormLabel>
                              <FormDescription className="text-xs">
                                {hasFrisorfunksjon 
                                  ? "Automatisk inkludert (har stilling)"
                                  : "Vil regnes med i budsjettberegninger"
                                }
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={hasFrisorfunksjon ? true : field.value}
                                onCheckedChange={field.onChange}
                                disabled={hasFrisorfunksjon}
                              />
                            </FormControl>
                          </FormItem>
                        );
                      }}
                    />
                  </CardContent>
                </Card>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Aktiv">Aktiv</SelectItem>
                          <SelectItem value="Permisjon">Permisjon</SelectItem>
                          <SelectItem value="Arkivert">Arkivert</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fodselsdato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fødselsdato</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Stilling Tab */}
              <TabsContent value="stilling" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ansatt_dato"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ansettelsesdato</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="provetid_til"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prøvetid til</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stillingsprosent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stillingsprosent</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} max={100} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="arbeidstid_per_uke"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Arbeidstid per uke (timer)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.5" {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="arbeidsdager_pr_uke"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arbeidsdager per uke</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={7} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="feriekrav_type_enum"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ferietype</FormLabel>
                        <Select 
                          value={field.value || ""} 
                          onValueChange={(v) => field.onChange(v || null)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Velg type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="lovfestet">Lovfestet (4 uker + 1 dag)</SelectItem>
                            <SelectItem value="tariffavtale">Tariffavtale (5 uker)</SelectItem>
                            <SelectItem value="utvidet">Utvidet (6 uker)</SelectItem>
                            <SelectItem value="annet">Annet</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="feriekrav_timer_per_aar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ferietimer per år</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

              </TabsContent>

              {/* Lønn Tab */}
              <TabsContent value="lonn" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="lonnstype_enum"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lønnstype</FormLabel>
                      <Select 
                        value={field.value || ""} 
                        onValueChange={(v) => field.onChange(v || null)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Velg lønnstype" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="timelonn">Timelønn</SelectItem>
                          <SelectItem value="fastlonn">Fastlønn</SelectItem>
                          <SelectItem value="provisjon">Provisjon</SelectItem>
                          <SelectItem value="timelonn_provisjon">Timelønn + Provisjon</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Timesats - vises for timelonn og timelonn_provisjon */}
                {(lonnstype === "timelonn" || lonnstype === "timelonn_provisjon") && (
                  <>
                    <FormField
                      control={form.control}
                      name="timesats"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timesats (kr)</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input type="number" step="0.5" placeholder="f.eks. 236.50" {...field} />
                            </FormControl>
                            {tariffRecommendation && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="whitespace-nowrap"
                                onClick={() => form.setValue("timesats", tariffRecommendation.timesats)}
                              >
                                Bruk tariff
                              </Button>
                            )}
                          </div>
                          <FormDescription>Garantert timelønn</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Anbefalt timesats fra tariff */}
                    {tariffRecommendation && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Anbefalt timesats (fra tariff)</p>
                            <p className="text-lg font-semibold text-primary">
                              {tariffRecommendation.timesats.toFixed(2)} kr/time
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tariffRecommendation.fagbrevStatusLabel} • {tariffRecommendation.ansiennitetAar} års ansiennitet
                              {tariffRecommendation.kilde === 'salong' && ' • Salong-spesifikk'}
                              {tariffRecommendation.kilde === 'sentral' && ' • Sentral tariff'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Fastlønn - vises kun for fastlonn */}
                {lonnstype === "fastlonn" && (
                  <FormField
                    control={form.control}
                    name="fastlonn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fastlønn (kr/mnd)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="f.eks. 45000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Provisjonsstruktur - vises for provisjon og timelonn_provisjon */}
                {(lonnstype === "provisjon" || lonnstype === "timelonn_provisjon") && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Provisjonsstruktur</CardTitle>
                      <CardDescription>Detaljerte provisjonssatser for behandling og varesalg</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="provisjon_behandling_prosent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Behandling - Standard (%)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.5" min={0} max={100} {...field} />
                              </FormControl>
                              <FormDescription>Standard sats for behandlinger</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="provisjon_vare_prosent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Varesalg (%)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.5" min={0} max={100} {...field} />
                              </FormControl>
                              <FormDescription>Sats for produktsalg</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="provisjon_behandling_hoy_prosent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Behandling - Høy (%)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.5" min={0} max={100} {...field} />
                              </FormControl>
                              <FormDescription>Ved omsetning over terskel</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="provisjon_terskel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Terskel (kr/mnd)</FormLabel>
                              <FormControl>
                                <Input type="number" step="1000" min={0} placeholder="f.eks. 140000" {...field} />
                              </FormControl>
                              <FormDescription>Månedlig omsetning for høy sats</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Lønn sist justert */}
                <FormField
                  control={form.control}
                  name="lonn_sist_justert"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lønn sist justert</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>Dato for siste lønnsjustering</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Kompetanse Tab */}
              <TabsContent value="kompetanse" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fagbrev_dato"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fagbrevdato</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="utdanning_fagbrev"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Utdanning/Fagbrev</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="verdier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verdier</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="motivasjon_i_jobben"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivasjon i jobben</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isCreatingUser}>
                Avbryt
              </Button>
              <Button type="submit" disabled={isCreatingUser}>
                {isCreatingUser ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Oppretter...
                  </>
                ) : (
                  isEditing ? "Lagre endringer" : "Opprett ansatt"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
