import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface SaleData {
  reported_period: string;
  reported_value: number;
  brand: string | null;
  product_group: string | null;
}

interface MonthlyPurchaseChartProps {
  currentYearData: SaleData[];
  previousYearData: SaleData[];
  selectedYear: number;
  isLoading?: boolean;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

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

export function MonthlyPurchaseChart({
  currentYearData,
  previousYearData,
  selectedYear,
  isLoading
}: MonthlyPurchaseChartProps) {
  const [showPreviousYear, setShowPreviousYear] = useState(false);

  const { chartData, brands, chartConfig } = useMemo(() => {
    // Get unique brands
    const brandsSet = new Set<string>();
    currentYearData.forEach(d => d.brand && brandsSet.add(d.brand));
    previousYearData.forEach(d => d.brand && brandsSet.add(d.brand));
    const brandList = Array.from(brandsSet).sort();

    // Build chart config
    const config: Record<string, { label: string; color: string }> = {};
    brandList.forEach((brand, index) => {
      config[brand] = {
        label: brand,
        color: BRAND_COLORS[brand] || `hsl(${(index * 40) % 360}, 60%, 50%)`
      };
    });
    config['prevTotal'] = { label: `${selectedYear - 1} total`, color: 'hsl(var(--muted-foreground))' };

    // Aggregate data by month
    const monthlyData: Record<string, Record<string, number>> = {};
    
    // Initialize all months
    for (let i = 1; i <= 12; i++) {
      const month = i.toString().padStart(2, '0');
      monthlyData[month] = { month: i };
      brandList.forEach(brand => {
        monthlyData[month][brand] = 0;
      });
      monthlyData[month]['prevTotal'] = 0;
    }

    // Aggregate current year
    currentYearData.forEach(sale => {
      const month = sale.reported_period.split('-')[1];
      if (sale.brand && monthlyData[month]) {
        monthlyData[month][sale.brand] = (monthlyData[month][sale.brand] || 0) + sale.reported_value;
      }
    });

    // Aggregate previous year totals
    previousYearData.forEach(sale => {
      const month = sale.reported_period.split('-')[1];
      if (monthlyData[month]) {
        monthlyData[month]['prevTotal'] = (monthlyData[month]['prevTotal'] || 0) + sale.reported_value;
      }
    });

    // Convert to array
    const data = Object.entries(monthlyData)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([month, values]) => ({
        ...values,
        monthName: MONTH_NAMES[parseInt(month) - 1]
      }));

    return {
      chartData: data,
      brands: brandList,
      chartConfig: config
    };
  }, [currentYearData, previousYearData, selectedYear]);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toFixed(0);
  };

  if (isLoading) {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Innkjøp per måned</CardTitle>
        <div className="flex items-center gap-2">
          <Switch
            id="show-prev"
            checked={showPreviousYear}
            onCheckedChange={setShowPreviousYear}
          />
          <Label htmlFor="show-prev" className="text-sm text-muted-foreground">
            Vis {selectedYear - 1}
          </Label>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {brands.map((brand, index) => (
                  <linearGradient key={brand} id={`color-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartConfig[brand]?.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartConfig[brand]?.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="monthName" 
                tick={{ fontSize: 12 }} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend />
              
              {brands.map((brand, index) => (
                <Area
                  key={brand}
                  type="monotone"
                  dataKey={brand}
                  stackId="1"
                  stroke={chartConfig[brand]?.color}
                  fill={`url(#color-${index})`}
                  fillOpacity={1}
                />
              ))}
              
              {showPreviousYear && (
                <Area
                  type="monotone"
                  dataKey="prevTotal"
                  stroke="hsl(var(--muted-foreground))"
                  fill="none"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
