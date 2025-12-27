import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, FileText, TableProperties, Heart, Building2, Shield, Activity, Plane, ShieldCheck } from "lucide-react";
import { InsuranceProductForm } from "./InsuranceProductForm";
import { InsuranceProductDocuments } from "./InsuranceProductDocuments";
import { InsuranceCoverageTable } from "./InsuranceCoverageTable";

interface InsuranceProduct {
  id: string;
  name: string;
  description: string | null;
  product_type: string;
  price_model: string;
  base_price: number;
  requires_employee_selection: boolean;
  active: boolean;
  sort_order: number;
  icon_name: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductTier {
  id: string;
  product_id: string;
  tier_name: string;
  tier_description: string | null;
  price: number;
  sort_order: number;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Heart,
  Building2,
  Shield,
  Activity,
  Plane,
  ShieldCheck,
};

const priceModelLabels: Record<string, string> = {
  fast: "Fast pris",
  per_arsverk: "Per årsverk",
  per_person: "Per person",
};

const productTypeLabels: Record<string, string> = {
  salong: "Salongforsikring",
  yrkesskade: "Yrkesskade",
  cyber: "Cyber",
  reise: "Reise",
  fritidsulykke: "Fritidsulykke",
  helse: "Helse",
};

interface InsuranceProductsTabProps {
  readOnly?: boolean;
}

export function InsuranceProductsTab({ readOnly = false }: InsuranceProductsTabProps) {
  const [selectedProduct, setSelectedProduct] = useState<InsuranceProduct | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [isCoverageOpen, setIsCoverageOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["insurance-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_products")
        .select("*")
        .order("sort_order");
      
      if (error) throw error;
      return data as InsuranceProduct[];
    },
  });

  const { data: tiers } = useQuery({
    queryKey: ["insurance-product-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_product_tiers")
        .select("*")
        .order("sort_order");
      
      if (error) throw error;
      return data as ProductTier[];
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("insurance_products")
        .update({ active })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-products"] });
      toast.success("Produktstatus oppdatert");
    },
    onError: () => {
      toast.error("Kunne ikke oppdatere produktstatus");
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("nb-NO", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getProductTiers = (productId: string) => {
    return tiers?.filter((t) => t.product_id === productId) || [];
  };

  const renderIcon = (iconName: string | null) => {
    if (!iconName || !iconMap[iconName]) return null;
    const Icon = iconMap[iconName];
    return <Icon className="h-5 w-5 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Forsikringsprodukter</CardTitle>
            <CardDescription>
              {readOnly ? "Oversikt over produktkatalog med priser og vilkår" : "Administrer produktkatalogen med priser og vilkår"}
            </CardDescription>
          </div>
          {!readOnly && (
            <Button onClick={() => { setSelectedProduct(null); setIsFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nytt produkt
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="min-w-[200px]">Produkt</TableHead>
                <TableHead className="w-32">Type</TableHead>
                <TableHead className="w-24">Prismodell</TableHead>
                <TableHead className="text-right min-w-[120px]">Pris</TableHead>
                <TableHead className="text-center w-20">Aktiv</TableHead>
                <TableHead className="text-right w-24">Handlinger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => {
                const productTiers = getProductTiers(product.id);
                const hasTiers = productTiers.length > 0;
                
                return (
                  <TableRow key={product.id}>
                    <TableCell>{renderIcon(product.icon_name)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {productTypeLabels[product.product_type] || product.product_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {priceModelLabels[product.price_model] || product.price_model}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {hasTiers ? (
                        <div className="text-sm space-y-0.5">
                          {productTiers.map((tier) => (
                            <div key={tier.id} className="whitespace-nowrap">
                              <span className="text-muted-foreground mr-2">{tier.tier_name}:</span>
                              <span className="font-medium">{formatPrice(tier.price)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="font-medium">{formatPrice(product.base_price)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {readOnly ? (
                        <Badge variant={product.active ? "default" : "secondary"}>
                          {product.active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      ) : (
                        <Switch
                          checked={product.active}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: product.id, active: checked })
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsDocumentsOpen(true);
                          }}
                          title="Se dokumenter"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsCoverageOpen(true);
                            }}
                            title="Dekningstabell"
                          >
                            <TableProperties className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!readOnly && (
        <InsuranceProductForm
          product={selectedProduct}
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
        />
      )}

      {selectedProduct && (
        <>
          <InsuranceProductDocuments
            product={selectedProduct}
            open={isDocumentsOpen}
            onOpenChange={setIsDocumentsOpen}
            readOnly={readOnly}
          />
          {!readOnly && (
            <InsuranceCoverageTable
              product={selectedProduct}
              open={isCoverageOpen}
              onOpenChange={setIsCoverageOpen}
            />
          )}
        </>
      )}
    </div>
  );
}
