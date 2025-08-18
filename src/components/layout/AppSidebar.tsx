import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart3,
  Building2,
  Database,
  Layers3,
  PieChart,
  Settings,
  TrendingUp,
  Users,
  Tags,
  LogOut,
  ChevronDown
} from "lucide-react";
import orysLogo from "@/assets/logo-laranja-branca.png";

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

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: BarChart3,
    description: "Visão geral dos custos"
  },
  {
    title: "Análise de Custos",
    url: "/analysis",
    icon: TrendingUp,
    description: "Análises detalhadas"
  }
];

const consumptionItems = [
  {
    title: "Por Asset",
    url: "/consumption/assets",
    icon: Database,
    description: "Consumo detalhado por asset"
  },
  {
    title: "Por Projeto",
    url: "/consumption/projects",
    icon: Building2,
    description: "Agrupamento por projetos"
  },
  {
    title: "Por Organização",
    url: "/consumption/organizations",
    icon: Users,
    description: "Visão organizacional"
  },
  {
    title: "Execução de Jobs",
    url: "/consumption/jobs",
    icon: Layers3,
    description: "Detalhes de execução"
  }
];

const configItems = [
  {
    title: "Tags Customizadas",
    url: "/config/tags",
    icon: Tags,
    description: "Gerenciar categorias"
  },
  {
    title: "Conexões",
    url: "/config/connections",
    icon: Database,
    description: "Configurar conexões IDMC"
  }
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const { open, setOpen } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
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
          <img src={orysLogo} alt="Orys Logo" className="h-8 w-8" />
          {open && (
            <div>
              <h2 className="font-heading font-bold text-lg text-foreground">IPU-Sight</h2>
              <p className="text-xs text-muted-foreground">FinOps Dashboard</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent className="flex flex-col h-full">
        {/* Main Navigation */}
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

        {/* Consumption Details */}
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
                      <PieChart className="h-5 w-5 flex-shrink-0" />
                      {open && (
                        <div className="flex flex-col items-start flex-1">
                          <span className="font-medium">Detalhamento</span>
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

        {/* Configuration */}
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
