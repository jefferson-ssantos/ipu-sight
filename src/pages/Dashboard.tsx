import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { CostChart } from "@/components/dashboard/CostChart";
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

// Mock data - Será substituído pela integração com Supabase
const mockKPIData = {
  totalCost: 189500,
  totalIPU: 1895000,
  avgDailyCost: 6316,
  activeOrgs: 3,
  currentPeriod: "Abril 2025",
  periodStart: "01/04/2025",
  periodEnd: "30/04/2025"
};

const mockHierarchicalData = [
  {
    level: "summary",
    title: "Resumo por Organização",
    data: [
      { name: "Org Produção", ipu: 1231750, cost: 123175, percentage: 65 },
      { name: "Org Desenvolvimento", ipu: 473750, cost: 47375, percentage: 25 },
      { name: "Org Teste", ipu: 189500, cost: 18950, percentage: 10 }
    ]
  }
];

export default function Dashboard() {
  const [selectedOrg, setSelectedOrg] = useState("production");
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = () => {
    setIsLoading(true);
    // TODO: Implementar refresh dos dados via Supabase
    setTimeout(() => setIsLoading(false), 1500);
  };

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
      return `${(value / 1000000).toFixed(1)}M`;
    }
    return `${(value / 1000).toFixed(0)}K`;
  };

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
            <div>
              <h1 className="text-3xl font-heading font-bold mb-2">
                FinOps Dashboard
              </h1>
              <p className="text-primary-foreground/80 text-lg">
                Monitoramento de custos IDMC - {mockKPIData.currentPeriod}
              </p>
              <div className="flex items-center gap-4 mt-3">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  <Calendar className="h-3 w-3 mr-1" />
                  {mockKPIData.periodStart} - {mockKPIData.periodEnd}
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  <Building2 className="h-3 w-3 mr-1" />
                  Org de Produção
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Org de Produção</SelectItem>
                  <SelectItem value="development">Org de Desenvolvimento</SelectItem>
                  <SelectItem value="test">Org de Teste</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
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
            value={formatCurrency(mockKPIData.totalCost)}
            subtitle={`${formatIPU(mockKPIData.totalIPU)} IPUs`}
            icon={DollarSign}
            variant="cost"
            trend={{
              value: 12.5,
              label: "vs. ciclo anterior",
              direction: "up"
            }}
          />

          <KPICard
            title="Custo Médio Diário"
            value={formatCurrency(mockKPIData.avgDailyCost)}
            subtitle="Baseado no período atual"
            icon={Activity}
            variant="default"
            trend={{
              value: 3.2,
              label: "vs. média histórica",
              direction: "down"
            }}
          />

          <KPICard
            title="Organizações Ativas"
            value={mockKPIData.activeOrgs}
            subtitle="Com consumo no período"
            icon={Building2}
            variant="success"
          />

          <KPICard
            title="Eficiência de Custos"
            value="87%"
            subtitle="Score de otimização"
            icon={TrendingUp}
            variant="warning"
            trend={{
              value: 5.8,
              label: "melhoria",
              direction: "up"
            }}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CostChart
            title="Evolução de Custos"
            type="area"
          />

          <CostChart
            title="Distribuição por Organização"
            type="pie"
            showFilters={false}
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
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Ver por Asset
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {mockHierarchicalData.map((section, index) => (
              <div key={index} className="space-y-4">
                <h3 className="font-medium text-foreground mb-3">
                  {section.title}
                </h3>
                
                <div className="space-y-3">
                  {section.data.map((item, itemIndex) => (
                    <div 
                      key={itemIndex}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-8 bg-primary rounded-full" />
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatIPU(item.ipu)} IPUs
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-lg text-foreground">
                          {formatCurrency(item.cost)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.percentage}% do total
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}