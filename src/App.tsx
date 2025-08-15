import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import { AppLayout } from "./components/layout/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected Routes with Layout */}
          <Route path="/dashboard" element={
            <AppLayout>
              <Dashboard />
            </AppLayout>
          } />
          <Route path="/analysis" element={
            <AppLayout>
              <div className="p-6">
                <h1 className="text-2xl font-bold">Análise de Custos</h1>
                <p className="text-muted-foreground mt-2">Em desenvolvimento...</p>
              </div>
            </AppLayout>
          } />
          <Route path="/consumption/*" element={
            <AppLayout>
              <div className="p-6">
                <h1 className="text-2xl font-bold">Detalhamento de Consumo</h1>
                <p className="text-muted-foreground mt-2">Em desenvolvimento...</p>
              </div>
            </AppLayout>
          } />
          <Route path="/config/*" element={
            <AppLayout>
              <div className="p-6">
                <h1 className="text-2xl font-bold">Configurações</h1>
                <p className="text-muted-foreground mt-2">Em desenvolvimento...</p>
              </div>
            </AppLayout>
          } />
          
          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
