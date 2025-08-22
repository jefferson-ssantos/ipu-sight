import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "@/hooks/useDashboardData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Download } from "lucide-react";

export function CostTrendAnalysis() {
  const { data, loading, getChartData } = useDashboardData();
  const [period, setPeriod] = useState("6months");
  const [metric, setMetric] = useState("cost");
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('CostTrendAnalysis: Fetching data with period:', period, 'metric:', metric);
        const evolutionData = await getChartData('evolution');
        console.log('CostTrendAnalysis: Received data:', evolutionData);
        const dataArray = Array.isArray(evolutionData) ? evolutionData : [];
        setChartData(dataArray);
      } catch (error) {
        console.error('Error fetching trend data:', error);
        setChartData([]);
      }
    };
    if (getChartData) {
      fetchData();
    }
  }, [period, metric, getChartData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatIPU = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const calculateTrend = () => {
    if (chartData.length < 2) return { percentage: 0, isPositive: false };
    
    const currentKey = metric === 'cost' ? 'cost' : 'ipu';
    const current = chartData[chartData.length - 1]?.[currentKey] || 0;
    const previous = chartData[chartData.length - 2]?.[currentKey] || 0;
    const percentage = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    
    return {
      percentage: Math.abs(percentage),
      isPositive: percentage > 0
    };
  };

  const trend = calculateTrend();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
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
      {/* Insights Card */}
      <Card>
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

      <Card>
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
          
          <div className="flex items-center gap-4">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Últimos 3 meses</SelectItem>
                <SelectItem value="6months">Últimos 6 meses</SelectItem>
                <SelectItem value="12months">Último ano</SelectItem>
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

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
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
                <Line 
                  type="monotone" 
                  dataKey={metric === 'cost' ? 'cost' : 'ipu'} 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  name={metric === 'cost' ? 'Custo Total' : 'IPUs Consumidas'}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}