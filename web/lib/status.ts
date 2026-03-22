import type { DocumentStatus, UiDocumentStatus } from "@/types/api";

export function toUiStatus(status: DocumentStatus): UiDocumentStatus {
  if (status === "ready") return "completed";
  if (status === "failed" || status === "ocr_failed") return "failed";
  return "processing";
}

export function isTerminalStatus(status: DocumentStatus): boolean {
  return status === "ready" || status === "failed" || status === "ocr_failed";
}
