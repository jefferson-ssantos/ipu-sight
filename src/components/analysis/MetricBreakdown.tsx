import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Download, Filter } from "lucide-react";

interface MetricData {
  meter_name: string;
  metric_category: string;
  total_consumption: number;
  total_cost: number;
  percentage: number;
}

export function MetricBreakdown() {
  const [data, setData] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [organizations, setOrganizations] = useState<Array<{id: string, name: string}>>([]);

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

        // Get client pricing
        const { data: clientData } = await supabase
          .from('api_clientes')
          .select('preco_por_ipu')
          .eq('id', profile.cliente_id)
          .single();

        if (!clientData) return;

        // Get configurations
        const { data: configs } = await supabase
          .from('api_configuracaoidmc')
          .select('id')
          .eq('cliente_id', profile.cliente_id);

        if (!configs?.length) return;

        const configIds = configs.map(c => c.id);

        // Get organizations for filter
        const { data: orgData } = await supabase
          .from('api_consumosummary')
          .select('org_id, org_name')
          .in('configuracao_id', configIds)
          .not('org_name', 'is', null);

        const uniqueOrgs = Array.from(
          new Map(orgData?.map(item => [item.org_id, item]) || []).values()
        ).map(org => ({ id: org.org_id, name: org.org_name }));

        setOrganizations(uniqueOrgs);

        // Build query for consumption data
        let query = supabase
          .from('api_consumosummary')
          .select('meter_name, metric_category, consumption_ipu, org_id')
          .in('configuracao_id', configIds)
          .gt('consumption_ipu', 0);

        if (selectedOrg !== "all") {
          query = query.eq('org_id', selectedOrg);
        }

        const { data: consumptionData } = await query;

        if (!consumptionData) return;

        // Group by meter_name and metric_category
        const groupedData = consumptionData.reduce((acc, item) => {
          const key = `${item.meter_name}-${item.metric_category}`;
          if (!acc[key]) {
            acc[key] = {
              meter_name: item.meter_name,
              metric_category: item.metric_category,
              total_consumption: 0,
              total_cost: 0,
              percentage: 0
            };
          }
          acc[key].total_consumption += item.consumption_ipu;
          acc[key].total_cost += item.consumption_ipu * clientData.preco_por_ipu;
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
        console.error('Error fetching metric breakdown:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedOrg]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatIPU = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const colors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  const chartData = data.slice(0, 8).map((item, index) => ({
    name: `${item.meter_name} (${item.metric_category})`,
    value: item.total_consumption,
    percentage: item.percentage,
    cost: item.total_cost,
    fill: colors[index % colors.length]
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-primary">{formatIPU(data.value)} IPUs</p>
          <p className="text-secondary-foreground">{formatCurrency(data.cost)}</p>
          <p className="text-muted-foreground">{data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Detalhamento por Métrica</CardTitle>
          
          <div className="flex items-center gap-4">
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Organizações</SelectItem>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
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
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data.slice(0, 10).map((metric, index) => (
                <div key={`${metric.meter_name}-${metric.metric_category}`} 
                     className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <div>
                      <div className="font-medium">{metric.meter_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {metric.metric_category}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold">{formatIPU(metric.total_consumption)} IPUs</div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(metric.total_cost)}
                    </div>
                    <Badge variant="outline" className="text-xs mt-1">
                      {metric.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}