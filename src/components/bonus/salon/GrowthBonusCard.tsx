import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, CheckCircle2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface GrowthBonusCardProps {
  currentYearTurnover: number;
  previousYearTurnover: number;
  growthPercent: number;
  year: number;
  supplierName?: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const calculateGrowthBonus = (
  growth: number, 
  currentTurnover: number, 
  previousTurnover: number
) => {
  // Ingen omsetning = ingen bonus
  if (currentTurnover <= 0) {
    return { tier: null, baseBonus: 0, extraBonus: 0, totalBonus: 0, hasExtraTier: false };
  }
  
  // Nye kunder (previousTurnover = 0) behandles som ≥5% vekst (uendelig vekst)
  const isNewCustomer = previousTurnover === 0;
  const growthAmount = currentTurnover - previousTurnover; // Vekstbeløpet
  
  if (isNewCustomer || growth >= 5) {
    // ≥5% vekst (eller ny kunde): 5% av total + 10% av vekstbeløpet
    const baseBonus = currentTurnover * 0.05;
    const extraBonus = growthAmount * 0.10;
    return { 
      tier: '5%+10%', 
      baseBonus, 
      extraBonus, 
      totalBonus: baseBonus + extraBonus,
      hasExtraTier: true
    };
  } else if (growth > 0) {
    // 0.01-4.99% vekst: 2.5% av total omsetning
    return { 
      tier: '2.5%', 
      baseBonus: currentTurnover * 0.025, 
      extraBonus: 0, 
      totalBonus: currentTurnover * 0.025,
      hasExtraTier: false
    };
  } else {
    // Negativ eller ingen vekst: ingen bonus
    return { tier: null, baseBonus: 0, extraBonus: 0, totalBonus: 0, hasExtraTier: false };
  }
};

export function GrowthBonusCard({ 
  currentYearTurnover, 
  previousYearTurnover, 
  growthPercent, 
  year,
  supplierName
}: GrowthBonusCardProps) {
  const bonus = calculateGrowthBonus(growthPercent, currentYearTurnover, previousYearTurnover);

  // Ny kunde flagg for visning
  const isNewCustomer = previousYearTurnover === 0 && currentYearTurnover > 0;

  // Beregn beløp som mangler for å nå bonusnivåer
  const amountToReach0Percent = Math.max(0, previousYearTurnover - currentYearTurnover);
  const amountToReach5Percent = Math.max(0, (previousYearTurnover * 1.05) - currentYearTurnover);
  
  // Potensiell bonus ved forskjellige nivåer
  const potentialBonusAt0Percent = previousYearTurnover > 0 ? previousYearTurnover * 0.025 : 0;
  const potentialBonusAt5Percent = previousYearTurnover > 0 
    ? (previousYearTurnover * 1.05) * 0.05 + (previousYearTurnover * 0.05) * 0.10 
    : 0;

  // Show "no bonus" state if no growth
  if (growthPercent <= 0) {
    const hasBaseline = previousYearTurnover > 0;
    
    return (
      <Card className="rounded-xl border-border/50 bg-muted/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Vekstbonus {year}</CardTitle>
            {supplierName && (
              <Badge variant="secondary" className="ml-auto">
                {supplierName}
              </Badge>
            )}
          </div>
          <CardDescription>
            Oppnå vekst i innkjøp sammenlignet med forrige år for å kvalifisere til vekstbonus
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Omsetningsstatus */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Innkjøp {year}</p>
              <p className="text-lg font-semibold">{formatCurrency(currentYearTurnover)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Innkjøp {year - 1}</p>
              <p className="text-lg font-semibold">{hasBaseline ? formatCurrency(previousYearTurnover) : 'Ingen data'}</p>
            </div>
          </div>
          
          {hasBaseline && growthPercent < 0 && (
            <p className="text-sm text-destructive">
              Du ligger {Math.abs(growthPercent).toFixed(1)}% under fjoråret
            </p>
          )}

          {/* Veien til bonus */}
          {hasBaseline && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-medium text-amber-800">Veien til bonus</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-700">For å nå 0%+ vekst:</span>
                  <span className="text-amber-900 font-semibold">
                    + {formatCurrency(amountToReach0Percent)}
                  </span>
                </div>
                <div className="text-xs text-amber-600 pl-4">
                  → Gir 2,5% bonus = {formatCurrency(potentialBonusAt0Percent)}
                </div>
              </div>
              
              <Separator className="bg-amber-200" />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-700">For å nå 5%+ vekst:</span>
                  <span className="text-amber-900 font-semibold">
                    + {formatCurrency(amountToReach5Percent)}
                  </span>
                </div>
                <div className="text-xs text-amber-600 pl-4">
                  → Gir 5%+10% bonus ≈ {formatCurrency(potentialBonusAt5Percent)}
                </div>
              </div>
            </div>
          )}
          
          {!hasBaseline && (
            <p className="text-sm text-muted-foreground">
              Ingen innkjøpsdata fra fjoråret for sammenligning.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Vekstbonus {year}</CardTitle>
            {supplierName && (
              <Badge variant="secondary">
                {supplierName}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          {isNewCustomer ? (
            <span className="font-semibold text-emerald-700">Ny kunde</span>
          ) : (
            <>Din vekst: <span className="font-semibold text-green-700">+{growthPercent.toFixed(1)}%</span></>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tier visualization */}
        <div className="relative">
          {/* Progress line */}
          <div className="absolute top-4 left-4 right-4 h-1 bg-muted rounded-full" />
          <div 
            className="absolute top-4 left-4 h-1 bg-green-500 rounded-full transition-all"
            style={{ 
              width: isNewCustomer ? '100%' : `${Math.min(growthPercent / 6 * 100, 100)}%`,
              maxWidth: 'calc(100% - 2rem)'
            }}
          />
          
          {/* Tier markers - tre visuelle nivåer */}
          <div className="relative flex justify-between px-4">
            {/* 2.5% tier */}
            <div className="flex flex-col items-center">
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all z-10 bg-background",
                  (growthPercent > 0 || bonus.hasExtraTier)
                    ? "bg-yellow-500 text-white" 
                    : "bg-muted text-muted-foreground border border-border",
                  !bonus.hasExtraTier && growthPercent > 0 && "ring-2 ring-yellow-500 ring-offset-2"
                )}
              >
                {(growthPercent > 0 || bonus.hasExtraTier) ? <CheckCircle2 className="h-4 w-4" /> : "2,5%"}
              </div>
              <span className={cn(
                "text-xs mt-2 text-center",
                (growthPercent > 0 || bonus.hasExtraTier) ? "text-yellow-700 font-medium" : "text-muted-foreground"
              )}>
                0%+ vekst
              </span>
            </div>

            {/* 5% tier (grunnbonus) */}
            <div className="flex flex-col items-center">
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all z-10 bg-background",
                  bonus.hasExtraTier
                    ? "bg-green-500 text-white" 
                    : "bg-muted text-muted-foreground border border-border"
                )}
              >
                {bonus.hasExtraTier ? <CheckCircle2 className="h-4 w-4" /> : "5%"}
              </div>
              <span className={cn(
                "text-xs mt-2 text-center",
                bonus.hasExtraTier ? "text-green-700 font-medium" : "text-muted-foreground"
              )}>
                5%+ vekst
              </span>
            </div>

            {/* +10% tier (tilleggsbonus) */}
            <div className="flex flex-col items-center">
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all z-10 bg-background",
                  bonus.hasExtraTier
                    ? "bg-emerald-600 text-white" 
                    : "bg-muted text-muted-foreground border border-border",
                  bonus.hasExtraTier && "ring-2 ring-emerald-600 ring-offset-2"
                )}
              >
                {bonus.hasExtraTier ? <CheckCircle2 className="h-4 w-4" /> : "+10%"}
              </div>
              <span className={cn(
                "text-xs mt-2 text-center",
                bonus.hasExtraTier ? "text-emerald-700 font-medium" : "text-muted-foreground"
              )}>
                Tillegg
              </span>
            </div>
          </div>
        </div>

        {/* Active tier badges */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Aktiv sats:</span>
          {bonus.hasExtraTier ? (
            <>
              <Badge className="bg-yellow-500 hover:bg-yellow-500">2,5%</Badge>
              <Badge className="bg-green-500 hover:bg-green-500">5%</Badge>
              <Badge className="bg-emerald-600 hover:bg-emerald-600">+10%</Badge>
            </>
          ) : bonus.tier === '2.5%' ? (
            <Badge className="bg-yellow-500 hover:bg-yellow-500">2,5%</Badge>
          ) : (
            <Badge variant="secondary">Ingen</Badge>
          )}
        </div>

        {/* Neste nivå - vis når man har 2,5% tier men ikke 5%+ */}
        {!bonus.hasExtraTier && bonus.tier === '2.5%' && previousYearTurnover > 0 && (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-800">Neste nivå</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-700">For å nå 5%+ vekst:</span>
                <span className="text-amber-900 font-semibold">
                  + {formatCurrency(amountToReach5Percent)}
                </span>
              </div>
              <div className="text-xs text-amber-600">
                Dette ville gitt {formatCurrency(potentialBonusAt5Percent - bonus.totalBonus)} ekstra i bonus
              </div>
            </div>
          </div>
        )}

        {/* Bonus breakdown */}
        {bonus.totalBonus > 0 && (
          <div className="p-4 bg-green-100/50 rounded-xl border border-green-200/50 space-y-3">
            {bonus.hasExtraTier ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700">Grunnbonus (5%)</span>
                  <span className="text-green-800 font-medium">{formatCurrency(bonus.baseBonus)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700">Tilleggsbonus (10% av vekstbeløp)</span>
                  <span className="text-green-800 font-medium">{formatCurrency(bonus.extraBonus)}</span>
                </div>
                <Separator className="bg-green-200" />
                <div className="flex items-center justify-between">
                  <span className="text-green-900 font-semibold">Total vekstbonus</span>
                  <span className="text-2xl font-semibold text-green-900">{formatCurrency(bonus.totalBonus)}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">Vekstbonus (2,5%)</p>
                  <p className="text-2xl font-semibold text-green-900">{formatCurrency(bonus.totalBonus)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-green-700">Beregnet som</p>
                  <p className="text-sm text-green-800">
                    {formatCurrency(currentYearTurnover)} × 2,5%
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
