export function generateDueDiligenceChecklist(params = {}) {
  const {
    province = 'Punjab',
    city = 'Lahore',
    propertyType = 'House',
    sellerType = 'Direct Owner',
    ownershipDoc = 'Registry',
    society = 'None',
    hasMortgage = false,
    hasLitigation = false,
    possessionStatus = 'Owner Occupied',
  } = params;

  const checklist = [];

  // 1. Title Deed / Ownership Document Verification
  if (ownershipDoc === 'Registry' || ownershipDoc === 'Sale Deed') {
    checklist.push({
      item: 'Registered Sale Deed (Baye-Nama) Verification',
      priority: 'Mandatory',
      whyItMatters: 'Confirms that the seller is the recorded legal owner and that the title deed was genuinely registered in the official government Bahi (Register).',
      whereToVerify: `Sub-Registrar Office of ${city} / District Revenue Record Room`,
      redFlags: 'Fake stamp paper, missing registration numbers, unreadable official seal, or discrepancy in volume/book number.',
    });
  } else if (ownershipDoc === 'Allotment Letter' || society !== 'None') {
    checklist.push({
      item: 'Original Allotment / Transfer Letter Verification',
      priority: 'Mandatory',
      whyItMatters: 'Confirms that the plot/property is genuinely allotted by the housing authority without duplicate allotment or cancelled status.',
      whereToVerify: `${society !== 'None' ? society : 'Housing Authority / Scheme'} Head Office (Transfer & Record Directorate)`,
      redFlags: 'Seller presenting photocopies only, un-balloted file without possession guarantee, or pending development surcharges.',
    });
  }

  // 2. Revenue Record / Fard Malkiat (for provincial land)
  if (province === 'Punjab') {
    checklist.push({
      item: 'Digital Fard-e-Malkiat (Record of Rights) Verification',
      priority: 'Mandatory',
      whyItMatters: 'Proves current ownership in the computerized land database and reflects whether any bank mortgage or civil court stay order is registered.',
      whereToVerify: `Arazi Record Center (PLRA) ${city} or official Zameen portal`,
      redFlags: 'Red ink remarks in the Kaifiyat (Remarks) column, frozen (munjamid) account, or mismatched area shares.',
    });
  } else if (province === 'Sindh') {
    checklist.push({
      item: 'Deh Form VII / VF-VII (Village Form 7) Verification',
      priority: 'Mandatory',
      whyItMatters: 'Official land revenue ownership register maintained by the Sindh Board of Revenue / City Survey Office.',
      whereToVerify: `Mukhtiarkar (Revenue) Office / City Survey Department in ${city}`,
      redFlags: 'Entries with un-attested corrections, disputed survey numbers, or missing micro-film verification.',
    });
  } else if (province === 'ICT') {
    checklist.push({
      item: 'CDA / ICT Land Revenue Record Verification',
      priority: 'Mandatory',
      whyItMatters: 'Confirms sector approval, layout plan adherence, and municipal clearance.',
      whereToVerify: 'CDA One Window Directorate (G-7/2 Islamabad) / Deputy Commissioner Office',
      redFlags: 'Sub-divided plots without CDA bifurcation approval; encroached right-of-way.',
    });
  }

  // 3. Seller Verification & Identity
  if (sellerType === 'Power of Attorney') {
    checklist.push({
      item: 'Registered Power of Attorney (Mukhtar-Nama) Verification',
      priority: 'Critical Risk',
      whyItMatters: 'A Power of Attorney terminates automatically upon the death or mental incapacity of the principal. Many Pakistani property frauds involve selling on expired or forged POAs.',
      whereToVerify: 'Issuing Sub-Registrar Office; MOFA (if executed abroad by Overseas Pakistani); Direct video call & Nadra Verisys with the actual owner.',
      redFlags: 'Seller refusing direct live contact with the original principal; POA executed more than 2 years ago without fresh confirmation.',
    });
  } else if (sellerType === 'Inheritor / Heir') {
    checklist.push({
      item: 'Succession Certificate & Mutation of Inheritance (Intiqal-e-Wirasat)',
      priority: 'Mandatory',
      whyItMatters: 'Ensures that all legal heirs (including female heirs / daughters / widows) have received their lawful Shariat shares and consented to the sale.',
      whereToVerify: 'Civil Court / NADRA Succession Facilitation Center & Revenue Patwari',
      redFlags: 'One male heir attempting to sell without written relinquishment deeds (Dastbardari) from sisters or other co-heirs.',
    });
  } else {
    checklist.push({
      item: 'Seller NADRA Biometric Identity (Verisys) Check',
      priority: 'Mandatory',
      whyItMatters: 'Eliminates impostor fraud where a person impersonates the real landowner using a fake CNIC.',
      whereToVerify: 'NADRA e-Sahulat / Biometric Kiosk at the Sub-Registrar or Society Transfer Counter',
      redFlags: 'Mismatch in father name, expired CNIC, or seller avoiding in-person biometric scanning.',
    });
  }

  // 4. Physical Site Inspection & Demarcation (Nishandahi)
  checklist.push({
    item: 'Physical On-Site Demarcation & Neighborhood Inquiries',
    priority: 'Mandatory',
    whyItMatters: 'Verifies that the land physically exists on the exact coordinates and is not encroached by adjacent plots, graveyards, high-tension wires, or illegal occupants.',
    whereToVerify: `On-site physical visit with Local Revenue Patwari / Society Field Surveyor`,
    redFlags: 'Third parties physically residing or running businesses on the property; neighbor claiming a boundary dispute.',
  });

  // 5. Encumbrance & Non-Encumbrance Certificate (NEC)
  checklist.push({
    item: 'Non-Encumbrance Certificate (NEC) / 12-Year Search Report',
    priority: 'Mandatory',
    whyItMatters: 'Confirms that the property has not been pledged to a commercial bank, mortgaged, or sold to another buyer in the preceding 12 years.',
    whereToVerify: `Sub-Registrar Office (via a licensed property advocate) / Town Office`,
    redFlags: 'Registered charges, un-redeemed bank mortgages, or prior registered agreements to sell in favor of third parties.',
  });

  // 6. Utility Dues & Municipal NOC
  checklist.push({
    item: 'Clearance of Utilities (Electricity, Gas, Water) & Property Tax',
    priority: 'Important',
    whyItMatters: 'Accumulated commercial electricity, Sui gas, or Excise property tax arrears remain attached to the property and can cost hundreds of thousands of PKR.',
    whereToVerify: `LESCO/K-Electric/IESCO, SNGPL/SSGC, WASA/KWSC, and Provincial Excise & Taxation Department`,
    redFlags: 'Outstanding multi-year property tax bills or electricity meters running on un-regularized temporary connections.',
  });

  // 7. Approved Building Plan & Completion Certificate (if constructed)
  if (propertyType === 'House' || propertyType === 'Apartment' || propertyType === 'Commercial') {
    checklist.push({
      item: 'Approved Building Plan (Naqsha) & Completion Certificate',
      priority: 'Important',
      whyItMatters: 'Guarantees that the structure was built according to municipal bylaws. Unapproved upper floors or illegal basement expansions can be demolished by LDA/KDA/CDA.',
      whereToVerify: `Municipal Corporation / Development Authority Building Control Directorate`,
      redFlags: 'Building violation notices, sealed portions, or lack of a formal occupancy/completion certificate.',
    });
  }

  // 8. Litigation Check
  checklist.push({
    item: 'District Civil & High Court Litigation Search',
    priority: hasLitigation ? 'Critical' : 'Important',
    whyItMatters: 'Ensures the property is not embroiled in an active civil suit, partition suit, or subject to a court injunction (stay order under Order 39 CPC).',
    whereToVerify: `District Civil Courts & Provincial High Court online cause lists / Advocate Search`,
    redFlags: 'Active stay orders; court notices pasted on the property; ongoing inheritance disputes.',
  });

  return {
    success: true,
    propertySummary: {
      province,
      city,
      propertyType,
      sellerType,
      ownershipDoc,
      society,
      possessionStatus,
    },
    totalVerificationPoints: checklist.length,
    checklist,
    disclaimer:
      'This checklist provides general due-diligence guidelines for Pakistani real estate. Always engage a licensed Pakistani property lawyer to inspect the physical record registers before handing over substantial payments.',
  };
}
