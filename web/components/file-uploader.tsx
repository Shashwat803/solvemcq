"use client";

import * as React from "react";
import { UploadCloud } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

export type UploadPayload = {
  file: File;
  title: string;
  externalUrl: string;
  mimeType: string;
  kind: "pdf" | "image";
};

type Props = {
  onUploaded: (payload: UploadPayload) => Promise<void>;
  disabled?: boolean;
  className?: string;
};

function isAllowed(file: File): boolean {
  if (file.type === "application/pdf") return true;
  if (file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/webp")
    return true;
  return false;
}

export function FileUploader({ onUploaded, disabled, className }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  async function handleFile(file: File) {
    setError(null);
    if (!isAllowed(file)) {
      setError("Only PDF or image files (PNG, JPG, WebP) are allowed.");
      return;
    }
    setBusy(true);
    setProgress(0);

    const timer = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 95) {
          window.clearInterval(timer);
          return 95;
        }
        return p + 7;
      });
    }, 120);

    try {
      const externalUrl = `https://storage.mock/uploads/${crypto.randomUUID()}/${encodeURIComponent(file.name)}`;
      const kind: "pdf" | "image" = file.type === "application/pdf" ? "pdf" : "image";
      await new Promise((r) => setTimeout(r, 900));
      setProgress(100);
      await onUploaded({
        file,
        title: file.name,
        externalUrl,
        mimeType: file.type,
        kind,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      window.clearInterval(timer);
      setBusy(false);
      setProgress(0);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onClick={() => !disabled && !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled || busy) return;
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center transition-colors",
          dragOver && "border-primary/50 bg-muted/40",
          (disabled || busy) && "pointer-events-none opacity-60",
        )}
      >
        <UploadCloud className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Drop a file here, or click to browse</p>
        <p className="mt-1 text-xs text-muted-foreground">PDF, PNG, JPG, WebP · max ~25MB (client-side validation)</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          disabled={disabled || busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {busy && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
