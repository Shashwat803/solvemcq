"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { decodeJwtPayload, getStoredToken, setStoredToken } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function Navbar({ className }: { className?: string }) {
  const router = useRouter();
  const token = getStoredToken();
  const payload = token ? decodeJwtPayload(token) : null;
  const tenantLabel = payload?.tenantId ?? "Unknown tenant";

  function logout() {
    setStoredToken(null);
    router.replace("/login");
    router.refresh();
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-foreground">
            SolveMCQ
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/upload" className="hover:text-foreground">
              Upload
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="hidden max-w-[220px] truncate rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground sm:inline"
            title={tenantLabel}
          >
            Tenant: {tenantLabel}
          </span>
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={logout} className="gap-1.5">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
