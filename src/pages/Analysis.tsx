import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CostTrendAnalysis } from "@/components/analysis/CostTrendAnalysis";
import { ProjectTrendAnalysis } from "@/components/analysis/ProjectTrendAnalysis";
import { ProjectForecast } from "@/components/analysis/ProjectForecast";
import { CostForecast } from "@/components/analysis/CostForecast";
import { TrendingUp, BarChart3, Activity, FolderOpen } from "lucide-react";

export default function Analysis() {
  const [selectedMainTab, setSelectedMainTab] = useState("trends");
  const [selectedSubTab, setSelectedSubTab] = useState("metrics");

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

      {/* Tabs lado a lado */}
      <div className="flex items-center gap-4">
        {/* Primeiro seletor: Tendências/Análise Preditiva */}
        <div className="flex bg-gradient-card shadow-medium rounded-lg p-1">
          <button
            onClick={() => setSelectedMainTab("trends")}
            className={`flex items-center gap-2 h-9 px-4 text-sm font-medium transition-all duration-200 rounded-md ${
              selectedMainTab === "trends"
                ? "bg-background text-foreground shadow-sm border border-border"
                : "hover:bg-background/50 text-muted-foreground"
            }`}
          >
            <Activity className="h-4 w-4" />
            Tendências
          </button>
          <button
            onClick={() => setSelectedMainTab("forecast")}
            className={`flex items-center gap-2 h-9 px-4 text-sm font-medium transition-all duration-200 rounded-md ${
              selectedMainTab === "forecast"
                ? "bg-background text-foreground shadow-sm border border-border"
                : "hover:bg-background/50 text-muted-foreground"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Análise Preditiva
          </button>
        </div>

        {/* Segundo seletor: Por Métrica/Por Projeto */}
        <div className="flex bg-gradient-card shadow-medium rounded-lg p-1">
          <button
            onClick={() => setSelectedSubTab("metrics")}
            className={`flex items-center gap-2 h-9 px-4 text-sm font-medium transition-all duration-200 rounded-md ${
              selectedSubTab === "metrics"
                ? "bg-background text-foreground shadow-sm border border-border"
                : "hover:bg-background/50 text-muted-foreground"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Por Métrica
          </button>
          <button
            onClick={() => setSelectedSubTab("projects")}
            className={`flex items-center gap-2 h-9 px-4 text-sm font-medium transition-all duration-200 rounded-md ${
              selectedSubTab === "projects"
                ? "bg-background text-foreground shadow-sm border border-border"
                : "hover:bg-background/50 text-muted-foreground"
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            Por Projeto
          </button>
        </div>
      </div>

      {/* Conteúdo baseado nas seleções */}
      <div>
        {selectedMainTab === "trends" && selectedSubTab === "metrics" && <CostTrendAnalysis />}
        {selectedMainTab === "trends" && selectedSubTab === "projects" && <ProjectTrendAnalysis />}
        {selectedMainTab === "forecast" && selectedSubTab === "metrics" && <CostForecast />}
        {selectedMainTab === "forecast" && selectedSubTab === "projects" && <ProjectForecast />}
      </div>
    </div>
  );
}