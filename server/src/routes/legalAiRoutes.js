import express from 'express';
import { askLegalAi } from '../services/legalAiService.js';
import { legalKnowledgeService } from '../services/legalKnowledgeService.js';
import { analyzeRealEstateDocument } from '../services/documentAnalyzerService.js';
import { generateDueDiligenceChecklist } from '../services/dueDiligenceService.js';
import { assessScamRisk } from '../services/scamDetectionService.js';
import { generateLegalLetterDraft } from '../services/legalLetterService.js';

const router = express.Router();

/**
 * POST /api/legal-ai/chat
 * Primary Q&A endpoint. Accepts { query, jurisdiction, language, history }
 */
router.post('/chat', async (req, res) => {
  try {
    const { query, jurisdiction, language, history, action, previousContext } = req.body || {};
    if (!query || !String(query).trim()) {
      return res.status(400).json({ error: 'Query is required.' });
    }

    const result = await askLegalAi({ query, jurisdiction, language, history, action, previousContext });
    return res.json(result);
  } catch (err) {
    console.error('[legalAiRoutes] /chat error:', err);
    return res.status(500).json({ error: 'Failed to process legal inquiry.' });
  }
});

/**
 * GET /api/legal-ai/terms
 * Search Pakistani legal terms dictionary
 */
router.get('/terms', (req, res) => {
  try {
    const { q, category } = req.query;
    const terms = legalKnowledgeService.searchTerms({ q, category });
    return res.json({ terms });
  } catch (err) {
    console.error('[legalAiRoutes] /terms error:', err);
    return res.status(500).json({ error: 'Failed to fetch legal terms.' });
  }
});

/**
 * GET /api/legal-ai/terms/:id
 * Retrieve single legal term
 */
router.get('/terms/:id', (req, res) => {
  try {
    const term = legalKnowledgeService.getTermById(req.params.id);
    if (!term) return res.status(404).json({ error: 'Term not found.' });
    return res.json({ term });
  } catch (err) {
    console.error('[legalAiRoutes] /terms/:id error:', err);
    return res.status(500).json({ error: 'Failed to fetch term details.' });
  }
});

/**
 * POST /api/legal-ai/analyze-document
 * Analyze uploaded or pasted contract clauses
 */
router.post('/analyze-document', (req, res) => {
  try {
    const { text, docTypeHint } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Document text is required for analysis.' });
    }
    const result = analyzeRealEstateDocument(text, docTypeHint);
    return res.json(result);
  } catch (err) {
    console.error('[legalAiRoutes] /analyze-document error:', err);
    return res.status(500).json({ error: 'Failed to analyze document.' });
  }
});

/**
 * POST /api/legal-ai/due-diligence
 * Generate 15-point tailored due diligence checklist
 */
router.post('/due-diligence', (req, res) => {
  try {
    const checklistData = generateDueDiligenceChecklist(req.body || {});
    return res.json(checklistData);
  } catch (err) {
    console.error('[legalAiRoutes] /due-diligence error:', err);
    return res.status(500).json({ error: 'Failed to generate due-diligence checklist.' });
  }
});

/**
 * POST /api/legal-ai/scam-check
 * Assess scam risk level and warning signals
 */
router.post('/scam-check', (req, res) => {
  try {
    const riskAssessment = assessScamRisk(req.body || {});
    return res.json(riskAssessment);
  } catch (err) {
    console.error('[legalAiRoutes] /scam-check error:', err);
    return res.status(500).json({ error: 'Failed to perform risk assessment.' });
  }
});

/**
 * POST /api/legal-ai/tax-estimate
 * Calculate FBR Section 236C, 236K, Stamp Duty, and TMA Fees
 */
router.post('/tax-estimate', (req, res) => {
  try {
    const { propertyValue, jurisdiction, sellerStatus, buyerStatus } = req.body || {};
    const estimate = legalKnowledgeService.calculatePropertyTaxes({
      propertyValue,
      jurisdiction,
      sellerStatus,
      buyerStatus,
    });
    return res.json(estimate);
  } catch (err) {
    console.error('[legalAiRoutes] /tax-estimate error:', err);
    return res.status(500).json({ error: 'Failed to calculate property taxes.' });
  }
});

/**
 * POST /api/legal-ai/generate-letter
 * Generate informational legal letter drafts
 */
router.post('/generate-letter', (req, res) => {
  try {
    const draft = generateLegalLetterDraft(req.body || {});
    return res.json(draft);
  } catch (err) {
    console.error('[legalAiRoutes] /generate-letter error:', err);
    return res.status(500).json({ error: 'Failed to generate letter draft.' });
  }
});

/**
 * GET /api/legal-ai/societies
 * Get list of major housing societies & transfer protocols
 */
router.get('/societies', (req, res) => {
  try {
    const societies = legalKnowledgeService.getSocieties(req.query.jurisdiction);
    return res.json({ societies });
  } catch (err) {
    console.error('[legalAiRoutes] /societies error:', err);
    return res.status(500).json({ error: 'Failed to fetch societies.' });
  }
});

/**
 * GET /api/legal-ai/knowledge
 * Search knowledge base items
 */
router.get('/knowledge', (req, res) => {
  try {
    const { q, jurisdiction, category } = req.query;
    const items = legalKnowledgeService.searchKnowledgeBase({ q, jurisdiction, category });
    return res.json({ items });
  } catch (err) {
    console.error('[legalAiRoutes] /knowledge error:', err);
    return res.status(500).json({ error: 'Failed to search knowledge base.' });
  }
});

/**
 * GET /api/legal-ai/admin/sources
 * Admin: List legal sources
 */
router.get('/admin/sources', (req, res) => {
  try {
    const sources = legalKnowledgeService.listSources();
    return res.json({ sources });
  } catch (err) {
    console.error('[legalAiRoutes] /admin/sources error:', err);
    return res.status(500).json({ error: 'Failed to fetch legal sources.' });
  }
});

/**
 * GET /api/legal-ai/admin/audit-logs
 * Admin: List audit logs
 */
router.get('/admin/audit-logs', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const logs = legalKnowledgeService.listAuditLogs(limit);
    return res.json({ logs });
  } catch (err) {
    console.error('[legalAiRoutes] /admin/audit-logs error:', err);
    return res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

export default router;
