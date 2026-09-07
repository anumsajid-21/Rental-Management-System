import { db } from '../db/database.js';

export const legalKnowledgeService = {
  /**
   * Search knowledge base with optional jurisdiction and category filters.
   */
  searchKnowledgeBase({ q = '', jurisdiction = '', category = '', limit = 10 } = {}) {
    const clauses = ['kb.superseded = 0'];
    const params = [];

    if (jurisdiction && jurisdiction !== 'all' && jurisdiction !== 'All') {
      clauses.push("(kb.jurisdiction = ? OR kb.jurisdiction = 'Federal')");
      params.push(jurisdiction);
    }

    if (category && category !== 'all') {
      clauses.push('kb.category = ?');
      params.push(category);
    }

    if (q && String(q).trim()) {
      const term = `%${String(q).trim()}%`;
      clauses.push('(kb.title LIKE ? OR kb.summary LIKE ? OR kb.full_text LIKE ? OR kb.practical_app LIKE ? OR kb.urdu_summary LIKE ?)');
      params.push(term, term, term, term, term);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db.prepare(`
      SELECT kb.*, s.name AS source_name, s.authority, s.year, s.source_url
      FROM legal_knowledge_base kb
      LEFT JOIN legal_sources s ON s.id = kb.source_id
      ${where}
      ORDER BY (CASE WHEN kb.jurisdiction = 'Federal' THEN 2 ELSE 1 END) ASC, kb.created_at DESC
      LIMIT ?
    `).all(...params, limit);

    return rows.map((r) => ({
      ...r,
      key_documents: JSON.parse(r.key_documents || '[]'),
      red_flags: JSON.parse(r.red_flags || '[]'),
    }));
  },

  /**
   * Search real estate legal terms in English, Urdu, and Roman Urdu.
   */
  searchTerms({ q = '', category = '' } = {}) {
    const clauses = [];
    const params = [];

    if (category && category !== 'all') {
      clauses.push('category = ?');
      params.push(category);
    }

    if (q && String(q).trim()) {
      const term = `%${String(q).trim()}%`;
      clauses.push('(term_en LIKE ? OR term_ur LIKE ? OR term_roman LIKE ? OR simple_meaning LIKE ?)');
      params.push(term, term, term, term);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db.prepare(`
      SELECT * FROM legal_terms
      ${where}
      ORDER BY term_en ASC
    `).all(...params);

    return rows.map((r) => ({
      ...r,
      related_docs: JSON.parse(r.related_docs || '[]'),
      common_mistakes: JSON.parse(r.common_mistakes || '[]'),
    }));
  },

  /**
   * Find single term by ID.
   */
  getTermById(id) {
    const row = db.prepare('SELECT * FROM legal_terms WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      related_docs: JSON.parse(row.related_docs || '[]'),
      common_mistakes: JSON.parse(row.common_mistakes || '[]'),
    };
  },

  /**
   * Calculate property transaction taxes (FBR Section 236C, 236K, Stamp Duty, TMA Fee).
   */
  calculatePropertyTaxes({
    propertyValue = 0,
    jurisdiction = 'Punjab',
    sellerStatus = 'filer',
    buyerStatus = 'filer',
  } = {}) {
    const val = Number(propertyValue) || 0;
    if (val <= 0) {
      return { totalTax: 0, breakdown: [] };
    }

    const jur = jurisdiction === 'Federal' ? 'Punjab' : jurisdiction;

    // 1. Seller Advance Tax (236C)
    const sellerRateRow = db.prepare(
      "SELECT * FROM legal_tax_rates WHERE tax_type = '236C_seller' AND filer_type = ? AND is_active = 1"
    ).get(sellerStatus) || { rate_percent: 3.0, statutory_ref: 'Income Tax Ordinance 2001, Section 236C' };

    const sellerTax = (val * sellerRateRow.rate_percent) / 100;

    // 2. Buyer Advance Tax (236K)
    const buyerRateRow = db.prepare(
      "SELECT * FROM legal_tax_rates WHERE tax_type = '236K_buyer' AND filer_type = ? AND is_active = 1"
    ).get(buyerStatus) || { rate_percent: 3.0, statutory_ref: 'Income Tax Ordinance 2001, Section 236K' };

    const buyerTax = (val * buyerRateRow.rate_percent) / 100;

    // 3. Stamp Duty (Provincial)
    const stampRateRow = db.prepare(
      "SELECT * FROM legal_tax_rates WHERE tax_type = 'stamp_duty' AND jurisdiction = ? AND is_active = 1"
    ).get(jur) || { rate_percent: 1.0, statutory_ref: 'Stamp Act 1899' };

    const stampDuty = (val * stampRateRow.rate_percent) / 100;

    // 4. TMA Transfer Fee
    const tmaRateRow = db.prepare(
      "SELECT * FROM legal_tax_rates WHERE tax_type = 'tma_fee' AND jurisdiction = ? AND is_active = 1"
    ).get(jur) || { rate_percent: 1.0, statutory_ref: 'Local Government Act' };

    const tmaFee = (val * tmaRateRow.rate_percent) / 100;

    const breakdown = [
      {
        name: 'Seller Advance Tax (Section 236C)',
        party: 'Seller',
        rate: `${sellerRateRow.rate_percent}%`,
        amount: sellerTax,
        filerStatus: sellerStatus,
        statutoryRef: sellerRateRow.statutory_ref,
      },
      {
        name: 'Buyer Advance Tax (Section 236K)',
        party: 'Buyer',
        rate: `${buyerRateRow.rate_percent}%`,
        amount: buyerTax,
        filerStatus: buyerStatus,
        statutoryRef: buyerRateRow.statutory_ref,
      },
      {
        name: `Provincial Stamp Duty (${jur})`,
        party: 'Buyer / Mutually agreed',
        rate: `${stampRateRow.rate_percent}%`,
        amount: stampDuty,
        statutoryRef: stampRateRow.statutory_ref,
      },
      {
        name: `TMA / Municipal Transfer Fee (${jur})`,
        party: 'Buyer / Mutually agreed',
        rate: `${tmaRateRow.rate_percent}%`,
        amount: tmaFee,
        statutoryRef: tmaRateRow.statutory_ref,
      },
    ];

    const totalEstimatedTax = sellerTax + buyerTax + stampDuty + tmaFee;

    return {
      propertyValue: val,
      jurisdiction: jur,
      sellerStatus,
      buyerStatus,
      totalEstimatedTax,
      sellerTotal: sellerTax,
      buyerTotal: buyerTax + stampDuty + tmaFee,
      breakdown,
      disclaimer: 'Estimates are based on published FBR and provincial schedules. Actual duty may be calculated on the higher of the agreed value or the DC/FBR official valuation table.',
    };
  },

  /**
   * Get housing societies list or details.
   */
  getSocieties(jurisdiction = '') {
    let query = 'SELECT * FROM legal_societies';
    const params = [];
    if (jurisdiction && jurisdiction !== 'all') {
      query += ' WHERE jurisdiction = ?';
      params.push(jurisdiction);
    }
    query += ' ORDER BY name ASC';
    const rows = db.prepare(query).all(...params);
    return rows.map((r) => ({
      ...r,
      common_frauds: JSON.parse(r.common_frauds || '[]'),
      checklist: JSON.parse(r.checklist || '[]'),
    }));
  },

  /**
   * Log legal query for safety auditing and citation monitoring.
   */
  logAudit({ userId = null, query, jurisdiction = 'Federal', category = 'general', riskLevel = 'low', escalated = 0, citationStatus = 'verified', ipAddress = '' }) {
    try {
      const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      db.prepare(`
        INSERT INTO legal_audit_logs (
          id, user_id, query, jurisdiction, category, risk_level, escalated, citation_status, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, query, jurisdiction, category, riskLevel, escalated, citationStatus, ipAddress);
    } catch (err) {
      console.error('[legalKnowledgeService] logAudit error:', err.message);
    }
  },

  /**
   * Admin: List legal sources.
   */
  listSources() {
    return db.prepare('SELECT * FROM legal_sources ORDER BY year DESC, name ASC').all();
  },

  /**
   * Admin: List recent audit logs.
   */
  listAuditLogs(limit = 50) {
    return db.prepare('SELECT * FROM legal_audit_logs ORDER BY created_at DESC LIMIT ?').all(limit);
  },
};
