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

export function CycleFilter({ selectedCycleFilter, onCycleFilterChange, availableCycles = [] }: CycleFilterProps) {
  const filterOptions = [
    { value: '1', label: 'Ciclo Atual' },
    { value: '2', label: 'Últimos 2 Ciclos' },
    { value: '3', label: 'Últimos 3 Ciclos' },
    { value: '6', label: 'Últimos 6 Ciclos' },
    { value: '12', label: 'Últimos 12 Ciclos' },
    { value: 'all', label: 'Todos os Ciclos' }
  ];

  // Determine the default selection based on current filter
  const getCurrentLabel = () => {
    const option = filterOptions.find(opt => opt.value === selectedCycleFilter);
    return option?.label || 'Ciclo Atual';
  };

  return (
    <Card className="p-4 mb-6 bg-gradient-card shadow-medium border-border">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Calendar className="h-4 w-4 text-primary" />
          <span>Período de Análise:</span>
        </div>
        
        <Select value={selectedCycleFilter} onValueChange={onCycleFilterChange}>
          <SelectTrigger className="w-[200px] bg-background border-input">
            <SelectValue placeholder={getCurrentLabel()} />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            {filterOptions.map((option) => {
              // Disable options if there aren't enough cycles available
              const isDisabled = option.value !== 'all' && 
                                !isNaN(parseInt(option.value)) && 
                                parseInt(option.value) > availableCycles.length;
              
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

      </div>
    </Card>
  );
}