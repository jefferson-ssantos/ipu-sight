import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { ConsolidatedChartStarter } from "@/components/dashboard/ConsolidatedChartStarter";
import { ConsolidatedChartMetric } from "@/components/dashboard/ConsolidatedChartMetric";
import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import { usePageHeader } from "@/components/layout/AppLayout";
import { DollarSign, Building2, Calendar, BarChart3 } from "lucide-react";

// Memoized starter content component
const DashboardStarterContent = React.memo(() => {
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [selectedCycleFilter, setSelectedCycleFilter] = useState<string>("12");
  
  const {
    dashboardData,
    availableOrgs,
    loading,
    error,
    fetchDashboardData
  } = useDashboard();

  const pageTitle = useMemo(() => (
    <>
      <BarChart3 className="h-6 w-6 text-primary" />
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
    </>
  ), []);
  usePageHeader(pageTitle);

  // Fetch dashboard data when filters change
  useEffect(() => {
    fetchDashboardData(selectedOrg === "all" ? undefined : selectedOrg, selectedCycleFilter);
  }, [selectedOrg, selectedCycleFilter, fetchDashboardData]);

  // Set production org as default
  useEffect(() => {
    if (availableOrgs.length > 0 && selectedOrg === "all") {
      const prodOrg = availableOrgs.find(org => 
        org.label.toLowerCase().includes('produção') || 
        org.label.toLowerCase().includes('production')
      );
      if (prodOrg && prodOrg.value !== "all") {
        setSelectedOrg(prodOrg.value);
      }
    }
  }, [availableOrgs, selectedOrg]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">Erro ao carregar dados: {error}</p>
          <Button onClick={() => fetchDashboardData(selectedOrg === "all" ? undefined : selectedOrg, selectedCycleFilter, true)}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 p-6 space-y-6">
        {/* KPI Section - Simplified for Starter */}
        <Card className="bg-gradient-card shadow-medium">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <CardTitle className="text-xl font-heading font-bold text-foreground">
                    Indicadores
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    {dashboardData?.periodStart && dashboardData?.periodEnd && (
                      <Badge variant="outline" className="text-primary">
                        <Calendar className="h-3 w-3 mr-1" />
                        {dashboardData.periodStart} - {dashboardData.periodEnd}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOrgs.map(org => 
                      <SelectItem key={org.value} value={org.value}>
                        {org.label}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <KPICard 
                title="Custo Total" 
                value={formatCurrency(dashboardData?.totalCost || 0)} 
                icon={DollarSign} 
                variant="default" 
              />
              
              <KPICard 
                title="Organizações Ativas" 
                value={dashboardData?.activeOrgs || 0} 
                subtitle="Com consumo no período" 
                icon={Building2} 
                variant="default" 
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ConsolidatedChartStarter 
            selectedOrg={selectedOrg === "all" ? undefined : selectedOrg} 
            availableOrgs={availableOrgs} 
          />

          <ConsolidatedChartMetric 
            selectedOrg={selectedOrg === "all" ? undefined : selectedOrg} 
            availableOrgs={availableOrgs} 
          />
        </div>

      </div>
    </div>
  );
});

DashboardStarterContent.displayName = 'DashboardStarterContent';

export default function DashboardStarter() {
  return (
    <DashboardProvider>
      <DashboardStarterContent />
    </DashboardProvider>
  );
}