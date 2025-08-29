import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList } from "recharts";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface ConsolidatedChartProps {
  selectedOrg?: string;
  availableOrgs: Array<{value: string, label: string}>;
}

interface ChartDataItem {
  period: string;
  [key: string]: any;
}

interface MetricOption {
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

export function ConsolidatedChart({ selectedOrg, availableOrgs }: ConsolidatedChartProps) {
  const [selectedOrgLocal, setSelectedOrgLocal] = useState<string>("all");
  const [period, setPeriod] = useState("3"); // Default to 3 cycles
  const [selectedMetric, setSelectedMetric] = useState<string>("all");
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricOptions, setMetricOptions] = useState<MetricOption[]>([]);
  const [allDataKeys, setAllDataKeys] = useState<string[]>([]);
  const [contractedValue, setContractedValue] = useState(0);
  const [totalAvailableCycles, setTotalAvailableCycles] = useState(0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase.from('profiles').select('cliente_id').eq('id', user.id).single();
      if (!profile?.cliente_id) { setLoading(false); return; }
      
      const { data: client } = await supabase.from('api_clientes').select('preco_por_ipu, qtd_ipus_contratadas').eq('id', profile.cliente_id).single();
      const pricePerIPU = client?.preco_por_ipu || 0;
      const contractedIPUs = client?.qtd_ipus_contratadas || 0;
      setContractedValue(contractedIPUs * pricePerIPU);

      const { data: configs } = await supabase.from('api_configuracaoidmc').select('id').eq('cliente_id', profile.cliente_id);
      if (!configs || configs.length === 0) { setLoading(false); return; }
      const configIds = configs.map(config => config.id);

      const cycleLimit = parseInt(period);

      const { data: availableCyclesData, error: cyclesError } = await supabase
        .from('api_consumosummary')
        .select('billing_period_start_date, billing_period_end_date')
        .in('configuracao_id', configIds)
        .gt('consumption_ipu', 0)
        .order('billing_period_end_date', { ascending: false });

      if (cyclesError) {
        console.error('Error fetching cycles from consumosummary:', cyclesError);
        setLoading(false);
        return;
      }

      const allUniqueCycles = Array.from(
        new Map(availableCyclesData.map(cycle => [
          `${cycle.billing_period_start_date}_${cycle.billing_period_end_date}`,
          {
            start: cycle.billing_period_start_date,
            end: cycle.billing_period_end_date,
          }
        ])).values()
      ).sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime());

      setTotalAvailableCycles(allUniqueCycles.length);

      const cyclesToFetch = allUniqueCycles.slice(0, cycleLimit).reverse();

      if (cyclesToFetch.length === 0) {
        setChartData([]);
        setMetricOptions([{ value: "all", label: "Todas as Métricas" }]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('api_consumosummary')
        .select('billing_period_start_date, billing_period_end_date, meter_name, consumption_ipu, org_id')
        .in('configuracao_id', configIds)
        .gte('billing_period_start_date', cyclesToFetch[0].start)
        .lte('billing_period_end_date', cyclesToFetch[cyclesToFetch.length - 1].end)
        .gt('consumption_ipu', 0)
        .neq('meter_name', 'Sandbox Organizations IPU Usage');

      if (selectedOrgLocal !== "all") {
        query = query.eq('org_id', selectedOrgLocal);
      }

      const { data, error } = await query;
      if (error) throw error;

      const periodMap = new Map<string, any>();
      cyclesToFetch.forEach(cycle => {
        const periodLabel = `${new Date(cycle.start + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})} - ${new Date(cycle.end + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`;
        periodMap.set(periodLabel, { period: periodLabel, start: cycle.start });
      });

      const metricsMap = new Map<string, string>();

      if (data) {
        data.forEach((item: any) => {
          const cleanedMetricName = (item.meter_name || "Métrica não informada")
            .replace(/\s\s+/g, ' ')
            .trim();

          if (!cleanedMetricName) return;

          const lowerCaseMetricName = cleanedMetricName.toLowerCase();
          const cost = (item.consumption_ipu || 0) * pricePerIPU;

          if (cost <= 0) return;

          if (!metricsMap.has(lowerCaseMetricName)) {
            metricsMap.set(lowerCaseMetricName, cleanedMetricName);
          }
          
          const metricNameToUse = metricsMap.get(lowerCaseMetricName)!;

          const periodLabel = `${new Date(item.billing_period_start_date + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})} - ${new Date(item.billing_period_end_date + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`;
          const periodData = periodMap.get(periodLabel);
          if (periodData) {
            periodData[metricNameToUse] = (periodData[metricNameToUse] || 0) + cost;
          }
        });
      }

      const processedData = Array.from(periodMap.values())
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      setChartData(processedData);

      const metricsList = Array.from(metricsMap.values()).sort();
      setMetricOptions([
        { value: "all", label: "Todas as Métricas" },
        ...metricsList.map(metric => ({ value: metric, label: metric }))
      ]);
      setAllDataKeys(metricsList);

    } catch (error) {
      console.error('Error fetching chart data:', error);
      toast.error('Erro ao carregar dados do gráfico');
    } finally {
      setLoading(false);
    }
  }, [selectedOrgLocal, period]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  const getFilteredDataKeys = () => {
    if (selectedMetric === "all") {
        return allDataKeys;
    }
    
    const filtered = allDataKeys.filter(key => key === selectedMetric);
    
    if (filtered.length === 0 && selectedMetric !== "all") {
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
    if (chartDataWithDisplayTotal.length === 0) return [0, contractedValue > 0 ? contractedValue * 1.1 : 1000];

    let maxVal = selectedMetric === 'all' ? contractedValue : 0;
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
                {formatCurrency(value)}
            </text>
        );
    }
    return null;
  };

  const handleDownload = async () => {
    try {
      const chartElement = document.getElementById('consolidated-chart');
      if (!chartElement) return;

      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `custo-consolidado-${new Date().toISOString().split('T')[0]}.png`;
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
            const metric = item.dataKey;
            return (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">
                  {metric}:
                </span>
                <span className="font-medium text-foreground">
                  {formatCurrency(item.value)}
                </span>
              </div>
            );
          })}
          <div className="border-t border-border mt-2 pt-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
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
              Análise Consolidada de Custos
            </CardTitle>
            <div className="text-sm text-muted-foreground mt-1">
              Custos por métrica ao longo dos ciclos
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
              <SelectItem value="1" disabled={totalAvailableCycles < 1}>Ciclo Atual</SelectItem>
              <SelectItem value="2" disabled={totalAvailableCycles < 2}>Últimos 2 Ciclos</SelectItem>
              <SelectItem value="3" disabled={totalAvailableCycles < 3}>Últimos 3 Ciclos</SelectItem>
              <SelectItem value="6" disabled={totalAvailableCycles < 6}>Últimos 6 Ciclos</SelectItem>
              <SelectItem value="9" disabled={totalAvailableCycles < 9}>Últimos 9 Ciclos</SelectItem>
              <SelectItem value="12" disabled={totalAvailableCycles < 12}>Últimos 12 Ciclos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Métricas" />
            </SelectTrigger>
            <SelectContent>
              {metricOptions.map(option => (
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
        { selectedMetric !== 'all' && (
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              Métrica: {metricOptions.find(m => m.value === selectedMetric)?.label || selectedMetric}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div id="consolidated-chart" className="h-[400px]">
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
                  tickFormatter={formatCurrency}
                  domain={yAxisDomain()}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {contractedValue > 0 && selectedMetric === 'all' && (
                  <ReferenceLine y={contractedValue} label={{ value: `Contratado: ${formatCurrency(contractedValue)}`, position: 'insideTopRight' }} stroke="red" strokeDasharray="3 3" />
                )}

                {filteredDataKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="costs"
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
