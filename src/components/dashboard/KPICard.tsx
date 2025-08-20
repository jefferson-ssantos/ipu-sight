import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    direction: "up" | "down" | "neutral";
  };
  variant?: "default" | "cost" | "success" | "warning";
  className?: string;
  contractedValue?: string | number;
  consumptionPercentage?: number;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
  contractedValue,
  consumptionPercentage
}: KPICardProps) {
  const variants = {
    default: {
      card: "bg-gradient-card border-border",
      icon: "bg-primary/10 text-primary",
      value: "text-foreground"
    },
    cost: {
      card: "bg-gradient-card border-cost-high/20 shadow-glow",
      icon: "bg-cost-high/10 text-cost-high",
      value: "text-cost-high"
    },
    success: {
      card: "bg-gradient-success/5 border-secondary/20",
      icon: "bg-secondary/10 text-secondary",
      value: "text-secondary"
    },
    warning: {
      card: "bg-gradient-card border-warning/20",
      icon: "bg-warning/10 text-warning",
      value: "text-warning"
    }
  };

  const variantStyles = variants[variant];
  
  const getTrendVariant = (direction: string) => {
    switch (direction) {
      case "up":
        return variant === "cost" ? "destructive" : "secondary";
      case "down":
        return variant === "cost" ? "secondary" : "destructive";
      default:
        return "outline";
    }
  };

  const formatValue = (val: string | number) => {
    if (typeof val === "number") {
      if (val >= 1000000) {
        return (val / 1000000).toFixed(1) + "M";
      } else if (val >= 1000) {
        return (val / 1000).toFixed(1) + "K";
      }
      return val.toLocaleString();
    }
    return val;
  };

  const getConsumptionStatus = (percentage?: number) => {
    if (!percentage) return { color: "text-foreground", status: "unknown" };
    
    if (percentage <= 80) {
      return { color: "text-secondary", status: "good" }; // Verde
    } else if (percentage <= 100) {
      return { color: "text-warning", status: "warning" }; // Amarelo
    } else {
      return { color: "text-destructive", status: "danger" }; // Vermelho
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-medium",
      variantStyles.card,
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground font-body">
            {title}
          </CardTitle>
          <div className={cn(
            "p-2 rounded-lg transition-all duration-200",
            variantStyles.icon
          )}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className={cn(
            "text-3xl font-bold font-heading tracking-tight",
            variantStyles.value
          )}>
            {formatValue(value)}
          </div>
          
          {subtitle && (
            <p className="text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}

          {contractedValue && consumptionPercentage !== undefined && (
            <div className="space-y-2 mt-3">
              <div className="text-sm text-muted-foreground">
                Valor contratado: {formatValue(contractedValue)}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${getConsumptionStatus(consumptionPercentage).color}`}>
                  {consumptionPercentage.toFixed(1)}% consumido
                </span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      getConsumptionStatus(consumptionPercentage).status === 'good' 
                        ? 'bg-secondary' 
                        : getConsumptionStatus(consumptionPercentage).status === 'warning'
                        ? 'bg-warning'
                        : 'bg-destructive'
                    }`}
                    style={{ width: `${Math.min(consumptionPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {trend && (
            <div className="flex items-center gap-2 mt-3">
              <Badge 
                variant={getTrendVariant(trend.direction)}
                className="text-xs px-2 py-1"
              >
                {trend.direction === "up" ? "↗" : trend.direction === "down" ? "↘" : "→"} 
                {Math.abs(trend.value)}%
              </Badge>
              <span className="text-xs text-muted-foreground">
                {trend.label}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}