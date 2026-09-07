import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations } from './db/database.js';
import { userModel } from './models/userModel.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import ownerRoutes from './routes/ownerRoutes.js';
import tenantRoutes from './routes/tenantRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import businessRoutes from './routes/businessRoutes.js';
import legalAiRoutes from './routes/legalAiRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

const app = express();
const PORT = process.env.PORT || 5000;

runMigrations();

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// General rate limiter to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Serve uploads folder statically for property images / receipts
app.use('/uploads', express.static(uploadDir));

// Simple request log (useful while 4 people develop in parallel).
app.use((req, _res, next) => {
  console.log(`[api] ${req.method} ${req.path}`);
  next();
});

// Shared model instance for controllers/middleware.
app.set('userModel', userModel);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/legal-ai', legalAiRoutes);

// 404 + error handler
app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, _req, res, _next) => {
  console.error('[api] error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`[server] API running on http://localhost:${PORT}`);
});
