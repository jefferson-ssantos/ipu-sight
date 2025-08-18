import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

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

        <div className="grid w-full grid-cols-4 gap-4 mb-6">
          <button 
            onClick={() => navigate('/consumption/assets')}
            className="flex items-center gap-2 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
          >
            <FileText className="h-5 w-5" />
            <span className="font-medium">Por Asset</span>
          </button>
          <button 
            onClick={() => navigate('/consumption/projects')}
            className="flex items-center gap-2 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
          >
            <FolderOpen className="h-5 w-5" />
            <span className="font-medium">Por Projeto</span>
          </button>
          <button 
            onClick={() => navigate('/consumption/organizations')}
            className="flex items-center gap-2 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
          >
            <Building className="h-5 w-5" />
            <span className="font-medium">Por Organização</span>
          </button>
          <button 
            onClick={() => navigate('/consumption/jobs')}
            className="flex items-center gap-2 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
          >
            <Play className="h-5 w-5" />
            <span className="font-medium">Execução de Jobs</span>
          </button>
        </div>

        <div className="space-y-4">
          <AssetDetail selectedOrg={selectedOrg} />
        </div>
      </div>
    </AppLayout>
  );
}