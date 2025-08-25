import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LabelList,
  ReferenceLine
} from "recharts";
import { Download, TrendingUp, Calendar } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import html2canvas from "html2canvas";

const mockData = [
  { period: "Nov/24", ipu: 1250000, cost: 125000, date: "2024-11" },
  { period: "Dez/24", ipu: 1450000, cost: 145000, date: "2024-12" },
  { period: "Jan/25", ipu: 1320000, cost: 132000, date: "2025-01" },
  { period: "Fev/25", ipu: 1680000, cost: 168000, date: "2025-02" },
  { period: "Mar/25", ipu: 1890000, cost: 189000, date: "2025-03" },
  { period: "Abr/25", ipu: 2100000, cost: 210000, date: "2025-04" }
];

export const STABLE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))", 
  "hsl(var(--accent))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted))"
];

const orgData = [
  { name: "Produção", value: 65, cost: 136500, color: STABLE_COLORS[0] },
  { name: "Desenvolvimento", value: 25, cost: 52500, color: STABLE_COLORS[1] },
  { name: "Teste", value: 10, cost: 21000, color: STABLE_COLORS[2] }
];

interface CostChartProps {
  title: string;
  type?: "area" | "bar" | "pie";
  data?: any[];
  showFilters?: boolean;
  className?: string;
  selectedOrg?: string;
  selectedPeriod?: string;
  selectedCycleFilter?: string;
  getChartData?: (type: 'evolution' | 'distribution' | 'billing-periods', selectedOrg?: string, selectedPeriod?: string) => Promise<any>;
}

export function CostChart({ 
  title, 
  type = "area", 
  data, 
  showFilters = true,
  className,
  selectedOrg,
  selectedPeriod,
  selectedCycleFilter,
  getChartData
}: CostChartProps) {
  const [period, setPeriod] = useState(selectedPeriod || "6-months");
  const [metric, setMetric] = useState("cost");
  const [chartData, setChartData] = useState<any[]>(data || mockData);
  const [hoveredTotal, setHoveredTotal] = useState<number | null>(null);
  const [billingData, setBillingData] = useState<any>(null);
  const [contractedValue, setContractedValue] = useState<number>(0);
  const { data: dashboardData } = useDashboardData();
  const chartRef = useRef<HTMLDivElement>(null);

  const stableChartData = useMemo(() => {
    if (type === 'pie') {
      return chartData.map((item, index) => ({
        ...item,
        color: STABLE_COLORS[index % STABLE_COLORS.length]
      }));
    }
    return chartData;
  }, [chartData, type]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  useEffect(() => {
    if (selectedPeriod) {
      setPeriod(selectedPeriod);
    }
  }, [selectedPeriod]);

  // Set contracted value when dashboard data is available
  useEffect(() => {
    if (dashboardData?.contractedIPUs && dashboardData?.pricePerIPU) {
      const calculatedValue = dashboardData.contractedIPUs * dashboardData.pricePerIPU;
      console.log('CostChart: Calculating contracted value:', {
        contractedIPUs: dashboardData.contractedIPUs,
        pricePerIPU: dashboardData.pricePerIPU,
        calculatedValue
      });
      setContractedValue(calculatedValue);
    } else {
      console.log('CostChart: Dashboard data not available for contracted value:', dashboardData);
    }
  }, [dashboardData]);

  useEffect(() => {
    if (data) {
      setChartData(data);
    } else if (getChartData) {
      const fetchData = async () => {
        console.log('CostChart: Fetching data with cycleFilter:', selectedCycleFilter, 'metric:', metric, 'type:', type);
        
        if (type === 'bar') {
          // Special handling for billing periods stacked bar chart
          const billingResult = await getChartData('billing-periods', selectedOrg, selectedCycleFilter);
          console.log('CostChart: Billing periods data:', billingResult);
          if (billingResult && typeof billingResult === 'object' && 'data' in billingResult) {
            setBillingData(billingResult);
            setChartData(billingResult.data);
          } else {
            setChartData(mockData);
          }
        } else {
          const chartType = type === 'pie' ? 'distribution' : 'evolution';
          const realData = await getChartData(chartType, selectedOrg, selectedCycleFilter);
          console.log('CostChart: Received data:', realData);
          if (Array.isArray(realData)) {
            setChartData(realData.length > 0 ? realData : (type === 'pie' ? orgData : mockData));
          } else {
            setChartData(type === 'pie' ? orgData : mockData);
          }
        }
      };
      fetchData();
    }
  }, [data, type, selectedOrg, getChartData, selectedCycleFilter, metric]);

  const formatIPU = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1).replace('.', ',')}M IPUs`;
    }
    return `${(value / 1000).toFixed(0)}K IPUs`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Filter out zero values for stacked bar chart
      const nonZeroPayload = type === 'bar' ? 
        payload.filter((entry: any) => entry.value > 0) : 
        payload;

      if (nonZeroPayload.length === 0) return null;

      // Calculate total for bar chart and set hovered total
      if (type === 'bar' && billingData?.meters) {
        const total = billingData.meters.reduce((sum: number, meter: string) => {
          const meterValue = payload.find((p: any) => p.dataKey === meter)?.value || 0;
          return sum + meterValue;
        }, 0);
        setHoveredTotal(total);
      }

      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-strong">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {nonZeroPayload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">
                {entry.name || entry.dataKey}: 
              </span>
              <span className="font-medium text-foreground">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    } else {
      // Reset hovered total when not hovering
      setHoveredTotal(null);
    }
    return null;
  };

  // Custom label for total value above bars with dot
  const renderTotalLabel = (props: any) => {
    const { payload, x, y, width } = props;
    if (!payload || !billingData?.meters) return null;
    
    const total = billingData.meters.reduce((sum: number, meter: string) => {
      return sum + (payload[meter] || 0);
    }, 0);

    if (total === 0) return null;

    return (
      <g>
        {/* Dot above the bar */}
        <circle 
          cx={x + width / 2} 
          cy={y - 15} 
          r="3" 
          fill="hsl(var(--primary))" 
        />
        {/* Total value text */}
        <text 
          x={x + width / 2} 
          y={y - 25} 
          fill="hsl(var(--foreground))" 
          textAnchor="middle" 
          fontSize="12"
          fontWeight="bold"
        >
          {formatCurrency(total)}
        </text>
      </g>
    );
  };

  // Custom tick component for multi-line labels
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    if (!payload?.value) return null;
    
    const lines = payload.value.split('\n');
    
    return (
      <g transform={`translate(${x},${y})`}>
        {lines.map((line: string, index: number) => (
          <text
            key={index}
            x={0}
            y={index * 14}
            dy={12}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize="12"
          >
            {line}
          </text>
        ))}
      </g>
    );
  };

  const renderChart = () => {
    switch (type) {
      case "bar":
        // Calculate max value for Y-axis domain
        const maxDataValue = chartData.length > 0 ? Math.max(...chartData.map(d => {
          const values = Object.values(d).filter((v): v is number => typeof v === 'number' && v > 0);
          return values.length > 0 ? Math.max(...values) : 0;
        })) : 0;
        const maxValue = Math.max(maxDataValue, contractedValue);
        const yAxisMax = maxValue * 1.1; // 10% above max value

        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="period" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tick={<CustomXAxisTick />}
                height={80}
                interval={0}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={formatCurrency}
                domain={[0, yAxisMax]}
              />
              <Tooltip 
                content={<CustomTooltip />}
              />
              {contractedValue > 0 && (
                <ReferenceLine 
                  y={contractedValue} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5"
                  strokeWidth={3}
                  label={{ 
                    value: `Valor Contratado: ${formatCurrency(contractedValue)}`, 
                    position: "top",
                    style: { fill: "hsl(var(--destructive))", fontWeight: "bold" }
                  }}
                />
              )}
               {billingData?.meters?.map((meter: string, index: number) => {
                 // Custom colors for Métricas por Ciclo de Consumo
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
                 const fillColor = title === "Métricas por Ciclo de Consumo" 
                   ? colors[index % colors.length] 
                   : billingData.colors[index];
                 
                 return (
                   <Bar 
                     key={meter}
                     dataKey={meter} 
                     stackId="metrics"
                     fill={fillColor}
                     radius={index === billingData.meters.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                     name={meter}
                   >
                     {index === 0 && <LabelList content={renderTotalLabel} />}
                   </Bar>
                 );
               }) || (
                <Bar 
                  dataKey={metric} 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stableChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {stableChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `${value}% (${formatCurrency(props.payload.cost)})`,
                  name
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default: // area
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="period" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tick={<CustomXAxisTick />}
                height={80}
                interval={0}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={metric === 'cost' ? formatCurrency : formatIPU}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={metric}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#costGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
    }
  };

  const handleDownload = async () => {
    if (!chartRef.current) return;
    
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: 'white',
        scale: 2,
        logging: false,
        width: chartRef.current.offsetWidth,
        height: chartRef.current.offsetHeight,
      });
      
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}_chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating chart image:', error);
    }
  };

  return (
    <Card className={`bg-gradient-card shadow-medium border-border ${className}`} ref={chartRef}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-heading font-bold">
              {title}
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            {/* Total value display for bar chart when hovering */}
            {type === 'bar' && hoveredTotal !== null && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm font-medium">
                Total: {formatCurrency(hoveredTotal)}
              </div>
            )}
            {showFilters && (
              <>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-36">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Ciclo Atual</SelectItem>
                    <SelectItem value="last">Último Ciclo</SelectItem>
                    <SelectItem value="3-months">Últimos 3</SelectItem>
                    <SelectItem value="6-months">Últimos 6</SelectItem>
                    <SelectItem value="12-months">Últimos 12</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={metric} onValueChange={setMetric}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cost">Custo</SelectItem>
                    <SelectItem value="ipu">IPU</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}

            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {renderChart()}
        
        {type === "pie" && (
          <div className="flex justify-center mt-4 gap-6 flex-wrap">
            {stableChartData.slice(0, 4).map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm font-medium">{entry.name}</span>
                <span className="text-sm text-muted-foreground">
                  {entry.value}%
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}