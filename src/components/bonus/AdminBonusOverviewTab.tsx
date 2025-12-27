import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { BonusSummaryCards } from "@/components/bonus/salon/BonusSummaryCards";
import { MonthlyPurchaseChart } from "@/components/bonus/salon/MonthlyPurchaseChart";
import { AllSalonsBonusTable, SalonBonusData } from "@/components/bonus/AllSalonsBonusTable";
import { SalonBonusDetail } from "@/components/bonus/SalonBonusDetail";
import { calculateGrowthBonus } from "@/components/bonus/salon/GrowthBonusCard";

const LOREAL_SUPPLIER_ID = "ba0636af-39df-4a0b-9792-79a3784f3970";

export function AdminBonusOverviewTab() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [selectedSalon, setSelectedSalon] = useState<SalonBonusData | null>(null);

  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  // Fetch suppliers with bonus data
  const { data: suppliers } = useQuery({
    queryKey: ['bonus-suppliers'],
    queryFn: async () => {
      const { data: supplierIds } = await supabase
        .from('bonus_calculations')
        .select('supplier_id')
        .not('supplier_id', 'is', null);

      const uniqueIds = [...new Set(supplierIds?.map(s => s.supplier_id) || [])];
      
      if (uniqueIds.length === 0) return [];

      const { data: supplierData } = await supabase
        .from('leverandorer')
        .select('id, navn')
        .in('id', uniqueIds);

      return supplierData || [];
    }
  });

  // Fetch all bonus calculations for selected year with pagination
  const { data: bonusCalculations, isLoading: loadingBonus } = useQuery({
    queryKey: ['admin-bonus-overview', selectedYear, selectedSupplier],
    queryFn: async () => {
      const startPeriod = `${selectedYear}-01`;
      const endPeriod = `${selectedYear}-12`;

      const allData: any[] = [];
      let page = 0;
      let hasMore = true;
      const pageSize = 1000;

      while (hasMore) {
        let query = supabase
          .from('bonus_calculations')
          .select(`
            id,
            salon_id,
            supplier_id,
            period,
            total_turnover,
            loyalty_bonus_amount,
            return_commission_amount,
            total_bonus,
            calculation_details,
            salons!inner(id, name)
          `)
          .gte('period', startPeriod)
          .lte('period', endPeriod)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (selectedSupplier !== "all") {
          query = query.eq('supplier_id', selectedSupplier);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          allData.push(...data);
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      return allData;
    }
  });

  // Fetch previous year data for comparison with pagination
  const { data: prevYearCalculations } = useQuery({
    queryKey: ['admin-bonus-overview-prev', selectedYear - 1, selectedSupplier],
    queryFn: async () => {
      const startPeriod = `${selectedYear - 1}-01`;
      const endPeriod = `${selectedYear - 1}-12`;

      const allData: any[] = [];
      let page = 0;
      let hasMore = true;
      const pageSize = 1000;

      while (hasMore) {
        let query = supabase
          .from('bonus_calculations')
          .select('salon_id, supplier_id, total_turnover')
          .gte('period', startPeriod)
          .lte('period', endPeriod)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (selectedSupplier !== "all") {
          query = query.eq('supplier_id', selectedSupplier);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          allData.push(...data);
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      return allData;
    }
  });

  // Fetch baseline overrides for L'Oréal previous year
  const { data: baselineOverrides } = useQuery({
    queryKey: ['admin-baseline-overrides', LOREAL_SUPPLIER_ID, selectedYear - 1],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bonus_baseline_overrides')
        .select('salon_id, override_turnover')
        .eq('supplier_id', LOREAL_SUPPLIER_ID)
        .eq('year', selectedYear - 1);

      if (error) throw error;
      
      // Convert to Map for easy lookup
      const overrideMap = new Map<string, number>();
      data?.forEach(o => overrideMap.set(o.salon_id, Number(o.override_turnover)));
      return overrideMap;
    }
  });

  // Aggregate data
  const aggregatedData = useMemo(() => {
    if (!bonusCalculations) return null;

    // Total aggregates
    const totals = {
      totalTurnover: 0,
      loyaltyBonus: 0,
      totalBonus: 0,
    };

    // Per-salon aggregates
    const salonMap = new Map<string, {
      salonId: string;
      salonName: string;
      turnover: number;
      loyaltyBonus: number;
      totalBonus: number;
      lorealTurnover: number;
    }>();

    // Monthly data for chart
    const monthlyByBrand = new Map<string, Map<string, number>>();

    bonusCalculations.forEach((calc: any) => {
      totals.totalTurnover += calc.total_turnover || 0;
      totals.loyaltyBonus += calc.loyalty_bonus_amount || 0;
      totals.totalBonus += (calc.loyalty_bonus_amount || 0);

      const salonId = calc.salon_id;
      const salonName = calc.salons?.name || 'Ukjent';

      if (!salonMap.has(salonId)) {
        salonMap.set(salonId, {
          salonId,
          salonName,
          turnover: 0,
          loyaltyBonus: 0,
          totalBonus: 0,
          lorealTurnover: 0,
        });
      }

      const salon = salonMap.get(salonId)!;
      salon.turnover += calc.total_turnover || 0;
      salon.loyaltyBonus += calc.loyalty_bonus_amount || 0;
      salon.totalBonus += calc.loyalty_bonus_amount || 0;

      if (calc.supplier_id === LOREAL_SUPPLIER_ID) {
        salon.lorealTurnover += calc.total_turnover || 0;
      }

      // Extract monthly brand data from calculation_details (structure: details.details array)
      const details = calc.calculation_details as any;
      if (details?.details && Array.isArray(details.details)) {
        const period = calc.period;
        details.details.forEach((detail: any) => {
          const brand = detail.brand;
          const turnover = detail.turnover || 0;
          if (brand && turnover > 0) {
            if (!monthlyByBrand.has(period)) {
              monthlyByBrand.set(period, new Map());
            }
            const periodData = monthlyByBrand.get(period)!;
            periodData.set(brand, (periodData.get(brand) || 0) + turnover);
          }
        });
      }
    });

    // Previous year totals for comparison
    const prevYearTurnover = prevYearCalculations?.reduce((sum, c) => sum + (c.total_turnover || 0), 0) || 0;

    // Previous year per-salon L'Oréal data for growth bonus
    const prevYearLorealBySalon = new Map<string, number>();
    prevYearCalculations?.forEach((calc: any) => {
      if (calc.supplier_id === LOREAL_SUPPLIER_ID) {
        prevYearLorealBySalon.set(
          calc.salon_id,
          (prevYearLorealBySalon.get(calc.salon_id) || 0) + (calc.total_turnover || 0)
        );
      }
    });

    // Calculate growth bonus for each salon, using overrides where available
    let totalGrowthBonus = 0;
    const salonsWithGrowthBonus = Array.from(salonMap.values()).map(salon => {
      // Use override if available, otherwise use calculated value
      const calculatedPrevTurnover = prevYearLorealBySalon.get(salon.salonId) || 0;
      const prevLorealTurnover = baselineOverrides?.get(salon.salonId) ?? calculatedPrevTurnover;
      
      const isNewCustomer = prevLorealTurnover === 0 && salon.lorealTurnover > 0;
      const growthPercent = prevLorealTurnover > 0 
        ? ((salon.lorealTurnover - prevLorealTurnover) / prevLorealTurnover) * 100 
        : 0;

      const growthBonusData = calculateGrowthBonus(
        growthPercent,
        salon.lorealTurnover,
        prevLorealTurnover
      );

      const growthBonus = growthBonusData?.totalBonus || 0;
      totalGrowthBonus += growthBonus;

      return {
        ...salon,
        growthBonus,
        totalBonus: salon.loyaltyBonus + growthBonus,
      };
    });

    // Monthly chart data
    const chartData: { reported_period: string; reported_value: number; brand: string | null; product_group: string | null }[] = [];
    monthlyByBrand.forEach((brands, period) => {
      brands.forEach((value, brand) => {
        chartData.push({ 
          reported_period: period, 
          reported_value: value, 
          brand, 
          product_group: null 
        });
      });
    });

    return {
      totals: {
        ...totals,
        totalBonus: totals.loyaltyBonus + totalGrowthBonus,
        growthBonus: totalGrowthBonus,
      },
      prevYearTurnover,
      salons: salonsWithGrowthBonus,
      monthlyData: chartData,
    };
  }, [bonusCalculations, prevYearCalculations, baselineOverrides]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-32">
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle leverandører" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle leverandører</SelectItem>
                  {suppliers?.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.navn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {loadingBonus ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <BonusSummaryCards
          totalTurnover={aggregatedData?.totals.totalTurnover || 0}
          loyaltyBonus={aggregatedData?.totals.loyaltyBonus || 0}
          totalBonus={aggregatedData?.totals.totalBonus || 0}
          previousYearTurnover={aggregatedData?.prevYearTurnover || 0}
          growthBonus={aggregatedData?.totals.growthBonus || 0}
          isLoading={loadingBonus}
        />
      )}

      {/* Monthly Chart */}
      <MonthlyPurchaseChart
        currentYearData={aggregatedData?.monthlyData || []}
        previousYearData={[]}
        selectedYear={selectedYear}
        isLoading={loadingBonus}
      />

      {/* All Salons Table */}
      <AllSalonsBonusTable
        data={aggregatedData?.salons || []}
        isLoading={loadingBonus}
        onSelect={setSelectedSalon}
      />

      {/* Salon Detail Sheet */}
      <SalonBonusDetail
        open={!!selectedSalon}
        onOpenChange={(open) => !open && setSelectedSalon(null)}
        salon={selectedSalon}
        year={selectedYear}
      />
    </div>
  );
}
