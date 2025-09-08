import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "@/hooks/useDashboardData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Download } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";

export function CostTrendAnalysis() {
  const { data, loading, getChartData, availableCycles } = useDashboardData();
  const [period, setPeriod] = useState("12");
  const [selectedMetric, setSelectedMetric] = useState("cost");
  const [availableMetrics, setAvailableMetrics] = useState<{ id: string; name: string }[]>([
    { id: 'cost', name: 'Custo Total' },
    { id: 'ipu', name: 'IPUs Totais' }
  ]);
  const [chartData, setChartData] = useState<any[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  // Buscar métricas disponíveis dos dados
  useEffect(() => {
    const fetchAvailableMetrics = async () => {
      try {
        // Buscar dados de evolução para extrair métricas
        const evolutionData = await getChartData('evolution', undefined, '24');
        const dataArray = Array.isArray(evolutionData) ? evolutionData : [];
        
        // Extrair métricas únicas dos dados de evolução
        const metricsSet = new Set<string>();
        
        // Se os dados têm estrutura de métricas detalhadas
        dataArray.forEach(item => {
          if (item.meters && Array.isArray(item.meters)) {
            item.meters.forEach((meter: string) => metricsSet.add(meter));
          }
        });
        
        // Converter para array com formato adequado
        const metrics = [
          { id: 'cost', name: 'Custo Total' },
          { id: 'ipu', name: 'IPUs Totais' }
        ];
        
        // Adicionar métricas específicas encontradas
        Array.from(metricsSet).forEach(meterName => {
          if (meterName && meterName !== 'cost' && meterName !== 'ipu') {
            metrics.push({
              id: meterName,
              name: meterName
            });
          }
        });
        
        setAvailableMetrics(metrics);
      } catch (error) {
        // Manter métricas padrão em caso de erro
        console.error('Erro ao buscar métricas:', error);
      }
    };
    
    if (getChartData) {
      fetchAvailableMetrics();
    }
  }, [getChartData]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Add 1 to period to compensate for filtering out current incomplete cycle
        const adjustedPeriod = (parseInt(period) + 1).toString();
        const evolutionData = await getChartData('evolution', undefined, adjustedPeriod);
        const dataArray = Array.isArray(evolutionData) ? evolutionData : [];
        
        // Filter out incomplete current cycle
        const filteredData = filterCompleteCycles(dataArray);
        
        // Process data based on selected metric
        const processedData = processDataForMetric(filteredData, selectedMetric);
        
        // Now limit to the requested number of cycles
        const limitedData = processedData.slice(-parseInt(period));
        setChartData(limitedData);
      } catch (error) {
        setChartData([]);
      }
    };
    if (getChartData) {
      fetchData();
    }
  }, [period, selectedMetric, getChartData]);

  const processDataForMetric = (data: any[], metric: string) => {
    if (metric === 'cost' || metric === 'ipu') {
      return data;
    }
    
    // Para métricas específicas, processar os dados
    return data.map(item => {
      const metricValue = getMetricValue(item, metric);
      return {
        ...item,
        cost: metricValue,
        ipu: metricValue
      };
    });
  };

  const getMetricValue = (item: any, metric: string): number => {
    // Se temos dados detalhados por métrica
    if (item.data && Array.isArray(item.data)) {
      const metricData = item.data.find((d: any) => d.name === metric);
      return metricData?.value || 0;
    }
    
    // Se temos métricas no array meters
    if (item.meters && Array.isArray(item.meters) && item.costs && Array.isArray(item.costs)) {
      const metricIndex = item.meters.indexOf(metric);
      return metricIndex >= 0 ? (item.costs[metricIndex] || 0) : 0;
    }
    
    return 0;
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

  const getMetricLabel = () => {
    const foundMetric = availableMetrics.find(m => m.id === selectedMetric);
    return foundMetric?.name || selectedMetric;
  };

  const getValueFormatter = () => {
    if (selectedMetric === 'cost') return formatCurrency;
    return formatIPU;
  };

  const calculateTrend = () => {
    if (chartData.length < 2) return { percentage: 0, isPositive: false };
    
    const currentKey = selectedMetric === 'cost' ? 'cost' : 'ipu';
    const currentPeriodData = chartData[chartData.length - 1];
    const previousPeriodData = chartData[chartData.length - 2];
    
    if (!currentPeriodData || !previousPeriodData) return { percentage: 0, isPositive: false };
    
    let currentValue = currentPeriodData[currentKey] || 0;
    const previousValue = previousPeriodData[currentKey] || 0;
    
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
    
    return {
      percentage: Math.abs(percentage),
      isPositive: percentage > 0
    };
  };

  const trend = calculateTrend();

  const handleDownload = async () => {
    const chartContainer = document.getElementById('cost-trend-container');
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
      link.download = `analise-tendencia-${selectedMetric}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast("Gráfico exportado com sucesso!");
    } catch (error) {
      toast("Erro ao exportar gráfico");
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const formatter = getValueFormatter();
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-primary">
            {selectedMetric === 'cost' ? formatter(value) : `${formatter(value)} ${selectedMetric === 'ipu' ? 'IPUs' : ''}`}
          </p>
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
          <CardTitle>Insights da Análise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground">Tendência Atual</div>
              <div className="text-lg font-semibold flex items-center gap-2">
                {trend.isPositive ? (
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

      <Card className="bg-gradient-card shadow-medium" id="cost-trend-container">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Análise de Tendências
              <Badge variant={trend.isPositive ? "destructive" : "default"}>
                {trend.isPositive ? (
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
                <SelectValue placeholder="Selecione uma métrica" />
              </SelectTrigger>
              <SelectContent>
                {availableMetrics.length > 0 ? (
                  availableMetrics.map(metricItem => (
                    <SelectItem key={metricItem.id} value={metricItem.id}>
                      {metricItem.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="loading" disabled>
                    Carregando métricas...
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div ref={chartRef} className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 60, right: 20, top: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={getValueFormatter()}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                />
                <Line 
                  type="monotone" 
                  dataKey={selectedMetric === 'cost' ? 'cost' : 'ipu'} 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  name={getMetricLabel()}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}