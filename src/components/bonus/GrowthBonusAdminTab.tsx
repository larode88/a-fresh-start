import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, Users, Percent, Coins, Building2, BarChart3, Calendar, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/bonusUtils";
import { SalonGrowthBonusDetail } from "./SalonGrowthBonusDetail";

// L'Oréal er den eneste leverandøren med vekstbonus
const LOREAL_SUPPLIER_ID = "ba0636af-39df-4a0b-9792-79a3784f3970";

interface GrowthTier {
  threshold: number;
  bonusRate: number;
  label: string;
  color: string;
  hasExtraBonus?: boolean; // For 5%+ tier with additional 10% on excess
}

// Nye regler for vekstbonus:
// 1. Ingen vekst (≤0%): 0 kr
// 2. Vekst 0-5%: 2,5% av årets totale omsetning
// 3. Vekst ≥5%: 5% av årets totale omsetning + 10% av beløpet som overstiger 5% vekst
// Tre visuelle nivåer:
const TIER_2_5 = { threshold: 0, bonusRate: 0.025, label: "2,5%", color: "bg-yellow-400" };
const TIER_5 = { threshold: 5, bonusRate: 0.05, label: "5%", color: "bg-green-500" };
const TIER_10_EXTRA = { threshold: 5, bonusRate: 0.10, label: "+10%", color: "bg-emerald-600", hasExtraBonus: true };

const GROWTH_TIERS: GrowthTier[] = [TIER_5, TIER_2_5];

interface SalonGrowthData {
  salonId: string;
  salonName: string;
  districtId: string | null;
  districtName: string | null;
  // Tre hovedkolonner
  currentYearToDate: number;        // Hittil i år (siste kumulative)
  currentYearLatestPeriod: string;  // Hvilken måned "hittil i år" er fra
  previousYearSamePeriod: number;   // Hittil i fjor (samme måned)
  previousYearTotal: number;        // Fjorår total (desember)
  // Beregnet
  growthVsSamePeriod: number;       // % vekst vs samme periode i fjor
  progressVsFullYear: number;       // % av fjorår total oppnådd
  amountToReachLastYear: number;    // Beløp som mangler for å nå fjorår total
  tier: GrowthTier | null;
  hasExtraTier: boolean;            // True hvis ≥5% vekst (viser +10% badge i tillegg)
  bonusAmount: number;              // Vekstbonus
  loyaltyBonus: number;             // Lojalitetsbonus
  totalBonus: number;               // Total bonus (vekst + lojalitet)
}

type SortField = "salonName" | "currentYearToDate" | "previousYearSamePeriod" | "growthVsSamePeriod" | "previousYearTotal" | "progressVsFullYear" | "amountToReachLastYear" | "bonusAmount" | "loyaltyBonus" | "totalBonus";
type SortDirection = "asc" | "desc";

interface GrowthBonusAdminTabProps {
  districtId?: string;
  hideDistrictSelector?: boolean;
}

export function GrowthBonusAdminTab({ districtId, hideDistrictSelector }: GrowthBonusAdminTabProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [internalDistrict, setInternalDistrict] = useState<string>("alle");
  const [sortField, setSortField] = useState<SortField>("currentYearToDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedSalon, setSelectedSalon] = useState<SalonGrowthData | null>(null);

  // Use external districtId if provided, otherwise use internal state
  const selectedDistrict = districtId || internalDistrict;
  const showDistrictSelector = !districtId && !hideDistrictSelector;

  // Fetch districts
  const { data: districts } = useQuery({
    queryKey: ["districts-for-growth-bonus"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("districts")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch baseline overrides for previous year
  const { data: baselineOverrides } = useQuery({
    queryKey: ["baseline-overrides", LOREAL_SUPPLIER_ID, selectedYear - 1],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bonus_baseline_overrides")
        .select("salon_id, override_turnover")
        .eq("supplier_id", LOREAL_SUPPLIER_ID)
        .eq("year", selectedYear - 1);

      if (error) throw error;
      
      // Convert to Map for easy lookup
      const overrideMap = new Map<string, number>();
      data?.forEach(o => overrideMap.set(o.salon_id, Number(o.override_turnover)));
      return overrideMap;
    }
  });

  // Fetch growth data for all salons using cumulative values from bonus_imported_sales
  const { data: growthData, isLoading } = useQuery({
    queryKey: ["growth-bonus-admin", selectedYear, baselineOverrides],
    queryFn: async () => {
      // Get all periods for current and previous year
      const currentYearPeriods = Array.from({ length: 12 }, (_, i) => 
        `${selectedYear}-${String(i + 1).padStart(2, '0')}`
      );
      const previousYearPeriods = Array.from({ length: 12 }, (_, i) => 
        `${selectedYear - 1}-${String(i + 1).padStart(2, '0')}`
      );

      // Fetch loyalty bonus data from bonus_calculations for current year
      const loyaltyBonusMap = new Map<string, number>();
      let loyaltyPage = 0;
      let loyaltyHasMore = true;
      const pageSize = 1000;

      while (loyaltyHasMore) {
        const { data, error } = await supabase
          .from("bonus_calculations")
          .select("salon_id, loyalty_bonus_amount")
          .eq("supplier_id", LOREAL_SUPPLIER_ID)
          .in("period", currentYearPeriods)
          .not("salon_id", "is", null)
          .range(loyaltyPage * pageSize, (loyaltyPage + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          data.forEach((row) => {
            if (row.salon_id) {
              const current = loyaltyBonusMap.get(row.salon_id) || 0;
              loyaltyBonusMap.set(row.salon_id, current + (row.loyalty_bonus_amount || 0));
            }
          });
          loyaltyHasMore = data.length === pageSize;
          loyaltyPage++;
        } else {
          loyaltyHasMore = false;
        }
      }

      // Fetch salon info for district mapping
      const { data: salonsData, error: salonsError } = await supabase
        .from("salons")
        .select("id, name, district_id, districts(name)");
      
      if (salonsError) throw salonsError;
      
      const salonsMap = new Map<string, { name: string; districtId: string | null; districtName: string | null }>();
      salonsData?.forEach((salon: any) => {
        salonsMap.set(salon.id, {
          name: salon.name || "Ukjent salong",
          districtId: salon.district_id || null,
          districtName: salon.districts?.name || null
        });
      });

      // Fetch current year cumulative data from bonus_imported_sales with pagination
      const currentYearImported: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("bonus_imported_sales")
          .select("matched_salon_id, reported_value, reported_period")
          .eq("supplier_id", LOREAL_SUPPLIER_ID)
          .in("reported_period", currentYearPeriods)
          .not("matched_salon_id", "is", null)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          currentYearImported.push(...data);
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      // Fetch previous year cumulative data from bonus_imported_sales with pagination
      const previousYearImported: any[] = [];
      page = 0;
      hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("bonus_imported_sales")
          .select("matched_salon_id, reported_value, reported_period")
          .eq("supplier_id", LOREAL_SUPPLIER_ID)
          .in("reported_period", previousYearPeriods)
          .not("matched_salon_id", "is", null)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          previousYearImported.push(...data);
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      // Aggregate cumulative values per salon per period (sum all reported_value for same salon+period)
      // L'Oréal reports cumulative values, so we SUM all rows per salon per period
      const aggregateBySalonPeriod = (data: any[]): Map<string, Map<string, number>> => {
        const result = new Map<string, Map<string, number>>();
        data.forEach((row) => {
          const salonId = row.matched_salon_id;
          const period = row.reported_period;
          const value = row.reported_value || 0;
          
          if (!result.has(salonId)) {
            result.set(salonId, new Map());
          }
          const salonMap = result.get(salonId)!;
          salonMap.set(period, (salonMap.get(period) || 0) + value);
        });
        return result;
      };

      const currentYearBySalonPeriod = aggregateBySalonPeriod(currentYearImported);
      const previousYearBySalonPeriod = aggregateBySalonPeriod(previousYearImported);

      // For each salon, find the latest period in current year (highest period = cumulative YTD)
      const currentBySalon = new Map<string, { turnover: number; period: string }>();
      
      currentYearBySalonPeriod.forEach((periodMap, salonId) => {
        let latestPeriod = "";
        let latestTurnover = 0;
        
        periodMap.forEach((turnover, period) => {
          if (period > latestPeriod) {
            latestPeriod = period;
            latestTurnover = turnover;
          }
        });
        
        if (latestPeriod) {
          currentBySalon.set(salonId, { turnover: latestTurnover, period: latestPeriod });
        }
      });

      // Build growth data array
      const results: SalonGrowthData[] = [];
      
      currentBySalon.forEach((data, salonId) => {
        const currentYearToDate = data.turnover;
        const currentYearLatestPeriod = data.period;
        const salonInfo = salonsMap.get(salonId);
        
        // Finn tilsvarende måned i fjor (samme måned-nummer)
        const currentMonth = currentYearLatestPeriod.substring(5); // "05" from "2025-05"
        const samePeriodLastYear = `${selectedYear - 1}-${currentMonth}`;
        const decemberLastYear = `${selectedYear - 1}-12`;
        
        const salonPreviousYearData = previousYearBySalonPeriod.get(salonId);
        const calculatedPrevSamePeriod = salonPreviousYearData?.get(samePeriodLastYear) || 0;
        const calculatedPrevTotal = salonPreviousYearData?.get(decemberLastYear) || 0;
        
        // Use override if available for previous year total
        const overrideValue = baselineOverrides?.get(salonId);
        const previousYearSamePeriod = overrideValue ?? calculatedPrevSamePeriod;
        const previousYearTotal = overrideValue ?? calculatedPrevTotal;
        
        const isNewCustomer = previousYearTotal === 0 && previousYearSamePeriod === 0;
        const hasPreviousYearButMissingPeriodComparison = previousYearTotal > 0 && previousYearSamePeriod === 0;
        
        // Vekst vs samme periode i fjor
        let growthVsSamePeriod = 0;
        if (previousYearSamePeriod > 0) {
          growthVsSamePeriod = ((currentYearToDate - previousYearSamePeriod) / previousYearSamePeriod) * 100;
        }

        // Progresjon mot fjorår total
        let progressVsFullYear = 0;
        if (previousYearTotal > 0) {
          progressVsFullYear = (currentYearToDate / previousYearTotal) * 100;
        }

        // Find applicable tier based on rules - ingen spesialbehandling for nye kunder
        let tier: GrowthTier | null = null;
        let bonusAmount = 0;
        let hasExtraTier = false;
        
        const calculateBonus = (growth: number, currentTurnover: number, previousTurnover: number, isNew: boolean) => {
          // Ingen omsetning = ingen bonus
          if (currentTurnover <= 0) {
            return { tier: null, bonus: 0, hasExtraTier: false };
          }
          
          const growthAmount = currentTurnover - previousTurnover;
          
          // Nye kunder eller ≥5% vekst: 5% av total + 10% av vekstbeløpet
          if (isNew || growth >= 5) {
            const baseBonus = currentTurnover * 0.05;
            const extraBonus = growthAmount * 0.10;
            return { tier: TIER_5, bonus: baseBonus + extraBonus, hasExtraTier: true };
          } else if (growth > 0) {
            // 0.01-4.99% vekst: 2,5% av årets totale omsetning
            return { tier: TIER_2_5, bonus: currentTurnover * 0.025, hasExtraTier: false };
          } else {
            // Negativ eller ingen vekst: ingen bonus
            return { tier: null, bonus: 0, hasExtraTier: false };
          }
        };
        
        if (isNewCustomer) {
          // Nye kunder: får vekstbonus via vanlige regler (kvalifiserer for ≥5% tier)
          const result = calculateBonus(100, currentYearToDate, 0, true);
          tier = result.tier;
          bonusAmount = result.bonus;
          hasExtraTier = result.hasExtraTier;
        } else if (hasPreviousYearButMissingPeriodComparison) {
          // Har fjorår total men ikke sammenlignbar måned - bruk progressVsFullYear som vekst-proxy
          const result = calculateBonus(progressVsFullYear - 100, currentYearToDate, previousYearTotal, false);
          tier = result.tier;
          bonusAmount = result.bonus;
          hasExtraTier = result.hasExtraTier;
        } else {
          // Eksisterende kunder med sammenlignbar periode
          const result = calculateBonus(growthVsSamePeriod, currentYearToDate, previousYearSamePeriod, false);
          tier = result.tier;
          bonusAmount = result.bonus;
          hasExtraTier = result.hasExtraTier;
        }

        // Beløp som mangler for å nå fjorår total
        const amountToReachLastYear = previousYearTotal - currentYearToDate;
        
        // Hent lojalitetsbonus for denne salongen
        const loyaltyBonus = loyaltyBonusMap.get(salonId) || 0;
        const totalBonus = bonusAmount + loyaltyBonus;

        results.push({
          salonId,
          salonName: salonInfo?.name || "Ukjent salong",
          districtId: salonInfo?.districtId || null,
          districtName: salonInfo?.districtName || null,
          currentYearToDate,
          currentYearLatestPeriod,
          previousYearSamePeriod,
          previousYearTotal,
          growthVsSamePeriod,
          progressVsFullYear,
          amountToReachLastYear,
          tier,
          hasExtraTier,
          bonusAmount,
          loyaltyBonus,
          totalBonus
        });
      });

      return results;
    },
  });

  // Filter data by district
  const filteredData = useMemo(() => {
    if (!growthData) return [];
    if (selectedDistrict === "alle") return growthData;
    return growthData.filter(s => s.districtId === selectedDistrict);
  }, [growthData, selectedDistrict]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!filteredData) return [];
    
    return [...filteredData].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "salonName":
          comparison = a.salonName.localeCompare(b.salonName);
          break;
        case "currentYearToDate":
          comparison = a.currentYearToDate - b.currentYearToDate;
          break;
        case "previousYearSamePeriod":
          comparison = a.previousYearSamePeriod - b.previousYearSamePeriod;
          break;
        case "growthVsSamePeriod":
          comparison = a.growthVsSamePeriod - b.growthVsSamePeriod;
          break;
        case "previousYearTotal":
          comparison = a.previousYearTotal - b.previousYearTotal;
          break;
        case "progressVsFullYear":
          comparison = a.progressVsFullYear - b.progressVsFullYear;
          break;
        case "amountToReachLastYear":
          comparison = a.amountToReachLastYear - b.amountToReachLastYear;
          break;
        case "bonusAmount":
          comparison = a.bonusAmount - b.bonusAmount;
          break;
        case "loyaltyBonus":
          comparison = a.loyaltyBonus - b.loyaltyBonus;
          break;
        case "totalBonus":
          comparison = a.totalBonus - b.totalBonus;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortField, sortDirection]);

  // Calculate chain/district summary
  const chainStats = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return { 
      totalCurrentYearToDate: 0, 
      totalPreviousYearSamePeriod: 0,
      totalPreviousYearTotal: 0, 
      totalGrowthVsSamePeriod: 0,
      totalProgressVsFullYear: 0,
      salonCount: 0 
    };
    
    const totalCurrentYearToDate = filteredData.reduce((sum, s) => sum + s.currentYearToDate, 0);
    const totalPreviousYearSamePeriod = filteredData.reduce((sum, s) => sum + s.previousYearSamePeriod, 0);
    const totalPreviousYearTotal = filteredData.reduce((sum, s) => sum + s.previousYearTotal, 0);
    
    const totalGrowthVsSamePeriod = totalPreviousYearSamePeriod > 0 
      ? ((totalCurrentYearToDate - totalPreviousYearSamePeriod) / totalPreviousYearSamePeriod) * 100 
      : 0;
    
    const totalProgressVsFullYear = totalPreviousYearTotal > 0
      ? (totalCurrentYearToDate / totalPreviousYearTotal) * 100
      : 0;
    
    return { 
      totalCurrentYearToDate, 
      totalPreviousYearSamePeriod,
      totalPreviousYearTotal, 
      totalGrowthVsSamePeriod,
      totalProgressVsFullYear,
      salonCount: filteredData.length 
    };
  }, [filteredData]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!filteredData) return { salonsWithGrowth: 0, avgGrowth: 0, totalGrowthBonus: 0, totalLoyaltyBonus: 0, totalBonus: 0, tier25Count: 0, tier5PlusCount: 0 };
    
    const salonsWithGrowth = filteredData.filter(s => s.growthVsSamePeriod > 0 && s.previousYearSamePeriod > 0).length;
    const tier25Count = filteredData.filter(s => s.tier && !s.hasExtraTier).length;
    const tier5PlusCount = filteredData.filter(s => s.hasExtraTier).length;
    const validGrowthSalons = filteredData.filter(s => s.previousYearSamePeriod > 0);
    const avgGrowth = validGrowthSalons.length > 0 
      ? validGrowthSalons.reduce((sum, s) => sum + s.growthVsSamePeriod, 0) / validGrowthSalons.length 
      : 0;
    const totalGrowthBonus = filteredData.reduce((sum, s) => sum + s.bonusAmount, 0);
    const totalLoyaltyBonus = filteredData.reduce((sum, s) => sum + s.loyaltyBonus, 0);
    const totalBonus = filteredData.reduce((sum, s) => sum + s.totalBonus, 0);
    
    return { salonsWithGrowth, avgGrowth, totalGrowthBonus, totalLoyaltyBonus, totalBonus, tier25Count, tier5PlusCount };
  }, [filteredData]);

  // Get latest period from all data for display
  const latestPeriod = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;
    const periods = filteredData.map(s => s.currentYearLatestPeriod).filter(Boolean);
    return periods.sort().reverse()[0] || null;
  }, [filteredData]);

  const formatPeriodMonth = (period: string) => {
    const month = parseInt(period.substring(5));
    const monthNames = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];
    return monthNames[month - 1] || period;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
        )}
      </div>
    </TableHead>
  );

  const years = [currentYear, currentYear - 1, currentYear - 2];
  const districtLabel = selectedDistrict === "alle" 
    ? "Hele kjeden" 
    : districts?.find(d => d.id === selectedDistrict)?.name || "Distrikt";

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Velg år" />
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={String(year)}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showDistrictSelector && (
          <Select value={internalDistrict} onValueChange={setInternalDistrict}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Velg distrikt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle distrikter</SelectItem>
              {districts?.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {latestPeriod && (
          <Badge variant="outline" className="gap-1">
            <Calendar className="h-3 w-3" />
            Siste data: {formatPeriodMonth(latestPeriod)} {selectedYear}
          </Badge>
        )}
      </div>

      {/* Chain/District Total Summary - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Hittil i {selectedYear} — {districtLabel}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(chainStats.totalCurrentYearToDate)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {latestPeriod && `t.o.m. ${formatPeriodMonth(latestPeriod)}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Hittil i {selectedYear - 1} (samme periode)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(chainStats.totalPreviousYearSamePeriod)}</p>
            <div className="flex items-center gap-2 mt-1">
              {chainStats.totalGrowthVsSamePeriod !== 0 && (
                <>
                  {chainStats.totalGrowthVsSamePeriod > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${chainStats.totalGrowthVsSamePeriod >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {chainStats.totalGrowthVsSamePeriod >= 0 ? '+' : ''}{chainStats.totalGrowthVsSamePeriod.toFixed(1)}% vs fjor
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Fjorår total ({selectedYear - 1})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(chainStats.totalPreviousYearTotal)}</p>
            {chainStats.totalPreviousYearTotal > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progresjon</span>
                  <span className="font-medium">{chainStats.totalProgressVsFullYear.toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(chainStats.totalProgressVsFullYear, 100)} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Salonger med vekst
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.salonsWithGrowth}</p>
            <div className="flex gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="gap-1 text-xs">
                <span className={`w-2 h-2 rounded-full ${TIER_2_5.color}`} />
                {stats.tier25Count}
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs">
                <span className={`w-2 h-2 rounded-full ${TIER_5.color}`} />
                {stats.tier5PlusCount}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Gj.snitt vekst vs fjor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stats.avgGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.avgGrowth >= 0 ? '+' : ''}{stats.avgGrowth.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">samme periode</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Total vekstbonus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalGrowthBonus)}</p>
            <p className="text-xs text-muted-foreground">estimert utbetaling</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Total lojalitetsbonus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalLoyaltyBonus)}</p>
            <p className="text-xs text-muted-foreground">fra beregninger</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Total bonus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalBonus)}</p>
            <p className="text-xs text-muted-foreground">vekst + lojalitet</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vekstbonus per salong</CardTitle>
          <CardDescription>
            Sammenligner L'Oréal-omsetning hittil i {selectedYear} mot samme periode i {selectedYear - 1} og fjorår total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader field="salonName">Salong</SortableHeader>
                    <SortableHeader field="currentYearToDate">Hittil i år</SortableHeader>
                    <SortableHeader field="previousYearSamePeriod">Hittil i fjor</SortableHeader>
                    <SortableHeader field="growthVsSamePeriod">Δ %</SortableHeader>
                    <SortableHeader field="previousYearTotal">Fjorår total</SortableHeader>
                    <SortableHeader field="progressVsFullYear">% av fjor</SortableHeader>
                    <SortableHeader field="amountToReachLastYear">Mangler til fjorår</SortableHeader>
                    <TableHead>Tier</TableHead>
                    <SortableHeader field="bonusAmount">Vekstbonus</SortableHeader>
                    <SortableHeader field="loyaltyBonus">Lojalitetsbonus</SortableHeader>
                    <SortableHeader field="totalBonus">Total</SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        Ingen data funnet for valgt periode
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedData.map((salon) => (
                      <TableRow 
                        key={salon.salonId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedSalon(salon)}
                      >
                        <TableCell>
                          <div>
                            <span className="font-medium">{salon.salonName}</span>
                            <p className="text-xs text-muted-foreground">{salon.districtName || "-"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(salon.currentYearToDate)}
                        </TableCell>
                        <TableCell>
                          {salon.previousYearSamePeriod > 0 
                            ? formatCurrency(salon.previousYearSamePeriod)
                            : <span className="text-muted-foreground">-</span>
                          }
                        </TableCell>
                        <TableCell>
                          {salon.previousYearSamePeriod > 0 ? (
                            <div className="flex items-center gap-1">
                              {salon.growthVsSamePeriod > 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : salon.growthVsSamePeriod < 0 ? (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              ) : (
                                <Minus className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className={
                                salon.growthVsSamePeriod > 0 ? 'text-green-600' : 
                                salon.growthVsSamePeriod < 0 ? 'text-red-600' : ''
                              }>
                                {salon.growthVsSamePeriod >= 0 ? '+' : ''}{salon.growthVsSamePeriod.toFixed(1)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {salon.previousYearTotal > 0 
                            ? formatCurrency(salon.previousYearTotal)
                            : <span className="text-muted-foreground">-</span>
                          }
                        </TableCell>
                        <TableCell>
                          {salon.previousYearTotal > 0 ? (
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${salon.progressVsFullYear >= 100 ? 'text-green-600' : ''}`}>
                                {salon.progressVsFullYear.toFixed(0)}%
                              </span>
                              <Progress 
                                value={Math.min(salon.progressVsFullYear, 100)} 
                                className="w-16 h-2" 
                              />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const missing = salon.previousYearTotal - salon.currentYearToDate;
                            if (salon.previousYearTotal <= 0 || isNaN(missing)) {
                              return <span className="text-muted-foreground">-</span>;
                            }
                            return missing > 0 ? (
                              <span className="text-destructive font-medium">
                                {formatCurrency(missing)}
                              </span>
                            ) : (
                              <span className="text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                +{formatCurrency(Math.abs(missing))}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {salon.tier ? (
                            <div className="flex gap-1">
                              <Badge variant="outline" className="gap-1">
                                <span className={`w-2 h-2 rounded-full ${salon.tier.color}`} />
                                {salon.tier.label}
                              </Badge>
                              {salon.hasExtraTier && (
                                <Badge variant="outline" className="gap-1">
                                  <span className={`w-2 h-2 rounded-full ${TIER_10_EXTRA.color}`} />
                                  {TIER_10_EXTRA.label}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <Badge variant="secondary">0%</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {salon.bonusAmount > 0 
                            ? formatCurrency(salon.bonusAmount)
                            : <span className="text-muted-foreground">kr 0</span>
                          }
                        </TableCell>
                        <TableCell className="font-medium">
                          {salon.loyaltyBonus > 0 
                            ? formatCurrency(salon.loyaltyBonus)
                            : <span className="text-muted-foreground">kr 0</span>
                          }
                        </TableCell>
                        <TableCell className="font-bold text-primary">
                          {salon.totalBonus > 0 
                            ? formatCurrency(salon.totalBonus)
                            : <span className="text-muted-foreground">kr 0</span>
                          }
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <SalonGrowthBonusDetail
        open={!!selectedSalon}
        onOpenChange={(open) => !open && setSelectedSalon(null)}
        salon={selectedSalon ? {
          salonId: selectedSalon.salonId,
          salonName: selectedSalon.salonName,
          districtName: selectedSalon.districtName,
          currentYearToDate: selectedSalon.currentYearToDate,
          previousYearSamePeriod: selectedSalon.previousYearSamePeriod,
          previousYearTotal: selectedSalon.previousYearTotal,
          growthPercent: selectedSalon.growthVsSamePeriod,
          progressVsFullYear: selectedSalon.progressVsFullYear,
          remainingToMatch: selectedSalon.amountToReachLastYear,
          tier: selectedSalon.tier,
          bonusAmount: selectedSalon.bonusAmount,
        } : null}
        year={selectedYear}
        latestPeriod={latestPeriod ? formatPeriodMonth(latestPeriod) + " " + selectedYear : null}
      />
    </div>
  );
}
