import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Database, Tags, FileText, FolderOpen, Building, Play } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useNavigate } from 'react-router-dom';

export default function ConsumptionOverview() {
  const { data, loading } = useDashboardData();
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const navigate = useNavigate();

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
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Detalhamento de Consumo</h1>
            <p className="text-muted-foreground">
              Visões específicas por asset, projeto, organização e execução de jobs
            </p>
          </div>
          
          <div className="flex gap-2">
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
            
            <Button onClick={() => window.location.reload()}>
              <FileText className="h-4 w-4 mr-2" />
              Atualizar Dados
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="text-sm font-medium">Custo Total</div>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(data?.totalCost || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Período de faturamento atual
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="text-sm font-medium">IPU Total</div>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatIPU(data?.totalIPU || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Unidades de processamento consumidas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="text-sm font-medium">Organizações Ativas</div>
                  <Tags className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data?.activeOrgs || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Organizações com consumo
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="text-sm font-medium">Custo Médio Diário</div>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(data?.avgDailyCost || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Baseado no período atual
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Visões Específicas */}
            <Card>
              <CardHeader>
                <CardTitle>Visões Específicas de Detalhamento</CardTitle>
                <p className="text-muted-foreground">
                  Acesse diferentes perspectivas dos dados de consumo
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    onClick={() => navigate('/consumption/assets')}
                  >
                    <FileText className="h-6 w-6" />
                    <span>Por Asset</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    onClick={() => navigate('/consumption/projects')}
                  >
                    <FolderOpen className="h-6 w-6" />
                    <span>Por Projeto</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    onClick={() => navigate('/consumption/organizations')}
                  >
                    <Building className="h-6 w-6" />
                    <span>Por Organização</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    onClick={() => navigate('/consumption/jobs')}
                  >
                    <Play className="h-6 w-6" />
                    <span>Execução de Jobs</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {data?.organizations && data.organizations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Organização</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.organizations
                      .filter(org => !selectedOrg || org.org_id === selectedOrg)
                      .sort((a, b) => b.cost - a.cost)
                      .map((org) => (
                        <div key={org.org_id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{org.org_name || org.org_id}</h3>
                              <Badge variant="outline">
                                {org.percentage.toFixed(1)}%
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              IPU: {formatIPU(org.consumption_ipu)} | Custo: {formatCurrency(org.cost)}
                            </p>
                          </div>
                          <div className="w-32 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${org.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}