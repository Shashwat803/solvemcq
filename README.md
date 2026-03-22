# SolveMCQ

A multi-tenant SaaS platform that automatically solves multiple-choice questions from exam papers. Upload a PDF or image — the system OCRs it, extracts questions using AI, selects answers with confidence scores and explanations, and presents the results in a web dashboard.

---

## Features

- **Automated MCQ solving** — Upload an exam paper and get AI-generated answers with explanations and confidence scores
- **Dual OCR modes** — Text-layer extraction for digital PDFs; OpenAI Vision fallback for scanned/image PDFs
- **Multi-tenancy** — Every resource is fully isolated per tenant; registration creates a new tenant automatically
- **Async processing pipeline** — OCR → AI Parse → AI Solve, powered by BullMQ and Redis (with an inline fallback when Redis is not available)
- **Answer validation** — Automatically validates AI answers against the correct answer when it can be parsed from the document
- **Retry support** — Re-trigger failed documents with a single request
- **Dark / light theme** — Toggle in the navbar

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, Radix UI, shadcn/ui |
| State / Fetching | TanStack React Query v5, Axios |
| Backend API | Node.js, Express v5, TypeScript |
| Database | PostgreSQL (Sequelize ORM) |
| Queue / Jobs | Redis + BullMQ |
| AI | OpenAI SDK — GPT-4o-mini (chat completions + Vision) |
| Auth | JWT + bcrypt |
| PDF processing | `pdf-parse`, `pdf-to-img` |
| Validation | Zod |
| Security | Helmet, express-rate-limit |

---

## Project Structure

```
solvemcq/
├── api/                        # Express backend
│   └── src/
│       ├── app.ts              # Express app + route registration
│       ├── index.ts            # HTTP server entry point
│       ├── ai/                 # OpenAI client singleton
│       ├── config/             # Zod-validated env, database connection
│       ├── controllers/        # auth, document, results
│       ├── jobs/               # BullMQ queues + Redis connection
│       ├── middleware/         # JWT auth, global error handler
│       ├── models/             # Sequelize models (Tenant, User, Document, Question, Answer)
│       ├── services/           # OCR, question parsing, AI solving, validation, pipeline
│       ├── utils/              # asyncHandler, HttpError
│       ├── validators/         # Zod request schemas
│       └── workers/            # BullMQ worker entry + processors
│           └── processors/     # ocrProcessor, aiSolveProcessor, pdfProcessor
└── web/                        # Next.js frontend
    └── app/
        ├── (app)/              # Authenticated route group
        │   ├── dashboard/      # Document list
        │   ├── documents/[id]/ # Question viewer
        │   ├── results/[documentId]/ # AI results viewer
        │   └── upload/         # File upload
        └── (auth)/             # Login, signup
    ├── components/             # Shared UI components
    ├── lib/                    # API client, auth helpers, mock API
    └── types/                  # Shared TypeScript types
```

---

## Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL
- Redis (optional — see [Redis-free mode](#redis-free-mode))
- An OpenAI API key (optional — a placeholder mode is available without one)

---

## Environment Variables

### API (`api/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Secret key, minimum 32 characters |
| `REDIS_URL` | Cond. | — | Redis URL (required unless `REDIS_DISABLED=true`) |
| `OPENAI_API_KEY` | No | — | OpenAI API key; omit to use placeholder answers |
| `PORT` | No | `3001` | API server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI model name |
| `JWT_EXPIRES_IN` | No | `7d` | JWT token expiry |
| `REDIS_DISABLED` | No | `false` | Set `true` to skip Redis and run pipeline inline |
| `SYNC_DB` | No | `false` | Run Sequelize `sync()` on startup |
| `BCRYPT_ROUNDS` | No | `12` | bcrypt cost factor (10–14) |

### Web (`web/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | API base URL — defaults to `http://localhost:3001` |
| `NEXT_PUBLIC_USE_MOCK_API` | Set `true` to use mock data without the backend |

---

## Getting Started

### 1. Install dependencies

```bash
# From the api directory
cd api
pnpm install

# From the web directory
cd ../web
pnpm install
```

### 2. Configure environment variables

```bash
# api/.env
DATABASE_URL=postgresql://user:password@localhost:5432/solvemcq
JWT_SECRET=your_super_secret_key_at_least_32_chars
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
```

```bash
# web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Set up the database

Set `SYNC_DB=true` in `api/.env` on first run to create all tables automatically, then set it back to `false`.

### 4. Start the services

**API server** (runs on port 3001):
```bash
cd api
pnpm dev
```

**BullMQ workers** (in a separate terminal):
```bash
cd api
pnpm worker
```

**Web app** (runs on port 3000):
```bash
cd web
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign up to create a new tenant.

---

## Redis-free Mode

If you don't have Redis available, set `REDIS_DISABLED=true` in `api/.env`. The document pipeline will run inline (synchronously) instead of through BullMQ workers. No separate worker process is needed in this mode.

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Health check |
| `POST` | `/auth/register` | No | Create tenant + admin user, returns JWT |
| `POST` | `/auth/login` | No | Login, returns JWT |
| `POST` | `/upload-document` | JWT | Upload PDF/image (multipart), starts pipeline |
| `GET` | `/documents` | JWT | List all documents for the tenant |
| `GET` | `/documents/:id/questions` | JWT | Get parsed questions + AI answers |
| `POST` | `/documents/:id/retry` | JWT | Re-trigger processing for a failed document |
| `GET` | `/results/:documentId` | JWT | Full results: document + questions + answers |

**Rate limiting:** Auth endpoints are limited to 50 requests per 15 minutes.  
**File uploads:** Accepts PDF, PNG, JPEG, WebP up to 40 MB.

---

## Document Status Flow

```
pending → ocr_processing → parsing → solving → ready
                ↓                        ↓
           ocr_failed                 failed
```

Failed documents can be retried via `POST /documents/:id/retry`.

---

## Scripts

### API

```bash
pnpm dev          # Dev server with hot-reload
pnpm worker       # Start BullMQ workers
pnpm build        # Compile TypeScript
pnpm start        # Run compiled API
pnpm start:worker # Run compiled workers
```

### Web

```bash
pnpm dev    # Next.js dev server
pnpm build  # Production build
pnpm start  # Serve production build
pnpm lint   # Run ESLint
```

---

## License

MIT
