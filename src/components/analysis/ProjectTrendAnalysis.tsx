import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDashboardData } from "@/hooks/useDashboardData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Download, ChevronDown, Check } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function ProjectTrendAnalysis() {
  const { data, loading, getChartData, availableCycles } = useDashboardData();
  const { user } = useAuth();
  const [period, setPeriod] = useState("12");
  const [selectedMetric, setSelectedMetric] = useState("cost");
  const [selectedProjects, setSelectedProjects] = useState<string[]>(["all"]);
  const [availableProjects, setAvailableProjects] = useState<{ id: string; name: string }[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  // Cores personalizadas fornecidas pelo usuário
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

  // Buscar projetos disponíveis da api_consumoasset
  useEffect(() => {
    const fetchAvailableProjects = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('cliente_id')
          .eq('id', user?.id)
          .maybeSingle();

        if (!profile?.cliente_id) return;

        const { data: configs } = await supabase
          .from('api_configuracaoidmc')
          .select('id')
          .eq('cliente_id', profile.cliente_id);

        if (!configs || configs.length === 0) return;

        const configIds = configs.map(config => config.id);

        // Buscar project_name únicos da tabela api_consumoasset
        const { data: projectData, error } = await supabase
          .from('api_consumoasset')
          .select('project_name')
          .in('configuracao_id', configIds)
          .gt('consumption_ipu', 0)
          .not('project_name', 'is', null)
          .neq('project_name', '');

        if (error) {
          console.error('Erro ao buscar projetos:', error);
          return;
        }

        // Extrair valores únicos de project_name e ordenar alfabeticamente
        const uniqueProjects = [...new Set(
          projectData
            ?.map(item => item.project_name)
            .filter(Boolean) || []
        )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

        // Criar lista com "Todos os Projetos" no topo
        const projects = [
          { id: 'all', name: 'Todos os Projetos' },
          ...uniqueProjects.map(projectName => ({
            id: projectName,
            name: projectName
          }))
        ];

        setAvailableProjects(projects);
      } catch (error) {
        console.error('Erro ao buscar projetos:', error);
        setAvailableProjects([{ id: 'all', name: 'Todos os Projetos' }]);
      }
    };
    
    if (getChartData) {
      fetchAvailableProjects();
    }
  }, [getChartData]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Add 1 to period to compensate for filtering out current incomplete cycle
        const adjustedPeriod = (parseInt(period) + 1).toString();
        
        // Buscar dados multi-série para projetos
        const multiSeriesData = await getMultiSeriesChartData(adjustedPeriod, selectedProjects);
        
        // Filter out incomplete current cycle
        const filteredData = filterCompleteCycles(multiSeriesData);
        
        // Now limit to the requested number of cycles
        const limitedData = filteredData.slice(-parseInt(period));
        setChartData(limitedData);
      } catch (error) {
        setChartData([]);
      }
    };
    if (getChartData) {
      fetchData();
    }
  }, [period, selectedMetric, selectedProjects, getChartData]);

  // Nova função para buscar dados multi-série usando edge function para projetos
  const getMultiSeriesChartData = async (cycleLimit: string, selectedProjectsList: string[]) => {
    try {
      console.log('🚀 Calling edge function for project multi-series data');
      
      const { data: response, error } = await supabase.functions.invoke('get-multi-series-data', {
        body: {
          cycleLimit: parseInt(cycleLimit),
          selectedMeters: selectedProjectsList, // mantém compatibilidade
          selectedItems: selectedProjectsList,
          selectedMetric: selectedMetric,
          dimension: 'project'
        }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw error;
      }

      console.log('✅ Edge function response:', response);
      return response.data || [];
    } catch (error) {
      console.error('❌ Error calling edge function:', error);
      return [];
    }
  };

  const filterCompleteCycles = (data: any[]): any[] => {
    const today = new Date();
    return data.filter(item => {
      // Check if the cycle has ended based on periodEnd or period string
      let endDate: Date;
      
      if (item.periodEnd) {
        endDate = new Date(item.periodEnd);
      } else if (item.period && item.period.includes(' - ')) {
        const periodParts = item.period.split(' - ');
        const endDateStr = periodParts[1];
        endDate = new Date(endDateStr.split('/').reverse().join('-')); // Convert DD/MM/YYYY to YYYY-MM-DD
      } else {
        return true; // If we can't determine the end date, include it
      }
      
      return endDate <= today; // Only include cycles that have already ended
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatIPU = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const getSelectedProjectsLabels = () => {
    if (selectedProjects.includes('all')) return 'Todos os Projetos';
    if (selectedProjects.length === 0) return 'Selecione os projetos';
    if (selectedProjects.length === 1) {
      const foundProject = availableProjects.find(p => p.id === selectedProjects[0]);
      return foundProject?.name || selectedProjects[0];
    }
    return `${selectedProjects.length} projetos selecionados`;
  };

  const handleProjectToggle = (projectId: string, checked: boolean) => {
    if (projectId === 'all') {
      if (checked) {
        setSelectedProjects(['all']);
      } else {
        setSelectedProjects([]);
      }
    } else {
      let newSelection = [...selectedProjects];
      
      // Remove 'all' se estiver selecionado
      newSelection = newSelection.filter(id => id !== 'all');
      
      if (checked) {
        // Adicionar projeto se não estiver selecionado
        if (!newSelection.includes(projectId)) {
          newSelection.push(projectId);
        }
      } else {
        // Remover projeto
        newSelection = newSelection.filter(id => id !== projectId);
      }
      
      // Se nenhum projeto estiver selecionado, selecionar 'all'
      if (newSelection.length === 0) {
        newSelection = ['all'];
      }
      
      setSelectedProjects(newSelection);
    }
  };

  const getMetricLabel = () => {
    return selectedMetric === 'cost' ? 'Custo Total' : 'IPUs Totais';
  };

  const getValueFormatter = () => {
    if (selectedMetric === 'cost') return formatCurrency;
    return formatIPU;
  };

  const calculateTrend = () => {
    if (chartData.length < 2) return { percentage: 0, isPositive: false, isStable: true };
    
    const currentPeriodData = chartData[chartData.length - 1];
    const previousPeriodData = chartData[chartData.length - 2];
    
    if (!currentPeriodData || !previousPeriodData) return { percentage: 0, isPositive: false, isStable: true };
    
    // Calcular valores com base nos projetos selecionados
    let currentValue = 0;
    let previousValue = 0;
    
    if (selectedProjects.includes('all')) {
      // Se "todos os projetos" estiver selecionado, usar linha total
      const currentKey = selectedMetric === 'cost' ? 'totalCost' : 'totalIPU';
      currentValue = currentPeriodData[currentKey] || 0;
      previousValue = previousPeriodData[currentKey] || 0;
    } else {
      // Somar apenas os projetos selecionados
      const projectsToSum = availableProjects.filter(p => selectedProjects.includes(p.id));
      
      for (const project of projectsToSum) {
        const projectKey = project.id.replace(/[^a-zA-Z0-9]/g, '_');
        const dataKey = selectedMetric === 'cost' ? `${projectKey}_cost` : `${projectKey}_ipu`;
        
        currentValue += currentPeriodData[dataKey] || 0;
        previousValue += previousPeriodData[dataKey] || 0;
      }
    }
    
    // Se o período atual está incompleto, projete o valor total baseado na média diária
    const today = new Date();
    const currentPeriodStart = new Date(currentPeriodData.periodStart || currentPeriodData.period?.split(' - ')[0]);
    const currentPeriodEnd = new Date(currentPeriodData.periodEnd || currentPeriodData.period?.split(' - ')[1]);
    
    if (currentPeriodEnd > today) {
      // Período atual ainda não terminou - calcular projeção
      const totalDaysInPeriod = Math.ceil((currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
      const daysElapsed = Math.ceil((today.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysElapsed > 0 && totalDaysInPeriod > daysElapsed) {
        const dailyAverage = currentValue / daysElapsed;
        currentValue = dailyAverage * totalDaysInPeriod; // Projeção para o período completo
      }
    }
    
    const percentage = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
    const absolutePercentage = Math.abs(percentage);
    
    // Considerar estável se variação for menor que 2%
    const isStable = absolutePercentage < 2;
    
    return {
      percentage: absolutePercentage,
      isPositive: percentage > 0,
      isStable
    };
  };

  const trend = calculateTrend();

  const handleDownload = async () => {
    const chartContainer = document.getElementById('project-trend-container');
    if (!chartContainer) return;
    
    try {
      // Pequeno delay para garantir que elementos estejam renderizados
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(chartContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        height: chartContainer.offsetHeight,
        width: chartContainer.offsetWidth,
        useCORS: true,
        allowTaint: false,
        ignoreElements: (element) => {
          return element.tagName === 'BUTTON' && element.textContent?.includes('Exportar');
        }
      });
      
      const link = document.createElement('a');
      const projectsLabel = selectedProjects.includes('all') ? 'todos-projetos' : selectedProjects.join('-');
      link.download = `analise-tendencia-projetos-${projectsLabel}-${new Date().toISOString().split('T')[0]}.png`;
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
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {selectedMetric === 'cost' ? formatCurrency(entry.value) : `${formatIPU(entry.value)} IPUs`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Insights Card */}
      <Card className="bg-gradient-card shadow-medium">
        <CardHeader>
          <CardTitle>Insights da Análise - {getSelectedProjectsLabels()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground">Tendência Atual</div>
              <div className="text-lg font-semibold flex items-center gap-2">
                {trend.isStable ? (
                  <>
                    <div className="h-4 w-4 bg-blue-500 rounded-full" />
                    <span className="text-blue-600">Estável</span>
                  </>
                ) : trend.isPositive ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">Crescimento</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Redução</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground">Variação Mensal</div>
              <div className="text-lg font-semibold">
                {trend.percentage.toFixed(1)}%
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="text-lg font-semibold">
                {trend.percentage < 5 ? "Estável" : 
                 trend.percentage < 15 ? "Moderado" : "Significativo"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card shadow-medium" id="project-trend-container">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Análise de Tendências por Projeto
              <Badge variant={trend.isStable ? "secondary" : trend.isPositive ? "destructive" : "default"}>
                {trend.isStable ? (
                  <div className="h-3 w-3 bg-blue-500 rounded-full mr-1" />
                ) : trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {trend.percentage.toFixed(1)}%
              </Badge>
            </CardTitle>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2" disabled={availableCycles.length < 3}>Últimos 2 Ciclos Completos</SelectItem>
                <SelectItem value="3" disabled={availableCycles.length < 4}>Últimos 3 Ciclos Completos</SelectItem>
                <SelectItem value="6" disabled={availableCycles.length < 7}>Últimos 6 Ciclos Completos</SelectItem>
                <SelectItem value="9" disabled={availableCycles.length < 10}>Últimos 9 Ciclos Completos</SelectItem>
                <SelectItem value="12" disabled={availableCycles.length < 13}>Últimos 12 Ciclos Completos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cost">Custo Total</SelectItem>
                <SelectItem value="ipu">IPUs Totais</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex flex-col gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-64 justify-between">
                    {getSelectedProjectsLabels()}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <div className="max-h-60 overflow-y-auto">
                    {availableProjects.map((projectItem) => (
                      <div key={projectItem.id} className="flex items-center space-x-2 px-3 py-2 hover:bg-accent">
                        <Checkbox
                          id={projectItem.id}
                          checked={selectedProjects.includes(projectItem.id)}
                          onCheckedChange={(checked) => handleProjectToggle(projectItem.id, checked as boolean)}
                        />
                        <label
                          htmlFor={projectItem.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                        >
                          {projectItem.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <Button 
              variant="outline" 
              size="icon"
              onClick={handleDownload}
              title="Exportar gráfico como PNG"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="text-muted-foreground">Carregando dados...</div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-96 flex items-center justify-center">
              <div className="text-muted-foreground">Nenhum dado disponível para o período selecionado</div>
            </div>
          ) : (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="period" 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                    tickFormatter={selectedMetric === 'cost' ? formatCurrency : formatIPU}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  {/* Linha total (pontilhada) */}
                  <Line
                    type="monotone"
                    dataKey={selectedMetric === 'cost' ? 'totalCost' : 'totalIPU'}
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    name={getMetricLabel()}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  />
                  
                  {/* Linhas individuais para cada projeto */}
                  {availableProjects
                    .filter(project => {
                      if (project.id === 'all') return false;
                      // Se "all" estiver selecionado, mostrar todos os projetos
                      if (selectedProjects.includes('all')) return true;
                      // Caso contrário, mostrar apenas os projetos selecionados
                      return selectedProjects.includes(project.id);
                    })
                    .map((project, index) => {
                      const projectKey = project.id.replace(/[^a-zA-Z0-9]/g, '_');
                      const dataKey = selectedMetric === 'cost' ? `${projectKey}_cost` : `${projectKey}_ipu`;
                      const color = colors[index % colors.length];
                      
                      return (
                        <Line
                          key={project.id}
                          type="monotone"
                          dataKey={dataKey}
                          stroke={color}
                          strokeWidth={2}
                          name={project.name}
                          dot={{ fill: color, strokeWidth: 2, r: 3 }}
                        />
                      );
                    })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}