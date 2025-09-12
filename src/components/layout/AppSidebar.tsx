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
  Cable
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
    
    if (permissions?.canAccessAnalysis) {
      items.push({
        title: "Análise de Custos",
        url: "/analysis", 
        icon: TrendingUp,
        description: "Análise preditivas e tendências"
      });
    }
    
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

  const mainNavItems = getMainNavItems();
  const configItems = getConfigItems();
  const detailItems = getDetailItems();

  const isActive = (path: string) => currentPath === path;
  
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