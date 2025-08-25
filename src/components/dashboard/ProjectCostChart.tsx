import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts";

interface ProjectData {
  project_name: string;
  consumption_ipu: number;
  cost: number;
  percentage: number;
}

interface ProjectCostChartProps {
  selectedOrg?: string;
  selectedCycleFilter: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--warning))',
  'hsl(var(--success))',
  'hsl(var(--info))',
  'hsl(var(--muted-foreground))'
];

export function ProjectCostChart({ selectedOrg, selectedCycleFilter }: ProjectCostChartProps) {
  const { user } = useAuth();
  const [projectData, setProjectData] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatIPU = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1).replace('.', ',')}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString('pt-BR');
  };

  useEffect(() => {
    if (!user) return;

    const fetchProjectData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get user's profile to get client_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('cliente_id')
          .eq('id', user.id)
          .single();

        if (!profile?.cliente_id) {
          throw new Error('Profile not found');
        }

        // Get configuration IDs for this client
        const { data: configs } = await supabase
          .from('api_configuracaoidmc')
          .select('id')
          .eq('cliente_id', profile.cliente_id);

        if (!configs || configs.length === 0) {
          throw new Error('No configurations found');
        }

        const configIds = configs.map(config => config.id);

        // Get available cycles to determine which ones to include
        const { data: availableCycles } = await supabase
          .from('api_consumosummary')
          .select('billing_period_start_date, billing_period_end_date')
          .in('configuracao_id', configIds)
          .neq('meter_name', 'Sandbox Organizations IPU Usage')
          .order('billing_period_end_date', { ascending: false });

        if (!availableCycles || availableCycles.length === 0) {
          throw new Error('No billing cycles found');
        }

        // Get unique cycles and limit by selectedCycleFilter
        const uniqueCycles = Array.from(
          new Map(availableCycles.map(cycle => [
            `${cycle.billing_period_start_date}-${cycle.billing_period_end_date}`,
            cycle
          ])).values()
        ).slice(0, parseInt(selectedCycleFilter));

        if (uniqueCycles.length === 0) {
          throw new Error('No cycles available for the selected filter');
        }

        // Build query for project consumption
        let query = supabase
          .from('api_consumoprojectfolder')
          .select('project_name, total_consumption_ipu, consumption_date')
          .in('configuracao_id', configIds)
          .gt('total_consumption_ipu', 0);

        // Apply organization filter if specified
        if (selectedOrg && selectedOrg !== 'all') {
          query = query.eq('org_id', selectedOrg);
        }

        // Apply date filter based on available cycles
        const startDate = uniqueCycles[uniqueCycles.length - 1].billing_period_start_date;
        const endDate = uniqueCycles[0].billing_period_end_date;
        
        query = query.gte('consumption_date', startDate).lte('consumption_date', endDate);

        const { data: projectConsumption, error: projectError } = await query;

        if (projectError) throw projectError;

        if (!projectConsumption || projectConsumption.length === 0) {
          setProjectData([]);
          return;
        }

        // Get IPU price from client data
        const { data: clientData } = await supabase
          .from('api_clientes')
          .select('preco_por_ipu')
          .eq('id', profile.cliente_id)
          .single();

        const pricePerIPU = clientData?.preco_por_ipu || 1;

        // Aggregate data by project
        const projectMap = new Map<string, { consumption_ipu: number; cost: number }>();

        projectConsumption.forEach(item => {
          if (!item.project_name) return;
          
          const existing = projectMap.get(item.project_name) || { consumption_ipu: 0, cost: 0 };
          const consumption = item.total_consumption_ipu || 0;
          
          projectMap.set(item.project_name, {
            consumption_ipu: existing.consumption_ipu + consumption,
            cost: existing.cost + (consumption * pricePerIPU)
          });
        });

        // Convert to array and calculate percentages
        const totalCost = Array.from(projectMap.values()).reduce((sum, item) => sum + item.cost, 0);
        
        const projectArray: ProjectData[] = Array.from(projectMap.entries())
          .map(([project_name, data]) => ({
            project_name,
            consumption_ipu: data.consumption_ipu,
            cost: data.cost,
            percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0
          }))
          .sort((a, b) => b.cost - a.cost)
          .slice(0, 10); // Top 10 projects

        setProjectData(projectArray);

      } catch (err) {
        console.error('Error fetching project data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [user, selectedOrg, selectedCycleFilter]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.project_name}</p>
          <p className="text-sm text-muted-foreground">
            IPUs: {formatIPU(data.consumption_ipu)}
          </p>
          <p className="text-sm font-medium text-primary">
            Custo: {formatCurrency(data.cost)}
          </p>
          <p className="text-sm text-muted-foreground">
            {data.percentage.toFixed(1)}% do total
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pl-4">
        {payload?.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="truncate font-medium" title={entry.value}>
              {entry.value}
            </span>
            <span className="text-muted-foreground ml-auto font-medium">
              {entry.payload.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card shadow-medium">
        <CardHeader>
          <CardTitle className="text-lg font-heading font-bold">
            Custos por Projeto
          </CardTitle>
          <CardDescription>
            Distribuição de custos entre os projetos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Carregando...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || projectData.length === 0) {
    return (
      <Card className="bg-gradient-card shadow-medium">
        <CardHeader>
          <CardTitle className="text-lg font-heading font-bold">
            Custos por Projeto
          </CardTitle>
          <CardDescription>
            Distribuição de custos entre os projetos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {error || 'Nenhum dado de projeto encontrado para o período selecionado.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-medium">
      <CardHeader>
        <CardTitle className="text-lg font-heading font-bold">
          Custos por Projeto
        </CardTitle>
        <CardDescription>
          Distribuição de custos entre os projetos (Top 10)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex">
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="cost"
                  nameKey="project_name"
                >
                  {projectData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-48 flex-shrink-0">
            <CustomLegend payload={projectData.map((item, index) => ({
              value: item.project_name,
              color: COLORS[index % COLORS.length],
              payload: item
            }))} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}