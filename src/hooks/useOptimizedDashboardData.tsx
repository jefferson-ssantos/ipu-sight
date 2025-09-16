import { useMemo } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';

interface UseOptimizedDashboardDataProps {
  selectedOrg?: string;
  selectedCycleFilter?: string;
}

export function useOptimizedDashboardData({ selectedOrg, selectedCycleFilter }: UseOptimizedDashboardDataProps = {}) {
  const { dashboardData, loading, error, fetchDashboardData, getChartData } = useDashboard();

  // Memoized data selectors to prevent unnecessary re-renders
  const memoizedData = useMemo(() => ({
    totalCost: dashboardData?.totalCost || 0,
    totalIPU: dashboardData?.totalIPU || 0,
    avgDailyCost: dashboardData?.avgDailyCost || 0,
    historicalComparison: dashboardData?.historicalComparison || 0,
    activeOrgs: dashboardData?.activeOrgs || 0,
    contractedIPUs: dashboardData?.contractedIPUs || 0,
    pricePerIPU: dashboardData?.pricePerIPU || 0,
    historicalAvgDailyCost: dashboardData?.historicalAvgDailyCost || 0,
    currentPeriod: dashboardData?.currentPeriod || '',
    periodStart: dashboardData?.periodStart || '',
    periodEnd: dashboardData?.periodEnd || '',
    organizations: dashboardData?.organizations || [],
    currentCycle: dashboardData?.currentCycle || null
  }), [dashboardData]);

  // Memoized refetch function
  const refetch = useMemo(() => 
    () => fetchDashboardData(selectedOrg, selectedCycleFilter, true),
    [fetchDashboardData, selectedOrg, selectedCycleFilter]
  );

  // Memoized chart data fetcher
  const getChartDataMemoized = useMemo(() => 
    (type: 'evolution' | 'distribution' | 'billing-periods') => 
      getChartData(type, selectedOrg, selectedCycleFilter),
    [getChartData, selectedOrg, selectedCycleFilter]
  );

  return {
    data: memoizedData,
    loading,
    error,
    refetch,
    getChartData: getChartDataMemoized
  };
}