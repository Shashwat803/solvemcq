"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getStoredToken } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();

  React.useEffect(() => {
    const token = getStoredToken();
    router.replace(token ? "/dashboard" : "/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Redirecting…
    </div>
  );
}
