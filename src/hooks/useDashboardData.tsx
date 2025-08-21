import { useState, useEffect, useCallback, useRef } from 'react';
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
  pricePerIPU: number;
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
  
  // Cache para evitar requisições desnecessárias
  const cacheRef = useRef<Map<string, any>>(new Map());
  const lastFetchRef = useRef<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  const fetchDashboardData = useCallback(async (force = false) => {
    if (!user) {
      console.log('useDashboardData: No user found, skipping data fetch');
      return;
    }

    const cacheKey = `dashboard_${user.id}_${selectedOrg || 'all'}`;
    const now = Date.now();

    // Verificar cache se não for forçado
    if (!force && cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey);
      if (now - cached.timestamp < CACHE_DURATION) {
        console.log('useDashboardData: Using cached data');
        setData(cached.data);
        setLoading(false);
        return;
      }
    }

    // Evitar requisições muito frequentes
    if (!force && now - lastFetchRef.current < 1000) {
      console.log('useDashboardData: Throttling request');
      return;
    }

    lastFetchRef.current = now;

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

      console.log('Dashboard: Client data fetched:', client);
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
        const emptyData = {
          totalCost: 0,
          totalIPU: 0,
          avgDailyCost: 0,
          activeOrgs: 0,
          contractedIPUs: client.qtd_ipus_contratadas || 0,
          pricePerIPU: client.preco_por_ipu,
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
        };
        
        // Cache empty data
        cacheRef.current.set(cacheKey, { data: emptyData, timestamp: now });
        setData(emptyData);
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

      const newData = {
        totalCost,
        totalIPU,
        avgDailyCost,
        activeOrgs: organizations.length,
        contractedIPUs: client.qtd_ipus_contratadas || 0,
        pricePerIPU: client.preco_por_ipu,
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
      };

      // Cache new data
      cacheRef.current.set(cacheKey, { data: newData, timestamp: now });
      setData(newData);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [user, selectedOrg]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getChartData = useCallback(async (type: 'evolution' | 'distribution' | 'billing-periods', selectedOrg?: string, selectedPeriod?: string) => {
    if (!user) {
      console.log('getChartData: No user found');
      return [];
    }

    const cacheKey = `chart_${type}_${user.id}_${selectedOrg || 'all'}_${selectedPeriod || 'current'}`;
    const now = Date.now();

    // Verificar cache
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey);
      if (now - cached.timestamp < CACHE_DURATION) {
        console.log('getChartData: Using cached chart data for', type);
        return cached.data;
      }
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
        .select('preco_por_ipu, qtd_ipus_contratadas')
        .eq('id', profile.cliente_id)
        .maybeSingle();

      console.log('getChartData: Client data fetched:', client);
      if (clientError || !client?.preco_por_ipu) return [];

      // Get configuration IDs
      const { data: configs, error: configError } = await supabase
        .from('api_configuracaoidmc')
        .select('id, cliente_id')
        .eq('cliente_id', profile.cliente_id);

      console.log('User profile cliente_id:', profile.cliente_id);
      console.log('Available configs for client:', configs);
      
      if (configError || !configs || configs.length === 0) return [];

      const configIds = configs.map(config => config.id);

      if (type === 'billing-periods') {
        // Get ALL unique billing periods from consumption data (not filtered by consumption > 0)
        const { data: allCycles, error: allCyclesError } = await supabase
          .from('api_consumosummary')
          .select('billing_period_start_date, billing_period_end_date')
          .in('configuracao_id', configIds)
          .order('billing_period_start_date', { ascending: true });
        
        if (allCyclesError || !allCycles) {
          console.error('Error fetching all cycles:', allCyclesError);
          return [];
        }
        
        // Remove duplicates and format
        const uniqueCycles = Array.from(
          new Map(allCycles.map(cycle => [
            `${cycle.billing_period_start_date}_${cycle.billing_period_end_date}`,
            cycle
          ])).values()
        );
        
        console.log('All unique cycles found:', uniqueCycles.length, uniqueCycles);
        
        // Create a map with all cycles
        const periodMap = new Map();
        
        // Initialize all cycles with zero data
        uniqueCycles.forEach(cycle => {
          const periodKey = `${cycle.billing_period_start_date}_${cycle.billing_period_end_date}`;
          const startDate = new Date(cycle.billing_period_start_date + 'T00:00:00');
          
          const periodLabel = `${startDate.toLocaleDateString('pt-BR', { 
            month: 'short',
            year: '2-digit',
            timeZone: 'America/Sao_Paulo'
          })}`;
          
          periodMap.set(periodKey, {
            period: periodLabel,
            periodKey: periodKey,
            sortKey: startDate.getTime(),
            billing_period_start_date: cycle.billing_period_start_date,
            billing_period_end_date: cycle.billing_period_end_date,
            metrics: new Map()
          });
        });

        // Now get consumption data for these periods (only with actual consumption)
        let query = supabase
          .from('api_consumosummary')
          .select('billing_period_start_date, billing_period_end_date, consumption_ipu, meter_name, org_id')
          .in('configuracao_id', configIds)
          .gt('consumption_ipu', 0);

        if (selectedOrg) {
          query = query.eq('org_id', selectedOrg);
        }

        const { data: periodData, error: periodError } = await query;

        if (periodError) {
          console.error('Error fetching consumption data:', periodError);
          return [];
        }

        console.log('Raw consumption data count:', periodData?.length);

        // Add consumption data to existing cycles
        if (periodData) {
          periodData.forEach(item => {
            const periodKey = `${item.billing_period_start_date}_${item.billing_period_end_date}`;
            const meterName = item.meter_name || 'Outros';
            
            if (periodMap.has(periodKey)) {
              const period = periodMap.get(periodKey);
              const currentMetric = period.metrics.get(meterName) || 0;
              period.metrics.set(meterName, currentMetric + (item.consumption_ipu || 0));
            }
          });
        }

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

        // Only include meters that have non-zero total across ALL periods
        const nonZeroMeters = Array.from(allMeters).filter(meter => (meterTotals.get(meter) || 0) > 0);

        console.log('All periods found:', Array.from(periodMap.keys()));
        console.log('Meters with data:', nonZeroMeters);

        // Convert to chart format - include ALL cycles (even those with zero consumption)
        const chartData = Array.from(periodMap.values())
          .sort((a, b) => a.sortKey - b.sortKey)
          .map(period => {
            const dataPoint: any = { period: period.period };
            // For periods with no consumption, all meters will have value 0
            if (nonZeroMeters.length > 0) {
              nonZeroMeters.forEach(meter => {
                const value = period.metrics.get(meter) || 0;
                dataPoint[meter] = value * client.preco_por_ipu;
              });
            } else {
              // If no meters have data, add a default zero meter
              dataPoint['Sem dados'] = 0;
            }
            return dataPoint;
          });

        console.log('Final chart data with ALL cycles:', chartData.length, 'periods:', chartData.map(d => d.period));

        const result = { 
          data: chartData, 
          meters: nonZeroMeters.length > 0 ? nonZeroMeters : ['Sem dados'],
          colors: (nonZeroMeters.length > 0 ? nonZeroMeters : ['Sem dados']).map((_, index) => STABLE_COLORS[index % STABLE_COLORS.length])
        };

        cacheRef.current.set(cacheKey, { data: result, timestamp: now });
        return result;

      } else if (type === 'evolution') {
        // Get unique billing periods from consumption data
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

        const result = Array.from(periodMap.values())
          .sort((a, b) => new Date(a.billing_period_start_date).getTime() - new Date(b.billing_period_start_date).getTime())
          .slice(-6) // Last 6 periods
          .map(item => ({
            period: item.period,
            ipu: item.totalIPU,
            cost: item.totalIPU * client.preco_por_ipu
          }));

        // Cache result
        cacheRef.current.set(cacheKey, { data: result, timestamp: now });
        return result;

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

        const result = orgs.map(org => ({
          name: org.org_name,
          value: totalIPU > 0 ? Math.round((org.consumption_ipu / totalIPU) * 100) : 0,
          cost: org.consumption_ipu * client.preco_por_ipu,
          color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`
        })).sort((a, b) => b.value - a.value);

        // Cache result
        cacheRef.current.set(cacheKey, { data: result, timestamp: now });
        return result;
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return [];
    }
  }, [user]);

  const refetch = useCallback(() => {
    // Limpar cache e forçar nova busca
    cacheRef.current.clear();
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  return { data, loading, error, refetch, getChartData };
}