import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList } from "recharts";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { useDashboardData } from "@/hooks/useDashboardData"; // Import useDashboardData

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
  const [selectedOrgLocal, setSelectedOrgLocal] = useState<string>(selectedOrg || "all");
  const [period, setPeriod] = useState("3"); // Default to 3 cycles
  const [selectedMetric, setSelectedMetric] = useState<string>("all");
  const [valueType, setValueType] = useState<"cost" | "ipu">("cost");
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricOptions, setMetricOptions] = useState<MetricOption[]>([]);
  const [allDataKeys, setAllDataKeys] = useState<string[]>([]);
  const [contractedValue, setContractedValue] = useState<number>(0);

  // Use useDashboardData hook to fetch data
  const { getChartData: getDashboardChartData, availableCycles } = useDashboardData(selectedOrgLocal === "all" ? undefined : selectedOrgLocal);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatIPU = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await getDashboardChartData('billing-periods', selectedOrgLocal, period);
        if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
          // Handle object result with data property
          setChartData(result.data);
          setAllDataKeys(result.meters || []);
          setContractedValue(result.contractedReferenceValue || 0);

          // Update metric options based on fetched meters
          const newMetricOptions = (result.meters || []).map((meter: string) => ({ value: meter, label: meter }));
          setMetricOptions([{ value: "all", label: "Todas as Métricas" }, ...newMetricOptions]);
        } else if (result && Array.isArray(result)) {
          // Handle array result - try to convert to ChartDataItem format
          const convertedData = result.filter(item => item && typeof item === 'object' && 'period' in item) as ChartDataItem[];
          setChartData(convertedData);
          setAllDataKeys([]);
          setContractedValue(0);
          setMetricOptions([{ value: "all", label: "Todas as Métricas" }]);
        } else {
          setChartData([]);
          setAllDataKeys([]);
          setContractedValue(0);
          setMetricOptions([{ value: "all", label: "Todas as Métricas" }]);
        }
      } catch (error) {
        toast.error('Erro ao carregar dados do gráfico');
      } finally {
        setLoading(false);
      }
    };
    if (getDashboardChartData) {
      fetchData();
    }
  }, [selectedOrgLocal, period, getDashboardChartData]);

  // Update selectedOrgLocal when selectedOrg prop changes
  useEffect(() => {
    setSelectedOrgLocal(selectedOrg || "all");
  }, [selectedOrg]);

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
    if (chartDataWithDisplayTotal.length === 0) return [0, 1000]; // Default if no data

    let maxVal = 0;
    chartDataWithDisplayTotal.forEach(d => {
      const total = d.displayTotal || 0;
      if (total > maxVal) {
        maxVal = total;
      }
    });

    // Include contracted value in domain calculation when showing in default view
    if (selectedOrgLocal === "all" && selectedMetric === "all" && contractedValue > 0) {
      maxVal = Math.max(maxVal, contractedValue);
    }

    return [0, maxVal * 1.1]; // Add 10% padding
  };

  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value > 0) {
        return (
            <text x={x + width / 2} y={y} fill="#3a3a3a" textAnchor="middle" dy={-6} fontSize={12} fontWeight="bold">
                {valueType === 'cost' ? formatCurrency(value) : formatIPU(value)}
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
                  {valueType === 'cost' ? formatCurrency(item.value) : formatIPU(item.value)}
                </span>
              </div>
            );
          })}
          <div className="border-t border-border mt-2 pt-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span>Total:</span>
              <span>{valueType === 'cost' ? formatCurrency(total) : formatIPU(total)}</span>
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
              Análise Consolidada de Custos por Métrica
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
            Exportar
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
              <SelectItem value="all">Todas as Organizações</SelectItem>              
              <SelectItem value="1" disabled={availableCycles.length < 1}>Ciclo Atual</SelectItem>
              <SelectItem value="2" disabled={availableCycles.length < 2}>Últimos 2 Ciclos</SelectItem>
              <SelectItem value="3" disabled={availableCycles.length < 3}>Últimos 3 Ciclos</SelectItem>
              <SelectItem value="6" disabled={availableCycles.length < 6}>Últimos 6 Ciclos</SelectItem>
              <SelectItem value="9" disabled={availableCycles.length < 9}>Últimos 9 Ciclos</SelectItem>
              <SelectItem value="12" disabled={availableCycles.length < 12}>Últimos 12 Ciclos</SelectItem>
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

          <Select value={valueType} onValueChange={(value: "cost" | "ipu") => setValueType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ipu">IPUs</SelectItem>
              <SelectItem value="cost">Custo</SelectItem>
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
                  tickFormatter={(value) => 
                    valueType === 'cost' ? formatCurrency(value) : formatIPU(value)
                  }
                  domain={yAxisDomain()}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Show contracted value reference line in default view */}
                {selectedOrgLocal === "all" && selectedMetric === "all" && contractedValue > 0 && (
                  <ReferenceLine 
                    y={contractedValue} 
                    stroke="hsl(var(--destructive))" 
                    strokeDasharray="5 5" 
                    strokeWidth={2}
                    label={{ 
                      value: `Valor Contratado: ${valueType === 'cost' ? formatCurrency(contractedValue) : formatIPU(contractedValue)}`, 
                      position: "top",
                      fill: "hsl(var(--destructive))",
                      fontSize: 12,
                      fontWeight: "bold"
                    }}
                  />
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