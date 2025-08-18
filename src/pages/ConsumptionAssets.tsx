import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDashboardData } from '@/hooks/useDashboardData';
import { AssetDetail } from '@/components/consumption/AssetDetail';

export default function ConsumptionAssets() {
  const { data, loading } = useDashboardData();
  const [selectedOrg, setSelectedOrg] = useState<string>('');

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Detalhamento por Asset</h1>
            <p className="text-muted-foreground">
              Visão detalhada do consumo individual por asset
            </p>
          </div>
          
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

        <AssetDetail selectedOrg={selectedOrg} />
      </div>
    </AppLayout>
  );
}