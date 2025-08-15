import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DashboardData {
  totalCost: number;
  totalIPU: number;
  avgDailyCost: number;
  activeOrgs: number;
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
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
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

        // Get client's price per IPU
        const { data: client, error: clientError } = await supabase
          .from('api_clientes')
          .select('preco_por_ipu')
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

        // Get current billing cycle - get the most recent cycle
        const { data: currentCycle, error: cycleError } = await supabase
          .from('api_consumosummary')
          .select('billing_period_start_date, billing_period_end_date')
          .in('configuracao_id', configIds)
          .order('billing_period_start_date', { ascending: false })
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

  return { data, loading, error, refetch: () => window.location.reload() };
}