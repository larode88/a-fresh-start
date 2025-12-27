// Ansatt Selector Context and Component
// Allows admin/managers to view Min Side as another employee

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserRole } from '@/hooks/useUserRole';
import { useCurrentAnsatt, CurrentAnsatt } from '@/hooks/useCurrentAnsatt';
import { useSalonContext } from '@/components/SalonSelector';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from 'lucide-react';

interface AnsattSelectorContextValue {
  selectedAnsatt: CurrentAnsatt | null;
  setSelectedAnsattId: (id: string | null) => void;
  isViewingAsOther: boolean;
}

const AnsattSelectorContext = createContext<AnsattSelectorContextValue>({
  selectedAnsatt: null,
  setSelectedAnsattId: () => {},
  isViewingAsOther: false,
});

export const useAnsattSelectorContext = () => useContext(AnsattSelectorContext);

interface AnsattSelectorProviderProps {
  children: React.ReactNode;
}

export function AnsattSelectorProvider({ children }: AnsattSelectorProviderProps) {
  const { isManager, isAdmin } = useUserRole();
  const { ansatt: currentAnsatt } = useCurrentAnsatt();
  const { selectedSalonId } = useSalonContext();
  const [selectedAnsattId, setSelectedAnsattId] = useState<string | null>(null);

  // Reset selection when salon changes
  useEffect(() => {
    setSelectedAnsattId(null);
  }, [selectedSalonId]);

  // Fetch the selected ansatt's data
  const { data: selectedAnsattData } = useQuery({
    queryKey: ['selected-ansatt', selectedAnsattId],
    queryFn: async () => {
      if (!selectedAnsattId) return null;
      
      const { data, error } = await supabase
        .from('ansatte_utvidet')
        .select('*')
        .eq('id', selectedAnsattId)
        .single();
      
      if (error) throw error;
      return data as CurrentAnsatt;
    },
    enabled: !!selectedAnsattId && (isManager || isAdmin),
  });

  const canSelectOtherEmployee = isManager || isAdmin;
  const isViewingAsOther = canSelectOtherEmployee && selectedAnsattId !== null && selectedAnsattId !== currentAnsatt?.id;
  
  // Use selected ansatt if available, otherwise use current user's ansatt
  const effectiveAnsatt = isViewingAsOther && selectedAnsattData ? selectedAnsattData : currentAnsatt;

  return (
    <AnsattSelectorContext.Provider
      value={{
        selectedAnsatt: effectiveAnsatt,
        setSelectedAnsattId,
        isViewingAsOther,
      }}
    >
      {children}
    </AnsattSelectorContext.Provider>
  );
}

// The selector dropdown component
export function AnsattSelector() {
  const { isManager, isAdmin } = useUserRole();
  const { ansatt: currentAnsatt } = useCurrentAnsatt();
  const { selectedSalonId } = useSalonContext();
  const { setSelectedAnsattId, isViewingAsOther, selectedAnsatt } = useAnsattSelectorContext();

  const canSelect = isManager || isAdmin;

  // Fetch employees for the selected salon
  const { data: ansatte, isLoading } = useQuery({
    queryKey: ['ansatte-for-selector', selectedSalonId],
    queryFn: async () => {
      if (!selectedSalonId) return [];
      
      const { data, error } = await supabase
        .from('ansatte_utvidet')
        .select('id, fornavn, etternavn, rolle_display, salong_navn')
        .eq('salong_id', selectedSalonId)
        .eq('status', 'Aktiv')
        .order('fornavn');
      
      if (error) throw error;
      return data || [];
    },
    enabled: canSelect && !!selectedSalonId,
  });

  if (!canSelect) return null;

  const handleValueChange = (value: string) => {
    if (value === 'self' || value === currentAnsatt?.id) {
      setSelectedAnsattId(null);
    } else {
      setSelectedAnsattId(value);
    }
  };

  return (
    <Select
      value={selectedAnsatt?.id || 'self'}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-[240px] bg-background/50">
        <div className="flex items-center gap-2 min-w-0">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate">
            <SelectValue placeholder="Velg ansatt" />
          </span>
        </div>
      </SelectTrigger>
      <SelectContent className="min-w-[280px]">
        <SelectItem value="self" className="whitespace-nowrap">
          <span className="font-medium">Min profil</span>
          {currentAnsatt && (
            <span className="text-muted-foreground ml-1">
              ({currentAnsatt.fornavn} {currentAnsatt.etternavn})
            </span>
          )}
        </SelectItem>
        {ansatte && ansatte.length > 0 && (
          <>
            <div className="border-t my-1" />
            {ansatte.map((a) => (
              <SelectItem key={a.id} value={a.id} className="whitespace-nowrap">
                <span>{a.fornavn} {a.etternavn}</span>
                {a.rolle_display && (
                  <span className="text-muted-foreground ml-1 text-xs">
                    ({a.rolle_display})
                  </span>
                )}
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
}
