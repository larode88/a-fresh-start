import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowUpDown } from "lucide-react";

export interface SalonBonusData {
  salonId: string;
  salonName: string;
  turnover: number;
  loyaltyBonus: number;
  growthBonus: number;
  totalBonus: number;
}

interface AllSalonsBonusTableProps {
  data: SalonBonusData[];
  isLoading?: boolean;
  onSelect?: (salon: SalonBonusData) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

type SortField = 'salonName' | 'turnover' | 'loyaltyBonus' | 'growthBonus' | 'totalBonus';
type SortDirection = 'asc' | 'desc';

export function AllSalonsBonusTable({ data, isLoading, onSelect }: AllSalonsBonusTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>('turnover');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(salon => 
      salon.salonName.toLowerCase().includes(search.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return filtered;
  }, [data, search, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`h-3 w-3 ${sortField === field ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
    </TableHead>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <CardTitle>Alle salonger ({filteredAndSortedData.length})</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Søk salong..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="salonName">Salong</SortableHeader>
                <SortableHeader field="turnover">Innkjøp</SortableHeader>
                <SortableHeader field="loyaltyBonus">Lojalitetsbonus</SortableHeader>
                <SortableHeader field="growthBonus">Vekstbonus</SortableHeader>
                <SortableHeader field="totalBonus">Total bonus</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {search ? 'Ingen salonger funnet' : 'Ingen bonusdata tilgjengelig'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedData.map((salon) => (
                  <TableRow 
                    key={salon.salonId}
                    className={onSelect ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => onSelect?.(salon)}
                  >
                    <TableCell className="font-medium">{salon.salonName}</TableCell>
                    <TableCell>{formatCurrency(salon.turnover)}</TableCell>
                    <TableCell>{formatCurrency(salon.loyaltyBonus)}</TableCell>
                    <TableCell>
                      {salon.growthBonus > 0 ? formatCurrency(salon.growthBonus) : '-'}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatCurrency(salon.totalBonus)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
