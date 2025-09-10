import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface MetricData {
  meter_name: string;
  metric_category: string;
  total_consumption: number;
  percentage: number;
}

interface MetricBreakdownStarterProps {
  selectedOrg?: string;
}

export function MetricBreakdownStarter({ selectedOrg }: MetricBreakdownStarterProps) {
  const [data, setData] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCycleFilter, setSelectedCycleFilter] = useState<string>("1");

  const cycleOptions = [
    { value: '1', label: 'Ciclo Atual' },
    { value: '2', label: 'Últimos 2 Ciclos' },
    { value: '3', label: 'Últimos 3 Ciclos' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get user profile
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('cliente_id')
          .eq('id', user.id)
          .single();

        if (!profile) return;

        // Get configurations
        const { data: configs } = await supabase
          .from('api_configuracaoidmc')
          .select('id')
          .eq('cliente_id', profile.cliente_id);

        if (!configs?.length) return;

        const configIds = configs.map(c => c.id);

        // Get available cycles
        const { data: availableCyclesData } = await supabase
          .rpc('get_available_cycles');

        // Use consumption summary data with cycle filtering
        const cycleLimit = parseInt(selectedCycleFilter);

        let billingQuery = supabase
          .from('api_consumosummary')
          .select('meter_name, metric_category, consumption_ipu, billing_period_start_date, billing_period_end_date')
          .in('configuracao_id', configIds)
          .neq('meter_name', 'Sandbox Organizations IPU Usage')
          .gt('consumption_ipu', 0);

        if (selectedOrg && selectedOrg !== "all") {
          billingQuery = billingQuery.eq('org_id', selectedOrg);
        }

        // Apply cycle filtering
        if (availableCyclesData?.length) {
          const cyclesToInclude = availableCyclesData.slice(0, cycleLimit);
          
          if (cyclesToInclude.length === 1) {
            billingQuery = billingQuery
              .eq('billing_period_start_date', cyclesToInclude[0].billing_period_start_date)
              .eq('billing_period_end_date', cyclesToInclude[0].billing_period_end_date);
          } else if (cyclesToInclude.length > 1) {
            const orConditions = cyclesToInclude.map(cycle => 
              `and(billing_period_start_date.eq.${cycle.billing_period_start_date},billing_period_end_date.eq.${cycle.billing_period_end_date})`
            ).join(',');
            billingQuery = billingQuery.or(orConditions);
          }
        }

        const { data: billingData } = await billingQuery;

        if (!billingData) return;

        // Group by meter_name and metric_category
        const groupedData = billingData.reduce((acc, item) => {
          const processedMeterName = (item.meter_name || 'Outros').replace(/\s\s+/g, ' ').trim();
          const key = `${processedMeterName}-${item.metric_category || 'General'}`;
          if (!acc[key]) {
            acc[key] = {
              meter_name: processedMeterName,
              metric_category: item.metric_category || 'General',
              total_consumption: 0,
              percentage: 0
            };
          }
          acc[key].total_consumption += item.consumption_ipu;
          return acc;
        }, {} as Record<string, MetricData>);

        const metricsArray = Object.values(groupedData);
        const totalConsumption = metricsArray.reduce((sum, item) => sum + item.total_consumption, 0);

        // Calculate percentages
        const processedData = metricsArray
          .map(item => ({
            ...item,
            percentage: totalConsumption > 0 ? (item.total_consumption / totalConsumption) * 100 : 0
          }))
          .sort((a, b) => b.total_consumption - a.total_consumption);

        setData(processedData);
      } catch (error) {
        console.error('Error fetching metric data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedOrg, selectedCycleFilter]);

  const formatIPU = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const colors = [
    'hsl(24 70% 60%)', // Orange
    'hsl(283 70% 60%)', // Purple
    'hsl(142 70% 45%)', // Green
    'hsl(346 70% 60%)', // Pink
    'hsl(197 70% 55%)', // Blue
    'hsl(43 70% 55%)', // Yellow
  ];

  const chartData = data.slice(0, 6).map((item, index) => ({
    name: `${item.meter_name} (${item.metric_category})`,
    value: item.total_consumption,
    percentage: item.percentage,
    fill: colors[index % colors.length]
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-primary">{formatIPU(data.value)} IPUs</p>
          <p className="text-muted-foreground">{data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card shadow-medium">
        <CardHeader>
          <CardTitle>Detalhamento por Métrica</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-medium">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Detalhamento por Métrica</CardTitle>
        
        <Select value={selectedCycleFilter} onValueChange={setSelectedCycleFilter}>
          <SelectTrigger className="w-[180px] bg-background border-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            {cycleOptions.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value}
                className="focus:bg-accent focus:text-accent-foreground"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ percentage }) => `${percentage.toFixed(1)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Metrics List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.slice(0, 6).map((metric, index) => (
              <div key={`${metric.meter_name}-${metric.metric_category}`} 
                   className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <div>
                    <div className="text-sm font-medium">{metric.meter_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {metric.metric_category}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium">{formatIPU(metric.total_consumption)} IPUs</div>
                  <Badge variant="outline" className="text-xs">
                    {metric.percentage.toFixed(1)}%
                  </Badge>
                </div>                  
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}