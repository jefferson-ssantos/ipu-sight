import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { KPICard } from "@/components/dashboard/KPICard";
import { ConsolidatedChart } from "@/components/dashboard/ConsolidatedChart";
import { ProjectChart } from "@/components/dashboard/ProjectChart";
import { OrgDetailsModal } from "@/components/dashboard/OrgDetailsModal";
import { OrganizationCostCard } from "@/components/dashboard/OrganizationCostCard";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Activity, Building2, Calendar } from "lucide-react";

export default function DashboardEssential() {
  const { user } = useAuth();
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [selectedOrgKPI, setSelectedOrgKPI] = useState<string>("all");
  const [selectedCycleFilter, setSelectedCycleFilter] = useState<string>("3");
  const [selectedOrgForDetails, setSelectedOrgForDetails] = useState<string | null>(null);
  const [availableOrgs, setAvailableOrgs] = useState<Array<{
    value: string;
    label: string;
  }>>([]);
  
  const {
    data: dashboardData,
    loading,
    error,
    refetch,
  } = useDashboardData(selectedOrg === "all" ? undefined : selectedOrg, selectedCycleFilter);
  
  // KPI-specific data hook
  const {
    data: kpiData,
    loading: kpiLoading
  } = useDashboardData(selectedOrgKPI === "all" ? undefined : selectedOrgKPI, selectedCycleFilter);

  // Fetch available organizations
  useEffect(() => {
    if (!user) return;
    const fetchOrganizations = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('cliente_id')
          .eq('id', user.id)
          .single();
        if (!profile?.cliente_id) return;

        const { data: configs } = await supabase
          .from('api_configuracaoidmc')
          .select('id')
          .eq('cliente_id', profile.cliente_id);
        if (!configs || configs.length === 0) return;
        
        const configIds = configs.map(config => config.id);
        const { data: orgs } = await supabase
          .from('api_consumosummary')
          .select('org_id, org_name')
          .in('configuracao_id', configIds)
          .neq('meter_name', 'Sandbox Organizations IPU Usage');
        
        if (orgs) {
          const uniqueOrgs = Array.from(
            new Map(orgs.map(org => [org.org_id, org])).values()
          ).filter(org => org.org_id && org.org_name);
          
          setAvailableOrgs([
            { value: "all", label: "Todas as Organizações" },
            ...uniqueOrgs.map(org => ({
              value: org.org_id,
              label: org.org_name || org.org_id
            }))
          ]);

          const prodOrg = uniqueOrgs.find(org => 
            org.org_name?.toLowerCase().includes('produção') || 
            org.org_name?.toLowerCase().includes('production')
          );
          if (prodOrg) {
            setSelectedOrg(prodOrg.org_id);
          }
        }
      } catch (error) {
      }
    };
    fetchOrganizations();
  }, [user]);
  
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
          <p className="text-muted-foreground">Carregando dashboard essential...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">Erro ao carregar dados: {error}</p>
          <Button onClick={refetch}>Tentar novamente</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 p-6 space-y-6">
        {/* KPI Section - Essential Level */}
        <Card className="border bg-gradient-card shadow-medium">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <CardTitle className="text-xl font-heading font-bold text-foreground">
                    Dashboard Essential
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    {dashboardData?.periodStart && dashboardData?.periodEnd && (
                      <Badge variant="outline" className="text-primary">
                        <Calendar className="h-3 w-3 mr-1" />
                        {dashboardData.periodStart} - {dashboardData.periodEnd}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-primary-foreground">
                      Visão Essencial
                    </Badge>
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
                value={formatCurrency(kpiData?.totalCost || 0)} 
                icon={DollarSign} 
                variant="cost" 
                contractedValue={formatCurrency((kpiData?.contractedIPUs || 0) * (kpiData?.pricePerIPU || 0))} 
                consumptionPercentage={kpiData?.contractedIPUs && kpiData?.pricePerIPU ? (kpiData?.totalCost || 0) / ((kpiData?.contractedIPUs || 0) * (kpiData?.pricePerIPU || 0)) * 100 : 0} 
              />
              
              <KPICard 
                title="Custo Médio Diário" 
                value={formatCurrency(kpiData?.avgDailyCost || 0)} 
                icon={Activity} 
                variant="default" 
                historicalComparison={kpiData?.historicalComparison} 
                baselineValue={formatCurrency(kpiData?.historicalAvgDailyCost || 0)} 
              />
              
              <KPICard 
                title="Organizações Ativas" 
                value={kpiData?.activeOrgs || 0} 
                subtitle="Com consumo no período" 
                icon={Building2} 
                variant="default" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Organizations Carousel Section */}
        <div className="space-y-4 rounded-lg p-6 bg-gradient-card shadow-medium border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-heading font-bold text-foreground">
                Organizações por Custo
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Navegue pelos dados de consumo de cada organização
              </p>
            </div>
            <Badge variant="outline" className="text-muted-foreground">
              {dashboardData?.organizations.length || 0} organizações
            </Badge>
          </div>

          {dashboardData?.organizations.length ? (
            <Carousel opts={{
              align: "start",
              loop: false
            }} className="w-full">
              <div className="relative">
                <CarouselContent className="-ml-2 md:-ml-4">
                  {dashboardData.organizations.map((org, index) => (
                    <CarouselItem key={index} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                      <OrganizationCostCard 
                        org={org} 
                        onClick={() => setSelectedOrgForDetails(org.org_id)} 
                        formatCurrency={formatCurrency} 
                        formatIPU={formatIPU} 
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex" />
                <CarouselNext className="hidden md:flex" />
              </div>
            </Carousel>
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg">
              <Building2 className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>Nenhum dado de organização encontrado para o período selecionado.</p>
            </div>
          )}
        </div>

        {/* Consolidated Chart Section */}
        <ConsolidatedChart 
          selectedOrg={selectedOrg === "all" ? undefined : selectedOrg} 
          availableOrgs={availableOrgs} 
        />

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
  );
}