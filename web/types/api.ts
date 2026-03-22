export type DocumentStatus =
  | "pending"
  | "ocr_processing"
  | "ocr_failed"
  | "parsing"
  | "solving"
  | "ready"
  | "failed";

export type UiDocumentStatus = "processing" | "completed" | "failed";

export type DocumentListItem = {
  id: string;
  title: string;
  status: DocumentStatus;
  kind: "pdf" | "image";
  mimeType: string;
  externalUrl: string;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type McqQuestion = {
  id: string;
  documentId: string;
  text: string;
  options: Record<"A" | "B" | "C" | "D", string>;
  correctAnswer: "A" | "B" | "C" | "D" | null;
  explanation: string | null;
  confidenceScore: number | string | null;
  answers?: AiAnswer[];
  createdAt: string;
  updatedAt: string;
};

export type AiAnswer = {
  id: string;
  selectedOption: "A" | "B" | "C" | "D";
  confidenceScore: number | string;
  explanation: string | null;
  validated: boolean;
  validationNotes: string | null;
};

export type ResultsPayload = {
  document: {
    id: string;
    title: string;
    status: DocumentStatus;
    kind: "pdf" | "image";
    mimeType: string;
    externalUrl: string;
    pdfUrl: string | null;
    ocrText: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
  };
  questions: Array<{
    id: string;
    text: string;
    options: Record<"A" | "B" | "C" | "D", string>;
    correctAnswer: "A" | "B" | "C" | "D" | null;
    explanation: string | null;
    confidenceScore: number | string | null;
    aiAnswer: AiAnswer | null;
  }>;
};

export type LoginResponse = {
  token: string;
  user: { id: string; email: string; role: string };
};

export type RegisterResponse = {
  token: string;
  user: { id: string; email: string; role: string };
  tenant: { id: string; name: string; slug: string };
};
