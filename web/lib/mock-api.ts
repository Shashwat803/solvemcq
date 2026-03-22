import type {
  DocumentListItem,
  DocumentStatus,
  McqQuestion,
  ResultsPayload,
} from "@/types/api";

let mockDocs: DocumentListItem[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    title: "Sample Physics Midterm.pdf",
    status: "ready",
    kind: "pdf",
    mimeType: "application/pdf",
    externalUrl: "https://example.com/files/sample.pdf",
    pdfUrl: "https://example.com/out/sample.pdf",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    title: "Chemistry Quiz.png",
    status: "solving",
    kind: "image",
    mimeType: "image/png",
    externalUrl: "https://example.com/files/quiz.png",
    pdfUrl: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    title: "Failed Upload.pdf",
    status: "failed",
    kind: "pdf",
    mimeType: "application/pdf",
    externalUrl: "https://example.com/files/bad.pdf",
    pdfUrl: null,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockQuestions: Record<string, McqQuestion[]> = {
  "11111111-1111-1111-1111-111111111111": [
    {
      id: "q1",
      documentId: "11111111-1111-1111-1111-111111111111",
      text: "What is the acceleration due to gravity on Earth (approx.)?",
      options: {
        A: "8.9 m/s²",
        B: "9.8 m/s²",
        C: "10.2 m/s²",
        D: "11.0 m/s²",
      },
      correctAnswer: "B",
      explanation: "Standard gravity is about 9.80665 m/s²; 9.8 m/s² is the common textbook value.",
      confidenceScore: 0.94,
      answers: [
        {
          id: "a1",
          selectedOption: "B",
          confidenceScore: 0.91,
          explanation: "The model selects B based on typical physics constants.",
          validated: true,
          validationNotes: "Matches documented correct answer.",
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

function resultsForDocument(docId: string): ResultsPayload {
  const doc = mockDocs.find((d) => d.id === docId);
  if (!doc) {
    throw new Error("Not found");
  }
  const qs = mockQuestions[docId] ?? [];
  return {
    document: {
      id: doc.id,
      title: doc.title,
      status: doc.status,
      kind: doc.kind,
      mimeType: doc.mimeType,
      externalUrl: doc.externalUrl,
      pdfUrl: doc.pdfUrl,
      ocrText: "Mock OCR text…",
      metadata: {},
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    },
    questions: qs.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      confidenceScore: q.confidenceScore,
      aiAnswer: q.answers?.[0]
        ? {
            id: q.answers[0].id,
            selectedOption: q.answers[0].selectedOption,
            confidenceScore: q.answers[0].confidenceScore,
            explanation: q.answers[0].explanation,
            validated: q.answers[0].validated,
            validationNotes: q.answers[0].validationNotes,
          }
        : null,
    })),
  };
}

export async function mockRequest<T>(
  method: string,
  url: string,
  data?: unknown,
): Promise<T> {
  await delay(200 + Math.random() * 200);

  if (url === "/auth/register" && method === "POST") {
    const body = data as {
      tenantName?: string;
      tenantSlug?: string;
      email?: string;
      password?: string;
    };
    if (!body?.tenantName || !body?.tenantSlug || !body?.email || !body?.password) {
      throw new Error("Please fill in all fields");
    }
    if (body.password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }
    if (body.tenantSlug === "taken") {
      throw new Error("Tenant slug already in use");
    }
    return {
      token: makeMockJwt(body.tenantSlug),
      user: { id: crypto.randomUUID(), email: body.email, role: "admin" },
      tenant: {
        id: crypto.randomUUID(),
        name: body.tenantName,
        slug: body.tenantSlug,
      },
    } as T;
  }

  if (url === "/auth/login" && method === "POST") {
    const body = data as { tenantSlug?: string; email?: string; password?: string };
    if (!body?.email || !body?.password || !body?.tenantSlug) {
      throw new Error("Invalid credentials");
    }
    return {
      token: makeMockJwt(body.tenantSlug),
      user: { id: "user-mock", email: body.email, role: "admin" },
    } as T;
  }

  if (url === "/documents" && method === "GET") {
    return [...mockDocs] as T;
  }

  if (
    method === "GET" &&
    url.startsWith("/documents/") &&
    !url.includes("/questions") &&
    !url.includes("/retry")
  ) {
    const id = url.replace("/documents/", "");
    const doc = mockDocs.find((d) => d.id === id);
    if (!doc) throw new Error("Not found");
    return doc as T;
  }

  if (url.startsWith("/documents/") && url.endsWith("/questions")) {
    const id = url.replace("/documents/", "").replace("/questions", "");
    return (mockQuestions[id] ?? []) as T;
  }

  if (url.startsWith("/results/")) {
    const docId = url.replace("/results/", "");
    return resultsForDocument(docId) as T;
  }

  if (url === "/upload-document" && method === "POST") {
    const body = data as {
      title: string;
      externalUrl: string;
      mimeType: string;
      kind: "pdf" | "image";
    };
    const id = crypto.randomUUID();
    const doc: DocumentListItem = {
      id,
      title: body.title,
      status: "pending",
      kind: body.kind,
      mimeType: body.mimeType,
      externalUrl: body.externalUrl,
      pdfUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockDocs = [doc, ...mockDocs];
    simulateProcessing(id);
    return {
      id: doc.id,
      title: doc.title,
      status: doc.status,
      externalUrl: doc.externalUrl,
      mimeType: doc.mimeType,
      kind: doc.kind,
      createdAt: doc.createdAt,
    } as T;
  }

  if (url.includes("/retry") && method === "POST") {
    const docId = url.split("/documents/")[1]?.split("/")[0];
    if (!docId) throw new Error("Bad request");
    mockDocs = mockDocs.map((d) =>
      d.id === docId
        ? { ...d, status: "pending" as DocumentStatus, updatedAt: new Date().toISOString() }
        : d,
    );
    simulateProcessing(docId);
    return { ok: true } as T;
  }

  if (url.includes("/reevaluate") && method === "POST") {
    const qId = url.split("/questions/")[1]?.split("/")[0];
    for (const docId of Object.keys(mockQuestions)) {
      const list = mockQuestions[docId];
      const q = list?.find((x) => x.id === qId);
      if (q?.answers?.[0]) {
        q.answers[0].confidenceScore = Math.min(
          0.99,
          Number(q.answers[0].confidenceScore) + 0.03,
        );
        q.answers[0].explanation =
          (q.answers[0].explanation ?? "") + " (Re-evaluated)";
      }
    }
    return { ok: true } as T;
  }

  throw new Error(`Unhandled mock: ${method} ${url}`);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function makeMockJwt(tenantSlug: string) {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: "user-mock",
      tenantId: `tenant-${tenantSlug}`,
      email: "you@example.com",
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    }),
  );
  return `${header}.${payload}.sig`;
}

function simulateProcessing(docId: string) {
  const steps: DocumentStatus[] = [
    "ocr_processing",
    "parsing",
    "solving",
    "ready",
  ];
  let i = 0;
  const tick = () => {
    if (i >= steps.length) return;
    mockDocs = mockDocs.map((d) =>
      d.id === docId
        ? { ...d, status: steps[i], updatedAt: new Date().toISOString() }
        : d,
    );
    i += 1;
    if (i < steps.length) setTimeout(tick, 2500);
    if (steps[i - 1] === "ready") {
      mockQuestions[docId] = [
        {
          id: "q-new",
          documentId: docId,
          text: "Mock question after processing pipeline.",
          options: {
            A: "Option A",
            B: "Option B",
            C: "Option C",
            D: "Option D",
          },
          correctAnswer: "C",
          explanation: "Mock explanation for the newly processed document.",
          confidenceScore: 0.72,
          answers: [
            {
              id: "a-new",
              selectedOption: "C",
              confidenceScore: 0.68,
              explanation: "Model output (mock).",
              validated: true,
              validationNotes: "Matches key.",
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }
  };
  setTimeout(tick, 800);
}
