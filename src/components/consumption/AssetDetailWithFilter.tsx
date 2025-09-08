import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, FileText, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CYCLE_FILTER_OPTIONS } from '@/lib/cycleFilterOptions';
import { AssetDetail } from './AssetDetail';

export function AssetDetailWithFilter() {
  const { user } = useAuth();
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [selectedCycleFilter, setSelectedCycleFilter] = useState<string>("1");
  const [availableOrgs, setAvailableOrgs] = useState<Array<{value: string, label: string}>>([]);

  // Fetch available organizations
  useEffect(() => {
    if (!user) return;
    const fetchOrganizations = async () => {
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
          
          setAvailableOrgs([
            { value: "all", label: "Todas as Organizações" },
            ...uniqueOrgs.map(org => ({
              value: org.org_id,
              label: org.org_name || org.org_id
            }))
          ]);
        }
      } catch (error) {
        console.error('Erro ao buscar organizações:', error);
      }
    };
    fetchOrganizations();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Detalhamento por Asset</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              
              <Select value={selectedCycleFilter} onValueChange={setSelectedCycleFilter}>
                <SelectTrigger className="w-auto min-w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CYCLE_FILTER_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger className="w-auto min-w-44 max-w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableOrgs.map(org => (
                    <SelectItem key={org.value} value={org.value}>
                      {org.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Asset Detail Component */}
      <AssetDetail 
        selectedOrg={selectedOrg === "all" ? undefined : selectedOrg}
        selectedCycleFilter={selectedCycleFilter}
      />
    </div>
  );
}