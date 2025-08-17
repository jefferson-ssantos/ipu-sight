import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, FolderOpen, Building, Play } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { AssetDetail } from '@/components/consumption/AssetDetail';
import { ProjectDetail } from '@/components/consumption/ProjectDetail';
import { OrganizationDetail } from '@/components/consumption/OrganizationDetail';
import { JobExecutionDetail } from '@/components/consumption/JobExecutionDetail';

export default function ConsumptionDetails() {
  const { data, loading } = useDashboardData();
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [activeTab, setActiveTab] = useState('assets');

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="assets" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Por Asset
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Por Projeto
            </TabsTrigger>
            <TabsTrigger value="organizations" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Por Organização
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Execução de Jobs
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="assets" className="space-y-4">
            <AssetDetail selectedOrg={selectedOrg} />
          </TabsContent>
          
          <TabsContent value="projects" className="space-y-4">
            <ProjectDetail selectedOrg={selectedOrg} />
          </TabsContent>
          
          <TabsContent value="organizations" className="space-y-4">
            <OrganizationDetail selectedOrg={selectedOrg} />
          </TabsContent>
          
          <TabsContent value="jobs" className="space-y-4">
            <JobExecutionDetail selectedOrg={selectedOrg} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}