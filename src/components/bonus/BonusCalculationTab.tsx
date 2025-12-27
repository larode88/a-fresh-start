import { useState, useMemo, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calculator, Play, CheckCircle2, DollarSign, TrendingUp, Building2, AlertCircle, AlertTriangle, Link, ChevronDown, ChevronRight, ChevronsUpDown, BarChart3, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { 
  getBonusRules,
  getBonusCalculations,
  getAggregatedBonusCalculations,
  upsertBonusCalculation,
  updateCalculationStatus,
  getCalculationSummaryForPeriods,
  getBonusByBrandForPeriods,
  type BonusCalculation,
  type BonusCalculationStatus,
  type NormalizedSale,
  type AggregatedBonusCalculation
} from "@/integrations/supabase/bonusService";
import { 
  calculateBonusForSalon, 
  formatCurrency, 
  formatPeriodDisplay,
  getCurrentPeriod,
  getCalculationStatusLabel,
  getStatusColor,
  getPeriodsInRange
} from "@/lib/bonusUtils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface MissingRuleWarning {
  brand: string;
  supplier: string;
  supplierId: string;
  turnover: number;
}

type SortField = 'salon' | 'turnover' | 'loyaltyBonus' | 'returnCommission' | 'total' | 'status';
type SortDirection = 'asc' | 'desc';

interface BonusCalculationTabProps {
  hideCalculationControls?: boolean;
  districtId?: string;
  hideReturnCommission?: boolean;
}

export function BonusCalculationTab({ hideCalculationControls = false, districtId, hideReturnCommission = false }: BonusCalculationTabProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [batchStartPeriod, setBatchStartPeriod] = useState('2025-01');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentPeriod: '' });
  const [missingRuleWarnings, setMissingRuleWarnings] = useState<MissingRuleWarning[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('total');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const toggleRow = (calcId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(calcId)) next.delete(calcId);
      else next.add(calcId);
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortableHeader = ({ field, label, align }: { field: SortField; label: string; align?: 'left' | 'right' }) => (
    <TableHead 
      className={cn("cursor-pointer hover:bg-muted/50 select-none", align === 'right' && "text-right")}
      onClick={() => handleSort(field)}
    >
      <div className={cn("flex items-center gap-1", align === 'right' && "justify-end")}>
        {label}
        {sortField === field ? (
          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
        ) : (
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        )}
      </div>
    </TableHead>
  );

  // Aggregate brand details from calculation_details
  const aggregateBrandDetails = (details: any[]) => {
    const brandMap = new Map<string, { brand: string; turnover: number; loyalty: number; return: number }>();
    details?.forEach(d => {
      const key = d.brand || 'Ukjent';
      const existing = brandMap.get(key);
      if (existing) {
        existing.turnover += d.turnover || 0;
        existing.loyalty += d.loyalty || 0;
        existing.return += d.return || 0;
      } else {
        brandMap.set(key, {
          brand: key,
          turnover: d.turnover || 0,
          loyalty: d.loyalty || 0,
          return: d.return || 0
        });
      }
    });
    return Array.from(brandMap.values()).sort((a, b) => b.turnover - a.turnover);
  };

  // Fetch suppliers from leverandorer table
  const { data: suppliers = [] } = useQuery({
    queryKey: ['leverandorer'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leverandorer')
        .select('id, navn')
        .order('navn');
      if (error) throw error;
      return data?.map(l => ({ id: l.id, name: l.navn })) || [];
    }
  });

  // Calculate periods in selected range
  const periodsInRange = useMemo(() => 
    getPeriodsInRange(batchStartPeriod, period), 
    [batchStartPeriod, period]
  );

  // Helper to display period range label
  const getPeriodRangeLabel = () => {
    if (batchStartPeriod === period) {
      return formatPeriodDisplay(period);
    }
    return `${formatPeriodDisplay(batchStartPeriod)} – ${formatPeriodDisplay(period)}`;
  };

  // Fetch AGGREGATED calculations using RPC (bypasses 1000-row limit)
  const { data: aggregatedCalculations = [], isLoading: isLoadingCalculations } = useQuery({
    queryKey: ['bonus-calculations-aggregated', batchStartPeriod, period, selectedSupplierId, districtId],
    queryFn: () => getAggregatedBonusCalculations({
      startPeriod: batchStartPeriod,
      endPeriod: period,
      supplierId: selectedSupplierId === 'all' ? undefined : selectedSupplierId,
      districtId: districtId || undefined
    })
  });

  // Status priority for aggregation (lower = better)
  const getStatusPriority = (status: string | null): number => {
    switch (status) {
      case 'paid': return 0;
      case 'approved': return 1;
      case 'calculated': return 2;
      case 'pending': return 3;
      case 'unmatched': return 4;
      default: return 5;
    }
  };

  // Group aggregated calculations by salon (aggregate across suppliers)
  interface SalonGroupedCalculation {
    key: string;
    salon_id: string | null;
    salon_name: string | null;
    salon_medlemsnummer: string | null;
    total_turnover: number;
    loyalty_bonus_amount: number;
    return_commission_amount: number;
    total_bonus: number;
    periods: string[];
    worst_status: string;
    supplierBreakdown: AggregatedBonusCalculation[];
    calculation_details: Array<{
      period: string;
      turnover: number;
      loyalty: number;
      return: number;
      total: number;
      status: string;
      details: any;
    }>;
  }

  const salonGroupedCalculations = useMemo((): SalonGroupedCalculation[] => {
    const salonMap = new Map<string, SalonGroupedCalculation>();
    
    aggregatedCalculations.forEach(calc => {
      const key = calc.salon_id || 'unmatched';
      const existing = salonMap.get(key);
      
      if (existing) {
        existing.total_turnover += calc.total_turnover || 0;
        existing.loyalty_bonus_amount += calc.loyalty_bonus_amount || 0;
        existing.return_commission_amount += calc.return_commission_amount || 0;
        existing.total_bonus += calc.total_bonus || 0;
        existing.periods = [...new Set([...existing.periods, ...calc.periods])].sort();
        existing.supplierBreakdown.push(calc);
        // Keep worst status
        if (getStatusPriority(calc.worst_status) > getStatusPriority(existing.worst_status)) {
          existing.worst_status = calc.worst_status;
        }
        // Merge calculation details
        existing.calculation_details = [...existing.calculation_details, ...calc.calculation_details];
      } else {
        salonMap.set(key, {
          key,
          salon_id: calc.salon_id,
          salon_name: calc.salon_name,
          salon_medlemsnummer: calc.salon_medlemsnummer,
          total_turnover: calc.total_turnover || 0,
          loyalty_bonus_amount: calc.loyalty_bonus_amount || 0,
          return_commission_amount: calc.return_commission_amount || 0,
          total_bonus: calc.total_bonus || 0,
          periods: [...calc.periods],
          worst_status: calc.worst_status,
          supplierBreakdown: [calc],
          calculation_details: [...calc.calculation_details]
        });
      }
    });
    
    return Array.from(salonMap.values());
  }, [aggregatedCalculations]);

  // Sort salon-grouped calculations with "Ukjent salong" always at bottom
  const sortedCalculations = useMemo(() => {
    const knownSalons = salonGroupedCalculations.filter(c => c.salon_id !== null);
    const unknownSalons = salonGroupedCalculations.filter(c => c.salon_id === null);
    
    const sortedKnown = [...knownSalons].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'salon':
          comparison = (a.salon_name || '').localeCompare(b.salon_name || '', 'nb');
          break;
        case 'turnover':
          comparison = (a.total_turnover ?? 0) - (b.total_turnover ?? 0);
          break;
        case 'loyaltyBonus':
          comparison = (a.loyalty_bonus_amount ?? 0) - (b.loyalty_bonus_amount ?? 0);
          break;
        case 'returnCommission':
          comparison = (a.return_commission_amount ?? 0) - (b.return_commission_amount ?? 0);
          break;
        case 'total':
          comparison = (a.total_bonus ?? 0) - (b.total_bonus ?? 0);
          break;
        case 'status':
          comparison = (a.worst_status || '').localeCompare(b.worst_status || '', 'nb');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return [...sortedKnown, ...unknownSalons];
  }, [salonGroupedCalculations, sortField, sortDirection]);

  // Fetch summary for period range (uses RPC to avoid 1000-row limit)
  const { data: summary } = useQuery({
    queryKey: ['bonus-calculation-summary', batchStartPeriod, period, selectedSupplierId],
    queryFn: () => getCalculationSummaryForPeriods(periodsInRange, selectedSupplierId === 'all' ? undefined : selectedSupplierId)
  });

  // Fetch brand-level aggregation for period range (uses RPC to avoid 1000-row limit)
  const { data: brandSummaryData = [] } = useQuery({
    queryKey: ['bonus-brand-summary', batchStartPeriod, period, selectedSupplierId],
    queryFn: () => getBonusByBrandForPeriods(periodsInRange, selectedSupplierId === 'all' ? undefined : selectedSupplierId)
  });

  // Helper: Get previous period (YYYY-MM format)
  const getPreviousPeriod = (currentPeriod: string): string => {
    const [year, month] = currentPeriod.split('-').map(Number);
    if (month === 1) return `${year - 1}-12`;
    return `${year}-${String(month - 1).padStart(2, '0')}`;
  };

  // Run calculation for a specific period
  const runCalculationForPeriod = async (periodToCalculate: string, skipToast = false, supplierId?: string): Promise<{ success: boolean; matchedCount: number; unmatchedCount: number }> => {
    try {
      // Fetch ALL imported sales for current period with pagination to bypass 1000-row limit
      let allImportedSales: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      
      while (true) {
        let query = supabase
          .from('bonus_imported_sales')
          .select('*')
          .eq('reported_period', periodToCalculate);
        
        // Filter by supplier if specified (not "all")
        if (supplierId && supplierId !== 'all') {
          query = query.eq('supplier_id', supplierId);
        }
        
        const { data: batch, error: salesError } = await query.range(offset, offset + batchSize - 1);
        
        if (salesError) throw salesError;
        if (!batch || batch.length === 0) break;
        
        allImportedSales = [...allImportedSales, ...batch];
        
        if (batch.length < batchSize) break; // Last page
        offset += batchSize;
      }
      
      const importedSales = allImportedSales;
      
      if (!importedSales || importedSales.length === 0) {
        if (!skipToast) toast.warning(`Ingen salg funnet for ${formatPeriodDisplay(periodToCalculate)}`);
        return { success: false, matchedCount: 0, unmatchedCount: 0 };
      }

      // Separate matched and unmatched sales
      const matchedSales = importedSales.filter(s => s.matched_salon_id);
      const unmatchedSales = importedSales.filter(s => !s.matched_salon_id);

      // Check if this is January (cumulative reset month)
      const isJanuary = periodToCalculate.endsWith('-01');
      
      // Fetch cumulative_reporting flag per supplier
      const { data: leverandorerData } = await supabase
        .from('leverandorer')
        .select('id, cumulative_reporting');
      
      const supplierCumulativeMap = new Map<string, boolean>();
      leverandorerData?.forEach(l => {
        supplierCumulativeMap.set(l.id, l.cumulative_reporting ?? false);
      });
      
      // Build AGGREGATED totals per supplier-brand-productGroup for current and previous period
      const currentPeriodTotals = new Map<string, number>();
      const previousPeriodTotals = new Map<string, number>();
      
      // Aggregate current period totals
      matchedSales.forEach(sale => {
        const key = `${sale.supplier_id}-${sale.brand?.toLowerCase() || ''}-${sale.product_group?.toLowerCase() || ''}`;
        currentPeriodTotals.set(key, (currentPeriodTotals.get(key) || 0) + sale.reported_value);
      });
      
      // Get unique supplier IDs that use cumulative reporting
      const cumulativeSupplierIds = new Set<string>();
      matchedSales.forEach(sale => {
        if (supplierCumulativeMap.get(sale.supplier_id)) {
          cumulativeSupplierIds.add(sale.supplier_id);
        }
      });
      
      // Fetch cumulative baselines for salon-level overrides
      const cumulativeBaselines = new Map<string, number>(); // key: salon_id-supplier_id
      
      if (!isJanuary && cumulativeSupplierIds.size > 0) {
        const prevPeriod = getPreviousPeriod(periodToCalculate);
        
        // Fetch manual baselines for the previous period
        const { data: baselines } = await supabase
          .from('bonus_cumulative_baselines')
          .select('salon_id, supplier_id, cumulative_value')
          .eq('period', prevPeriod)
          .in('supplier_id', Array.from(cumulativeSupplierIds));
        
        baselines?.forEach(b => {
          cumulativeBaselines.set(`${b.salon_id}-${b.supplier_id}`, b.cumulative_value);
        });
        
        // Paginate to avoid 1000-row limit
        let allPrevSales: any[] = [];
        let prevOffset = 0;
        
        while (true) {
          const { data: prevBatch } = await supabase
            .from('bonus_imported_sales')
            .select('supplier_id, brand, product_group, reported_value, matched_salon_id')
            .eq('reported_period', prevPeriod)
            .in('supplier_id', Array.from(cumulativeSupplierIds))
            .in('match_status', ['matched', 'manual_override'])
            .range(prevOffset, prevOffset + 999);
          
          if (!prevBatch || prevBatch.length === 0) break;
          allPrevSales = [...allPrevSales, ...prevBatch];
          if (prevBatch.length < 1000) break;
          prevOffset += 1000;
        }
        
        allPrevSales.forEach(sale => {
          const key = `${sale.supplier_id}-${sale.brand?.toLowerCase() || ''}-${sale.product_group?.toLowerCase() || ''}`;
          previousPeriodTotals.set(key, (previousPeriodTotals.get(key) || 0) + sale.reported_value);
        });
      }

      // Fetch brand lookup table
      const { data: brands } = await supabase
        .from('leverandor_merker')
        .select('id, navn, leverandor_id');
      
      const brandMap = new Map<string, string>();
      brands?.forEach(b => {
        brandMap.set(`${b.leverandor_id}-${b.navn?.toLowerCase()}`, b.id);
      });

      // Convert MATCHED imported sales to NormalizedSale format
      const sales: NormalizedSale[] = matchedSales.map(sale => {
        const brandKey = `${sale.supplier_id}-${sale.brand?.toLowerCase()}`;
        const brandId = brandMap.get(brandKey);
        const isCumulative = supplierCumulativeMap.get(sale.supplier_id) ?? false;
        
        let delta: number;
        if (isCumulative) {
          // Cumulative reporting (L'Oréal): calculate delta from previous period
          const baselineKey = `${sale.matched_salon_id}-${sale.supplier_id}`;
          const manualBaseline = cumulativeBaselines.get(baselineKey);
          
          if (manualBaseline !== undefined) {
            // Use manual baseline for this salon-supplier (handles missing period data)
            delta = isJanuary ? sale.reported_value : sale.reported_value - manualBaseline;
          } else {
            // Use aggregate calculation (standard flow)
            const aggregateKey = `${sale.supplier_id}-${sale.brand?.toLowerCase() || ''}-${sale.product_group?.toLowerCase() || ''}`;
            const currentTotal = currentPeriodTotals.get(aggregateKey) || 0;
            const previousTotal = previousPeriodTotals.get(aggregateKey) || 0;
            const aggregateDelta = isJanuary ? currentTotal : currentTotal - previousTotal;
            const salonShare = currentTotal > 0 ? sale.reported_value / currentTotal : 0;
            delta = aggregateDelta * salonShare;
          }
        } else {
          // Non-cumulative reporting (Maria Nila): use reported value directly
          delta = sale.reported_value;
        }
        
        return {
          id: sale.id,
          salon_id: sale.matched_salon_id!,
          supplier_id: sale.supplier_id,
          brand_id: brandId,
          brand_name: sale.brand || undefined,
          product_group: sale.product_group || undefined,
          rapporteringstype: sale.product_group as 'kjemi' | 'produkt' | undefined,
          period: sale.reported_period,
          turnover: sale.reported_value,
          delta_turnover: delta,
          source_batch_id: sale.batch_id,
          is_cumulative: isCumulative,
          is_locked: false,
          created_at: sale.created_at || new Date().toISOString(),
          updated_at: sale.created_at || new Date().toISOString()
        };
      });

      // Build AGGREGATED totals for UNMATCHED sales (only for cumulative suppliers)
      const unmatchedCurrentTotals = new Map<string, number>();
      const unmatchedPreviousTotals = new Map<string, number>();
      
      // Get cumulative unmatched sales
      const cumulativeUnmatchedSales = unmatchedSales.filter(sale => supplierCumulativeMap.get(sale.supplier_id));
      
      cumulativeUnmatchedSales.forEach(sale => {
        const key = `${sale.raw_identifier}-${sale.brand?.toLowerCase() || ''}-${sale.product_group?.toLowerCase() || ''}`;
        unmatchedCurrentTotals.set(key, (unmatchedCurrentTotals.get(key) || 0) + sale.reported_value);
      });
      
      if (!isJanuary && cumulativeUnmatchedSales.length > 0) {
        const prevPeriod = getPreviousPeriod(periodToCalculate);
        const rawIdentifiers = [...new Set(cumulativeUnmatchedSales.map(s => s.raw_identifier).filter(Boolean))];
        
        if (rawIdentifiers.length > 0) {
          // Paginate to avoid 1000-row limit
          let allPrevUnmatched: any[] = [];
          let unmatchedOffset = 0;
          
          while (true) {
            const { data: prevUnmatchedBatch } = await supabase
              .from('bonus_imported_sales')
              .select('raw_identifier, brand, product_group, reported_value')
              .eq('reported_period', prevPeriod)
              .in('raw_identifier', rawIdentifiers)
              .range(unmatchedOffset, unmatchedOffset + 999);
            
            if (!prevUnmatchedBatch || prevUnmatchedBatch.length === 0) break;
            allPrevUnmatched = [...allPrevUnmatched, ...prevUnmatchedBatch];
            if (prevUnmatchedBatch.length < 1000) break;
            unmatchedOffset += 1000;
          }
          
          allPrevUnmatched.forEach(sale => {
            const key = `${sale.raw_identifier}-${sale.brand?.toLowerCase() || ''}-${sale.product_group?.toLowerCase() || ''}`;
            unmatchedPreviousTotals.set(key, (unmatchedPreviousTotals.get(key) || 0) + sale.reported_value);
          });
        }
      }

      // Convert UNMATCHED imported sales
      const unmatchedNormalized: NormalizedSale[] = unmatchedSales.map(sale => {
        const brandKey = `${sale.supplier_id}-${sale.brand?.toLowerCase()}`;
        const brandId = brandMap.get(brandKey);
        const isCumulative = supplierCumulativeMap.get(sale.supplier_id) ?? false;
        
        let delta: number;
        if (isCumulative) {
          const aggregateKey = `${sale.raw_identifier}-${sale.brand?.toLowerCase() || ''}-${sale.product_group?.toLowerCase() || ''}`;
          const currentTotal = unmatchedCurrentTotals.get(aggregateKey) || 0;
          const previousTotal = unmatchedPreviousTotals.get(aggregateKey) || 0;
          const aggregateDelta = isJanuary ? currentTotal : currentTotal - previousTotal;
          const share = currentTotal > 0 ? sale.reported_value / currentTotal : 0;
          delta = aggregateDelta * share;
        } else {
          // Non-cumulative: use reported value directly
          delta = sale.reported_value;
        }
        
        return {
          id: sale.id,
          salon_id: 'unmatched',
          supplier_id: sale.supplier_id,
          brand_id: brandId,
          brand_name: sale.brand || undefined,
          product_group: sale.product_group || undefined,
          rapporteringstype: sale.product_group as 'kjemi' | 'produkt' | undefined,
          period: sale.reported_period,
          turnover: sale.reported_value,
          delta_turnover: delta,
          source_batch_id: sale.batch_id,
          is_cumulative: isCumulative,
          is_locked: false,
          created_at: sale.created_at || new Date().toISOString(),
          updated_at: sale.created_at || new Date().toISOString()
        };
      });

      if (sales.length === 0 && unmatchedNormalized.length === 0) {
        if (!skipToast) toast.warning(`Ingen salg funnet for beregning i ${formatPeriodDisplay(periodToCalculate)}`);
        return { success: false, matchedCount: 0, unmatchedCount: 0 };
      }
      
      // Get all active rules
      const rules = await getBonusRules();
      const activeRules = rules.filter(r => r.is_active);

      if (activeRules.length === 0) {
        if (!skipToast) toast.error('Ingen aktive bonusregler funnet');
        return { success: false, matchedCount: 0, unmatchedCount: 0 };
      }

      // Track brands without rules (only for single period calculation)
      if (!skipToast) {
        const missingRulesMap = new Map<string, MissingRuleWarning>();
        const allSalesForWarningCheck = [...sales, ...unmatchedNormalized];
        const supplierNameMap = new Map<string, string>();
        suppliers.forEach(s => supplierNameMap.set(s.id, s.name));

        allSalesForWarningCheck.forEach(sale => {
          const brandKey = `${sale.supplier_id}-${sale.brand_name?.toLowerCase() || 'unknown'}`;
          const hasMatchingRule = activeRules.some(rule => {
            if (rule.supplier_id !== sale.supplier_id) return false;
            if (rule.brand_id && rule.brand_id !== sale.brand_id) return false;
            return true;
          });
          
          if (!hasMatchingRule && sale.brand_name) {
            const existing = missingRulesMap.get(brandKey);
            if (existing) {
              existing.turnover += sale.delta_turnover;
            } else {
              missingRulesMap.set(brandKey, {
                brand: sale.brand_name,
                supplier: supplierNameMap.get(sale.supplier_id) || 'Ukjent',
                supplierId: sale.supplier_id,
                turnover: sale.delta_turnover
              });
            }
          }
        });
        setMissingRuleWarnings(Array.from(missingRulesMap.values()).sort((a, b) => b.turnover - a.turnover));
      }

      // Get unique salon/supplier combinations for MATCHED sales
      const combinations = new Map<string, { salon_id: string; supplier_id: string }>();
      sales.forEach(sale => {
        const key = `${sale.salon_id}-${sale.supplier_id}`;
        if (!combinations.has(key)) {
          combinations.set(key, { salon_id: sale.salon_id, supplier_id: sale.supplier_id });
        }
      });

      // Get unique suppliers for UNMATCHED sales
      const unmatchedSuppliers = new Set<string>();
      unmatchedNormalized.forEach(sale => unmatchedSuppliers.add(sale.supplier_id));

      const totalMatched = combinations.size;
      const totalUnmatched = unmatchedSuppliers.size;

      // Calculate for each MATCHED combination
      for (const { salon_id, supplier_id } of combinations.values()) {
        const result = calculateBonusForSalon(salon_id, supplier_id, periodToCalculate, sales, activeRules);

        await upsertBonusCalculation({
          salon_id,
          supplier_id,
          period: periodToCalculate,
          total_turnover: result.totalTurnover,
          loyalty_bonus_amount: result.loyaltyBonus,
          return_commission_amount: result.returnCommission,
          applied_rule_ids: result.appliedRules.map(r => r.rule.id),
          calculation_details: {
            details: result.details.map(d => ({
              brand: d.sale.brand_name,
              product_group: d.sale.product_group,
              turnover: d.turnover,
              loyalty: d.loyaltyBonus,
              return: d.returnCommission,
              rules: d.appliedRules.map(r => ({
                id: r.rule.id,
                type: r.type,
                percentage: r.rule.percentage,
                amount: r.bonusAmount
              }))
            }))
          },
          status: 'calculated',
          calculated_at: new Date().toISOString(),
          calculated_by: user?.id
        });
      }

      // Calculate for each UNMATCHED supplier aggregation
      for (const supplierId of unmatchedSuppliers) {
        const supplierUnmatchedSales = unmatchedNormalized.filter(s => s.supplier_id === supplierId);
        const result = calculateBonusForSalon('unmatched', supplierId, periodToCalculate, supplierUnmatchedSales, activeRules);

        await upsertBonusCalculation({
          salon_id: null,
          supplier_id: supplierId,
          period: periodToCalculate,
          total_turnover: result.totalTurnover,
          loyalty_bonus_amount: result.loyaltyBonus,
          return_commission_amount: result.returnCommission,
          applied_rule_ids: result.appliedRules.map(r => r.rule.id),
          calculation_details: {
            unmatched_count: supplierUnmatchedSales.length,
            details: result.details.map(d => ({
              brand: d.sale.brand_name,
              product_group: d.sale.product_group,
              turnover: d.turnover,
              loyalty: d.loyaltyBonus,
              return: d.returnCommission,
              rules: d.appliedRules.map(r => ({
                id: r.rule.id,
                type: r.type,
                percentage: r.rule.percentage,
                amount: r.bonusAmount
              }))
            }))
          },
          status: 'unmatched',
          calculated_at: new Date().toISOString(),
          calculated_by: user?.id
        });
      }

      return { success: true, matchedCount: totalMatched, unmatchedCount: totalUnmatched };
    } catch (error: any) {
      console.error('Calculation error:', error);
      if (!skipToast) toast.error(error.message || 'Feil under beregning');
      return { success: false, matchedCount: 0, unmatchedCount: 0 };
    }
  };

  // Run single period calculation (wrapper)
  const runCalculation = async () => {
    setIsCalculating(true);
    setCalculationProgress(0);
    setBatchProgress({ current: 0, total: 0, currentPeriod: '' });

    try {
      const result = await runCalculationForPeriod(period, false, selectedSupplierId);
      
      queryClient.invalidateQueries({ queryKey: ['bonus-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['bonus-calculation-summary'] });
      
      if (result.success) {
        const messages: string[] = [];
        if (result.matchedCount > 0) messages.push(`${result.matchedCount} salonger`);
        if (result.unmatchedCount > 0) messages.push(`${result.unmatchedCount} umatchede grupper`);
        toast.success(`Beregning fullført for ${messages.join(' og ')}`);
      }
    } finally {
      setIsCalculating(false);
      setCalculationProgress(0);
    }
  };

  // Run batch calculation for multiple periods
  const runBatchCalculation = async () => {
    setIsCalculating(true);
    setCalculationProgress(0);
    
    try {
      const periods = getPeriodsInRange(batchStartPeriod, period);
      
      // Check which periods have import data - filter by supplier if selected
      let batchQuery = supabase
        .from('bonus_import_batches')
        .select('period')
        .eq('status', 'completed')
        .in('period', periods);
      
      // Filter by supplier if specified (not "all")
      if (selectedSupplierId !== 'all') {
        batchQuery = batchQuery.eq('supplier_id', selectedSupplierId);
      }
      
      const { data: batches } = await batchQuery;
      
      const periodsWithData = [...new Set(batches?.map(b => b.period) || [])].sort();
      
      if (periodsWithData.length === 0) {
        toast.warning('Ingen perioder har importerte data i valgt område for valgt leverandør');
        return;
      }

      setBatchProgress({ current: 0, total: periodsWithData.length, currentPeriod: '' });
      
      let totalMatched = 0;
      let totalUnmatched = 0;
      let completedPeriods = 0;

      for (let i = 0; i < periodsWithData.length; i++) {
        const currentPeriod = periodsWithData[i];
        setBatchProgress({ current: i + 1, total: periodsWithData.length, currentPeriod });
        setCalculationProgress(((i + 1) / periodsWithData.length) * 100);
        
        const result = await runCalculationForPeriod(currentPeriod, true, selectedSupplierId);
        
        if (result.success) {
          totalMatched += result.matchedCount;
          totalUnmatched += result.unmatchedCount;
          completedPeriods++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['bonus-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['bonus-calculation-summary'] });
      
      toast.success(`Batch-beregning fullført: ${completedPeriods} perioder, ${totalMatched} salonger, ${totalUnmatched} umatchede`);
    } catch (error: any) {
      console.error('Batch calculation error:', error);
      toast.error(error.message || 'Feil under batch-beregning');
    } finally {
      setIsCalculating(false);
      setCalculationProgress(0);
      setBatchProgress({ current: 0, total: 0, currentPeriod: '' });
    }
  };

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) => updateCalculationStatus(id, 'approved', user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus-calculations'] });
      toast.success('Beregning godkjent');
    }
  });

  // Calculate total unique salons from aggregated calculations (excluding unmatched)
  const totalSalons = salonGroupedCalculations.filter(c => c.salon_id).length;
  const unmatchedCount = salonGroupedCalculations.filter(c => !c.salon_id).length;

  // Group brand summary from RPC data (avoids 1000-row limit)
  interface BrandGroupedSummary {
    brand: string;
    totalTurnover: number;
    totalLoyalty: number;
    totalReturn: number;
    categories: Array<{
      category: string;
      turnover: number;
      loyalty: number;
      return: number;
    }>;
  }

  const brandGroupedSummary = useMemo((): BrandGroupedSummary[] => {
    const brandMap = new Map<string, BrandGroupedSummary>();
    
    // Use RPC data instead of calculations (avoids 1000-row limit)
    brandSummaryData.forEach(row => {
      const brand = row.brand || 'Ukjent';
      const category = row.productGroup?.toLowerCase() || 'ukjent';
      
      const existing = brandMap.get(brand);
      if (existing) {
        existing.totalTurnover += row.totalTurnover;
        existing.totalLoyalty += row.loyaltyBonus;
        existing.totalReturn += row.returnCommission;
        existing.categories.push({
          category,
          turnover: row.totalTurnover,
          loyalty: row.loyaltyBonus,
          return: row.returnCommission
        });
      } else {
        brandMap.set(brand, {
          brand,
          totalTurnover: row.totalTurnover,
          totalLoyalty: row.loyaltyBonus,
          totalReturn: row.returnCommission,
          categories: [{
            category,
            turnover: row.totalTurnover,
            loyalty: row.loyaltyBonus,
            return: row.returnCommission
          }]
        });
      }
    });
    
    return Array.from(brandMap.values())
      .sort((a, b) => b.totalTurnover - a.totalTurnover);
  }, [brandSummaryData]);

  const toggleBrandExpand = (brand: string) => {
    setExpandedBrands(prev => {
      const next = new Set(prev);
      if (next.has(brand)) {
        next.delete(brand);
      } else {
        next.add(brand);
      }
      return next;
    });
  };

  const toggleAllBrands = () => {
    if (expandedBrands.size === brandGroupedSummary.length) {
      setExpandedBrands(new Set());
    } else {
      setExpandedBrands(new Set(brandGroupedSummary.map(b => b.brand)));
    }
  };

  const monthlySummaryTotals = useMemo(() => ({
    turnover: brandGroupedSummary.reduce((sum, r) => sum + r.totalTurnover, 0),
    loyalty: brandGroupedSummary.reduce((sum, r) => sum + r.totalLoyalty, 0),
    return: brandGroupedSummary.reduce((sum, r) => sum + r.totalReturn, 0)
  }), [brandGroupedSummary]);

  const stats = [
    {
      label: 'Total omsetning',
      value: formatCurrency(monthlySummaryTotals.turnover || 0),
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      label: 'Lojalitetsbonus',
      value: formatCurrency(summary?.loyaltyBonus || 0),
      icon: TrendingUp,
      color: 'text-blue-600'
    },
    ...(!hideReturnCommission ? [{
      label: 'Returprovisjon',
      value: formatCurrency(summary?.returnCommission || 0),
      icon: TrendingUp,
      color: 'text-purple-600'
    }] : []),
    {
      label: 'Salonger',
      value: totalSalons + (unmatchedCount > 0 ? ` (${unmatchedCount})` : ''),
      icon: Building2,
      color: unmatchedCount > 0 ? 'text-amber-600' : 'text-amber-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Beregning
          </CardTitle>
          <CardDescription>
            Kjør bonusberegning for en periode basert på importerte salgsdata og gjeldende regler
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Fra periode</Label>
              <Input 
                type="month" 
                value={batchStartPeriod}
                onChange={(e) => setBatchStartPeriod(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Til periode</Label>
              <Input 
                type="month" 
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Leverandør</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle leverandører" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle leverandører</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!hideCalculationControls && (
              <>
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button 
                    variant="outline"
                    className="w-full" 
                    onClick={runCalculation}
                    disabled={isCalculating}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Kjør periode
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button 
                    className="w-full" 
                    onClick={runBatchCalculation}
                    disabled={isCalculating}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Kjør alle perioder
                  </Button>
                </div>
              </>
            )}
          </div>

          {isCalculating && !hideCalculationControls && (
            <div className="space-y-4">
              {batchProgress.total > 0 ? (
                <>
                  {/* Steg-indikator */}
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    {Array.from({ length: batchProgress.total }, (_, i) => {
                      const stepNum = i + 1;
                      const isCompleted = stepNum < batchProgress.current;
                      const isCurrent = stepNum === batchProgress.current;
                      
                      return (
                        <Fragment key={i}>
                          {/* Sirkel med nummer */}
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                            isCompleted && "bg-green-600 text-white",
                            isCurrent && "bg-primary text-primary-foreground animate-pulse",
                            !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                          )}>
                            {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : stepNum}
                          </div>
                          {/* Linje mellom steg */}
                          {i < batchProgress.total - 1 && (
                            <div className={cn(
                              "h-0.5 w-4 sm:w-6 transition-colors",
                              stepNum < batchProgress.current ? "bg-green-600" : "bg-muted"
                            )} />
                          )}
                        </Fragment>
                      );
                    })}
                  </div>
                  
                  {/* Status-tekst */}
                  <div className="text-sm text-muted-foreground text-center">
                    Beregner {formatPeriodDisplay(batchProgress.currentPeriod)} ({batchProgress.current}/{batchProgress.total})
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Progress value={calculationProgress} className="h-2" />
                  <div className="text-sm text-muted-foreground text-center">
                    Beregner... {Math.round(calculationProgress)}%
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-semibold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status breakdown */}
      {summary && (summary.pendingCount > 0 || summary.calculatedCount > 0 || summary.approvedCount > 0 || summary.paidCount > 0 || summary.unmatchedCount > 0) && (
        <div className="flex gap-2 flex-wrap">
          {summary.unmatchedCount > 0 && (
            <Badge variant="outline" className={getStatusColor('unmatched')}>
              {getCalculationStatusLabel('unmatched')}: {summary.unmatchedCount}
            </Badge>
          )}
          {summary.pendingCount > 0 && (
            <Badge variant="outline" className={getStatusColor('pending')}>
              {getCalculationStatusLabel('pending')}: {summary.pendingCount}
            </Badge>
          )}
          {summary.calculatedCount > 0 && (
            <Badge variant="outline" className={getStatusColor('calculated')}>
              {getCalculationStatusLabel('calculated')}: {summary.calculatedCount}
            </Badge>
          )}
          {summary.approvedCount > 0 && (
            <Badge variant="outline" className={getStatusColor('approved')}>
              {getCalculationStatusLabel('approved')}: {summary.approvedCount}
            </Badge>
          )}
          {summary.paidCount > 0 && (
            <Badge variant="outline" className={getStatusColor('paid')}>
              {getCalculationStatusLabel('paid')}: {summary.paidCount}
            </Badge>
          )}
        </div>
      )}

      {/* Missing Rule Warnings */}
      {missingRuleWarnings.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Merker uten bonusregler
            </CardTitle>
            <CardDescription className="text-amber-600 dark:text-amber-500">
              Følgende merker har omsetning men ingen aktive bonusregler – bonus/returprovisjon beregnes ikke for disse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {missingRuleWarnings.map((warning, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-white dark:bg-background border border-amber-200 dark:border-amber-700">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      {warning.supplier}
                    </Badge>
                    <span className="font-medium">{warning.brand}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      Omsetning: <span className="font-mono font-medium">{formatCurrency(warning.turnover)}</span>
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-400 dark:border-amber-700"
                      onClick={() => {
                        toast.info(`Gå til Regler-fanen for å opprette bonusregel for ${warning.brand}`);
                      }}
                    >
                      Opprett regel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-3">
              Tips: Opprett bonusregler i Regler-fanen og kjør beregningen på nytt.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Monthly Summary by Brand - Hierarchical */}
      {brandGroupedSummary.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Månedsoversikt – {getPeriodRangeLabel()}
                </CardTitle>
                <CardDescription>
                  Totaler aggregert fra alle salonger per merke {periodsInRange.length > 1 && `(${periodsInRange.length} perioder)`}
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={toggleAllBrands}
                className="text-muted-foreground"
              >
                {expandedBrands.size === brandGroupedSummary.length ? (
                  <>
                    <ChevronsUpDown className="h-4 w-4 mr-1" />
                    Lukk alle
                  </>
                ) : (
                  <>
                    <ChevronsUpDown className="h-4 w-4 mr-1" />
                    Åpne alle
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Merke</TableHead>
                  <TableHead className="text-right">Omsetning</TableHead>
                  <TableHead className="text-right">Lojalitetsbonus</TableHead>
                  {!hideReturnCommission && <TableHead className="text-right">Returprovisjon</TableHead>}
                  {!hideReturnCommission && <TableHead className="text-right">Total</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {brandGroupedSummary.map((brandRow) => {
                  const isExpanded = expandedBrands.has(brandRow.brand);
                  const hasMultipleCategories = brandRow.categories.length > 1;
                  
                  return (
                    <Fragment key={brandRow.brand}>
                      {/* Brand row */}
                      <TableRow 
                        className={cn(
                          "cursor-pointer hover:bg-muted/50",
                          isExpanded && "bg-muted/30"
                        )}
                        onClick={() => hasMultipleCategories && toggleBrandExpand(brandRow.brand)}
                      >
                        <TableCell className="w-[40px]">
                          {hasMultipleCategories ? (
                            isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )
                          ) : null}
                        </TableCell>
                        <TableCell className="font-medium">{brandRow.brand}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(brandRow.totalTurnover)}</TableCell>
                        <TableCell className="text-right font-mono text-blue-600">{formatCurrency(brandRow.totalLoyalty)}</TableCell>
                        {!hideReturnCommission && <TableCell className="text-right font-mono text-purple-600">{formatCurrency(brandRow.totalReturn)}</TableCell>}
                        {!hideReturnCommission && (
                          <TableCell className="text-right font-mono font-semibold text-green-600">
                            {formatCurrency(brandRow.totalLoyalty + brandRow.totalReturn)}
                          </TableCell>
                        )}
                      </TableRow>
                      
                      {/* Category rows (expanded) */}
                      {isExpanded && brandRow.categories.map((cat, catIdx) => (
                        <TableRow key={`${brandRow.brand}-${cat.category}-${catIdx}`} className="bg-muted/20">
                          <TableCell></TableCell>
                          <TableCell className="pl-8">
                            <Badge variant="outline" className={
                              cat.category === 'kjemi' 
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                                : cat.category === 'produkt'
                                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
                                  : 'bg-muted'
                            }>
                              {cat.category === 'kjemi' ? 'Kjemi' : cat.category === 'produkt' ? 'Produkt' : 'Ukjent'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(cat.turnover)}</TableCell>
                          <TableCell className="text-right font-mono text-blue-600/70">{formatCurrency(cat.loyalty)}</TableCell>
                          {!hideReturnCommission && <TableCell className="text-right font-mono text-purple-600/70">{formatCurrency(cat.return)}</TableCell>}
                          {!hideReturnCommission && (
                            <TableCell className="text-right font-mono text-green-600/70">
                              {formatCurrency(cat.loyalty + cat.return)}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </Fragment>
                  );
                })}
              </TableBody>
              <tfoot>
                <TableRow className="border-t-2 bg-muted/50">
                  <TableCell></TableCell>
                  <TableCell className="font-semibold">TOTAL</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(monthlySummaryTotals.turnover)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-blue-600">{formatCurrency(monthlySummaryTotals.loyalty)}</TableCell>
                  {!hideReturnCommission && <TableCell className="text-right font-mono font-semibold text-purple-600">{formatCurrency(monthlySummaryTotals.return)}</TableCell>}
                  {!hideReturnCommission && (
                    <TableCell className="text-right font-mono font-bold text-green-600">
                      {formatCurrency(monthlySummaryTotals.loyalty + monthlySummaryTotals.return)}
                    </TableCell>
                  )}
                </TableRow>
              </tfoot>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Calculations Table - only show for admin */}
      {!hideCalculationControls && (
        <Card>
          <CardHeader>
            <CardTitle>Beregningsresultater – {getPeriodRangeLabel()}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCalculations ? (
              <div className="py-12 text-center text-muted-foreground">Laster...</div>
            ) : salonGroupedCalculations.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Ingen beregninger for denne perioden</p>
                <p className="text-sm">Kjør beregning for å generere resultater</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <SortableHeader field="salon" label="Salong" />
                    <SortableHeader field="turnover" label="Omsetning" align="right" />
                    <SortableHeader field="loyaltyBonus" label="Lojalitetsbonus" align="right" />
                    <SortableHeader field="returnCommission" label="Returprovisjon" align="right" />
                    <SortableHeader field="total" label="Total" align="right" />
                    <SortableHeader field="status" label="Status" />
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCalculations.map(calc => {
                    const isExpanded = expandedRows.has(calc.key);
                    // Aggregate brand details from all calculation_details
                    const allDetails = calc.calculation_details.flatMap(cd => cd.details?.details || []);
                    const brandDetails = aggregateBrandDetails(allDetails);
                    const hasPeriods = calc.periods.length > 1;
                    
                    return (
                      <Fragment key={calc.key}>
                        <TableRow 
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            !calc.salon_id && "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                          )}
                          onClick={() => toggleRow(calc.key)}
                        >
                          <TableCell className="p-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            {calc.salon_id ? (
                              <div>
                                <p className="font-medium">{calc.salon_name}</p>
                                {calc.salon_medlemsnummer && (
                                  <p className="text-xs text-muted-foreground">#{calc.salon_medlemsnummer}</p>
                                )}
                                {hasPeriods && (
                                  <p className="text-xs text-muted-foreground">{calc.periods.length} perioder</p>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <div>
                                  <p className="font-medium">Ukjent salong</p>
                                  <p className="text-xs text-amber-600 dark:text-amber-500">
                                    Salgslinjer ikke matchet
                                  </p>
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(calc.total_turnover)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-blue-600">
                            {formatCurrency(calc.loyalty_bonus_amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-purple-600">
                            {formatCurrency(calc.return_commission_amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-green-600">
                            {formatCurrency(calc.total_bonus)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusColor(calc.worst_status as BonusCalculationStatus)}>
                              {getCalculationStatusLabel(calc.worst_status as BonusCalculationStatus)}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {!calc.salon_id ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-amber-600 border-amber-300 hover:bg-amber-50"
                                onClick={() => {
                                  toast.info('Gå til Import-fanen for å matche salgslinjer');
                                }}
                              >
                                <Link className="h-4 w-4 mr-1" />
                                Match salg
                              </Button>
                            ) : calc.worst_status === 'calculated' && calc.periods.length === 1 && calc.supplierBreakdown[0]?.calculation_ids[0] && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => approveMutation.mutate(calc.supplierBreakdown[0].calculation_ids[0])}
                                disabled={approveMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Godkjenn
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded details: suppliers first, then periods, then brands */}
                        {isExpanded && (
                          <TableRow key={`${calc.key}-details`} className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={8} className="p-0">
                              <div className="px-8 py-3 space-y-4">
                                {/* Supplier breakdown */}
                                {calc.supplierBreakdown.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Leverandørfordeling</p>
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                          <TableHead className="h-8 text-xs">Leverandør</TableHead>
                                          <TableHead className="h-8 text-xs text-right">Omsetning</TableHead>
                                          <TableHead className="h-8 text-xs text-right">Lojalitetsbonus</TableHead>
                                          <TableHead className="h-8 text-xs text-right">Returprovisjon</TableHead>
                                          <TableHead className="h-8 text-xs text-right">Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {calc.supplierBreakdown
                                          .sort((a, b) => b.total_turnover - a.total_turnover)
                                          .map((supplier) => (
                                          <TableRow key={supplier.supplier_id} className="hover:bg-muted/50">
                                            <TableCell className="py-1.5 font-medium">
                                              {supplier.supplier_name}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-right font-mono text-sm">
                                              {formatCurrency(supplier.total_turnover)}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-right font-mono text-sm text-blue-600">
                                              {formatCurrency(supplier.loyalty_bonus_amount)}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-right font-mono text-sm text-purple-600">
                                              {formatCurrency(supplier.return_commission_amount)}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-right font-mono text-sm font-semibold text-green-600">
                                              {formatCurrency(supplier.total_bonus)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                                
                                {/* Period breakdown - show ALL periods in range, aggregated across all suppliers */}
                                {(() => {
                                  // Aggregate periods by period name
                                  const periodMap = new Map<string, { 
                                    period: string; 
                                    turnover: number; 
                                    loyalty: number; 
                                    return: number; 
                                    total: number;
                                    status: string;
                                    hasData: boolean;
                                  }>();
                                  
                                  // Initialize all periods in range with zeros
                                  periodsInRange.forEach(period => {
                                    periodMap.set(period, {
                                      period,
                                      turnover: 0,
                                      loyalty: 0,
                                      return: 0,
                                      total: 0,
                                      status: 'ingen_data',
                                      hasData: false
                                    });
                                  });
                                  
                                  // Fill in actual data from calculation_details
                                  calc.calculation_details.forEach(cd => {
                                    const existing = periodMap.get(cd.period);
                                    if (existing) {
                                      existing.turnover += cd.turnover || 0;
                                      existing.loyalty += cd.loyalty || 0;
                                      existing.return += cd.return || 0;
                                      existing.total += cd.total || 0;
                                      existing.hasData = true;
                                      // Keep worst status (only if has data)
                                      if (existing.status === 'ingen_data' || getStatusPriority(cd.status) > getStatusPriority(existing.status)) {
                                        existing.status = cd.status || 'calculated';
                                      }
                                    }
                                  });
                                  
                                  const allPeriods = Array.from(periodMap.values())
                                    .sort((a, b) => a.period.localeCompare(b.period));
                                  
                                  return (
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground mb-2">Periodefordeling</p>
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="hover:bg-transparent">
                                            <TableHead className="h-8 text-xs">Periode</TableHead>
                                            <TableHead className="h-8 text-xs text-right">Omsetning</TableHead>
                                            <TableHead className="h-8 text-xs text-right">Lojalitetsbonus</TableHead>
                                            <TableHead className="h-8 text-xs text-right">Returprovisjon</TableHead>
                                            <TableHead className="h-8 text-xs text-right">Total</TableHead>
                                            <TableHead className="h-8 text-xs">Status</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {allPeriods.map((periodData) => (
                                            <TableRow 
                                              key={periodData.period} 
                                              className={cn(
                                                "hover:bg-muted/50",
                                                !periodData.hasData && "opacity-50"
                                              )}
                                            >
                                              <TableCell className="py-1.5 font-medium">
                                                {formatPeriodDisplay(periodData.period)}
                                              </TableCell>
                                              <TableCell className="py-1.5 text-right font-mono text-sm">
                                                {periodData.hasData ? formatCurrency(periodData.turnover) : '–'}
                                              </TableCell>
                                              <TableCell className="py-1.5 text-right font-mono text-sm text-blue-600">
                                                {periodData.hasData ? formatCurrency(periodData.loyalty) : '–'}
                                              </TableCell>
                                              <TableCell className="py-1.5 text-right font-mono text-sm text-purple-600">
                                                {periodData.hasData ? formatCurrency(periodData.return) : '–'}
                                              </TableCell>
                                              <TableCell className="py-1.5 text-right font-mono text-sm font-semibold text-green-600">
                                                {periodData.hasData ? formatCurrency(periodData.total) : '–'}
                                              </TableCell>
                                              <TableCell className="py-1.5">
                                                {periodData.hasData ? (
                                                  <Badge variant="outline" className={cn("text-xs", getStatusColor(periodData.status as BonusCalculationStatus))}>
                                                    {getCalculationStatusLabel(periodData.status as BonusCalculationStatus)}
                                                  </Badge>
                                                ) : (
                                                  <span className="text-xs text-muted-foreground">Ingen data</span>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  );
                                })()}
                                
                                {/* Brand breakdown */}
                                {brandDetails.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Fordeling per merke</p>
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                          <TableHead className="h-8 text-xs">Merke</TableHead>
                                          <TableHead className="h-8 text-xs text-right">Omsetning</TableHead>
                                          <TableHead className="h-8 text-xs text-right">Lojalitetsbonus</TableHead>
                                          <TableHead className="h-8 text-xs text-right">Returprovisjon</TableHead>
                                          <TableHead className="h-8 text-xs text-right">Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {brandDetails.map((brand, idx) => (
                                          <TableRow key={idx} className="hover:bg-muted/50">
                                            <TableCell className="py-1.5 font-medium">{brand.brand}</TableCell>
                                            <TableCell className="py-1.5 text-right font-mono text-sm">
                                              {formatCurrency(brand.turnover)}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-right font-mono text-sm text-blue-600">
                                              {formatCurrency(brand.loyalty)}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-right font-mono text-sm text-purple-600">
                                              {formatCurrency(brand.return)}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-right font-mono text-sm font-semibold text-green-600">
                                              {formatCurrency(brand.loyalty + brand.return)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
