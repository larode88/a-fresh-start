import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Package, Gift, Award } from "lucide-react";

interface SalonBonusData {
  salonId: string;
  salonName: string;
  turnover: number;
  loyaltyBonus: number;
  growthBonus: number;
  totalBonus: number;
}

interface SalonBonusDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salon: SalonBonusData | null;
  year: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPercent = (value: number) => {
  return new Intl.NumberFormat('nb-NO', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

const LOREAL_SUPPLIER_ID = "ba0636af-39df-4a0b-9792-79a3784f3970";

export function SalonBonusDetail({ open, onOpenChange, salon, year }: SalonBonusDetailProps) {
  // Fetch detailed bonus calculations for this salon
  const { data: salonDetails, isLoading } = useQuery({
    queryKey: ['salon-bonus-detail', salon?.salonId, year],
    queryFn: async () => {
      if (!salon?.salonId) return null;

      const startPeriod = `${year}-01`;
      const endPeriod = `${year}-12`;

      const { data, error } = await supabase
        .from('bonus_calculations')
        .select(`
          id,
          period,
          supplier_id,
          total_turnover,
          loyalty_bonus_amount,
          return_commission_amount,
          calculation_details,
          leverandorer!inner(id, navn)
        `)
        .eq('salon_id', salon.salonId)
        .gte('period', startPeriod)
        .lte('period', endPeriod);

      if (error) throw error;
      return data;
    },
    enabled: open && !!salon?.salonId,
  });

  // Fetch previous year data for growth comparison
  const { data: prevYearData } = useQuery({
    queryKey: ['salon-bonus-detail-prev', salon?.salonId, year - 1],
    queryFn: async () => {
      if (!salon?.salonId) return null;

      const startPeriod = `${year - 1}-01`;
      const endPeriod = `${year - 1}-12`;

      const { data, error } = await supabase
        .from('bonus_calculations')
        .select('supplier_id, total_turnover')
        .eq('salon_id', salon.salonId)
        .gte('period', startPeriod)
        .lte('period', endPeriod);

      if (error) throw error;
      return data;
    },
    enabled: open && !!salon?.salonId,
  });

  // Fetch baseline overrides for corrected previous year values
  const { data: baselineOverride } = useQuery({
    queryKey: ['salon-baseline-override', salon?.salonId, LOREAL_SUPPLIER_ID, year - 1],
    queryFn: async () => {
      if (!salon?.salonId) return null;

      const { data, error } = await supabase
        .from('bonus_baseline_overrides')
        .select('override_turnover, reason')
        .eq('salon_id', salon.salonId)
        .eq('supplier_id', LOREAL_SUPPLIER_ID)
        .eq('year', year - 1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open && !!salon?.salonId,
  });

  // Aggregate data by supplier
  const supplierBreakdown = useMemo(() => {
    if (!salonDetails) return [];

    const supplierMap = new Map<string, {
      supplierId: string;
      supplierName: string;
      turnover: number;
      loyaltyBonus: number;
      monthlyData: Map<string, number>;
    }>();

    salonDetails.forEach((calc: any) => {
      const supplierId = calc.supplier_id;
      const supplierName = calc.leverandorer?.navn || 'Ukjent';

      if (!supplierMap.has(supplierId)) {
        supplierMap.set(supplierId, {
          supplierId,
          supplierName,
          turnover: 0,
          loyaltyBonus: 0,
          monthlyData: new Map(),
        });
      }

      const supplier = supplierMap.get(supplierId)!;
      supplier.turnover += calc.total_turnover || 0;
      supplier.loyaltyBonus += calc.loyalty_bonus_amount || 0;
      supplier.monthlyData.set(calc.period, (supplier.monthlyData.get(calc.period) || 0) + (calc.total_turnover || 0));
    });

    return Array.from(supplierMap.values()).sort((a, b) => b.turnover - a.turnover);
  }, [salonDetails]);

  // Calculate L'Oréal growth bonus details
  const growthBonusDetails = useMemo(() => {
    if (!salonDetails || !prevYearData) return null;

    const currentLorealTurnover = salonDetails
      .filter((c: any) => c.supplier_id === LOREAL_SUPPLIER_ID)
      .reduce((sum: number, c: any) => sum + (c.total_turnover || 0), 0);

    // Use override if available, otherwise calculate from bonus_calculations
    const calculatedPrevTurnover = prevYearData
      .filter(c => c.supplier_id === LOREAL_SUPPLIER_ID)
      .reduce((sum, c) => sum + (c.total_turnover || 0), 0);
    
    const prevLorealTurnover = baselineOverride?.override_turnover 
      ? Number(baselineOverride.override_turnover) 
      : calculatedPrevTurnover;
    
    const hasOverride = !!baselineOverride?.override_turnover;

    if (currentLorealTurnover === 0) return null;

    const isNewCustomer = prevLorealTurnover === 0;
    const growthPercent = prevLorealTurnover > 0 
      ? ((currentLorealTurnover - prevLorealTurnover) / prevLorealTurnover) * 100 
      : 0;

    // Determine tier
    let tier = 0;
    let bonusRate = 0;
    if (isNewCustomer || growthPercent >= 10) {
      tier = 3;
      bonusRate = 0.10;
    } else if (growthPercent >= 5) {
      tier = 2;
      bonusRate = 0.05;
    } else if (growthPercent >= 0) {
      tier = 1;
      bonusRate = 0.025;
    }

    const bonusAmount = currentLorealTurnover * bonusRate;

    return {
      currentTurnover: currentLorealTurnover,
      prevTurnover: prevLorealTurnover,
      growthPercent,
      isNewCustomer,
      tier,
      bonusRate,
      bonusAmount,
      hasOverride,
      overrideReason: baselineOverride?.reason,
    };
  }, [salonDetails, prevYearData, baselineOverride]);

  if (!salon) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{salon.salonName}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Package className="h-4 w-4" />
                  Totalt innkjøp
                </div>
                <div className="text-xl font-bold">{formatCurrency(salon.turnover)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Gift className="h-4 w-4" />
                  Total bonus
                </div>
                <div className="text-xl font-bold text-primary">{formatCurrency(salon.totalBonus)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Bonus breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bonusfordeling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Lojalitetsbonus</span>
                <span className="font-medium">{formatCurrency(salon.loyaltyBonus)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Vekstbonus (L'Oréal)</span>
                <span className="font-medium">{formatCurrency(salon.growthBonus)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center font-semibold">
                <span>Totalt</span>
                <span className="text-primary">{formatCurrency(salon.totalBonus)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Supplier breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Innkjøp per leverandør</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : supplierBreakdown.length === 0 ? (
                <p className="text-muted-foreground text-sm">Ingen data</p>
              ) : (
                <div className="space-y-3">
                  {supplierBreakdown.map(supplier => (
                    <div key={supplier.supplierId} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">{supplier.supplierName}</span>
                        <Badge variant="outline">{formatCurrency(supplier.turnover)}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Lojalitetsbonus: {formatCurrency(supplier.loyaltyBonus)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Growth bonus details */}
          {growthBonusDetails && growthBonusDetails.bonusAmount > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  L'Oréal Vekstbonus
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {growthBonusDetails.isNewCustomer ? (
                  <Badge className="bg-green-500">Ny kunde - 10% bonus</Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="font-medium">
                      {formatPercent(growthBonusDetails.growthPercent)} vekst
                    </span>
                    <Badge variant="outline">
                      Tier {growthBonusDetails.tier} ({formatPercent(growthBonusDetails.bonusRate * 100)})
                    </Badge>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">{year} innkjøp</div>
                    <div className="font-medium">{formatCurrency(growthBonusDetails.currentTurnover)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground flex items-center gap-1">
                      {year - 1} innkjøp
                      {growthBonusDetails.hasOverride && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          Korrigert
                        </Badge>
                      )}
                    </div>
                    <div className="font-medium">{formatCurrency(growthBonusDetails.prevTurnover)}</div>
                    {growthBonusDetails.hasOverride && growthBonusDetails.overrideReason && (
                      <p className="text-xs text-muted-foreground mt-1">{growthBonusDetails.overrideReason}</p>
                    )}
                  </div>
                </div>

                <Separator />
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Vekstbonus</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(growthBonusDetails.bonusAmount)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
