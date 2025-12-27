import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface BrandBreakdownTableProps {
  salonId: string;
  supplierId: string;
  year: number;
}

interface BrandData {
  brand: string;
  kjemi: number;
  produkt: number;
  total: number;
  loyaltyBonus: number;
  prevYearTotal: number;
  trend: number;
}

interface CalculationDetail {
  brand: string;
  turnover: number;
  loyalty: number;
  return: number;
  product_group: string;
}

// Brand colors matching MonthlyPurchaseChart
const BRAND_COLORS: Record<string, string> = {
  // L'Oréal merker
  "L'Oréal Professionnel": "hsl(195, 65%, 45%)",
  "Kérastase": "hsl(340, 55%, 55%)",
  "Redken": "hsl(25, 55%, 55%)",
  "Matrix": "hsl(145, 45%, 45%)",
  "Shu Uemura": "hsl(270, 40%, 55%)",
  "Pureology": "hsl(45, 60%, 50%)",
  "Biolage": "hsl(200, 50%, 50%)",
  // Andre leverandører/merker
  "Verdant": "hsl(85, 50%, 45%)",
  "Maria Nila": "hsl(315, 50%, 55%)",
  "Nõberu of Sweden": "hsl(210, 45%, 50%)",
  "Nõberu": "hsl(210, 45%, 50%)",
  "Rekvisita": "hsl(35, 60%, 50%)",
  "ICON Hairspa": "hsl(180, 45%, 45%)",
  "InGoodHands": "hsl(155, 50%, 45%)",
  "AVEDA": "hsl(100, 45%, 45%)",
  "Bumble and Bumble": "hsl(350, 60%, 55%)",
  "GHD": "hsl(0, 0%, 35%)",
  "Wella": "hsl(15, 55%, 50%)",
  "Vision Haircare": "hsl(230, 50%, 55%)",
  "Vision": "hsl(230, 50%, 55%)",
};

const getBrandColor = (brand: string) => BRAND_COLORS[brand] || "hsl(0, 0%, 60%)";

const formatNumber = (amount: number) => {
  return new Intl.NumberFormat('nb-NO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatValue = (amount: number) => {
  if (amount === 0) return '-';
  return formatNumber(amount);
};

export function BrandBreakdownTable({
  salonId,
  supplierId,
  year
}: BrandBreakdownTableProps) {
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

  // Fetch current year data from bonus_calculations with delta values
  const { data: currentYearData, isLoading: loadingCurrent } = useQuery({
    queryKey: ['brand-breakdown', salonId, supplierId, year],
    queryFn: async () => {
      const startPeriod = `${year}-01`;
      const endPeriod = `${year}-12`;
      
      let query = supabase
        .from('bonus_calculations')
        .select('period, calculation_details')
        .eq('salon_id', salonId)
        .gte('period', startPeriod)
        .lte('period', endPeriod);
      
      // Filter by supplier if not "all"
      if (supplierId !== 'all') {
        query = query.eq('supplier_id', supplierId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId
  });

  // Fetch previous year data from bonus_calculations
  const { data: prevYearData, isLoading: loadingPrev } = useQuery({
    queryKey: ['brand-breakdown-prev', salonId, supplierId, year - 1],
    queryFn: async () => {
      const startPeriod = `${year - 1}-01`;
      const endPeriod = `${year - 1}-12`;
      
      let query = supabase
        .from('bonus_calculations')
        .select('period, calculation_details')
        .eq('salon_id', salonId)
        .gte('period', startPeriod)
        .lte('period', endPeriod);
      
      // Filter by supplier if not "all"
      if (supplierId !== 'all') {
        query = query.eq('supplier_id', supplierId);
      }
      
      const { data, error } = await query;
      
      if (error) return [];
      return data || [];
    },
    enabled: !!salonId
  });

  // Fetch baseline override for this salon/supplier/year (if exists)
  const { data: baselineOverride } = useQuery({
    queryKey: ['brand-baseline-override', salonId, supplierId, year - 1],
    queryFn: async () => {
      if (!salonId || supplierId === 'all') return null;
      
      const { data, error } = await supabase
        .from('bonus_baseline_overrides')
        .select('override_turnover')
        .eq('salon_id', salonId)
        .eq('supplier_id', supplierId)
        .eq('year', year - 1)
        .maybeSingle();
      
      if (error) return null;
      return data;
    },
    enabled: !!salonId && supplierId !== 'all'
  });

  const isLoading = loadingCurrent || loadingPrev;

  // Aggregate data by brand from calculation_details
  const brandData: BrandData[] = (() => {
    if (!currentYearData) return [];

    const brandMap = new Map<string, BrandData>();

    // Aggregate current year from calculation_details
    currentYearData.forEach(calc => {
      const details = (calc.calculation_details as { details?: CalculationDetail[] })?.details || [];
      
      details.forEach(detail => {
        const brand = detail.brand || 'Ukjent';
        if (!brandMap.has(brand)) {
          brandMap.set(brand, {
            brand,
            kjemi: 0,
            produkt: 0,
            total: 0,
            loyaltyBonus: 0,
            prevYearTotal: 0,
            trend: 0
          });
        }
        
        const data = brandMap.get(brand)!;
        const isKjemi = detail.product_group?.toLowerCase() === 'kjemi';
        
        if (isKjemi) {
          data.kjemi += detail.turnover ?? 0;
        } else {
          data.produkt += detail.turnover ?? 0;
        }
        data.total += detail.turnover ?? 0;
        data.loyaltyBonus += detail.loyalty ?? 0;
      });
    });

    // Calculate total calculated prev year (before any override correction)
    let calculatedPrevYearTotal = 0;

    // Aggregate previous year from calculation_details
    prevYearData?.forEach(calc => {
      const details = (calc.calculation_details as { details?: CalculationDetail[] })?.details || [];
      
      details.forEach(detail => {
        const brand = detail.brand || 'Ukjent';
        const turnover = detail.turnover ?? 0;
        calculatedPrevYearTotal += turnover;
        
        if (brandMap.has(brand)) {
          brandMap.get(brand)!.prevYearTotal += turnover;
        }
      });
    });

    // Calculate correction factor if baseline override exists
    // This proportionally adjusts each brand's prev year total based on the salon-level override
    const correctionFactor = baselineOverride?.override_turnover && calculatedPrevYearTotal > 0
      ? baselineOverride.override_turnover / calculatedPrevYearTotal
      : 1;

    // Calculate trend with correction factor applied
    brandMap.forEach((data) => {
      const correctedPrevYear = data.prevYearTotal * correctionFactor;
      if (correctedPrevYear > 0) {
        data.trend = ((data.total - correctedPrevYear) / correctedPrevYear) * 100;
      }
    });

    return Array.from(brandMap.values()).sort((a, b) => b.total - a.total);
  })();

  const toggleBrand = (brand: string) => {
    const newExpanded = new Set(expandedBrands);
    if (newExpanded.has(brand)) {
      newExpanded.delete(brand);
    } else {
      newExpanded.add(brand);
    }
    setExpandedBrands(newExpanded);
  };

  // Calculate breakdown bonus from proportional split
  const getBreakdownBonus = (data: BrandData, type: 'kjemi' | 'produkt') => {
    if (data.total === 0) return 0;
    const proportion = type === 'kjemi' ? data.kjemi / data.total : data.produkt / data.total;
    return Math.round(data.loyaltyBonus * proportion);
  };

  const TrendIndicator = ({ trend }: { trend: number }) => {
    if (Math.abs(trend) < 0.5) {
      return (
        <div className="flex items-center justify-end gap-1 text-muted-foreground">
          <Minus className="h-3.5 w-3.5" />
          <span className="text-sm">0%</span>
        </div>
      );
    }
    
    if (trend > 0) {
      return (
        <div className="flex items-center justify-end gap-1 text-green-600">
          <TrendingUp className="h-3.5 w-3.5" />
          <span className="text-sm">+{trend.toFixed(0)}%</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-end gap-1 text-red-600">
        <TrendingDown className="h-3.5 w-3.5" />
        <span className="text-sm">{trend.toFixed(0)}%</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (brandData.length === 0) {
    return (
      <Card className="rounded-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Per merke</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Ingen data tilgjengelig for valgt periode
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-border/50">
      <CardHeader>
        <CardTitle className="text-lg">Per merke</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px] pl-6">Merke</TableHead>
              <TableHead className="text-right w-[110px]">Kjemi</TableHead>
              <TableHead className="text-right w-[110px]">Produkt</TableHead>
              <TableHead className="text-right w-[100px]">Bonus</TableHead>
              <TableHead className="text-right w-[90px] pr-6">vs. {year - 1}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brandData.map((data) => {
              const isExpanded = expandedBrands.has(data.brand);
              const hasBreakdown = data.kjemi > 0 && data.produkt > 0;
              
              return (
                <>
                  <TableRow 
                    key={data.brand}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50 transition-colors",
                      isExpanded && "bg-muted/30"
                    )}
                    onClick={() => hasBreakdown && toggleBrand(data.brand)}
                  >
                    <TableCell className="font-medium pl-6">
                      <div className="flex items-center gap-2">
                        {hasBreakdown ? (
                          <ChevronRight className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isExpanded && "rotate-90"
                          )} />
                        ) : (
                          <span className="w-4" />
                        )}
                        <span 
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: getBrandColor(data.brand) }}
                        />
                        {data.brand}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatValue(data.kjemi)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatValue(data.produkt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-green-600">
                      {formatNumber(Math.round(data.loyaltyBonus))}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <TrendIndicator trend={data.trend} />
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded breakdown rows */}
                  {isExpanded && data.kjemi > 0 && (
                    <TableRow key={`${data.brand}-kjemi`} className="bg-muted/20">
                      <TableCell className="pl-12 text-muted-foreground text-sm">
                        Kjemi
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground text-sm">
                        {formatNumber(data.kjemi)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">-</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground text-sm">
                        {formatNumber(getBreakdownBonus(data, 'kjemi'))}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                  {isExpanded && data.produkt > 0 && (
                    <TableRow key={`${data.brand}-produkt`} className="bg-muted/20">
                      <TableCell className="pl-12 text-muted-foreground text-sm">
                        Produkt
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">-</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground text-sm">
                        {formatNumber(data.produkt)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground text-sm">
                        {formatNumber(getBreakdownBonus(data, 'produkt'))}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
