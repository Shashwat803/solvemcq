"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { fetchDocuments, retryDocument } from "@/lib/api";
import { toUiStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const query = useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocuments,
  });

  const retry = useMutation({
    mutationFn: (id: string) => retryDocument(id),
    onSuccess: async () => {
      await query.refetch();
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Uploads and processing status for your tenant.
          </p>
        </div>
        <Button asChild className="gap-2 self-start sm:self-auto">
          <Link href="/upload">
            <Plus className="h-4 w-4" />
            Upload New
          </Link>
        </Button>
      </div>

      {query.isLoading && (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {query.isError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Could not load documents</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {(query.error as Error)?.message ?? "Unknown error"}
            <div className="mt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()}>
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {query.isSuccess && query.data.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">No documents yet.</p>
            <Button asChild size="sm">
              <Link href="/upload">Upload your first paper</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {query.isSuccess && query.data.length > 0 && (
        <div className="grid gap-3">
          {query.data.map((doc) => {
            const ui = toUiStatus(doc.status);
            return (
              <Card key={doc.id} className="overflow-hidden border-border/80 transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="truncate font-medium text-foreground hover:underline"
                      >
                        {doc.title}
                      </Link>
                      <StatusBadge status={ui} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created{" "}
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(doc.createdAt))}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/results/${doc.id}`}>View results</Link>
                    </Button>
                    {ui === "failed" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={retry.isPending}
                        onClick={() => retry.mutate(doc.id)}
                      >
                        <RefreshCw className={cn("h-4 w-4", retry.isPending && "animate-spin")} />
                        Retry
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
