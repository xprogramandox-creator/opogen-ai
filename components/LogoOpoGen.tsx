"use client";

import Image from "next/image";
import { useState } from "react";
import logoOpoGen from "@/public/opogen-logo-nuevo.png";

export default function LogoOpoGen() {
  const [fallo, setFallo] = useState(false);

  if (fallo) {
    return (
      <span
        aria-label="OpoGen AI"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-xl font-black text-[var(--azul)] shadow-sm sm:h-16 sm:w-16 sm:text-2xl"
      >
        O
      </span>
    );
  }

  return (
    <Image
      src={logoOpoGen}
      alt="OpoGen AI"
      priority
      sizes="(max-width: 640px) 96px, 180px"
      className="h-12 w-auto max-w-[180px] shrink-0 rounded-lg bg-white object-contain shadow-sm sm:h-16"
      onError={() => setFallo(true)}
    />
  );
}
