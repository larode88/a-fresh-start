import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, ShoppingCart, Gift, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface BonusSummaryCardsProps {
  totalTurnover: number;
  loyaltyBonus: number;
  totalBonus: number;
  previousYearTurnover: number;
  isLoading?: boolean;
  growthBonus?: number;
}

export function BonusSummaryCards({
  totalTurnover,
  loyaltyBonus,
  totalBonus,
  previousYearTurnover,
  isLoading,
  growthBonus
}: BonusSummaryCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const growthPercent = previousYearTurnover > 0 
    ? ((totalTurnover - previousYearTurnover) / previousYearTurnover) * 100 
    : 0;

  const TrendIcon = growthPercent > 0 ? TrendingUp : growthPercent < 0 ? TrendingDown : Minus;
  const trendColor = growthPercent > 0 ? 'text-green-600' : growthPercent < 0 ? 'text-red-600' : 'text-muted-foreground';

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Total Turnover */}
      <Card className="rounded-xl border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Totalt innkjøpt</p>
              <p className="text-2xl font-semibold">{formatCurrency(totalTurnover)}</p>
              {previousYearTurnover > 0 && (
                <div className={cn("flex items-center gap-1 text-sm", trendColor)}>
                  <TrendIcon className="h-4 w-4" />
                  <span>
                    {growthPercent > 0 ? '+' : ''}{growthPercent.toFixed(1)}% vs. forrige år
                  </span>
                </div>
              )}
            </div>
            <div className="p-3 rounded-full bg-primary/10">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loyalty Bonus */}
      <Card className="rounded-xl border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Lojalitetsbonus</p>
              <p className="text-2xl font-semibold">{formatCurrency(loyaltyBonus)}</p>
              <p className="text-sm text-muted-foreground">
                Opptjent bonus fra innkjøp
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-500/10">
              <Gift className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Bonus */}
      <Card className="rounded-xl border-border/50 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total bonus</p>
              <p className="text-2xl font-semibold text-primary">{formatCurrency(totalBonus)}</p>
              <p className="text-sm text-muted-foreground">
                {growthBonus && growthBonus > 0 
                  ? `Lojalitet ${formatCurrency(loyaltyBonus)} + Vekst ${formatCurrency(growthBonus)}`
                  : 'Sum av alle bonuser'
                }
              </p>
            </div>
            <div className="p-3 rounded-full bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
