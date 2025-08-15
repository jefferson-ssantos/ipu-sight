import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { CostChart } from "@/components/dashboard/CostChart";
import { AssetDetailsTable } from "@/components/dashboard/AssetDetailsTable";
import { OrgDetailsModal } from "@/components/dashboard/OrgDetailsModal";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  DollarSign, 
  TrendingUp, 
  Activity, 
  Building2, 
  Users,
  Calendar,
  Download,
  Filter,
  RefreshCw
} from "lucide-react";
import heroImage from "@/assets/finops-hero.jpg";
import orysLogo from "@/assets/orys-logo.png";

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [showAssetTable, setShowAssetTable] = useState(false);
  const [selectedOrgForDetails, setSelectedOrgForDetails] = useState<string | null>(null);
  const [availableOrgs, setAvailableOrgs] = useState<Array<{value: string, label: string}>>([]);
  
  const { data: dashboardData, loading, error, refetch } = useDashboardData(selectedOrg === "all" ? undefined : selectedOrg);

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

        // First get the configuration IDs for this client
        const { data: configs } = await supabase
          .from('api_configuracaoidmc')
          .select('id')
          .eq('cliente_id', profile.cliente_id);

        if (!configs || configs.length === 0) return;

        const configIds = configs.map(config => config.id);

        const { data: orgs } = await supabase
          .from('api_consumosummary')
          .select('org_id, org_name')
          .in('configuracao_id', configIds);

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

          // Set default to production org if available
          const prodOrg = uniqueOrgs.find(org => 
            org.org_name?.toLowerCase().includes('produção') || 
            org.org_name?.toLowerCase().includes('production')
          );
          if (prodOrg) {
            setSelectedOrg(prodOrg.org_id);
          }
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      }
    };

    fetchOrganizations();
  }, [user]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
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
          <Button onClick={refetch}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-48 bg-gradient-primary overflow-hidden">
        <img 
          src={heroImage}
          alt="FinOps Dashboard"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary-dark/80" />
        
        <div className="relative z-10 p-8 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <img src={orysLogo} alt="Orys Logo" className="h-12" />
              <div>
                <h1 className="text-3xl font-heading font-bold mb-2">
                  FinOps Dashboard
                </h1>
                <p className="text-primary-foreground/80 text-lg">
                  Monitoramento de custos IDMC - {dashboardData?.currentPeriod || 'Sem dados'}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  {dashboardData?.periodStart && dashboardData?.periodEnd && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      <Calendar className="h-3 w-3 mr-1" />
                      {dashboardData.periodStart} - {dashboardData.periodEnd}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    <Building2 className="h-3 w-3 mr-1" />
                    {selectedOrg === "all" ? "Todas as Orgs" : availableOrgs.find(o => o.value === selectedOrg)?.label || selectedOrg}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableOrgs.map(org => (
                    <SelectItem key={org.value} value={org.value}>
                      {org.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="secondary"
                size="sm"
                onClick={refetch}
                disabled={loading}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Period Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-heading font-bold text-foreground">
              Indicadores Principais
            </h2>
            <Badge variant="outline" className="text-muted-foreground">
              Tempo real
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Ciclo Atual</SelectItem>
                <SelectItem value="last">Último Ciclo</SelectItem>
                <SelectItem value="3-months">Últimos 3 Ciclos</SelectItem>
                <SelectItem value="6-months">Últimos 6 Ciclos</SelectItem>
                <SelectItem value="12-months">Últimos 12 Ciclos</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Custo Total"
            value={formatCurrency(dashboardData?.totalCost || 0)}
            subtitle={`${formatIPU(dashboardData?.totalIPU || 0)} IPUs`}
            icon={DollarSign}
            variant="cost"
          />

          <KPICard
            title="Custo Médio Diário"
            value={formatCurrency(dashboardData?.avgDailyCost || 0)}
            subtitle="Baseado no período atual"
            icon={Activity}
            variant="default"
          />

          <KPICard
            title="Organizações Ativas"
            value={dashboardData?.activeOrgs || 0}
            subtitle="Com consumo no período"
            icon={Building2}
            variant="success"
          />

          <KPICard
            title="Total IPUs"
            value={formatIPU(dashboardData?.totalIPU || 0)}
            subtitle="Consumo total do período"
            icon={TrendingUp}
            variant="warning"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CostChart
            title="Evolução de Custos"
            type="area"
            selectedOrg={selectedOrg === "all" ? undefined : selectedOrg}
          />

          <CostChart
            title="Distribuição por Organização"
            type="pie"
            showFilters={false}
            selectedOrg={selectedOrg === "all" ? undefined : selectedOrg}
          />
        </div>

        {/* Hierarchical Cost View */}
        <Card className="bg-gradient-card shadow-medium">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-heading font-bold">
                  Detalhamento Hierárquico de Custos
                </CardTitle>
                <CardDescription>
                  Navegue pelos níveis de detalhamento dos dados de consumo
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAssetTable(true)}
              >
                <Users className="h-4 w-4 mr-2" />
                Ver por Asset
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <h3 className="font-medium text-foreground mb-3">
                Resumo por Organização
              </h3>
              
              <div className="space-y-3">
                {dashboardData?.organizations.length ? (
                  dashboardData.organizations.map((org, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedOrgForDetails(org.org_id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-8 bg-primary rounded-full" />
                        <div>
                          <p className="font-medium text-foreground">{org.org_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatIPU(org.consumption_ipu)} IPUs
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-lg text-foreground">
                          {formatCurrency(org.cost)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {org.percentage}% do total
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum dado de organização encontrado para o período selecionado.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Details Table Modal */}
      {showAssetTable && (
        <AssetDetailsTable 
          onClose={() => setShowAssetTable(false)}
          selectedOrg={selectedOrg === "all" ? undefined : selectedOrg}
        />
      )}

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