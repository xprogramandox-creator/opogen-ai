import type { ReactNode } from "react";
import type { Metadata } from "next";

/**
 * Canonical explícito para las páginas con prefijo de idioma (portada).
 * La URL oficial de cada idioma es https://opogenai.com/<locale>.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    alternates: {
      canonical: `https://opogenai.com/${locale}`,
    },
  };
}

export default function LocaleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
