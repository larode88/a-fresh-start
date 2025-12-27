import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Store, MapPin, Pencil, Trash2, User, UserPlus, Users, Eye, X, ImageIcon, Search, Building2, Calendar, UsersRound, Loader2, Link2, Download, RefreshCw, Hash, MoreHorizontal } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageUpload } from "@/components/ImageUpload";
import { lookupOrgNumber, type BrregResult } from "@/lib/brreg";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { HubSpotSalonSearch } from "./HubSpotSalonSearch";
import { HubSpotSalonImport } from "./HubSpotSalonImport";

const MEDLEMSSTATUS_OPTIONS = [
  { value: "Medlem", label: "Medlem", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "Pause", label: "Pause", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "Oppsagt", label: "Oppsagt", color: "bg-red-100 text-red-800 border-red-200" },
  { value: "Innkasso", label: "Innkasso", color: "bg-red-100 text-red-800 border-red-200" },
  { value: "Utmeldt", label: "Utmeldt", color: "bg-gray-100 text-gray-800 border-gray-200" },
  { value: "Konkurs", label: "Konkurs", color: "bg-gray-100 text-gray-800 border-gray-200" },
];

interface HubSpotCompanyData {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    city?: string;
    phone?: string;
    industry?: string;
    address?: string;
    zip?: string;
    orgnr?: string;
    lifecyclestage?: string;
    type?: string;
    hs_object_id?: string;
    medlemsavgift?: string;
    medlmestype?: string;
    type_medlemskap?: string;
    bankkontonummer?: string;
    kundenummer?: string;
    hubspot_owner_id?: string;
  };
  owner?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export const SalonsTab = () => {
  const [salons, setSalons] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [chains, setChains] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignOwnerDialogOpen, setAssignOwnerDialogOpen] = useState(false);
  const [assignTeamDialogOpen, setAssignTeamDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [hubspotDialogOpen, setHubspotDialogOpen] = useState(false);
  const [hubspotImportOpen, setHubspotImportOpen] = useState(false);
  const [syncingSalonId, setSyncingSalonId] = useState<string | null>(null);
  const [bulkSyncingHubSpot, setBulkSyncingHubSpot] = useState(false);
  const [bulkSyncingBrreg, setBulkSyncingBrreg] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("alle");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [districtFilter, setDistrictFilter] = useState<string>("alle");
  const [importByStatusOpen, setImportByStatusOpen] = useState(false);
  const [selectedImportStatus, setSelectedImportStatus] = useState<string>("");
  const [importingByStatus, setImportingByStatus] = useState(false);
  const [hubspotCompaniesByStatus, setHubspotCompaniesByStatus] = useState<HubSpotCompanyData[]>([]);
  const [loadingStatusCompanies, setLoadingStatusCompanies] = useState(false);
  const [salonToView, setSalonToView] = useState<any>(null);
  const [salonToEdit, setSalonToEdit] = useState<any>(null);
  const [salonToDelete, setSalonToDelete] = useState<any>(null);
  const [salonToAssign, setSalonToAssign] = useState<any>(null);
  const [salonForHubspot, setSalonForHubspot] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedTeamRole, setSelectedTeamRole] = useState<"daglig_leder" | "avdelingsleder" | "styreleder" | "stylist" | "apprentice">("stylist");
  const [submitting, setSubmitting] = useState(false);
  
  // HubSpot data for edit dialog
  const [editHubSpotData, setEditHubSpotData] = useState<HubSpotCompanyData | null>(null);
  const [loadingHubSpotData, setLoadingHubSpotData] = useState(false);
  
  // HubSpot property options for dropdowns
  const [hubSpotPropertyOptions, setHubSpotPropertyOptions] = useState<Record<string, Array<{label: string, value: string}>>>({});
  
  // Logo states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);

  // Brreg lookup states
  const [lookupLoading, setLookupLoading] = useState(false);
  const [brregResult, setBrregResult] = useState<BrregResult | null>(null);
  const [editBrregResult, setEditBrregResult] = useState<BrregResult | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    postal_code: "",
    city: "",
    org_number: "",
    district_id: "",
    legal_name: "",
    founded_date: "",
    employee_count: null as number | null,
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    address: "",
    postal_code: "",
    city: "",
    org_number: "",
    district_id: "",
    chain_id: "",
    logo_url: "",
    legal_name: "",
    founded_date: "",
    employee_count: null as number | null,
    // HubSpot-specific fields
    phone: "",
    domain: "",
    lifecyclestage: "",
    type: "",
    industry: "",
    medlemsavgift: "",
    medlemsstatus: "",
    type_medlemskap: "",
    bankkontonummer: "",
    kundenummer: "",
  });
  const [syncingToHubSpot, setSyncingToHubSpot] = useState(false);
  const [bulkSyncingToHubSpot, setBulkSyncingToHubSpot] = useState(false);

  useEffect(() => {
    fetchData();
    fetchHubSpotPropertyOptions();
  }, []);

  const fetchHubSpotPropertyOptions = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("hubspot-api", {
        body: {
          action: "get_company_properties",
          propertyNames: ["lifecyclestage", "type_medlemskap", "medlmestype", "type"],
        },
      });

      if (error) {
        console.error("Could not fetch HubSpot property options:", error);
        return;
      }

      if (data?.properties) {
        // Map medlmestype to medlemsstatus for our form
        const options = { ...data.properties };
        if (options.medlmestype) {
          options.medlemsstatus = options.medlmestype;
        }
        setHubSpotPropertyOptions(options);
        console.log("Loaded HubSpot property options:", Object.keys(options));
      }
    } catch (err) {
      console.error("Error fetching HubSpot property options:", err);
    }
  };

  const fetchData = async () => {
    try {
      const [salonsRes, districtsRes, chainsRes, usersRes] = await Promise.all([
        supabase
          .from("salons")
          .select("*, districts(name), chains(name)")
          .order("name"),
        supabase.from("districts").select("*").order("name"),
        supabase.from("chains").select("*").order("name"),
        supabase.from("users").select("id, name, email, role, salon_id").order("name"),
      ]);

      if (salonsRes.error) throw salonsRes.error;
      if (districtsRes.error) throw districtsRes.error;
      if (chainsRes.error) throw chainsRes.error;
      if (usersRes.error) throw usersRes.error;

      const users = usersRes.data || [];
      setAllUsers(users);

      // Map users to salons
      const salonsWithTeam = (salonsRes.data || []).map(salon => {
        // Get ALL owners (support for multiple co-owners)
        const owners = users.filter(u => u.salon_id === salon.id && u.role === "salon_owner");
        const dagligLedere = users.filter(u => u.salon_id === salon.id && u.role === "daglig_leder");
        const avdelingsledere = users.filter(u => u.salon_id === salon.id && u.role === "avdelingsleder");
        const styreledere = users.filter(u => u.salon_id === salon.id && u.role === "styreleder");
        const stylists = users.filter(u => u.salon_id === salon.id && (u.role === "stylist" || u.role === "seniorfrisor"));
        const apprentices = users.filter(u => u.salon_id === salon.id && u.role === "apprentice");
        return { ...salon, owners, dagligLedere, avdelingsledere, styreledere, stylists, apprentices };
      });

      setSalons(salonsWithTeam);
      setDistricts(districtsRes.data || []);
      setChains(chainsRes.data || []);
      
      // Update salonToView if detail dialog is open
      if (salonToView) {
        const updatedSalon = salonsWithTeam.find(s => s.id === salonToView.id);
        if (updatedSalon) {
          setSalonToView(updatedSalon);
        }
      }
    } catch (error: any) {
      toast.error("Kunne ikke laste data");
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async (salonId: string, file: File): Promise<string | null> => {
    const fileExt = "jpg";
    const filePath = `${salonId}/logo.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("salon-logos")
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("salon-logos")
      .getPublicUrl(filePath);

    return `${urlData.publicUrl}?t=${Date.now()}`;
  };

  const handleLookupOrgNumber = async (isEdit: boolean = false) => {
    const orgNumber = isEdit ? editFormData.org_number : formData.org_number;
    
    if (!orgNumber || orgNumber.replace(/\s/g, '').length !== 9) {
      toast.error("Org.nummer må være 9 siffer");
      return;
    }

    setLookupLoading(true);
    try {
      const result = await lookupOrgNumber(orgNumber);
      
      // Parse postnummer and poststed correctly
      let postnummer = result.adresse?.postnummer || '';
      let poststed = result.adresse?.poststed || '';
      
      // Handle combined format (e.g., "4625 FLEKKERØY" in either field)
      if (!postnummer && poststed.match(/^\d{4}\s/)) {
        const match = poststed.match(/^(\d{4})\s+(.+)$/);
        if (match) {
          postnummer = match[1];
          poststed = match[2];
        }
      } else if (postnummer.match(/^\d{4}\s/)) {
        const match = postnummer.match(/^(\d{4})\s+(.+)$/);
        if (match) {
          postnummer = match[1];
          poststed = poststed || match[2];
        }
      }
      
      if (isEdit) {
        setEditBrregResult(result);
        setEditFormData(prev => ({
          ...prev,
          name: prev.name || result.juridiskNavn,
          legal_name: result.juridiskNavn,
          address: result.adresse?.gate || prev.address,
          postal_code: postnummer || prev.postal_code,
          city: poststed || prev.city,
          founded_date: result.stiftelsesdato || "",
          employee_count: result.antallAnsatte ?? null,
        }));
      } else {
        setBrregResult(result);
        setFormData(prev => ({
          ...prev,
          name: prev.name || result.juridiskNavn,
          legal_name: result.juridiskNavn,
          address: result.adresse?.gate || prev.address,
          postal_code: postnummer || prev.postal_code,
          city: poststed || prev.city,
          founded_date: result.stiftelsesdato || "",
          employee_count: result.antallAnsatte ?? null,
        }));
      }
      
      toast.success("Selskapsinfo hentet fra Brønnøysundregistrene");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke hente selskapsinfo");
      if (isEdit) {
        setEditBrregResult(null);
      } else {
        setBrregResult(null);
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCreateSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: salonData, error } = await supabase.from("salons").insert({
        name: formData.name,
        address: formData.address,
        postal_code: formData.postal_code,
        city: formData.city,
        org_number: formData.org_number,
        district_id: formData.district_id || null,
        legal_name: formData.legal_name || null,
        founded_date: formData.founded_date || null,
        employee_count: formData.employee_count,
      }).select().single();

      if (error) throw error;

      // Upload logo if provided
      if (logoFile && salonData) {
        const logoUrl = await uploadLogo(salonData.id, logoFile);
        if (logoUrl) {
          await supabase.from("salons").update({ logo_url: logoUrl }).eq("id", salonData.id);
        }
      }

      toast.success("Salong opprettet!");
      setFormData({
        name: "",
        address: "",
        postal_code: "",
        city: "",
        org_number: "",
        district_id: "",
        legal_name: "",
        founded_date: "",
        employee_count: null,
      });
      setLogoFile(null);
      setLogoPreview(null);
      setBrregResult(null);
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke opprette salong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonToEdit) return;
    setSubmitting(true);

    try {
      let logoUrl = editFormData.logo_url;

      // Upload new logo if provided
      if (editLogoFile) {
        logoUrl = await uploadLogo(salonToEdit.id, editLogoFile) || logoUrl;
      }

      // Save ALL fields locally (Hår1 is master)
      // Build update object dynamically to handle type_medlemskap enum
      const updateData: Record<string, any> = {
        name: editFormData.name,
        address: editFormData.address,
        postal_code: editFormData.postal_code,
        city: editFormData.city,
        org_number: editFormData.org_number,
        district_id: editFormData.district_id || null,
        chain_id: editFormData.chain_id || null,
        logo_url: logoUrl || null,
        legal_name: editFormData.legal_name || null,
        founded_date: editFormData.founded_date || null,
        employee_count: editFormData.employee_count,
        // Membership fields (Hår1 is master)
        lifecyclestage: editFormData.lifecyclestage || null,
        medlemsavgift: editFormData.medlemsavgift ? parseFloat(editFormData.medlemsavgift) : null,
        medlemsstatus: editFormData.medlemsstatus || null,
        bankkontonummer: editFormData.bankkontonummer || null,
        medlemsnummer: editFormData.kundenummer || null, // kundenummer = medlemsnummer
      };
      
      // Map type_medlemskap only if it matches enum values
      const validTypeMedlemskap = ['salong', 'skole', 'stol', 'hjemmesalong', 'barber'];
      if (editFormData.type_medlemskap && validTypeMedlemskap.includes(editFormData.type_medlemskap.toLowerCase())) {
        updateData.type_medlemskap = editFormData.type_medlemskap.toLowerCase();
      }

      const { error } = await supabase
        .from("salons")
        .update(updateData)
        .eq("id", salonToEdit.id);

      if (error) throw error;

      // Auto-sync to HubSpot if connected (Portal is master)
      if (salonToEdit.hs_object_id) {
        setSyncingToHubSpot(true);
        try {
          const hubspotProperties = buildHubSpotPropertiesFromSalon({
            ...editFormData,
            org_number: editFormData.org_number,
            medlemsnummer: editFormData.kundenummer,
            // Date fields from salonToEdit if not in form
            start_medlemskap_dato: salonToEdit.start_medlemskap_dato,
            oppsigelsesdato_for_medlemskap: salonToEdit.oppsigelsesdato_for_medlemskap,
            avsluttet_medlemskap_dato: salonToEdit.avsluttet_medlemskap_dato,
            registreringsdato: salonToEdit.registreringsdato,
            utlpsdato_for_medlemskap: salonToEdit.utlpsdato_for_medlemskap,
            // Financial fields
            ar_reg_omsetning: salonToEdit.ar_reg_omsetning,
            reg_omsetning: salonToEdit.reg_omsetning,
            reg_resultat: salonToEdit.reg_resultat,
            // HubSpot owner
            hubspot_owner_id: salonToEdit.hubspot_owner_id,
          });

          const { error: hsError } = await supabase.functions.invoke("hubspot-api", {
            body: {
              action: "update_company",
              companyId: salonToEdit.hs_object_id,
              properties: hubspotProperties,
            },
          });

          if (hsError) {
            console.error("HubSpot sync error:", hsError);
            toast.warning("Lagret lokalt, men HubSpot-synk feilet");
          } else {
            // Update hubspot_synced_at
            await supabase
              .from("salons")
              .update({ hubspot_synced_at: new Date().toISOString() })
              .eq("id", salonToEdit.id);
            toast.success("Salong oppdatert og synkronisert til HubSpot!");
          }
        } catch (hsErr) {
          console.error("HubSpot sync error:", hsErr);
          toast.warning("Lagret lokalt, men HubSpot-synk feilet");
        } finally {
          setSyncingToHubSpot(false);
        }
      } else {
        toast.success("Salong oppdatert!");
      }

      setEditDialogOpen(false);
      setSalonToEdit(null);
      setEditLogoFile(null);
      setEditLogoPreview(null);
      setEditBrregResult(null);
      setEditHubSpotData(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke oppdatere salong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSalon = async () => {
    if (!salonToDelete) return;

    try {
      const { error } = await supabase
        .from("salons")
        .delete()
        .eq("id", salonToDelete.id);

      if (error) throw error;

      toast.success("Salong slettet");
      setDeleteDialogOpen(false);
      setSalonToDelete(null);
      fetchData();
    } catch (error: any) {
      toast.error("Kunne ikke slette salong. Den kan ha tilknyttede brukere.");
      console.error("Delete error:", error);
    }
  };

  const handleAssignOwner = async () => {
    if (!salonToAssign || !selectedUserId) return;
    setSubmitting(true);

    try {
      // Check if user is already an owner of this salon
      const existingOwner = salonToAssign.owners?.find((o: any) => o.id === selectedUserId);
      if (existingOwner) {
        toast.error("Denne brukeren er allerede salongeier for denne salongen");
        setSubmitting(false);
        return;
      }

      // Update the selected user's salon_id and role (adds as co-owner)
      const { error: updateError } = await supabase
        .from("users")
        .update({ salon_id: salonToAssign.id, role: "salon_owner" })
        .eq("id", selectedUserId);

      if (updateError) throw updateError;

      // Update user role
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: "salon_owner" })
        .eq("user_id", selectedUserId);

      if (roleError) throw roleError;

      toast.success("Salongeier lagt til!");
      setAssignOwnerDialogOpen(false);
      setSalonToAssign(null);
      setSelectedUserId("");
      fetchData();
    } catch (error: any) {
      toast.error("Kunne ikke tildele salongeier");
      console.error("Assign error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignTeamMember = async () => {
    if (!salonToAssign || !selectedUserId) return;
    setSubmitting(true);

    try {
      // Update the selected user's salon_id and role
      const { error: updateError } = await supabase
        .from("users")
        .update({ salon_id: salonToAssign.id, role: selectedTeamRole })
        .eq("id", selectedUserId);

      if (updateError) throw updateError;

      // Update user role
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: selectedTeamRole })
        .eq("user_id", selectedUserId);

      if (roleError) throw roleError;

      toast.success(`${selectedTeamRole === "stylist" ? "Frisør" : "Lærling"} lagt til!`);
      setAssignTeamDialogOpen(false);
      setSalonToAssign(null);
      setSelectedUserId("");
      fetchData();
    } catch (error: any) {
      toast.error("Kunne ikke legge til teammedlem");
      console.error("Assign error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveTeamMember = async (userId: string, role: string) => {
    try {
      // Remove salon_id and set role to stylist (default)
      const { error: updateError } = await supabase
        .from("users")
        .update({ salon_id: null, role: "stylist" })
        .eq("id", userId);

      if (updateError) throw updateError;

      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: "stylist" })
        .eq("user_id", userId);

      if (roleError) throw roleError;

      toast.success("Teammedlem fjernet fra salongen");
      fetchData();
      
      // Update salonToView with new data
      if (salonToView) {
        const updatedSalon = salons.find(s => s.id === salonToView.id);
        if (updatedSalon) {
          setSalonToView(updatedSalon);
        }
      }
    } catch (error: any) {
      toast.error("Kunne ikke fjerne teammedlem");
      console.error("Remove error:", error);
    }
  };

  const openEditDialog = async (salon: any) => {
    setSalonToEdit(salon);
    setEditLogoPreview(salon.logo_url || null);
    setEditLogoFile(null);
    setEditBrregResult(null);
    setEditHubSpotData(null);
    
    // Initialize form with LOCAL data (Hår1 is now master)
    const initialFormData = {
      name: salon.name || "",
      address: salon.address || "",
      postal_code: salon.postal_code || "",
      city: salon.city || "",
      org_number: salon.org_number || "",
      district_id: salon.district_id || "",
      chain_id: salon.chain_id || "",
      logo_url: salon.logo_url || "",
      legal_name: salon.legal_name || "",
      founded_date: salon.founded_date || "",
      employee_count: salon.employee_count ?? null,
      phone: salon.phone || "",
      domain: salon.domain || "",
      lifecyclestage: salon.lifecyclestage || "",
      type: salon.type || "",
      industry: salon.industry || "",
      medlemsavgift: salon.medlemsavgift?.toString() || "",
      medlemsstatus: salon.medlemsstatus || "",
      type_medlemskap: salon.type_medlemskap || "",
      bankkontonummer: salon.bankkontonummer || "",
      kundenummer: salon.medlemsnummer || "", // medlemsnummer = kundenummer i HubSpot
    };
    
    setEditFormData(initialFormData);
    setEditDialogOpen(true);

    // If HubSpot connected, just note it for display purposes
    if (salon.hs_object_id) {
      setEditHubSpotData({ id: salon.hs_object_id, properties: {} });
    }
  };

  const openAssignOwnerDialog = (salon: any) => {
    setSalonToAssign(salon);
    setSelectedUserId("");
    setAssignOwnerDialogOpen(true);
  };

  const openAssignTeamDialog = (salon: any) => {
    setSalonToAssign(salon);
    setSelectedUserId("");
    setSelectedTeamRole("stylist");
    setAssignTeamDialogOpen(true);
  };

  const openDetailDialog = (salon: any) => {
    setSalonToView(salon);
    setDetailDialogOpen(true);
  };

  const handleLogoChange = (file: File | null, previewUrl: string | null) => {
    setLogoFile(file);
    setLogoPreview(previewUrl);
  };

  const handleEditLogoChange = (file: File | null, previewUrl: string | null) => {
    setEditLogoFile(file);
    setEditLogoPreview(previewUrl);
  };

  const formatFoundedDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), "d. MMMM yyyy", { locale: nb });
    } catch {
      return dateStr;
    }
  };

  // Helper function to build HubSpot properties from salon data (Portal is master)
  const buildHubSpotPropertiesFromSalon = (salon: any): Record<string, string> => {
    // Convert date to HubSpot format (Unix timestamp in milliseconds)
    const dateToHubSpot = (dateStr: string | null): string => {
      if (!dateStr) return "";
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "";
        // HubSpot expects midnight UTC for date-only fields
        date.setUTCHours(0, 0, 0, 0);
        return date.getTime().toString();
      } catch {
        return "";
      }
    };

    // Capitalize type_medlemskap for HubSpot (DB stores lowercase, HubSpot expects capitalized)
    const capitalizeTypeMedlemskap = (value: string | null | undefined): string => {
      if (!value) return "";
      const mapping: Record<string, string> = {
        'salong': 'Salong',
        'skole': 'Skole',
        'stol': 'Stol',
        'hjemmesalong': 'Hjemmesalong',
        'barber': 'Barber',
      };
      return mapping[value.toLowerCase()] || value;
    };

    const properties: Record<string, string> = {
      // Basic info
      name: salon.name || "",
      address: salon.address || "",
      city: salon.city || "",
      zip: salon.postal_code || "",
      phone: salon.phone || "",
      domain: salon.domain || "",
      orgnr: salon.org_number || "",
      
      // Membership fields
      lifecyclestage: salon.lifecyclestage || "",
      type: salon.type || "",
      industry: salon.industry || "",
      medlemsavgift: salon.medlemsavgift?.toString() || "",
      medlmestype: salon.medlemsstatus || "",
      type_medlemskap: capitalizeTypeMedlemskap(salon.type_medlemskap),
      bankkontonummer: salon.bankkontonummer || "",
      kundenummer: salon.medlemsnummer || "",
      
      // HubSpot owner
      hubspot_owner_id: salon.hubspot_owner_id || "",
      
      // Date fields (convert to Unix timestamp)
      start_medlemskap_dato: dateToHubSpot(salon.start_medlemskap_dato),
      oppsigelsesdato_for_medlemskap: dateToHubSpot(salon.oppsigelsesdato_for_medlemskap),
      avsluttet_medlemskap_dato: dateToHubSpot(salon.avsluttet_medlemskap_dato),
      registreringsdato: dateToHubSpot(salon.registreringsdato),
      utlpsdato_for_medlemskap: dateToHubSpot(salon.utlpsdato_for_medlemskap),
      
      // Financial fields from BRREG
      ar_reg_omsetning: salon.ar_reg_omsetning?.toString() || "",
      reg_omsetning: salon.reg_omsetning?.toString() || "",
      reg_resultat: salon.reg_resultat?.toString() || "",
    };

    // Remove empty values
    Object.keys(properties).forEach(key => {
      if (!properties[key]) delete properties[key];
    });

    return properties;
  };

  // Helper function to parse HubSpot properties into salon update object (for import from HubSpot)
  const parseHubSpotToSalonUpdate = (props: any, existingSalon: any) => {
    // Parse postal_code and city separately
    let postalCode = props.zip || null;
    let cityName = props.city || null;
    
    // If city contains combined format like "4625 FLEKKERØY", parse it
    if (cityName && /^\d{4}\s/.test(cityName)) {
      const match = cityName.match(/^(\d{4})\s+(.+)$/);
      if (match) {
        postalCode = match[1];
        cityName = match[2];
      }
    }

    // Parse date fields (HubSpot returns dates as strings or timestamps)
    const parseDate = (dateValue: string | number | null): string | null => {
      if (!dateValue) return null;
      try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      } catch {
        return null;
      }
    };

    // Parse numeric fields
    const parseNumber = (value: string | number | null): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const num = typeof value === 'number' ? value : parseFloat(value);
      return isNaN(num) ? null : num;
    };

    return {
      // Basic info
      name: props.name || existingSalon.name,
      address: props.address || existingSalon.address,
      postal_code: postalCode || existingSalon.postal_code,
      city: cityName || existingSalon.city,
      org_number: props.orgnr || existingSalon.org_number,
      phone: props.phone || existingSalon.phone,
      domain: props.domain || existingSalon.domain,
      
      // Membership fields
      medlemsstatus: props.medlmestype || existingSalon.medlemsstatus,
      lifecyclestage: props.lifecyclestage || existingSalon.lifecyclestage,
      type_medlemskap: props.type_medlemskap?.toLowerCase() || existingSalon.type_medlemskap,
      medlemsnummer: props.kundenummer || existingSalon.medlemsnummer,
      medlemsavgift: parseNumber(props.medlemsavgift) ?? existingSalon.medlemsavgift,
      bankkontonummer: props.bankkontonummer || existingSalon.bankkontonummer,
      
      // HubSpot owner mapping
      hubspot_owner_id: props.hubspot_owner_id || existingSalon.hubspot_owner_id,
      
      // Date fields - using 1:1 HubSpot field names
      start_medlemskap_dato: parseDate(props.start_medlemskap_dato) || existingSalon.start_medlemskap_dato,
      oppsigelsesdato_for_medlemskap: parseDate(props.oppsigelsesdato_for_medlemskap) || existingSalon.oppsigelsesdato_for_medlemskap,
      avsluttet_medlemskap_dato: parseDate(props.avsluttet_medlemskap_dato) || existingSalon.avsluttet_medlemskap_dato,
      registreringsdato: parseDate(props.registreringsdato) || existingSalon.registreringsdato,
      utlpsdato_for_medlemskap: parseDate(props.utlpsdato_for_medlemskap) || existingSalon.utlpsdato_for_medlemskap,
      
      // Financial fields from BRREG via HubSpot
      ar_reg_omsetning: parseNumber(props.ar_reg_omsetning) ?? existingSalon.ar_reg_omsetning,
      reg_omsetning: parseNumber(props.reg_omsetning) ?? existingSalon.reg_omsetning,
      reg_resultat: parseNumber(props.reg_resultat) ?? existingSalon.reg_resultat,
      
      // Sync timestamp
      hubspot_synced_at: new Date().toISOString(),
    };
  };

  const handleSyncFromHubSpot = async (salon: any) => {
    if (!salon.hs_object_id) return;
    
    setSyncingSalonId(salon.id);
    try {
      const { data, error } = await supabase.functions.invoke("hubspot-api", {
        body: { action: "get_company", companyId: salon.hs_object_id },
      });

      if (error) throw error;

      const props = data.properties || {};
      const updateData = parseHubSpotToSalonUpdate(props, salon);

      const { error: updateError } = await supabase
        .from("salons")
        .update(updateData)
        .eq("id", salon.id);

      if (updateError) throw updateError;

      toast.success("Salongdata oppdatert fra HubSpot!");
      fetchData();
    } catch (error: any) {
      console.error("HubSpot sync error:", error);
      toast.error("Kunne ikke synkronisere fra HubSpot");
    } finally {
      setSyncingSalonId(null);
    }
  };

  const handleBulkSyncHubSpot = async () => {
    const hubspotSalons = salons.filter(s => s.hs_object_id);
    if (hubspotSalons.length === 0) {
      toast.error("Ingen salonger er koblet til HubSpot");
      return;
    }

    setBulkSyncingHubSpot(true);
    let successCount = 0;
    let errorCount = 0;
    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES = 600;

    for (let i = 0; i < hubspotSalons.length; i += BATCH_SIZE) {
      const batch = hubspotSalons.slice(i, i + BATCH_SIZE);
      
      // Update progress toast with estimated time
      const batchesRemaining = Math.ceil((hubspotSalons.length - i) / BATCH_SIZE);
      const estimatedSecondsRemaining = Math.ceil(batchesRemaining * 0.6);
      toast.loading(
        `Synkroniserer... ${Math.min(i + BATCH_SIZE, hubspotSalons.length)}/${hubspotSalons.length} salonger (~${estimatedSecondsRemaining}s gjenstår)`,
        { id: "bulk-sync-progress" }
      );
      
      const results = await Promise.allSettled(
        batch.map(async (salon) => {
          const { data, error } = await supabase.functions.invoke("hubspot-api", {
            body: { action: "get_company", companyId: salon.hs_object_id },
          });

          if (error) throw error;

          const props = data.properties || {};
          const updateData = parseHubSpotToSalonUpdate(props, salon);

          const { error: updateError } = await supabase
            .from("salons")
            .update(updateData)
            .eq("id", salon.id);
          
          if (updateError) throw new Error(`DB update failed: ${updateError.message}`);
          
          return salon.name;
        })
      );

      results.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          successCount++;
        } else {
          console.error(`HubSpot sync error for ${batch[idx].name}:`, result.reason);
          errorCount++;
        }
      });

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < hubspotSalons.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    toast.dismiss("bulk-sync-progress");
    setBulkSyncingHubSpot(false);
    fetchData();
    toast.success(`Importert fra HubSpot: ${successCount} oppdatert, ${errorCount} feilet`);
  };

  // Sync all salons TO HubSpot (Portal is master)
  const handleBulkSyncToHubSpot = async () => {
    const hubspotSalons = salons.filter(s => s.hs_object_id);
    if (hubspotSalons.length === 0) {
      toast.error("Ingen salonger er koblet til HubSpot");
      return;
    }

    setBulkSyncingToHubSpot(true);
    let successCount = 0;
    let errorCount = 0;

    for (const salon of hubspotSalons) {
      try {
        const properties = buildHubSpotPropertiesFromSalon(salon);

        const { error } = await supabase.functions.invoke("hubspot-api", {
          body: {
            action: "update_company",
            companyId: salon.hs_object_id,
            properties,
          },
        });

        if (error) throw error;

        // Update hubspot_synced_at
        await supabase
          .from("salons")
          .update({ hubspot_synced_at: new Date().toISOString() })
          .eq("id", salon.id);

        successCount++;
      } catch (error) {
        console.error(`HubSpot sync error for ${salon.name}:`, error);
        errorCount++;
      }
    }

    setBulkSyncingToHubSpot(false);
    fetchData();
    toast.success(`Synkronisert til HubSpot: ${successCount} oppdatert, ${errorCount} feilet`);
  };

  const handleBulkSyncBrreg = async () => {
    const salonsWithOrg = salons.filter(s => s.org_number && s.org_number.length >= 9);
    if (salonsWithOrg.length === 0) {
      toast.error("Ingen salonger har org.nummer");
      return;
    }

    setBulkSyncingBrreg(true);
    let successCount = 0;
    let errorCount = 0;

    for (const salon of salonsWithOrg) {
      try {
        const result = await lookupOrgNumber(salon.org_number);
        if (result) {
          await supabase
            .from("salons")
            .update({
              name: result.juridiskNavn,
              legal_name: result.juridiskNavn,
              address: result.adresse?.gate || null,
              postal_code: result.adresse?.postnummer || null,
              city: result.adresse?.poststed || null,
              founded_date: result.stiftelsesdato || null,
              employee_count: result.antallAnsatte || null,
            })
            .eq("id", salon.id);
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`BRREG sync error for ${salon.name}:`, error);
        errorCount++;
      }
    }

    setBulkSyncingBrreg(false);
    fetchData();
    toast.success(`BRREG-sync fullført: ${successCount} oppdatert, ${errorCount} feilet`);
  };

  const handleSearchByStatus = async (status: string) => {
    if (!status) return;
    setLoadingStatusCompanies(true);
    setHubspotCompaniesByStatus([]);

    try {
      const { data, error } = await supabase.functions.invoke("hubspot-api", {
        body: { action: "search_companies_by_status", status, limit: 100 },
      });

      if (error) throw error;

      const companies = data.results || [];
      setHubspotCompaniesByStatus(companies);
      
      if (companies.length === 0) {
        toast.info(`Ingen selskaper funnet med status "${status}"`);
      }
    } catch (error: any) {
      console.error("Search by status error:", error);
      toast.error("Kunne ikke søke i HubSpot");
    } finally {
      setLoadingStatusCompanies(false);
    }
  };

  const handleImportByStatus = async () => {
    if (hubspotCompaniesByStatus.length === 0) return;
    
    setImportingByStatus(true);
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Hent owner-district mapping
    const { data: ownerMappings } = await supabase
      .from("hubspot_owner_district_mapping")
      .select("hubspot_owner_id, district_id");
    
    const ownerDistrictMap: Record<string, string> = {};
    ownerMappings?.forEach(m => {
      if (m.district_id) {
        ownerDistrictMap[m.hubspot_owner_id] = m.district_id;
      }
    });

    // Get existing hubspot company IDs
    const existingHubspotIds = salons
      .filter(s => s.hs_object_id)
      .map(s => s.hs_object_id);

    for (const company of hubspotCompaniesByStatus) {
      // Skip if already imported
      if (existingHubspotIds.includes(company.id)) {
        skippedCount++;
        continue;
      }

      try {
        const props = company.properties;
        const city = props.city ? (props.zip ? `${props.zip} ${props.city}` : props.city) : null;
        
        // Finn distrikt basert på HubSpot owner
        const districtId = props.hubspot_owner_id 
          ? ownerDistrictMap[props.hubspot_owner_id] || null
          : null;

        const { error } = await supabase.from("salons").insert({
          name: props.name || "Ukjent",
          address: props.address || null,
          city: city,
          org_number: props.orgnr || null,
          hs_object_id: company.id,
          medlemsstatus: props.medlmestype || null,
          district_id: districtId,
          hubspot_synced_at: new Date().toISOString(),
        });

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Import error for ${company.properties.name}:`, error);
        errorCount++;
      }
    }

    setImportingByStatus(false);
    setImportByStatusOpen(false);
    setHubspotCompaniesByStatus([]);
    setSelectedImportStatus("");
    fetchData();
    
    toast.success(`Import fullført: ${successCount} opprettet, ${skippedCount} allerede importert, ${errorCount} feilet`);
  };

  // Oppdater medlemsstatus og distrikt for eksisterende salonger
  const [updatingStatusAndDistrict, setUpdatingStatusAndDistrict] = useState(false);
  
  const handleUpdateStatusAndDistrict = async () => {
    setUpdatingStatusAndDistrict(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Hent owner-district mapping
      const { data: ownerMappings } = await supabase
        .from("hubspot_owner_district_mapping")
        .select("hubspot_owner_id, district_id");
      
      const ownerDistrictMap: Record<string, string> = {};
      ownerMappings?.forEach(m => {
        if (m.district_id) {
          ownerDistrictMap[m.hubspot_owner_id] = m.district_id;
        }
      });

      // Hent alle salonger med hs_object_id
      const salonsToUpdate = salons.filter(s => s.hs_object_id);
      const companyIds = salonsToUpdate.map(s => s.hs_object_id);
      
      if (companyIds.length === 0) {
        toast.info("Ingen salonger å oppdatere");
        setUpdatingStatusAndDistrict(false);
        return;
      }

      // Bruk batch API for å hente alle companies i få kall
      const { data, error: hubspotError } = await supabase.functions.invoke("hubspot-api", {
        body: { 
          action: "batch_get_companies", 
          companyIds 
        },
      });

      if (hubspotError || !data?.results) {
        console.error("Batch HubSpot error:", hubspotError);
        toast.error("Kunne ikke hente data fra HubSpot");
        setUpdatingStatusAndDistrict(false);
        return;
      }

      // Lag et map for rask oppslag
      const hubspotDataMap: Record<string, any> = {};
      data.results.forEach((company: any) => {
        hubspotDataMap[company.id] = company.properties;
      });

      // Oppdater hver salong
      for (const salon of salonsToUpdate) {
        try {
          const props = hubspotDataMap[salon.hs_object_id];
          
          if (!props) {
            errorCount++;
            continue;
          }

          const districtId = props.hubspot_owner_id 
            ? ownerDistrictMap[props.hubspot_owner_id] || null
            : null;

          // Oppdater kun hvis noe har endret seg
          const updates: Record<string, any> = {};
          if (props.medlmestype && props.medlmestype !== salon.medlemsstatus) {
            updates.medlemsstatus = props.medlmestype;
          }
          if (districtId && districtId !== salon.district_id) {
            updates.district_id = districtId;
          }

          if (Object.keys(updates).length > 0) {
            updates.hubspot_synced_at = new Date().toISOString();
            const { error: updateError } = await supabase
              .from("salons")
              .update(updates)
              .eq("id", salon.id);

            if (updateError) throw updateError;
          }
          
          successCount++;
        } catch (error) {
          console.error(`Update error for ${salon.name}:`, error);
          errorCount++;
        }
      }

      fetchData();
      toast.success(`Oppdatering fullført: ${successCount} salonger behandlet, ${errorCount} feilet`);
    } catch (error) {
      console.error("Update status and district error:", error);
      toast.error("Kunne ikke oppdatere salonger");
    } finally {
      setUpdatingStatusAndDistrict(false);
    }
  };

  const getMedlemsstatusStyle = (status: string | null) => {
    if (!status) return null;
    const option = MEDLEMSSTATUS_OPTIONS.find(o => o.value === status);
    return option?.color || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const filteredSalons = salons.filter(salon => {
    // Tekstsøk
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = salon.name?.toLowerCase().includes(query);
      const matchesOrg = salon.org_number?.includes(query);
      if (!matchesName && !matchesOrg) return false;
    }
    
    // Medlemsstatus
    if (statusFilter !== "alle" && salon.medlemsstatus !== statusFilter) return false;
    
    // Distrikt
    if (districtFilter === "ingen" && salon.district_id) return false;
    if (districtFilter !== "alle" && districtFilter !== "ingen" && salon.district_id !== districtFilter) return false;
    
    return true;
  });

  const hasActiveFilters = searchQuery || statusFilter !== "alle" || districtFilter !== "alle";

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("alle");
    setDistrictFilter("alle");
  };

  if (loading) {
    return <div className="text-center py-8">Laster salonger...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Salonger</h2>
            <p className="text-muted-foreground">
              Administrer registrerte salonger ({filteredSalons.length} av {salons.length})
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="w-4 h-4 mr-2" />
                  Handlinger
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Synkronisering (Portal → HubSpot)</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleBulkSyncToHubSpot} disabled={bulkSyncingToHubSpot}>
                  {bulkSyncingToHubSpot ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Synk alle TIL HubSpot
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Import (HubSpot → Portal)</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleBulkSyncHubSpot} disabled={bulkSyncingHubSpot}>
                  {bulkSyncingHubSpot ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Importer alle fra HubSpot
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHubspotImportOpen(true)}>
                  <Download className="w-4 h-4 mr-2" />
                  Importer enkelt fra HubSpot
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportByStatusOpen(true)}>
                  <UsersRound className="w-4 h-4 mr-2" />
                  Importer etter medlemsstatus
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleUpdateStatusAndDistrict} disabled={updatingStatusAndDistrict}>
                  {updatingStatusAndDistrict ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Oppdater status/distrikt fra HubSpot
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>BRREG</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleBulkSyncBrreg} disabled={bulkSyncingBrreg}>
                  {bulkSyncingBrreg ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Building2 className="w-4 h-4 mr-2" />}
                  Oppdater fra BRREG
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setLogoFile(null);
                setLogoPreview(null);
                setBrregResult(null);
                setFormData({
                  name: "",
                  address: "",
                  postal_code: "",
                  city: "",
                  org_number: "",
                  district_id: "",
                  legal_name: "",
                  founded_date: "",
                  employee_count: null,
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Ny salong
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrer ny salong</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSalon} className="space-y-4">
              {/* Logo Upload */}
              <div className="flex flex-col items-center space-y-2">
                <Label>Salonglogo</Label>
                <ImageUpload
                  value={logoPreview}
                  onChange={handleLogoChange}
                  size="lg"
                  shape="square"
                  placeholder={
                    <div className="flex flex-col items-center">
                      <ImageIcon className="h-6 w-6 mb-1" />
                      <span className="text-xs">Last opp logo</span>
                    </div>
                  }
                  disabled={submitting}
                />
              </div>

              {/* Org number with lookup */}
              <div className="space-y-2">
                <Label htmlFor="org_number">Org.nummer</Label>
                <div className="flex gap-2">
                  <Input
                    id="org_number"
                    placeholder="123456789"
                    value={formData.org_number}
                    onChange={(e) =>
                      setFormData({ ...formData, org_number: e.target.value })
                    }
                    disabled={submitting || lookupLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleLookupOrgNumber(false)}
                    disabled={submitting || lookupLoading || !formData.org_number}
                  >
                    {lookupLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Brreg result preview */}
              {brregResult && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                  <p className="text-sm font-medium text-primary">✓ Funnet: {brregResult.juridiskNavn}</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {brregResult.stiftelsesdato && (
                      <p>Stiftet: {formatFoundedDate(brregResult.stiftelsesdato)}</p>
                    )}
                    {brregResult.antallAnsatte !== undefined && (
                      <p>Ansatte: {brregResult.antallAnsatte}</p>
                    )}
                    {brregResult.adresse && (
                      <p>{brregResult.adresse.gate}, {brregResult.adresse.postnummer} {brregResult.adresse.poststed}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Salongnavn *</Label>
                <Input
                  id="name"
                  placeholder="Hår Studio AS"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  disabled={submitting}
                />
                {formData.legal_name && formData.name !== formData.legal_name && (
                  <p className="text-xs text-muted-foreground">Juridisk navn: {formData.legal_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  placeholder="Storgata 1"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">By</Label>
                <Input
                  id="city"
                  placeholder="Oslo"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">Distrikt</Label>
                <Select
                  value={formData.district_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, district_id: value })
                  }
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Velg distrikt" />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((district) => (
                      <SelectItem key={district.id} value={district.id}>
                        {district.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary"
                disabled={submitting}
              >
                {submitting ? "Oppretter..." : "Opprett salong"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
          </div>
        </div>
        
        {/* Filter section */}
        <div className="space-y-3">
          {/* Søkefelt */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Søk etter salong eller org.nummer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Medlemsstatus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle statuser</SelectItem>
                {MEDLEMSSTATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Distrikt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle distrikter</SelectItem>
                <SelectItem value="ingen">Uten distrikt</SelectItem>
                {districts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4 mr-1" /> Nullstill
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSalons.map((salon) => (
          <Card key={salon.id} className="p-6 shadow-card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {salon.logo_url ? (
                  <img src={salon.logo_url} alt={salon.name} className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-6 h-6 text-accent" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground mb-1 truncate">
                  {salon.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-1">
                  {salon.city || "Ingen by registrert"}
                </p>
                {salon.org_number && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Hash className="w-3 h-3" />
                    {salon.org_number}
                  </div>
                )}
                {salon.districts && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <MapPin className="w-3 h-3" />
                    {salon.districts.name}
                  </div>
                )}
                {salon.chains && (
                  <Badge variant="outline" className="text-xs mb-2">
                    <Building2 className="w-3 h-3 mr-1" />
                    {salon.chains.name}
                  </Badge>
                )}
                <div className="flex flex-wrap gap-1 mb-2">
                  {salon.medlemsstatus && (
                    <Badge className={`text-xs border ${getMedlemsstatusStyle(salon.medlemsstatus)}`}>
                      {salon.medlemsstatus}
                    </Badge>
                  )}
                  {salon.type_medlemskap && (
                    <Badge variant="secondary" className="text-xs">
                      {salon.type_medlemskap.charAt(0).toUpperCase() + salon.type_medlemskap.slice(1)}
                    </Badge>
                  )}
                </div>
                
                {/* HubSpot status */}
                {salon.hs_object_id ? (
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => {
                        setSalonForHubspot(salon);
                        setHubspotDialogOpen(true);
                      }}
                      className="flex items-center gap-1 text-xs text-green-600 hover:underline"
                    >
                      <img
                        src="https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png"
                        alt="HubSpot"
                        className="h-3 w-3"
                      />
                      <Link2 className="w-3 h-3" />
                      Koblet
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleSyncFromHubSpot(salon)}
                      disabled={syncingSalonId === salon.id}
                    >
                      {syncingSalonId === salon.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Oppdater
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSalonForHubspot(salon);
                      setHubspotDialogOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs text-muted-foreground mb-3 hover:text-foreground hover:underline"
                  >
                    <img
                      src="https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png"
                      alt="HubSpot"
                      className="h-3 w-3 opacity-50"
                    />
                    Koble til HubSpot
                  </button>
                )}
                
                {/* Team info */}
                <div className="space-y-2">
                  {salon.owners?.length > 0 ? (
                    <div className="space-y-1">
                      {salon.owners.length > 1 && (
                        <Badge variant="outline" className="text-xs mb-1 border-amber-500 text-amber-600">
                          {salon.owners.length} eiere
                        </Badge>
                      )}
                      {salon.owners.map((owner: any) => (
                        <div key={owner.id} className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{owner.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{owner.email}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveTeamMember(owner.id, "salon_owner")}
                            title="Fjern salongeier"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={() => openAssignOwnerDialog(salon)}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Legg til eier
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => openAssignOwnerDialog(salon)}
                    >
                      <UserPlus className="w-3 h-3 mr-1" />
                      Tildel salongeier
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => openDetailDialog(salon)}
                  >
                    <Users className="w-3 h-3 mr-1" />
                    <span>
                      {(salon.dagligLedere?.length || 0) + 
                       (salon.avdelingsledere?.length || 0) + 
                       (salon.styreledere?.length || 0) + 
                       (salon.stylists?.length || 0) + 
                       (salon.apprentices?.length || 0)} medlemmer
                    </span>
                    <Eye className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openAssignTeamDialog(salon)}
                  title="Legg til teammedlem"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEditDialog(salon)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => {
                    setSalonToDelete(salon);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {salons.length === 0 && (
        <Card className="p-12 text-center">
          <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ingen salonger ennå</h3>
          <p className="text-muted-foreground mb-4">
            Registrer din første salong for å komme i gang
          </p>
        </Card>
      )}

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setEditLogoFile(null);
          setEditLogoPreview(null);
          setEditBrregResult(null);
          setEditHubSpotData(null);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rediger salong</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSalon} className="space-y-4">
            {/* Logo Upload */}
            <div className="flex flex-col items-center space-y-2">
              <Label>Salonglogo</Label>
              <ImageUpload
                value={editLogoPreview}
                onChange={handleEditLogoChange}
                size="lg"
                shape="square"
                placeholder={
                  <div className="flex flex-col items-center">
                    <ImageIcon className="h-6 w-6 mb-1" />
                    <span className="text-xs">Last opp logo</span>
                  </div>
                }
                disabled={submitting}
              />
            </div>

            {/* Org number with lookup */}
            <div className="space-y-2">
              <Label htmlFor="editOrgNumber">Org.nummer</Label>
              <div className="flex gap-2">
                <Input
                  id="editOrgNumber"
                  value={editFormData.org_number}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, org_number: e.target.value })
                  }
                  disabled={submitting || lookupLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleLookupOrgNumber(true)}
                  disabled={submitting || lookupLoading || !editFormData.org_number}
                >
                  {lookupLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Brreg result preview */}
            {editBrregResult && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                <p className="text-sm font-medium text-primary">✓ Funnet: {editBrregResult.juridiskNavn}</p>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {editBrregResult.stiftelsesdato && (
                    <p>Stiftet: {formatFoundedDate(editBrregResult.stiftelsesdato)}</p>
                  )}
                  {editBrregResult.antallAnsatte !== undefined && (
                    <p>Ansatte: {editBrregResult.antallAnsatte}</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="editName">Salongnavn *</Label>
              <Input
                id="editName"
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                required
                disabled={submitting}
              />
              {editFormData.legal_name && editFormData.name !== editFormData.legal_name && (
                <p className="text-xs text-muted-foreground">Juridisk navn: {editFormData.legal_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="editAddress">Adresse</Label>
              <Input
                id="editAddress"
                value={editFormData.address}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, address: e.target.value })
                }
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editPostalCode">Postnummer</Label>
                <Input
                  id="editPostalCode"
                  value={editFormData.postal_code}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, postal_code: e.target.value })
                  }
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCity">By/Poststed</Label>
                <Input
                  id="editCity"
                  value={editFormData.city}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, city: e.target.value })
                  }
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editPhone">Telefon</Label>
                <Input
                  id="editPhone"
                  value={editFormData.phone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, phone: e.target.value })
                  }
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDomain">Hjemmeside</Label>
                <Input
                  id="editDomain"
                  value={editFormData.domain}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, domain: e.target.value })
                  }
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDistrict">Distrikt</Label>
              <Select
                value={editFormData.district_id}
                onValueChange={(value) =>
                  setEditFormData({ ...editFormData, district_id: value })
                }
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg distrikt" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((district) => (
                    <SelectItem key={district.id} value={district.id}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editChain">Kjede (valgfritt)</Label>
              <Select
                value={editFormData.chain_id}
                onValueChange={(value) =>
                  setEditFormData({ ...editFormData, chain_id: value === "none" ? "" : value })
                }
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg kjede" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen kjede</SelectItem>
                  {chains.map((chain) => (
                    <SelectItem key={chain.id} value={chain.id}>
                      {chain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* HubSpot-specific fields */}
            {salonToEdit?.hs_object_id && (
              <>
                <div className="flex items-center gap-2 pt-2 pb-1 border-t">
                  <img
                    src="https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png"
                    alt="HubSpot"
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium text-[#ff7a59]">HubSpot-felter</span>
                  {loadingHubSpotData && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editLifecyclestage">Livssyklus</Label>
                  {hubSpotPropertyOptions.lifecyclestage?.length ? (
                    <Select
                      value={editFormData.lifecyclestage || "__none__"}
                      onValueChange={(value) =>
                        setEditFormData({ ...editFormData, lifecyclestage: value === "__none__" ? "" : value })
                      }
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg livssyklus" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">– Ingen –</SelectItem>
                        {hubSpotPropertyOptions.lifecyclestage.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="editLifecyclestage"
                      value={editFormData.lifecyclestage}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, lifecyclestage: e.target.value })
                      }
                      disabled={submitting}
                      placeholder="f.eks. customer"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editMedlemsstatus">Medlemsstatus</Label>
                    {hubSpotPropertyOptions.medlemsstatus?.length ? (
                      <Select
                        value={editFormData.medlemsstatus?.toLowerCase() || "__none__"}
                        onValueChange={(value) =>
                          setEditFormData({ ...editFormData, medlemsstatus: value === "__none__" ? "" : value })
                        }
                        disabled={submitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Velg medlemsstatus" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">– Ingen –</SelectItem>
                          {hubSpotPropertyOptions.medlemsstatus.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value.toLowerCase()}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="editMedlemsstatus"
                        value={editFormData.medlemsstatus}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, medlemsstatus: e.target.value })
                        }
                        disabled={submitting}
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editTypeMedlemskap">Type Medlemskap</Label>
                    {hubSpotPropertyOptions.type_medlemskap?.length ? (
                      <Select
                        value={editFormData.type_medlemskap?.toLowerCase() || "__none__"}
                        onValueChange={(value) =>
                          setEditFormData({ ...editFormData, type_medlemskap: value === "__none__" ? "" : value })
                        }
                        disabled={submitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Velg type medlemskap" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">– Ingen –</SelectItem>
                          {hubSpotPropertyOptions.type_medlemskap.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value.toLowerCase()}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="editTypeMedlemskap"
                        value={editFormData.type_medlemskap}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, type_medlemskap: e.target.value })
                        }
                        disabled={submitting}
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editMedlemsavgift">Medlemsavgift</Label>
                    <Input
                      id="editMedlemsavgift"
                      value={editFormData.medlemsavgift}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, medlemsavgift: e.target.value })
                      }
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editKundenummer">Kundenummer</Label>
                    <Input
                      id="editKundenummer"
                      value={editFormData.kundenummer}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editBankkontonummer">Bankkontonummer</Label>
                  <Input
                    id="editBankkontonummer"
                    value={editFormData.bankkontonummer}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, bankkontonummer: e.target.value })
                    }
                    disabled={submitting}
                  />
                </div>

                {editHubSpotData?.properties?.hs_object_id && (
                  <p className="text-xs text-muted-foreground">
                    HubSpot ID: {editHubSpotData.properties.hs_object_id}
                  </p>
                )}
              </>
            )}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditDialogOpen(false)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={submitting || syncingToHubSpot}>
                {syncingToHubSpot ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Synkroniserer...
                  </>
                ) : submitting ? (
                  "Lagrer..."
                ) : salonToEdit?.hs_object_id ? (
                  "Lagre & Sync til HubSpot"
                ) : (
                  "Lagre"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign owner dialog */}
      <Dialog open={assignOwnerDialogOpen} onOpenChange={setAssignOwnerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Legg til salongeier</DialogTitle>
            <DialogDescription>
              Legg til en salongeier (co-owner) for {salonToAssign?.name}.
              {salonToAssign?.owners?.length > 0 && (
                <span className="block mt-1 text-amber-600">
                  Salongen har allerede {salonToAssign.owners.length} eier{salonToAssign.owners.length > 1 ? 'e' : ''}.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {/* Current owners */}
          {salonToAssign?.owners?.length > 0 && (
            <div className="space-y-2 py-2">
              <Label className="text-xs text-muted-foreground">Nåværende eiere:</Label>
              <div className="space-y-1">
                {salonToAssign.owners.map((owner: any) => (
                  <div key={owner.id} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                    <User className="w-3 h-3" />
                    <span>{owner.name}</span>
                    <span className="text-muted-foreground">({owner.email})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Velg bruker å legge til</Label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg en bruker" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers
                    .filter(user => !salonToAssign?.owners?.some((o: any) => o.id === user.id))
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                        {user.role === "salon_owner" && user.salon_id && user.salon_id !== salonToAssign?.id && (
                          <span className="text-muted-foreground ml-2">- Eier en annen salong</span>
                        )}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOwnerDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleAssignOwner} disabled={!selectedUserId || submitting}>
              {submitting ? "Legger til..." : "Legg til eier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign team member dialog */}
      <Dialog open={assignTeamDialogOpen} onOpenChange={setAssignTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Legg til teammedlem</DialogTitle>
            <DialogDescription>
              Legg til et teammedlem til {salonToAssign?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rolle</Label>
              <Select
                value={selectedTeamRole}
                onValueChange={(value) => setSelectedTeamRole(value as "daglig_leder" | "avdelingsleder" | "styreleder" | "stylist" | "apprentice")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daglig_leder">Dagligleder</SelectItem>
                  <SelectItem value="avdelingsleder">Avdelingsleder</SelectItem>
                  <SelectItem value="styreleder">Styreleder</SelectItem>
                  <SelectItem value="stylist">Frisør</SelectItem>
                  <SelectItem value="apprentice">Lærling</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Velg bruker</Label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg en bruker" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers
                    .filter(u => u.salon_id !== salonToAssign?.id)
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                        {user.salon_id && (
                          <span className="text-muted-foreground ml-2">- Har allerede en salong</span>
                        )}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTeamDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleAssignTeamMember} disabled={!selectedUserId || submitting}>
              {submitting ? "Legger til..." : "Legg til"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slett salong</DialogTitle>
            <DialogDescription>
              Er du sikker på at du vil slette salongen "{salonToDelete?.name}"? Denne handlingen kan ikke angres.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Avbryt
            </Button>
            <Button variant="destructive" onClick={handleDeleteSalon}>
              Slett
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail view dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {salonToView?.logo_url ? (
                <img src={salonToView.logo_url} alt="" className="w-8 h-8 rounded object-cover" />
              ) : (
                <Store className="w-5 h-5" />
              )}
              {salonToView?.name}
            </DialogTitle>
            <DialogDescription>
              {salonToView?.city && `${salonToView.city} • `}
              {salonToView?.districts?.name || "Ingen distrikt"}
              {salonToView?.chains?.name && ` • ${salonToView.chains.name}`}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 py-4">
              {/* Company info section */}
              {salonToView?.org_number && (
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Selskapsinformasjon
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Org.nummer</span>
                      <span className="font-medium">{salonToView.org_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Navn</span>
                      <span className="font-medium">{salonToView.name}</span>
                    </div>
                    {salonToView.legal_name && salonToView.legal_name !== salonToView.name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Juridisk navn</span>
                        <span className="font-medium">{salonToView.legal_name}</span>
                      </div>
                    )}
                    {salonToView.founded_date && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Stiftet
                        </span>
                        <span className="font-medium">{formatFoundedDate(salonToView.founded_date)}</span>
                      </div>
                    )}
                    {salonToView.employee_count !== null && salonToView.employee_count !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <UsersRound className="w-3 h-3" />
                          Antall ansatte
                        </span>
                        <span className="font-medium">{salonToView.employee_count}</span>
                      </div>
                    )}
                    {salonToView.address && (
                      <div className="pt-2 border-t mt-2">
                        <div className="flex items-start gap-1 text-muted-foreground">
                          <MapPin className="w-3 h-3 mt-0.5" />
                          <div>
                            <p className="font-medium text-foreground">{salonToView.address}</p>
                            <p>{salonToView.city}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Salon owners */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Salongeiere ({salonToView?.owners?.length || 0})
                  </h4>
                  {salonToView?.owners?.length > 1 && (
                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                      Flere eiere
                    </Badge>
                  )}
                </div>
                {salonToView?.owners?.length > 0 ? (
                  <div className="space-y-2">
                    {salonToView.owners.map((owner: any) => (
                      <div key={owner.id} className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{owner.name}</p>
                            <p className="text-xs text-muted-foreground">{owner.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveTeamMember(owner.id, "salon_owner")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => {
                        openAssignOwnerDialog(salonToView);
                        setDetailDialogOpen(false);
                      }}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Legg til eier
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground italic">Ingen salongeier tildelt</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        openAssignOwnerDialog(salonToView);
                        setDetailDialogOpen(false);
                      }}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Tildel salongeier
                    </Button>
                  </div>
                )}
              </div>

              {/* Daglige ledere */}
              {salonToView?.dagligLedere?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Daglige ledere ({salonToView.dagligLedere.length})
                  </h4>
                  <div className="space-y-2">
                    {salonToView.dagligLedere.map((person: any) => (
                      <div key={person.id} className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{person.name}</p>
                            <p className="text-xs text-muted-foreground">{person.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveTeamMember(person.id, "daglig_leder")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Avdelingsledere */}
              {salonToView?.avdelingsledere?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Avdelingsledere ({salonToView.avdelingsledere.length})
                  </h4>
                  <div className="space-y-2">
                    {salonToView.avdelingsledere.map((person: any) => (
                      <div key={person.id} className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                            <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{person.name}</p>
                            <p className="text-xs text-muted-foreground">{person.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveTeamMember(person.id, "avdelingsleder")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Styreledere */}
              {salonToView?.styreledere?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Styreledere ({salonToView.styreledere.length})
                  </h4>
                  <div className="space-y-2">
                    {salonToView.styreledere.map((person: any) => (
                      <div key={person.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                            <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{person.name}</p>
                            <p className="text-xs text-muted-foreground">{person.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveTeamMember(person.id, "styreleder")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stylists */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Frisører ({salonToView?.stylists?.length || 0})
                </h4>
                {salonToView?.stylists?.length > 0 ? (
                  <div className="space-y-2">
                    {salonToView.stylists.map((stylist: any) => (
                      <div key={stylist.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-accent" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{stylist.name}</p>
                            <p className="text-xs text-muted-foreground">{stylist.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveTeamMember(stylist.id, "stylist")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Ingen frisører</p>
                )}
              </div>

              {/* Apprentices */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Lærlinger ({salonToView?.apprentices?.length || 0})
                </h4>
                {salonToView?.apprentices?.length > 0 ? (
                  <div className="space-y-2">
                    {salonToView.apprentices.map((apprentice: any) => (
                      <div key={apprentice.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-secondary">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                            <User className="w-4 h-4 text-secondary-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{apprentice.name}</p>
                            <p className="text-xs text-muted-foreground">{apprentice.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveTeamMember(apprentice.id, "apprentice")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Ingen lærlinger</p>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                openAssignTeamDialog(salonToView);
                setDetailDialogOpen(false);
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Legg til medlem
            </Button>
            <Button onClick={() => setDetailDialogOpen(false)}>
              Lukk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HubSpot Search Dialog */}
      <HubSpotSalonSearch
        open={hubspotDialogOpen}
        onOpenChange={setHubspotDialogOpen}
        salon={salonForHubspot}
        onLinked={fetchData}
      />

      {/* HubSpot Import Dialog */}
      <HubSpotSalonImport
        open={hubspotImportOpen}
        onOpenChange={setHubspotImportOpen}
        onImported={fetchData}
        existingHubSpotIds={salons.filter(s => s.hs_object_id).map(s => s.hs_object_id)}
        districts={districts}
      />

      {/* Import by Medlemsstatus Dialog */}
      <Dialog open={importByStatusOpen} onOpenChange={(open) => {
        setImportByStatusOpen(open);
        if (!open) {
          setHubspotCompaniesByStatus([]);
          setSelectedImportStatus("");
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import salonger etter medlemsstatus</DialogTitle>
            <DialogDescription>
              Velg en medlemsstatus for å hente alle selskaper fra HubSpot med denne statusen
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Select value={selectedImportStatus} onValueChange={(value) => {
                setSelectedImportStatus(value);
                handleSearchByStatus(value);
              }}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Velg medlemsstatus" />
                </SelectTrigger>
                <SelectContent>
                  {MEDLEMSSTATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingStatusCompanies && <Loader2 className="w-5 h-5 animate-spin" />}
            </div>

            {hubspotCompaniesByStatus.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Fant {hubspotCompaniesByStatus.length} selskaper med status "{selectedImportStatus}".
                  {(() => {
                    const existingIds = salons.filter(s => s.hs_object_id).map(s => s.hs_object_id);
                    const newCount = hubspotCompaniesByStatus.filter(c => !existingIds.includes(c.id)).length;
                    return ` ${newCount} er nye og vil importeres.`;
                  })()}
                </p>
                <ScrollArea className="h-64 border rounded-lg p-2">
                  <div className="space-y-2">
                    {hubspotCompaniesByStatus.map((company) => {
                      const existingIds = salons.filter(s => s.hs_object_id).map(s => s.hs_object_id);
                      const isExisting = existingIds.includes(company.id);
                      return (
                        <div 
                          key={company.id} 
                          className={`p-2 rounded border ${isExisting ? 'bg-muted/50 opacity-60' : 'bg-background'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{company.properties.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {company.properties.city || "Ukjent by"} • Org: {company.properties.orgnr || "N/A"}
                              </p>
                            </div>
                            {isExisting && (
                              <Badge variant="secondary" className="text-xs">Allerede importert</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportByStatusOpen(false)}>
              Avbryt
            </Button>
            <Button 
              onClick={handleImportByStatus} 
              disabled={importingByStatus || hubspotCompaniesByStatus.length === 0}
            >
              {importingByStatus ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importerer...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Importer nye salonger
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
