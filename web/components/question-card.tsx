"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ExplanationPanel } from "@/components/explanation-panel";
import { reevaluateQuestion } from "@/lib/api";
import {
  confidenceClasses,
  confidenceLevel,
  parseConfidence,
} from "@/lib/confidence";
import { cn } from "@/lib/utils";
import type { ResultsPayload } from "@/types/api";

type QuestionRow = ResultsPayload["questions"][number];

export function QuestionCard({ item, documentId }: { item: QuestionRow; documentId: string }) {
  const qc = useQueryClient();
  const ai = item.aiAnswer;
  const correct = item.correctAnswer;

  const reeval = useMutation({
    mutationFn: () => reevaluateQuestion(item.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["results", documentId] });
    },
  });

  const aiScore = parseConfidence(ai?.confidenceScore ?? null);
  const level = aiScore !== null ? confidenceLevel(aiScore) : "medium";

  return (
    <Card className="overflow-hidden border-border/80">
      <CardHeader className="space-y-2 border-b border-border/60 bg-muted/20 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm font-medium leading-relaxed text-foreground">{item.text}</p>
          {aiScore !== null && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                confidenceClasses(level),
              )}
              title="Model confidence"
            >
              {(aiScore * 100).toFixed(0)}% confidence
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {(["A", "B", "C", "D"] as const).map((key) => {
            const isCorrectKey = correct === key;
            const isAi = ai?.selectedOption === key;
            return (
              <div
                key={key}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm transition-colors",
                  isCorrectKey && "border-emerald-500/50 bg-emerald-500/10",
                  !isCorrectKey && isAi && "border-primary/40 bg-primary/5",
                  !isCorrectKey && !isAi && "border-border bg-background",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{key}.</span>
                  {isCorrectKey && (
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      Correct
                    </span>
                  )}
                  {!isCorrectKey && isAi && (
                    <span className="text-xs font-medium text-muted-foreground">AI pick</span>
                  )}
                </div>
                <p className="mt-1 text-muted-foreground">{item.options[key]}</p>
              </div>
            );
          })}
        </div>

        {(item.explanation || ai?.explanation) && (
          <ExplanationPanel title="Explanation" defaultOpen={false}>
            {item.explanation ?? ai?.explanation ?? ""}
          </ExplanationPanel>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-2"
            disabled={reeval.isPending}
            onClick={() => reeval.mutate()}
          >
            <RefreshCw className={cn("h-4 w-4", reeval.isPending && "animate-spin")} />
            Re-evaluate
          </Button>
          {ai?.validationNotes && (
            <p className="text-xs text-muted-foreground">{ai.validationNotes}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
