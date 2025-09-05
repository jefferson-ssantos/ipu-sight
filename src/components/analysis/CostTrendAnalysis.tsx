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
  const { data, loading, getChartData, availableCycles } = useDashboardData(); // Destructure availableCycles
  const [period, setPeriod] = useState("3"); // Changed from "6" to "3" to match default ConsolidatedChart
  const [metric, setMetric] = useState("cost");
  const [chartData, setChartData] = useState<any[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Pass period to getChartData
        const evolutionData = await getChartData('evolution', undefined, period);
        const dataArray = Array.isArray(evolutionData) ? evolutionData : [];
        setChartData(dataArray);
      } catch (error) {
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
    if (!chartRef.current) return;
    
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      
      const link = document.createElement('a');
      link.download = `analise-tendencias-${new Date().toISOString().split('T')[0]}.png`;
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

      <Card className="bg-gradient-card shadow-medium">
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
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1" disabled={availableCycles.length < 1}>Ciclo Atual</SelectItem>
                <SelectItem value="2" disabled={availableCycles.length < 2}>Últimos 2 Ciclos</SelectItem>
                <SelectItem value="3" disabled={availableCycles.length < 3}>Últimos 3 Ciclos</SelectItem>
                <SelectItem value="6" disabled={availableCycles.length < 6}>Últimos 6 Ciclos</SelectItem>
                <SelectItem value="9" disabled={availableCycles.length < 9}>Últimos 9 Ciclos</SelectItem>
                <SelectItem value="12" disabled={availableCycles.length < 12}>Últimos 12 Ciclos</SelectItem>
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
                  tickFormatter={(value) => 
                    metric === 'cost' ? formatCurrency(value) : formatIPU(value)
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{
                    paddingTop: "20px"
                  }}
                />
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