import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface DashboardData {
  totalCost: number;
  totalIPU: number;
  avgDailyCost: number;
  historicalComparison: number;
  activeOrgs: number;
  contractedIPUs: number;
  pricePerIPU: number;
  historicalAvgDailyCost: number;
  currentPeriod: string;
  periodStart: string;
  periodEnd: string;
  organizations: Array<{ 
    org_id: string;
    org_name: string;
    consumption_ipu: number;
    cost: number;
    percentage: number;
    isPrincipal?: boolean;
    level?: number;
    parentOrgId?: string;
  }>;
  currentCycle: {
    billing_period_start_date: string;
    billing_period_end_date: string;
  } | null;
}

interface AvailableOrg {
  value: string;
  label: string;
}

interface DashboardContextType {
  // Cached data
  dashboardData: DashboardData | null;
  availableOrgs: AvailableOrg[];
  availableCycles: Array<{
    ciclo_id: number;
    billing_period_start_date: string;
    billing_period_end_date: string;
    configuracao_id: number;
  }>;
  
  // Loading states
  loading: boolean;
  orgLoading: boolean;
  
  // Error states
  error: string | null;
  
  // Methods
  fetchDashboardData: (selectedOrg?: string, selectedCycleFilter?: string, force?: boolean) => Promise<void>;
  getChartData: (type: 'evolution' | 'distribution' | 'billing-periods', selectedOrg?: string, selectedCycleFilter?: string) => Promise<any>;
  clearCache: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_DELAY = 300; // 300ms

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [availableOrgs, setAvailableOrgs] = useState<AvailableOrg[]>([]);
  const [availableCycles, setAvailableCycles] = useState<Array<{
    ciclo_id: number;
    billing_period_start_date: string;
    billing_period_end_date: string;
    configuracao_id: number;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache storage
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const lastFetchRef = useRef<{ [key: string]: number }>({});
  const debounceRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Memoized organizations fetch
  const fetchOrganizations = useCallback(async () => {
    if (!user || orgLoading) return;

    const cacheKey = `orgs_${user.id}`;
    const now = Date.now();
    const cached = cacheRef.current.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_DURATION) {
      setAvailableOrgs(cached.data);
      return;
    }

    setOrgLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('cliente_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.cliente_id) return;

      const { data: configs } = await supabase
        .from('api_configuracaoidmc')
        .select('id')
        .eq('cliente_id', profile.cliente_id);
      
      if (!configs || configs.length === 0) return;
      
      const configIds = configs.map(config => config.id);
      const { data: orgs } = await supabase
        .from('api_consumosummary')
        .select('org_id, org_name')
        .in('configuracao_id', configIds)
        .neq('meter_name', 'Sandbox Organizations IPU Usage');
      
      if (orgs) {
        const uniqueOrgs = Array.from(
          new Map(orgs.map(org => [org.org_id, org])).values()
        ).filter(org => org.org_id && org.org_name);
        
        const orgOptions = [
          { value: "all", label: "Todas as Organizações" },
          ...uniqueOrgs.map(org => ({
            value: org.org_id,
            label: org.org_name || org.org_id
          }))
        ];

        cacheRef.current.set(cacheKey, { data: orgOptions, timestamp: now });
        setAvailableOrgs(orgOptions);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setOrgLoading(false);
    }
  }, [user, orgLoading]);

  // Initialize organizations on user load
  React.useEffect(() => {
    if (user && availableOrgs.length === 0) {
      fetchOrganizations();
    }
  }, [user, fetchOrganizations, availableOrgs.length]);

  const fetchDashboardData = useCallback(async (selectedOrg?: string, selectedCycleFilter?: string, force = false) => {
    if (!user) return;

    const cacheKey = `dashboard_${user.id}_${selectedOrg || 'all'}_${selectedCycleFilter || 'all'}`;
    const now = Date.now();

    // Clear any pending debounce
    if (debounceRef.current[cacheKey]) {
      clearTimeout(debounceRef.current[cacheKey]);
    }

    // Debounce the request
    debounceRef.current[cacheKey] = setTimeout(async () => {
      // Check cache
      if (!force) {
        const cached = cacheRef.current.get(cacheKey);
        if (cached && now - cached.timestamp < CACHE_DURATION) {
          setDashboardData(cached.data);
          return;
        }

        // Prevent too frequent requests
        const lastFetch = lastFetchRef.current[cacheKey] || 0;
        if (now - lastFetch < 1000) {
          return;
        }
      }

      lastFetchRef.current[cacheKey] = now;
      setLoading(true);
      setError(null);

      try {
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

        // Get configuration IDs
        const { data: configs, error: configError } = await supabase
          .from('api_configuracaoidmc')
          .select('id')
          .eq('cliente_id', profile.cliente_id);

        if (configError) throw configError;
        if (!configs || configs.length === 0) throw new Error('Nenhuma configuração encontrada');

        const configIds = configs.map(config => config.id);

        // Get available billing cycles
        const { data: cyclesData, error: cyclesError } = await supabase
          .rpc('get_available_cycles');

        if (cyclesError) throw cyclesError;
        
        // Create unique cycles
        const cyclesMap = new Map();
        let cycleCounter = 1;
        const sortedCycles = cyclesData
          ?.sort((a, b) => new Date(b.billing_period_end_date).getTime() - new Date(a.billing_period_end_date).getTime()) || [];
        
        const uniqueCycles: Array<{ 
          ciclo_id: number;
          billing_period_start_date: string;
          billing_period_end_date: string;
          configuracao_id: number;
        }> = [];

        sortedCycles.forEach(item => {
          const key = `${item.billing_period_start_date}_${item.billing_period_end_date}`;
          if (!cyclesMap.has(key)) {
            cyclesMap.set(key, true);
            uniqueCycles.push({
              ciclo_id: cycleCounter,
              billing_period_start_date: item.billing_period_start_date,
              billing_period_end_date: item.billing_period_end_date,
              configuracao_id: configIds[0] || 0
            });
            cycleCounter++;
          }
        });
        
        setAvailableCycles(uniqueCycles);

        // Use current cycle for KPIs
        const currentCycle = uniqueCycles.length > 0 ? uniqueCycles[0] : null;

        // Get KPI data
        const { data: kpiData, error: kpiError } = await supabase
          .rpc('get_dashboard_kpis', {
            start_date: currentCycle?.billing_period_start_date,
            end_date: currentCycle?.billing_period_end_date,
            org_filter: selectedOrg && selectedOrg !== 'all' ? selectedOrg : null
          });

        if (kpiError) throw kpiError;

        // Get organization details
        const { data: orgData, error: orgError } = await supabase
          .rpc('get_organization_details_data', {
            start_date: currentCycle?.billing_period_start_date,
            end_date: currentCycle?.billing_period_end_date
          });

        if (orgError) throw orgError;

        const consumption = orgData || [];
        const kpiConsumption = kpiData || [];

        if (!consumption || consumption.length === 0) {
          const emptyData = {
            totalCost: 0,
            totalIPU: 0,
            avgDailyCost: 0,
            historicalComparison: 0,
            activeOrgs: 0,
            contractedIPUs: client.qtd_ipus_contratadas || 0,
            pricePerIPU: client.preco_por_ipu,
            historicalAvgDailyCost: 0,
            currentPeriod: currentCycle ? 
              new Date(currentCycle.billing_period_end_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' , timeZone: 'UTC' }) :
              'Sem dados',
            periodStart: currentCycle ? 
              new Date(currentCycle.billing_period_start_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 
              '',
            periodEnd: currentCycle ? 
              new Date(currentCycle.billing_period_end_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 
              '',
            organizations: [],
            currentCycle
          };
          
          cacheRef.current.set(cacheKey, { data: emptyData, timestamp: now });
          setDashboardData(emptyData);
          return;
        }

        // Calculate metrics
        const totalIPU = kpiConsumption.reduce((sum, item) => sum + (item.total_ipu || 0), 0);
        const totalCost = totalIPU * client.preco_por_ipu;

        const days = currentCycle ? 
          Math.max(1, Math.ceil((new Date(currentCycle.billing_period_end_date).getTime() - new Date(currentCycle.billing_period_start_date).getTime()) / (1000 * 60 * 60 * 24))) :
          30;
        const avgDailyCost = totalCost / days;

        // Calculate historical comparison
        let historicalAvgDailyCost = 0;
        let historicalComparison = 0;
        
        if (uniqueCycles.length > 1) {
          const historicalCycles = uniqueCycles.slice(1, 4); // Get last 3 cycles for comparison
          let totalHistoricalCost = 0;
          let totalHistoricalDays = 0;

          for (const cycle of historicalCycles) {
            const { data: historicalKpiData } = await supabase
              .rpc('get_dashboard_kpis', {
                start_date: cycle.billing_period_start_date,
                end_date: cycle.billing_period_end_date,
                org_filter: selectedOrg && selectedOrg !== 'all' ? selectedOrg : null
              });

            if (historicalKpiData && historicalKpiData.length > 0) {
              const cycleTotalIPU = historicalKpiData.reduce((sum, item) => sum + (item.total_ipu || 0), 0);
              const cycleCost = cycleTotalIPU * client.preco_por_ipu;
              
              const cycleDays = Math.max(1, Math.ceil(
                (new Date(cycle.billing_period_end_date).getTime() - new Date(cycle.billing_period_start_date).getTime()) / (1000 * 60 * 60 * 24)
              ));
              
              totalHistoricalCost += cycleCost;
              totalHistoricalDays += cycleDays;
            }
          }

          if (totalHistoricalDays > 0) {
            historicalAvgDailyCost = totalHistoricalCost / totalHistoricalDays;
            if (historicalAvgDailyCost > 0) {
              historicalComparison = ((avgDailyCost - historicalAvgDailyCost) / historicalAvgDailyCost) * 100;
            }
          }
        }

        // Get distribution data
        const { data: distributionData } = await supabase
          .rpc('get_cost_distribution_data', {
            start_date: currentCycle?.billing_period_start_date,
            end_date: currentCycle?.billing_period_end_date
          });

        const distributionConsumption = distributionData || [];
        const totalIPUForOrgs = distributionConsumption.reduce((sum, item) => sum + (item.consumption_ipu || 0), 0);

        let organizations = distributionConsumption.map(org => ({
          org_id: org.org_id,
          org_name: org.org_name,
          consumption_ipu: org.consumption_ipu,
          cost: org.consumption_ipu * client.preco_por_ipu,
          percentage: totalIPUForOrgs > 0 ? Math.round((org.consumption_ipu / totalIPUForOrgs) * 100) : 0,
          isPrincipal: false,
          level: 0,
          parentOrgId: undefined
        })).sort((a, b) => b.consumption_ipu - a.consumption_ipu);

        // Create hierarchical structure if multiple orgs
        if (organizations.length > 1) {
          const [principalOrg, ...childOrgs] = organizations;
          organizations = [
            { ...principalOrg, isPrincipal: true, level: 0 },
            ...childOrgs.map(org => ({ ...org, isPrincipal: false, level: 1, parentOrgId: principalOrg.org_id }))
          ];
        }

        const newData = {
          totalCost,
          totalIPU,
          avgDailyCost,
          historicalComparison,
          activeOrgs: organizations.length,
          contractedIPUs: client.qtd_ipus_contratadas || 0,
          pricePerIPU: client.preco_por_ipu,
          historicalAvgDailyCost,
          currentPeriod: currentCycle ? 
            new Date(currentCycle.billing_period_end_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }) :
            'Período atual',
          periodStart: currentCycle ? 
            new Date(currentCycle.billing_period_start_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 
            '',
          periodEnd: currentCycle ? 
            new Date(currentCycle.billing_period_end_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 
            '',
          organizations,
          currentCycle
        };

        cacheRef.current.set(cacheKey, { data: newData, timestamp: now });
        setDashboardData(newData);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_DELAY);
  }, [user]);

  const getChartData = useCallback(async (type: 'evolution' | 'distribution' | 'billing-periods', selectedOrg?: string, selectedCycleFilter?: string) => {
    if (!user) {
      return [];
    }

    const cacheKey = `chart_${type}_${user.id}_${selectedOrg || 'all'}_${selectedCycleFilter || '1'}`;
    const now = Date.now();

    // Check cache first
    const cached = cacheRef.current.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Get user's client information
      const { data: profile } = await supabase
        .from('profiles')
        .select('cliente_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.cliente_id) return [];

      // Get client's price
      const { data: client } = await supabase
        .from('api_clientes')
        .select('preco_por_ipu, qtd_ipus_contratadas')
        .eq('id', profile.cliente_id)
        .maybeSingle();

      if (!client?.preco_por_ipu) return [];

      const cycleLimit = selectedCycleFilter && selectedCycleFilter !== 'all' 
        ? parseInt(selectedCycleFilter) 
        : null;

      if (type === 'evolution') {
        const { data: evolutionData } = await supabase
          .rpc('get_cost_evolution_data', { 
            cycle_limit: cycleLimit,
            org_filter: selectedOrg && selectedOrg !== 'all' ? selectedOrg : null
          });

        if (!evolutionData) return [];

        const periodMap = new Map();
        evolutionData.forEach(item => {
          const periodKey = `${item.billing_period_start_date}_${item.billing_period_end_date}`;
          const periodLabel = `${new Date(item.billing_period_start_date + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})} - ${new Date(item.billing_period_end_date + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`;

          if (periodMap.has(periodKey)) {
            periodMap.get(periodKey).totalIPU += item.consumption_ipu || 0;
          } else {
            periodMap.set(periodKey, {
              period: periodLabel,
              totalIPU: item.consumption_ipu || 0,
              billing_period_start_date: item.billing_period_start_date,
              billing_period_end_date: item.billing_period_end_date,
            });
          }
        });

        const result = Array.from(periodMap.values())
          .filter(item => item.totalIPU > 0)
          .sort((a, b) => new Date(a.billing_period_start_date).getTime() - new Date(b.billing_period_start_date).getTime())
          .map(item => ({
            period: item.period,
            totalCost: item.totalIPU * client.preco_por_ipu,
            totalIPU: item.totalIPU,
            billing_period_start_date: item.billing_period_start_date,
            billing_period_end_date: item.billing_period_end_date
          }));

        cacheRef.current.set(cacheKey, { data: result, timestamp: now });
        return result;
      }

      if (type === 'billing-periods') {
        const { data: billingData } = await supabase
          .rpc('get_billing_periods_data', { 
            cycle_limit: cycleLimit,
            org_filter: selectedOrg && selectedOrg !== 'all' ? selectedOrg : null
          });

        if (!billingData) return { data: [], meters: [], contractedReferenceValue: 0 };

        const periodMap = new Map();
        const allMeters = new Set<string>();

        billingData.forEach(item => {
          const periodKey = `${item.billing_period_start_date}_${item.billing_period_end_date}`;
          const periodLabel = `${new Date(item.billing_period_start_date + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})} - ${new Date(item.billing_period_end_date + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`;
          
          allMeters.add(item.meter_name);
          
          if (!periodMap.has(periodKey)) {
            periodMap.set(periodKey, {
              period: periodLabel,
              billing_period_start_date: item.billing_period_start_date,
              billing_period_end_date: item.billing_period_end_date,
            });
          }
          
          const periodData = periodMap.get(periodKey);
          periodData[item.meter_name] = (periodData[item.meter_name] || 0) + (item.consumption_ipu * client.preco_por_ipu);
        });

        const chartData = Array.from(periodMap.values())
          .sort((a, b) => new Date(a.billing_period_start_date).getTime() - new Date(b.billing_period_start_date).getTime());

        const result = {
          data: chartData,
          meters: Array.from(allMeters),
          contractedReferenceValue: (client.qtd_ipus_contratadas || 0) * client.preco_por_ipu
        };

        cacheRef.current.set(cacheKey, { data: result, timestamp: now });
        return result;
      }

      return [];
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return [];
    }
  }, [user]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    lastFetchRef.current = {};
    // Clear debounce timeouts
    Object.values(debounceRef.current).forEach(timeout => clearTimeout(timeout));
    debounceRef.current = {};
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      Object.values(debounceRef.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const contextValue = useMemo(() => ({
    dashboardData,
    availableOrgs,
    availableCycles,
    loading,
    orgLoading,
    error,
    fetchDashboardData,
    getChartData,
    clearCache
  }), [
    dashboardData,
    availableOrgs,
    availableCycles,
    loading,
    orgLoading,
    error,
    fetchDashboardData,
    getChartData,
    clearCache
  ]);

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}