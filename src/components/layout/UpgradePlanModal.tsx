import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, Star, Gem, Rocket } from "lucide-react";
import { Badge } from "../ui/badge";

interface UpgradePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissions: {
    canAccessDashboardEssential?: boolean;
    canAccessDashboardStarter?: boolean;
    canAccessAnalysis?: boolean;
    canAccessDetalhamento?: boolean;
  } | null;
}

const features = [
  { name: "Dashboard", starter: "Starter", essential: "Essential", pro: "Essential" },
  { name: "Análise de Custos (Tendências e Preditiva)", starter: false, essential: false, pro: true },
  { name: "Detalhamento por Asset", starter: false, essential: false, pro: true },
  { name: "Análise de Consumo", starter: true, essential: true, pro: true },
  { name: "Configuração", starter: "Apenas Admin", essential: "Apenas Admin", pro: "Apenas Admin" },
];

export function UpgradePlanModal({ open, onOpenChange, permissions }: UpgradePlanModalProps) {
  const isPro = permissions?.canAccessAnalysis && permissions?.canAccessDetalhamento;
  const isEssential = permissions?.canAccessDashboardEssential && !isPro;
  const isStarter = permissions?.canAccessDashboardStarter && !isEssential && !isPro;

  const renderFeature = (value: string | boolean, isProColumn = false) => {
    if (typeof value === 'string') {
      return <span className={`text-xs font-medium ${isProColumn ? 'text-primary' : ''}`}>{value}</span>;
    }
    return value 
      ? <Check className={`h-5 w-5 ${isProColumn ? 'text-primary' : 'text-green-500'}`} /> 
      : <X className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold">
            Compare Nossos Planos
          </DialogTitle>
          <DialogDescription>
            {isPro
              ? "Você já possui nosso plano mais completo. Obrigado por ser um cliente Pro!"
              : "Desbloqueie todo o potencial da plataforma com um upgrade de plano."}
          </DialogDescription>
        </DialogHeader>

        <div className="my-6">
          <div className="grid grid-cols-4 gap-px border border-border rounded-lg overflow-hidden">
            {/* Headers */}
            <div className="p-4 font-semibold bg-muted/50">Funcionalidade</div>
            <div className="p-4 font-semibold bg-muted/50 text-center">
              <div className="flex items-center justify-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" /> 🌟 STARTER
              </div>
              {isStarter && <Badge variant="outline" className="mt-1">Seu Plano</Badge>}
            </div>
            <div className="p-4 font-semibold bg-muted/50 text-center">
              <div className="flex items-center justify-center gap-2">
                <Gem className="h-5 w-5 text-blue-500" /> 📊 ESSENTIAL
              </div>
              {isEssential && <Badge variant="outline" className="mt-1">Seu Plano</Badge>}
            </div>
            <div className="p-4 font-semibold bg-primary/10 text-center text-primary">
              <div className="flex items-center justify-center gap-2">
                <Rocket className="h-5 w-5" /> 🚀 PRO
              </div>
              {isPro
                ? <Badge variant="default" className="mt-1 bg-primary text-primary-foreground">Seu Plano</Badge>
                : <Badge variant="default" className="mt-1 bg-primary text-primary-foreground">Recomendado</Badge>
              }
            </div>

            {/* Features */}
            {features.map((feature, index) => (
              <React.Fragment key={index}>
                <div className="p-4 text-sm font-medium border-t">{feature.name}</div>
                <div className="p-4 flex justify-center items-center border-t">
                  {renderFeature(feature.starter)}
                </div>
                <div className="p-4 flex justify-center items-center border-t">
                  {renderFeature(feature.essential)}
                </div>
                <div className="p-4 flex justify-center items-center border-t bg-primary/5">
                  {renderFeature(feature.pro, true)}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <DialogFooter>
          {isPro ? (
            <Button type="button" className="w-full" disabled>
              Você já está no plano Pro
            </Button>
          ) : isEssential ? (
            <Button type="button" className="w-full bg-primary hover:bg-primary/90" disabled>
              Fazer Upgrade para o Pro
            </Button>
          ) : ( // isStarter
            <Button type="button" className="w-full bg-primary hover:bg-primary/90" disabled>
              Fazer Upgrade para o Essential
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}