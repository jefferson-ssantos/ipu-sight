import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { ConsolidatedChart } from "@/components/dashboard/ConsolidatedChart";
import { ProjectChart } from "@/components/dashboard/ProjectChart";
import { OrgDetailsModal } from "@/components/dashboard/OrgDetailsModal";
import { OrganizationComparison } from "@/components/analysis/OrganizationComparison";
import { ChartSyncProvider } from "@/hooks/useChartSync";
import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import { usePageHeader } from "@/components/layout/AppLayout";
import { DollarSign, Activity, Building2, Calendar, BarChart3 } from "lucide-react";

// Memoized dashboard content component
const DashboardContent = React.memo(() => {
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [selectedOrgKPI, setSelectedOrgKPI] = useState<string>("all");
  const [selectedCycleFilter, setSelectedCycleFilter] = useState<string>("12");
  const [selectedOrgForDetails, setSelectedOrgForDetails] = useState<string | null>(null);
  
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

  // Fetch initial data and set production org as default
  useEffect(() => {
    if (availableOrgs.length > 0 && selectedOrg === "all") {
      const prodOrg = availableOrgs.find(org => 
        org.label.toLowerCase().includes('produção') || 
        org.label.toLowerCase().includes('production')
      );
      if (prodOrg && prodOrg.value !== "all") {
        setSelectedOrg(prodOrg.value);
        setSelectedOrgKPI(prodOrg.value);
      }
    }
  }, [availableOrgs, selectedOrg]);

  // Fetch dashboard data when filters change
  useEffect(() => {
    fetchDashboardData(selectedOrgKPI === "all" ? undefined : selectedOrgKPI, selectedCycleFilter);
  }, [selectedOrgKPI, selectedCycleFilter, fetchDashboardData]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  const formatIPU = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1).replace('.', ',')}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString('pt-BR');
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
          <Button onClick={() => fetchDashboardData(selectedOrgKPI === "all" ? undefined : selectedOrgKPI, selectedCycleFilter, true)}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <ChartSyncProvider>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex-1 p-6 space-y-6">
        {/* KPI Section - Essential Level */}
        <Card className="border bg-gradient-card shadow-medium">
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
                <Select value={selectedOrgKPI} onValueChange={setSelectedOrgKPI}>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KPICard 
                title="Custo Total" 
                value={formatCurrency(dashboardData?.totalCost || 0)} 
                icon={DollarSign} 
                variant="cost" 
                contractedValue={formatCurrency((dashboardData?.contractedIPUs || 0) * (dashboardData?.pricePerIPU || 0))} 
                consumptionPercentage={dashboardData?.contractedIPUs && dashboardData?.pricePerIPU ? (dashboardData?.totalCost || 0) / ((dashboardData?.contractedIPUs || 0) * (dashboardData?.pricePerIPU || 0)) * 100 : 0} 
              />
              
              <KPICard 
                title="Custo Médio Diário" 
                value={formatCurrency(dashboardData?.avgDailyCost || 0)} 
                icon={Activity} 
                variant="default" 
                historicalComparison={dashboardData?.historicalComparison} 
                baselineValue={formatCurrency(dashboardData?.historicalAvgDailyCost || 0)} 
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
          {/* Organization Comparison Section */}
          <OrganizationComparison 
            selectedOrg={selectedOrg}
            selectedCycleFilter={selectedCycleFilter}
            availableOrgs={availableOrgs}
            onOrgChange={setSelectedOrg}
            onCycleFilterChange={setSelectedCycleFilter}
          />

          {/* Consolidated Chart Section */}
          <ConsolidatedChart 
            selectedOrg={selectedOrg === "all" ? undefined : selectedOrg} 
            availableOrgs={availableOrgs} 
          />
        </div>

        {/* Project Chart Section */}
        <ProjectChart 
          selectedOrg={selectedOrg === "all" ? undefined : selectedOrg} 
          availableOrgs={availableOrgs} 
        />
        </div>

        {/* Organization Details Modal */}
        {selectedOrgForDetails && (
          <OrgDetailsModal 
            orgId={selectedOrgForDetails} 
            onClose={() => setSelectedOrgForDetails(null)} 
            billingPeriod={dashboardData?.currentCycle} 
          />
        )}
      </div>
    </ChartSyncProvider>
  );
});

DashboardContent.displayName = 'DashboardContent';

export default function DashboardEssential() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}