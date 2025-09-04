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
import DashboardDetailed from "./pages/DashboardDetailed";
import DashboardStarter from "./pages/DashboardStarter";
import DashboardEssential from "./pages/DashboardEssential";
import Analysis from "./pages/Analysis";
import Detalhamento from "./pages/Detalhamento";
import ConsumptionAssets from "./pages/ConsumptionAssets";
import ConsumptionProjects from "./pages/ConsumptionProjects";
import ConsumptionOrganizations from "./pages/ConsumptionOrganizations";
import ConsumptionJobs from "./pages/ConsumptionJobs";
import ConsumptionOverview from "./pages/ConsumptionOverview";

import Configuration from "./pages/Configuration";
import ConfigConnections from "./pages/ConfigConnections";
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
          <Route path="/dashboard-detailed" element={
            <ProtectedRoute>
              <AppLayout>
                <DashboardDetailed />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard-starter" element={
            <ProtectedRoute>
              <AppLayout>
                <DashboardStarter />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard-essential" element={
            <ProtectedRoute>
              <AppLayout>
                <DashboardEssential />
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
          <Route path="/detalhamento" element={
            <ProtectedRoute>
              <AppLayout>
                <Detalhamento />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/consumption" element={
            <ProtectedRoute>
              <ConsumptionOverview />
            </ProtectedRoute>
          } />
          <Route path="/consumption/assets" element={
            <ProtectedRoute>
              <ConsumptionAssets />
            </ProtectedRoute>
          } />
          <Route path="/consumption/projects" element={
            <ProtectedRoute>
              <ConsumptionProjects />
            </ProtectedRoute>
          } />
          <Route path="/consumption/organizations" element={
            <ProtectedRoute>
              <ConsumptionOrganizations />
            </ProtectedRoute>
          } />
          <Route path="/consumption/jobs" element={
            <ProtectedRoute>
              <ConsumptionJobs />
            </ProtectedRoute>
          } />
          <Route path="/config/connections" element={
            <ProtectedRoute>
              <ConfigConnections />
            </ProtectedRoute>
          } />
          {/* Legacy redirects */}
          <Route path="/config" element={<Navigate to="/config/connections" replace />} />
          <Route path="/configuration" element={<Navigate to="/config/connections" replace />} />
          
          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;