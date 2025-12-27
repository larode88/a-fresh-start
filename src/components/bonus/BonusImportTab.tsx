import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Search, Building2, Plus, RefreshCw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  getImportBatches, 
  getImportedSales, 
  createImportBatch, 
  createImportedSales,
  updateImportBatch,
  matchImportedSale,
  unmatchImportedSale,
  findSalonByIdentifier,
  rematchImportedSales,
  upsertSupplierIdentifier,
  type ImportBatch,
  type ImportedSale
} from "@/integrations/supabase/bonusService";
import { formatPeriodDisplay, getCurrentPeriod, getMatchStatusLabel, getStatusColor } from "@/lib/bonusUtils";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface ParsedRow {
  identifier: string;
  name?: string;
  brand?: string;
  productGroup?: string;
  value: number;
  cumulativeValue?: number;
}

// L'Oréal specific constants
const LOREAL_SUPPLIER_ID = 'ba0636af-39df-4a0b-9792-79a3784f3970';

const LOREAL_BRAND_CONFIG = [
  { 
    key: 'LP',
    name: "L'Oréal Professionnel", 
    brandId: 'a6e3d8ca-b6a7-4e9f-84fd-084d97d1e4de',
    videresalgCol: 10,  // K
    kjemiCol: 14,       // O
    hasKjemi: true 
  },
  { 
    key: 'Kerastase',
    name: 'Kérastase', 
    brandId: '865c606a-cf7d-46b7-b8f5-cf0cbcd91d59',
    videresalgCol: 5,   // F
    kjemiCol: null,
    hasKjemi: false 
  },
  { 
    key: 'Redken',
    name: 'Redken', 
    brandId: '1a21cf56-70e1-4bb5-9d7d-7305f7cb6e9c',
    videresalgCol: 11,  // L
    kjemiCol: 15,       // P
    hasKjemi: true 
  },
  { 
    key: 'Matrix',
    name: 'Matrix', 
    brandId: '2b12b7d5-653c-41e2-853b-8db1d7926d92',
    videresalgCol: 12,  // M
    kjemiCol: 16,       // Q
    hasKjemi: true 
  },
  { 
    key: 'ShuUemura',
    name: 'Shu Uemura', 
    brandId: 'ef782b45-55b5-426d-b2d8-58ec30b7c53e',
    videresalgCol: 8,   // I
    kjemiCol: null,
    hasKjemi: false 
  }
];

// L'Oréal column indices (0-indexed)
const LOREAL_KUNDE_NR_COL = 2;   // C
const LOREAL_NAVN_COL = 3;       // D

// Maria Nila specific constants
const MARIA_NILA_SUPPLIER_ID = 'fc773f13-16df-4eb6-8760-a4d82c7abed7';
const MARIA_NILA_NAVN_COL = 0;       // A (0-indexed, column 1 = index 0)
const MARIA_NILA_KUNDE_NR_COL = 1;   // B (0-indexed, column 2 = index 1)
const MARIA_NILA_OMSETNING_COL = 2;  // C (0-indexed, column 3 = index 2)

// ICON Hairspa specific constants
const ICON_HAIRSPA_SUPPLIER_ID = '53ee3b4d-e85e-4179-8f2e-6c7531922e94';
const ICON_HAIRSPA_NAVN_COL = 0;       // Column 1 = Salongnavn
const ICON_HAIRSPA_KUNDE_NR_COL = 1;   // Column 2 = Kundenummer (identifier for matching!)
const ICON_HAIRSPA_VALUE_COL = 2;      // Column 3 = Kjøpsverdi

// Heidenstrøm specific constants
const HEIDENSTROM_SUPPLIER_ID = '65e21e14-165e-47d9-a78a-0975078f36e7';
const HEIDENSTROM_ORG_NR_COL = 1;      // Column 2 = Org.nr (identifier for matching!)
const HEIDENSTROM_NAME_COL = 2;        // Column 3 = Salongnavn
const HEIDENSTROM_VALUE_COL = 3;       // Column 4 = Verdi

// Heidenstrøm brand mapping from sheet names (Excel sheet name → DB brand name)
const HEIDENSTROM_BRAND_MAP: Record<string, string> = {
  'Matrix': 'Matrix',
  'Nõberu': 'Nõberu of Sweden',
  'Rekvisita': 'Rekvisita',
  'Vision': 'Vision Haircare'
};

// Verdant specific constants
const VERDANT_SUPPLIER_ID = 'ae4c8e52-35ea-4dbb-910e-26289cf9c482';
const VERDANT_KUNDE_NR_COL = 0;        // Column A = Nummer (identifier for matching!)
const VERDANT_NAME_COL = 1;            // Column B = Kundenavn
const VERDANT_PRODUKTER_COL = 2;       // Column C = Produkter (videresalg)
const VERDANT_FARGE_COL = 3;           // Column D = Farge (kjemi)

// InGoodHands specific constants
const INGOODHANDS_SUPPLIER_ID = '94c74a35-9986-42a0-bbb6-e900650fdf6a';
const INGOODHANDS_NAME_COL = 0;        // Column A = Salongnavn
const INGOODHANDS_KUNDE_NR_COL = 1;    // Column B = Kundenummer (identifier for matching!)
const INGOODHANDS_VALUE_COL = 9;       // Column J = Verdi

// We Are One specific constants (multi-sheet: AVEDA, Bumble and Bumble)
const WEAREONE_SUPPLIER_ID = '8dca6a4c-fd3a-44c3-8a8e-a5a6dd671190';
const WEAREONE_NAME_COL = 0;           // Column A = Navn
const WEAREONE_ORG_NR_COL = 1;         // Column B = Org.nr (identifier for matching via salons.org_number)
const WEAREONE_VALUE_COL = 2;          // Column C = Varekjøp

// We Are One brand mapping from sheet names
const WEAREONE_BRAND_MAP: Record<string, string> = {
  'AVEDA': 'AVEDA',
  'Bumble and Bumble': 'Bumble and Bumble'
};

// Wella/GHD specific constants (multi-sheet support)
const WELLA_SUPPLIER_ID = 'b157a720-4b7c-48c9-8bdc-61b7ed20e288';
const WELLA_GHD_KUNDE_NR_COL = 0;  // Column A = Kundenummer
const WELLA_GHD_NAME_COL = 3;      // Column D = Salongnavn
const WELLA_GHD_VALUE_COL = 5;     // Column F = Verdi

// Wella brand mapping from sheet names
const WELLA_BRAND_MAP: Record<string, string> = {
  'GHD': 'GHD'
};

// Sæther Professional specific constants
const SAETHER_SUPPLIER_ID = '41599e28-28e7-4d9d-a146-7379a670db9a';
const SAETHER_NAME_COL = 0;       // Column A = Salongnavn
const SAETHER_KUNDE_NR_COL = 2;   // Column C = Hår1 Kundenummer (medlemsnummer)
const SAETHER_VALUE_COL = 7;      // Column H = Verdi

// Proud Production specific constants
const PROUDPRODUCTION_SUPPLIER_ID = 'cb03936e-324f-4634-910d-e688db7a107d';
const PROUDPRODUCTION_NAME_COL = 0;       // Column A = Salongnavn
const PROUDPRODUCTION_VALUE_COL = 1;      // Column B = Verdi
const PROUDPRODUCTION_KUNDE_NR_COL = 3;   // Column D = Hår1 Kundenummer (medlemsnummer)

// Pretty Good specific constants (identical structure to Proud Production)
const PRETTYGOOD_SUPPLIER_ID = 'ad8f9ecd-fb85-4b77-9837-6f21b2f31df7';
const PRETTYGOOD_NAME_COL = 0;       // Column A = Salongnavn
const PRETTYGOOD_VALUE_COL = 1;      // Column B = Verdi
const PRETTYGOOD_KUNDE_NR_COL = 3;   // Column D = Hår1 Kundenummer (medlemsnummer)

// Helper function to get quarter months
const getQuarterMonths = (quarter: string, year: number): string[] => {
  const quarterMap: Record<string, string[]> = {
    'Q1': ['01', '02', '03'],
    'Q2': ['04', '05', '06'],
    'Q3': ['07', '08', '09'],
    'Q4': ['10', '11', '12']
  };
  return quarterMap[quarter].map(m => `${year}-${m}`);
};

export function BonusImportTab() {
  const queryClient = useQueryClient();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false);
  const [selectedSaleForMatch, setSelectedSaleForMatch] = useState<ImportedSale | null>(null);
  const [salonSearchTerm, setSalonSearchTerm] = useState("");
  
  // Quarterly import state
  const [periodType, setPeriodType] = useState<'month' | 'quarter'>('month');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Column filters for imported sales
  const [filterIdentifier, setFilterIdentifier] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterSalon, setFilterSalon] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProductGroup, setFilterProductGroup] = useState<string>("all");
  const [syncAllProgress, setSyncAllProgress] = useState(0);

  // Fetch suppliers from leverandorer table
  const { data: suppliers = [] } = useQuery({
    queryKey: ['leverandorer-for-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leverandorer')
        .select('id, navn')
        .eq('aktiv', true)
        .order('navn');
      if (error) throw error;
      return data.map(l => ({ id: l.id, name: l.navn, cumulative_reporting: false }));
    }
  });

  // Fetch import batches
  const { data: batches = [] } = useQuery({
    queryKey: ['bonus-import-batches', selectedSupplierId],
    queryFn: () => getImportBatches(selectedSupplierId || undefined),
    enabled: true
  });

  // Fetch imported sales for selected batch
  const { data: importedSales = [] } = useQuery({
    queryKey: ['bonus-imported-sales', selectedBatchId],
    queryFn: () => getImportedSales(selectedBatchId),
    enabled: !!selectedBatchId
  });

  // Fetch salons for matching
  const { data: salons = [] } = useQuery({
    queryKey: ['salons-for-matching', salonSearchTerm],
    queryFn: async () => {
      let query = supabase
        .from('salons')
        .select('id, name, medlemsnummer, org_number')
        .order('name')
        .limit(50);
      
      if (salonSearchTerm) {
        query = query.or(`name.ilike.%${salonSearchTerm}%,medlemsnummer.ilike.%${salonSearchTerm}%,org_number.ilike.%${salonSearchTerm}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });


  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSupplierId || parsedData.length === 0) {
        throw new Error("Velg leverandør og last opp fil først");
      }

      // Determine periods to import
      const periodsToImport = periodType === 'quarter' 
        ? getQuarterMonths(selectedQuarter, selectedYear)
        : [period];
      
      const isQuarterImport = periodType === 'quarter';
      let lastBatch: any = null;

      for (const importPeriod of periodsToImport) {
        // Check and delete existing data for same supplier + period
        const { data: existingBatches } = await supabase
          .from('bonus_import_batches')
          .select('id, file_name, row_count')
          .eq('supplier_id', selectedSupplierId)
          .eq('period', importPeriod);
        
        if (existingBatches && existingBatches.length > 0) {
          console.log(`Sletter ${existingBatches.length} eksisterende batch(er) for ${importPeriod}`);
          
          // Delete sales rows first (due to foreign key)
          for (const batch of existingBatches) {
            await supabase
              .from('bonus_imported_sales')
              .delete()
              .eq('batch_id', batch.id);
          }
          
          // Then delete the batches
          await supabase
            .from('bonus_import_batches')
            .delete()
            .in('id', existingBatches.map(b => b.id));
        }

        // Create batch with quarter info in notes if applicable
        const batch = await createImportBatch({
          supplier_id: selectedSupplierId,
          period: importPeriod,
          file_name: fileName,
          notes: isQuarterImport ? `Kvartalsimport ${selectedQuarter} ${selectedYear} - fordelt på 3 måneder` : undefined
        });

        // Process and auto-match rows - divide value by 3 for quarterly imports
        const salesData = await Promise.all(parsedData.map(async (row) => {
          const matchedSalonId = await findSalonByIdentifier(selectedSupplierId, row.identifier);
          const reportedValue = isQuarterImport ? row.value / 3 : row.value;
          
          return {
            batch_id: batch.id,
            supplier_id: selectedSupplierId,
            reported_period: importPeriod,
            reported_value: reportedValue,
            cumulative_value: row.cumulativeValue,
            brand: row.brand,
            product_group: row.productGroup,
            raw_identifier: row.identifier,
            raw_name: row.name,
            matched_salon_id: matchedSalonId || null,
            match_status: matchedSalonId ? 'matched' : 'unmatched',
            match_confidence: matchedSalonId ? 100 : 0,
            match_method: matchedSalonId ? 'identifier' : null
          };
        }));

        await createImportedSales(salesData as any);

        // Update batch stats
        const matchedCount = salesData.filter(s => s.match_status === 'matched').length;
        await updateImportBatch(batch.id, {
          status: 'completed',
          row_count: salesData.length,
          matched_count: matchedCount,
          error_count: salesData.length - matchedCount,
          processed_at: new Date().toISOString()
        });

        lastBatch = batch;
      }

      if (isQuarterImport) {
        toast.info(`Kvartalsdata fordelt på ${periodsToImport.length} måneder`);
      }

      return lastBatch;
    },
    onSuccess: (batch) => {
      queryClient.invalidateQueries({ queryKey: ['bonus-import-batches'] });
      setIsImportDialogOpen(false);
      setParsedData([]);
      setFileName("");
      if (batch) setSelectedBatchId(batch.id);
      toast.success("Import fullført!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Match mutation - also saves identifier for future auto-matching
  const matchMutation = useMutation({
    mutationFn: async ({ saleId, salonId }: { saleId: string; salonId: string }) => {
      const result = await matchImportedSale(saleId, salonId, 'manual');
      
      // Also save identifier for future auto-matching
      if (selectedSaleForMatch?.raw_identifier && selectedSaleForMatch?.supplier_id) {
        // First delete any existing entries with same supplier_id + customer_number
        // This ensures manual match always overwrites previous entries
        const { error: deleteError } = await supabase
          .from('supplier_identifiers')
          .delete()
          .eq('supplier_id', selectedSaleForMatch.supplier_id)
          .eq('supplier_customer_number', selectedSaleForMatch.raw_identifier);
        
        if (deleteError) {
          console.warn('Could not delete existing identifier:', deleteError);
        }
        
        // Then insert the new mapping
        await upsertSupplierIdentifier({
          supplier_id: selectedSaleForMatch.supplier_id,
          salon_id: salonId,
          supplier_customer_number: selectedSaleForMatch.raw_identifier,
          identifier_type: 'manual_match'
        });
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus-imported-sales', selectedBatchId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-identifiers', selectedSupplierId] });
      queryClient.invalidateQueries({ queryKey: ['bonus-import-batches'] });
      setIsMatchDialogOpen(false);
      setSelectedSaleForMatch(null);
      toast.success("Salong matchet og lagret for fremtidige importer!");
    },
    onError: (error: Error) => {
      console.error('Match error:', error);
      toast.error(`Kunne ikke matche: ${error.message}`);
    }
  });

  // Unmatch mutation
  const unmatchMutation = useMutation({
    mutationFn: unmatchImportedSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'bonus-imported-sales' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'bonus-import-batches' });
      toast.success("Match fjernet");
    }
  });


  // Re-match mutation
  const rematchMutation = useMutation({
    mutationFn: (batchId: string) => rematchImportedSales(batchId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'bonus-import-batches' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'bonus-imported-sales' });
      toast.success(`Re-matching fullført: ${result.matched} matchet, ${result.failed} ikke matchet`);
    },
    onError: (error: Error) => {
      toast.error(`Feil ved re-matching: ${error.message}`);
    }
  });

  // Batches with unmatched rows
  const batchesWithUnmatched = batches.filter(b => (b.matched_count || 0) < (b.row_count || 0));

  // Sync all batches mutation
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const results = { totalMatched: 0, totalFailed: 0 };
      setSyncAllProgress(0);
      
      for (let i = 0; i < batchesWithUnmatched.length; i++) {
        const batch = batchesWithUnmatched[i];
        setSyncAllProgress(i + 1);
        const result = await rematchImportedSales(batch.id);
        results.totalMatched += result.matched;
        results.totalFailed += result.failed;
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'bonus-import-batches' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'bonus-imported-sales' });
      toast.success(`Synkronisering fullført: ${results.totalMatched} matchet, ${results.totalFailed} ikke matchet`);
      setSyncAllProgress(0);
    },
    onError: (error: Error) => {
      toast.error(`Feil ved synkronisering: ${error.message}`);
      setSyncAllProgress(0);
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const isLoreal = selectedSupplierId === LOREAL_SUPPLIER_ID;
    const isMariaNila = selectedSupplierId === MARIA_NILA_SUPPLIER_ID;
    const isIconHairspa = selectedSupplierId === ICON_HAIRSPA_SUPPLIER_ID;
    const isHeidenstrom = selectedSupplierId === HEIDENSTROM_SUPPLIER_ID;
    const isVerdant = selectedSupplierId === VERDANT_SUPPLIER_ID;
    const isInGoodHands = selectedSupplierId === INGOODHANDS_SUPPLIER_ID;
    const isWeAreOne = selectedSupplierId === WEAREONE_SUPPLIER_ID;
    const isWella = selectedSupplierId === WELLA_SUPPLIER_ID;
    const isSaether = selectedSupplierId === SAETHER_SUPPLIER_ID;
    const isProudProduction = selectedSupplierId === PROUDPRODUCTION_SUPPLIER_ID;
    const isPrettyGood = selectedSupplierId === PRETTYGOOD_SUPPLIER_ID;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // Read as raw array for L'Oréal or generic parsing
      const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      console.log('Raw data rows:', rawData.length);

      // L'Oréal-specific parsing
      if (isLoreal) {
        console.log('Using L\'Oréal-specific parser');
        
        // Find header row by looking for "Kunde nr" in column C
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rawData.length, 20); i++) {
          const row = rawData[i];
          if (!row || !Array.isArray(row)) continue;
          
          const cellC = String(row[LOREAL_KUNDE_NR_COL] || '').toLowerCase().trim();
          if (cellC.includes('kunde') && cellC.includes('nr')) {
            headerRowIndex = i;
            console.log(`Found L'Oréal header at row ${i}`);
            break;
          }
        }
        
        const parsed: ParsedRow[] = [];
        
        // Process data rows (skip header)
        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || !Array.isArray(row)) continue;
          
          const kundeNr = String(row[LOREAL_KUNDE_NR_COL] || '').trim();
          const salonNavn = String(row[LOREAL_NAVN_COL] || '').trim();
          
          // Skip rows without customer number
          if (!kundeNr || kundeNr === '0') continue;
          
          // Parse each brand's data
          for (const brand of LOREAL_BRAND_CONFIG) {
            // Parse videresalg (retail) value
            const videresalgValue = parseFloat(String(row[brand.videresalgCol] || '0').replace(/[^\d.-]/g, '')) || 0;
            if (videresalgValue > 0) {
              parsed.push({
                identifier: kundeNr,
                name: salonNavn,
                brand: brand.name,
                productGroup: 'produkt',
                value: videresalgValue
              });
            }
            
            // Parse kjemi (chemistry) value if brand supports it
            if (brand.hasKjemi && brand.kjemiCol !== null) {
              const kjemiValue = parseFloat(String(row[brand.kjemiCol] || '0').replace(/[^\d.-]/g, '')) || 0;
              if (kjemiValue > 0) {
                parsed.push({
                  identifier: kundeNr,
                  name: salonNavn,
                  brand: brand.name,
                  productGroup: 'kjemi',
                  value: kjemiValue
                });
              }
            }
          }
        }
        
        console.log('L\'Oréal parsed rows:', parsed.length);
        
        if (parsed.length === 0) {
          toast.error('Kunne ikke finne gyldige rader i L\'Oréal-filen. Sjekk at filen har korrekt format.');
        }
        
        setParsedData(parsed);
        return;
      }

      // Maria Nila-specific parsing
      if (isMariaNila) {
        console.log('Using Maria Nila-specific parser');
        
        const parsed: ParsedRow[] = [];
        
        // Process data rows (skip first row as header)
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || !Array.isArray(row)) continue;
          
          const salonNavn = String(row[MARIA_NILA_NAVN_COL] || '').trim();
          const kundeNr = String(row[MARIA_NILA_KUNDE_NR_COL] || '').trim();
          const omsetning = parseFloat(String(row[MARIA_NILA_OMSETNING_COL] || '0').replace(/[^\d.-]/g, '')) || 0;
          
          // Skip rows without customer number or zero value
          if (!kundeNr || kundeNr === '0' || omsetning <= 0) continue;
          
          parsed.push({
            identifier: kundeNr,
            name: salonNavn,
            brand: 'Maria Nila',
            productGroup: 'produkt',
            value: omsetning
          });
        }
        
        console.log('Maria Nila parsed rows:', parsed.length);
        
        if (parsed.length === 0) {
          toast.error('Kunne ikke finne gyldige rader i Maria Nila-filen. Sjekk at filen har kundenummer i kolonne 2 og omsetning i kolonne 3.');
        }
        
        setParsedData(parsed);
        return;
      }

      // ICON Hairspa-specific parsing
      if (isIconHairspa) {
        console.log('Using ICON Hairspa-specific parser');
        
        const parsed: ParsedRow[] = [];
        
        // Process data rows (skip first row as header)
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || !Array.isArray(row)) continue;
          
          const salonNavn = String(row[ICON_HAIRSPA_NAVN_COL] || '').trim();
          const kundeNr = String(row[ICON_HAIRSPA_KUNDE_NR_COL] || '').trim();
          const kjopsverdi = parseFloat(String(row[ICON_HAIRSPA_VALUE_COL] || '0').replace(/[^\d.-]/g, '')) || 0;
          
          // Skip rows without customer number or zero value
          if (!kundeNr || kundeNr === '0' || kjopsverdi <= 0) continue;
          
          parsed.push({
            identifier: kundeNr,
            name: salonNavn,
            brand: 'ICON Hairspa',
            productGroup: 'produkt',
            value: kjopsverdi
          });
        }
        
        console.log('ICON Hairspa parsed rows:', parsed.length);
        
        if (parsed.length === 0) {
          toast.error('Kunne ikke finne gyldige rader i ICON Hairspa-filen. Sjekk at filen har salongnavn i kolonne 1, kundenummer i kolonne 2 og kjøpsverdi i kolonne 3.');
        }
        
        setParsedData(parsed);
        return;
      }

      // Heidenstrøm-specific parsing (multi-sheet with brand per sheet)
      if (isHeidenstrom) {
        console.log('Using Heidenstrøm-specific parser');
        console.log('Available sheets:', workbook.SheetNames);
        
        const parsed: ParsedRow[] = [];
        
        // Process each sheet that matches our brand mapping
        for (const sheetName of workbook.SheetNames) {
          const brandName = HEIDENSTROM_BRAND_MAP[sheetName];
          if (!brandName) {
            console.log(`Skipping unknown sheet: ${sheetName}`);
            continue;
          }
          
          console.log(`Processing sheet "${sheetName}" as brand "${brandName}"`);
          const brandSheet = workbook.Sheets[sheetName];
          const brandData: any[][] = XLSX.utils.sheet_to_json(brandSheet, { header: 1 });
          
          // Process data rows (skip first row as header)
          for (let i = 1; i < brandData.length; i++) {
            const row = brandData[i];
            if (!row || !Array.isArray(row)) continue;
            
            const orgNr = String(row[HEIDENSTROM_ORG_NR_COL] || '').trim().replace(/\s/g, '');
            const salonNavn = String(row[HEIDENSTROM_NAME_COL] || '').trim();
            const belop = parseFloat(String(row[HEIDENSTROM_VALUE_COL] || '0').replace(/[^\d.-]/g, '')) || 0;
            
            // Skip rows without org number or zero/negative value
            if (!orgNr || orgNr.length < 9 || belop <= 0) continue;
            
            parsed.push({
              identifier: orgNr,
              name: salonNavn,
              brand: brandName,
              productGroup: 'produkt',
              value: belop
            });
          }
        }
        
        console.log('Heidenstrøm parsed rows:', parsed.length);
        
        if (parsed.length === 0) {
          toast.error('Kunne ikke finne gyldige rader i Heidenstrøm-filen. Sjekk at filen har ark med navn Matrix, Nõberu of Sweden, Rekvisita eller Vision Haircare, med orgnummer i kolonne 2 og beløp i kolonne 3.');
        }
        
        setParsedData(parsed);
        return;
      }

      // Verdant-specific parsing
      if (isVerdant) {
        console.log('Using Verdant-specific parser');
        
        const parsed: ParsedRow[] = [];
        
        // Process data rows (skip first row as header)
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || !Array.isArray(row)) continue;
          
          const kundeNr = String(row[VERDANT_KUNDE_NR_COL] || '').trim();
          const salonNavn = String(row[VERDANT_NAME_COL] || '').trim();
          const produkter = parseFloat(String(row[VERDANT_PRODUKTER_COL] || '0').replace(/[^\d.-]/g, '')) || 0;
          const farge = parseFloat(String(row[VERDANT_FARGE_COL] || '0').replace(/[^\d.-]/g, '')) || 0;
          
          // Skip rows without customer number
          if (!kundeNr || kundeNr === '0') continue;
          
          // Add produkter (videresalg) if > 0
          if (produkter > 0) {
            parsed.push({
              identifier: kundeNr,
              name: salonNavn,
              brand: 'Verdant',
              productGroup: 'produkt',
              value: produkter
            });
          }
          
          // Add farge (kjemi) if > 0
          if (farge > 0) {
            parsed.push({
              identifier: kundeNr,
              name: salonNavn,
              brand: 'Verdant',
              productGroup: 'kjemi',
              value: farge
            });
          }
        }
        
        console.log('Verdant parsed rows:', parsed.length);
        
        if (parsed.length === 0) {
          toast.error('Kunne ikke finne gyldige rader i Verdant-filen. Sjekk at filen har Nummer i kolonne A, Kundenavn i kolonne B, Produkter i kolonne C og Farge i kolonne D.');
        }
        
        setParsedData(parsed);
        return;
      }

      // InGoodHands-specific parsing
      if (isInGoodHands) {
        console.log('Using InGoodHands-specific parser');
        
        const parsed: ParsedRow[] = [];
        
        // Process data rows (skip first row as header)
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || !Array.isArray(row)) continue;
          
          const salonNavn = String(row[INGOODHANDS_NAME_COL] || '').trim();
          const kundeNr = String(row[INGOODHANDS_KUNDE_NR_COL] || '').trim();
          const verdi = parseFloat(String(row[INGOODHANDS_VALUE_COL] || '0').replace(/[^\d.-]/g, '')) || 0;
          
          // Skip rows without customer number or zero value
          if (!kundeNr || kundeNr === '0' || verdi <= 0) continue;
          
          parsed.push({
            identifier: kundeNr,
            name: salonNavn,
            brand: 'InGoodHands',
            productGroup: 'produkt',
            value: verdi
          });
        }
        
        console.log('InGoodHands parsed rows:', parsed.length);
        
        if (parsed.length === 0) {
          toast.error('Kunne ikke finne gyldige rader i InGoodHands-filen. Sjekk at filen har salongnavn i kolonne A, kundenummer i kolonne B og verdi i kolonne J.');
        }
        
        setParsedData(parsed);
        return;
      }

      // We Are One-specific parsing (multi-sheet with brand per sheet: AVEDA, Bumble and Bumble)
      if (isWeAreOne) {
        console.log('Using We Are One-specific parser');
        console.log('Available sheets:', workbook.SheetNames);
        
        const parsed: ParsedRow[] = [];
        
        // Process each sheet that matches our brand mapping
        for (const sheetName of workbook.SheetNames) {
          const brandName = WEAREONE_BRAND_MAP[sheetName];
          if (!brandName) {
            console.log(`Skipping unknown sheet: ${sheetName}`);
            continue;
          }
          
          console.log(`Processing sheet "${sheetName}" as brand "${brandName}"`);
          const brandSheet = workbook.Sheets[sheetName];
          const brandData: any[][] = XLSX.utils.sheet_to_json(brandSheet, { header: 1 });
          
          // Process data rows (skip first row as header)
          for (let i = 1; i < brandData.length; i++) {
            const row = brandData[i];
            if (!row || !Array.isArray(row)) continue;
            
            const salonNavn = String(row[WEAREONE_NAME_COL] || '').trim();
            const orgNr = String(row[WEAREONE_ORG_NR_COL] || '').trim().replace(/\s/g, '');
            const varekjop = parseFloat(String(row[WEAREONE_VALUE_COL] || '0').replace(/[^\d.-]/g, '')) || 0;
            
            // Skip rows without org number or zero/negative value
            if (!orgNr || orgNr.length < 9 || varekjop <= 0) continue;
            
            parsed.push({
              identifier: orgNr,
              name: salonNavn,
              brand: brandName,
              productGroup: 'produkt',
              value: varekjop
            });
          }
        }
        
        console.log('We Are One parsed rows:', parsed.length);
        
        if (parsed.length === 0) {
          toast.error('Kunne ikke finne gyldige rader i We Are One-filen. Sjekk at filen har ark med navn "AVEDA" eller "Bumble and Bumble", med Navn i kolonne A, Org.nr i kolonne B og Varekjøp i kolonne C.');
        }
        
        setParsedData(parsed);
        return;
      }

      // Wella/GHD-specific parsing (multi-sheet with brand per sheet)
      if (isWella) {
        console.log('Using Wella-specific parser');
        console.log('Available sheets:', workbook.SheetNames);
        
        const parsed: ParsedRow[] = [];
        
        // Process each sheet that matches our brand mapping
        for (const sheetName of workbook.SheetNames) {
          const brandName = WELLA_BRAND_MAP[sheetName];
          if (!brandName) {
            console.log(`Skipping unknown sheet: ${sheetName}`);
            continue;
          }
          
          console.log(`Processing sheet "${sheetName}" as brand "${brandName}"`);
          const brandSheet = workbook.Sheets[sheetName];
          const brandData: any[][] = XLSX.utils.sheet_to_json(brandSheet, { header: 1 });
          
          // Find header row by looking for "Kundenr" or similar
          let headerRowIndex = 0;
          for (let i = 0; i < Math.min(brandData.length, 10); i++) {
            const row = brandData[i];
            if (!row || !Array.isArray(row)) continue;
            
            const cellA = String(row[WELLA_GHD_KUNDE_NR_COL] || '').toLowerCase().trim();
            if (cellA.includes('kunde') || cellA.includes('nr')) {
              headerRowIndex = i;
              console.log(`Found header at row ${i}`);
              break;
            }
          }
          
          // Process data rows (skip header)
          for (let i = headerRowIndex + 1; i < brandData.length; i++) {
            const row = brandData[i];
            if (!row || !Array.isArray(row)) continue;
            
            const kundenr = String(row[WELLA_GHD_KUNDE_NR_COL] || '').trim();
            const salonNavn = String(row[WELLA_GHD_NAME_COL] || '').trim();
            const verdi = parseFloat(String(row[WELLA_GHD_VALUE_COL] || '0').replace(/[^\d.-]/g, '')) || 0;
            
            // Skip rows without kundenummer or zero/negative value
            if (!kundenr || verdi <= 0) continue;
            
            parsed.push({
              identifier: kundenr,
              name: salonNavn,
              brand: brandName,
              productGroup: 'produkt',
              value: verdi
            });
          }
        }
        
        console.log('Wella parsed rows:', parsed.length);
        
        if (parsed.length === 0) {
          toast.error('Kunne ikke finne gyldige rader i Wella-filen. Sjekk at filen har ark med navn "GHD", med Kundenr i kolonne A, Salongnavn i kolonne D og Verdi i kolonne F.');
        }
        
        setParsedData(parsed);
        return;
      }

      // Sæther Professional-specific parsing
      if (isSaether) {
        console.log('Using Sæther Professional-specific parser');
        
        const parsed: ParsedRow[] = [];
        
        // Process data rows (skip first row as header)
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || !Array.isArray(row)) continue;
          
          const salonName = String(row[SAETHER_NAME_COL] || '').trim();
          const kundeNr = String(row[SAETHER_KUNDE_NR_COL] || '').trim();
          const verdi = parseFloat(String(row[SAETHER_VALUE_COL] || '0').replace(/[^\d.-]/g, '')) || 0;
          
          // Skip rows without customer number or zero value
          if (!kundeNr || kundeNr === '0' || verdi <= 0) continue;
          
          parsed.push({
            identifier: kundeNr,
            name: salonName || `Salon ${kundeNr}`,
            brand: 'Sæther',
            productGroup: 'produkt',
            value: verdi
          });
        }
        
        console.log('Sæther parsed rows:', parsed.length);
        
        if (parsed.length === 0) {
          toast.error('Kunne ikke finne gyldige rader i Sæther-filen. Sjekk at filen har Hår1 Kundenummer i kolonne C og Verdi i kolonne H.');
        }
        
        setParsedData(parsed);
        return;
      }

      // Proud Production-specific parsing (single sheet, Hår1 medlemsnummer matching)
      if (isProudProduction) {
        console.log('Using Proud Production-specific parser');
        
        const parsed: ParsedRow[] = [];
        
        // Process data rows (skip first row as header)
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || !Array.isArray(row)) continue;
          
          const salonName = String(row[PROUDPRODUCTION_NAME_COL] || '').trim();
          const verdi = parseFloat(String(row[PROUDPRODUCTION_VALUE_COL] || '0').replace(/[^\d.-]/g, '')) || 0;
          const kundeNr = String(row[PROUDPRODUCTION_KUNDE_NR_COL] || '').trim();
          
          // Skip rows without customer number or zero value
          if (!kundeNr || kundeNr === '0' || verdi <= 0) continue;
          
          parsed.push({
            identifier: kundeNr,
            name: salonName || `Salon ${kundeNr}`,
            brand: 'Proud Production',
            productGroup: 'produkt',
            value: verdi
          });
        }
        
        console.log('Proud Production parsed rows:', parsed.length);
        
        if (parsed.length === 0) {
          toast.error('Kunne ikke finne gyldige rader i Proud Production-filen. Sjekk at filen har Salongnavn i kolonne A, Verdi i kolonne B og Hår1 Kundenummer i kolonne D.');
        }
        
        setParsedData(parsed);
        return;
      }

      // Pretty Good-specific parsing (identical to Proud Production - single sheet, Hår1 medlemsnummer matching)
      if (isPrettyGood) {
        console.log('Using Pretty Good-specific parser');
        
        const parsed: ParsedRow[] = [];
        
        // Process data rows (skip first row as header)
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || !Array.isArray(row)) continue;
          
          const salonName = String(row[PRETTYGOOD_NAME_COL] || '').trim();
          const verdi = parseFloat(String(row[PRETTYGOOD_VALUE_COL] || '0').replace(/[^\d.-]/g, '')) || 0;
          const kundeNr = String(row[PRETTYGOOD_KUNDE_NR_COL] || '').trim();
          
          // Skip rows without customer number or zero value
          if (!kundeNr || kundeNr === '0' || verdi <= 0) continue;
          
          parsed.push({
            identifier: kundeNr,
            name: salonName || `Salon ${kundeNr}`,
            brand: 'Pretty Good',
            productGroup: 'produkt',
            value: verdi
          });
        }
        
        console.log('Pretty Good parsed rows:', parsed.length);
        
        if (parsed.length === 0) {
          toast.error('Kunne ikke finne gyldige rader i Pretty Good-filen. Sjekk at filen har Salongnavn i kolonne A, Verdi i kolonne B og Hår1 Kundenummer i kolonne D.');
        }
        
        setParsedData(parsed);
        return;
      }
      
      // Generic parsing for other suppliers
      const knownPatterns = ['kundenummer', 'kundenr', 'navn', 'name', 'kunde', 'beløp', 'omsetning', 'sum', 'total', 'verdi', 'salg'];
      
      // Find header row by looking for rows with known column names
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(rawData.length, 20); i++) {
        const row = rawData[i];
        if (!row || !Array.isArray(row)) continue;
        
        const rowValues = row.map(cell => String(cell || '').toLowerCase().trim());
        const matchCount = knownPatterns.filter(pattern => 
          rowValues.some(val => val.includes(pattern) || pattern.includes(val))
        ).length;
        
        if (matchCount >= 2) {
          headerRowIndex = i;
          console.log(`Found header at row ${i}`);
          break;
        }
      }
      
      // Update sheet range to start from header row
      if (headerRowIndex > 0 && sheet['!ref']) {
        const range = XLSX.utils.decode_range(sheet['!ref']);
        range.s.r = headerRowIndex;
        sheet['!ref'] = XLSX.utils.encode_range(range);
      }
      
      // Now parse with correct header
      const json = XLSX.utils.sheet_to_json(sheet);
      
      // Find matching columns dynamically
      const findColumn = (row: Record<string, any>, ...patterns: string[]): string => {
        for (const pattern of patterns) {
          const lowerPattern = pattern.toLowerCase();
          const matchedKey = Object.keys(row).find(k => 
            k.toLowerCase().includes(lowerPattern) || lowerPattern.includes(k.toLowerCase())
          );
          if (matchedKey && row[matchedKey]) return String(row[matchedKey]);
        }
        return '';
      };

      const findNumericColumn = (row: Record<string, any>, ...patterns: string[]): number => {
        for (const pattern of patterns) {
          const lowerPattern = pattern.toLowerCase();
          const matchedKey = Object.keys(row).find(k => 
            k.toLowerCase().includes(lowerPattern) || lowerPattern.includes(k.toLowerCase())
          );
          if (matchedKey && row[matchedKey] != null) {
            const val = parseFloat(String(row[matchedKey]).replace(/[^\d.-]/g, ''));
            if (!isNaN(val)) return val;
          }
        }
        return 0;
      };

      // Map columns with flexible matching
      const parsed: ParsedRow[] = json.map((row: any) => ({
        identifier: findColumn(row, 'kundenummer', 'kundenr', 'customer', 'id', 'nr', 'kode', 'code'),
        name: findColumn(row, 'navn', 'name', 'salon', 'kunde', 'customer', 'butikk'),
        brand: findColumn(row, 'merkevare', 'brand', 'merke', 'varemerkre'),
        productGroup: findColumn(row, 'produktgruppe', 'gruppe', 'group', 'kategori', 'category'),
        value: findNumericColumn(row, 'beløp', 'omsetning', 'verdi', 'sum', 'total', 'amount', 'value', 'salg'),
        cumulativeValue: findNumericColumn(row, 'kumulativ', 'cumulative', 'ytd', 'hittil') || undefined
      })).filter((row: ParsedRow) => row.value > 0);
      
      console.log('Final parsed rows:', parsed.length);
      
      if (parsed.length === 0) {
        toast.error('Kunne ikke finne gyldige rader i filen. Sjekk at filen inneholder kolonner som "Kundenummer", "Navn" og "Beløp/Omsetning".');
      }

      setParsedData(parsed);
    };
    reader.readAsBinaryString(file);
  };

  const getMatchStatusIcon = (status: string) => {
    switch (status) {
      case 'matched':
      case 'manual_override':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'unmatched':
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Import Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import salgsdata
          </CardTitle>
          <CardDescription>
            Last opp salgsrapporter fra leverandører for å beregne bonus
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Leverandør</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg leverandør" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                      {supplier.cumulative_reporting && (
                        <span className="ml-2 text-xs text-muted-foreground">(kumulativ)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Periodetype</Label>
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as 'month' | 'quarter')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Måned</SelectItem>
                  <SelectItem value="quarter">Kvartal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {periodType === 'month' ? (
              <div className="space-y-2">
                <Label>Periode</Label>
                <Input 
                  type="month" 
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Kvartal</Label>
                  <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1">Q1 (Jan-Mar)</SelectItem>
                      <SelectItem value="Q2">Q2 (Apr-Jun)</SelectItem>
                      <SelectItem value="Q3">Q3 (Jul-Sep)</SelectItem>
                      <SelectItem value="Q4">Q4 (Okt-Des)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>År</Label>
                  <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026].map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" disabled={!selectedSupplierId}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Last opp fil
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Import salgsdata</DialogTitle>
                    <DialogDescription>
                      Last opp Excel eller CSV-fil med salgsdata
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <Input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {fileName || "Klikk for å velge fil"}
                        </p>
                      </label>
                    </div>

                    {parsedData.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          Forhåndsvisning ({parsedData.length} rader)
                          {periodType === 'quarter' && (
                            <span className="ml-2 text-muted-foreground font-normal">
                              (verdier deles på 3 ved import)
                            </span>
                          )}
                        </p>
                        <div className="max-h-64 overflow-auto border rounded">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Kundenr</TableHead>
                                <TableHead>Navn</TableHead>
                                <TableHead>Merkevare</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Beløp</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {parsedData.slice(0, 15).map((row, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-mono text-sm">{row.identifier}</TableCell>
                                  <TableCell className="max-w-[150px] truncate">{row.name}</TableCell>
                                  <TableCell>{row.brand}</TableCell>
                                  <TableCell>
                                    {row.productGroup && (
                                      <Badge variant={row.productGroup === 'kjemi' ? 'secondary' : 'outline'} className="text-xs">
                                        {row.productGroup === 'kjemi' ? 'Kjemi' : 'Videresalg'}
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {row.value.toLocaleString('nb-NO')} kr
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        {parsedData.length > 15 && (
                          <p className="text-xs text-muted-foreground text-center">
                            ... og {parsedData.length - 15} flere rader
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                      Avbryt
                    </Button>
                    <Button 
                      onClick={() => importMutation.mutate()}
                      disabled={parsedData.length === 0 || importMutation.isPending}
                    >
                      {importMutation.isPending ? "Importerer..." : "Start import"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {periodType === 'quarter' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              Kvartalstall fordeles automatisk likt på 3 måneder (verdi ÷ 3)
            </div>
          )}
        </CardContent>
      </Card>


      {/* Import History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Importhistorikk</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending || batchesWithUnmatched.length === 0}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncAllMutation.isPending ? 'animate-spin' : ''}`} />
            {syncAllMutation.isPending 
              ? `Synkroniserer ${syncAllProgress}/${batchesWithUnmatched.length}...`
              : `Synk alle (${batchesWithUnmatched.length})`
            }
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leverandør</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Fil</TableHead>
                <TableHead className="text-center">Rader</TableHead>
                <TableHead className="text-center">Matchet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Importert</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Ingen importer ennå
                  </TableCell>
                </TableRow>
              ) : (
                batches.map(batch => (
                  <TableRow 
                    key={batch.id}
                    className={`cursor-pointer ${selectedBatchId === batch.id ? 'bg-muted' : ''}`}
                    onClick={() => setSelectedBatchId(batch.id)}
                  >
                    <TableCell>{batch.suppliers?.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {formatPeriodDisplay(batch.period)}
                        {batch.notes?.includes('Kvartalsimport') && (
                          <Badge variant="secondary" className="text-xs">Kvartal</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{batch.file_name}</TableCell>
                    <TableCell className="text-center">{batch.row_count}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-green-600">{batch.matched_count}</span>
                      {batch.error_count > 0 && (
                        <span className="text-amber-600 ml-1">/ {batch.error_count}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={batch.status === 'completed' ? 'bg-green-500/10' : ''}>
                        {batch.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(batch.imported_at).toLocaleDateString('nb-NO')}
                    </TableCell>
                    <TableCell>
                      {batch.matched_count < batch.row_count && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            rematchMutation.mutate(batch.id);
                          }}
                          disabled={rematchMutation.isPending}
                          title="Kjør matching på nytt"
                        >
                          <RefreshCw className={`h-4 w-4 ${rematchMutation.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Imported Sales Detail */}
      {selectedBatchId && (() => {
        // Filter imported sales
        const filteredSales = importedSales.filter(sale => {
          if (filterIdentifier && !sale.raw_identifier?.toLowerCase().includes(filterIdentifier.toLowerCase())) return false;
          if (filterName && !sale.raw_name?.toLowerCase().includes(filterName.toLowerCase())) return false;
          if (filterSalon && !sale.salons?.name?.toLowerCase().includes(filterSalon.toLowerCase())) return false;
          if (filterBrand && !sale.brand?.toLowerCase().includes(filterBrand.toLowerCase())) return false;
          if (filterStatus !== 'all' && sale.match_status !== filterStatus) return false;
          if (filterProductGroup !== 'all' && sale.product_group !== filterProductGroup) return false;
          return true;
        });

        // Get unique brands for filter
        const uniqueBrands = [...new Set(importedSales.map(s => s.brand).filter(Boolean))];

        return (
          <Card>
            <CardHeader>
              <CardTitle>Importerte salg</CardTitle>
              <CardDescription>
                Klikk på umatchede rader for å manuelt koble til salong
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Column Filters */}
              <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
                <Input
                  placeholder="Filter kundenr..."
                  value={filterIdentifier}
                  onChange={(e) => setFilterIdentifier(e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="Filter navn..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="Filter salong..."
                  value={filterSalon}
                  onChange={(e) => setFilterSalon(e.target.value)}
                  className="h-8 text-sm"
                />
                <Select value={filterBrand || "all"} onValueChange={(v) => setFilterBrand(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Alle merkevarer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle merkevarer</SelectItem>
                    {uniqueBrands.map(brand => (
                      <SelectItem key={brand} value={brand!}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterProductGroup} onValueChange={setFilterProductGroup}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Alle undergrupper" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle undergrupper</SelectItem>
                    <SelectItem value="produkt">Videre salg</SelectItem>
                    <SelectItem value="kjemi">Kjemi</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Alle statuser" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle statuser</SelectItem>
                    <SelectItem value="matched">Matchet</SelectItem>
                    <SelectItem value="unmatched">Ikke matchet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Kundenummer</TableHead>
                    <TableHead>Navn (fra fil)</TableHead>
                    <TableHead>Matchet salong</TableHead>
                    <TableHead>Merkevare</TableHead>
                    <TableHead>Undergruppe</TableHead>
                    <TableHead className="text-right">Beløp</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Ingen salg matcher filteret
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSales.map(sale => (
                      <TableRow 
                        key={sale.id}
                        className={sale.match_status === 'unmatched' ? 'cursor-pointer hover:bg-muted' : ''}
                        onClick={() => {
                          if (sale.match_status === 'unmatched') {
                            setSelectedSaleForMatch(sale);
                            setIsMatchDialogOpen(true);
                          }
                        }}
                      >
                        <TableCell>{getMatchStatusIcon(sale.match_status)}</TableCell>
                        <TableCell className="font-mono text-sm">{sale.raw_identifier}</TableCell>
                        <TableCell>{sale.raw_name}</TableCell>
                        <TableCell>
                          {sale.salons?.name || (
                            <span className="text-muted-foreground italic">Ikke matchet</span>
                          )}
                        </TableCell>
                        <TableCell>{sale.brand}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={sale.product_group === 'kjemi' ? 'bg-purple-500/10' : 'bg-blue-500/10'}>
                            {sale.product_group === 'kjemi' ? 'Kjemi' : sale.product_group === 'produkt' ? 'Videre salg' : sale.product_group || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {sale.reported_value.toLocaleString('nb-NO')} kr
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(sale.match_status)}>
                            {getMatchStatusLabel(sale.match_status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sale.match_status !== 'unmatched' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                unmatchMutation.mutate(sale.id);
                              }}
                              disabled={unmatchMutation.isPending}
                              title="Fjern match"
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })()}

      {/* Manual Match Dialog */}
      <Dialog open={isMatchDialogOpen} onOpenChange={setIsMatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Match til salong</DialogTitle>
            <DialogDescription>
              Søk og velg salong for "{selectedSaleForMatch?.raw_name || selectedSaleForMatch?.raw_identifier}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Søk på navn, medlemsnummer eller org.nr..."
                value={salonSearchTerm}
                onChange={(e) => setSalonSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-64 overflow-auto border rounded">
              {salons.map(salon => (
                <div
                  key={salon.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-0"
                  onClick={() => {
                    if (selectedSaleForMatch) {
                      matchMutation.mutate({ 
                        saleId: selectedSaleForMatch.id, 
                        salonId: salon.id 
                      });
                    }
                  }}
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{salon.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {salon.medlemsnummer && `#${salon.medlemsnummer}`}
                      {salon.medlemsnummer && salon.org_number && ' · '}
                      {salon.org_number}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
