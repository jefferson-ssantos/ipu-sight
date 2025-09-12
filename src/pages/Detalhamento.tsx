import { useMemo } from "react";
import { AssetDetailWithFilter } from "@/components/consumption/AssetDetailWithFilter";
import { FileText } from "lucide-react";
import { usePageHeader } from "@/components/layout/AppLayout";

export default function Detalhamento() {
  const pageTitle = useMemo(() => (
    <>
      <FileText className="h-6 w-6 text-primary" />
      <div>
        <h1 className="text-lg font-semibold">Detalhamento por Asset</h1>
      </div>
    </>
  ), []);
  usePageHeader(pageTitle);

  return (
    <div className="p-6 space-y-6">
      <AssetDetailWithFilter />
    </div>
  );
}