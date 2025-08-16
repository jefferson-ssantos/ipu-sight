import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "@/hooks/useDashboardData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ArrowUpDown, Download } from "lucide-react";

export function OrganizationComparison() {
  const { data, loading } = useDashboardData();
  const [metric, setMetric] = useState("ipu");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatIPU = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const chartData = data?.organizations
    ?.map(org => ({
      name: org.org_name,
      ipu: org.consumption_ipu,
      cost: org.cost,
      percentage: org.percentage
    }))
    .sort((a, b) => {
      const aValue = metric === 'cost' ? a.cost : a.ipu;
      const bValue = metric === 'cost' ? b.cost : b.ipu;
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    }) || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-primary">
            IPUs: {formatIPU(data.ipu)}
          </p>
          <p className="text-secondary-foreground">
            Custo: {formatCurrency(data.cost)}
          </p>
          <p className="text-muted-foreground">
            {data.percentage.toFixed(1)}% do total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Comparação por Organização</CardTitle>
          
          <div className="flex items-center gap-4">
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ipu">IPUs</SelectItem>
                <SelectItem value="cost">Custo</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {sortOrder === 'desc' ? 'Maior > Menor' : 'Menor > Maior'}
            </Button>

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(value) => 
                    metric === 'cost' ? formatCurrency(value) : formatIPU(value)
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey={metric} 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  name={metric === 'cost' ? 'Custo Total' : 'IPUs Consumidas'}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Organization Rankings */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Organizações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {chartData.slice(0, 5).map((org, index) => (
              <div key={org.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Badge variant={index === 0 ? "default" : "secondary"}>
                    {index + 1}º
                  </Badge>
                  <div>
                    <div className="font-medium">{org.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {org.percentage.toFixed(1)}% do total
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-semibold">
                    {metric === 'cost' ? formatCurrency(org.cost) : `${formatIPU(org.ipu)} IPUs`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {metric === 'cost' ? `${formatIPU(org.ipu)} IPUs` : formatCurrency(org.cost)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}