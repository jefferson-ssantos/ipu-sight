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
import { usePermissions } from "./hooks/usePermissions";

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

function PermissionRoute({ 
  children, 
  permission 
}: { 
  children: React.ReactNode;
  permission: keyof import('./hooks/usePermissions').PermissionConfig;
}) {
  const { permissions, loading, getDefaultDashboard } = usePermissions();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Carregando permissões...</div>
    </div>;
  }
  
  if (!permissions || !permissions[permission]) {
    return <Navigate to={getDefaultDashboard()} replace />;
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
              <PermissionRoute permission="canAccessDashboard">
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </PermissionRoute>
            </ProtectedRoute>
          } />
          <Route path="/dashboard-detailed" element={
            <ProtectedRoute>
              <PermissionRoute permission="canAccessDashboard">
                <AppLayout>
                  <DashboardDetailed />
                </AppLayout>
              </PermissionRoute>
            </ProtectedRoute>
          } />
          <Route path="/dashboard-starter" element={
            <ProtectedRoute>
              <PermissionRoute permission="canAccessDashboardStarter">
                <AppLayout>
                  <DashboardStarter />
                </AppLayout>
              </PermissionRoute>
            </ProtectedRoute>
          } />
          <Route path="/dashboard-essential" element={
            <ProtectedRoute>
              <PermissionRoute permission="canAccessDashboardEssential">
                <AppLayout>
                  <DashboardEssential />
                </AppLayout>
              </PermissionRoute>
            </ProtectedRoute>
          } />
          <Route path="/analysis" element={
            <ProtectedRoute>
              <PermissionRoute permission="canAccessAnalysis">
                <AppLayout>
                  <Analysis />
                </AppLayout>
              </PermissionRoute>
            </ProtectedRoute>
          } />
          <Route path="/detalhamento" element={
            <ProtectedRoute>
              <PermissionRoute permission="canAccessDetalhamento">
                <AppLayout>
                  <Detalhamento />
                </AppLayout>
              </PermissionRoute>
            </ProtectedRoute>
          } />
          <Route path="/consumption" element={
            <ProtectedRoute>
              <PermissionRoute permission="canAccessConsumption">
                <ConsumptionOverview />
              </PermissionRoute>
            </ProtectedRoute>
          } />
          <Route path="/consumption/assets" element={
            <ProtectedRoute>
              <PermissionRoute permission="canAccessConsumption">
                <ConsumptionAssets />
              </PermissionRoute>
            </ProtectedRoute>
          } />
          <Route path="/consumption/projects" element={
            <ProtectedRoute>
              <PermissionRoute permission="canAccessConsumption">
                <ConsumptionProjects />
              </PermissionRoute>
            </ProtectedRoute>
          } />
          <Route path="/consumption/organizations" element={
            <ProtectedRoute>
              <PermissionRoute permission="canAccessConsumption">
                <ConsumptionOrganizations />
              </PermissionRoute>
            </ProtectedRoute>
          } />
          <Route path="/consumption/jobs" element={
            <ProtectedRoute>
              <PermissionRoute permission="canAccessConsumption">
                <ConsumptionJobs />
              </PermissionRoute>
            </ProtectedRoute>
          } />
          <Route path="/config/connections" element={
            <ProtectedRoute>
              <PermissionRoute permission="canAccessConfiguration">
                <ConfigConnections />
              </PermissionRoute>
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