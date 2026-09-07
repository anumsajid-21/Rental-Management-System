export function analyzeRealEstateDocument(text = '', docTypeHint = 'auto') {
  const content = String(text || '').trim();
  if (!content) {
    return {
      error: 'Please provide document text or upload an agreement for analysis.',
    };
  }

  const lower = content.toLowerCase();

  // Detect likely document type
  let detectedType = 'Agreement / Contract';
  if (lower.includes('tenan') || lower.includes('rent') || lower.includes('lease') || lower.includes('کرایہ')) {
    detectedType = 'Tenancy / Lease Agreement';
  } else if (lower.includes('bayana') || lower.includes('token') || lower.includes('earnest') || lower.includes('بیعانہ')) {
    detectedType = 'Bayana / Earnest Money Agreement';
  } else if (lower.includes('power of attorney') || lower.includes('mukhtar') || lower.includes('مختار')) {
    detectedType = 'Power of Attorney (Mukhtar-Nama)';
  } else if (lower.includes('sale deed') || lower.includes('baye') || lower.includes('بیع نامہ') || lower.includes('registry')) {
    detectedType = 'Sale Deed / Registry (Baye-Nama)';
  } else if (lower.includes('allotment') || lower.includes('transfer letter')) {
    detectedType = 'Allotment / Transfer Letter';
  }

  const clausesFound = [];
  const clausesMissing = [];
  const redFlags = [];
  const recommendations = [];

  // Check essential clauses
  // 1. Parties & CNICs
  if (lower.includes('cnic') || lower.includes('identity') || /\d{5}-\d{7}-\d{1}/.test(content)) {
    clausesFound.push({
      name: 'Parties Identification & CNIC Numbers',
      status: 'Present',
      detail: 'Parties appear identified with CNIC or identity documentation reference.',
    });
  } else {
    clausesMissing.push({
      name: 'Explicit CNIC Numbers',
      risk: 'High',
      detail: 'Neither CNIC numbers nor verified identity markers were detected. Pakistani property law requires verified Nadra CNICs of all parties.',
    });
    redFlags.push('Missing national identity (CNIC) numbers for buyer, seller, or landlord/tenant.');
  }

  // 2. Specific Property Description / Demarcation
  if (
    lower.includes('khasra') ||
    lower.includes('khewat') ||
    lower.includes('plot no') ||
    lower.includes('plot number') ||
    lower.includes('boundaries') ||
    lower.includes('bounded on') ||
    lower.includes('square yards') ||
    lower.includes('marla')
  ) {
    clausesFound.push({
      name: 'Property Identification & Metrics',
      status: 'Present',
      detail: 'Document contains specific plot/khasra numbers or dimensional metrics.',
    });
  } else {
    clausesMissing.push({
      name: 'Precise Property Demarcation & Boundaries',
      risk: 'High',
      detail: 'No specific Khasra, Khewat, Plot Number, or North/South/East/West boundaries were found. Vague descriptions can lead to serious boundary litigation.',
    });
    redFlags.push('Vague property description without definitive parcel or boundary demarcation.');
  }

  // 3. Consideration / Price / Rent in PKR
  if (lower.includes('pkr') || lower.includes('rupees') || lower.includes('rs.') || lower.includes('amount') || /\d+[\s,]*(lakh|crore|thousand)/i.test(content)) {
    clausesFound.push({
      name: 'Consideration / Payment Terms',
      status: 'Present',
      detail: 'Monetary consideration or rent schedule is mentioned.',
    });
  } else {
    clausesMissing.push({
      name: 'Definite Consideration & Currency',
      risk: 'Critical',
      detail: 'No clear statement of the total agreed price or rent in PKR was identified.',
    });
  }

  // 4. Banking Mode of Payment
  if (lower.includes('cheque') || lower.includes('pay order') || lower.includes('bank') || lower.includes('online transfer') || lower.includes('account')) {
    clausesFound.push({
      name: 'Banking Channel Payment Mode',
      status: 'Present',
      detail: 'References traceable bank instrument (cheque, pay order, or bank transfer).',
    });
  } else {
    redFlags.push('No mention of traceable banking channel (crossed cheque/pay order). FBR and Benami laws penalize untraceable cash property transactions.');
    recommendations.push('Ensure all payments are stipulated via crossed pay order or bank transfer with instrument numbers written in the deed.');
  }

  // 5. Possession & Date of Transfer
  if (lower.includes('possession') || lower.includes('hand over') || lower.includes('vacant') || lower.includes('قبضہ')) {
    clausesFound.push({
      name: 'Possession Clause',
      status: 'Present',
      detail: 'Addresses physical or symbolic delivery of possession.',
    });
  } else {
    clausesMissing.push({
      name: 'Possession Delivery Clause',
      risk: 'High',
      detail: 'Document does not state whether possession has been handed over or the exact date possession will be delivered.',
    });
  }

  // 6. Default, Forfeiture & Cancellation Clauses
  if (lower.includes('default') || lower.includes('forfeit') || lower.includes('cancel') || lower.includes('breach')) {
    clausesFound.push({
      name: 'Breach / Default Terms',
      status: 'Present',
      detail: 'Outlines consequences if either party defaults.',
    });
  } else {
    clausesMissing.push({
      name: 'Remedy Upon Breach / Default Clause',
      risk: 'Medium',
      detail: 'Lacks clarity on what happens if seller fails to execute the deed or buyer fails to make the final payment.',
    });
  }

  // 7. Witnesses & Attestation
  if (lower.includes('witness') || lower.includes('gawah') || lower.includes('گواہ') || lower.includes('witness 1') || lower.includes('witness 2')) {
    clausesFound.push({
      name: 'Witness Attestation Section',
      status: 'Present',
      detail: 'Identifies witnesses for legal attestation.',
    });
  } else {
    clausesMissing.push({
      name: 'Two Adult Witnesses with CNICs',
      risk: 'High',
      detail: 'Under Article 17 of Qanun-e-Shahadat Order 1984, financial and immovable property deeds require two male witnesses (or one male and two female witnesses) with CNICs.',
    });
    redFlags.push('Document lacks standard two-witness execution block.');
  }

  // Check specific high-risk words
  if (lower.includes('as is where is') && !lower.includes('title')) {
    redFlags.push('Contains "as is where is" clause without explicit title warranty, transferring hidden title defect risks to the buyer.');
  }

  if (lower.includes('blank cheque') || lower.includes('promissory note')) {
    redFlags.push('References blank cheques or undated promissory notes, which pose extreme financial and legal risk.');
  }

  if (lower.includes('power of attorney') && !lower.includes('registered')) {
    redFlags.push('Refers to Power of Attorney without citing Sub-Registrar registration number or MOFA attestation.');
  }

  // Determine overall document health
  let overallScore = 100;
  overallScore -= clausesMissing.length * 15;
  overallScore -= redFlags.length * 12;
  overallScore = Math.max(10, Math.min(100, overallScore));

  let healthBadge = 'Good';
  if (overallScore < 50) healthBadge = 'High Risk / Incomplete';
  else if (overallScore < 75) healthBadge = 'Needs Revision';

  recommendations.push('Verify title at the relevant Arazi Record Center (PLRA) or Sub-Registrar before signing.');
  recommendations.push('Ensure document is executed on lawful provincial e-Stamp paper with biometric verification.');

  return {
    success: true,
    detectedType,
    overallScore,
    healthBadge,
    clausesFound,
    clausesMissing,
    redFlags,
    recommendations,
    disclaimer:
      'This document contains apparent issues and informational observations that should be verified by a qualified Pakistani lawyer or the relevant revenue authority. This tool does not guarantee legal validity.',
  };
}
