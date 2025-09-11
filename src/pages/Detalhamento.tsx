import { AssetDetailWithFilter } from "@/components/consumption/AssetDetailWithFilter";
import { FileText } from "lucide-react";

export default function Detalhamento() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Detalhamento</h1>
          <p className="text-muted-foreground">
            Análise detalhada do consumo por asset
          </p>
        </div>
      </div>
      
      <AssetDetailWithFilter />
    </div>
  );
}