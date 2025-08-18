import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const STABLE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))", 
  "hsl(var(--accent))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted))"
];

interface DashboardData {
  totalCost: number;
  totalIPU: number;
  avgDailyCost: number;
  activeOrgs: number;
  contractedIPUs: number;
  currentPeriod: string;
  periodStart: string;
  periodEnd: string;
  organizations: Array<{
    org_id: string;
    org_name: string;
    consumption_ipu: number;
    cost: number;
    percentage: number;
  }>;
  currentCycle: {
    billing_period_start_date: string;
    billing_period_end_date: string;
  } | null;
}

export function useDashboardData(selectedOrg?: string) {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      console.log('useDashboardData: No user found, skipping data fetch');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        console.log('useDashboardData: Starting data fetch for user:', user.id);
        setLoading(true);
        setError(null);

        // Get user's client information
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('cliente_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile?.cliente_id) throw new Error('Cliente não encontrado');

        // Get client's price per IPU and contracted IPUs
        const { data: client, error: clientError } = await supabase
          .from('api_clientes')
          .select('preco_por_ipu, qtd_ipus_contratadas')
          .eq('id', profile.cliente_id)
          .maybeSingle();

        if (clientError) throw clientError;
        if (!client?.preco_por_ipu) throw new Error('Informações de preço não encontradas para o cliente');

        // First get the configuration IDs for this client
        const { data: configs, error: configError } = await supabase
          .from('api_configuracaoidmc')
          .select('id')
          .eq('cliente_id', profile.cliente_id);

        if (configError) throw configError;
        if (!configs || configs.length === 0) throw new Error('Nenhuma configuração encontrada');

        const configIds = configs.map(config => config.id);

        // Get current billing cycle - get the most recent cycle based on end date
        const { data: currentCycle, error: cycleError } = await supabase
          .from('api_consumosummary')
          .select('billing_period_start_date, billing_period_end_date')
          .in('configuracao_id', configIds)
          .order('billing_period_end_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cycleError) throw cycleError;

        let consumptionQuery = supabase
          .from('api_consumosummary')
          .select('*')
          .in('configuracao_id', configIds);

        // Filter by current cycle if available
        if (currentCycle) {
          consumptionQuery = consumptionQuery
            .eq('billing_period_start_date', currentCycle.billing_period_start_date)
            .eq('billing_period_end_date', currentCycle.billing_period_end_date);
        }

        // Filter by organization if selected
        if (selectedOrg && selectedOrg !== 'all') {
          consumptionQuery = consumptionQuery.eq('org_id', selectedOrg);
        }

        const { data: consumption, error: consumptionError } = await consumptionQuery;

        if (consumptionError) throw consumptionError;

        if (!consumption || consumption.length === 0) {
          setData({
            totalCost: 0,
            totalIPU: 0,
            avgDailyCost: 0,
            activeOrgs: 0,
            contractedIPUs: client.qtd_ipus_contratadas || 0,
            currentPeriod: currentCycle ? 
              new Date(currentCycle.billing_period_start_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) :
              'Sem dados',
            periodStart: currentCycle ? 
              new Date(currentCycle.billing_period_start_date).toLocaleDateString('pt-BR') : 
              '',
            periodEnd: currentCycle ? 
              new Date(currentCycle.billing_period_end_date).toLocaleDateString('pt-BR') : 
              '',
            organizations: [],
            currentCycle
          });
          return;
        }

        // Calculate total IPU consumption
        const totalIPU = consumption.reduce((sum, item) => sum + (item.consumption_ipu || 0), 0);
        
        // Calculate total cost
        const totalCost = totalIPU * client.preco_por_ipu;

        // Calculate average daily cost
        const days = currentCycle ? 
          Math.max(1, Math.ceil((new Date(currentCycle.billing_period_end_date).getTime() - new Date(currentCycle.billing_period_start_date).getTime()) / (1000 * 60 * 60 * 24))) :
          30;
        const avgDailyCost = totalCost / days;

        // Group by organization
        const orgMap = new Map();
        consumption.forEach(item => {
          const orgId = item.org_id || 'unknown';
          const orgName = item.org_name || orgId;
          const ipu = item.consumption_ipu || 0;
          
          if (orgMap.has(orgId)) {
            orgMap.get(orgId).consumption_ipu += ipu;
          } else {
            orgMap.set(orgId, {
              org_id: orgId,
              org_name: orgName,
              consumption_ipu: ipu,
              cost: 0,
              percentage: 0
            });
          }
        });

        // Calculate costs and percentages for organizations
        const organizations = Array.from(orgMap.values()).map(org => ({
          ...org,
          cost: org.consumption_ipu * client.preco_por_ipu,
          percentage: totalIPU > 0 ? Math.round((org.consumption_ipu / totalIPU) * 100) : 0
        })).sort((a, b) => b.consumption_ipu - a.consumption_ipu);

        setData({
          totalCost,
          totalIPU,
          avgDailyCost,
          activeOrgs: organizations.length,
          contractedIPUs: client.qtd_ipus_contratadas || 0,
          currentPeriod: currentCycle ? 
            new Date(currentCycle.billing_period_start_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) :
            'Período atual',
          periodStart: currentCycle ? 
            new Date(currentCycle.billing_period_start_date).toLocaleDateString('pt-BR') : 
            '',
          periodEnd: currentCycle ? 
            new Date(currentCycle.billing_period_end_date).toLocaleDateString('pt-BR') : 
            '',
          organizations,
          currentCycle
        });

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, selectedOrg]);

  const getChartData = async (type: 'evolution' | 'distribution' | 'billing-periods', selectedOrg?: string, selectedPeriod?: string) => {
    if (!user) {
      console.log('getChartData: No user found');
      return [];
    }

    try {
      console.log('getChartData: Starting fetch for type:', type, 'selectedOrg:', selectedOrg);
      // Get user's client information
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('cliente_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !profile?.cliente_id) return [];

      // Get client's price per IPU
      const { data: client, error: clientError } = await supabase
        .from('api_clientes')
        .select('preco_por_ipu')
        .eq('id', profile.cliente_id)
        .maybeSingle();

      if (clientError || !client?.preco_por_ipu) return [];

      // Get configuration IDs
      const { data: configs, error: configError } = await supabase
        .from('api_configuracaoidmc')
        .select('id')
        .eq('cliente_id', profile.cliente_id);

      if (configError || !configs || configs.length === 0) return [];

      const configIds = configs.map(config => config.id);

      if (type === 'billing-periods') {
        // Get data grouped by billing periods for stacked bar chart
        let query = supabase
          .from('api_consumosummary')
          .select('billing_period_start_date, billing_period_end_date, consumption_ipu, meter_name')
          .in('configuracao_id', configIds);

        if (selectedOrg) {
          query = query.eq('org_id', selectedOrg);
        }

        const { data: periodData } = await query;

        if (!periodData) return [];

        // Group by billing period and meter
        const periodMap = new Map();
        periodData.forEach(item => {
          // Use full billing period as the key to keep cycles separate
          const periodKey = `${item.billing_period_start_date}_${item.billing_period_end_date}`;
          const meterName = item.meter_name || 'Outros';
          
          if (!periodMap.has(periodKey)) {
            const startDate = new Date(item.billing_period_start_date + 'T00:00:00');
            const endDate = new Date(item.billing_period_end_date + 'T00:00:00');
            const periodLabel = `${startDate.toLocaleDateString('pt-BR', { 
              day: '2-digit',
              month: 'short',
              timeZone: 'America/Sao_Paulo'
            })} - ${endDate.toLocaleDateString('pt-BR', { 
              day: '2-digit',
              month: 'short', 
              year: '2-digit',
              timeZone: 'America/Sao_Paulo'
            })}`;
            
            periodMap.set(periodKey, {
              period: periodLabel,
              periodKey: periodKey,
              sortKey: startDate.getTime(), // For proper sorting by start date
              billing_period_start_date: item.billing_period_start_date,
              billing_period_end_date: item.billing_period_end_date,
              metrics: new Map()
            });
          }

          const periodData = periodMap.get(periodKey);
          const currentMetric = periodData.metrics.get(meterName) || 0;
          periodData.metrics.set(meterName, currentMetric + (item.consumption_ipu || 0));
        });

        // Get all unique meter names with non-zero values across all periods
        const allMeters = new Set<string>();
        const meterTotals = new Map<string, number>();
        
        // First pass: collect all meters and their totals
        periodMap.forEach(period => {
          period.metrics.forEach((value, meter) => {
            allMeters.add(meter);
            meterTotals.set(meter, (meterTotals.get(meter) || 0) + value);
          });
        });

        // Only filter out meters that have zero total across ALL periods
        const nonZeroMeters = Array.from(allMeters).filter(meter => (meterTotals.get(meter) || 0) > 0);

        console.log('All periods found:', Array.from(periodMap.keys()));
        console.log('Meters with data:', nonZeroMeters);

        // Convert to chart format - include ALL months that have any data
        const chartData = Array.from(periodMap.values())
          .sort((a, b) => a.sortKey - b.sortKey) // Sort by year/month properly
          .map(period => {
            const dataPoint: any = { period: period.period };
            // Include all meters, even if zero for this specific month
            nonZeroMeters.forEach(meter => {
              const value = period.metrics.get(meter) || 0;
              dataPoint[meter] = value * client.preco_por_ipu; // Don't filter out zeros here
            });
            return dataPoint;
          });

        console.log('Final chart data periods:', chartData.map(d => d.period));

        return { 
          data: chartData, 
          meters: nonZeroMeters,
          colors: nonZeroMeters.map((_, index) => STABLE_COLORS[index % STABLE_COLORS.length])
        };

      } else if (type === 'evolution') {
        // Get data for multiple billing periods for evolution chart
        let query = supabase
          .from('api_consumosummary')
          .select('billing_period_start_date, billing_period_end_date, consumption_ipu')
          .in('configuracao_id', configIds);

        if (selectedOrg) {
          query = query.eq('org_id', selectedOrg);
        }

        const { data: evolutionData } = await query;

        if (!evolutionData) return [];

        // Group by billing period and sum IPUs
        const periodMap = new Map();
        evolutionData.forEach(item => {
          const key = `${item.billing_period_start_date}_${item.billing_period_end_date}`;
          if (periodMap.has(key)) {
            periodMap.get(key).totalIPU += item.consumption_ipu || 0;
          } else {
            const startDate = new Date(item.billing_period_start_date + 'T00:00:00');
            const periodLabel = startDate.toLocaleDateString('pt-BR', { 
              month: 'short', 
              year: '2-digit',
              timeZone: 'America/Sao_Paulo'
            });
            
            periodMap.set(key, {
              period: periodLabel,
              totalIPU: item.consumption_ipu || 0,
              billing_period_start_date: item.billing_period_start_date,
              billing_period_end_date: item.billing_period_end_date
            });
          }
        });

        return Array.from(periodMap.values())
          .sort((a, b) => new Date(a.billing_period_start_date).getTime() - new Date(b.billing_period_start_date).getTime())
          .slice(-6) // Last 6 periods
          .map(item => ({
            period: item.period,
            ipu: item.totalIPU,
            cost: item.totalIPU * client.preco_por_ipu
          }));

      } else { // distribution
        // Get current billing cycle
        const { data: currentCycle } = await supabase
          .from('api_consumosummary')
          .select('billing_period_start_date, billing_period_end_date')
          .in('configuracao_id', configIds)
          .order('billing_period_end_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!currentCycle) return [];

        let query = supabase
          .from('api_consumosummary')
          .select('org_id, org_name, consumption_ipu')
          .in('configuracao_id', configIds)
          .eq('billing_period_start_date', currentCycle.billing_period_start_date)
          .eq('billing_period_end_date', currentCycle.billing_period_end_date);

        if (selectedOrg) {
          query = query.eq('org_id', selectedOrg);
        }

        const { data: distributionData } = await query;

        if (!distributionData) return [];

        // Group by organization
        const orgMap = new Map();
        distributionData.forEach(item => {
          const orgId = item.org_id || 'unknown';
          const orgName = item.org_name || orgId;
          const ipu = item.consumption_ipu || 0;
          
          if (orgMap.has(orgId)) {
            orgMap.get(orgId).consumption_ipu += ipu;
          } else {
            orgMap.set(orgId, {
              org_id: orgId,
              org_name: orgName,
              consumption_ipu: ipu
            });
          }
        });

        const orgs = Array.from(orgMap.values());
        const totalIPU = orgs.reduce((sum, org) => sum + org.consumption_ipu, 0);

        return orgs.map(org => ({
          name: org.org_name,
          value: totalIPU > 0 ? Math.round((org.consumption_ipu / totalIPU) * 100) : 0,
          cost: org.consumption_ipu * client.preco_por_ipu,
          color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`
        })).sort((a, b) => b.value - a.value);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return [];
    }
  };

  return { data, loading, error, refetch: () => window.location.reload(), getChartData };
}