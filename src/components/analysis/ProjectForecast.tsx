import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { TrendingUp, AlertTriangle, Download, Calendar, DollarSign, Activity, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface HistoricalData {
  period: string;
  cost: number;
  ipu: number;
  billing_period_start_date: string;
  billing_period_end_date: string;
  [key: string]: any; // For project-specific data
}

interface ForecastData {
  period: string;
  cost: number;
  ipu: number;
  isForecast: boolean;
  confidence: number;
  [key: string]: any; // For project-specific data
}

export function ProjectForecast() {
  const { user } = useAuth();
  const [forecastPeriod, setForecastPeriod] = useState("3");
  const [metric, setMetric] = useState("cost");
  const [selectedProjects, setSelectedProjects] = useState<string[]>(["all"]);
  const [availableProjects, setAvailableProjects] = useState<{ id: string; name: string }[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricePerIPU, setPricePerIPU] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);

  // Cores personalizadas
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

  // Buscar projetos disponíveis
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
    
    if (user) {
      fetchAvailableProjects();
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Get user profile and client data
        const { data: profile } = await supabase
          .from('profiles')
          .select('cliente_id')
          .eq('id', user.id)
          .single();

        if (!profile) return;

        const { data: clientData } = await supabase
          .from('api_clientes')
          .select('preco_por_ipu')
          .eq('id', profile.cliente_id)
          .single();

        if (!clientData) return;
        
        setPricePerIPU(clientData.preco_por_ipu);

        // Get historical project data using edge function
        const historicalProjectData = await getHistoricalProjectData(profile.cliente_id, clientData.preco_por_ipu);
        setHistoricalData(historicalProjectData);

        // Generate forecast using filtered data
        const forecast = generateAdvancedForecast(historicalProjectData, forecastPeriod, clientData.preco_por_ipu);
        setForecastData(forecast);

      } catch (error) {
        console.error('Error fetching project forecast data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, forecastPeriod, selectedProjects]);

  const getHistoricalProjectData = async (clienteId: number, pricePerIPU: number) => {
    try {
      // Use edge function to get project data with 13 cycles to have 12 complete after filtering
      const { data: response, error } = await supabase.functions.invoke('get-multi-series-data', {
        body: {
          cycleLimit: 13,
          selectedMeters: selectedProjects,
          selectedItems: selectedProjects,
          selectedMetric: metric,
          dimension: 'project'
        }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        return [];
      }

      const rawData = response.data || [];
      
      // Filter out incomplete current cycle
      const filteredData = filterCompleteCycles(rawData);
      
      return filteredData;
    } catch (error) {
      console.error('❌ Error calling edge function:', error);
      return [];
    }
  };

  const filterCompleteCycles = (data: any[]): HistoricalData[] => {
    const today = new Date();
    return data.filter(item => {
      let endDate: Date;
      
      if (item.periodEnd) {
        endDate = new Date(item.periodEnd);
      } else if (item.period && item.period.includes(' - ')) {
        const periodParts = item.period.split(' - ');
        const endDateStr = periodParts[1];
        endDate = new Date(endDateStr.split('/').reverse().join('-'));
      } else {
        return true;
      }
      
      return endDate < today; // Only include cycles that have already ended
    }).map(item => ({
      period: item.period,
      cost: item.totalCost || 0,
      ipu: item.totalIPU || 0,
      billing_period_start_date: item.billing_period_start_date || item.periodStart,
      billing_period_end_date: item.billing_period_end_date || item.periodEnd,
      ...item // Include project-specific data
    }));
  };

  const generateAdvancedForecast = (historical: HistoricalData[], period: string, pricePerIPU: number): ForecastData[] => {
    if (historical.length < 2) return [];

    const periodsToForecast = parseInt(period);
    
    // Apply multiple forecasting methods
    const linearForecast = linearRegressionForecast(historical, periodsToForecast, pricePerIPU);
    const seasonalForecast = seasonalForecast_(historical, periodsToForecast, pricePerIPU);
    const movingAvgForecast = movingAverageForecast(historical, periodsToForecast, pricePerIPU);
    
    // Combine forecasts with weights
    const combinedForecast: ForecastData[] = [];
    
    for (let i = 0; i < periodsToForecast; i++) {
      const linear = linearForecast[i] || { ipu: 0, cost: 0 };
      const seasonal = seasonalForecast[i] || { ipu: 0, cost: 0 };
      const movingAvg = movingAvgForecast[i] || { ipu: 0, cost: 0 };
      
      // More conservative weighted average
      const weightedIPU = (linear.ipu * 0.2) + (seasonal.ipu * 0.3) + (movingAvg.ipu * 0.5);
      const weightedCost = weightedIPU * pricePerIPU;
      
      // Calculate confidence based on data variance
      const confidence = calculateConfidence(historical, i);
      
      // Generate dates for forecast periods
      const lastHistoricalEndDate = new Date(historical[historical.length - 1].billing_period_end_date);
      
      const baseStartDate = new Date(lastHistoricalEndDate);
      baseStartDate.setDate(baseStartDate.getDate() + 1);
      
      const currentStartDate = new Date(baseStartDate);
      currentStartDate.setMonth(currentStartDate.getMonth() + i);
      
      const currentEndDate = new Date(currentStartDate);
      currentEndDate.setMonth(currentEndDate.getMonth() + 1);
      currentEndDate.setDate(currentEndDate.getDate() - 1); // End the day before next month starts
      
      combinedForecast.push({
        period: `${currentStartDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} - ${currentEndDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`,
        ipu: Math.max(0, weightedIPU),
        cost: Math.max(0, weightedCost),
        isForecast: true,
        confidence
      });
    }
    
    return combinedForecast;
  };

  const linearRegressionForecast = (data: HistoricalData[], periods: number, pricePerIPU: number) => {
    const n = data.length;
    const xSum = data.reduce((sum, _, i) => sum + i, 0);
    const ySum = data.reduce((sum, item) => sum + item.ipu, 0);
    const xySum = data.reduce((sum, item, i) => sum + (i * item.ipu), 0);
    const x2Sum = data.reduce((sum, _, i) => sum + (i * i), 0);
    
    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
    const intercept = (ySum - slope * xSum) / n;
    
    const forecast = [];
    for (let i = 0; i < periods; i++) {
      const predictedIPU = Math.max(0, slope * (n + i) + intercept);
      forecast.push({
        ipu: predictedIPU,
        cost: predictedIPU * pricePerIPU
      });
    }
    
    return forecast;
  };

  const seasonalForecast_ = (data: HistoricalData[], periods: number, pricePerIPU: number) => {
    const seasonalPattern = calculateSeasonalPattern(data);
    const recentAvg = data.slice(-3).reduce((sum, item) => sum + item.ipu, 0) / Math.min(3, data.length);
    
    const forecast = [];
    for (let i = 0; i < periods; i++) {
      const seasonalIndex = i % 12;
      const seasonalFactor = seasonalPattern[seasonalIndex] || 1;
      const predictedIPU = recentAvg * seasonalFactor;
      
      forecast.push({
        ipu: Math.max(0, predictedIPU),
        cost: Math.max(0, predictedIPU * pricePerIPU)
      });
    }
    
    return forecast;
  };

  const movingAverageForecast = (data: HistoricalData[], periods: number, pricePerIPU: number) => {
    const windowSize = Math.min(3, data.length);
    const recentData = data.slice(-windowSize);
    const avgIPU = recentData.reduce((sum, item) => sum + item.ipu, 0) / recentData.length;
    
    const growthTrend = calculateGrowthTrend(data) * 0.5;
    
    const forecast = [];
    for (let i = 0; i < periods; i++) {
      const baseIPU = avgIPU;
      const trendAdjustment = baseIPU * growthTrend * (i + 1) * 0.3;
      const predictedIPU = Math.max(0, baseIPU + trendAdjustment);
      
      forecast.push({
        ipu: predictedIPU,
        cost: predictedIPU * pricePerIPU
      });
    }
    
    return forecast;
  };

  const calculateSeasonalPattern = (data: HistoricalData[]): number[] => {
    const pattern = new Array(12).fill(1);
    if (data.length < 12) return pattern;
    
    const yearlyAvg = data.reduce((sum, item) => sum + item.ipu, 0) / data.length;
    
    data.forEach((item, index) => {
      const monthIndex = index % 12;
      pattern[monthIndex] = (pattern[monthIndex] + (item.ipu / yearlyAvg)) / 2;
    });
    
    return pattern;
  };

  const calculateGrowthTrend = (data: HistoricalData[]): number => {
    if (data.length < 2) return 0;
    
    const recentPeriods = Math.min(6, data.length);
    const recentData = data.slice(-recentPeriods);
    
    let totalGrowth = 0;
    let validPeriods = 0;
    
    for (let i = 1; i < recentData.length; i++) {
      const prev = recentData[i - 1].ipu;
      const current = recentData[i].ipu;
      
      if (prev > 0) {
        totalGrowth += (current - prev) / prev;
        validPeriods++;
      }
    }
    
    return validPeriods > 0 ? totalGrowth / validPeriods : 0;
  };

  const calculateConfidence = (data: HistoricalData[], forecastIndex: number): number => {
    const variance = calculateVariance(data.map(d => d.ipu));
    const dataQuality = Math.min(data.length / 6, 1);
    const distancePenalty = Math.max(0, 1 - (forecastIndex * 0.1));
    
    return Math.max(0.3, Math.min(0.95, (1 - variance) * dataQuality * distancePenalty));
  };

  const calculateVariance = (values: number[]): number => {
    if (values.length < 2) return 0.5;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return Math.min(1, variance / (mean * mean));
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
      
      newSelection = newSelection.filter(id => id !== 'all');
      
      if (checked) {
        if (!newSelection.includes(projectId)) {
          newSelection.push(projectId);
        }
      } else {
        newSelection = newSelection.filter(id => id !== projectId);
      }
      
      if (newSelection.length === 0) {
        newSelection = ['all'];
      }
      
      setSelectedProjects(newSelection);
    }
  };

  const combinedData = [...historicalData, ...forecastData];
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatIPU = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const calculateForecastSummary = () => {
    if (forecastData.length === 0) {
      return { 
        totalForecast: 0, 
        averageForecast: 0, 
        trend: "estável", 
        growthRate: 0,
        avgConfidence: 0,
        totalHistorical: 0,
        expectedChange: 0
      };
    }
    
    const metric_key = metric as keyof Pick<ForecastData, 'cost' | 'ipu'>;
    const totalForecast = forecastData.reduce((sum, item) => sum + (item[metric_key] || 0), 0);
    const averageForecast = totalForecast / forecastData.length;
    const avgConfidence = forecastData.reduce((sum, item) => sum + item.confidence, 0) / forecastData.length;
    
    // Compare with recent historical average
    const recentHistorical = historicalData.slice(-3);
    const totalHistorical = recentHistorical.reduce((sum, item) => sum + (item[metric_key] || 0), 0);
    const avgHistorical = recentHistorical.length > 0 ? totalHistorical / recentHistorical.length : 0;
    
    let growthRate = 0;
    let expectedChange = 0;
    if (avgHistorical > 0) {
      growthRate = ((averageForecast - avgHistorical) / avgHistorical) * 100;
      expectedChange = ((totalForecast - totalHistorical) / totalHistorical) * 100;
    }
    
    let trend = "estável";
    if (growthRate > 5) trend = "crescimento";
    else if (growthRate < -5) trend = "redução";
    
    return { 
      totalForecast,
      averageForecast,
      trend, 
      growthRate: Math.abs(growthRate),
      avgConfidence,
      totalHistorical,
      expectedChange: Math.abs(expectedChange)
    };
  };

  const summary = calculateForecastSummary();

  const handleDownload = async () => {
    const chartContainer = document.getElementById('project-forecast-container');
    if (!chartContainer) return;
    
    try {
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
      link.download = `previsao-projetos-${projectsLabel}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast("Gráfico exportado com sucesso!");
    } catch (error) {
      toast("Erro ao exportar gráfico");
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = payload[0].value;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium flex items-center gap-2">
            {label}
            {data.isForecast && (
              <Badge variant="outline" className="text-xs">
                Previsão ({(data.confidence * 100).toFixed(0)}% confiança)
              </Badge>
            )}
          </p>
          <p className="text-primary">
            {metric === 'cost' ? formatCurrency(value) : `${formatIPU(value)} IPUs`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* KPIs Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card shadow-medium">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Previsão Total - {getSelectedProjectsLabels()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metric === 'cost' ? formatCurrency(summary.totalForecast) : `${formatIPU(summary.totalForecast)} IPUs`}
            </div>
            <div className="text-sm text-muted-foreground">
              Para {forecastPeriod} {forecastPeriod === '1' ? 'mês' : 'meses'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-medium">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Média Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metric === 'cost' ? formatCurrency(summary.averageForecast) : `${formatIPU(summary.averageForecast)} IPUs`}
            </div>
            <Badge variant={summary.trend === 'crescimento' ? 'destructive' : 
                           summary.trend === 'redução' ? 'default' : 'secondary'}>
              {summary.trend}
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-medium">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Variação Esperada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {summary.expectedChange.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              vs. últimos 3 meses
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-medium">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Confiança Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {(summary.avgConfidence * 100).toFixed(0)}%
            </div>
            <Badge variant={summary.avgConfidence > 0.7 ? 'default' : 
                           summary.avgConfidence > 0.5 ? 'secondary' : 'destructive'}>
              {summary.avgConfidence > 0.7 ? 'Alta' : 
               summary.avgConfidence > 0.5 ? 'Média' : 'Baixa'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <Card className="bg-gradient-card shadow-medium" id="project-forecast-container">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Previsão de Custos por Projeto
              <Badge variant="outline" className="text-xs">
                {(summary.avgConfidence * 100).toFixed(0)}% confiança média
              </Badge>
            </CardTitle>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Mês</SelectItem>
                <SelectItem value="3">3 Meses</SelectItem>
                <SelectItem value="6">6 Meses</SelectItem>
                <SelectItem value="12">12 Meses</SelectItem>
              </SelectContent>
            </Select>

            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cost">Custos</SelectItem>
                <SelectItem value="ipu">IPUs</SelectItem>
              </SelectContent>
            </Select>

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
          ) : combinedData.length === 0 ? (
            <div className="h-96 flex items-center justify-center">
              <div className="text-muted-foreground">Nenhum dado disponível para previsão</div>
            </div>
          ) : (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="period" 
                    stroke="hsl(var(--foreground))"
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                    tickFormatter={metric === 'cost' ? formatCurrency : formatIPU}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  {/* Linha de separação entre histórico e previsão */}
                  <ReferenceLine 
                    x={historicalData[historicalData.length - 1]?.period} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5"
                  />
                  
                  {/* Linha principal */}
                  <Line
                    type="monotone"
                    dataKey={metric}
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    name={metric === 'cost' ? 'Custo Total' : 'IPUs Totais'}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}