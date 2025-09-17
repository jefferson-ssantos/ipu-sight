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
    { name: "Visão Geral de Custos", starter: true, essential: true, pro: true },
    { name: "Organizações Ativas", starter: true, essential: true, pro: true },
    { name: "Análise Consolidada de Custos", starter: true, essential: false, pro: false },
    { name: "Análise Consolidada de Custos por Métrica (Limitado a 3 ciclos)", starter: true, essential: false, pro: false },
    { name: "Análise Consolidada de Custos por Métrica", starter: false, essential: true, pro: true },
    { name: "Análise Consolidada de Custos por Organização", starter: false, essential: true, pro: true },
    { name: "Análise Consolidada de Custos por Projeto", starter: false, essential: true, pro: true },
    { name: "Acompanhamento de Orçamento", starter: false, essential: true, pro: true },
    { name: "Percentual Consumido do Contratado", starter: false, essential: true, pro: true },
    { name: "Custo Médio Diário", starter: false, essential: true, pro: true },
    { name: "Comparativo de Custo Médio Diário vs. Histórico", starter: false, essential: true, pro: true },
    { name: "Tendência de Crescimento e Status", starter: false, essential: false, pro: true },
    { name: "Tendência por Métrica e Projeto", starter: false, essential: false, pro: true },
    { name: "Análise Preditiva por Métrica e Projeto", starter: false, essential: false, pro: true },
    { name: "Análise Preditiva de Custo Mensal", starter: false, essential: false, pro: true },
    { name: "Detalhamento de Custos por Ativo (Asset)", starter: false, essential: false, pro: true },
    { name: "Análise detalhada de consumo e custo", starter: false, essential: false, pro: true },
    { name: "Tendência por Ativo", starter: false, essential: false, pro: true },
  ];

export function UpgradePlanModal({ open, onOpenChange, permissions }: UpgradePlanModalProps) {
  const isPro = permissions?.canAccessAnalysis && permissions?.canAccessDetalhamento;
  const isEssential = permissions?.canAccessDashboardEssential && !isPro;
  const isStarter = permissions?.canAccessDashboardStarter && !isEssential && !isPro;
  const isLoggedIn = permissions !== null;

  const renderFeature = (value: string | boolean, isProColumn = false) => {
    if (typeof value === 'string') {
      return <span className={`text-xs font-medium ${isProColumn ? 'text-primary' : ''}`}>{value}</span>;
    }
    return value 
      ? <Check className={`h-4 w-4 ${isProColumn ? 'text-primary' : 'text-green-500'}`} /> 
      : <X className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold">
            Compare Nossos Planos
          </DialogTitle>
          <DialogDescription className="px-6">
            {isPro
              ? "Você já possui nosso plano mais completo. Obrigado por ser um cliente Pro!"
              : "Desbloqueie todo o potencial da plataforma com um upgrade de plano."}
          </DialogDescription>
        </DialogHeader>

        <div className="my-6 overflow-y-auto max-h-[60vh] border border-border rounded-lg">
          <div className="grid grid-cols-[4fr_1fr_1fr_1fr] gap-px">
            {/* Headers */}
            <div className="p-3 font-semibold bg-muted text-sm sticky top-0 z-10">Funcionalidades</div>
            <div className="p-3 font-semibold bg-muted text-center text-sm sticky top-0 z-10">
              <div className="flex items-center justify-center gap-1.5">
                <Star className="h-4 w-4 text-yellow-500" /> STARTER
              </div>
              {isStarter && <Badge variant="outline" className="mt-1">Seu Plano</Badge>}
            </div>
            <div className="p-3 font-semibold bg-muted text-center text-sm sticky top-0 z-10">
              <div className="flex items-center justify-center gap-1.5">
                <Gem className="h-4 w-4 text-blue-500" /> ESSENTIAL
              </div>
              {isEssential && <Badge variant="outline" className="mt-1">Seu Plano</Badge>}
            </div>
            <div className="p-3 font-semibold bg-primary/20 text-center text-primary text-sm sticky top-0 z-10">
              <div className="flex items-center justify-center gap-1.5">
                <Rocket className="h-4 w-4" /> PRO
              </div>
              {isPro
                ? <Badge variant="default" className="mt-1 bg-primary text-primary-foreground">Seu Plano</Badge>
                : <Badge variant="default" className="mt-1 bg-primary text-primary-foreground">Recomendado</Badge>
              }
            </div>

            {/* Features */}
            {features.map((feature, index) => (
              <React.Fragment key={index}>
                <div className="p-3 text-xs font-medium border-t">{feature.name}</div>
                <div className="p-3 flex justify-center items-center border-t">
                  {renderFeature(feature.starter)}
                </div>
                <div className="p-3 flex justify-center items-center border-t">
                  {renderFeature(feature.essential)}
                </div>
                <div className="p-3 flex justify-center items-center border-t bg-primary/5">
                  {renderFeature(feature.pro, true)}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <DialogFooter>
          {!isLoggedIn ? (
            <Button type="button" className="w-full bg-primary hover:bg-primary/90" disabled>
              Fale com Vendas para contratar
            </Button>
          ) : isPro ? (
            <Button type="button" className="w-full" disabled>
              Você já está no plano Pro
            </Button>
          ) : isEssential ? (
            <Button type="button" className="w-full bg-primary hover:bg-primary/90" disabled>
              Fazer Upgrade para o Pro
            </Button>
          ) : (
            <Button type="button" className="w-full bg-primary hover:bg-primary/90" disabled>
              Fale com Vendas para fazer o upgrade
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}