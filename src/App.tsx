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
import Analysis from "./pages/Analysis";
import ConsumptionAssets from "./pages/ConsumptionAssets";
import ConsumptionDetails from "./pages/ConsumptionDetails";
import Configuration from "./pages/Configuration";
import { AppLayout } from "./components/layout/AppLayout";
import { useAuth } from "./hooks/useAuth";
import { ProjectDetail } from "./components/consumption/ProjectDetail";
import { OrganizationDetail } from "./components/consumption/OrganizationDetail";
import { JobExecutionDetail } from "./components/consumption/JobExecutionDetail";

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
                <Analysis />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/consumption/assets" element={
            <ProtectedRoute>
              <ConsumptionDetails />
            </ProtectedRoute>
          } />
          <Route path="/consumption/projects" element={
            <ProtectedRoute>
              <AppLayout>
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h1 className="text-3xl font-bold">Por Projeto</h1>
                      <p className="text-muted-foreground">Agrupamento por projetos</p>
                    </div>
                  </div>
                  <ProjectDetail selectedOrg="" />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/consumption/organizations" element={
            <ProtectedRoute>
              <AppLayout>
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h1 className="text-3xl font-bold">Por Organização</h1>
                      <p className="text-muted-foreground">Visão organizacional</p>
                    </div>
                  </div>
                  <OrganizationDetail selectedOrg="" />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/consumption/jobs" element={
            <ProtectedRoute>
              <AppLayout>
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h1 className="text-3xl font-bold">Execução de Jobs</h1>
                      <p className="text-muted-foreground">Detalhes de execução</p>
                    </div>
                  </div>
                  <JobExecutionDetail selectedOrg="" />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/config" element={
            <ProtectedRoute>
              <Configuration />
            </ProtectedRoute>
          } />
          <Route path="/config/*" element={
            <ProtectedRoute>
              <Configuration />
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
