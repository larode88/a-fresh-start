import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Pencil, Trash2, Settings, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  getBonusRules, 
  createBonusRule, 
  updateBonusRule, 
  deleteBonusRule,
  type BonusRule,
  type Produkttype
} from "@/integrations/supabase/bonusService";
import { formatPercentage } from "@/lib/bonusUtils";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface RuleFormData {
  supplier_id: string;
  brand_id?: string;
  produkttype: Produkttype;
  lojalitetsbonus_prosent: number;
  returprovisjon_prosent: number;
  kjemi_lojalitet_prosent: number;
  kjemi_retur_prosent: number;
  produkt_lojalitet_prosent: number;
  produkt_retur_prosent: number;
  valid_from: string;
  valid_to?: string;
  priority: number;
  min_turnover?: number;
  max_turnover?: number;
  description?: string;
  is_active: boolean;
}

const defaultFormData: RuleFormData = {
  supplier_id: '',
  produkttype: 'begge',
  lojalitetsbonus_prosent: 0,
  returprovisjon_prosent: 0,
  kjemi_lojalitet_prosent: 0,
  kjemi_retur_prosent: 0,
  produkt_lojalitet_prosent: 0,
  produkt_retur_prosent: 0,
  valid_from: new Date().toISOString().split('T')[0],
  priority: 0,
  is_active: true
};

export function BonusRulesTab() {
  const queryClient = useQueryClient();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BonusRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch suppliers from leverandorer table (which has the brands linked)
  const { data: suppliers = [] } = useQuery({
    queryKey: ['leverandorer-for-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leverandorer')
        .select('id, navn')
        .eq('aktiv', true)
        .order('navn');
      if (error) throw error;
      return data as { id: string; navn: string }[];
    }
  });

  // Fetch brands
  const { data: brands = [] } = useQuery({
    queryKey: ['leverandor-merker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leverandor_merker')
        .select('id, navn, leverandor_id')
        .order('navn');
      if (error) throw error;
      return data as { id: string; navn: string; leverandor_id: string }[];
    }
  });

  // Fetch rules
  const { data: rules = [] } = useQuery({
    queryKey: ['bonus-rules', selectedSupplierId],
    queryFn: () => getBonusRules(selectedSupplierId === 'all' ? undefined : selectedSupplierId)
  });

  // Group rules by supplier
  const rulesBySupplier = rules.reduce((acc, rule) => {
    const supplierId = rule.supplier_id;
    if (!acc[supplierId]) {
      acc[supplierId] = {
        supplier: rule.suppliers,
        rules: []
      };
    }
    acc[supplierId].rules.push(rule);
    return acc;
  }, {} as Record<string, { supplier: { name: string } | undefined; rules: BonusRule[] }>);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: RuleFormData) => {
      // Map new form data to database fields
      const rapporteringstype = data.produkttype === 'kjemi' ? 'kjemi' as const : 
                                data.produkttype === 'produkt' ? 'produkt' as const : 
                                'begge_separat' as const;
      const dbData = {
        ...data,
        // Keep legacy fields for backward compatibility
        rule_type: 'combined' as const,
        percentage: data.lojalitetsbonus_prosent || data.returprovisjon_prosent,
        rapporteringstype,
      };

      if (editingRule) {
        return updateBonusRule(editingRule.id, dbData);
      }
      return createBonusRule(dbData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus-rules'] });
      setIsDialogOpen(false);
      setEditingRule(null);
      setFormData(defaultFormData);
      setShowAdvanced(false);
      toast.success(editingRule ? "Regel oppdatert" : "Regel opprettet");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteBonusRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus-rules'] });
      toast.success("Regel slettet");
    }
  });

  const handleEdit = (rule: BonusRule) => {
    setEditingRule(rule);
    setFormData({
      supplier_id: rule.supplier_id,
      brand_id: rule.brand_id,
      produkttype: rule.produkttype || 'begge',
      lojalitetsbonus_prosent: rule.lojalitetsbonus_prosent || 0,
      returprovisjon_prosent: rule.returprovisjon_prosent || 0,
      kjemi_lojalitet_prosent: rule.kjemi_lojalitet_prosent || 0,
      kjemi_retur_prosent: rule.kjemi_retur_prosent || 0,
      produkt_lojalitet_prosent: rule.produkt_lojalitet_prosent || 0,
      produkt_retur_prosent: rule.produkt_retur_prosent || 0,
      valid_from: rule.valid_from,
      valid_to: rule.valid_to,
      priority: rule.priority,
      min_turnover: rule.min_turnover,
      max_turnover: rule.max_turnover,
      description: rule.description,
      is_active: rule.is_active
    });
    setShowAdvanced(!!(rule.priority || rule.min_turnover || rule.max_turnover || rule.description));
    setIsDialogOpen(true);
  };

  const toggleSupplier = (supplierId: string) => {
    const newSet = new Set(expandedSuppliers);
    if (newSet.has(supplierId)) {
      newSet.delete(supplierId);
    } else {
      newSet.add(supplierId);
    }
    setExpandedSuppliers(newSet);
  };

  const filteredBrands = brands.filter(b => 
    !formData.supplier_id || b.leverandor_id === formData.supplier_id
  );

  const getProdukttypeLabel = (produkttype: Produkttype | undefined) => {
    switch (produkttype) {
      case 'kjemi': return 'Kjemi';
      case 'produkt': return 'Videre salg';
      case 'begge': return 'Begge';
      default: return '—';
    }
  };

  const isFormValid = () => {
    if (!formData.supplier_id) return false;
    
    if (formData.produkttype === 'begge') {
      return (
        (formData.kjemi_lojalitet_prosent > 0 || formData.kjemi_retur_prosent > 0) ||
        (formData.produkt_lojalitet_prosent > 0 || formData.produkt_retur_prosent > 0)
      );
    }
    
    return formData.lojalitetsbonus_prosent > 0 || formData.returprovisjon_prosent > 0;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Bonusregler
              </CardTitle>
              <CardDescription>
                Administrer regler for lojalitetsbonus og returprovisjon
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingRule(null);
                setFormData(defaultFormData);
                setShowAdvanced(false);
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ny regel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRule ? 'Rediger regel' : 'Opprett ny regel'}</DialogTitle>
                  <DialogDescription>
                    Konfigurer bonus for leverandør og produkttype
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 py-4">
                  {/* Step 1: Leverandør */}
                  <div className="space-y-2">
                    <Label>Leverandør *</Label>
                    <Select 
                      value={formData.supplier_id} 
                      onValueChange={(v) => setFormData({ ...formData, supplier_id: v, brand_id: undefined })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg leverandør" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.navn}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Step 2: Merkevare (vises når leverandør er valgt) */}
                  {formData.supplier_id && (
                    <div className="space-y-2">
                      <Label>Merkevare</Label>
                      <Select 
                        value={formData.brand_id || "none"} 
                        onValueChange={(v) => setFormData({ ...formData, brand_id: v === "none" ? undefined : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Alle merkevarer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Alle merkevarer</SelectItem>
                          {filteredBrands.map(b => (
                            <SelectItem key={b.id} value={b.id}>{b.navn}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Step 3: Produkttype */}
                  {formData.supplier_id && (
                    <div className="space-y-3">
                      <Label>Produkttype *</Label>
                      <RadioGroup 
                        value={formData.produkttype} 
                        onValueChange={(v: Produkttype) => setFormData({ ...formData, produkttype: v })}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="kjemi" id="kjemi" />
                          <Label htmlFor="kjemi" className="font-normal cursor-pointer">Kjemi</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="produkt" id="produkt" />
                          <Label htmlFor="produkt" className="font-normal cursor-pointer">Videre salg</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="begge" id="begge" />
                          <Label htmlFor="begge" className="font-normal cursor-pointer">Begge</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {/* Step 4: Prosenter - Enkle felter for kjemi eller produkt */}
                  {formData.supplier_id && formData.produkttype !== 'begge' && (
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/30">
                      <div className="space-y-2">
                        <Label>Lojalitetsbonus</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.lojalitetsbonus_prosent}
                            onChange={(e) => setFormData({ ...formData, lojalitetsbonus_prosent: parseFloat(e.target.value) || 0 })}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Returprovisjon</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.returprovisjon_prosent}
                            onChange={(e) => setFormData({ ...formData, returprovisjon_prosent: parseFloat(e.target.value) || 0 })}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4 Alt: Prosenter for begge produkttyper */}
                  {formData.supplier_id && formData.produkttype === 'begge' && (
                    <div className="space-y-4">
                      {/* Kjemi */}
                      <div className="p-4 rounded-lg border bg-muted/30">
                        <Label className="text-sm font-medium mb-3 block">Kjemi</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Lojalitetsbonus</Label>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.kjemi_lojalitet_prosent}
                                onChange={(e) => setFormData({ ...formData, kjemi_lojalitet_prosent: parseFloat(e.target.value) || 0 })}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Returprovisjon</Label>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.kjemi_retur_prosent}
                                onChange={(e) => setFormData({ ...formData, kjemi_retur_prosent: parseFloat(e.target.value) || 0 })}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Videre salg */}
                      <div className="p-4 rounded-lg border bg-muted/30">
                        <Label className="text-sm font-medium mb-3 block">Videre salg</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Lojalitetsbonus</Label>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.produkt_lojalitet_prosent}
                                onChange={(e) => setFormData({ ...formData, produkt_lojalitet_prosent: parseFloat(e.target.value) || 0 })}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Returprovisjon</Label>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.produkt_retur_prosent}
                                onChange={(e) => setFormData({ ...formData, produkt_retur_prosent: parseFloat(e.target.value) || 0 })}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Gyldighet */}
                  {formData.supplier_id && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Gyldig fra *</Label>
                        <Input
                          type="date"
                          value={formData.valid_from}
                          onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gyldig til</Label>
                        <Input
                          type="date"
                          value={formData.valid_to || ''}
                          onChange={(e) => setFormData({ ...formData, valid_to: e.target.value || undefined })}
                        />
                      </div>
                    </div>
                  )}

                  {/* Avanserte innstillinger */}
                  {formData.supplier_id && (
                    <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between text-muted-foreground">
                          Avanserte innstillinger
                          {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 pt-2">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Prioritet</Label>
                            <Input
                              type="number"
                              value={formData.priority}
                              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Min. omsetning</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={formData.min_turnover || ''}
                              onChange={(e) => setFormData({ ...formData, min_turnover: e.target.value ? parseFloat(e.target.value) : undefined })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Maks. omsetning</Label>
                            <Input
                              type="number"
                              placeholder="∞"
                              value={formData.max_turnover || ''}
                              onChange={(e) => setFormData({ ...formData, max_turnover: e.target.value ? parseFloat(e.target.value) : undefined })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Beskrivelse</Label>
                          <Textarea
                            placeholder="Valgfri beskrivelse av regelen..."
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value || undefined })}
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Aktiv toggle */}
                  {formData.supplier_id && (
                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                      <Label>Aktiv</Label>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Avbryt
                  </Button>
                  <Button 
                    onClick={() => saveMutation.mutate(formData)}
                    disabled={!isFormValid() || saveMutation.isPending}
                  >
                    {saveMutation.isPending ? "Lagrer..." : (editingRule ? "Oppdater" : "Opprett")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Alle leverandører" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle leverandører</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.navn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rules by Supplier */}
      {Object.entries(rulesBySupplier).map(([supplierId, { supplier, rules: supplierRules }]) => (
        <Card key={supplierId}>
          <Collapsible
            open={expandedSuppliers.has(supplierId)}
            onOpenChange={() => toggleSupplier(supplierId)}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  {expandedSuppliers.has(supplierId) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <CardTitle className="text-lg">{supplier?.name || 'Ukjent leverandør'}</CardTitle>
                  <Badge variant="secondary">{supplierRules.length} regler</Badge>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Merkevare</TableHead>
                      <TableHead>Produkttype</TableHead>
                      <TableHead className="text-right">Lojalitet</TableHead>
                      <TableHead className="text-right">Retur</TableHead>
                      <TableHead>Gyldighet</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierRules.map(rule => (
                      <TableRow key={rule.id}>
                        <TableCell>{rule.leverandor_merker?.merkenavn || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {getProdukttypeLabel(rule.produkttype)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {rule.produkttype === 'begge' ? (
                            <div className="flex flex-col text-xs">
                              {rule.kjemi_lojalitet_prosent ? <span>K: {formatPercentage(rule.kjemi_lojalitet_prosent)}</span> : null}
                              {rule.produkt_lojalitet_prosent ? <span>P: {formatPercentage(rule.produkt_lojalitet_prosent)}</span> : null}
                            </div>
                          ) : (
                            formatPercentage(rule.lojalitetsbonus_prosent || 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {rule.produkttype === 'begge' ? (
                            <div className="flex flex-col text-xs">
                              {rule.kjemi_retur_prosent ? <span>K: {formatPercentage(rule.kjemi_retur_prosent)}</span> : null}
                              {rule.produkt_retur_prosent ? <span>P: {formatPercentage(rule.produkt_retur_prosent)}</span> : null}
                            </div>
                          ) : (
                            formatPercentage(rule.returprovisjon_prosent || 0)
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(rule.valid_from).toLocaleDateString('nb-NO')}
                          {rule.valid_to && ` – ${new Date(rule.valid_to).toLocaleDateString('nb-NO')}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {rule.is_active ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                if (confirm('Er du sikker på at du vil slette denne regelen?')) {
                                  deleteMutation.mutate(rule.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}

      {rules.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Ingen bonusregler opprettet ennå</p>
            <p className="text-sm">Klikk "Ny regel" for å komme i gang</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
