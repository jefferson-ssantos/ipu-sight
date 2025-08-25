import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, FolderOpen, Building, Play, PieChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ConsumptionOverview() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <PieChart className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Detalhamento</h1>
            <p className="text-muted-foreground">
              Explore o consumo e custos através de diferentes perspectivas e níveis de granularidade
            </p>
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>
    </AppLayout>
  );
}