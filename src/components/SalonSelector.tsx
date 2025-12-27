import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Building2, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Salon {
  id: string;
  name: string;
  logo_url: string | null;
}

interface SalonContextType {
  salons: Salon[];
  selectedSalonId: string | null;
  setSelectedSalonId: (id: string | null) => void;
  loading: boolean;
  canSelectSalon: boolean;
}

const SalonContext = createContext<SalonContextType>({
  salons: [],
  selectedSalonId: null,
  setSelectedSalonId: () => {},
  loading: true,
  canSelectSalon: false,
});

export const useSalonContext = () => useContext(SalonContext);

export const SalonProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, profile } = useAuth();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const role = profile?.role;
  // Admin, District Manager, and Chain Leader can select from multiple salons
  const canSelectSalon = role === "admin" || role === "district_manager" || role === "chain_leader";

  useEffect(() => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    const fetchAccessibleSalons = async () => {
      setLoading(true);
      try {
        let fetchedSalons: Salon[] = [];

        if (role === "admin") {
          // Admin sees all salons
          const { data } = await supabase
            .from("salons")
            .select("id, name, logo_url")
            .order("name");
          fetchedSalons = data || [];
        } else if (role === "district_manager" && profile.district_id) {
          // District manager sees salons in their district
          const { data } = await supabase
            .from("salons")
            .select("id, name, logo_url")
            .eq("district_id", profile.district_id)
            .order("name");
          fetchedSalons = data || [];
        } else if (role === "chain_leader") {
          // Chain leader sees salons in their chain(s)
          const { data: chainRoles } = await supabase
            .from("user_chain_roles")
            .select("chain_id")
            .eq("user_id", user.id);

          if (chainRoles && chainRoles.length > 0) {
            const chainIds = chainRoles.map((r) => r.chain_id);
            const { data } = await supabase
              .from("salons")
              .select("id, name, logo_url")
              .in("chain_id", chainIds)
              .order("name");
            fetchedSalons = data || [];
          }
        } else {
          // For other users, check user_salon_roles and chain_roles
          let salonIds: string[] = [];
          
          const { data: salonRoles } = await supabase
            .from("user_salon_roles")
            .select("salon_id")
            .eq("user_id", user.id);

          const { data: chainRoles } = await supabase
            .from("user_chain_roles")
            .select("chain_id")
            .eq("user_id", user.id);

          if (salonRoles) {
            salonIds.push(...salonRoles.map((r) => r.salon_id));
          }

          if (chainRoles && chainRoles.length > 0) {
            const chainIds = chainRoles.map((r) => r.chain_id);
            const { data: chainSalons } = await supabase
              .from("salons")
              .select("id")
              .in("chain_id", chainIds);
            if (chainSalons) {
              salonIds.push(...chainSalons.map((s) => s.id));
            }
          }

          // Include user's primary salon_id
          if (profile.salon_id && !salonIds.includes(profile.salon_id)) {
            salonIds.push(profile.salon_id);
          }

          const uniqueSalonIds = [...new Set(salonIds)];

          if (uniqueSalonIds.length > 0) {
            const { data } = await supabase
              .from("salons")
              .select("id, name, logo_url")
              .in("id", uniqueSalonIds)
              .order("name");
            fetchedSalons = data || [];
          } else if (profile.salon_id) {
            const { data } = await supabase
              .from("salons")
              .select("id, name, logo_url")
              .eq("id", profile.salon_id)
              .single();
            if (data) {
              fetchedSalons = [data];
            }
          }
        }

        setSalons(fetchedSalons);

        // Restore from localStorage or auto-select for single-salon users
        const storedSalonId = localStorage.getItem("selectedSalonId");
        const salonIdList = fetchedSalons.map(s => s.id);

        if (storedSalonId && salonIdList.includes(storedSalonId)) {
          setSelectedSalonId(storedSalonId);
        } else if (!canSelectSalon && fetchedSalons.length === 1) {
          // Auto-select only for non-admin/DM/chain_leader with single salon
          setSelectedSalonId(fetchedSalons[0].id);
        } else if (fetchedSalons.length === 1) {
          // Auto-select if only one salon available
          setSelectedSalonId(fetchedSalons[0].id);
        }
      } catch (error) {
        console.error("Error fetching accessible salons:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccessibleSalons();
  }, [user, profile, canSelectSalon, role]);

  const handleSetSelectedSalonId = (id: string | null) => {
    setSelectedSalonId(id);
    if (id) {
      localStorage.setItem("selectedSalonId", id);
    } else {
      localStorage.removeItem("selectedSalonId");
    }
  };

  return (
    <SalonContext.Provider
      value={{
        salons,
        selectedSalonId,
        setSelectedSalonId: handleSetSelectedSalonId,
        loading,
        canSelectSalon,
      }}
    >
      {children}
    </SalonContext.Provider>
  );
};

export const SalonSelector = () => {
  const { salons, selectedSalonId, setSelectedSalonId, loading, canSelectSalon } = useSalonContext();
  const [open, setOpen] = useState(false);

  // Don't show selector if user has only one salon or none
  if (loading || salons.length <= 1) {
    return null;
  }

  const selectedSalon = salons.find((s) => s.id === selectedSalonId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 px-3 gap-2 bg-background border-border/60 hover:bg-accent/50 rounded-xl min-w-[180px] justify-between"
        >
          <div className="flex items-center gap-2">
            {selectedSalon?.logo_url ? (
              <img 
                src={selectedSalon.logo_url} 
                alt="" 
                className="w-6 h-6 rounded-md object-cover"
              />
            ) : (
              <Building2 className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-medium truncate max-w-[140px]">
              {selectedSalon?.name || "Velg salong"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 bg-popover border shadow-lg rounded-xl z-50" align="start">
        <Command>
          <CommandInput placeholder="Søk etter salong..." />
          <CommandList>
            <CommandEmpty>Ingen salonger funnet.</CommandEmpty>
            <CommandGroup>
              {salons.map((salon) => (
                <CommandItem
                  key={salon.id}
                  value={salon.name}
                  onSelect={() => {
                    setSelectedSalonId(salon.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                >
                  {salon.logo_url ? (
                    <img
                      src={salon.logo_url}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-border/40"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="font-medium truncate flex-1">{salon.name}</span>
                  {selectedSalonId === salon.id && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
