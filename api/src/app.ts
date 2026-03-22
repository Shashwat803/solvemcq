import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { authenticateJwt } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import * as authController from './controllers/authController';
import * as documentController from './controllers/documentController';
import * as resultsController from './controllers/resultsController';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024 }, // 40 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/auth/register', authLimiter, authController.register);
app.post('/auth/login', authLimiter, authController.login);

app.post('/upload-document', authenticateJwt, upload.single('file'), documentController.uploadDocument);
app.get('/documents', authenticateJwt, documentController.listDocuments);
app.get('/documents/:id/questions', authenticateJwt, documentController.getDocumentQuestions);
app.post('/documents/:id/retry', authenticateJwt, documentController.retryDocument);
app.get('/results/:documentId', authenticateJwt, resultsController.getResults);

app.use(errorHandler);

export default app;
