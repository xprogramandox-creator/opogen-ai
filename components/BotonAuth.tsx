"use client";

import type { ReactNode } from "react";
import { useAuthModal, type ModoAuth, type PlanAuth } from "./AuthModalProvider";

type BotonAuthProps = {
  modo: ModoAuth;
  plan?: PlanAuth;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
};

export default function BotonAuth({
  modo,
  plan,
  className,
  children,
  ariaLabel,
}: BotonAuthProps) {
  const { abrirAuth } = useAuthModal();

  return (
    <button
      type="button"
      onClick={() => abrirAuth(modo, { plan })}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
