import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CostTrendAnalysis } from "@/components/analysis/CostTrendAnalysis";
import { OrganizationComparison } from "@/components/analysis/OrganizationComparison";
import { MetricBreakdown } from "@/components/analysis/MetricBreakdown";
import { CostForecast } from "@/components/analysis/CostForecast";
import { TrendingUp, BarChart3, PieChart, Activity } from "lucide-react";

export default function Analysis() {
  const [selectedTab, setSelectedTab] = useState("trends");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Análise de Custos</h1>
          <p className="text-muted-foreground">
            Análises detalhadas e insights sobre seus custos de IPU
          </p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Tendências
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Comparação
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Detalhamento
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Previsão
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <CostTrendAnalysis />
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <OrganizationComparison />
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <MetricBreakdown />
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          <CostForecast />
        </TabsContent>
      </Tabs>
    </div>
  );
}