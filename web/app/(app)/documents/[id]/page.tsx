"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { fetchDocument } from "@/lib/api";
import { isTerminalStatus, toUiStatus } from "@/lib/status";

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const query = useQuery({
    queryKey: ["document", id],
    queryFn: () => fetchDocument(id),
    enabled: Boolean(id),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      if (!s) return 5000;
      return isTerminalStatus(s) ? false : 5000;
    },
  });

  const doc = query.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 px-0 text-muted-foreground">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>

      {query.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {query.isError && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Unable to load document</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {(query.error as Error)?.message}
          </CardContent>
        </Card>
      )}

      {doc && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <StatusBadge status={toUiStatus(doc.status)} />
                <span className="rounded-md border border-border px-2 py-0.5 text-xs uppercase">
                  {doc.kind}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href={`/results/${doc.id}`}>Open results</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-1">
                <a href={doc.externalUrl} target="_blank" rel="noreferrer">
                  Source
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-base">Processing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Status updates every few seconds while work is in progress. Current pipeline state:{" "}
                <span className="font-mono text-xs text-foreground">{doc.status}</span>
              </p>
              {!isTerminalStatus(doc.status) && (
                <p className="text-xs">Polling… next refresh in ~5s.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
