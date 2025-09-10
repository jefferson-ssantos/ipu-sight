import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CostTrendAnalysis } from "@/components/analysis/CostTrendAnalysis";
import { ProjectTrendAnalysis } from "@/components/analysis/ProjectTrendAnalysis";
import { ProjectForecast } from "@/components/analysis/ProjectForecast";
import { CostForecast } from "@/components/analysis/CostForecast";
import { TrendingUp, BarChart3, PieChart, Activity, FolderOpen } from "lucide-react";

export default function Analysis() {
  const [selectedTab, setSelectedTab] = useState("trends");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Análise de Custos</h1>
          <p className="text-muted-foreground">
            Têndencias e Análise Preditiva sobre seus custos do IDMC
          </p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="bg-gradient-card shadow-medium">
          <TabsTrigger 
            value="trends" 
            className="flex items-center gap-2 h-9 px-4 text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border rounded-md"
          >
            <Activity className="h-4 w-4" />
            Tendências
          </TabsTrigger>
          <TabsTrigger 
            value="forecast" 
            className="flex items-center gap-2 h-9 px-4 text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border rounded-md"
          >
            <TrendingUp className="h-4 w-4" />
            Análise Preditiva
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Tabs defaultValue="metrics" className="space-y-4">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="metrics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Por Métrica
              </TabsTrigger>
              <TabsTrigger value="projects" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Por Projeto
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="metrics">
              <CostTrendAnalysis />
            </TabsContent>
            
            <TabsContent value="projects">
              <ProjectTrendAnalysis />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          <Tabs defaultValue="metrics" className="space-y-4">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="metrics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Por Métrica
              </TabsTrigger>
              <TabsTrigger value="projects" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Por Projeto
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="metrics">
              <CostForecast />
            </TabsContent>
            
            <TabsContent value="projects">
              <ProjectForecast />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}