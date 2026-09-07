import express from 'express';
import jwt from 'jsonwebtoken';
import {
  chatWithRentalAssistant,
  troubleshootMaintenance,
  enhancePropertyDescription,
} from '../services/aiService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'default-rms-jwt-secret-key-2026';

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = req.app.get('userModel')?.findById(payload.sub);
    if (user) req.user = user;
  } catch (err) {
    // Ignore invalid token in optional auth
  }
  next();
}

/**
 * POST /api/ai/chat
 * Body: { messages: [{ role: 'user' | 'assistant', content: string }] }
 */
router.post('/chat', optionalAuth, async (req, res) => {
  try {
    const { messages = [] } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const userContext = {
      name: req.user?.name || 'Guest',
      role: req.user?.role || 'visitor',
    };

    const reply = await chatWithRentalAssistant(messages, userContext);
    return res.json({ reply });
  } catch (err) {
    console.error('[aiRoutes] /chat error:', err);
    return res.status(500).json({ error: 'Failed to process AI chat.' });
  }
});

/**
 * POST /api/ai/troubleshoot-maintenance
 * Body: { description: string }
 */
router.post('/troubleshoot-maintenance', optionalAuth, async (req, res) => {
  try {
    const { description = '' } = req.body;
    if (!description.trim()) {
      return res.status(400).json({ error: 'Issue description is required.' });
    }

    const result = await troubleshootMaintenance(description);
    return res.json(result);
  } catch (err) {
    console.error('[aiRoutes] /troubleshoot-maintenance error:', err);
    return res.status(500).json({ error: 'Failed to troubleshoot maintenance issue.' });
  }
});

/**
 * POST /api/ai/enhance-property-description
 * Body: { name, location, bedrooms, bathrooms, rent, amenities }
 */
router.post('/enhance-property-description', optionalAuth, async (req, res) => {
  try {
    const details = req.body || {};
    const description = await enhancePropertyDescription(details);
    return res.json({ description });
  } catch (err) {
    console.error('[aiRoutes] /enhance-property-description error:', err);
    return res.status(500).json({ error: 'Failed to enhance property description.' });
  }
});

export default router;
