import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, Trash2, FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface InsuranceProduct {
  id: string;
  name: string;
  product_type?: string;
}

interface ProductTier {
  id: string;
  tier_name: string;
  sort_order: number;
}

interface ProductDocument {
  id: string;
  product_id: string;
  tier_id: string | null;
  document_type: string;
  title: string;
  file_url: string;
  version: string | null;
  created_at: string;
}

interface InsuranceProductDocumentsProps {
  product: InsuranceProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
}

const documentTypeOptions = [
  { value: "vilkar", label: "Vilkår" },
  { value: "produktark", label: "Produktark" },
  { value: "forsikringsbevis", label: "Forsikringsbevis" },
  { value: "reisekort", label: "Reisekort" },
  { value: "faq", label: "FAQ" },
  { value: "annet", label: "Annet" },
];

export function InsuranceProductDocuments({ product, open, onOpenChange, readOnly = false }: InsuranceProductDocumentsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState("vilkar");
  const [uploadVersion, setUploadVersion] = useState("");
  const [uploadTierId, setUploadTierId] = useState<string>("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  // Fetch tiers for this product
  const { data: tiers } = useQuery({
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

  const { data: documents, isLoading } = useQuery({
    queryKey: ["insurance-product-documents", product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_product_documents")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as ProductDocument[];
    },
    enabled: open,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !uploadTitle) {
        throw new Error("Mangler fil eller tittel");
      }

      // Upload file to storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${product.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("insurance-documents")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("insurance-documents")
        .getPublicUrl(fileName);

      // Create document record with optional tier_id
      const { error: insertError } = await supabase
        .from("insurance_product_documents")
        .insert({
          product_id: product.id,
          tier_id: uploadTierId === "all" ? null : uploadTierId,
          document_type: uploadType,
          title: uploadTitle,
          file_url: urlData.publicUrl,
          version: uploadVersion || null,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-product-documents", product.id] });
      toast.success("Dokument lastet opp");
      resetForm();
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Kunne ikke laste opp dokument");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: ProductDocument) => {
      // Extract file path from URL
      const urlParts = doc.file_url.split("/insurance-documents/");
      if (urlParts[1]) {
        await supabase.storage
          .from("insurance-documents")
          .remove([urlParts[1]]);
      }

      const { error } = await supabase
        .from("insurance_product_documents")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-product-documents", product.id] });
      toast.success("Dokument slettet");
    },
    onError: () => {
      toast.error("Kunne ikke slette dokument");
    },
  });

  const resetForm = () => {
    setUploadTitle("");
    setUploadType("vilkar");
    setUploadVersion("");
    setUploadTierId("all");
    setSelectedFile(null);
    setIsUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = () => {
    uploadMutation.mutate();
  };

  const getTypeLabel = (type: string) => {
    return documentTypeOptions.find((opt) => opt.value === type)?.label || type;
  };

  const getTierName = (tierId: string | null) => {
    if (!tierId) return null;
    return tiers?.find((t) => t.id === tierId)?.tier_name || null;
  };

  // Group documents by tier
  const hasTiers = tiers && tiers.length > 0;
  const generalDocuments = documents?.filter((d) => !d.tier_id) || [];
  const tierDocuments = hasTiers
    ? tiers.map((tier) => ({
        tier,
        documents: documents?.filter((d) => d.tier_id === tier.id) || [],
      }))
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Dokumenter for {product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload section - only show if not readOnly */}
          {!readOnly && (
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Last opp nytt dokument
              </h4>

              {!isUploading ? (
                <Button variant="outline" onClick={() => setIsUploading(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Last opp dokument
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tittel</Label>
                      <Input
                        placeholder="Dokumenttittel"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={uploadType} onValueChange={setUploadType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border shadow-lg z-50">
                          {documentTypeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Fil</Label>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Versjon (valgfritt)</Label>
                      <Input
                        placeholder="F.eks. 2024-v1"
                        value={uploadVersion}
                        onChange={(e) => setUploadVersion(e.target.value)}
                      />
                    </div>
                    {hasTiers && (
                      <div className="space-y-2">
                        <Label>Gjelder for nivå</Label>
                        <Select value={uploadTierId} onValueChange={setUploadTierId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Velg nivå" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border shadow-lg z-50">
                            <SelectItem value="all">Alle nivåer (generelt)</SelectItem>
                            {tiers.map((tier) => (
                              <SelectItem key={tier.id} value={tier.id}>
                                {tier.tier_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpload}
                      disabled={!selectedFile || !uploadTitle || uploadMutation.isPending}
                    >
                      {uploadMutation.isPending ? "Laster opp..." : "Last opp"}
                    </Button>
                    <Button variant="outline" onClick={resetForm}>
                      Avbryt
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Documents list */}
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Laster dokumenter...
              </div>
            ) : documents && documents.length > 0 ? (
              <>
                {/* General documents (no tier) */}
                {generalDocuments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Generelle dokumenter
                      <Badge variant="secondary" className="text-xs">
                        Alle nivåer
                      </Badge>
                    </h4>
                    <DocumentTable
                      documents={generalDocuments}
                      getTypeLabel={getTypeLabel}
                      onDelete={(doc) => deleteMutation.mutate(doc)}
                      isDeleting={deleteMutation.isPending}
                      readOnly={readOnly}
                    />
                  </div>
                )}

                {/* Tier-specific documents */}
                {tierDocuments.map(({ tier, documents: tierDocs }) => (
                  tierDocs.length > 0 && (
                    <div key={tier.id}>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Dokumenter for {tier.tier_name}
                        <Badge variant="outline" className="text-xs">
                          Nivåspesifikk
                        </Badge>
                      </h4>
                      <DocumentTable
                        documents={tierDocs}
                        getTypeLabel={getTypeLabel}
                        onDelete={(doc) => deleteMutation.mutate(doc)}
                        isDeleting={deleteMutation.isPending}
                        readOnly={readOnly}
                      />
                    </div>
                  )
                ))}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                Ingen dokumenter lastet opp ennå
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Extracted table component for reuse
function DocumentTable({
  documents,
  getTypeLabel,
  onDelete,
  isDeleting,
  readOnly = false,
}: {
  documents: ProductDocument[];
  getTypeLabel: (type: string) => string;
  onDelete: (doc: ProductDocument) => void;
  isDeleting: boolean;
  readOnly?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tittel</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Versjon</TableHead>
          <TableHead>Lastet opp</TableHead>
          <TableHead className="text-right">Handlinger</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell className="font-medium">{doc.title}</TableCell>
            <TableCell>{getTypeLabel(doc.document_type)}</TableCell>
            <TableCell>{doc.version || "-"}</TableCell>
            <TableCell>
              {format(new Date(doc.created_at), "d. MMM yyyy", { locale: nb })}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(doc)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}