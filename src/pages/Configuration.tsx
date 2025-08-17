import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Tags, Database, Key } from 'lucide-react';
import { TagManager } from '@/components/consumption/TagManager';

export default function Configuration() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Settings className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-muted-foreground">
              Gerencie as configurações do sistema e personalizações
            </p>
          </div>
        </div>

        <Tabs defaultValue="tags" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tags" className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              Tags Customizadas
            </TabsTrigger>
            <TabsTrigger value="connections" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Conexões
            </TabsTrigger>
            <TabsTrigger value="credentials" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Credenciais
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tags" className="space-y-4">
            <TagManager />
          </TabsContent>
          
          <TabsContent value="connections" className="space-y-4">
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
          </TabsContent>
          
          <TabsContent value="credentials" className="space-y-4">
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
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}