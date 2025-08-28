import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
interface CycleFilterProps {
  selectedCycleFilter: string;
  onCycleFilterChange: (filter: string) => void;
  availableCycles?: Array<{
    ciclo_id: number;
    billing_period_start_date: string;
    billing_period_end_date: string;
    configuracao_id: number;
  }>;
}
export function CycleFilter({
  selectedCycleFilter,
  onCycleFilterChange,
  availableCycles = []
}: CycleFilterProps) {
  const filterOptions = [{
    value: '1',
    label: 'Ciclo Atual'
  }, {
    value: '2',
    label: 'Últimos 2 Ciclos'
  }, {
    value: '3',
    label: 'Últimos 3 Ciclos'
  }, {
    value: '6',
    label: 'Últimos 6 Ciclos'
  }, {
    value: '12',
    label: 'Últimos 12 Ciclos'
  }, {
    value: 'all',
    label: 'Todos os Ciclos'
  }];

  // Determine the default selection based on current filter
  const getCurrentLabel = () => {
    const option = filterOptions.find(opt => opt.value === selectedCycleFilter);
    return option?.label || 'Ciclo Atual';
  };
  return;
}