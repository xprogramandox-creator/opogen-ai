import type { ReactNode } from "react";
import InactivityGuard from "@/components/InactivityGuard";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export default function SitioLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <InactivityGuard />
      <SiteHeader showBrand />
      {children}
      <SiteFooter />
    </>
  );
}
