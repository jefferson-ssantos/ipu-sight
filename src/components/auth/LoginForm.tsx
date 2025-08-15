import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // TODO: Implement actual authentication with Supabase
    setTimeout(() => {
      toast({
        title: "Login necessário",
        description: "Configure o Supabase para habilitar autenticação",
        variant: "destructive"
      });
      setIsLoading(false);
    }, 1000);
  };

  return (
    <Card className="w-full max-w-md bg-gradient-card shadow-strong border-0">
      <CardHeader className="text-center pb-6">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
            <TrendingUp className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <CardTitle className="text-2xl font-heading font-bold text-foreground">
          IPU-Sight
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Acesse sua plataforma de FinOps IDMC
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu.email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 transition-all duration-200 focus:shadow-glow"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pr-12 transition-all duration-200 focus:shadow-glow"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-secondary hover:bg-secondary/90 
                     shadow-medium hover:shadow-strong transition-all duration-300 
                     font-medium text-secondary-foreground"
            disabled={isLoading}
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <Button variant="link" className="p-0 h-auto text-primary hover:text-primary-light">
              Solicite acesso
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}