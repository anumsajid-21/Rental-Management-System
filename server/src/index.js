import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runMigrations } from './db/database.js';
import { userModel } from './models/userModel.js';
import authRoutes from './routes/authRoutes.js';
import ownerRoutes from './routes/ownerRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

runMigrations();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Simple request log (useful while 4 people develop in parallel).
app.use((req, _res, next) => {
  console.log(`[api] ${req.method} ${req.path}`);
  next();
});

// Shared model instance for controllers/middleware.
app.set('userModel', userModel);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/owner', ownerRoutes);

// 404 + error handler
app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, _req, res, _next) => {
  console.error('[api] error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`[server] API running on http://localhost:${PORT}`);
});
