import { useMemo } from "react";
import { VirtualTagManager } from "@/components/virtual-tags/VirtualTagManager";
import { Tags } from "lucide-react";
import { usePageHeader } from "@/components/layout/AppLayout";

export default function VirtualTags() {
  const pageTitle = useMemo(() => (
    <div className="flex items-center gap-3">
      <Tags className="h-8 w-8 text-primary" />
      <div>
        <h1 className="text-3xl font-bold">Virtual Tags</h1>
        <p className="text-muted-foreground">
          Automatize a categorização de recursos com tags baseadas em regras
        </p>
      </div>
    </div>
  ), []);
  
  usePageHeader(pageTitle);

  return (
    <div className="p-6 space-y-6">
      <VirtualTagManager />
    </div>
  );
}