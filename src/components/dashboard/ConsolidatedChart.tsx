import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface ConsolidatedChartProps {
  selectedOrg?: string;
  availableOrgs: Array<{value: string, label: string}>;
}

interface ChartDataItem {
  period: string;
  [key: string]: any;
}

interface ProjectOption {
  value: string;
  label: string;
}

interface MetricOption {
  value: string;
  label: string;
}

// Removed period options as requested

const colors = [
  'hsl(24 70% 60%)', // Orange
  'hsl(283 70% 60%)', // Purple
  'hsl(142 70% 45%)', // Green
  'hsl(346 70% 60%)', // Pink
  'hsl(197 70% 55%)', // Blue
  'hsl(43 70% 55%)', // Yellow
  'hsl(15 70% 55%)', // Red-orange
  'hsl(260 70% 65%)', // Violet
  'hsl(120 35% 50%)', // Teal
  'hsl(39 70% 50%)', // Amber
  'hsl(210 40% 60%)', // Slate
  'hsl(340 60% 65%)', // Rose
];

export function ConsolidatedChart({ selectedOrg, availableOrgs }: ConsolidatedChartProps) {
  const [selectedOrgLocal, setSelectedOrgLocal] = useState<string>("all");
  const [selectedProjects, setSelectedProjects] = useState<string[]>(["all"]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["all"]);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [metricOptions, setMetricOptions] = useState<MetricOption[]>([]);
  const [allDataKeys, setAllDataKeys] = useState<string[]>([]);

  const formatCurrency = (value: number) => {
    if (value === 0) return "R$ 0";
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Get user's client configurations
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

      // Build query for api_consumoasset
      let query = supabase
        .from('api_consumoasset')
        .select('configuracao_id, meter_name, consumption_date, project_name, consumption_ipu, org_id')
        .in('configuracao_id', configIds)
        .gt('consumption_ipu', 0)
        .order('consumption_date', { ascending: true });

      // Apply organization filter
      if (selectedOrgLocal !== "all") {
        query = query.eq('org_id', selectedOrgLocal);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching data:', error);
        return;
      }

      if (!data || data.length === 0) {
        setChartData([]);
        setProjectOptions([{ value: "all", label: "Todos os Projetos" }]);
        setMetricOptions([{ value: "all", label: "Todas as Métricas" }]);
        return;
      }

      // Process and aggregate data by consumption_date, project, and metric
      const periodMap = new Map<string, any>();
      const projectsSet = new Set<string>();
      const metricsSet = new Set<string>();

      data.forEach((item: any) => {
        const periodKey = item.consumption_date;
        const projectName = item.project_name || "Projeto não informado";
        const metricName = item.meter_name || "Métrica não informada";
        const cost = (item.consumption_ipu || 0) * 3.25; // assuming price per IPU

        // Only include if cost > 0
        if (cost <= 0) return;

        projectsSet.add(projectName);
        metricsSet.add(metricName);

        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, { period: periodKey });
        }

        const key = `${projectName}_${metricName}`;
        const existing = periodMap.get(periodKey)[key] || 0;
        periodMap.get(periodKey)[key] = existing + cost;
      });

      // Convert to array and sort by date, limit to last 3 cycles
      const processedData = Array.from(periodMap.values())
        .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime())
        .slice(-3); // Last 3 cycles as default

      setChartData(processedData);

      // Set up project and metric options
      const projectsList = Array.from(projectsSet).sort();
      const metricsList = Array.from(metricsSet).sort();
      
      setProjectOptions([
        { value: "all", label: "Todos os Projetos" },
        ...projectsList.map(project => ({ value: project, label: project }))
      ]);

      setMetricOptions([
        { value: "all", label: "Todas as Métricas" },
        ...metricsList.map(metric => ({ value: metric, label: metric }))
      ]);

      // Generate all possible data keys for filtering
      const allKeys: string[] = [];
      projectsList.forEach(project => {
        metricsList.forEach(metric => {
          allKeys.push(`${project}_${metric}`);
        });
      });
      setAllDataKeys(allKeys);

    } catch (error) {
      console.error('Error fetching chart data:', error);
      toast.error('Erro ao carregar dados do gráfico');
    } finally {
      setLoading(false);
    }
  }, [selectedOrgLocal]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  const getFilteredDataKeys = () => {
    if (selectedProjects.includes("all") && selectedMetrics.includes("all")) {
      return allDataKeys;
    }

    const keys: string[] = [];
    const projects = selectedProjects.includes("all") ? 
      projectOptions.filter(p => p.value !== "all").map(p => p.value) : 
      selectedProjects;
    const metrics = selectedMetrics.includes("all") ? 
      metricOptions.filter(m => m.value !== "all").map(m => m.value) : 
      selectedMetrics;

    projects.forEach(project => {
      metrics.forEach(metric => {
        keys.push(`${project}_${metric}`);
      });
    });

    return keys;
  };

  const handleDownload = async () => {
    try {
      const chartElement = document.getElementById('consolidated-chart');
      if (!chartElement) return;

      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `custo-consolidado-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast.success('Gráfico baixado com sucesso!');
    } catch (error) {
      console.error('Error downloading chart:', error);
      toast.error('Erro ao baixar o gráfico');
    }
  };

  const handleProjectChange = (value: string) => {
    if (value === "all") {
      setSelectedProjects(["all"]);
    } else {
      const newSelection = selectedProjects.includes("all") 
        ? [value]
        : selectedProjects.includes(value)
          ? selectedProjects.filter(p => p !== value)
          : [...selectedProjects, value];
      
      setSelectedProjects(newSelection.length === 0 ? ["all"] : newSelection);
    }
  };

  const handleMetricChange = (value: string) => {
    if (value === "all") {
      setSelectedMetrics(["all"]);
    } else {
      const newSelection = selectedMetrics.includes("all") 
        ? [value]
        : selectedMetrics.includes(value)
          ? selectedMetrics.filter(m => m !== value)
          : [...selectedMetrics, value];
      
      setSelectedMetrics(newSelection.length === 0 ? ["all"] : newSelection);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
      
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((item: any, index: number) => {
            const [project, metric] = item.dataKey.split('_');
            return (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">
                  {project} - {metric}:
                </span>
                <span className="font-medium text-foreground">
                  {formatCurrency(item.value)}
                </span>
              </div>
            );
          })}
          <div className="border-t border-border mt-2 pt-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const filteredDataKeys = getFilteredDataKeys();

  return (
    <Card className="bg-gradient-card shadow-medium">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-heading font-bold">
              Análise Consolidada de Custos
            </CardTitle>
            <div className="text-sm text-muted-foreground mt-1">
              Custos por projeto e métrica ao longo dos ciclos
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Baixar
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>
          
          <Select value={selectedOrgLocal} onValueChange={setSelectedOrgLocal}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Organização" />
            </SelectTrigger>
            <SelectContent>
              {availableOrgs.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedProjects.includes("all") ? "all" : "custom"} onValueChange={(value) => {
            if (value === "all") setSelectedProjects(["all"]);
          }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Projetos" />
            </SelectTrigger>
            <SelectContent>
              {projectOptions.map(option => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  onClick={() => handleProjectChange(option.value)}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMetrics.includes("all") ? "all" : "custom"} onValueChange={(value) => {
            if (value === "all") setSelectedMetrics(["all"]);
          }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Métricas" />
            </SelectTrigger>
            <SelectContent>
              {metricOptions.map(option => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  onClick={() => handleMetricChange(option.value)}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters */}
        {(!selectedProjects.includes("all") || !selectedMetrics.includes("all")) && (
          <div className="flex flex-wrap gap-2 mt-2">
            {!selectedProjects.includes("all") && selectedProjects.map(project => (
              <Badge key={project} variant="secondary" className="text-xs">
                Projeto: {project}
              </Badge>
            ))}
            {!selectedMetrics.includes("all") && selectedMetrics.map(metric => (
              <Badge key={metric} variant="secondary" className="text-xs">
                Métrica: {metric}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div id="consolidated-chart" className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Carregando dados...</p>
              </div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-muted-foreground mb-2">Nenhum dado encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Tente ajustar os filtros ou o período selecionado
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="period" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {filteredDataKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="costs"
                    fill={colors[index % colors.length]}
                    name={key.replace('_', ' - ')}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}