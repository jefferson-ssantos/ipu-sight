import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "@/hooks/useDashboardData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { TrendingUp, AlertTriangle, Download, Calendar } from "lucide-react";

export function CostForecast() {
  const { data, loading, getChartData } = useDashboardData();
  const [forecastPeriod, setForecastPeriod] = useState("3months");
  const [metric, setMetric] = useState("cost");
  const [chartData, setChartData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const evolutionData = await getChartData('evolution');
        setChartData(evolutionData);

        // Simple linear regression for forecast
        if (evolutionData.length >= 2) {
          const forecast = generateForecast(evolutionData, forecastPeriod);
          setForecastData(forecast);
        }
      } catch (error) {
        console.error('Error fetching forecast data:', error);
      }
    };
    fetchData();
  }, [forecastPeriod, metric, getChartData]);

  const generateForecast = (historical: any[], period: string) => {
    const months = period === "3months" ? 3 : period === "6months" ? 6 : 12;
    
    // Calculate trend using last 3 data points
    const recentData = historical.slice(-3);
    let avgGrowth = 0;
    
    if (recentData.length >= 2) {
      for (let i = 1; i < recentData.length; i++) {
        const growth = (recentData[i].value - recentData[i-1].value) / recentData[i-1].value;
        avgGrowth += growth;
      }
      avgGrowth = avgGrowth / (recentData.length - 1);
    }

    const lastValue = historical[historical.length - 1]?.value || 0;
    const lastDate = new Date();
    
    const forecast = [];
    for (let i = 1; i <= months; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setMonth(futureDate.getMonth() + i);
      
      const projectedValue = lastValue * Math.pow(1 + avgGrowth, i);
      
      forecast.push({
        name: futureDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        value: Math.max(0, projectedValue),
        isForecast: true
      });
    }
    
    return forecast;
  };

  const combinedData = [...chartData, ...forecastData];
  
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
    if (forecastData.length === 0) return { total: 0, average: 0, trend: "estável" };
    
    const total = forecastData.reduce((sum, item) => sum + item.value, 0);
    const average = total / forecastData.length;
    const currentAvg = chartData.slice(-3).reduce((sum, item) => sum + item.value, 0) / 3;
    
    const growthRate = ((average - currentAvg) / currentAvg) * 100;
    let trend = "estável";
    if (growthRate > 5) trend = "crescimento";
    else if (growthRate < -5) trend = "redução";
    
    return { total, average, trend, growthRate: Math.abs(growthRate) };
  };

  const summary = calculateForecastSummary();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = payload[0].value;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium flex items-center gap-2">
            {label}
            {data.isForecast && <Badge variant="outline" className="text-xs">Previsão</Badge>}
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
      <Card>
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
                <SelectItem value="3months">Próximos 3 meses</SelectItem>
                <SelectItem value="6months">Próximos 6 meses</SelectItem>
                <SelectItem value="12months">Próximo ano</SelectItem>
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

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
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
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  connectNulls={false}
                  name="Histórico"
                />

                {/* Forecast Line */}
                <Line 
                  type="monotone" 
                  dataKey={(entry) => entry.isForecast ? entry.value : null}
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "hsl(var(--muted-foreground))", strokeWidth: 2, r: 3 }}
                  connectNulls={false}
                  name="Previsão"
                />

                {/* Separator line */}
                <ReferenceLine 
                  x={chartData[chartData.length - 1]?.name} 
                  stroke="hsl(var(--border))" 
                  strokeDasharray="2 2"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Projeção Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metric === 'cost' ? formatCurrency(summary.total) : `${formatIPU(summary.total)} IPUs`}
            </div>
            <div className="text-sm text-muted-foreground">
              Para os próximos {forecastPeriod.replace('months', ' meses').replace('12months', '12 meses')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Média Mensal Prevista</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metric === 'cost' ? formatCurrency(summary.average) : `${formatIPU(summary.average)} IPUs`}
            </div>
            <Badge variant={summary.trend === 'crescimento' ? 'destructive' : 
                           summary.trend === 'redução' ? 'default' : 'secondary'}>
              {summary.trend}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alerta de Tendência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {summary.growthRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              {summary.trend === 'crescimento' ? 'Crescimento projetado' :
               summary.trend === 'redução' ? 'Redução projetada' : 'Tendência estável'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}