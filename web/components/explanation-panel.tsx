"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

export function ExplanationPanel({
  title = "Explanation",
  children,
  defaultOpen = false,
  className,
}: Props) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("rounded-lg border border-border", className)}>
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted/50">
        <span>{title}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border bg-muted/20 px-3 py-3 text-sm leading-relaxed text-muted-foreground">
        <div className="max-w-none whitespace-pre-wrap">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
