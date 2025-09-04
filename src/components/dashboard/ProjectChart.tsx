import { useState, useEffect } from "react";
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

interface ProjectChartProps {
  selectedOrg?: string;
  availableOrgs: Array<{value: string, label: string}>;
  availableCycles: Array<{billing_period_start_date: string, billing_period_end_date: string}>;
}

interface ChartDataItem {
  period: string;
  [key: string]: any;
}

interface ProjectOption {
  value: string;
  label: string;
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

export function ProjectChart({ selectedOrg, availableOrgs, availableCycles }: ProjectChartProps) {
  const { user } = useAuth();
  const [selectedOrgLocal, setSelectedOrgLocal] = useState<string>(selectedOrg || "all");
  const [period, setPeriod] = useState("3"); // Default to 3 cycles
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [allDataKeys, setAllDataKeys] = useState<string[]>([]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const fetchProjectData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get user's client ID and configurations
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
      
      // Get the selected cycles based on period
      const cyclesToShow = availableCycles.slice(0, parseInt(period));
      
      // Fetch project consumption data from api_consumoasset
      let query = supabase
        .from('api_consumoasset')
        .select('project_name, consumption_date, consumption_ipu')
        .in('configuracao_id', configIds)
        .not('project_name', 'is', null)
        .not('project_name', 'eq', '')
        .gt('consumption_ipu', 0);

      // Apply organization filter if selected
      if (selectedOrgLocal !== "all") {
        query = query.eq('org_id', selectedOrgLocal);
      }

      const { data: projectData, error } = await query;
      
      if (error) {
        console.error('Error fetching project data:', error);
        toast.error('Erro ao carregar dados de projetos');
        return;
      }

      if (!projectData || projectData.length === 0) {
        setChartData([]);
        setAllDataKeys([]);
        setProjectOptions([{ value: "all", label: "Todos os Projetos" }]);
        return;
      }

      // Group data by billing periods and projects
      const groupedData: { [key: string]: { [project: string]: number } } = {};
      const projectSet = new Set<string>();

      projectData.forEach(item => {
        if (!item.consumption_date || !item.project_name) return;
        
        // Find which billing cycle this consumption date belongs to
        const consumptionDate = new Date(item.consumption_date);
        const cycle = cyclesToShow.find(c => {
          const startDate = new Date(c.billing_period_start_date);
          const endDate = new Date(c.billing_period_end_date);
          return consumptionDate >= startDate && consumptionDate <= endDate;
        });

        if (!cycle) return;

        const periodKey = `${cycle.billing_period_start_date} - ${cycle.billing_period_end_date}`;
        
        if (!groupedData[periodKey]) {
          groupedData[periodKey] = {};
        }
        
        if (!groupedData[periodKey][item.project_name]) {
          groupedData[periodKey][item.project_name] = 0;
        }
        
        groupedData[periodKey][item.project_name] += item.consumption_ipu || 0;
        projectSet.add(item.project_name);
      });

      // Convert to chart data format
      const chartDataArray: ChartDataItem[] = Object.entries(groupedData).map(([period, projects]) => {
        const dataItem: ChartDataItem = { period };
        Object.entries(projects).forEach(([project, consumption]) => {
          dataItem[project] = consumption;
        });
        return dataItem;
      });

      // Sort by period (most recent first)
      chartDataArray.sort((a, b) => {
        const aStart = a.period.split(' - ')[0];
        const bStart = b.period.split(' - ')[0];
        return new Date(bStart).getTime() - new Date(aStart).getTime();
      });

      const allProjects = Array.from(projectSet).sort();
      
      setChartData(chartDataArray);
      setAllDataKeys(allProjects);
      
      // Update project options
      const newProjectOptions = allProjects.map(project => ({ value: project, label: project }));
      setProjectOptions([{ value: "all", label: "Todos os Projetos" }, ...newProjectOptions]);
      
    } catch (error) {
      console.error('Error fetching project data:', error);
      toast.error('Erro ao carregar dados de projetos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [selectedOrgLocal, period, user, availableCycles]);

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

  const chartDataWithDisplayTotal = chartData.map(d => {
    const displayTotal = filteredDataKeys.reduce((acc, key) => acc + (d[key] || 0), 0);
    return { ...d, displayTotal };
  });

  const yAxisDomain = () => {
    if (chartDataWithDisplayTotal.length === 0) return [0, 1000]; // Default if no data

    let maxVal = 0;
    chartDataWithDisplayTotal.forEach(d => {
      const total = d.displayTotal || 0;
      if (total > maxVal) {
        maxVal = total;
      }
    });

    return [0, maxVal * 1.1]; // Add 10% padding
  };

  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value > 0) {
      return (
        <text x={x + width / 2} y={y} fill="#3a3a3a" textAnchor="middle" dy={-6} fontSize={12} fontWeight="bold">
          {value.toLocaleString('pt-BR')} IPUs
        </text>
      );
    }
    return null;
  };

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
      link.download = `consumo-projetos-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast.success('Gráfico baixado com sucesso!');
    } catch (error) {
      console.error('Error downloading chart:', error);
      toast.error('Erro ao baixar o gráfico');
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
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
                  {item.value.toLocaleString('pt-BR')} IPUs
                </span>
              </div>
            );
          })}
          <div className="border-t border-border mt-2 pt-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span>Total:</span>
              <span>{total.toLocaleString('pt-BR')} IPUs</span>
            </div>
          </div>
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
              Consumo por Projetos
            </CardTitle>
            <div className="text-sm text-muted-foreground mt-1">
              Consumo de IPUs por projeto ao longo dos ciclos
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
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Ciclos</SelectItem>
              <SelectItem value="1" disabled={availableCycles.length < 1}>Ciclo Atual</SelectItem>
              <SelectItem value="2" disabled={availableCycles.length < 2}>Últimos 2 Ciclos</SelectItem>
              <SelectItem value="3" disabled={availableCycles.length < 3}>Últimos 3 Ciclos</SelectItem>
              <SelectItem value="6" disabled={availableCycles.length < 6}>Últimos 6 Ciclos</SelectItem>
              <SelectItem value="9" disabled={availableCycles.length < 9}>Últimos 9 Ciclos</SelectItem>
              <SelectItem value="12" disabled={availableCycles.length < 12}>Últimos 12 Ciclos</SelectItem>
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
        </div>

        {/* Active Filters */}
        {selectedProject !== 'all' && (
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
                  tickFormatter={(value) => `${value.toLocaleString('pt-BR')} IPUs`}
                  domain={yAxisDomain()}
                />
                <Tooltip content={<CustomTooltip />} />

                {filteredDataKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="projects"
                    fill={colors[index % colors.length]}
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