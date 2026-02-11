'use client';

import { ToastProvider } from '@/hooks/useToast';
import { JobsProvider } from '@/hooks/useJobs';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppSidebar from '@/components/layout/Sidebar';
import Toast from '@/components/ui/Toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <JobsProvider>
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <main className="flex-1 overflow-y-auto p-8">
                {children}
              </main>
            </SidebarInset>
            <Toast />
          </SidebarProvider>
        </TooltipProvider>
      </JobsProvider>
    </ToastProvider>
  );
}
