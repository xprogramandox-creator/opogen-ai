import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./arcade.css";

export const metadata: Metadata = {
  title: "Modo Arcade",
  description:
    "Juega y aprende con tus propios apuntes en el modo Arcade de OpoGen.",
};

type ArcadeLayoutProps = {
  children: ReactNode;
};

export default function ArcadeLayout({ children }: ArcadeLayoutProps) {
  return children;
}
