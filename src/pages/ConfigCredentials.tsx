import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Key } from 'lucide-react';

export default function ConfigCredentials() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Key className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Credenciais</h1>
            <p className="text-muted-foreground">
              Gerencie credenciais e chaves de API de forma segura
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Gerenciamento de Credenciais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Gerenciamento de credenciais e chaves de API será implementado aqui.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}