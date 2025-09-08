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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function CostTrendAnalysis() {
  const { data, loading, getChartData, availableCycles } = useDashboardData();
  const { user } = useAuth();
  const [period, setPeriod] = useState("12");
  const [selectedMetric, setSelectedMetric] = useState("cost"); // Filtro original Valor/IPUs
  const [selectedMeter, setSelectedMeter] = useState("all"); // Novo filtro de Métrica
  const [availableMeters, setAvailableMeters] = useState<{ id: string; name: string }[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

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

        // Buscar meter_name únicos da tabela api_consumosummary
        const { data: meterData, error } = await supabase
          .from('api_consumosummary')
          .select('meter_name')
          .in('configuracao_id', configIds)
          .gt('consumption_ipu', 0)
          .neq('meter_name', 'Sandbox Organizations IPU Usage')
          .neq('meter_name', 'Metadata Record Consumption');

        if (error) {
          console.error('Erro ao buscar métricas:', error);
          return;
        }

        // Extrair valores únicos de meter_name
        const uniqueMeters = [...new Set(
          meterData
            ?.map(item => item.meter_name)
            .filter(Boolean) || []
        )];

        // Criar lista com "Todas as Métricas" no topo
        const meters = [
          { id: 'all', name: 'Todas as Métricas' },
          ...uniqueMeters.map(meterName => ({
            id: meterName,
            name: meterName
          }))
        ];

        setAvailableMeters(meters);
      } catch (error) {
        console.error('Erro ao buscar métricas:', error);
        setAvailableMeters([{ id: 'all', name: 'Todas as Métricas' }]);
      }
    };
    
    if (getChartData) {
      fetchAvailableMeters();
    }
  }, [getChartData]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Add 1 to period to compensate for filtering out current incomplete cycle
        const adjustedPeriod = (parseInt(period) + 1).toString();
        
        let evolutionData;
        
        // Se "Todas as Métricas" estiver selecionado, usar função original
        if (selectedMeter === 'all') {
          evolutionData = await getChartData('evolution', undefined, adjustedPeriod);
        } else {
          // Caso contrário, usar filtro de meter específico
          evolutionData = await getChartDataWithMeterFilter(adjustedPeriod, selectedMeter);
        }
        
        const dataArray = Array.isArray(evolutionData) ? evolutionData : [];
        
        // Filter out incomplete current cycle
        const filteredData = filterCompleteCycles(dataArray);
        
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
  }, [period, selectedMetric, selectedMeter, getChartData]);

  // Nova função para buscar dados com filtro de meter_name
  const getChartDataWithMeterFilter = async (cycleLimit: string, meterFilter: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('cliente_id')
        .eq('id', user?.id)
        .maybeSingle();

      if (!profile?.cliente_id) return [];

      const { data: client } = await supabase
        .from('api_clientes')
        .select('preco_por_ipu')
        .eq('id', profile.cliente_id)
        .maybeSingle();

      if (!client?.preco_por_ipu) return [];

      const { data: configs } = await supabase
        .from('api_configuracaoidmc')
        .select('id')
        .eq('cliente_id', profile.cliente_id);

      if (!configs || configs.length === 0) return [];

      const configIds = configs.map(config => config.id);

      // Buscar dados com filtro opcional de meter_name
      let query = supabase
        .from('api_consumosummary')
        .select('billing_period_start_date, billing_period_end_date, consumption_ipu, meter_name')
        .in('configuracao_id', configIds)
        .gt('consumption_ipu', 0)
        .neq('meter_name', 'Sandbox Organizations IPU Usage');

      // Aplicar filtro de meter_name se não for "all"
      if (meterFilter !== 'all') {
        query = query.eq('meter_name', meterFilter);
      }

      const { data: consumptionData, error } = await query
        .order('billing_period_start_date');

      if (error || !consumptionData) return [];

      // Obter todos os ciclos únicos
      const { data: allCycles } = await supabase
        .rpc('get_available_cycles');

      if (!allCycles) return [];

      // Ordenar ciclos e limitar se necessário
      const sortedCycles = allCycles
        .sort((a, b) => new Date(a.billing_period_start_date).getTime() - new Date(b.billing_period_start_date).getTime())
        .slice(-parseInt(cycleLimit));

      // Group consumption by billing period
      const periodMap = new Map();

      // Inicializar todos os ciclos com valor zero
      sortedCycles.forEach(cycle => {
        const periodKey = `${cycle.billing_period_start_date}_${cycle.billing_period_end_date}`;
        const periodLabel = `${new Date(cycle.billing_period_start_date + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})} - ${new Date(cycle.billing_period_end_date + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`;
        
        periodMap.set(periodKey, {
          period: periodLabel,
          totalIPU: 0,
          billing_period_start_date: cycle.billing_period_start_date,
          billing_period_end_date: cycle.billing_period_end_date,
          periodStart: cycle.billing_period_start_date,
          periodEnd: cycle.billing_period_end_date
        });
      });

      // Somar consumo real dos dados retornados
      consumptionData.forEach(item => {
        const periodKey = `${item.billing_period_start_date}_${item.billing_period_end_date}`;
        if (periodMap.has(periodKey)) {
          periodMap.get(periodKey).totalIPU += item.consumption_ipu || 0;
        }
      });

      // Converter para array e calcular custos
      const result = Array.from(periodMap.values())
        .sort((a, b) => new Date(a.billing_period_start_date).getTime() - new Date(b.billing_period_start_date).getTime())
        .map(item => ({
          period: item.period,
          ipu: item.totalIPU,
          cost: item.totalIPU * client.preco_por_ipu,
          periodStart: item.periodStart,
          periodEnd: item.periodEnd
        }));

      return result;
    } catch (error) {
      console.error('Erro ao buscar dados do gráfico:', error);
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

  const getMeterLabel = () => {
    const foundMeter = availableMeters.find(m => m.id === selectedMeter);
    return foundMeter?.name || selectedMeter;
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
    
    const currentKey = selectedMetric === 'cost' ? 'cost' : 'ipu';
    const currentPeriodData = chartData[chartData.length - 1];
    const previousPeriodData = chartData[chartData.length - 2];
    
    if (!currentPeriodData || !previousPeriodData) return { percentage: 0, isPositive: false, isStable: true };
    
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
      link.download = `analise-tendencia-${selectedMeter === 'all' ? 'todas-metricas' : selectedMeter}-${new Date().toISOString().split('T')[0]}.png`;
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
            {selectedMetric === 'cost' ? formatCurrency(value) : `${formatIPU(value)} IPUs`}
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

      <Card className="bg-gradient-card shadow-medium" id="cost-trend-container">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Análise de Tendências
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

            <Select value={selectedMeter} onValueChange={setSelectedMeter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione uma métrica" />
              </SelectTrigger>
              <SelectContent>
                {availableMeters.length > 0 ? (
                  availableMeters.map(meterItem => (
                    <SelectItem key={meterItem.id} value={meterItem.id}>
                      {meterItem.name}
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
                  name={selectedMeter === 'all' ? getMetricLabel() : `${getMeterLabel()} - ${getMetricLabel()}`}
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