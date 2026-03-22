"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploader } from "@/components/file-uploader";
import { uploadDocumentMeta } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();
  const [done, setDone] = React.useState(false);

  const mutation = useMutation({
    mutationFn: uploadDocumentMeta,
    onSuccess: () => {
      setDone(true);
      router.replace("/dashboard");
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 px-0 text-muted-foreground">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload paper</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag and drop a PDF or image. We simulate storage, then register metadata with your API.
        </p>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base">File</CardTitle>
          <CardDescription>Accepted: PDF, PNG, JPG, WebP</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploader
            disabled={mutation.isPending || done}
            onUploaded={async (payload) => {
              await mutation.mutateAsync({
                title: payload.title,
                externalUrl: payload.externalUrl,
                mimeType: payload.mimeType,
                kind: payload.kind,
                metadata: { originalName: payload.file.name, size: payload.file.size },
                file: payload.file,
              });
            }}
          />
          {mutation.isError && (
            <p className="mt-3 text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : "Upload failed"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
