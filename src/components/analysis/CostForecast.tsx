import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { TrendingUp, AlertTriangle, Download, Calendar, DollarSign, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface HistoricalData {
  period: string;
  cost: number;
  ipu: number;
  billing_period_start_date: string;
  billing_period_end_date: string;
}

interface ForecastData {
  period: string;
  cost: number;
  ipu: number;
  isForecast: boolean;
  confidence: number;
}

export function CostForecast() {
  const { user } = useAuth();
  const [forecastPeriod, setForecastPeriod] = useState("3"); // Changed from "3months" to "3"
  const [metric, setMetric] = useState("cost");
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricePerIPU, setPricePerIPU] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);

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

        // Get historical evolution data using the existing function
        const { data: evolutionData } = await supabase
          .rpc('get_cost_evolution_data', {
            cycle_limit: 12 // Get up to 12 cycles for better forecasting
          });

        if (!evolutionData) return;

        // Process historical data
        const processedHistorical = processHistoricalData(evolutionData, clientData.preco_por_ipu);
        setHistoricalData(processedHistorical);

        // Generate forecast
        const forecast = generateAdvancedForecast(processedHistorical, forecastPeriod, clientData.preco_por_ipu);
        setForecastData(forecast);

      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, forecastPeriod]);

  const processHistoricalData = (rawData: any[], pricePerIPU: number): HistoricalData[] => {
    // Group by billing period and sum consumption
    const periodMap = new Map();
    
    rawData.forEach(item => {
      const key = `${item.billing_period_start_date}-${item.billing_period_end_date}`;
      if (!periodMap.has(key)) {
        periodMap.set(key, {
          period: formatPeriodLabel(item.billing_period_start_date, item.billing_period_end_date),
          ipu: 0,
          cost: 0,
          billing_period_start_date: item.billing_period_start_date,
          billing_period_end_date: item.billing_period_end_date
        });
      }
      
      const existing = periodMap.get(key);
      existing.ipu += item.consumption_ipu || 0;
      existing.cost = existing.ipu * pricePerIPU;
    });

    return Array.from(periodMap.values()).sort((a, b) => 
      new Date(a.billing_period_start_date).getTime() - new Date(b.billing_period_start_date).getTime()
    );
  };

  const formatPeriodLabel = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} - ${end.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`;
  };

  const generateAdvancedForecast = (historical: HistoricalData[], period: string, pricePerIPU: number): ForecastData[] => {
    if (historical.length < 2) return [];

    const periodsToForecast = parseInt(period); // Changed to parseInt(period)
    
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
      
      // More conservative weighted average (20% linear, 30% seasonal, 50% moving average)
      const weightedIPU = (linear.ipu * 0.2) + (seasonal.ipu * 0.3) + (movingAvg.ipu * 0.5);
      const weightedCost = weightedIPU * pricePerIPU;
      
      // Calculate confidence based on data variance
      const confidence = calculateConfidence(historical, i);
      
      const lastHistoricalEndDate = new Date(historical[historical.length - 1].billing_period_end_date);
      
      const forecastStartDate = new Date(lastHistoricalEndDate);
      forecastStartDate.setDate(lastHistoricalEndDate.getDate() + 1); 
      forecastStartDate.setMonth(forecastStartDate.getMonth() + i); 

      const forecastEndDate = new Date(forecastStartDate.getFullYear(), forecastStartDate.getMonth() + 1, 0); 
      
      combinedForecast.push({
        period: `${forecastStartDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} - ${forecastEndDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`,
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
    // Simple seasonal adjustment based on last year's pattern
    const seasonalPattern = calculateSeasonalPattern(data);
    const recentAvg = data.slice(-3).reduce((sum, item) => sum + item.ipu, 0) / Math.min(3, data.length);
    
    const forecast = [];
    for (let i = 0; i < periods; i++) {
      const seasonalIndex = i % 12; // Monthly seasonality
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
    
    // Apply conservative growth trend (reduce volatility)
    const growthTrend = calculateGrowthTrend(data) * 0.5; // Reduce by 50% for more conservative forecast
    
    const forecast = [];
    for (let i = 0; i < periods; i++) {
      // Use more conservative projection
      const baseIPU = avgIPU;
      const trendAdjustment = baseIPU * growthTrend * (i + 1) * 0.3; // Reduce trend impact
      const predictedIPU = Math.max(0, baseIPU + trendAdjustment);
      
      forecast.push({
        ipu: predictedIPU,
        cost: predictedIPU * pricePerIPU
      });
    }
    
    return forecast;
  };

  const calculateSeasonalPattern = (data: HistoricalData[]): number[] => {
    // Simple seasonal pattern calculation
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
    const dataQuality = Math.min(data.length / 6, 1); // Better with more data
    const distancePenalty = Math.max(0, 1 - (forecastIndex * 0.1)); // Confidence decreases with distance
    
    return Math.max(0.3, Math.min(0.95, (1 - variance) * dataQuality * distancePenalty));
  };

  const calculateVariance = (values: number[]): number => {
    if (values.length < 2) return 0.5;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return Math.min(1, variance / (mean * mean)); // Normalized variance
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
    if (!chartRef.current) return;
    
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
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
              Previsão Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metric === 'cost' ? formatCurrency(summary.totalForecast) : `${formatIPU(summary.totalForecast)} IPUs`}
            </div>
            <div className="text-sm text-muted-foreground">
              Para {forecastPeriod === '1month' ? 'o próximo mês' : 
                   forecastPeriod.replace('months', ' meses').replace('12months', '12 meses')}
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
              {summary.trend === 'crescimento' ? 'Crescimento vs histórico' :
               summary.trend === 'redução' ? 'Redução vs histórico' : 'Variação estável'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-medium">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Confiança Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {(summary.avgConfidence * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">
              Precisão da previsão
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card className="bg-gradient-card shadow-medium">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Previsão de Custos
          </CardTitle>
          
          <div className="flex items-center gap-4">
            <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Próximo mês</SelectItem>
                <SelectItem value="3">Próximos 3 meses</SelectItem>
                <SelectItem value="6">Próximos 6 meses</SelectItem>
                <SelectItem value="12">Próximo ano</SelectItem>
              </SelectContent>
            </Select>

            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cost">Custo</SelectItem>
                <SelectItem value="ipu">IPUs</SelectItem>
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
              <LineChart data={combinedData} margin={{ left: 60, right: 20, top: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
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
                
                {/* Historical Line */}
                <Line 
                  type="monotone" 
                  dataKey={metric} 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  connectNulls={false}
                  name="Histórico"
                />

                {/* Forecast Line */}
                <Line 
                  type="monotone" 
                  dataKey={(entry) => entry.isForecast ? entry[metric] : null}
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "hsl(var(--destructive))", strokeWidth: 2, r: 3 }}
                  connectNulls={false}
                  name="Previsão"
                />

                {/* Separator line */}
                {historicalData.length > 0 && (
                  <ReferenceLine 
                    x={historicalData[historicalData.length - 1]?.period} 
                    stroke="hsl(var(--border))" 
                    strokeDasharray="2 2"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}