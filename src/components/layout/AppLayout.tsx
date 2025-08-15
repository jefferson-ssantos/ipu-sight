import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Bell, Search, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <header className="h-16 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="flex items-center justify-between h-full px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-9 w-9" />
                
                <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                  <span>FinOps</span>
                  <span>/</span>
                  <span className="text-foreground font-medium">Dashboard</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <Search className="h-4 w-4" />
                </Button>

                {/* Notifications */}
                <div className="relative">
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <Bell className="h-4 w-4" />
                  </Button>
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-cost-high">
                    3
                  </Badge>
                </div>

                {/* User Menu */}
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <User className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}