"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QuestionCard } from "@/components/question-card";
import { StatusBadge } from "@/components/status-badge";
import { fetchResults } from "@/lib/api";
import { toUiStatus } from "@/lib/status";

export default function ResultsPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = params.documentId;

  const query = useQuery({
    queryKey: ["results", documentId],
    queryFn: () => fetchResults(documentId),
    enabled: Boolean(documentId),
  });

  const data = query.data;

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
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {query.isError && (
        <Card className="border-destructive/40">
          <CardContent className="py-8 text-sm text-destructive">
            {(query.error as Error)?.message ?? "Failed to load results"}
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">{data.document.title}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={toUiStatus(data.document.status)} />
                <Button asChild variant="link" className="h-auto px-0 text-sm">
                  <Link href={`/documents/${data.document.id}`}>Document details</Link>
                </Button>
              </div>
            </div>
          </div>

          {data.questions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No solved questions yet. Processing may still be running.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {data.questions.map((q) => (
                <QuestionCard key={q.id} item={q} documentId={documentId} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
