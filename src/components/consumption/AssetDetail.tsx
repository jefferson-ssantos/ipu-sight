import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, FileText, Filter } from 'lucide-react';
import { CYCLE_FILTER_OPTIONS } from '@/lib/cycleFilterOptions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AssetData {
  id: number;
  asset_name: string | null;
  asset_type: string | null;
  consumption_ipu: number | null;
  cost: number;
  consumption_date: string | null;
  project_name: string | null;
  folder_name: string | null;
  meter_id: string | null;
  meter_name: string | null;
  tier: string | null;
  runtime_environment: string | null;
  org_id: string | null;
  org_name: string | null;
  trend?: 'up' | 'down' | 'stable';
  trendPercentage?: number;
}

interface AssetDetailProps {
  selectedOrg?: string;
  selectedCycleFilter?: string;
  availableOrgs?: Array<{value: string, label: string}>;
  onOrgChange?: (value: string) => void;
  onCycleChange?: (value: string) => void;
}

export function AssetDetail({ selectedOrg, selectedCycleFilter, availableOrgs = [], onOrgChange, onCycleChange }: AssetDetailProps) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<AssetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) {
      fetchAssetData();
    }
  }, [user, selectedOrg, selectedCycleFilter]);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredAssets(assets);
    } else {
      const filtered = assets.filter(asset =>
        asset.asset_name?.toLowerCase().includes(search.toLowerCase()) ||
        asset.meter_name?.toLowerCase().includes(search.toLowerCase()) ||
        asset.project_name?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredAssets(filtered);
    }
  }, [search, assets]);

  const calculateTrend = (asset: any, allAssets: any[]): { trend: 'up' | 'down' | 'stable', percentage: number } => {
    // Helper to safely convert values to number
    const toNumber = (v: any): number => {
      if (v === null || v === undefined) return 0;
      const n = typeof v === 'number' ? v : Number(v);
      return isNaN(n) ? 0 : n;
    };

    // Find previous records for the same asset, project, and organization (strictly earlier dates)
    const sameAssetRecords = allAssets
      .filter((a) =>
        a.asset_name === asset.asset_name &&
        a.project_name === asset.project_name &&
        a.org_id === asset.org_id &&
        a.consumption_date !== asset.consumption_date &&
        new Date(a.consumption_date) < new Date(asset.consumption_date)
      )
      .sort(
        (a, b) =>
          new Date(b.consumption_date).getTime() - new Date(a.consumption_date).getTime()
      )
      .slice(0, 5);

    if (sameAssetRecords.length === 0) {
      return { trend: 'stable', percentage: 0 };
    }

    const currentConsumption = toNumber(asset.consumption_ipu);

    const previousConsumptions = sameAssetRecords.map((record) =>
      toNumber(record.consumption_ipu)
    );

    // If all previous values are equal and equal to current, trend is stable 0%
    const epsilon = 1e-9;
    const allPrevEqual = previousConsumptions.every(
      (value) => Math.abs(value - previousConsumptions[0]) < epsilon
    );

    if (allPrevEqual && Math.abs(currentConsumption - previousConsumptions[0]) < epsilon) {
      return { trend: 'stable', percentage: 0 };
    }

    const avgPreviousConsumption =
      previousConsumptions.reduce((sum, value) => sum + value, 0) /
      previousConsumptions.length;

    if (avgPreviousConsumption === 0) {
      if (currentConsumption === 0) return { trend: 'stable', percentage: 0 };
      return { trend: 'up', percentage: 100 };
    }

    const percentageChange =
      ((currentConsumption - avgPreviousConsumption) / avgPreviousConsumption) * 100;

    if (Math.abs(percentageChange) < 1e-6) {
      return { trend: 'stable', percentage: 0 };
    } else if (percentageChange > 0) {
      return { trend: 'up', percentage: Math.abs(percentageChange) };
    } else {
      return { trend: 'down', percentage: Math.abs(percentageChange) };
    }
  };

  const fetchAssetData = async () => {
    try {
      setLoading(true);
      const { data: profile } = await supabase
        .from('profiles')
        .select('cliente_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.cliente_id) return;

      const { data: clientPricing } = await supabase
        .from('api_clientes')
        .select('preco_por_ipu')
        .eq('id', profile.cliente_id)
        .single();

      if (!clientPricing?.preco_por_ipu) return;

      const { data: configs } = await supabase
        .from('api_configuracaoidmc')
        .select('id,apelido_configuracao')
        .eq('cliente_id', profile.cliente_id);

      if (!configs?.length) return;

      // First get organization names from summary table
      const { data: orgNames } = await supabase
        .from('api_consumosummary')
        .select('org_id, org_name')
        .in('configuracao_id', configs.map(c => c.id))
        .not('org_id', 'is', null)
        .not('org_name', 'is', null);

      // Create a map of org_id to org_name
      const orgNameMap = new Map();
      orgNames?.forEach(org => {
        if (org.org_id && org.org_name) {
          orgNameMap.set(org.org_id, org.org_name);
        }
      });

      let query = supabase
        .from('api_consumoasset')
        .select('*')
        .in('configuracao_id', configs.map(c => c.id))
        .not('consumption_ipu', 'is', null)
        .order('consumption_date',{ ascending: false })
        .order('consumption_ipu',{ ascending: false });

      if (selectedOrg) {
        query = query.eq('org_id', selectedOrg);
      }

      const { data, error } = await query;

      if (error) {
        return;
      }

      const processedData = data?.map(asset => {
        const { trend, percentage } = calculateTrend(asset, data);
        return {
          ...asset,
          cost: (asset.consumption_ipu || 0) * Number(clientPricing.preco_por_ipu),
          org_name: orgNameMap.get(asset.org_id) || null,
          trend,
          trendPercentage: percentage
        };
      }) || [];

      setAssets(processedData);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatIPU = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString('pt-BR');
  };

  const getTrendBadge = (trend: 'up' | 'down' | 'stable', percentage: number) => {
    const formattedPercentage = percentage.toFixed(1);
    
    switch (trend) {
      case 'up':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            ↗ +{formattedPercentage}%
          </Badge>
        );
      case 'down':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            ↘ -{formattedPercentage}%
          </Badge>
        );
      case 'stable':
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            → ±{formattedPercentage}%
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">N/A</Badge>
        );
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Asset', 'IPU', 'Custo', 'Data', 'Projeto', 'Ambiente', 'Organização', 'Tendência'].join(','),
      ...filteredAssets.map(asset => [
        asset.asset_name || asset.meter_name || '',
        formatIPU(asset.consumption_ipu || 0),
        formatCurrency(asset.cost),
        asset.consumption_date || '',
        asset.project_name || '',
        asset.runtime_environment || '',
        asset.org_name || asset.org_id || '',
        asset.trend ? `${asset.trend === 'up' ? '+' : asset.trend === 'down' ? '-' : '±'}${asset.trendPercentage?.toFixed(1)}%` : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detalhamento_assets_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Detalhamento por Asset</CardTitle>
          {availableOrgs.length > 0 && onOrgChange && onCycleChange && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              
              <Select value={selectedCycleFilter || "1"} onValueChange={onCycleChange}>
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

              <Select value={selectedOrg ? selectedOrg : "all"} onValueChange={onOrgChange}>
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
          )}
        </div>
        
        <div className="flex gap-4 items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por asset ou projeto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={exportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="text-muted-foreground">Carregando dados...</div>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Organização</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>IPU</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Tendência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {search ? 'Nenhum asset encontrado com os critérios de busca' : 'Nenhum asset encontrado'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">
                          {asset.asset_name || asset.meter_name || 'N/A'}
                        </TableCell>
                        <TableCell>{asset.project_name || 'N/A'}</TableCell>
                        <TableCell className="font-medium">{asset.org_name || asset.org_id || 'N/A'}</TableCell>
                        <TableCell>
                          {asset.consumption_date ? new Date(asset.consumption_date).toLocaleDateString('pt-BR') : 'N/A'}
                        </TableCell>
                        <TableCell>{formatIPU(asset.consumption_ipu || 0)}</TableCell>
                        <TableCell>
                          {formatCurrency(asset.cost) && (
                            <Badge variant="secondary">{formatCurrency(asset.cost)}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {asset.trend && asset.trendPercentage !== undefined 
                            ? getTrendBadge(asset.trend, asset.trendPercentage)
                            : <Badge variant="outline">N/A</Badge>
                          }
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}