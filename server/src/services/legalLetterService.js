export function generateLegalLetterDraft({
  templateType = 'rent_default_notice',
  senderName = '',
  senderCnic = '',
  recipientName = '',
  recipientCnic = '',
  propertyAddress = '',
  city = 'Lahore',
  province = 'Punjab',
  rentOrPrice = 0,
  dateOfAgreement = '',
  details = '',
} = {}) {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const DISCLAIMER_HEADER = `================================================================================
⚠️ AI-GENERATED INFORMATIONAL DRAFT
Review by a qualified Pakistani advocate before signing, dispatching, or relying upon it.
================================================================================\n\n`;

  let subject = '';
  let body = '';

  switch (templateType) {
    case 'rent_default_notice':
      subject = `LEGAL NOTICE: Demand for Payment of Overdue Rent Arrears under ${
        province === 'Sindh'
          ? 'Sindh Rented Premises Ordinance 1979'
          : province === 'Punjab'
          ? 'Punjab Rented Premises Act 2009'
          : 'Applicable Tenancy Laws'
      } for Property at ${propertyAddress}`;
      body = `To,
${recipientName || '[Tenant Name]'}
CNIC No: ${recipientCnic || '[Tenant CNIC]'}
Resident/Occupant: ${propertyAddress || '[Property Address]'}, ${city}.

From,
${senderName || '[Landlord Name]'}
CNIC No: ${senderCnic || '[Landlord CNIC]'}
Address: [Landlord Contact Address]

Date: ${today}

SUBJECT: FORMAL DEMAND NOTICE FOR OUTSTANDING RENT ARREARS

Dear Sir/Madam,

1. That you are in lawful tenancy of the premises situated at "${propertyAddress || '[Property Address]'}" under a tenancy agreement dated ${dateOfAgreement || '[Date of Agreement]'} at an agreed monthly rent of PKR ${Number(rentOrPrice).toLocaleString()} per month.

2. That under the covenants of the said tenancy agreement and the statutory provisions of the ${
        province === 'Punjab' ? 'Punjab Rented Premises Act 2009' : 'Sindh Rented Premises Ordinance 1979'
      }, you were obligated to pay the monthly rent on or before the due date of each calendar month.

3. That you have defaulted in the payment of rent for the period of [Specify Months, e.g. July - August 2026], amounting to total outstanding rent arrears of PKR ${Number(rentOrPrice).toLocaleString()}. Additional details: ${details || 'Continuous non-payment despite oral reminders.'}

4. You are hereby formally called upon through this Notice to clear the entire outstanding amount within 15 (fifteen) days from the receipt hereof, failing which I shall be constrained to institute formal eviction proceedings before the Rent Tribunal / Rent Controller seeking your immediate eviction from the demised premises and recovery of unpaid arrears along with statutory penalties and legal costs entirely at your risk and expense.

Yours faithfully,

_______________________
${senderName || '[Landlord Name]'}
Landlord / Authorized Owner
Phone: [Contact Number]
`;
      break;

    case 'vacate_notice':
      subject = `NOTICE OF TERMINATION OF TENANCY AND DEMAND FOR VACANT POSSESSION`;
      body = `To,
${recipientName || '[Tenant Name]'}
CNIC No: ${recipientCnic || '[Tenant CNIC]'}
Occupant: ${propertyAddress || '[Property Address]'}, ${city}.

From,
${senderName || '[Landlord Name]'}
CNIC No: ${senderCnic || '[Landlord CNIC]'}

Date: ${today}

SUBJECT: 30-DAY STATUTORY NOTICE TO VACATE PREMISES UPON EXPIRY OF TENANCY LEASE

Dear Sir/Madam,

1. That the tenancy granted to you in respect of "${propertyAddress || '[Property Address]'}" is expiring on [Date of Expiry, e.g. 30th September 2026].

2. Please be advised that the undersigned does not intend to extend or renew the tenancy upon expiration of the ongoing term due to [Reason, e.g. Personal bona fide requirement / Renovation].

3. You are hereby requested to hand over quiet, peaceful, and vacant possession of the demised premises to the undersigned on or before [Target Vacate Date], along with all keys and proof of fully cleared utility bills (LESCO/K-Electric, SNGPL/SSGC, WASA).

4. Upon verification of vacant possession and inspection of the premises against any physical damages, your security deposit shall be settled and refunded in accordance with the tenancy agreement.

Yours faithfully,

_______________________
${senderName || '[Landlord Name]'}
`;
      break;

    case 'bayana_confirmation':
      subject = `CONFIRMATION MEMORANDUM OF BAYANA (EARNEST MONEY) AND TRANSACTION TIMELINE`;
      body = `MEMORANDUM OF BAYANA / TOKEN CONFIRMATION

DATE: ${today}
LOCATION: ${city}, ${province}

PARTIES:
1. SELLER: ${senderName || '[Seller Name]'}, CNIC No: ${senderCnic || '[Seller CNIC]'}, Resident of [Seller Address].
2. PURCHASER: ${recipientName || '[Purchaser Name]'}, CNIC No: ${recipientCnic || '[Purchaser CNIC]'}, Resident of [Purchaser Address].

PROPERTY SPECIFICATION:
All that piece and parcel of property situated at:
"${propertyAddress || '[Complete Property Description / Plot / Khasra No.]'}", measuring [Area, e.g. 1 Kanal / 500 Sq Yds].

TERMS OF UNDERSTANDING:
1. TOTAL SALE CONSIDERATION: PKR [Total Price, e.g. 25,000,000/-] (Pakistani Rupees only).
2. EARNEST MONEY (BAYANA) PAID TODAY: PKR ${Number(rentOrPrice).toLocaleString()} paid via Bank Pay Order No: [Pay Order No] drawn on [Bank Name].
3. BALANCE PAYMENT: The balance sum shall be paid on or before [Completion Date, e.g. 30 days from today] concurrently with the execution of the Registered Sale Deed (Baye-Nama) before the Sub-Registrar / Society Transfer Directorate.
4. TITLE OBLIGATION: The Seller warrants that the property is free from all mortgages, bank charges, litigation, and encumbrances. The Seller shall produce a fresh digital Fard Malkiat / Society NDC prior to final payment.

WITNESS 1:                                       WITNESS 2:
Name: ______________________                     Name: ______________________
CNIC: ______________________                     CNIC: ______________________
Signature: _________________                     Signature: _________________

_______________________                          _______________________
SELLER SIGNATURE                                 PURCHASER SIGNATURE
`;
      break;

    case 'lawyer_brief':
      subject = `PROPERTY CONSULTATION BRIEF FOR ADVOCATE HIGH COURT`;
      body = `CONFIDENTIAL CLIENT BRIEF FOR LEGAL CONSULTATION

DATE: ${today}
CLIENT: ${senderName || '[Client Name]'} (CNIC: ${senderCnic || '[Client CNIC]'})
OPPOSING PARTY: ${recipientName || '[Opposing Party Name]'}

1. PROPERTY IN QUESTION:
Location: ${propertyAddress || '[Property Address]'}, ${city}, ${province}.
Ownership Document Type: [Registered Deed / Fard / Allotment Letter / Mutation].

2. SUMMARY OF THE DISPUTE / INQUIRY:
${details || 'Brief description of dispute, adverse claim, delay in transfer, or inheritance conflict.'}

3. PRIMARY DOCUMENTS ATTACHED FOR ADVOCATE REVIEW:
[ ] Original / Certified Copy of Sale Deed / Allotment Letter
[ ] Fard-e-Malkiat / Aks Shajra
[ ] Bank Payment Receipts / Pay Orders
[ ] Prior correspondence or legal notices exchanged
[ ] Municipal / Development Authority NOCs

4. KEY QUESTIONS FOR COUNSEL:
- Is the title legally marketable and free from registered encumbrances?
- What are the available remedies (e.g. Suit for Specific Performance under Specific Relief Act 1877, Injunction under Order 39 CPC, or Rent Petition)?
- What is the estimated timeline and court fee required for instituting civil proceedings?

Prepared for Consultation by:
${senderName || '[Client Name]'}
`;
      break;

    default:
      subject = 'INFORMATIONAL LEGAL COMMUNICATION';
      body = `To: ${recipientName}\nFrom: ${senderName}\nSubject: Property matter regarding ${propertyAddress}\n\n${details}`;
  }

  return {
    success: true,
    templateType,
    subject,
    fullDraft: `${DISCLAIMER_HEADER}${body}`,
    disclaimer:
      'AI-generated draft for informational guidance only. You must consult a qualified Pakistani advocate licensed by the Provincial Bar Council to finalize and sign legal notices.',
  };
}
