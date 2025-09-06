import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "@/hooks/useDashboardData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { ArrowUpDown, Download, Calendar, Filter } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { CYCLE_FILTER_OPTIONS } from "@/lib/cycleFilterOptions";

interface OrganizationComparisonProps {
  selectedOrg?: string;
  selectedCycleFilter?: string;
  availableOrgs?: Array<{ value: string; label: string }>;
  onOrgChange?: (value: string) => void;
  onCycleFilterChange?: (value: string) => void;
}

export function OrganizationComparison({ 
  selectedOrg = "all", 
  selectedCycleFilter = "3",
  availableOrgs = [],
  onOrgChange,
  onCycleFilterChange
}: OrganizationComparisonProps) {
  const { data, loading, getChartData } = useDashboardData(selectedOrg === "all" ? undefined : selectedOrg, selectedCycleFilter);
  const [metric, setMetric] = useState("cost");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatIPU = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // Fetch evolution data to get cycles with organization breakdown
  useEffect(() => {
    const fetchCycleData = async () => {
      if (!getChartData) return;
      
      setChartLoading(true);
      try {
        const evolutionData = await getChartData('evolution', selectedOrg === "all" ? undefined : selectedOrg, selectedCycleFilter);
        
        // Check if evolutionData is an array
        const dataArray = Array.isArray(evolutionData) ? evolutionData : [];
        
        if (dataArray.length === 0) {
          setChartData([]);
          return;
        }

        // For now, we'll create dummy organization data per cycle
        // In a real scenario, you'd need to modify getChartData to return organization breakdown per cycle
        const processedData = dataArray.map((item: any) => ({
          cycle: item.period,
          totalIPU: item.ipu,
          totalCost: item.cost,
          // For demonstration, we'll split data proportionally based on current org distribution
          ...(data?.organizations?.reduce((acc, org, index) => {
            const orgKey = org.org_name.replace(/\s+/g, '_');
            const proportion = org.percentage / 100;
            acc[orgKey] = metric === 'cost' ? (item.cost * proportion) : (item.ipu * proportion);
            return acc;
          }, {} as any) || {})
        }));

        setChartData(processedData);
      } catch (error) {
        console.error('Error fetching cycle data:', error);
        setChartData([]);
      } finally {
        setChartLoading(false);
      }
    };

    fetchCycleData();
  }, [getChartData, selectedOrg, selectedCycleFilter, metric, data?.organizations]);

  // Get unique organizations for creating bars
  const uniqueOrgs = data?.organizations?.map(org => org.org_name) || [];

  // Calculate contracted reference value based on metric
  const contractedReferenceValue = data ? 
    (metric === 'cost' ? (data.contractedIPUs * data.pricePerIPU) : data.contractedIPUs) : 1000; // Default fallback value

  // Color palette for different organizations
  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))", 
    "hsl(var(--accent))",
    "hsl(220 70% 50%)",
    "hsl(280 70% 50%)",
    "hsl(340 70% 50%)",
    "hsl(60 70% 50%)",
    "hsl(120 70% 50%)"
  ];

  const handleDownload = async () => {
    if (!chartRef.current) return;
    
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      
      const link = document.createElement('a');
      link.download = `comparacao-organizacoes-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast("Gráfico exportado com sucesso!");
    } catch (error) {
      toast("Erro ao exportar gráfico");
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">Ciclo: {label}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.value > 0) {
              return (
                <p key={index} style={{ color: entry.color }}>
                  {entry.dataKey.replace(/_/g, ' ')}: {metric === 'cost' ? formatCurrency(entry.value) : formatIPU(entry.value)}
                </p>
              );
            }
            return null;
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-card shadow-medium">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-heading font-bold">
              Análise Custos por Organização
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Custos por organização ao longo dos ciclos
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>
          
          {/* Organization Filter */}
          <Select value={selectedOrg} onValueChange={onOrgChange}>
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

          {/* Cycle Filter */}
          <Select value={selectedCycleFilter} onValueChange={onCycleFilterChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CYCLE_FILTER_OPTIONS.map(option => 
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ipu">IPUs</SelectItem>
              <SelectItem value="cost">Custo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters */}
        { selectedOrg !== 'all' && (
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              Organização: {availableOrgs.find(o => o.value === selectedOrg)?.label || selectedOrg}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {chartLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando dados dos ciclos...</p>
            </div>
          </div>
        ) : (
          <div ref={chartRef} className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 90 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="cycle" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(value) => 
                    metric === 'cost' ? formatCurrency(value) : formatIPU(value)
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {/* Reference line for contracted value - always displayed */}
                <ReferenceLine 
                  y={contractedReferenceValue} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                  label={{ 
                    value: `Contratado: ${metric === 'cost' ? formatCurrency(contractedReferenceValue) : formatIPU(contractedReferenceValue)}`,
                    position: "top",
                    style: { fill: "hsl(var(--destructive))", fontSize: "12px", fontWeight: "500" }
                  }}
                />
                
                {uniqueOrgs.map((orgName, index) => (
                  <Bar 
                    key={orgName}
                    dataKey={orgName.replace(/\s+/g, '_')} 
                    fill={colors[index % colors.length]} 
                    radius={[4, 4, 0, 0]}
                    name={orgName}
                    stackId="stack"
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}