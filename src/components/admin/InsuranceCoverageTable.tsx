import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

interface InsuranceProduct {
  id: string;
  name: string;
}

interface ProductTier {
  id: string;
  product_id: string;
  tier_name: string;
  tier_description: string | null;
  price: number;
  sort_order: number;
}

interface CoverageDetail {
  id: string;
  tier_id: string;
  coverage_type: string;
  coverage_value: string;
  sort_order: number;
}

interface InsuranceCoverageTableProps {
  product: InsuranceProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InsuranceCoverageTable({ product, open, onOpenChange }: InsuranceCoverageTableProps) {
  const queryClient = useQueryClient();
  const [editingTiers, setEditingTiers] = useState<Record<string, Partial<ProductTier>>>({});

  const { data: tiers, isLoading: tiersLoading } = useQuery({
    queryKey: ["insurance-product-tiers", product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_product_tiers")
        .select("*")
        .eq("product_id", product.id)
        .order("sort_order");
      
      if (error) throw error;
      return data as ProductTier[];
    },
    enabled: open,
  });

  const { data: coverageDetails, isLoading: coverageLoading } = useQuery({
    queryKey: ["insurance-coverage-details", product.id],
    queryFn: async () => {
      if (!tiers || tiers.length === 0) return [];
      
      const tierIds = tiers.map((t) => t.id);
      const { data, error } = await supabase
        .from("insurance_coverage_details")
        .select("*")
        .in("tier_id", tierIds)
        .order("sort_order");
      
      if (error) throw error;
      return data as CoverageDetail[];
    },
    enabled: open && !!tiers && tiers.length > 0,
  });

  const updateTierMutation = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { error } = await supabase
        .from("insurance_product_tiers")
        .update({ price })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-product-tiers"] });
      toast.success("Pris oppdatert");
      setEditingTiers({});
    },
    onError: () => {
      toast.error("Kunne ikke oppdatere pris");
    },
  });

  const updateCoverageMutation = useMutation({
    mutationFn: async ({ id, coverage_value }: { id: string; coverage_value: string }) => {
      const { error } = await supabase
        .from("insurance_coverage_details")
        .update({ coverage_value })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-coverage-details"] });
      toast.success("Dekning oppdatert");
    },
    onError: () => {
      toast.error("Kunne ikke oppdatere dekning");
    },
  });

  const addCoverageMutation = useMutation({
    mutationFn: async ({ coverage_type }: { coverage_type: string }) => {
      if (!tiers) return;
      
      const maxOrder = coverageDetails?.reduce((max, c) => Math.max(max, c.sort_order), 0) || 0;
      
      // Add coverage for all tiers
      const inserts = tiers.map((tier) => ({
        tier_id: tier.id,
        coverage_type,
        coverage_value: "-",
        sort_order: maxOrder + 1,
      }));

      const { error } = await supabase
        .from("insurance_coverage_details")
        .insert(inserts);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-coverage-details"] });
      toast.success("Dekningstype lagt til");
    },
    onError: () => {
      toast.error("Kunne ikke legge til dekningstype");
    },
  });

  const deleteCoverageMutation = useMutation({
    mutationFn: async (coverage_type: string) => {
      if (!tiers || !coverageDetails) return;
      
      const idsToDelete = coverageDetails
        .filter((c) => c.coverage_type === coverage_type)
        .map((c) => c.id);

      const { error } = await supabase
        .from("insurance_coverage_details")
        .delete()
        .in("id", idsToDelete);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-coverage-details"] });
      toast.success("Dekningstype slettet");
    },
    onError: () => {
      toast.error("Kunne ikke slette dekningstype");
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("nb-NO", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Get unique coverage types
  const coverageTypes = coverageDetails
    ? [...new Set(coverageDetails.map((c) => c.coverage_type))]
    : [];

  const getCoverageValue = (tierId: string, coverageType: string) => {
    return coverageDetails?.find(
      (c) => c.tier_id === tierId && c.coverage_type === coverageType
    );
  };

  const handleAddCoverageType = () => {
    const newType = prompt("Skriv inn navn på ny dekningstype:");
    if (newType) {
      addCoverageMutation.mutate({ coverage_type: newType });
    }
  };

  if (tiersLoading || coverageLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Dekningstabell for {product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tier prices */}
          <div>
            <h4 className="font-medium mb-3">Priser per nivå</h4>
            <div className="grid grid-cols-3 gap-4">
              {tiers?.map((tier) => (
                <div key={tier.id} className="border rounded-lg p-4">
                  <h5 className="font-medium mb-2">{tier.tier_name}</h5>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={editingTiers[tier.id]?.price ?? tier.price}
                      onChange={(e) =>
                        setEditingTiers((prev) => ({
                          ...prev,
                          [tier.id]: { price: parseFloat(e.target.value) || 0 },
                        }))
                      }
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">kr/år</span>
                    {editingTiers[tier.id]?.price !== undefined && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateTierMutation.mutate({
                            id: tier.id,
                            price: editingTiers[tier.id].price!,
                          })
                        }
                        disabled={updateTierMutation.isPending}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {tier.tier_description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {tier.tier_description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Coverage table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Dekningsdetaljer</h4>
              <Button size="sm" variant="outline" onClick={handleAddCoverageType}>
                <Plus className="h-4 w-4 mr-2" />
                Legg til dekningstype
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dekningstype</TableHead>
                  {tiers?.map((tier) => (
                    <TableHead key={tier.id} className="text-center">
                      {tier.tier_name}
                    </TableHead>
                  ))}
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coverageTypes.map((coverageType) => (
                  <TableRow key={coverageType}>
                    <TableCell className="font-medium">{coverageType}</TableCell>
                    {tiers?.map((tier) => {
                      const coverage = getCoverageValue(tier.id, coverageType);
                      return (
                        <TableCell key={tier.id} className="text-center">
                          <Input
                            value={coverage?.coverage_value || "-"}
                            onChange={(e) => {
                              if (coverage) {
                                updateCoverageMutation.mutate({
                                  id: coverage.id,
                                  coverage_value: e.target.value,
                                });
                              }
                            }}
                            className="w-full text-center"
                          />
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Vil du slette "${coverageType}" fra alle nivåer?`)) {
                            deleteCoverageMutation.mutate(coverageType);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
