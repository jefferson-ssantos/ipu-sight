import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDashboardData } from "@/hooks/useDashboardData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Download, DollarSign, Calendar, Percent, Target, ChevronDown, Check } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function CostForecast() {
  const { data, loading, getChartData, availableCycles } = useDashboardData();
  const { user } = useAuth();
  const [period, setPeriod] = useState("12");
  const [selectedMetric, setSelectedMetric] = useState("cost");
  const [selectedMeters, setSelectedMeters] = useState<string[]>(["all"]);
  const [availableMeters, setAvailableMeters] = useState<{ id: string; name: string }[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [forecastPeriod, setForecastPeriod] = useState("3months");
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

  // Buscar métricas (meter_name) disponíveis da api_consumosummary
  useEffect(() => {
    const fetchAvailableMeters = async () => {
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

        const { data: meterData, error } = await supabase
          .from('api_consumosummary')
          .select('meter_name')
          .in('configuracao_id', configIds)
          .gt('consumption_ipu', 0)
          .neq('meter_name', 'Sandbox Organizations IPU Usage')
          .neq('meter_name', 'Metadata Record Consumption');

        if (error) {
          return;
        }

        const uniqueMeters = [...new Set(
          meterData
            ?.map(item => item.meter_name)
            .filter(Boolean) || []
        )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

        const meters = [
          { id: 'all', name: 'Todas as Métricas' },
          ...uniqueMeters.map(meterName => ({
            id: meterName,
            name: meterName
          }))
        ];

        setAvailableMeters(meters);
      } catch (error) {
        setAvailableMeters([{ id: 'all', name: 'Todas as Métricas' }]);
      }
    };
    
    if (getChartData) {
      fetchAvailableMeters();
    }
  }, [getChartData]);

  // Buscar dados históricos quando parâmetros mudarem
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Add 1 to period to compensate for filtering out current incomplete cycle
        const adjustedPeriod = (parseInt(period) + 1).toString();
        
        // Buscar dados multi-série
        const multiSeriesData = await getMultiSeriesChartData(adjustedPeriod, selectedMeters);
        
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
  }, [period, selectedMetric, selectedMeters, getChartData]);

  // Update forecast when parameters change
  useEffect(() => {
    if (chartData.length > 0) {
      const forecasts = generateForecast(chartData, selectedMetric, forecastPeriod);
      setForecastData(forecasts);
    }
  }, [chartData, selectedMetric, forecastPeriod]);

  // Nova função para buscar dados multi-série usando edge function
  const getMultiSeriesChartData = async (cycleLimit: string, selectedMetersList: string[]) => {
    try {
      const { data: response, error } = await supabase.functions.invoke('get-multi-series-data', {
        body: {
          cycleLimit: parseInt(cycleLimit),
          selectedMeters: selectedMetersList,
          selectedMetric: selectedMetric
        }
      });

      if (error) {
        throw error;
      }

      return response.data || [];
    } catch (error) {
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

  const getSelectedMetersLabels = () => {
    if (selectedMeters.includes('all')) return 'Todas as Métricas';
    if (selectedMeters.length === 0) return 'Selecione as métricas';
    if (selectedMeters.length === 1) {
      const foundMeter = availableMeters.find(m => m.id === selectedMeters[0]);
      return foundMeter?.name || selectedMeters[0];
    }
    return `${selectedMeters.length} métricas selecionadas`;
  };

  const handleMeterToggle = (meterId: string, checked: boolean) => {
    if (meterId === 'all') {
      if (checked) {
        setSelectedMeters(['all']);
      } else {
        setSelectedMeters([]);
      }
    } else {
      setSelectedMeters(prev => {
        const newSelected = prev.filter(m => m !== 'all'); // Remove 'all' when selecting specific meters
        if (checked) {
          return [...newSelected, meterId];
        } else {
          return newSelected.filter(m => m !== meterId);
        }
      });
    }
  };

  // Enhanced forecast generation with multiple methods and confidence scoring
  const generateForecast = (historicalData: any[], metric: string, forecastPeriod: string) => {
    if (historicalData.length < 3) return [];

    const periods = parseInt(forecastPeriod.replace(/\D/g, ''));
    const metricKey = metric === 'cost' ? 'totalCost' : 'totalIPU';
    
    // Generate forecast for total values
    const totalValues = historicalData.map(item => item[metricKey] || 0);
    const totalLinearForecast = generateLinearForecast(totalValues, periods);
    const totalMovingAvgForecast = generateMovingAverageForecast(totalValues, periods);
    const totalSeasonalForecast = generateSeasonalForecast(totalValues, periods);

    // Generate forecasts for individual metrics
    const individualForecasts: any = {};
    const metricsToForecast = selectedMeters.includes('all') ? 
      availableMeters.filter(m => m.id !== 'all') : 
      availableMeters.filter(m => selectedMeters.includes(m.id));

    metricsToForecast.forEach(meterItem => {
      const metricKey_item = meterItem.id.replace(/[^a-zA-Z0-9]/g, '_');
      const dataKey = metric === 'cost' ? `${metricKey_item}_cost` : `${metricKey_item}_ipu`;
      
      const itemValues = historicalData.map(item => item[dataKey] || 0);
      if (itemValues.some(v => v > 0)) {
        const itemLinear = generateLinearForecast(itemValues, periods);
        const itemMovingAvg = generateMovingAverageForecast(itemValues, periods);
        const itemSeasonal = generateSeasonalForecast(itemValues, periods);
        
        individualForecasts[dataKey] = {
          linear: itemLinear,
          movingAvg: itemMovingAvg,
          seasonal: itemSeasonal
        };
      }
    });
    
    // Combine methods with weights
    const forecast = [];
    const lastPeriod = historicalData[historicalData.length - 1].period;
    
    // Get the last historical date to calculate future dates
    const lastDate = new Date(lastPeriod.split(' - ')[1].split('/').reverse().join('-'));
    
    for (let i = 1; i <= periods; i++) {
      // Calculate future dates properly
      const currentStartDate = new Date(lastDate);
      currentStartDate.setMonth(currentStartDate.getMonth() + i);
      
      // Calculate end date properly
      const currentEndDate = new Date(currentStartDate);
      currentEndDate.setMonth(currentEndDate.getMonth() + 1);
      currentEndDate.setDate(currentEndDate.getDate() - 1); // End the day before next month starts
      
      // Calculate total forecast
      const totalLinearValue = totalLinearForecast[i - 1];
      const totalMovingAvgValue = totalMovingAvgForecast[i - 1];
      const totalSeasonalValue = totalSeasonalForecast[i - 1];
      
      // Weighted combination for total
      const totalCombinedValue = (totalLinearValue * 0.4) + (totalMovingAvgValue * 0.3) + (totalSeasonalValue * 0.3);
      
      // Calculate confidence based on historical variance
      const variance = calculateVariance(totalValues);
      const confidence = Math.max(0.6, Math.min(0.95, 1 - (variance / Math.abs(totalCombinedValue))));
      
      // Build forecast item with individual predictions
      const forecastItem: any = {
        period: `${currentStartDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} - ${currentEndDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`,
        [metricKey]: Math.max(0, totalCombinedValue),
        totalCost: metric === 'cost' ? Math.max(0, totalCombinedValue) : 0,
        totalIPU: metric === 'ipu' ? Math.max(0, totalCombinedValue) : 0,
        confidence: confidence,
        isForecast: true
      };

      // Add individual metric forecasts
      Object.keys(individualForecasts).forEach(dataKey => {
        const forecast_data = individualForecasts[dataKey];
        const itemLinearValue = forecast_data.linear[i - 1];
        const itemMovingAvgValue = forecast_data.movingAvg[i - 1];
        const itemSeasonalValue = forecast_data.seasonal[i - 1];
        
        const itemCombinedValue = (itemLinearValue * 0.4) + (itemMovingAvgValue * 0.3) + (itemSeasonalValue * 0.3);
        forecastItem[dataKey] = Math.max(0, itemCombinedValue);
      });

      forecast.push(forecastItem);
    }
    
    return forecast;
  };

  const generateLinearForecast = (values: number[], periods: number) => {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    // Calculate linear regression slope and intercept
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return Array.from({ length: periods }, (_, i) => slope * (n + i) + intercept);
  };

  const generateMovingAverageForecast = (values: number[], periods: number) => {
    const windowSize = Math.min(3, values.length);
    const recent = values.slice(-windowSize);
    const average = recent.reduce((a, b) => a + b, 0) / recent.length;
    
    // Calculate trend from recent values
    const trend = windowSize > 1 ? (recent[recent.length - 1] - recent[0]) / (windowSize - 1) : 0;
    
    return Array.from({ length: periods }, (_, i) => average + trend * (i + 1));
  };

  const generateSeasonalForecast = (values: number[], periods: number) => {
    // Simple seasonal pattern (assuming monthly cycles)
    const seasonalPattern = values.length >= 12 ? values.slice(-12) : values;
    const trend = values.length > 1 ? (values[values.length - 1] - values[0]) / (values.length - 1) : 0;
    
    return Array.from({ length: periods }, (_, i) => {
      const seasonalIndex = i % seasonalPattern.length;
      const baseValue = seasonalPattern[seasonalIndex];
      return baseValue + trend * (i + 1);
    });
  };

  const calculateVariance = (values: number[]) => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  };

  // Combine historical and forecast data
  const combinedData = [...chartData, ...forecastData];

  const calculateForecastSummary = () => {
    if (forecastData.length === 0) {
      return {
        totalForecast: 0,
        averageForecast: 0,
        trend: "indefinido",
        growthRate: 0,
        avgConfidence: 0,
        totalHistorical: 0,
        expectedChange: 0
      };
    }
    
    const metricKey = selectedMetric === 'cost' ? 'totalCost' : 'totalIPU';
    const totalForecast = forecastData.reduce((sum, item) => sum + (item[metricKey] || 0), 0);
    const averageForecast = totalForecast / forecastData.length;
    const avgConfidence = forecastData.reduce((sum, item) => sum + item.confidence, 0) / forecastData.length;
    
    // Compare with recent historical average
    const recentHistorical = chartData.slice(-3);
    const totalHistorical = recentHistorical.reduce((sum, item) => sum + (item[metricKey] || 0), 0);
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
    const chartContainer = document.getElementById('cost-forecast-container');
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
      link.download = `previsao-custos-${new Date().toISOString().split('T')[0]}.png`;
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
                Análise Preditiva ({(data.confidence * 100).toFixed(0)}% confiança)
              </Badge>
            )}
          </p>
          <p className="text-primary">
            {selectedMetric === 'cost' ? formatCurrency(value) : `${formatIPU(value)} IPUs`}
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
              Análise Preditiva Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedMetric === 'cost' ? formatCurrency(summary.totalForecast) : `${formatIPU(summary.totalForecast)} IPUs`}
            </div>
            <div className="text-sm text-muted-foreground">
              Para os {forecastPeriod === '1month' ? 'o próximo mês' : 
                   forecastPeriod.replace('months', ' próximos meses').replace('12months', ' próximos 12 meses')}
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
              {selectedMetric === 'cost' ? formatCurrency(summary.averageForecast) : `${formatIPU(summary.averageForecast)} IPUs`}
            </div>
            <div className="text-sm text-muted-foreground">
              Estimativa por mês
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-medium">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {summary.trend === "crescimento" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              Variação Esperada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.expectedChange.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              Tendência: {summary.trend}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-medium">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Confiança Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(summary.avgConfidence * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">
              Precisão da Análise Preditiva
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <Card className="bg-card/50 backdrop-blur shadow-medium">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <CardTitle className="text-base font-medium">Análise Preditiva de Custos</CardTitle>
          <div className="flex items-center gap-4">
            <div className="space-y-3">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[230px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">Últimos 2 Ciclos Completos</SelectItem>
                  <SelectItem value="3">Últimos 3 Ciclos Completos</SelectItem>
                  <SelectItem value="6">Últimos 6 Ciclos Completos</SelectItem>
                  <SelectItem value="9">Últimos 9 Ciclos Completos</SelectItem>
                  <SelectItem value="12">Últimos 12 Ciclos Completos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1month">Próximo mês</SelectItem>
                  <SelectItem value="3months">Próximos 3 meses</SelectItem>
                  <SelectItem value="6months">Próximos 6 meses</SelectItem>
                  <SelectItem value="12months">Próximos 12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cost">Valor</SelectItem>
                  <SelectItem value="ipu">IPUs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[300px] justify-between">
                    {getSelectedMetersLabels()}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <div className="max-h-60 overflow-y-auto">
                    {availableMeters.map((meterItem) => (
                      <div key={meterItem.id} className="flex items-center space-x-2 px-3 py-2 hover:bg-accent">
                        <Checkbox
                          id={meterItem.id}
                          checked={selectedMeters.includes(meterItem.id)}
                          onCheckedChange={(checked) => handleMeterToggle(meterItem.id, checked as boolean)}
                        />
                        <label
                          htmlFor={meterItem.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {meterItem.name}
                        </label>
                        {selectedMeters.includes(meterItem.id) && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div id="cost-forecast-container">
            {loading ? (
              <div className="h-96 flex items-center justify-center">
                <div className="text-muted-foreground">Carregando dados...</div>
              </div>
            ) : combinedData.length === 0 ? (
              <div className="h-96 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg mb-2">Nenhum dado disponível</p>
                  <p className="text-sm">Não há dados suficientes para as métricas selecionadas</p>
                </div>
              </div>
            ) : (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedData} margin={{ left: 60, right: 20, top: 20, bottom: -5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      angle={-35}
                      textAnchor="end"
                      height={120}
                      interval={0}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      tickFormatter={selectedMetric === 'cost' ? formatCurrency : formatIPU}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    
                    {/* Linha total pontilhada */}
                    <Line 
                      type="monotone" 
                      dataKey={selectedMetric === 'cost' ? 'totalCost' : 'totalIPU'}
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      name={selectedMetric === 'cost' ? 'Custo Total' : 'IPUs Totais'}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                      connectNulls={true}
                    />
                    
                    {/* Linhas coloridas para cada métrica */}
                    {(() => {
                      const metricsToShow = selectedMeters.includes('all') ? 
                        availableMeters.filter(m => m.id !== 'all') : 
                        availableMeters.filter(m => selectedMeters.includes(m.id));
                      
                      return metricsToShow.map((meterItem, index) => {
                        const metricKey = meterItem.id.replace(/[^a-zA-Z0-9]/g, '_');
                        const dataKey = selectedMetric === 'cost' ? `${metricKey}_cost` : `${metricKey}_ipu`;
                        const color = colors[index % colors.length];
                        
                        return (
                          <Line
                            key={meterItem.id}
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            strokeWidth={2}
                            name={meterItem.name}
                            dot={(props: any) => {
                              if (props.payload?.isForecast) {
                                return <circle {...props} fill="hsl(0 70% 50%)" strokeWidth={2} r={3} />;
                              }
                              return <circle {...props} fill={color} strokeWidth={2} r={3} />;
                            }}
                            strokeDasharray="0"
                            activeDot={{ r: 5, stroke: color, strokeWidth: 2 }}
                            connectNulls={true}
                          />
                        );
                      });
                    })()}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}