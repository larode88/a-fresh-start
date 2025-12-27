import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SalonSelector, useSalonContext } from "@/components/SalonSelector";
import { AnsattSelector } from "@/components/AnsattSelector";
import { Building2 } from "lucide-react";
import { useLocation } from "react-router-dom";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}
export function AppLayout({
  children,
  title,
  subtitle
}: AppLayoutProps) {
  const { salons, selectedSalonId } = useSalonContext();
  const location = useLocation();
  const selectedSalon = salons.find(s => s.id === selectedSalonId);
  
  // Show AnsattSelector on Min Side pages
  const isMinSidePage = location.pathname.startsWith('/min-side');
  
  return <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Brand Header Bar */}
          <div className="bg-black flex items-center gap-4 px-6 h-[7rem] border-black sticky top-0 z-30">
            <div className="h-16 w-16 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
              {selectedSalon?.logo_url ? <img src={selectedSalon.logo_url} alt={selectedSalon.name} className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 text-white/60" />}
            </div>
            <div>
              <h1 className="text-white font-serif tracking-wide font-normal text-xl">{selectedSalon?.name || 'Velg salong'}</h1>
              <p className="text-white/60 text-xs">Frisørsystemet</p>
            </div>
          </div>

          {/* Navigation Header */}
          <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-20">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="shrink-0 rounded-xl" />
                  {subtitle && <p className="text-muted-foreground font-medium text-lg">{subtitle}</p>}
                </div>
                
                <div className="flex items-center gap-3">
                  {isMinSidePage && <AnsattSelector />}
                  <SalonSelector />
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>;
}