import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface MetricData {
  meter_name: string;
  metric_category: string;
  total_consumption: number;
}

interface MetricBarChartStarterProps {
  selectedOrg?: string;
  availableOrgs: Array<{value: string, label: string}>;
}

export function MetricBarChartStarter({ selectedOrg = "all", availableOrgs }: MetricBarChartStarterProps) {
  const { user } = useAuth();
  const [data, setData] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSelectedOrg, setLocalSelectedOrg] = useState<string>(selectedOrg);
  const [selectedCycleFilter, setSelectedCycleFilter] = useState<string>("1");
  const [availableCycles, setAvailableCycles] = useState<any[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  const cycleFilterOptions = [
    { value: '1', label: 'Ciclo Atual' },
    { value: '2', label: 'Últimos 2 Ciclos' },
    { value: '3', label: 'Últimos 3 Ciclos' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);

        // Get user profile
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
        const { data: cyclesData } = await supabase
          .rpc('get_available_cycles');

        setAvailableCycles(cyclesData || []);

        // Use consumption summary data with cycle filtering
        const cycleLimit = parseInt(selectedCycleFilter);

        // Get unique cycles for filtering
        const { data: availableCyclesData } = await supabase
          .rpc('get_available_cycles');

        // Apply cycle filtering manually
        let billingQuery = supabase
          .from('api_consumosummary')
          .select('meter_name, metric_category, consumption_ipu, billing_period_start_date, billing_period_end_date')
          .in('configuracao_id', configIds)
          .neq('meter_name', 'Sandbox Organizations IPU Usage')
          .gt('consumption_ipu', 0);

        if (localSelectedOrg !== "all") {
          billingQuery = billingQuery.eq('org_id', localSelectedOrg);
        }

        // Apply cycle filtering (max 3 cycles)
        if (availableCyclesData?.length) {
          const cyclesToInclude = availableCyclesData.slice(0, Math.min(cycleLimit, 3));
          
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
              total_consumption: 0
            };
          }
          acc[key].total_consumption += item.consumption_ipu;
          return acc;
        }, {} as Record<string, MetricData>);

        const metricsArray = Object.values(groupedData);

        // Sort by consumption and take top 10
        const processedData = metricsArray
          .sort((a, b) => b.total_consumption - a.total_consumption)
          .slice(0, 10);

        setData(processedData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, localSelectedOrg, selectedCycleFilter]);

  const formatIPU = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const chartData = data.map(item => ({
    name: `${item.meter_name}`,
    category: item.metric_category,
    consumption: item.total_consumption,
    displayName: item.meter_name.length > 15 ? item.meter_name.substring(0, 15) + '...' : item.meter_name
  }));

  const handleDownload = async () => {
    const chartContainer = document.getElementById('metric-bar-chart-container');
    if (!chartContainer) return;
    
    try {
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
      link.download = `metricas-consumo-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast("Gráfico exportado com sucesso!");
    } catch (error) {
      toast("Erro ao exportar gráfico");
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-muted-foreground">{data.category}</p>
          <p className="text-primary">{formatIPU(data.consumption)} IPUs</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card shadow-medium">
        <CardHeader>
          <CardTitle>Análise Consolidada de Custos por Métrica</CardTitle>
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
    <Card className="bg-gradient-card shadow-medium" id="metric-bar-chart-container">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Análise Consolidada de Custos por Métrica</CardTitle>
        
        <div className="flex items-center gap-4">
          <Select value={selectedCycleFilter} onValueChange={setSelectedCycleFilter}>
            <SelectTrigger className="w-[180px] bg-background border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              {cycleFilterOptions.map((option) => {
                const isDisabled = parseInt(option.value) > availableCycles.length;
                
                return (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    disabled={isDisabled}
                    className="focus:bg-accent focus:text-accent-foreground"
                  >
                    {option.label}
                    {isDisabled && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (Indisponível)
                      </span>
                    )}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={localSelectedOrg} onValueChange={setLocalSelectedOrg}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableOrgs.map(org => (
                <SelectItem key={org.value} value={org.value}>
                  {org.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-96">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="displayName" 
                  stroke="hsl(var(--muted-foreground))"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={formatIPU}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="consumption" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Nenhum dado disponível para o período selecionado
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}