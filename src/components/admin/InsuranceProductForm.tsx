import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const productSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  description: z.string().optional(),
  product_type: z.enum(["salong", "yrkesskade", "cyber", "reise", "fritidsulykke", "helse"]),
  price_model: z.enum(["fast", "per_arsverk", "per_person"]),
  base_price: z.coerce.number().min(0, "Pris må være positiv"),
  requires_employee_selection: z.boolean(),
  active: z.boolean(),
  sort_order: z.coerce.number().int(),
  icon_name: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

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
}

interface InsuranceProductFormProps {
  product: InsuranceProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const productTypeOptions = [
  { value: "salong", label: "Salongforsikring" },
  { value: "yrkesskade", label: "Yrkesskade" },
  { value: "cyber", label: "Cyberforsikring" },
  { value: "reise", label: "Reiseforsikring" },
  { value: "fritidsulykke", label: "Fritidsulykke" },
  { value: "helse", label: "Helseforsikring" },
];

const priceModelOptions = [
  { value: "fast", label: "Fast pris" },
  { value: "per_arsverk", label: "Per årsverk" },
  { value: "per_person", label: "Per person" },
];

const iconOptions = [
  { value: "Heart", label: "Hjerte (Helse)" },
  { value: "Building2", label: "Bygning (Salong)" },
  { value: "Shield", label: "Skjold (Yrkesskade)" },
  { value: "Activity", label: "Aktivitet (Fritid)" },
  { value: "Plane", label: "Fly (Reise)" },
  { value: "ShieldCheck", label: "Sjekket skjold (Cyber)" },
];

export function InsuranceProductForm({ product, open, onOpenChange }: InsuranceProductFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!product;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      product_type: "salong",
      price_model: "fast",
      base_price: 0,
      requires_employee_selection: false,
      active: true,
      sort_order: 0,
      icon_name: "",
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description || "",
        product_type: product.product_type as any,
        price_model: product.price_model as any,
        base_price: product.base_price,
        requires_employee_selection: product.requires_employee_selection,
        active: product.active,
        sort_order: product.sort_order,
        icon_name: product.icon_name || "",
      });
    } else {
      form.reset({
        name: "",
        description: "",
        product_type: "salong",
        price_model: "fast",
        base_price: 0,
        requires_employee_selection: false,
        active: true,
        sort_order: 0,
        icon_name: "",
      });
    }
  }, [product, form]);

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        product_type: data.product_type as any,
        price_model: data.price_model as any,
        base_price: data.base_price,
        requires_employee_selection: data.requires_employee_selection,
        active: data.active,
        sort_order: data.sort_order,
        icon_name: data.icon_name || null,
      };

      if (isEditing && product) {
        const { error } = await supabase
          .from("insurance_products")
          .update(payload)
          .eq("id", product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("insurance_products")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-products"] });
      toast.success(isEditing ? "Produkt oppdatert" : "Produkt opprettet");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error saving product:", error);
      toast.error("Kunne ikke lagre produkt");
    },
  });

  const onSubmit = (data: ProductFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Rediger produkt" : "Nytt forsikringsprodukt"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produktnavn</FormLabel>
                  <FormControl>
                    <Input placeholder="F.eks. Salongforsikring Nivå 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beskrivelse</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Kort beskrivelse av produktet..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="product_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produkttype</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Velg type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {productTypeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prismodell</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Velg prismodell" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priceModelOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="base_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Basispris (NOK)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={1} {...field} />
                    </FormControl>
                    <FormDescription>
                      For nivåbaserte produkter, sett til 0
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sorteringsrekkefølge</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="icon_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ikon</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Velg ikon" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {iconOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="requires_employee_selection"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Krever ansattvalg
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Aktiv</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Lagrer..." : isEditing ? "Oppdater" : "Opprett"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
