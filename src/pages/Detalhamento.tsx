import { MetricBreakdown } from "@/components/analysis/MetricBreakdown";
import { AssetDetailWithFilter } from "@/components/consumption/AssetDetailWithFilter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, FileText } from "lucide-react";

export default function Detalhamento() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <PieChart className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Detalhamento</h1>
          <p className="text-muted-foreground">
            Análise detalhada do consumo por métrica e asset
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="metrics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Por Métrica
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Por Asset
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="metrics">
          <MetricBreakdown />
        </TabsContent>
        
        <TabsContent value="assets">
          <AssetDetailWithFilter />
        </TabsContent>
      </Tabs>
    </div>
  );
}