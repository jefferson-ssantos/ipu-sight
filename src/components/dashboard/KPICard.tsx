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
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className
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