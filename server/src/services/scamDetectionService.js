export function assessScamRisk(factors = {}) {
  const {
    priceDiscrepancy = false, // price unrealistically below market
    urgencyPressure = false, // pressure to transfer cash immediately / within 24 hours
    refusesVerification = false, // seller refuses ARC/Sub-Registrar in-person verification
    missingOriginalDocs = false, // seller has only photocopies or claims originals are lost
    nameMismatch = false, // name on CNIC differs from title document
    unregisteredPOA = false, // selling on an unregistered Power of Attorney
    cashOnlyDemand = false, // refuses pay order / banking channel
    unapprovedSociety = false, // scheme is not approved by LDA/CDA/RDA/KDA
    stayOrderClaim = false, // reports of court stay order or litigation
    multipleClaims = false, // reports of duplicate allotment or conflicting heirs
    thirdPartyPossession = false, // someone else is living in the house claiming tenancy or possession
  } = factors;

  let riskScore = 0;
  const redFlags = [];
  const whyReasons = [];

  if (refusesVerification) {
    riskScore += 35;
    redFlags.push('Seller or agent refuses in-person verification at the Sub-Registrar / Land Record Center.');
    whyReasons.push('Legitimate landowners have no reason to avoid official revenue record inspection. Refusal is one of the highest historical indicators of land fraud in Pakistan.');
  }

  if (missingOriginalDocs) {
    riskScore += 25;
    redFlags.push('Original title documents (Registry / Allotment Letter) are not presented; seller presents only photocopies.');
    whyReasons.push('Original deeds are often deposited with banks as collateral for mortgages or retained by real owners. Buying on photocopies without a verified lost-deed gazette and court inquiry carries severe risk.');
  }

  if (unregisteredPOA) {
    riskScore += 25;
    redFlags.push('Transaction relies on an unregistered Power of Attorney (Mukhtar-Nama).');
    whyReasons.push('Under Section 17 of the Registration Act 1908, a Power of Attorney authorizing the sale of immovable property must be compulsorily registered. An unregistered POA is inadmissible in court to transfer title.');
  }

  if (cashOnlyDemand) {
    riskScore += 20;
    redFlags.push('Seller insists on large cash payments and explicitly refuses crossed bank pay orders.');
    whyReasons.push('Un-banked cash payments eliminate financial audit trails, expose buyers to counterfeit notes, and violate anti-money laundering / tax compliance guidelines under FBR regulations.');
  }

  if (nameMismatch) {
    riskScore += 25;
    redFlags.push('Name or father name on the seller CNIC does not match the title deed.');
    whyReasons.push('Impostor fraud frequently relies on minor name variations or altered CNICs. Even a single letter difference requires a formal court deed of rectification (Tatmeem-Nama) before transfer.');
  }

  if (stayOrderClaim) {
    riskScore += 30;
    redFlags.push('Property is reportedly subject to a civil court injunction or stay order.');
    whyReasons.push('Any sale transaction conducted during an active court stay order violates the doctrine of Lis Pendens (Section 52 Transfer of Property Act 1882) and can be declared null and void by the court with contempt of court proceedings.');
  }

  if (urgencyPressure) {
    riskScore += 15;
    redFlags.push('Seller or broker creates extreme urgency ("must close within 24 hours or price doubles").');
    whyReasons.push('High-pressure tactics are designed to prevent the purchaser from completing standard 10-day revenue due-diligence checks.');
  }

  if (priceDiscrepancy) {
    riskScore += 15;
    redFlags.push('Quoted price is significantly (30% to 50%) below prevailing market rates in the vicinity.');
    whyReasons.push('Unrealistically cheap plots or houses often conceal severe defects such as pending demolitions, acquired land, dual allotments, or non-possession litigation.');
  }

  if (unapprovedSociety) {
    riskScore += 20;
    redFlags.push('Housing scheme lacks official NOC from the local development authority (e.g. LDA, CDA, RDA, SBCA).');
    whyReasons.push('Unapproved private housing schemes frequently sell land in excess of their actual acquired acreage, leading to delayed or impossible possession.');
  }

  if (multipleClaims || thirdPartyPossession) {
    riskScore += 25;
    redFlags.push('Third-party physical possession or conflicting ownership claims identified on-site.');
    whyReasons.push('Under Pakistani law, actual physical possession (Qabza) is 90% of ownership reality. Recovering possession from an entrenched illegal occupant can take 5 to 15 years in civil litigation.');
  }

  // Determine Risk Level
  let riskLevel = 'LOW';
  let badgeColor = 'success';
  let recommendation = 'Standard due diligence is recommended. Ensure execution of a registered sale deed on official e-stamp paper.';

  if (riskScore >= 60) {
    riskLevel = 'CRITICAL';
    badgeColor = 'danger';
    recommendation = 'DO NOT transfer funds or sign agreements. The transaction exhibits multiple critical warning signals. Retain a qualified property advocate immediately for comprehensive record inspection.';
  } else if (riskScore >= 35) {
    riskLevel = 'HIGH';
    badgeColor = 'danger';
    recommendation = 'Major potential red flags identified. Halt payments until original documents are verified directly at the issuing authority and biometric identity is confirmed.';
  } else if (riskScore >= 15) {
    riskLevel = 'MEDIUM';
    badgeColor = 'warning';
    recommendation = 'Exercise heightened caution. Demand written clarification, traceable pay order terms, and verify physical site demarcation with a licensed revenue patwari.';
  }

  return {
    success: true,
    riskScore,
    riskLevel,
    badgeColor,
    redFlagsCount: redFlags.length,
    redFlags,
    whyReasons,
    recommendation,
    disclaimer:
      'This risk assessment is based strictly on standard indicators of Pakistani real-estate dispute patterns. It is an automated risk-screening tool and does not constitute a formal legal opinion or criminal accusation against any party.',
  };
}
