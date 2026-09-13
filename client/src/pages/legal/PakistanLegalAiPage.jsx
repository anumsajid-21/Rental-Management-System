import { useState, useEffect } from 'react';
import { PageHeader, Alert, Loading, EmptyState, Badge, Modal, money } from '../../components/ownerUi';
import '../../styles/legalAi.css';

const JURISDICTIONS = [
  'All',
  'Punjab',
  'Sindh',
  'Islamabad (ICT)',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Azad Jammu & Kashmir',
  'Gilgit-Baltistan',
];

const QUICK_CHIPS = [
  'What is the legal difference between Intiqal and Registry in Punjab?',
  'How do I lawfully evict a defaulting tenant under Sindh Rented Premises Ordinance?',
  'What documents must I check before paying Bayana for a plot in DHA?',
  'Can a Power of Attorney holder sell property without original owner consent?',
  'What are the FBR Section 236C and 236K tax rates for property purchase?',
  'Can inherited property be sold without all legal heirs signing?',
];

const SAMPLE_SALE_AGREEMENT = `AGREEMENT TO SELL (Iqrar-Nama Bayana)
This Agreement to Sell is made at Lahore on this 15th day of August 2026.
BETWEEN:
Mr. Tariq Mehmood, CNIC 35201-1234567-1, Resident of Gulberg III, Lahore (hereinafter called the 'SELLER').
AND
Mr. Kamran Akram, CNIC 35202-7654321-3, Resident of DHA Phase 5, Lahore (hereinafter called the 'PURCHASER').

WHEREAS the Seller warrants that he is the absolute owner of House No. 124, Block B, Model Town, Lahore, measuring 1 Kanal.
1. TOTAL CONSIDERATION: The agreed total sale price is PKR 45,000,000/- (Pakistani Rupees Forty-Five Million only).
2. EARNEST MONEY (BAYANA): The Purchaser has paid advance Bayana of PKR 4,500,000/- via Bank Pay Order No. 0498231 drawn on Meezan Bank.
3. BALANCE PAYMENT & REGISTRATION: The remaining balance of PKR 40,500,000/- shall be paid on or before 30th September 2026.
4. POSSESSION: Vacant physical possession shall be delivered at the time of registered deed execution before the Sub-Registrar.
5. DEFAULT CLAUSE: If the Purchaser fails to pay the balance, the earnest money shall be forfeited. If the Seller fails to transfer, he shall pay double the Bayana.
WITNESS 1: Ali Hassan (CNIC: 35201-1111111-1)
WITNESS 2: Bilal Rauf (CNIC: 35201-2222222-3)`;

const SAMPLE_LEASE_AGREEMENT = `TENANCY AGREEMENT (Punjab Rented Premises Act 2009)
Dated: 1st July 2026.
Landlord: Rashid Khan (CNIC: 35201-9988776-5)
Tenant: Hamza Tariq (CNIC: 35202-3344556-7)
Premises: Apartment 4B, Gulberg Heights, Lahore.
Monthly Rent: PKR 65,000/- payable by the 5th of each calendar month via bank transfer.
Security Deposit: PKR 130,000/- refundable upon vacating.
Lease Term: 11 months renewable.
Notice Period: 30 days written notice by either party.`;

export default function PakistanLegalAiPage() {
  const [activeTab, setActiveTab] = useState('qa');

  // Q&A State
  const [query, setQuery] = useState('');
  const [jurisdiction, setJurisdiction] = useState('All');
  const [loadingQa, setLoadingQa] = useState(false);
  const [qaResult, setQaResult] = useState(null);
  const [qaError, setQaError] = useState('');

  // Dictionary State
  const [terms, setTerms] = useState([]);
  const [termsSearch, setTermsSearch] = useState('');
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState(null);

  // Document Analyzer State
  const [docText, setDocText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [docError, setDocError] = useState('');

  // Due Diligence State
  const [ddParams, setDdParams] = useState({
    province: 'Punjab',
    city: 'Lahore',
    propertyType: 'House',
    sellerType: 'Direct Owner',
    ownershipDoc: 'Registry',
    society: 'None',
  });
  const [ddResult, setDdResult] = useState(null);
  const [loadingDd, setLoadingDd] = useState(false);

  // Scam Risk State
  const [scamFactors, setScamFactors] = useState({
    priceDiscrepancy: false,
    urgencyPressure: false,
    refusesVerification: false,
    missingOriginalDocs: false,
    nameMismatch: false,
    unregisteredPOA: false,
    cashOnlyDemand: false,
    unapprovedSociety: false,
    stayOrderClaim: false,
    multipleClaims: false,
  });
  const [scamResult, setScamResult] = useState(null);

  // Tax Calculator State
  const [taxInput, setTaxInput] = useState({
    propertyValue: 10000000,
    jurisdiction: 'Punjab',
    sellerStatus: 'filer',
    buyerStatus: 'filer',
  });
  const [taxResult, setTaxResult] = useState(null);
  const [loadingTax, setLoadingTax] = useState(false);

  // Legal Letter Generator State
  const [letterParams, setLetterParams] = useState({
    templateType: 'rent_default_notice',
    senderName: '',
    senderCnic: '',
    recipientName: '',
    recipientCnic: '',
    propertyAddress: '',
    city: 'Lahore',
    province: 'Punjab',
    rentOrPrice: 50000,
    details: '',
  });
  const [generatedLetter, setGeneratedLetter] = useState(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Initial load for dictionary
  useEffect(() => {
    if (activeTab === 'terms') {
      loadTerms();
    }
  }, [activeTab]);

  const loadTerms = async (q = '') => {
    setLoadingTerms(true);
    try {
      const res = await fetch(`/api/legal-ai/terms?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.terms) setTerms(data.terms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTerms(false);
    }
  };

  const handleAskLegal = async (promptToUse, actionType = '') => {
    const q = (promptToUse || query).trim();
    if (!q) return;

    setLoadingQa(true);
    setQaError('');
    // Retain previous result context for follow-up continuation
    const prevContext = qaResult ? { query: qaResult.query || query, reply: qaResult.reply } : null;
    setQaResult(null);

    try {
      const res = await fetch('/api/legal-ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          query: q,
          jurisdiction: jurisdiction === 'All' ? '' : jurisdiction,
          action: actionType || '',
          previousContext: prevContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQaError(data.error || 'Failed to process inquiry.');
      } else {
        setQaResult(data);
      }
    } catch {
      setQaError('Network error. Ensure the server is connected.');
    } finally {
      setLoadingQa(false);
    }
  };

  const handleAnalyzeDocument = async () => {
    if (!docText.trim()) {
      setDocError('Please provide contract or agreement text.');
      return;
    }
    setAnalyzing(true);
    setDocError('');
    try {
      const res = await fetch('/api/legal-ai/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: docText }),
      });
      const data = await res.json();
      if (!res.ok) setDocError(data.error || 'Analysis failed.');
      else setAnalysisResult(data);
    } catch {
      setDocError('Server communication error.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRunDueDiligence = async () => {
    setLoadingDd(true);
    try {
      const res = await fetch('/api/legal-ai/due-diligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ddParams),
      });
      const data = await res.json();
      setDdResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDd(false);
    }
  };

  const handleCheckScamRisk = async () => {
    try {
      const res = await fetch('/api/legal-ai/scam-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scamFactors),
      });
      const data = await res.json();
      setScamResult(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCalculateTax = async () => {
    setLoadingTax(true);
    try {
      const res = await fetch('/api/legal-ai/tax-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taxInput),
      });
      const data = await res.json();
      setTaxResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTax(false);
    }
  };

  const handleGenerateLetter = async () => {
    try {
      const res = await fetch('/api/legal-ai/generate-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(letterParams),
      });
      const data = await res.json();
      setGeneratedLetter(data);
      setCopiedNotice(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page legal-page">
      <PageHeader
        title="Pakistan Property Legal AI"
        subtitle="Understand Pakistani Property Law — Statutory guidance, document verification, and risk screening before you sign."
      />

      {/* Navigation Tabs */}
      <nav className="legal-nav-tabs">
        <button
          className={`legal-tab-btn ${activeTab === 'qa' ? 'active' : ''}`}
          onClick={() => setActiveTab('qa')}
        >
          💬 Legal Q&A
        </button>
        <button
          className={`legal-tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
          onClick={() => setActiveTab('terms')}
        >
          📖 Legal Dictionary
        </button>
        <button
          className={`legal-tab-btn ${activeTab === 'analyzer' ? 'active' : ''}`}
          onClick={() => setActiveTab('analyzer')}
        >
          🔍 Document Analyzer
        </button>
        <button
          className={`legal-tab-btn ${activeTab === 'due_diligence' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('due_diligence');
            if (!ddResult) handleRunDueDiligence();
          }}
        >
          📋 Due Diligence Wizard
        </button>
        <button
          className={`legal-tab-btn ${activeTab === 'scam_check' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('scam_check');
            if (!scamResult) handleCheckScamRisk();
          }}
        >
          🛡️ Scam Risk Checker
        </button>
        <button
          className={`legal-tab-btn ${activeTab === 'tax_calc' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('tax_calc');
            if (!taxResult) handleCalculateTax();
          }}
        >
          💰 Tax Calculator (FBR 236C/K)
        </button>
        <button
          className={`legal-tab-btn ${activeTab === 'letters' ? 'active' : ''}`}
          onClick={() => setActiveTab('letters')}
        >
          ✉️ Legal Notices & Drafts
        </button>
      </nav>

      {/* =========================================================================
          TAB 1: LEGAL Q&A
          ========================================================================= */}
      {activeTab === 'qa' && (
        <div className="legal-qa-layout">
          <div className="card">
            <h2 className="card-title">Ask Any Pakistani Real Estate Legal Question</h2>
            <p className="card-hint">
              Ask about property sales, tenancy evictions, Intiqal vs Registry, inheritance, Power of Attorney, or property fraud in <strong>English, Urdu, or Roman Urdu</strong>.
            </p>

            <div className="legal-control-bar" style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Select Jurisdiction:
              </label>
              <select
                className="legal-select"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
              >
                {JURISDICTIONS.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                (Provincial laws differ for tenancy, stamp duties, and revenue records)
              </span>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleAskLegal(); }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  className="toolbar-input"
                  style={{ flex: 1, padding: '12px 16px', fontSize: '1rem', borderRadius: '12px' }}
                  placeholder="e.g. Can I sell inherited land without the consent of other legal heirs in Punjab?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0 24px', fontSize: '0.95rem' }}
                  disabled={loadingQa}
                >
                  {loadingQa ? 'Researching Law…' : 'Ask Legal AI'}
                </button>
              </div>
            </form>

            <div className="legal-chips-row">
              <span style={{ fontSize: '0.82rem', fontWeight: 600, alignSelf: 'center', color: 'var(--text-muted)' }}>
                Popular Topics:
              </span>
              {QUICK_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  className="legal-chip-btn"
                  onClick={() => {
                    setQuery(chip);
                    handleAskLegal(chip);
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            <Alert kind="error" onClose={() => setQaError('')}>{qaError}</Alert>
          </div>

          {loadingQa && <Loading label="Consulting authentic Pakistani legal sources & statutes…" />}

          {qaResult?.needsJurisdiction && (
            <div className="card" style={{ borderLeft: '5px solid #f59e0b', background: '#fffbeb' }}>
              <h3 style={{ color: '#b45309', margin: '0 0 8px' }}>Jurisdiction Clarification Required</h3>
              <p style={{ margin: '0 0 14px', fontSize: '0.95rem' }}>{qaResult.clarificationPrompt}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {qaResult.supportedJurisdictions.map((jur) => (
                  <button
                    key={jur}
                    className="btn btn-ghost btn-sm"
                    style={{ background: '#fff', borderColor: '#d97706', color: '#b45309' }}
                    onClick={() => {
                      setJurisdiction(jur);
                      handleAskLegal();
                    }}
                  >
                    Set to {jur}
                  </button>
                ))}
              </div>
            </div>
          )}

          {qaResult && !qaResult.needsJurisdiction && (
            <div className="legal-response-box">
              <div className="legal-response-header">
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Jurisdiction: <strong>{qaResult.jurisdiction}</strong>
                  </span>
                  {qaResult.citationStatus === 'verified' && (
                    <span className="badge badge-success" style={{ marginLeft: '10px' }}>
                      ✓ Verified Statutory Citation
                    </span>
                  )}
                </div>
                {qaResult.escalation?.escalated === 1 && (
                  <span className="badge badge-danger">
                    🚨 Advocate Consultation Recommended
                  </span>
                )}
              </div>

              {qaResult.escalation?.escalated === 1 && (
                <div style={{ background: '#fee2e2', border: '1px solid #f87171', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#991b1b', fontSize: '0.92rem' }}>
                  <strong>Lawyer Escalation Notice:</strong> {qaResult.escalation.reason}
                </div>
              )}

              <div className="legal-markdown" style={{ whiteSpace: 'pre-wrap' }}>
                {qaResult.reply}
              </div>

              {qaResult.verifiedSources && qaResult.verifiedSources.length > 0 && (
                <div style={{ marginTop: '20px', padding: '14px', background: 'var(--bg-accent)', borderRadius: '12px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Authoritative Pakistani Legal Sources Consulted:
                  </span>
                  <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '0.88rem' }}>
                    {qaResult.verifiedSources.map((s, idx) => (
                      <li key={idx}>
                        <strong>{s.source}</strong> ({s.section}) — {s.title} [Authority: {s.authority}]
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="legal-pro-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleAskLegal('Explain simply', 'explain_simply')}
                >
                  💡 EXPLAIN SIMPLY
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleAskLegal('Show full statute', 'show_full_statute')}
                >
                  📜 SHOW FULL STATUTE
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleAskLegal('What should I do next?', 'what_next')}
                >
                  👣 WHAT SHOULD I DO NEXT?
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleAskLegal('Show authoritative source', 'show_source')}
                >
                  🏛️ SHOW SOURCE
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleAskLegal('Generate property checklist', 'checklist')}
                >
                  📋 CHECKLIST
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: LEGAL DICTIONARY
          ========================================================================= */}
      {activeTab === 'terms' && (
        <div>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                className="toolbar-input"
                style={{ flex: 1 }}
                placeholder="Search legal term (e.g. Intiqal, Fard, Bayana, Khasra, Benami, انتقال)..."
                value={termsSearch}
                onChange={(e) => {
                  setTermsSearch(e.target.value);
                  loadTerms(e.target.value);
                }}
              />
              <button className="btn btn-ghost" onClick={() => loadTerms(termsSearch)}>
                Search
              </button>
            </div>
          </div>

          {loadingTerms && <Loading label="Loading legal dictionary…" />}

          {!loadingTerms && terms.length === 0 && (
            <EmptyState title="No matching terms found" hint="Try searching for Intiqal, Fard, Registry, Bayana, or Allotment." />
          )}

          <div className="terms-grid">
            {terms.map((t) => (
              <div key={t.id} className="term-card">
                <div className="term-header">
                  <div>
                    <div className="term-title">{t.term_en}</div>
                    <small style={{ color: 'var(--text-muted)' }}>Roman: {t.term_roman}</small>
                  </div>
                  <div className="term-urdu">{t.term_ur}</div>
                </div>

                <p style={{ fontSize: '0.9rem', color: 'var(--text)', margin: '4px 0' }}>
                  {t.simple_meaning}
                </p>

                <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: 'auto' }}>
                  <div>Authority: <strong>{t.relevant_authority}</strong></div>
                  <div>Source: <em>{t.legal_source}</em></div>
                </div>

                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: '8px', alignSelf: 'flex-start' }}
                  onClick={() => setSelectedTerm(t)}
                >
                  View Full Legal Guidance →
                </button>
              </div>
            ))}
          </div>

          {/* Term Details Modal */}
          <Modal
            open={Boolean(selectedTerm)}
            title={selectedTerm ? `${selectedTerm.term_en} (${selectedTerm.term_ur} / ${selectedTerm.term_roman})` : ''}
            onClose={() => setSelectedTerm(null)}
            footer={
              <button className="btn btn-primary" onClick={() => setSelectedTerm(null)}>
                Close
              </button>
            }
          >
            {selectedTerm && (
              <div className="detail-grid">
                <div className="detail-full">
                  <span>Simple Definition</span>
                  <strong>{selectedTerm.simple_meaning}</strong>
                </div>
                <div className="detail-full">
                  <span>Legal Significance</span>
                  <p className="detail-desc">{selectedTerm.legal_significance}</p>
                </div>
                <div className="detail-full">
                  <span>When is this required?</span>
                  <p className="detail-desc">{selectedTerm.when_required}</p>
                </div>
                <div>
                  <span>Competent Authority</span>
                  <strong>{selectedTerm.relevant_authority}</strong>
                </div>
                <div>
                  <span>Governing Pakistani Law</span>
                  <strong>{selectedTerm.legal_source}</strong>
                </div>

                {selectedTerm.related_docs && selectedTerm.related_docs.length > 0 && (
                  <div className="detail-full" style={{ background: 'var(--bg-accent)', padding: '12px', borderRadius: '10px' }}>
                    <span style={{ fontWeight: 600 }}>Related Necessary Documents:</span>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '0.88rem' }}>
                      {selectedTerm.related_docs.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedTerm.common_mistakes && selectedTerm.common_mistakes.length > 0 && (
                  <div className="detail-full" style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '10px', color: '#991b1b' }}>
                    <span style={{ fontWeight: 700 }}>Common Pitfalls to Avoid:</span>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '0.88rem' }}>
                      {selectedTerm.common_mistakes.map((m, i) => (
                        <li key={i}>⚠️ {m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Modal>
        </div>
      )}

      {/* =========================================================================
          TAB 3: DOCUMENT ANALYZER
          ========================================================================= */}
      {activeTab === 'analyzer' && (
        <div className="card">
          <h2 className="card-title">Real-Estate Document & Agreement Analyzer</h2>
          <p className="card-hint">
            Paste or upload text from an Agreement to Sell (Iqrar-nama), Lease Agreement, Bayana receipt, or Allotment letter to audit missing clauses, ambiguous conditions, and red flags.
          </p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setDocText(SAMPLE_SALE_AGREEMENT)}
            >
              📄 Load Sample Sale Agreement
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setDocText(SAMPLE_LEASE_AGREEMENT)}
            >
              📄 Load Sample Tenancy Agreement
            </button>
          </div>

          <textarea
            className="form-input"
            rows={8}
            placeholder="Paste contract text here..."
            value={docText}
            onChange={(e) => setDocText(e.target.value)}
          />

          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={handleAnalyzeDocument}
              disabled={analyzing}
            >
              {analyzing ? 'Auditing Agreement Clauses…' : 'Analyze Contract Clauses'}
            </button>
            {docText && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setDocText(''); setAnalysisResult(null); }}>
                Clear
              </button>
            )}
          </div>

          <Alert kind="error" onClose={() => setDocError('')}>{docError}</Alert>

          {analysisResult && (
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Audit Report: {analysisResult.detectedType}</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status: <strong>{analysisResult.healthBadge}</strong></span>
                </div>
                <div
                  className={`score-gauge ${
                    analysisResult.overallScore >= 75
                      ? 'score-high'
                      : analysisResult.overallScore >= 50
                      ? 'score-med'
                      : 'score-low'
                  }`}
                >
                  <span style={{ fontSize: '1.4rem' }}>{analysisResult.overallScore}</span>
                  <small style={{ fontSize: '0.7rem' }}>/ 100</small>
                </div>
              </div>

              {/* Present Clauses */}
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ color: '#15803d', fontSize: '0.98rem', marginBottom: '8px' }}>
                  ✓ Essential Clauses Identified ({analysisResult.clausesFound.length})
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                  {analysisResult.clausesFound.map((c, i) => (
                    <div key={i} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '10px' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#166534' }}>{c.name}</strong>
                      <div style={{ fontSize: '0.82rem', color: '#14532d', marginTop: '2px' }}>{c.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing Clauses */}
              {analysisResult.clausesMissing.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ color: '#b45309', fontSize: '0.98rem', marginBottom: '8px' }}>
                    ⚠️ Missing Standard Clauses ({analysisResult.clausesMissing.length})
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                    {analysisResult.clausesMissing.map((m, i) => (
                      <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '10px 14px', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong style={{ fontSize: '0.9rem', color: '#92400e' }}>{m.name}</strong>
                          <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>{m.risk} Risk</span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#78350f', marginTop: '4px' }}>{m.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Red Flags */}
              {analysisResult.redFlags.length > 0 && (
                <div style={{ marginTop: '20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 18px' }}>
                  <h4 style={{ color: '#991b1b', margin: '0 0 8px', fontSize: '0.98rem' }}>
                    🚨 Potential Red Flags & Legal Vulnerabilities
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#7f1d1d', fontSize: '0.88rem' }}>
                    {analysisResult.redFlags.map((rf, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>{rf}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: '20px', background: 'var(--bg-accent)', borderRadius: '10px', padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                ⚖️ <strong>Disclaimer:</strong> {analysisResult.disclaimer}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: DUE DILIGENCE WIZARD
          ========================================================================= */}
      {activeTab === 'due_diligence' && (
        <div className="card">
          <h2 className="card-title">Property Due-Diligence Checklist Generator</h2>
          <p className="card-hint">
            Answer 6 property parameters to generate an official step-by-step verification checklist specifying the exact Pakistani government offices to inspect.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <label className="form-field">
              <span className="form-label">Province / Territory</span>
              <select
                className="form-input"
                value={ddParams.province}
                onChange={(e) => setDdParams({ ...ddParams, province: e.target.value })}
              >
                <option value="Punjab">Punjab</option>
                <option value="Sindh">Sindh</option>
                <option value="ICT">Islamabad (ICT)</option>
                <option value="KP">Khyber Pakhtunkhwa</option>
                <option value="Balochistan">Balochistan</option>
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">City</span>
              <input
                className="form-input"
                value={ddParams.city}
                onChange={(e) => setDdParams({ ...ddParams, city: e.target.value })}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Property Type</span>
              <select
                className="form-input"
                value={ddParams.propertyType}
                onChange={(e) => setDdParams({ ...ddParams, propertyType: e.target.value })}
              >
                <option value="House">Residential House</option>
                <option value="Plot">Residential Plot</option>
                <option value="Apartment">Apartment / Flat</option>
                <option value="Commercial">Commercial Shop / Building</option>
                <option value="Agricultural">Agricultural Land</option>
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">Seller Type</span>
              <select
                className="form-input"
                value={ddParams.sellerType}
                onChange={(e) => setDdParams({ ...ddParams, sellerType: e.target.value })}
              >
                <option value="Direct Owner">Direct Registered Owner</option>
                <option value="Power of Attorney">Power of Attorney (POA) Holder</option>
                <option value="Inheritor / Heir">Inheritor / Legal Heir</option>
                <option value="Builder / Developer">Builder / Private Developer</option>
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">Available Title Document</span>
              <select
                className="form-input"
                value={ddParams.ownershipDoc}
                onChange={(e) => setDdParams({ ...ddParams, ownershipDoc: e.target.value })}
              >
                <option value="Registry">Registered Sale Deed (Baye-Nama)</option>
                <option value="Allotment Letter">Society Allotment / Transfer Letter</option>
                <option value="Fard">Fard Malkiat only</option>
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">Housing Society / Authority</span>
              <select
                className="form-input"
                value={ddParams.society}
                onChange={(e) => setDdParams({ ...ddParams, society: e.target.value })}
              >
                <option value="None">Open Land / Regular District Revenue</option>
                <option value="DHA">Defence Housing Authority (DHA)</option>
                <option value="CDA">Capital Development Authority (CDA)</option>
                <option value="LDA">Lahore Development Authority (LDA)</option>
                <option value="Bahria Town">Bahria Town</option>
                <option value="Private Scheme">Private Housing Scheme</option>
              </select>
            </label>
          </div>

          <button className="btn btn-primary" onClick={handleRunDueDiligence} disabled={loadingDd}>
            {loadingDd ? 'Generating Checklist…' : 'Generate Due Diligence Checklist'}
          </button>

          {ddResult && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0 }}>
                  Property Due-Diligence Checklist ({ddResult.totalVerificationPoints} Inspection Points)
                </h3>
                <span className="badge badge-info">Location: {ddResult.propertySummary.city}, {ddResult.propertySummary.province}</span>
              </div>

              {ddResult.checklist.map((item, idx) => (
                <div
                  key={idx}
                  className={`checklist-item ${item.priority === 'Critical Risk' ? 'critical' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <strong style={{ fontSize: '1rem', color: 'var(--text)' }}>
                      {idx + 1}. {item.item}
                    </strong>
                    <span
                      className={`badge badge-${
                        item.priority === 'Critical Risk' ? 'danger' : item.priority === 'Mandatory' ? 'warning' : 'info'
                      }`}
                    >
                      {item.priority}
                    </span>
                  </div>

                  <p style={{ margin: '6px 0', fontSize: '0.88rem', color: 'var(--text)' }}>
                    <strong>Why it matters:</strong> {item.whyItMatters}
                  </p>

                  <div style={{ background: 'var(--bg-accent)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.84rem', marginTop: '6px' }}>
                    📍 <strong>Where to verify:</strong> {item.whereToVerify}
                  </div>

                  <div style={{ color: '#dc2626', fontSize: '0.84rem', marginTop: '6px' }}>
                    ⚠️ <strong>Red flags to watch for:</strong> {item.redFlags}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 5: SCAM RISK CHECKER
          ========================================================================= */}
      {activeTab === 'scam_check' && (
        <div className="card">
          <h2 className="card-title">Property Scam & Transaction Risk Screener</h2>
          <p className="card-hint">
            Select any suspicious signals observed during negotiations or document review to compute the objective scam risk score.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', margin: '16px 0' }}>
            {[
              { id: 'refusesVerification', label: 'Seller refuses in-person verification at Sub-Registrar / Land Record Center' },
              { id: 'missingOriginalDocs', label: 'Seller presents only photocopies; claims original documents are "lost"' },
              { id: 'unregisteredPOA', label: 'Transaction relies on an unregistered Power of Attorney' },
              { id: 'nameMismatch', label: 'Seller CNIC name does not match the title deed / Fard' },
              { id: 'cashOnlyDemand', label: 'Seller demands un-banked cash and refuses crossed pay orders' },
              { id: 'urgencyPressure', label: 'Extreme pressure to close within 24-48 hours' },
              { id: 'priceDiscrepancy', label: 'Offered price is 30% to 50% below prevailing market value' },
              { id: 'stayOrderClaim', label: 'Reports of civil court litigation or stay order on the land' },
              { id: 'unapprovedSociety', label: 'Society lacks formal NOC from LDA / CDA / RDA / SBCA' },
              { id: 'multipleClaims', label: 'Conflicting ownership claims or unverified inheritance disputes' },
            ].map((f) => (
              <label
                key={f.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  background: scamFactors[f.id] ? '#fef2f2' : 'var(--bg-accent)',
                  border: `1px solid ${scamFactors[f.id] ? '#f87171' : 'var(--border)'}`,
                  borderRadius: '10px',
                  padding: '12px',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={scamFactors[f.id]}
                  onChange={(e) => {
                    const updated = { ...scamFactors, [f.id]: e.target.checked };
                    setScamFactors(updated);
                  }}
                  style={{ marginTop: '2px' }}
                />
                <span>{f.label}</span>
              </label>
            ))}
          </div>

          <button className="btn btn-primary" onClick={handleCheckScamRisk}>
            Recalculate Risk Score
          </button>

          {scamResult && (
            <div style={{ marginTop: '24px' }}>
              <div
                className={`risk-meter-box risk-${scamResult.riskLevel.toLowerCase()}`}
              >
                <div>
                  <span style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Calculated Transaction Risk Level
                  </span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>
                    {scamResult.riskLevel} RISK ({scamResult.riskScore} / 100)
                  </div>
                </div>
                <span className={`badge badge-${scamResult.badgeColor}`} style={{ fontSize: '0.95rem', padding: '6px 14px' }}>
                  {scamResult.redFlagsCount} Red Flag{scamResult.redFlagsCount === 1 ? '' : 's'} Triggered
                </span>
              </div>

              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <strong style={{ fontSize: '0.95rem' }}>Next Recommended Action:</strong>
                <p style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>{scamResult.recommendation}</p>
              </div>

              {scamResult.redFlags.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#991b1b' }}>Why this transaction triggered flags:</h4>
                  {scamResult.whyReasons.map((why, i) => (
                    <div key={i} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', fontSize: '0.86rem', color: '#7f1d1d' }}>
                      <strong>{scamResult.redFlags[i]}</strong>
                      <p style={{ margin: '4px 0 0' }}>{why}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 6: PROPERTY TAX CALCULATOR
          ========================================================================= */}
      {activeTab === 'tax_calc' && (
        <div className="card">
          <h2 className="card-title">Pakistan Real-Estate Tax & Duty Estimator</h2>
          <p className="card-hint">
            Calculates FBR Section 236C (Seller Advance Tax), Section 236K (Buyer Advance Tax), Provincial Stamp Duty, and Municipal TMA fees.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <label className="form-field">
              <span className="form-label">Property Consideration (PKR) *</span>
              <input
                type="number"
                min="100000"
                step="500000"
                className="form-input"
                value={taxInput.propertyValue}
                onChange={(e) => setTaxInput({ ...taxInput, propertyValue: Number(e.target.value) })}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Jurisdiction</span>
              <select
                className="form-input"
                value={taxInput.jurisdiction}
                onChange={(e) => setTaxInput({ ...taxInput, jurisdiction: e.target.value })}
              >
                <option value="Punjab">Punjab</option>
                <option value="Sindh">Sindh</option>
                <option value="ICT">Islamabad (ICT)</option>
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">Seller ATL Status</span>
              <select
                className="form-input"
                value={taxInput.sellerStatus}
                onChange={(e) => setTaxInput({ ...taxInput, sellerStatus: e.target.value })}
              >
                <option value="filer">Active Filer (3%)</option>
                <option value="late_filer">Late Filer (6%)</option>
                <option value="non_filer">Non-Filer (10%)</option>
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">Buyer ATL Status</span>
              <select
                className="form-input"
                value={taxInput.buyerStatus}
                onChange={(e) => setTaxInput({ ...taxInput, buyerStatus: e.target.value })}
              >
                <option value="filer">Active Filer (3%)</option>
                <option value="late_filer">Late Filer (7%)</option>
                <option value="non_filer">Non-Filer (12%)</option>
              </select>
            </label>
          </div>

          <button className="btn btn-primary" onClick={handleCalculateTax} disabled={loadingTax}>
            {loadingTax ? 'Computing Tax…' : 'Calculate Applicable Taxes & Fees'}
          </button>

          {taxResult && (
            <div style={{ marginTop: '24px' }}>
              <div className="stat-grid" style={{ marginBottom: '16px' }}>
                <div className="stat-card stat-default">
                  <span className="stat-label">Total Estimated Tax / Fees</span>
                  <strong className="stat-value">{money(taxResult.totalEstimatedTax)}</strong>
                </div>
                <div className="stat-card stat-info">
                  <span className="stat-label">Seller Responsibility (236C)</span>
                  <strong className="stat-value">{money(taxResult.sellerTotal)}</strong>
                </div>
                <div className="stat-card stat-warning">
                  <span className="stat-label">Buyer Total (236K + Stamp + TMA)</span>
                  <strong className="stat-value">{money(taxResult.buyerTotal)}</strong>
                </div>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tax Head</th>
                      <th>Payable By</th>
                      <th>Effective Rate</th>
                      <th>Amount (PKR)</th>
                      <th>Governing Statute</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxResult.breakdown.map((item, idx) => (
                      <tr key={idx}>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.party}</td>
                        <td><span className="badge badge-info">{item.rate}</span></td>
                        <td><strong>{money(item.amount)}</strong></td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.statutoryRef}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card-hint" style={{ marginTop: '12px' }}>
                💡 <em>{taxResult.disclaimer}</em>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 7: LEGAL NOTICES & DRAFTS
          ========================================================================= */}
      {activeTab === 'letters' && (
        <div className="card">
          <h2 className="card-title">Informational Legal Letter & Notice Generator</h2>
          <p className="card-hint">
            Draft standardized legal notices for tenancy default, lease termination, bayana confirmations, and advocate consultation briefs under Pakistani legal standards.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <label className="form-field" style={{ gridColumn: 'span 2' }}>
              <span className="form-label">Notice Template Type</span>
              <select
                className="form-input"
                value={letterParams.templateType}
                onChange={(e) => setLetterParams({ ...letterParams, templateType: e.target.value })}
              >
                <option value="rent_default_notice">Rent Default & Demand Notice (Tenancy)</option>
                <option value="vacate_notice">30-Day Notice of Lease Expiry & Vacant Possession</option>
                <option value="bayana_confirmation">Bayana (Earnest Money) Memorandum of Understanding</option>
                <option value="lawyer_brief">High Court Advocate Consultation Brief</option>
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">Sender Name</span>
              <input
                className="form-input"
                placeholder="Your full name"
                value={letterParams.senderName}
                onChange={(e) => setLetterParams({ ...letterParams, senderName: e.target.value })}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Sender CNIC</span>
              <input
                className="form-input"
                placeholder="e.g. 35201-1234567-1"
                value={letterParams.senderCnic}
                onChange={(e) => setLetterParams({ ...letterParams, senderCnic: e.target.value })}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Recipient Name</span>
              <input
                className="form-input"
                placeholder="Opposing party / Tenant name"
                value={letterParams.recipientName}
                onChange={(e) => setLetterParams({ ...letterParams, recipientName: e.target.value })}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Recipient CNIC</span>
              <input
                className="form-input"
                placeholder="Recipient CNIC"
                value={letterParams.recipientCnic}
                onChange={(e) => setLetterParams({ ...letterParams, recipientCnic: e.target.value })}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Property Address</span>
              <input
                className="form-input"
                placeholder="Street address, sector, phase"
                value={letterParams.propertyAddress}
                onChange={(e) => setLetterParams({ ...letterParams, propertyAddress: e.target.value })}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Monthly Rent / Agreed Price (PKR)</span>
              <input
                type="number"
                min="0"
                className="form-input"
                value={letterParams.rentOrPrice}
                onChange={(e) => setLetterParams({ ...letterParams, rentOrPrice: Number(e.target.value) })}
              />
            </label>
          </div>

          <button className="btn btn-primary" onClick={handleGenerateLetter}>
            Generate Legal Draft
          </button>

          {generatedLetter && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{generatedLetter.subject}</h3>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLetter.fullDraft);
                    setCopiedNotice(true);
                    setTimeout(() => setCopiedNotice(false), 2500);
                  }}
                >
                  {copiedNotice ? '✓ Copied to Clipboard' : '📋 Copy Draft Text'}
                </button>
              </div>

              <textarea
                className="form-input"
                rows={16}
                readOnly
                value={generatedLetter.fullDraft}
                style={{ fontFamily: 'monospace', fontSize: '0.88rem', background: 'var(--bg-accent)' }}
              />

              <div className="card-hint" style={{ marginTop: '10px' }}>
                ⚖️ <em>{generatedLetter.disclaimer}</em>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
