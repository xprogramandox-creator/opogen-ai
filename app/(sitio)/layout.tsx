import type { ReactNode } from "react";
import InactivityGuard from "@/components/InactivityGuard";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import AnaliticaTracker from "@/components/AnaliticaTracker";

export default function SitioLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <AnaliticaTracker />
      <InactivityGuard />
      <SiteHeader showBrand />
      {children}
      <SiteFooter />
    </>
  );
}
