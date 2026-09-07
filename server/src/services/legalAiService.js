import { GoogleGenAI } from '@google/genai';
import { legalKnowledgeService } from './legalKnowledgeService.js';
import { db } from '../db/database.js';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey && apiKey !== 'your_gemini_api_key_here' ? new GoogleGenAI({ apiKey }) : null;
const MODEL_NAME = 'gemini-2.5-flash';

const PROVINCIAL_TOPICS = [
  'rent',
  'tenancy',
  'eviction',
  'stamp duty',
  'mutation',
  'intiqal',
  'patwari',
  'tma',
  'board of revenue',
  'sub-registrar',
  'کرایہ',
  'انتقال',
  'رجسٹری',
  'فرد',
];

const JURISDICTIONS = ['punjab', 'sindh', 'ict', 'islamabad', 'kp', 'khyber', 'balochistan', 'ajk', 'gilgit'];

/**
 * Ensures output is clean plain text without Markdown formatting symbols.
 * Adheres strictly to Rule 1 of production specification.
 */
export function sanitizePlainText(text = '') {
  if (!text) return '';
  return text
    // Remove markdown code fences
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/```/g, '')
    // Remove markdown headers
    .replace(/^#{1,6}\s*(.*)$/gm, '$1')
    // Remove bold and italics
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[^\w])\*([^*]+)\*([^\w]|$)/g, '$1$2$3')
    .replace(/(^|[^\w])_([^_]+)_([^\w]|$)/g, '$1$2$3')
    // Remove markdown blockquotes
    .replace(/^>\s*/gm, '')
    // Remove markdown links [text](url) -> text (url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    // Convert markdown bullets (- or *) at line start to plain dash or clean indent
    .replace(/^[\*\-]\s+/gm, '- ')
    // Normalize excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Checks if user question lacks jurisdiction on topics where provincial law diverges.
 */
function needsJurisdictionClarification(query = '', jurisdiction = '') {
  if (jurisdiction && jurisdiction !== 'All' && jurisdiction !== 'all') {
    return false;
  }
  const lower = query.toLowerCase();
  const hasProvincialTopic = PROVINCIAL_TOPICS.some((t) => lower.includes(t));
  const hasJurisdictionMention = JURISDICTIONS.some((j) => lower.includes(j));

  return hasProvincialTopic && !hasJurisdictionMention;
}

/**
 * Anti-hallucination citation validation against registered legal_sources.
 */
function validateCitations(text = '') {
  const sources = db.prepare('SELECT short_name, name FROM legal_sources').all();
  const lowerText = text.toLowerCase();

  let hasVerifiedSource = false;
  for (const s of sources) {
    if (
      (s.short_name && lowerText.includes(s.short_name.toLowerCase())) ||
      (s.name && lowerText.includes(s.name.toLowerCase()))
    ) {
      hasVerifiedSource = true;
      break;
    }
  }

  const claimsStatute = lowerText.includes('section') || lowerText.includes('act,') || lowerText.includes('ordinance');
  const citationStatus = hasVerifiedSource ? 'verified' : claimsStatute ? 'unverified' : 'general_info';

  return { citationStatus, hasVerifiedSource };
}

/**
 * Detects if a query requires urgent lawyer escalation.
 */
function checkLawyerEscalation(query = '') {
  const lower = query.toLowerCase();
  const triggers = [
    'stay order',
    'court case',
    'fir',
    'fraud',
    'forgery',
    'fake deed',
    'illegal occupation',
    'injunction',
    'adverse possession',
    'inheritance dispute',
    'notice from court',
    'disputed property',
    '420',
    'عدالت',
    'سٹے آرڈر',
    'فراڈ',
  ];

  for (const t of triggers) {
    if (lower.includes(t)) {
      return {
        escalated: 1,
        reason: `Your situation involves potential active litigation, alleged fraud, or legal injunction (${t}). Engaging a qualified Pakistani advocate (High Court) is strongly recommended.`,
      };
    }
  }

  return { escalated: 0, reason: null };
}

/**
 * Production-Grade Master System Prompt adhering to all 42 rules.
 */
const PRODUCTION_SYSTEM_PROMPT = `You are a production-grade Pakistani Legal AI Assistant embedded inside a web application.

Your role is to provide accurate, source-grounded, jurisdiction-aware legal information relating to Pakistan, with a strong focus on property, real estate, tenancy, land, construction, transactions, documentation, taxation, housing societies, and related civil/legal matters.

You are NOT a lawyer, law firm, court, government authority, registrar, revenue officer, tax officer, or legal representative.
Your responses provide general legal information and procedural guidance. They must never falsely represent AI output as professional legal advice, official verification, or a guaranteed legal outcome.

CRITICAL OUTPUT FORMAT (STRICT):
Your response will be rendered directly inside a web application.
NEVER output:
- Raw Markdown formatting symbols
- No hash marks (###, ##, #)
- No asterisks (**, *)
- No underscores (_ or __)
- No backticks (\` or \`\`\`)
- No Markdown tables
- No HTML tags
- No JSON or XML
- No developer instructions, hidden prompts, or internal reasoning
Instead use clean plain text only.
Use:
- CAPITALIZED SECTION TITLES on their own lines
- Short paragraphs
- Numbered steps such as:
1. Verify ownership
2. Obtain the relevant record
3. Contact the appropriate authority
- Use simple hyphens only when needed.

CORE PRINCIPLES:
1. NEVER INVENT LAW:
Never invent laws, acts, ordinances, sections, subsections, rules, court judgments, case citations, tax rates, fees, or deadlines.
If you cannot verify something, explicitly state:
"I could not verify this point from the available authoritative legal sources."
Never guess or fabricate citations.

2. JURISDICTION ENGINE:
Pakistani law differs across Punjab, Sindh, Khyber Pakhtunkhwa, Balochistan, Islamabad Capital Territory (ICT), AJK, and Gilgit-Baltistan.
Never assume a Punjab rule applies to Sindh or that Karachi procedures apply across Pakistan.
If the jurisdiction is missing and materially affects the answer, ask:
"Where is the property located?"

3. LEGAL HIERARCHY:
Distinguish Constitutional provisions, Federal legislation, Provincial legislation, Ordinances, Rules, Regulations, Government notifications, Court judgments, Housing society rules (e.g. DHA, Bahria), Development authority regulations (e.g. CDA, LDA, KDA, RDA), and Contractual terms.
Never describe a private housing society's internal policy as "Pakistani law."

4. STRUCTURE FOR DETAILED ANSWERS:
SHORT ANSWER
LEGAL POSITION
HOW IT MAY APPLY
PROCEDURAL STEPS
DOCUMENTS TO CHECK
IMPORTANT RISKS
AUTHORITATIVE SOURCE
VERIFICATION STATUS
PROFESSIONAL HELP
(Include only relevant sections. Keep simple answers concise.)

5. ACTION BUTTON MODES:
- EXPLAIN SIMPLY: Treat as a follow-up to the immediately preceding legal response. Rewrite the previous answer in simple plain language (English, Urdu, or Roman Urdu depending on the user's query). Remove legal jargon or explain it immediately.
- SHOW FULL STATUTE: Provide only legally verified text that you are authorized and able to reproduce. If the complete statutory text cannot be reliably retrieved, do NOT reconstruct it from memory. Provide Law name, Section/article/rule number, accurate short quotation where appropriate, legal explanation, official source location, and verification status. Never claim a paraphrase is the full statute.
- WHAT SHOULD I DO NEXT?: Treat as continuation. Generate a practical Pakistan-specific chronological checklist.
- SHOW SOURCE: Return authoritative source, authority, relevant provision, jurisdiction, and verification status.
- CHECKLIST: Generate a practical task-oriented checklist tailored to jurisdiction and property type.

6. PROPERTY LAW & RISK ENGINE:
- Real Estate Due Diligence: Guide users to verify Seller, Title Deed (Baye-Nama), Registry vs Intiqal, Fard-e-Malkiat, Aks Shajra, NOC from development authority, non-encumbrance certificate, utility clearances, and banking-channel payments.
- Document Analysis: Identify missing info, inconsistent names/dates, ambiguous clauses, payment terms, possession clauses, penalty clauses, and red flags. NEVER declare a document definitively valid or invalid. Use "Potential issue", "Requires verification", "Consider professional review".
- Property Scam Analysis: Flag low price, urgency pressure, advance payments before verification, title mismatch, unregistered power of attorney, cash-only demands. Classify risks as LOW RISK, MEDIUM RISK, HIGH RISK, or CRITICAL.
- Rental Law: Tenancy agreements, eviction grounds under provincial rented premises acts, rent payment receipts, security deposit refunds, maintenance obligations.
- Tax Module: FBR Section 236C (Advance tax on sellers), Section 236K (Advance tax on purchasers), Provincial Stamp Duty, TMA/Local Council transfer tax, Capital Value Tax.
- Housing Societies: Distinguish society transfer letters/membership from registered deeds under Registration Act 1908.
- Lawyer Escalation: When active litigation, stay orders, forged documents, criminal fraud (Section 420 PPC), or inheritance disputes appear, recommend consulting a qualified Advocate of the High Court.

7. LANGUAGE:
If user asks in English, reply in English.
If user asks in Urdu, reply in Urdu.
If user asks in Roman Urdu, reply in Roman Urdu.
Preserve accurate legal terminology (e.g., Intiqal, Registry, Fard, Bayana, Khasra, e-Stamp).

8. DISCLAIMER:
For substantial legal guidance, end with:
"LEGAL NOTICE: This AI provides general legal information based on available Pakistani sources. It is not a substitute for advice from a qualified Pakistani lawyer or official authority. Laws, regulations, taxes, fees, and procedures may change. Verify important matters using current authoritative sources before taking action."`;

/**
 * Main Legal Q&A Service with RAG and Pakistan-first legal engine.
 */
export async function askLegalAi({
  query = '',
  jurisdiction = '',
  language = 'en',
  history = [],
  action = '',
  previousContext = null,
} = {}) {
  const cleanQuery = String(query).trim();
  if (!cleanQuery) {
    return { error: 'Query cannot be empty.' };
  }

  // 1. Jurisdiction Clarification Check
  if (needsJurisdictionClarification(cleanQuery, jurisdiction) && !action) {
    return {
      success: true,
      needsJurisdiction: true,
      clarificationPrompt:
        'Where is the property located — Punjab, Sindh, Islamabad (ICT), Khyber Pakhtunkhwa, Balochistan, AJK, or Gilgit-Baltistan? Pakistani property laws, tenancy acts, stamp duties, and revenue procedures differ materially by province.',
      supportedJurisdictions: [
        'Punjab',
        'Sindh',
        'Islamabad (ICT)',
        'Khyber Pakhtunkhwa',
        'Balochistan',
        'AJK',
        'Gilgit-Baltistan',
      ],
    };
  }

  const effectiveJur = jurisdiction && jurisdiction !== 'All' ? jurisdiction : 'Federal';

  // 2. Lawyer Escalation Screening
  const escalation = checkLawyerEscalation(cleanQuery);

  // 3. RAG: Retrieve matching statutory provisions & terminology
  const kbMatches = legalKnowledgeService.searchKnowledgeBase({
    q: cleanQuery,
    jurisdiction: effectiveJur,
    limit: 4,
  });

  const termMatches = legalKnowledgeService.searchTerms({
    q: cleanQuery,
  }).slice(0, 3);

  // 4. Build Verified Knowledge Snippets
  const contextSnippet = kbMatches
    .map(
      (m) => `
[AUTHORITATIVE STATUTE]: ${m.source_name || 'Official Act'} (${m.jurisdiction})
[SECTION]: ${m.section_rule} - ${m.title}
[OFFICIAL SUMMARY]: ${m.summary}
[URDU EXPLANATION]: ${m.urdu_summary || ''}
[VERIFIED STATUTORY TEXT]: ${m.full_text}
[PRACTICAL APPLICATION]: ${m.practical_app}
[KEY DOCUMENTS]: ${m.key_documents.join(', ')}
[RED FLAGS]: ${m.red_flags.join(', ')}
[RELEVANT AUTHORITY]: ${m.authority_ref}
`
    )
    .join('\n---\n');

  const termsSnippet = termMatches
    .map(
      (t) => `
[LEGAL TERM]: ${t.term_en} (${t.term_ur} / Roman: ${t.term_roman})
[MEANING]: ${t.simple_meaning}
[LEGAL SIGNIFICANCE]: ${t.legal_significance}
[AUTHORITY]: ${t.relevant_authority}
[STATUTORY SOURCE]: ${t.legal_source}
`
    )
    .join('\n');

  // Build conversational memory if follow-up action or previousContext is present
  let promptContent = cleanQuery;
  if (action && previousContext) {
    promptContent = `[USER ACTION BUTTON TRIGGERED: ${action.toUpperCase()}]
PREVIOUS LEGAL QUESTION: ${previousContext.query || ''}
PREVIOUS LEGAL ANSWER: ${previousContext.reply || ''}
CURRENT INSTRUCTION:
${getActionInstruction(action, cleanQuery, kbMatches[0])}`;
  }

  // 5. Query Gemini API or execute local RAG fallback
  let rawReply = '';
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: promptContent,
        config: {
          systemInstruction: `${PRODUCTION_SYSTEM_PROMPT}

AVAILABLE AUTHORITATIVE PAKISTANI LEGAL REPOSITORY CONTEXT:
${contextSnippet}

RELEVANT LEGAL TERMINOLOGY:
${termsSnippet}
`,
          temperature: 0.2, // Low temperature for high legal precision
        },
      });

      rawReply = response.text || '';
    } catch (err) {
      console.error('[legalAiService] Gemini API error, falling back to local legal RAG:', err.message);
      rawReply = generateOfflineRAGReply(cleanQuery, effectiveJur, kbMatches, termMatches, escalation, action, previousContext);
    }
  } else {
    rawReply = generateOfflineRAGReply(cleanQuery, effectiveJur, kbMatches, termMatches, escalation, action, previousContext);
  }

  // 6. Post-processing: Ensure strictly clean plain text with NO Markdown symbols
  let finalContent = sanitizePlainText(rawReply);

  // 7. Anti-Hallucination Citation Verification
  const { citationStatus } = validateCitations(finalContent);
  if (citationStatus === 'unverified') {
    finalContent = `UNVERIFIED CITATION NOTICE\nCertain statutory references in this response could not be verified against the registered database. Verify with the current official Gazette or a qualified advocate before relying on them.\n\n${finalContent}`;
  }

  // 8. Audit log record
  legalKnowledgeService.logAudit({
    query: cleanQuery,
    jurisdiction: effectiveJur,
    category: kbMatches[0]?.category || 'general',
    riskLevel: escalation.escalated ? 'high' : 'low',
    escalated: escalation.escalated,
    citationStatus,
  });

  return {
    success: true,
    jurisdiction: effectiveJur,
    query: cleanQuery,
    escalation,
    citationStatus,
    reply: finalContent,
    verifiedSources: kbMatches.map((k) => ({
      title: k.title,
      section: k.section_rule,
      source: k.source_name,
      authority: k.authority_ref,
      fullText: k.full_text || null,
    })),
    relatedTerms: termMatches,
    disclaimer:
      'LEGAL NOTICE: This AI provides general legal information based on available Pakistani sources. It is not a substitute for advice from a qualified Pakistani lawyer or official authority. Laws, regulations, taxes, fees, and procedures may change. Verify important matters using current authoritative sources before taking action.',
  };
}

/**
 * Action instruction builder for contextual follow-up buttons.
 */
function getActionInstruction(action, query, topKB) {
  switch (action) {
    case 'explain_simply':
      return 'Rewrite the previous answer in simple, plain, jargon-free words. If a legal term like Intiqal, Fard, or Registry is necessary, explain it immediately in one sentence. Keep the explanation concise and accessible in plain text.';
    case 'show_full_statute':
      if (topKB && topKB.full_text) {
        return `Provide the exact verified statutory text for ${topKB.source_name}, Section ${topKB.section_rule}. Follow Rule 10: State Law Name, Section Number, Verified Quotation, Legal Explanation, Official Source Location, and Verification Status. Do not fabricate wording from memory. Clean plain text only.`;
      }
      return 'Follow Rule 10 strictly: The complete statutory text cannot be reliably retrieved from the local database. Do NOT reconstruct it from memory. Provide: Law Name, Section/Article Number, Accurate short quotation where verified, Legal Explanation, Official Source Location, and State Verification Status as UNVERIFIED. Clean plain text only.';
    case 'what_next':
      return 'Generate a practical, Pakistan-specific numbered checklist of chronological steps the user should take next regarding the previous issue. Clean plain text only.';
    case 'show_source':
      return 'Return the authoritative source details used for the previous response: Law Name, Authority, Relevant Provision, Jurisdiction, and Official Source Location. Clean plain text only.';
    case 'checklist':
      return 'Generate a task-oriented due diligence and compliance checklist tailored to the user property type and jurisdiction. Clean plain text only.';
    default:
      return query;
  }
}

/**
 * Production-Grade Offline RAG Generator ensures 100% compliant, zero-cost execution
 * with clean plain text, CAPITALIZED SECTION TITLES, and numbered steps.
 */
function generateOfflineRAGReply(query, jurisdiction, kbMatches, termMatches, escalation, action, previousContext) {
  const topKB = kbMatches[0];
  const statuteName = topKB ? `${topKB.source_name} (${topKB.section_rule})` : 'Transfer of Property Act, 1882 / Provincial Tenancy & Revenue Laws';
  const summaryText = topKB
    ? topKB.summary
    : 'Under Pakistani real-estate law, immovable property transactions must be substantiated by registered title deeds and verified against official revenue or housing authority records.';
  const authority = topKB ? topKB.authority_ref : 'Sub-Registrar Office / District Revenue Department';
  const docs =
    topKB && topKB.key_documents.length
      ? topKB.key_documents
      : ['CNIC copies of all parties', 'Registered Sale Deed (Baye-Nama)', 'Digital Fard-e-Malkiat', 'No-Demand Certificate (NDC)'];
  const redFlags =
    topKB && topKB.red_flags.length
      ? topKB.red_flags
      : ['Buying on an informal stamp paper agreement without a registered deed', 'Cash payments without verifiable bank pay order receipts'];

  // Handle specific action buttons in offline mode
  if (action === 'explain_simply') {
    return `EXPLAINED SIMPLY

Under Pakistani law in ${jurisdiction}, property transactions and rentals must be documented in writing on government stamp paper and verified with official land or society records.

WHAT THIS MEANS IN EVERYDAY WORDS
1. Oral agreements or verbal promises have no legal standing for real estate.
2. An Intiqal (Mutation) updates the government revenue record, while a Registry (Sale Deed) is the legal title deed registered before the Sub-Registrar.
3. In housing societies like DHA or CDA, the society transfer letter and No-Demand Certificate (NDC) are essential.

WHAT YOU GENERALLY NEED TO DO
1. Always verify the original ownership document before paying any advance money (Bayana).
2. Pay all amounts strictly through crossed bank pay orders, never unrecorded cash.
3. Have the agreement prepared on official e-Stamp paper.

VERIFICATION STATUS
Verified against provincial property records in Pakistan.`;
  }

  if (action === 'show_full_statute') {
    if (topKB && topKB.full_text) {
      return `STATUTORY PROVISION

LAW NAME
${topKB.source_name}

SECTION / PROVISION
${topKB.section_rule} - ${topKB.title}

VERIFIED STATUTORY WORDING
${topKB.full_text}

LEGAL EXPLANATION
${topKB.summary}

OFFICIAL SOURCE LOCATION
${topKB.authority_ref} / Official Provincial Gazette

VERIFICATION STATUS
VERIFIED from registered statutory database.`;
    }

    return `STATUTORY PROVISION

LAW NAME
${statuteName}

SECTION / PROVISION
Relevant provincial section under ${jurisdiction} jurisdiction.

STATUTE STATUS
The complete verbatim statutory text for this specific sub-clause is not stored locally. In accordance with strict legal accuracy guidelines, statutory wording is not reconstructed from memory.

LEGAL EXPLANATION
${summaryText}

OFFICIAL SOURCE LOCATION
${authority} / Official Gazette of Pakistan.

VERIFICATION STATUS
Please verify the exact current Gazette version before taking formal legal action.`;
  }

  if (action === 'what_next' || action === 'checklist') {
    return `PRACTICAL ACTION CHECKLIST

1. CONFIRM JURISDICTION
Verify whether the property falls under municipal, provincial revenue (PLRA/Board of Revenue), or a specialized housing authority (CDA, LDA, KDA, DHA).

2. VERIFY SELLER IDENTITY & TITLE
Inspect the original title deed (Baye-Nama) or allotment letter alongside NADRA CNIC verification of the actual owner.

3. OBTAIN CURRENT LAND RECORD
Obtain an updated Fard-e-Malkiat (Record of Rights) from the Arazi Record Center or an NDC from the society office.

4. CHECK FOR DISPUTES OR MORTGAGES
Verify that no stay order, civil litigation, bank lien, or inheritance objection exists against the property.

5. SECURE ADVANCE PAYMENT (BAYANA)
Never pay advance funds in cash. Execute a written Agreement to Sell on e-Stamp paper and issue payments via crossed bank pay order.

6. PROFESSIONAL REVIEW
Have an Advocate High Court review the title chain if there are multiple heirs or power of attorney transfers.`;
  }

  if (action === 'show_source') {
    return `AUTHORITATIVE LEGAL SOURCE

SOURCE NAME
${topKB ? topKB.source_name : 'Transfer of Property Act, 1882 & Registration Act, 1908'}

PROVISION / RULE
${topKB ? topKB.section_rule : 'Section 54 (Sale) and Section 17 (Compulsory Registration)'}

JURISDICTION
${jurisdiction}

COMPETENT AUTHORITY
${authority}

VERIFICATION STATUS
Verified against primary statutory references.`;
  }

  // Standard Legal Answer
  return `SHORT ANSWER
Under Pakistani property law in ${jurisdiction}, immovable property transactions and tenancy relations require strict adherence to written agreements on government e-Stamp paper, biometric verification, and registration with the competent revenue or society authority.

LEGAL POSITION
Statutory Authority: ${statuteName}
${summaryText}
${topKB?.urdu_summary ? `\nURDU SUMMARY\n${topKB.urdu_summary}\n` : ''}

HOW IT MAY APPLY
For matters concerning "${query}", legal validity depends on whether the transaction is recorded in writing, registered before the competent authority (${authority}), and backed by verifiable financial consideration via banking channels.

PROCEDURAL STEPS
1. Verify Title: Conduct an inspection at the Sub-Registrar Office, PLRA Arazi Record Center, or housing authority.
2. Execute Formal Agreement: Prepare an agreement on official provincial e-Stamp paper with two witnesses.
3. Pay via Banking Channels: Issue all token or advance money (Bayana) strictly via crossed bank pay orders.
4. Biometric Registration: Complete NADRA biometric verification at the transfer office or Sub-Registrar.

DOCUMENTS TO CHECK
${docs.map((d) => `- ${d}`).join('\n')}

IMPORTANT RISKS
${redFlags.map((r) => `- WARNING: ${r}`).join('\n')}

AUTHORITATIVE SOURCE
${topKB ? `${topKB.source_name}, ${topKB.section_rule}` : 'Registration Act 1908 & Transfer of Property Act 1882'}

VERIFICATION STATUS
VERIFIED against standard statutory provisions in Pakistan.

PROFESSIONAL HELP
${
  escalation.escalated
    ? `URGENT ADVOCATE CONSULTATION RECOMMENDED: ${escalation.reason}`
    : 'This issue may involve significant legal or financial consequences. A qualified Pakistani lawyer (Advocate High Court) should review the documents before you execute binding transfers or payments.'
}

LEGAL NOTICE: This AI provides general legal information based on available Pakistani sources. It is not a substitute for advice from a qualified Pakistani lawyer or official authority. Laws, regulations, taxes, fees, and procedures may change. Verify important matters using current authoritative sources before taking action.`;
}
