import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
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

export const metadata: Metadata = {
  title: {
    default: "OpoQuiz AI | Exámenes tipo test con tus apuntes",
    template: "%s | OpoQuiz AI",
  },
  description:
    "Sube tus apuntes y genera exámenes tipo test personalizados para oposiciones, bachillerato, universidad y secundaria.",
  applicationName: "OpoQuiz AI",
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
      name: "OpoQuiz AI",
    },
  ],
  openGraph: {
    title: "OpoQuiz AI",
    description:
      "Convierte tus apuntes en exámenes personalizados en segundos.",
    type: "website",
    locale: "es_ES",
    siteName: "OpoQuiz AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpoQuiz AI",
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

// Se ejecuta antes de mostrar el contenido de la página.
// Así el tema guardado se aplica sin un parpadeo visual.
const TEMA_INICIAL = `
(function () {
  try {
    var tema = localStorage.getItem("opoquiz-tema");

    if (tema !== "claro" && tema !== "oscuro") {
      tema = (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      )
        ? "oscuro"
        : "claro";
    }

    document.documentElement.setAttribute("data-tema", tema);
  } catch (error) {
    document.documentElement.setAttribute("data-tema", "claro");
  }
})();
`;

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="es"
      data-tema="claro"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[var(--fondo)] text-[var(--txt)]">
        <script dangerouslySetInnerHTML={{ __html: TEMA_INICIAL }} />
        {children}
      </body>
    </html>
  );
}
