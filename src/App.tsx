import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import { AppLayout } from "./components/layout/AppLayout";
import { useAuth } from "./hooks/useAuth";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Carregando...</div>
    </div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Carregando...</div>
    </div>;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<AuthRoute><Auth /></AuthRoute>} />
          <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
          
          {/* Protected Routes with Layout */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/analysis" element={
            <ProtectedRoute>
              <AppLayout>
                <div className="p-6">
                  <h1 className="text-2xl font-bold">Análise de Custos</h1>
                  <p className="text-muted-foreground mt-2">Em desenvolvimento...</p>
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/consumption/*" element={
            <ProtectedRoute>
              <AppLayout>
                <div className="p-6">
                  <h1 className="text-2xl font-bold">Detalhamento de Consumo</h1>
                  <p className="text-muted-foreground mt-2">Em desenvolvimento...</p>
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/config/*" element={
            <ProtectedRoute>
              <AppLayout>
                <div className="p-6">
                  <h1 className="text-2xl font-bold">Configurações</h1>
                  <p className="text-muted-foreground mt-2">Em desenvolvimento...</p>
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />
          
          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
