import { cva, type VariantProps } from "class-variance-authority";
import type { UiDocumentStatus } from "@/types/api";
import { cn } from "@/lib/utils";

const statusVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        processing: "border-amber-500/30 bg-amber-500/10 text-amber-900 ring-amber-500/20 dark:text-amber-100",
        completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 ring-emerald-500/20 dark:text-emerald-100",
        failed: "border-rose-500/30 bg-rose-500/10 text-rose-900 ring-rose-500/20 dark:text-rose-100",
      },
    },
    defaultVariants: {
      variant: "processing",
    },
  },
);

export type StatusBadgeProps = {
  status: UiDocumentStatus;
  className?: string;
} & VariantProps<typeof statusVariants>;

const labels: Record<UiDocumentStatus, string> = {
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusVariants({ variant: status }), className)}>{labels[status]}</span>
  );
}
