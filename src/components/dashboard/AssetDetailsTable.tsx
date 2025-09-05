import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, Search, Download, Filter } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AssetData {
  id: string;
  asset_name: string;
  asset_type: string;
  consumption_ipu: number;
  cost: number;
  consumption_date: string;
  org_id: string;
  folder_name: string;
  project_name: string;
  customTags: string[];
}

interface AssetDetailsTableProps {
  onClose: () => void;
  selectedOrg?: string;
}

export function AssetDetailsTable({ onClose, selectedOrg }: AssetDetailsTableProps) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filteredAssets, setFilteredAssets] = useState<AssetData[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchAssetData = async () => {
      try {
        setLoading(true);

        // Get user's client information first
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('cliente_id')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        if (!profile?.cliente_id) throw new Error('Cliente não encontrado');

        // Get client's price per IPU
        const { data: client, error: clientError } = await supabase
          .from('api_clientes')
          .select('preco_por_ipu')
          .eq('id', profile.cliente_id)
          .single();

        if (clientError) throw clientError;

        // First get the configuration IDs for this client
        const { data: configs, error: configError } = await supabase
          .from('api_configuracaoidmc')
          .select('id')
          .eq('cliente_id', profile.cliente_id);

        if (configError) throw configError;
        if (!configs || configs.length === 0) throw new Error('Nenhuma configuração encontrada');

        const configIds = configs.map(config => config.id);

        // Build the query for asset consumption data
        let assetQuery = supabase
          .from('api_consumoasset')
          .select('*')
          .in('configuracao_id', configIds)
          .order('consumption_date', { ascending: false });

        // Filter by organization if selected
        if (selectedOrg && selectedOrg !== 'all') {
          assetQuery = assetQuery.eq('org_id', selectedOrg);
        }

        const { data: assetData, error: assetError } = await assetQuery;

        if (assetError) throw assetError;

        // Transform data and calculate costs
        const transformedAssets: AssetData[] = (assetData || []).map(asset => ({
          id: asset.id.toString(),
          asset_name: asset.asset_name || 'N/A',
          asset_type: asset.asset_type || 'Unknown',
          consumption_ipu: asset.consumption_ipu || 0,
          cost: (asset.consumption_ipu || 0) * client.preco_por_ipu,
          consumption_date: asset.consumption_date || '',
          org_id: asset.org_id || '',
          folder_name: asset.folder_name || '',
          project_name: asset.project_name || '',
          customTags: generateCustomTags(asset)
        }));

        setAssets(transformedAssets);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchAssetData();
  }, [user, selectedOrg]);

  // Generate custom tags based on asset properties
  const generateCustomTags = (asset: any): string[] => {
    const tags: string[] = [];
    
    if (asset.tier) tags.push(`Tier: ${asset.tier}`);
    if (asset.environment_type) tags.push(`Env: ${asset.environment_type}`);
    if (asset.runtime_environment) tags.push(`Runtime: ${asset.runtime_environment}`);
    if (asset.org_type) tags.push(`OrgType: ${asset.org_type}`);
    
    return tags;
  };

  // Filter assets based on search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredAssets(assets);
    } else {
      const filtered = assets.filter(asset =>
        asset.asset_name.toLowerCase().includes(search.toLowerCase()) ||
        asset.asset_type.toLowerCase().includes(search.toLowerCase()) ||
        asset.project_name.toLowerCase().includes(search.toLowerCase()) ||
        asset.folder_name.toLowerCase().includes(search.toLowerCase()) ||
        asset.customTags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      );
      setFilteredAssets(filtered);
    }
  }, [search, assets]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatIPU = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const exportData = () => {
    const csvContent = [
      ['Asset Name', 'Type', 'IPU Consumption', 'Cost (R$)', 'Date', 'Project', 'Folder', 'Custom Tags'].join(','),
      ...filteredAssets.map(asset => [
        asset.asset_name,
        asset.asset_type,
        asset.consumption_ipu,
        asset.cost.toFixed(2),
        asset.consumption_date,
        asset.project_name,
        asset.folder_name,
        asset.customTags.join('; ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset-details.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="fixed inset-4 z-50 bg-card shadow-strong max-h-[90vh] overflow-hidden">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-heading font-bold flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Detalhamento por Asset
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Consumo detalhado por asset com tags customizadas
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando dados...</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>IPU</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Pasta</TableHead>
                <TableHead>Tags Customizadas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow key={asset.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {asset.asset_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {asset.asset_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatIPU(asset.consumption_ipu)}
                  </TableCell>
                  <TableCell className="font-semibold text-cost-high">
                    {formatCurrency(asset.cost)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {asset.consumption_date ? 
                      new Date(asset.consumption_date).toLocaleDateString('pt-BR') : 
                      'N/A'
                    }
                  </TableCell>
                  <TableCell className="text-sm">
                    {asset.project_name || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {asset.folder_name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {asset.customTags.map((tag, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="text-xs bg-secondary/10 text-secondary border-secondary/20"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              
              {filteredAssets.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {search ? 'Nenhum asset encontrado para a busca.' : 'Nenhum asset encontrado.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}