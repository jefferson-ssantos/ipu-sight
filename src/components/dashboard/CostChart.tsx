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
  Cell
} from "recharts";
import { Download, TrendingUp, Calendar } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";

const mockData = [
  { period: "Nov/24", ipu: 1250000, cost: 125000, date: "2024-11" },
  { period: "Dez/24", ipu: 1450000, cost: 145000, date: "2024-12" },
  { period: "Jan/25", ipu: 1320000, cost: 132000, date: "2025-01" },
  { period: "Fev/25", ipu: 1680000, cost: 168000, date: "2025-02" },
  { period: "Mar/25", ipu: 1890000, cost: 189000, date: "2025-03" },
  { period: "Abr/25", ipu: 2100000, cost: 210000, date: "2025-04" }
];

const STABLE_COLORS = [
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
}

export function CostChart({ 
  title, 
  type = "area", 
  data, 
  showFilters = true,
  className,
  selectedOrg
}: CostChartProps) {
  const [period, setPeriod] = useState("6-months");
  const [metric, setMetric] = useState("cost");
  const [chartData, setChartData] = useState<any[]>(data || mockData);
  const { getChartData } = useDashboardData();

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
    if (data) {
      setChartData(data);
    } else if (getChartData) {
      const fetchData = async () => {
        console.log('CostChart: Fetching data with period:', period, 'metric:', metric, 'type:', type);
        const chartType = type === 'pie' ? 'distribution' : 'evolution';
        const realData = await getChartData(chartType, selectedOrg);
        console.log('CostChart: Received data:', realData);
        setChartData(realData.length > 0 ? realData : (type === 'pie' ? orgData : mockData));
      };
      fetchData();
    }
  }, [data, type, selectedOrg, getChartData, period, metric]);

  const formatIPU = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1).replace('.', ',')}M IPUs`;
    }
    return `${(value / 1000).toFixed(0)}K IPUs`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-strong">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">
                {entry.dataKey === 'cost' ? 'Custo: ' : 'IPU: '}
              </span>
              <span className="font-medium text-foreground">
                {entry.dataKey === 'cost' 
                  ? formatCurrency(entry.value) 
                  : formatIPU(entry.value)
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="period" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={metric === 'cost' ? formatCurrency : formatIPU}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey={metric} 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
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
            <AreaChart data={chartData}>
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

  return (
    <Card className={`bg-gradient-card shadow-medium border-border ${className}`}>
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

            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
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