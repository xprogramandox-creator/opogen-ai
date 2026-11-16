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
      <Sidebar />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <SiteHeader showBrand conSidebar />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    </SidebarProvider>
  );
}
