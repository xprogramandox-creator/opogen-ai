import type { ReactNode } from "react";
import InactivityGuard from "@/components/InactivityGuard";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider } from "@/components/SidebarProvider";
import AnaliticaTracker from "@/components/AnaliticaTracker";

export default function SitioLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <AnaliticaTracker />
      <InactivityGuard />
      <SiteHeader showBrand conSidebar />
      <Sidebar />
      <div className="flex min-h-[calc(100vh-72px)] flex-col lg:pl-64">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    </SidebarProvider>
  );
}
