import axios from "axios";
import { decodeJwtPayload, getStoredToken } from "@/lib/auth";
import { mockRequest } from "@/lib/mock-api";
import type {
  DocumentListItem,
  LoginResponse,
  McqQuestion,
  RegisterResponse,
  ResultsPayload,
} from "@/types/api";

const useMock = () => process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const apiClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    const payload = decodeJwtPayload(token);
    if (payload?.tenantId) {
      config.headers["X-Tenant-Id"] = payload.tenantId;
    }
  }
  return config;
});

async function get<T>(path: string): Promise<T> {
  if (useMock()) return mockRequest<T>("GET", path);
  const { data } = await apiClient.get<T>(path);
  return data;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  if (useMock()) return mockRequest<T>("POST", path, body);
  const { data } = await apiClient.post<T>(path, body);
  return data;
}

export async function login(body: {
  tenantSlug: string;
  email: string;
  password: string;
}): Promise<LoginResponse> {
  return post<LoginResponse>("/auth/login", body);
}

export async function register(body: {
  tenantName: string;
  tenantSlug: string;
  email: string;
  password: string;
}): Promise<RegisterResponse> {
  return post<RegisterResponse>("/auth/register", body);
}

export async function fetchDocuments(): Promise<DocumentListItem[]> {
  return get<DocumentListItem[]>("/documents");
}

export async function fetchDocument(id: string): Promise<DocumentListItem> {
  if (useMock()) {
    return get<DocumentListItem>(`/documents/${id}`);
  }
  const all = await fetchDocuments();
  const found = all.find((d) => d.id === id);
  if (!found) {
    throw new Error("Document not found");
  }
  return found;
}

export async function fetchQuestions(documentId: string): Promise<McqQuestion[]> {
  return get<McqQuestion[]>(`/documents/${documentId}/questions`);
}

export async function fetchResults(documentId: string): Promise<ResultsPayload> {
  return get<ResultsPayload>(`/results/${documentId}`);
}

export async function uploadDocumentMeta(body: {
  title: string;
  externalUrl: string;
  mimeType: string;
  kind: "pdf" | "image";
  metadata?: Record<string, unknown>;
  file?: File;
}): Promise<{
  id: string;
  title: string;
  status: string;
  externalUrl: string;
  mimeType: string;
  kind: string;
  createdAt: string;
}> {
  if (useMock()) return post("/upload-document", body);

  const formData = new FormData();
  if (body.file) {
    formData.append("file", body.file);
  }
  formData.append("title", body.title);
  formData.append("externalUrl", body.externalUrl);
  formData.append("mimeType", body.mimeType);
  formData.append("kind", body.kind);
  if (body.metadata) {
    formData.append("metadata", JSON.stringify(body.metadata));
  }

  const { data } = await apiClient.post("/upload-document", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function retryDocument(documentId: string): Promise<{ ok: boolean }> {
  return post(`/documents/${documentId}/retry`);
}

export async function reevaluateQuestion(questionId: string): Promise<{ ok: boolean }> {
  return post(`/questions/${questionId}/reevaluate`, {});
}
