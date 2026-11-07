"use client";

import { useEffect } from "react";
import ErrorPantalla from "@/components/ErrorPantalla";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("[sitio/error]", error);
  }, [error]);

  return <ErrorPantalla error={error} />;
}
