"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth";

export function AuthHydrate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void useAuthStore.persist.rehydrate();
  }, []);

  return <>{children}</>;
}
