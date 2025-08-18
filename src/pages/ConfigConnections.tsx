import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from 'lucide-react';

export default function ConfigConnections() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Database className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Conexões</h1>
            <p className="text-muted-foreground">
              Configure e gerencie as conexões com Informatica Data Management Cloud
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Configurações de Conexão IDMC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Configurações das conexões com Informatica Data Management Cloud serão exibidas aqui.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}