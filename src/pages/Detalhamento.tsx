import { MetricBreakdown } from "@/components/analysis/MetricBreakdown";
import { PieChart } from "lucide-react";

export default function Detalhamento() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <PieChart className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Detalhamento por Métrica</h1>
          <p className="text-muted-foreground">
            Análise detalhada do consumo por métrica e categoria
          </p>
        </div>
      </div>
      <MetricBreakdown />
    </div>
  );
}