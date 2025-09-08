import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CYCLE_FILTER_OPTIONS } from '@/lib/cycleFilterOptions';

import { useDashboardData } from '@/hooks/useDashboardData';
import { AssetDetail } from '@/components/consumption/AssetDetail';
import { FileText } from 'lucide-react';

export default function ConsumptionAssets() {
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedCycleFilter, setSelectedCycleFilter] = useState<string>('12');
  const { data, loading, availableCycles } = useDashboardData();

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Detalhamento por Asset</h1>
              <p className="text-muted-foreground">
                Visão detalhada do consumo individual por asset
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedCycleFilter} onValueChange={setSelectedCycleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {CYCLE_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedOrg || "all"} onValueChange={(value) => setSelectedOrg(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas as organizações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as organizações</SelectItem>
                {data?.organizations?.map((org) => (
                  <SelectItem key={org.org_id} value={org.org_id}>
                    {org.org_name || org.org_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <AssetDetail selectedOrg={selectedOrg} selectedCycleFilter={selectedCycleFilter} />
      </div>
    </AppLayout>
  );
}