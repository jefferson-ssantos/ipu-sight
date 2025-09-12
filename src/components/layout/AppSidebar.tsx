import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  BarChart3,
  PieChart,
  Settings,
  TrendingUp,
  LogOut,
  Cable,
  Activity,
  Target
} from "lucide-react";
import orysLogo from "@/assets/logo-laranja.png";
import orysLogoCollapsed from "@/assets/orys-logo.png";

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

export function AppSidebar() {
  const { signOut } = useAuth();
  const { permissions, loading } = usePermissions();
  const { open, setOpen } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const [analysisExpanded, setAnalysisExpanded] = useState(currentPath.startsWith('/analysis'));

  // Move all hooks to the top - before any conditional returns

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
    
    if (permissions?.canAccessDashboardStarter) {
      items.push({
        title: "Dashboard",
        url: "/dashboard-starter",
        icon: BarChart3, 
        description: "Visão geral dos custos e consumo"
      });
    }
    
    if (permissions?.canAccessDashboardEssential) {
      items.push({
        title: "Dashboard",
        url: "/dashboard",
        icon: BarChart3,
        description: "Visão geral dos custos e consumo"
      });
    }
    
    // Análise de Custos will be handled separately with submenu
    
    return items;
  };


  const getConfigItems = () => {
    if (!permissions?.canAccessConfiguration) return [];
    
    return [
      {
        title: "Configurações",
        url: "/config/connections",
        icon: Cable,
        description: "Configurações gerais"
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
        description: "Detalhamento por Asset"
      }
    ];
  };

  const getAnalysisItems = () => {
    if (!permissions?.canAccessAnalysis) return [];
    
    return [
      {
        title: "Tendências",
        url: "/analysis/trends",
        icon: Activity,
        description: "Análise de tendências de custos"
      },
      {
        title: "Análise Preditiva",
        url: "/analysis/forecast",
        icon: Target,
        description: "Previsões e análises preditivas"
      }
    ];
  };

  const mainNavItems = getMainNavItems();
  const configItems = getConfigItems();
  const detailItems = getDetailItems();
  const analysisItems = getAnalysisItems();

  const isActive = (path: string) => currentPath === path;
  const isAnalysisActive = currentPath.startsWith('/analysis');
  
  const getNavClasses = (path: string) => {
    const isItemActive = isActive(path);
    return `group transition-all duration-200 ${
      isItemActive
        ? "bg-primary/10 text-primary border-r-2 border-primary shadow-soft"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
    }`;
  };

  const getSubNavClasses = (path: string) => {
    const isItemActive = isActive(path);
    return `group transition-all duration-200 pl-6 ${
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
        <div className="flex items-center justify-center">
          <img 
            src={open ? orysLogo : orysLogoCollapsed} 
            alt="Orys Logo" 
            className={open ? "h-14 w-40" : "h-10 w-10 object-contain"}
          />
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
                  <SidebarMenuItem key={item.url}>
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

        {/* Analysis Section */}
        {analysisItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={!open ? "sr-only" : ""}>
              Análise
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Parent Analysis Item */}
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    className="h-12"
                    onClick={() => setAnalysisExpanded(!analysisExpanded)}
                  >
                    <NavLink
                      to="/analysis"
                      className={`group transition-all duration-200 cursor-pointer flex items-center w-full rounded-md px-3 py-2 ${
                        isAnalysisActive
                          ? "bg-primary/10 text-primary border-r-2 border-primary shadow-soft"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                      title={!open ? "Análise de Custos" : undefined}
                    >
                      <TrendingUp className="h-5 w-5 flex-shrink-0" />
                      {open && (
                        <div className="flex flex-col items-start flex-1">
                          <span className="font-medium">Análise de Custos</span>
                          <span className="text-xs opacity-70">Análise preditivas e tendências</span>
                        </div>
                      )}
                      {open && (
                        <div 
                          className={`transition-transform duration-200 ${analysisExpanded ? 'rotate-90' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            setAnalysisExpanded(!analysisExpanded);
                          }}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Submenu Items */}
                {analysisExpanded && open && analysisItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink
                        to={item.url}
                        className={getSubNavClasses(item.url)}
                        title={item.description}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="font-normal text-sm">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                {/* Sub-items when collapsed */}
                {!open && analysisItems.map((item) => (
                  <SidebarMenuItem key={`collapsed-${item.url}`}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink
                        to={item.url}
                        className={`group transition-all duration-200 flex items-center justify-center ${
                          isActive(item.url)
                            ? "bg-primary/10 text-primary border-r-2 border-primary shadow-soft"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                        title={item.description}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
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
                  <SidebarMenuItem key={item.url}>
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


        {/* Configuration */}
        {configItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={!open ? "sr-only" : ""}>
              Configuração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {configItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
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
            className={`w-full h-12 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 ${
              open ? "justify-start" : "justify-center px-0"
            }`}
            title={!open ? "Sair" : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {open && <span className="ml-3">Sair</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}