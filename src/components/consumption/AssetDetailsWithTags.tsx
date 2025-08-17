import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Download, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TagManager } from './TagManager';

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
  configuracao_id: number;
  customTags: string[];
  tag_color?: string;
  org_id?: string;
}

interface CustomTag {
  id: number;
  configuracao_id: number;
  meter_id: string | null;
  asset_name: string | null;
  asset_type: string | null;
  project_name: string | null;
  folder_name: string | null;
  tag_name: string;
  tag_color: string;
}

interface AssetDetailsWithTagsProps {
  onClose: () => void;
  selectedOrg?: string;
}

export function AssetDetailsWithTags({ onClose, selectedOrg }: AssetDetailsWithTagsProps) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<AssetData[]>([]);
  const [customTags, setCustomTags] = useState<CustomTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('assets');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, selectedOrg]);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredAssets(assets);
    } else {
      const filtered = assets.filter(asset =>
        asset.asset_name?.toLowerCase().includes(search.toLowerCase()) ||
        asset.asset_type?.toLowerCase().includes(search.toLowerCase()) ||
        asset.project_name?.toLowerCase().includes(search.toLowerCase()) ||
        asset.folder_name?.toLowerCase().includes(search.toLowerCase()) ||
        asset.customTags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      );
      setFilteredAssets(filtered);
    }
  }, [search, assets]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchAssetData(), fetchCustomTags()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomTags = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('cliente_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.cliente_id) return;

      const { data: configs } = await supabase
        .from('api_configuracaoidmc')
        .select('id')
        .eq('cliente_id', profile.cliente_id);

      if (!configs?.length) return;

      const { data, error } = await supabase
        .from('api_tags_customizadas')
        .select('*')
        .in('configuracao_id', configs.map(c => c.id));

      if (error) {
        console.error('Error fetching custom tags:', error);
        return;
      }

      setCustomTags(data || []);
    } catch (error) {
      console.error('Error fetching custom tags:', error);
    }
  };

  const fetchAssetData = async () => {
    try {
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
        .select('id')
        .eq('cliente_id', profile.cliente_id);

      if (!configs?.length) return;

      let query = supabase
        .from('api_consumoasset')
        .select('*')
        .in('configuracao_id', configs.map(c => c.id))
        .not('consumption_ipu', 'is', null)
        .order('consumption_date', { ascending: false });

      if (selectedOrg) {
        query = query.eq('org_id', selectedOrg);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching asset data:', error);
        return;
      }

      const processedData = data?.map(asset => ({
        ...asset,
        cost: (asset.consumption_ipu || 0) * Number(clientPricing.preco_por_ipu),
        customTags: generateCustomTags(asset)
      })) || [];

      setAssets(processedData);
    } catch (error) {
      console.error('Error fetching asset data:', error);
    }
  };

  const generateCustomTags = (asset: any): string[] => {
    const matchingTag = customTags.find(tag => 
      tag.configuracao_id === asset.configuracao_id &&
      tag.meter_id === asset.meter_id &&
      tag.asset_name === asset.asset_name &&
      tag.asset_type === asset.asset_type &&
      tag.project_name === asset.project_name &&
      tag.folder_name === asset.folder_name
    );

    if (matchingTag) {
      return [matchingTag.tag_name];
    }

    const tags = [];
    if (asset.asset_type) tags.push(asset.asset_type);
    if (asset.tier) tags.push(`Tier: ${asset.tier}`);
    if (asset.runtime_environment) tags.push(`Env: ${asset.runtime_environment}`);
    return tags;
  };

  const getTagColor = (asset: AssetData, tagName: string): string => {
    const matchingTag = customTags.find(tag => 
      tag.configuracao_id === asset.configuracao_id &&
      tag.meter_id === asset.meter_id &&
      tag.asset_name === asset.asset_name &&
      tag.asset_type === asset.asset_type &&
      tag.project_name === asset.project_name &&
      tag.folder_name === asset.folder_name &&
      tag.tag_name === tagName
    );

    return matchingTag?.tag_color || 'hsl(var(--primary))';
  };

  const exportData = () => {
    const csvContent = [
      ['Asset', 'Tipo', 'IPU', 'Custo', 'Data', 'Projeto', 'Pasta', 'Tags'].join(','),
      ...filteredAssets.map(asset => [
        asset.asset_name || '',
        asset.asset_type || '',
        formatIPU(asset.consumption_ipu || 0),
        formatCurrency(asset.cost),
        asset.consumption_date || '',
        asset.project_name || '',
        asset.folder_name || '',
        asset.customTags.join('; ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assets_detalhados_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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

  return (
    <Card className="w-full max-w-[95vw] h-[90vh]">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Detalhamento de Assets com Tags</CardTitle>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assets">Assets Detalhados</TabsTrigger>
            <TabsTrigger value="tags">Gerenciar Tags</TabsTrigger>
          </TabsList>
          
          <TabsContent value="assets" className="space-y-4">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por asset, tipo, projeto, pasta ou tag..."
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
                        <TableHead>Tipo</TableHead>
                        <TableHead>IPU</TableHead>
                        <TableHead>Custo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Projeto</TableHead>
                        <TableHead>Pasta</TableHead>
                        <TableHead>Tags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            {search ? 'Nenhum asset encontrado com os critérios de busca' : 'Nenhum asset encontrado'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAssets.map((asset) => (
                          <TableRow key={asset.id}>
                            <TableCell className="font-medium">
                              {asset.asset_name || 'N/A'}
                            </TableCell>
                            <TableCell>{asset.asset_type || 'N/A'}</TableCell>
                            <TableCell>{formatIPU(asset.consumption_ipu || 0)}</TableCell>
                            <TableCell>{formatCurrency(asset.cost)}</TableCell>
                            <TableCell>
                              {asset.consumption_date ? new Date(asset.consumption_date).toLocaleDateString('pt-BR') : 'N/A'}
                            </TableCell>
                            <TableCell>{asset.project_name || 'N/A'}</TableCell>
                            <TableCell>{asset.folder_name || 'N/A'}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {asset.customTags.map((tag, index) => (
                                  <Badge 
                                    key={index} 
                                    variant="secondary"
                                    style={{ 
                                      backgroundColor: getTagColor(asset, tag),
                                      color: 'white'
                                    }}
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="tags">
            <TagManager selectedOrg={selectedOrg} />
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
}