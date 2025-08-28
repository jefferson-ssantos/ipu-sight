import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
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
  return (
    <Card className="bg-gradient-card shadow-medium">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Período:</span>
          </div>
          <Select value={selectedCycleFilter} onValueChange={onCycleFilterChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {getCurrentLabel()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}