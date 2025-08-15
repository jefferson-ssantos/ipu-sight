import { LoginForm } from "@/components/auth/LoginForm";
import { TrendingUp, BarChart3, PieChart, Building2 } from "lucide-react";
import orysLogo from "@/assets/orys-logo.png";

export default function Auth() {
  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMS41Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
      
      <div className="w-full max-w-6xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding */}
          <div className="text-primary-foreground space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <img src={orysLogo} alt="Orys Logo" className="h-16" />
                <div>
                  <h1 className="text-4xl font-heading font-bold">IPU-Sight</h1>
                  <p className="text-primary-foreground/80 text-lg">FinOps Dashboard</p>
                </div>
              </div>

              <h2 className="text-3xl lg:text-4xl font-heading font-bold leading-tight">
                Monitore e otimize seus custos{" "}
                <span className="text-yellow-300">IDMC</span> com precisão
              </h2>

              <p className="text-xl text-primary-foreground/80 leading-relaxed">
                Plataforma completa de FinOps para análise de consumo de IPUs,
                gestão de custos e otimização de recursos IDMC.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg backdrop-blur-sm">
                <BarChart3 className="h-8 w-8 text-yellow-300 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Análise em Tempo Real</h3>
                  <p className="text-sm text-primary-foreground/70">
                    Monitore custos instantaneamente
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg backdrop-blur-sm">
                <PieChart className="h-8 w-8 text-green-300 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Visões Hierárquicas</h3>
                  <p className="text-sm text-primary-foreground/70">
                    Do resumo ao detalhe por asset
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg backdrop-blur-sm">
                <Building2 className="h-8 w-8 text-blue-300 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Multi-Organização</h3>
                  <p className="text-sm text-primary-foreground/70">
                    Gerencie múltiplas ORGs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg backdrop-blur-sm">
                <TrendingUp className="h-8 w-8 text-purple-300 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Otimização</h3>
                  <p className="text-sm text-primary-foreground/70">
                    Tags e categorização avançada
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-300">99.9%</div>
                <div className="text-sm text-primary-foreground/70">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-300">500M+</div>
                <div className="text-sm text-primary-foreground/70">IPUs Monitorados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-300">24/7</div>
                <div className="text-sm text-primary-foreground/70">Monitoramento</div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="flex justify-center lg:justify-end">
            <LoginForm />
          </div>
        </div>

        {/* Bottom Notice */}
        <div className="text-center mt-12 text-primary-foreground/60 text-sm">
          <p>
            Conecte-se ao Supabase para acessar dados reais de consumo IDMC
          </p>
        </div>
      </div>
    </div>
  );
}