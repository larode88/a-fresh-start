import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileSearch, Building2, Search, TrendingUp, Receipt, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  getBonusCalculations,
  getNormalizedSales,
  type BonusCalculation,
  type NormalizedSale
} from "@/integrations/supabase/bonusService";
import { 
  formatCurrency, 
  formatPeriodDisplay,
  formatPercentage,
  getCurrentPeriod,
  getCalculationStatusLabel,
  getStatusColor
} from "@/lib/bonusUtils";

interface CalculationDetail {
  brand?: string;
  product_group?: string;
  turnover: number;
  loyalty: number;
  return: number;
  rules: Array<{
    id: string;
    type: string;
    percentage: number;
    amount: number;
  }>;
}

export function BonusAuditTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [selectedSalonId, setSelectedSalonId] = useState<string>("");

  // Fetch salons for search
  const { data: salons = [] } = useQuery({
    queryKey: ['salons-audit-search', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('salons')
        .select('id, name, medlemsnummer, org_number')
        .order('name')
        .limit(20);
      
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,medlemsnummer.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Fetch calculations for selected salon
  const { data: calculations = [] } = useQuery({
    queryKey: ['bonus-calculations-audit', selectedSalonId, period],
    queryFn: () => getBonusCalculations({ salonId: selectedSalonId, period }),
    enabled: !!selectedSalonId
  });

  // Fetch normalized sales for selected salon
  const { data: normalizedSales = [] } = useQuery({
    queryKey: ['bonus-normalized-sales-audit', selectedSalonId, period],
    queryFn: () => getNormalizedSales({ salonId: selectedSalonId, period }),
    enabled: !!selectedSalonId
  });

  // Group normalized sales by supplier
  const salesBySupplier = normalizedSales.reduce((acc, sale) => {
    const supplierId = sale.supplier_id;
    if (!acc[supplierId]) {
      acc[supplierId] = {
        supplier: sale.suppliers,
        sales: []
      };
    }
    acc[supplierId].sales.push(sale);
    return acc;
  }, {} as Record<string, { supplier: { name: string } | undefined; sales: NormalizedSale[] }>);

  const selectedSalon = salons.find(s => s.id === selectedSalonId);

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Revisjon & Drill-down
          </CardTitle>
          <CardDescription>
            Se detaljert beregningsgrunnlag per salong
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Søk salong</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Søk på navn eller medlemsnummer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Periode</Label>
              <Input 
                type="month" 
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>
          </div>

          {/* Salon suggestions */}
          {searchTerm && !selectedSalonId && (
            <div className="border rounded-lg max-h-64 overflow-auto">
              {salons.map(salon => (
                <div
                  key={salon.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-0"
                  onClick={() => {
                    setSelectedSalonId(salon.id);
                    setSearchTerm("");
                  }}
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{salon.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {salon.medlemsnummer && `#${salon.medlemsnummer}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Salon Details */}
      {selectedSalonId && selectedSalon && (
        <>
          {/* Salon Header */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{selectedSalon.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedSalon.medlemsnummer && `Medlemsnr: ${selectedSalon.medlemsnummer}`}
                      {selectedSalon.medlemsnummer && selectedSalon.org_number && ' · '}
                      {selectedSalon.org_number && `Org: ${selectedSalon.org_number}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSalonId("")}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Bytt salong
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Calculation Summary */}
          {calculations.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {calculations.map(calc => (
                <Card key={calc.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{calc.suppliers?.name}</CardTitle>
                      <Badge variant="outline" className={getStatusColor(calc.status)}>
                        {getCalculationStatusLabel(calc.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Omsetning</span>
                      <span className="font-mono">{formatCurrency(calc.total_turnover)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Lojalitetsbonus</span>
                      <span className="font-mono text-blue-600">{formatCurrency(calc.loyalty_bonus_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Returprovisjon</span>
                      <span className="font-mono text-purple-600">{formatCurrency(calc.return_commission_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                      <span>Total bonus</span>
                      <span className="text-green-600">{formatCurrency(calc.total_bonus)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Detailed Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Detaljert beregningsgrunnlag
              </CardTitle>
              <CardDescription>
                Viser alle salgslinjer og anvendte regler for {formatPeriodDisplay(period)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(salesBySupplier).length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Ingen salgsdata for denne perioden</p>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {Object.entries(salesBySupplier).map(([supplierId, { supplier, sales }]) => {
                    const calc = calculations.find(c => c.supplier_id === supplierId);
                    const details = (calc?.calculation_details as { details?: CalculationDetail[] })?.details || [];

                    return (
                      <AccordionItem key={supplierId} value={supplierId} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-4 w-full">
                            <span className="font-medium">{supplier?.name || 'Ukjent leverandør'}</span>
                            <Badge variant="secondary">{sales.length} linjer</Badge>
                            {calc && (
                              <span className="ml-auto text-green-600 font-mono">
                                {formatCurrency(calc.total_bonus)}
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Merkevare</TableHead>
                                <TableHead>Produktgruppe</TableHead>
                                <TableHead className="text-right">Omsetning</TableHead>
                                <TableHead className="text-right">Lojalitet</TableHead>
                                <TableHead className="text-right">Retur</TableHead>
                                <TableHead>Anvendt regel</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sales.map((sale, i) => {
                                const detail = details[i];
                                return (
                                  <TableRow key={sale.id}>
                                    <TableCell>{sale.brand_name || '—'}</TableCell>
                                    <TableCell>{sale.product_group || '—'}</TableCell>
                                    <TableCell className="text-right font-mono">
                                      {formatCurrency(sale.delta_turnover ?? sale.turnover)}
                                      {sale.is_cumulative && sale.delta_turnover !== undefined && (
                                        <span className="text-xs text-muted-foreground block">
                                          (kumulativ: {formatCurrency(sale.turnover)})
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-blue-600">
                                      {detail ? formatCurrency(detail.loyalty) : '—'}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-purple-600">
                                      {detail ? formatCurrency(detail.return) : '—'}
                                    </TableCell>
                                    <TableCell>
                                      {detail?.rules.map((rule, j) => (
                                        <Badge key={j} variant="outline" className="mr-1">
                                          {formatPercentage(rule.percentage)} ({rule.type})
                                        </Badge>
                                      ))}
                                      {(!detail?.rules || detail.rules.length === 0) && (
                                        <span className="text-muted-foreground text-sm">Ingen regel</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedSalonId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Søk på en salong for å se beregningsdetaljer</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
