import { LayoutDashboard, Users, Calendar, Palmtree, DollarSign, Building2, Package, Settings, FileSpreadsheet, UserCog, MessageSquare, Bell, LogOut, UserCircle, Scissors, Shield, Target, Umbrella, AlertCircle, User, ClipboardList, BarChart3, Briefcase, UserPlus, Calculator, Gift } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useSalonContext } from "@/components/SalonSelector";
import haar1Logo from "@/assets/haar1-portalen-logo.png";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AnnouncementNotifications } from "@/components/dashboard/AnnouncementNotifications";

const MANAGER_ROLES = ['salon_owner', 'daglig_leder', 'avdelingsleder', 'admin'];

export function AppSidebar() {
  const {
    profile,
    signOut
  } = useAuth();
  const {
    state
  } = useSidebar();
  const navigate = useNavigate();
  const {
    unreadCount
  } = useUnreadMessages();
  const {
    salons,
    selectedSalonId
  } = useSalonContext();
  const collapsed = state === "collapsed";
  const role = profile?.role;
  const selectedSalon = salons.find(s => s.id === selectedSalonId);
  const isManager = role && MANAGER_ROLES.includes(role);
  const isDistrictOrAdmin = role && ['district_manager', 'admin'].includes(role);
  const isSupplier = role && ['supplier_admin', 'supplier_sales', 'supplier_business_dev'].includes(role);
  const isAdmin = role === 'admin';
  const canImport = role && ['salon_owner', 'admin'].includes(role);
  const menuItemClass = "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200";
  const activeClass = "bg-primary/10 text-primary font-medium";
  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };
  return <Sidebar collapsible="icon" className="border-r border-sidebar-border/50">
      {/* Hår1 Portalen branding */}
      <SidebarHeader className="px-3 py-5 bg-black h-[7rem] flex items-center justify-center border-black">
        <div className="flex items-center justify-center w-full">
          <img src={haar1Logo} alt="Hår1 Portalen" className={collapsed ? "h-8 w-auto" : "w-full h-auto max-h-20 object-contain"} />
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-4">
        {/* Hovedmeny */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>Hovedmeny</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard">
                  <NavLink to="/dashboard" className={menuItemClass} activeClassName={activeClass}>
                    <LayoutDashboard className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Min Side - for alle ansatte */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>Min Side</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Min Oversikt">
                  <NavLink to="/min-side" className={menuItemClass} activeClassName={activeClass}>
                    <User className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>Min Oversikt</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Min Turnus">
                  <NavLink to="/min-side/turnus" className={menuItemClass} activeClassName={activeClass}>
                    <Calendar className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>Min Turnus</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Mine Mål & Resultat">
                  <NavLink to="/min-side/mal" className={menuItemClass} activeClassName={activeClass}>
                    <Target className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>Mine Mål & Resultat</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Mine Samtaler">
                  <NavLink to="/min-side/samtaler" className={menuItemClass} activeClassName={activeClass}>
                    <ClipboardList className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>Mine Samtaler</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Pulsundersøkelser">
                  <NavLink to="/min-side/puls" className={menuItemClass} activeClassName={activeClass}>
                    <BarChart3 className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>Pulsundersøkelser</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Ferie & Fravær">
                  <NavLink to="/min-side/ferie" className={menuItemClass} activeClassName={activeClass}>
                    <Umbrella className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>Ferie & Fravær</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Min Salong - for managers */}
        {isManager && <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>Min Salong</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Ansatte">
                    <NavLink to="/ansatte" className={menuItemClass} activeClassName={activeClass}>
                      <UserCog className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Ansatte</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Turnus">
                    <NavLink to="/schedule" className={menuItemClass} activeClassName={activeClass}>
                      <Calendar className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Turnus</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Ferie">
                    <NavLink to="/ferie" className={menuItemClass} activeClassName={activeClass}>
                      <Umbrella className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Ferie</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Fravær">
                    <NavLink to="/leave" className={menuItemClass} activeClassName={activeClass}>
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Fravær</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Utvikling & Samtaler">
                    <NavLink to="/hr/utvikling" className={menuItemClass} activeClassName={activeClass}>
                      <Target className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Utvikling & Samtaler</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Budsjett">
                    <NavLink to="/budget" className={menuItemClass} activeClassName={activeClass}>
                      <DollarSign className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Budsjett</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Tariff">
                    <NavLink to="/tariff" className={menuItemClass} activeClassName={activeClass}>
                      <Calculator className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Tariff</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Forsikring">
                    <NavLink to="/insurance" className={menuItemClass} activeClassName={activeClass}>
                      <Shield className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Forsikring</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Innkjøp & Bonus">
                    <NavLink to="/min-salong/bonus" className={menuItemClass} activeClassName={activeClass}>
                      <Gift className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Innkjøp & Bonus</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}

        {/* Distriktsjef - for district managers */}
        {isDistrictOrAdmin && <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>Distriktsjef</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Prospekter">
                    <NavLink to="/prospekter" className={menuItemClass} activeClassName={activeClass}>
                      <UserPlus className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Prospekter</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Innmeldinger">
                    <NavLink to="/innmeldinger" className={menuItemClass} activeClassName={activeClass}>
                      <Briefcase className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Innmeldinger</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Forsikring">
                    <NavLink to="/district/insurance" className={menuItemClass} activeClassName={activeClass}>
                      <Shield className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Forsikring</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Bonus & Vekstbonus">
                    <NavLink to="/district/bonus" className={menuItemClass} activeClassName={activeClass}>
                      <Gift className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Bonus & Vekstbonus</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}

        {/* Oversikt - for team/district views */}
        {(isManager || isDistrictOrAdmin) && <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>Resultat & Rapporter</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {isManager && <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Team">
                      <NavLink to="/team" className={menuItemClass} activeClassName={activeClass}>
                        <Users className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Team</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>}
                {isDistrictOrAdmin && <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Distrikt">
                      <NavLink to="/district" className={menuItemClass} activeClassName={activeClass}>
                        <Building2 className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Distrikt</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}

        {/* Leverandør */}
        {isSupplier && <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>Leverandør</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Leverandør-dashboard">
                    <NavLink to="/supplier" className={menuItemClass} activeClassName={activeClass}>
                      <Package className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Leverandør</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}

        {/* Admin */}
        {(canImport || isAdmin) && <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {canImport && <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Import">
                      <NavLink to="/import" className={menuItemClass} activeClassName={activeClass}>
                        <FileSpreadsheet className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Import</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>}
                {isAdmin && <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Forsikringsadmin">
                      <NavLink to="/admin/insurance" className={menuItemClass} activeClassName={activeClass}>
                        <Shield className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Forsikringsadmin</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>}
                {isAdmin && <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Bonus & Returprovisjon">
                      <NavLink to="/admin/bonus" className={menuItemClass} activeClassName={activeClass}>
                        <Calculator className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Bonus</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>}
                {isAdmin && <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Innstillinger">
                      <NavLink to="/admin" className={menuItemClass} activeClassName={activeClass}>
                        <Settings className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Admin Panel</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-sidebar-accent transition-all duration-200">
              <div className="relative">
                <Avatar className="h-10 w-10 rounded-full">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-primary/15 text-primary text-sm rounded-full">
                    {getInitials(profile?.name)}
                  </AvatarFallback>
                </Avatar>
                {unreadCount > 0 && <Badge className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center text-[10px] px-1 bg-destructive">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>}
              </div>
              {!collapsed && <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate text-sidebar-foreground">
                    {profile?.name || "Bruker"}
                  </p>
                </div>}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56 bg-popover border border-border shadow-lg z-50">
            <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
              <UserCircle className="mr-2 h-4 w-4" />
              Min profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/messages")} className="cursor-pointer">
              <MessageSquare className="mr-2 h-4 w-4" />
              Meldinger
              {unreadCount > 0 && <Badge className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs px-1">
                  {unreadCount}
                </Badge>}
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer p-0">
              <div className="w-full">
                <AnnouncementNotifications inDropdown />
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logg ut
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>;
}
