import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { SessionProvider } from "@/components/SessionProvider";
import { AuthModalProvider } from "@/components/AuthModalProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NotificationProvider } from "@/components/NotificationProvider";
import SincronizarTemaCookie from "@/components/SincronizarTemaCookie";
import RegistrarUsoZona from "@/components/RegistrarUsoZona";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OpoGen AI | Exámenes tipo test con tus apuntes",
    template: "%s | OpoGen AI",
  },
  description:
    "Sube tus apuntes y genera exámenes tipo test personalizados para oposiciones, bachillerato, universidad y secundaria.",
  applicationName: "OpoGen AI",
  keywords: [
    "exámenes",
    "test",
    "apuntes",
    "inteligencia artificial",
    "oposiciones",
    "estudio",
  ],
  authors: [
    {
      name: "OpoGen AI",
    },
  ],
  icons: {
    icon: "/opogen-logo-nuevo.png",
    shortcut: "/opogen-logo-nuevo.png",
    apple: "/opogen-logo-nuevo.png",
  },
  openGraph: {
    title: "OpoGen AI",
    description:
      "Convierte tus apuntes en exámenes personalizados en segundos.",
    type: "website",
    locale: "es_ES",
    siteName: "OpoGen AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpoGen AI",
    description:
      "Convierte tus apuntes en exámenes personalizados en segundos.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export const instant = false;

type RootLayoutProps = {
  children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const locale = await getLocale();
  const messages = await getMessages();
  const cookieStore = await cookies();
  const temaInicial =
    cookieStore.get("opoquiz-tema")?.value === "oscuro"
      ? "oscuro"
      : "claro";

  return (
    <html
      lang={locale}
      data-tema={temaInicial}
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased bg-transparent`}
      suppressHydrationWarning
    >
      <body className="relative min-h-full bg-transparent text-[var(--txt)]">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="data-tema"
            defaultTheme={temaInicial}
            enableSystem={false}
          >
            <SincronizarTemaCookie />
            <RegistrarUsoZona />
            <div className="relative z-10">
              <NotificationProvider>
                <SessionProvider>
                  <AuthModalProvider>
                    {children}
                  </AuthModalProvider>
                </SessionProvider>
              </NotificationProvider>
            </div>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
