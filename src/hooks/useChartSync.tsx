import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ChartSyncContextType {
  maxYValue: number;
  updateChartData: (componentId: string, data: { maxValue: number; contractedValue: number }) => void;
  isReady: boolean;
}

const ChartSyncContext = createContext<ChartSyncContextType | undefined>(undefined);

interface ChartSyncProviderProps {
  children: ReactNode;
}

export function ChartSyncProvider({ children }: ChartSyncProviderProps) {
  const [chartData, setChartData] = useState<Record<string, { maxValue: number; contractedValue: number }>>({});
  const [maxYValue, setMaxYValue] = useState<number>(0);
  const [isReady, setIsReady] = useState(false);

  const updateChartData = (componentId: string, data: { maxValue: number; contractedValue: number }) => {
    setChartData(prev => ({ ...prev, [componentId]: data }));
  };

  useEffect(() => {
    // Calculate global max value when chart data changes
    const allValues: number[] = [];
    
    Object.values(chartData).forEach(({ maxValue, contractedValue }) => {
      if (maxValue > 0) allValues.push(maxValue);
      if (contractedValue > 0) allValues.push(contractedValue);
    });

    if (allValues.length > 0) {
      const globalMax = Math.max(...allValues);
      // Add 15% margin for better visibility
      const finalMax = globalMax * 1.15;
      setMaxYValue(finalMax);
      setIsReady(true);
    } else {
      setMaxYValue(0);
      setIsReady(false);
    }
  }, [chartData]);

  return (
    <ChartSyncContext.Provider value={{ maxYValue, updateChartData, isReady }}>
      {children}
    </ChartSyncContext.Provider>
  );
}

export function useChartSync() {
  const context = useContext(ChartSyncContext);
  if (context === undefined) {
    throw new Error('useChartSync must be used within a ChartSyncProvider');
  }
  return context;
}