import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  BarChart3,
  Folder,
  FileText,
  Database,
  Play,
  PieChart,
  Settings,
  TrendingUp,
  Building,
  Tags,
  LogOut,
  ChevronDown,
  Activity,
  FolderOpen,
  Building2,
  Cable
} from "lucide-react";
import orysLogo from "@/assets/logo-laranja.png";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function AppSidebar() {
  const { signOut } = useAuth();
  const { permissions, loading } = usePermissions();
  const { open, setOpen } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  if (loading) {
    return (
      <Sidebar
        className="transition-all duration-300 border-r border-border bg-card"
        collapsible="icon"
      >
        <SidebarContent>
          <div className="p-4">
            <div className="text-sm text-muted-foreground">Carregando...</div>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  // Navigation data structures - filtered by permissions
  const getMainNavItems = () => {
    const items = [];
    
    if (permissions?.canAccessDashboard) {
      items.push({
        title: "Dashboard",
        url: "/dashboard",
        icon: BarChart3,
        description: "Visão geral dos custos e consumo"
      });
    }
    
    if (permissions?.canAccessDashboardEssential) {
      items.push({
        title: "Dashboard Essential",
        url: "/dashboard-essential", 
        icon: BarChart3,
        description: "Dashboard essencial"
      });
    }
    
    if (permissions?.canAccessDashboardStarter) {
      items.push({
        title: "Dashboard Starter",
        url: "/dashboard-starter",
        icon: BarChart3, 
        description: "Dashboard inicial"
      });
    }
    
    if (permissions?.canAccessAnalysis) {
      items.push({
        title: "Análise de Custos",
        url: "/analysis", 
        icon: TrendingUp,
        description: "Análise detalhada de tendências"
      });
    }
    
    return items;
  };

  const getConsumptionItems = () => {
    if (!permissions?.canAccessConsumption) return [];
    
    return [
      {
        title: "Por Métrica",
        url: "/consumption",
        icon: Activity,
        description: "Consumo detalhado por métrica"
      },
      {
        title: "Por Asset",
        url: "/consumption/assets",
        icon: Database,
        description: "Análise por asset específico"
      },
      {
        title: "Por Projeto",
        url: "/consumption/projects", 
        icon: FolderOpen,
        description: "Agrupamento por projeto"
      },
      {
        title: "Por Organização",
        url: "/consumption/organizations",
        icon: Building2,
        description: "Visão organizacional"
      },
      {
        title: "Execuções de Job",
        url: "/consumption/jobs",
        icon: Play,
        description: "Histórico de execuções"
      }
    ];
  };

  const getConfigItems = () => {
    if (!permissions?.canAccessConfiguration) return [];
    
    return [
      {
        title: "Conexões",
        url: "/config/connections",
        icon: Cable,
        description: "Configurações de conexão IDMC"
      }
    ];
  };

  const getDetailItems = () => {
    if (!permissions?.canAccessDetalhamento) return [];
    
    return [
      {
        title: "Detalhamento",
        url: "/detalhamento",
        icon: PieChart,
        description: "Detalhamento por métrica"
      }
    ];
  };

  const mainNavItems = getMainNavItems();
  const consumptionItems = getConsumptionItems();
  const configItems = getConfigItems();
  const detailItems = getDetailItems();

  const [isConsumptionOpen, setIsConsumptionOpen] = useState(
    consumptionItems.some(item => currentPath.startsWith(item.url))
  );

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path);
  
  const getNavClasses = (path: string) => {
    const isItemActive = isActive(path);
    return `group transition-all duration-200 ${
      isItemActive
        ? "bg-primary/10 text-primary border-r-2 border-primary shadow-soft"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
    }`;
  };

  const handleLogout = () => {
    signOut();
  };

  return (
    <Sidebar
      className="transition-all duration-300 border-r border-border bg-card"
      collapsible="icon"
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <img src={orysLogo} alt="Orys Logo" className="h-14 w-40" />
        </div>
      </div>

      <SidebarContent className="flex flex-col h-full">
        {/* Main Navigation */}
        {mainNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={!open ? "sr-only" : ""}>
              Principal
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-12">
                      <NavLink
                        to={item.url}
                        className={getNavClasses(item.url)}
                        title={!open ? item.description : undefined}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {open && (
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{item.title}</span>
                            <span className="text-xs opacity-70">{item.description}</span>
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Detail Items */}
        {detailItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={!open ? "sr-only" : ""}>
              Detalhamento
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {detailItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-12">
                      <NavLink
                        to={item.url}
                        className={getNavClasses(item.url)}
                        title={!open ? item.description : undefined}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {open && (
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{item.title}</span>
                            <span className="text-xs opacity-70">{item.description}</span>
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Consumption Details */}
        {consumptionItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <Collapsible open={isConsumptionOpen} onOpenChange={setIsConsumptionOpen}>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-12">
                      <NavLink
                        to="/consumption"
                        className={getNavClasses("/consumption")}
                        title={!open ? "Detalhamento - Visões específicas" : undefined}
                        onClick={() => setIsConsumptionOpen(!isConsumptionOpen)}
                      >
                        <Activity className="h-5 w-5 flex-shrink-0" />
                        {open && (
                          <div className="flex flex-col items-start flex-1">
                            <span className="font-medium">Consumo</span>
                            <span className="text-xs text-muted-foreground">Visões específicas</span>
                          </div>
                        )}
                        {open && (
                          <ChevronDown className={`h-4 w-4 transition-transform ${
                            isConsumptionOpen ? "rotate-180" : ""
                          }`} />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  {open && (
                    <CollapsibleContent className="space-y-1">
                      {consumptionItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild className="h-10 pl-8">
                            <NavLink
                              to={item.url}
                              className={getNavClasses(item.url)}
                            >
                              <item.icon className="h-4 w-4 flex-shrink-0" />
                              <div className="flex flex-col items-start">
                                <span className="text-sm">{item.title}</span>
                              </div>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </CollapsibleContent>
                  )}
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Configuration */}
        {configItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={!open ? "sr-only" : ""}>
              Configuração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {configItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-12">
                      <NavLink
                        to={item.url}
                        className={getNavClasses(item.url)}
                        title={!open ? item.description : undefined}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {open && (
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{item.title}</span>
                            <span className="text-xs opacity-70">{item.description}</span>
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Logout at bottom */}
        <div className="mt-auto p-4 border-t border-border">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start h-12 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {open && <span className="ml-3">Sair</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}