import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardData } from "@/hooks/useDashboardData";
import { CYCLE_FILTER_OPTIONS } from "@/lib/cycleFilterOptions";

interface ChartDataItem {
  period: string;
  [key: string]: any;
}

interface ProjectOption {
  value: string;
  label: string;
}

interface ProjectChartProps {
  selectedOrg?: string;
  availableOrgs: Array<{value: string, label: string}>;
}

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

const CustomTooltip = ({ active, payload, label, valueType, formatCurrency, formatIPU }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
    
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-foreground mb-2">{label}</p>
        {payload.map((item: any, index: number) => {
          const project = item.dataKey;
          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">
                {project}:
              </span>
              <span className="font-medium text-foreground">
                {valueType === 'cost' ? formatCurrency(item.value) : formatIPU(item.value)}
              </span>
            </div>
          );
        })}
        <div className="border-t border-border mt-2 pt-2">
          <div className="flex justify-between items-center text-sm font-medium">
            <span>Total:</span>
            <span>{valueType === 'cost' ? formatCurrency(total) : formatIPU(total)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function ProjectChart({ selectedOrg, availableOrgs }: ProjectChartProps) {
  const { user } = useAuth();
  const { availableCycles } = useDashboardData();
  const [selectedOrgLocal, setSelectedOrgLocal] = useState<string>(selectedOrg || "all");
  const [period, setPeriod] = useState("12");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [valueType, setValueType] = useState<"cost" | "ipu">("cost");
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [allDataKeys, setAllDataKeys] = useState<string[]>([]);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }, []);

  const formatIPU = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  }, []);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!user) return;
      
      if (!availableCycles || availableCycles.length === 0) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('cliente_id')
          .eq('id', user.id)
          .single();
        
        if (!profile?.cliente_id) {
          setLoading(false);
          return;
        }

        const { data: client } = await supabase
          .from('api_clientes')
          .select('preco_por_ipu')
          .eq('id', profile.cliente_id)
          .single();

        if (!client?.preco_por_ipu) {
          toast.error("Preço por IPU não configurado para o cliente.");
          setLoading(false);
          return;
        }
        const pricePerIpu = client.preco_por_ipu;

        const { data: configs } = await supabase
          .from('api_configuracaoidmc')
          .select('id')
          .eq('cliente_id', profile.cliente_id);
        
        if (!configs || configs.length === 0) {
          setLoading(false);
          return;
        }
        
        const configIds = configs.map(config => config.id);
        
        const cyclesToShow = period === 'all'
          ? availableCycles
          : availableCycles.slice(0, parseInt(period));
        
        if (cyclesToShow.length === 0) {
          setChartData([]);
          setAllDataKeys([]);
          setProjectOptions([{ value: "all", label: "Todos os Projetos" }]);
          setLoading(false);
          return;
        }

        const minDate = cyclesToShow[cyclesToShow.length - 1].billing_period_start_date;
        const maxDate = cyclesToShow[0].billing_period_end_date;
        
        // Use direct query with proper pagination to get ALL data
        const getAllProjectData = async () => {
          let allData: any[] = [];
          let from = 0;
          const batchSize = 1000;
          let hasMore = true;

          while (hasMore) {
            let query = supabase
              .from('api_consumoasset')
              .select('project_name, consumption_date, consumption_ipu, runtime_environment, org_id')
              .in('configuracao_id', configIds)
              .not('project_name', 'is', null)
              .not('project_name', 'eq', '')
              .gt('consumption_ipu', 0)
              .gte('consumption_date', minDate)
              .lte('consumption_date', maxDate);

            // Apply organization filter if selected
            if (selectedOrgLocal !== "all") {
              query = query.eq('org_id', selectedOrgLocal);
            }

            const { data: batchData, error } = await query
              .order('consumption_date', { ascending: false })
              .range(from, from + batchSize - 1);

            if (error) throw error;
            
            if (batchData && batchData.length > 0) {
              allData = [...allData, ...batchData];
              from += batchSize;
              hasMore = batchData.length === batchSize;
            } else {
              hasMore = false;
            }
          }

          return allData;
        };

        const projectData = await getAllProjectData();

        if (!projectData || projectData.length === 0) {
          setChartData([]);
          setAllDataKeys([]);
          setProjectOptions([{ value: "all", label: "Todos os Projetos" }]);
          setLoading(false);
          return;
        }

        // Group data by cycle and project
        const cycleProjectData: { [key: string]: { [project: string]: number } } = {};
        const cycleInfoMap: { [key: string]: any } = {};
        const projectSet = new Set<string>();

        // Initialize all cycles with empty data
        cyclesToShow.forEach(cycle => {
          const periodKey = `${new Date(cycle.billing_period_start_date + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})} - ${new Date(cycle.billing_period_end_date + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`;
          cycleProjectData[periodKey] = {};
          cycleInfoMap[periodKey] = cycle;
        });

        projectData.forEach(item => {
          if (!item.consumption_date || !item.project_name) return;
          
          const consumptionDate = new Date(item.consumption_date);
          const cycle = cyclesToShow.find(c => {
            const startDate = new Date(c.billing_period_start_date);
            const endDate = new Date(c.billing_period_end_date);
            return consumptionDate >= startDate && consumptionDate <= endDate;
          });

          if (!cycle) return;

          const periodKey = `${new Date(cycle.billing_period_start_date + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})} - ${new Date(cycle.billing_period_end_date + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`;
          
          if (!cycleProjectData[periodKey][item.project_name]) {
            cycleProjectData[periodKey][item.project_name] = 0;
          }
          
          if (valueType === "cost") {
            cycleProjectData[periodKey][item.project_name] += (item.consumption_ipu || 0) * pricePerIpu;
          } else {
            cycleProjectData[periodKey][item.project_name] += (item.consumption_ipu || 0);
          }
          projectSet.add(item.project_name);
        });

        // Convert to chart data and sort by cycle start date (oldest first - chronological order)
        const chartDataArray: ChartDataItem[] = Object.entries(cycleProjectData)
          .map(([period, projects]) => {
            const dataItem: ChartDataItem = { period };
            // Ensure all projects appear in all cycles (even with 0 value)
            projectSet.forEach(project => {
              dataItem[project] = projects[project] || 0;
            });
            const cycleInfo = cycleInfoMap[period];
            return { ...dataItem, _sortDate: new Date(cycleInfo.billing_period_start_date) };
          })
          .sort((a, b) => a._sortDate.getTime() - b._sortDate.getTime()) // Changed to ascending order
          .map(({ _sortDate, ...item }) => item);

        const allProjects = Array.from(projectSet).sort();
        
        setChartData(chartDataArray);
        setAllDataKeys(allProjects);
        
        const newProjectOptions = allProjects.map(project => ({ value: project, label: project }));
        setProjectOptions([{ value: "all", label: "Todos os Projetos" }, ...newProjectOptions]);
        
      } catch (error) {
        toast.error('Erro ao carregar dados de projetos');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [user, period, selectedOrgLocal, availableCycles, valueType]);

  // Update selectedOrgLocal when selectedOrg prop changes
  useEffect(() => {
    setSelectedOrgLocal(selectedOrg || "all");
  }, [selectedOrg]);

  const getFilteredDataKeys = () => {
    if (selectedProject === "all") {
      return allDataKeys;
    }
    
    const filtered = allDataKeys.filter(key => key === selectedProject);
    
    if (filtered.length === 0 && selectedProject !== "all") {
      return [];
    }

    return filtered;
  };

  const filteredDataKeys = getFilteredDataKeys();

  const chartDataWithDisplayTotal = useMemo(() => chartData.map(d => {
    const displayTotal = filteredDataKeys.reduce((acc, key) => acc + (d[key] || 0), 0);
    return { ...d, displayTotal };
  }), [chartData, filteredDataKeys]);

  const yAxisDomain = useMemo(() => {
    if (chartDataWithDisplayTotal.length === 0) return [0, 1000]; // Default if no data

    let maxVal = 0;
    chartDataWithDisplayTotal.forEach(d => {
      const total = d.displayTotal || 0;
      if (total > maxVal) {
        maxVal = total;
      }
    });

    return [0, maxVal * 1.1]; // Add 10% padding
  }, [chartDataWithDisplayTotal]);

  const renderCustomizedLabel = useCallback((props: any) => {
    const { x, y, width, value } = props;
    if (value > 0) {
      return (
        <text x={x + width / 2} y={y} fill="#3a3a3a" textAnchor="middle" dy={-6} fontSize={12} fontWeight="bold">
          {valueType === 'cost' ? formatCurrency(value) : formatIPU(value)}
        </text>
      );
    }
    return null;
  }, [valueType, formatCurrency, formatIPU]);

  const handleDownload = async () => {
    try {
      const chartElement = document.getElementById('project-chart');
      if (!chartElement) return;

      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `custo-projetos-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast.success('Gráfico baixado com sucesso!');
    } catch (error) {
      toast.error('Erro ao baixar o gráfico');
    }
  };

  const yAxisTickFormatter = useCallback((value: number) => 
    valueType === 'cost' ? formatCurrency(value) : formatIPU(value),
    [valueType, formatCurrency, formatIPU]
  );

  const renderTooltip = useCallback((props: any) => (
    <CustomTooltip {...props} valueType={valueType} formatCurrency={formatCurrency} formatIPU={formatIPU} />
  ), [valueType, formatCurrency, formatIPU]);

  return (
    <Card className="bg-gradient-card shadow-medium">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-heading font-bold">
              Análise Consolidada de Custos por Projeto
            </CardTitle>
            <div className="text-sm text-muted-foreground mt-1">
              Custos por projetos ao longo dos ciclos
            </div>
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

          <Select value={selectedOrgLocal} onValueChange={setSelectedOrgLocal}>
            <SelectTrigger className="w-auto min-w-44 max-w-64">
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
          
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-auto min-w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CYCLE_FILTER_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Projetos" />
            </SelectTrigger>
            <SelectContent>
              {projectOptions.map(option => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={valueType} onValueChange={(value: "cost" | "ipu") => setValueType(value)}>
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
        { selectedProject !== 'all' && (
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              Projeto: {projectOptions.find(p => p.value === selectedProject)?.label || selectedProject}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div id="project-chart" className="h-[400px]">
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
              <BarChart data={chartDataWithDisplayTotal} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
                  tickFormatter={yAxisTickFormatter}
                  domain={yAxisDomain}
                />
                <Tooltip content={renderTooltip} />

                {filteredDataKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="costs"
                    fill={colors[index % colors.length]}
                    radius={[4, 4, 0, 0]}
                    name={key}
                  >
                    {index === filteredDataKeys.length - 1 && (
                        <LabelList dataKey="displayTotal" content={renderCustomizedLabel} />
                    )}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}