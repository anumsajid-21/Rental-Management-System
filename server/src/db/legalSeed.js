import { db } from './database.js';

export function seedLegalData() {
  const sourceCount = db.prepare('SELECT COUNT(*) AS c FROM legal_sources').get()?.c || 0;
  if (sourceCount > 0) {
    return; // already seeded
  }

  const insertSource = db.prepare(`
    INSERT OR REPLACE INTO legal_sources (
      id, name, short_name, jurisdiction, authority, source_type, year, source_url, verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertKB = db.prepare(`
    INSERT OR REPLACE INTO legal_knowledge_base (
      id, source_id, jurisdiction, category, section_rule, title, summary, urdu_summary,
      full_text, practical_app, key_documents, red_flags, authority_ref, effective_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTerm = db.prepare(`
    INSERT OR REPLACE INTO legal_terms (
      id, term_en, term_ur, term_roman, category, simple_meaning,
      legal_significance, when_required, related_docs, common_mistakes,
      relevant_authority, legal_source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTax = db.prepare(`
    INSERT OR REPLACE INTO legal_tax_rates (
      id, jurisdiction, tax_type, filer_type, rate_percent, description, statutory_ref, effective_from, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertSociety = db.prepare(`
    INSERT OR REPLACE INTO legal_societies (
      id, name, jurisdiction, city, authority_type, transfer_mode, verification_office, ndc_required, common_frauds, checklist
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedTx = db.transaction(() => {
    /* 1. Official Pakistani Legal Sources */
    const SOURCES = [
      ['src_tpa', 'Transfer of Property Act, 1882', 'TPA 1882', 'Federal', 'Parliament of Pakistan', 'Act', 1882, 'http://pakistancode.gov.pk'],
      ['src_reg', 'Registration Act, 1908', 'Reg Act 1908', 'Federal', 'Parliament of Pakistan', 'Act', 1908, 'http://pakistancode.gov.pk'],
      ['src_lra', 'Punjab Land Revenue Act, 1967', 'PLRA 1967', 'Punjab', 'Punjab Provincial Assembly', 'Act', 1967, 'http://punjablaws.gov.pk'],
      ['src_prpa', 'Punjab Rented Premises Act, 2009', 'PRPA 2009', 'Punjab', 'Punjab Provincial Assembly', 'Act', 2009, 'http://punjablaws.gov.pk'],
      ['src_srpo', 'Sindh Rented Premises Ordinance, 1979', 'SRPO 1979', 'Sindh', 'Sindh Provincial Assembly', 'Ordinance', 1979, 'http://sindhlaws.gov.pk'],
      ['src_irro', 'Islamabad Rent Restriction Ordinance, 2001', 'IRRO 2001', 'ICT', 'President of Pakistan', 'Ordinance', 2001, 'http://pakistancode.gov.pk'],
      ['src_ito', 'Income Tax Ordinance, 2001', 'ITO 2001', 'Federal', 'Federal Board of Revenue (FBR)', 'Ordinance', 2001, 'http://fbr.gov.pk'],
      ['src_stamp', 'Stamp Act, 1899', 'Stamp Act 1899', 'Federal', 'Provincial Revenue Boards', 'Act', 1899, 'http://pakistancode.gov.pk'],
      ['src_benami', 'Benami Transactions (Prohibition) Act, 2017', 'Benami Act 2017', 'Federal', 'Parliament of Pakistan', 'Act', 2017, 'http://pakistancode.gov.pk'],
      ['src_contract', 'Contract Act, 1872', 'Contract Act 1872', 'Federal', 'Parliament of Pakistan', 'Act', 1872, 'http://pakistancode.gov.pk'],
    ];

    for (const s of SOURCES) {
      insertSource.run(...s);
    }

    /* 2. Curated Statutory Knowledge Base */
    const KB_ITEMS = [
      [
        'kb_tpa_54',
        'src_tpa',
        'Federal',
        'sale_purchase',
        'Section 54',
        'Sale Defined and Transfer of Immovable Property',
        'Sale is a transfer of ownership in exchange for a price paid or promised. In Pakistan, transfer of tangible immovable property of value one hundred rupees and upwards can only be made by a registered instrument.',
        'جائیداد کی فروخت صرف تحریری اور رجسٹرڈ بیع نامہ کے ذریعے ہی قانونی طور پر مکمل ہوتی ہے۔ زبانی فروخت یا سادہ کاغذ پر معاہدہ ملکیت منتقل نہیں کرتا۔',
        'Sale is a transfer of ownership in exchange for a price paid or promised or part-paid and part-promised. Such transfer, in the case of tangible immovable property of the value of one hundred rupees and upwards, or in the case of a reversion or other intangible thing, can be made only by a registered instrument.',
        'An agreement to sell (Iqrar-nama / Bayana) does not confer title; legal ownership only passes when a formal Registered Sale Deed (Baye-Nama) is executed before the Sub-Registrar.',
        JSON.stringify(['CNIC copies', 'Original Title Deed / Registry', 'Fard Malkiat', 'Aks Shajra', 'NOC / Tax clearance']),
        JSON.stringify(['Buying on stamp paper agreement without registered deed', 'Paying full amount before verifying Sub-Registrar record']),
        'Sub-Registrar Office / District Land Revenue',
        '1882-07-01',
      ],
      [
        'kb_reg_17',
        'src_reg',
        'Federal',
        'mutation_registry',
        'Section 17',
        'Documents of which Registration is Compulsory',
        'Instruments of gift of immovable property and non-testamentary instruments which purport or operate to create, declare, assign, limit or extinguish any right, title or interest in immovable property valued at PKR 100 or more must be registered.',
        'جائیداد کی منتقلی، ہبہ نامہ (گفٹ ڈیڈ)، اور رجسٹری دستاویزات کا سب رجسٹرار کے پاس رجسٹرڈ ہونا قانوناً لازمی ہے۔ بغیر رجسٹریشن دستاویز عدالت میں ملکیت ثابت نہیں کر سکتی۔',
        'The following documents shall be registered... non-testamentary instruments which purport or operate to create, declare, assign, limit or extinguish, whether in present or in future, any right, title or interest, whether vested or contingent, to or in immovable property.',
        'Unregistered sale agreements carry grave evidentiary risk under Section 49 of the Registration Act and cannot be used as primary proof of ownership in Pakistani courts.',
        JSON.stringify(['Registered Deed', 'Biometric verification receipt', 'e-Stamp Paper']),
        JSON.stringify(['Relying solely on an unregistered Power of Attorney', 'Not obtaining certified copy (Naqal) from Sub-Registrar']),
        'Sub-Registrar Office',
        '1908-01-01',
      ],
      [
        'kb_prpa_5',
        'src_prpa',
        'Punjab',
        'tenancy',
        'Section 5 & 7',
        'Tenancy Agreement in Punjab and Mandatory Registration',
        'Under Punjab Rented Premises Act 2009, every tenancy agreement must be in writing and registered with the Rent Registrar of the area. Payment of rent exceeding PKR 5,000 should be via crossed cheque or against official receipt.',
        'پنجاب میں کرایہ نامہ تحریری ہونا اور متعلقہ رینٹ رجسٹرار کے پاس رجسٹرڈ ہونا لازمی ہے۔ بغیر رجسٹریشن کرایہ دار کے خلاف فوری بے دخلی کی درخواست دائر نہیں ہو سکتی۔',
        'A landlord shall not let out a premises to a tenant except by a tenancy agreement in writing... and shall present it before the Rent Registrar within thirty days.',
        'If a tenancy agreement is not registered with the Rent Registrar, a penalty of 5% of annual rent is imposed on the landlord and 10% on the tenant before any petition under the Act can be entertained.',
        JSON.stringify(['Written Tenancy Agreement', 'Tenant Police Verification form', 'CNIC copies', 'Receipt book']),
        JSON.stringify(['Oral tenancy agreements', 'Failing to register with the Punjab Police Verification system', 'Accepting cash without stamped receipt']),
        'Rent Registrar / Special Judge (Rent), Punjab',
        '2009-07-01',
      ],
      [
        'kb_srpo_15',
        'src_srpo',
        'Sindh',
        'tenancy',
        'Section 15',
        'Grounds for Eviction of Tenant in Sindh',
        'In Sindh (including Karachi and Hyderabad), a landlord can seek tenant eviction only through the Rent Controller on specific statutory grounds: default in rent payment, subletting without consent, breach of terms, or genuine personal bona fide need.',
        'سندھ میں مکان یا دکان خالی کروانے کے لیے رینٹ کنٹرولر سے رجوع کرنا ضروری ہے۔ کرایہ دار کا پانی یا بجلی کاٹ کر زبردستی بے دخل کرنا غیر قانونی ہے۔',
        'A landlord may apply to the Controller for an order directing the tenant to put the landlord in possession if the tenant has failed to pay or tender rent within fifteen days of the due date.',
        'Self-help eviction (changing locks, disconnecting electricity/gas/water) is an offense punishable under Sindh tenancy laws. Eviction requires an application to the Rent Controller.',
        JSON.stringify(['Tenancy Agreement', 'Bank deposit slips / Rent receipts', 'Legal Notice to Pay/Vacate']),
        JSON.stringify(['Locking premises or cutting utilities illegally', 'Serving non-statutory eviction notices']),
        'Rent Controller (Sindh)',
        '1979-11-20',
      ],
      [
        'kb_ito_236c',
        'src_ito',
        'Federal',
        'taxation',
        'Section 236C',
        'Advance Tax on Sale/Transfer of Immovable Property (Seller Tax)',
        'Under Section 236C of the Income Tax Ordinance 2001, any person registering or attesting transfer of immovable property must collect advance adjustable tax from the seller/transferor based on their Active Taxpayer List (ATL) status.',
        'جائیداد بیچنے والے پر ایف بی آر کی طرف سے ایڈوانس ٹیکس (سیکشن 236C) لاگو ہوتا ہے۔ فائلر کے لیے ریٹ 3% اور نان فائلر کے لیے بھاری شرح (10% تک) لاگو ہے۔',
        'Any person responsible for registering, recording or attesting transfer of any immovable property shall at the time of registering... collect from the seller or transferor advance tax at the specified rate.',
        'FBR ATL (Active Taxpayer List) status directly determines the payable rate. Sellers must produce PSID payment proof before the Sub-Registrar or Society transfers the property.',
        JSON.stringify(['FBR CPR / PSID Tax Challan', 'FBR ATL verification certificate', 'Valuation Table calculation']),
        JSON.stringify(['Under-invoicing property value below official FBR valuation tables', 'Using non-filer status resulting in excessive tax penalties']),
        'Federal Board of Revenue (FBR) / Sub-Registrar',
        '2024-07-01',
      ],
      [
        'kb_ito_236k',
        'src_ito',
        'Federal',
        'taxation',
        'Section 236K',
        'Advance Tax on Purchase/Transfer of Immovable Property (Buyer Tax)',
        'Under Section 236K, any person registering or attesting transfer of immovable property must collect advance tax from the purchaser/buyer. Filer rate is 3%, while late filers and non-filers face punitive rates (up to 10.5% - 15%).',
        'جائیداد خریدنے والے پر خریدار ایڈوانس ٹیکس (سیکشن 236K) لاگو ہوتا ہے۔ نان فائلر خریدار پر بھاری ٹیکس عائد ہے تاکہ نان فائلنگ کی حوصلہ شکنی کی جا سکے۔',
        'Any person responsible for registering, recording or attesting transfer of any immovable property shall at the time of registering... collect from the purchaser or transferee advance tax at the specified rate.',
        'The buyer cannot complete property registration or get an allotment letter issued without providing the CPR (Computerized Payment Receipt) under Section 236K.',
        JSON.stringify(['FBR CPR Payment Receipt', 'Buyer CNIC', 'FBR Active Taxpayer Status Slip']),
        JSON.stringify(['Assuming filer status without verifying current ATL 100% active status on the day of transaction']),
        'Federal Board of Revenue (FBR) / Development Authority',
        '2024-07-01',
      ],
      [
        'kb_benami_3',
        'src_benami',
        'Federal',
        'disputes',
        'Section 3 & 4',
        'Prohibition of Benami Transactions and Confiscation',
        'Under the Benami Transactions (Prohibition) Act 2017, no person shall enter into any benami transaction. Any property that is subject matter of a benami transaction is liable to be confiscated by the Federal Government, and the offender faces rigorous imprisonment.',
        'بے نامی جائیداد (کسی دوسرے شخص کے نام پر جائیداد خریدنا جس کا اصل مالک کوئی اور ہو) پاکستان میں مکمل طور پر غیر قانونی اور قابل سزا جرم ہے۔ ایسی جائیداد حکومت ضبط کر سکتی ہے۔',
        'No person shall enter into any benami transaction... Whoever enters into any benami transaction shall be punishable with rigorous imprisonment for a term which shall not be less than one year, but which may extend to seven years.',
        'Never purchase property held in the name of a driver, servant, or unrelated third party under an informal understanding. Real ownership must match the title document and source of funds.',
        JSON.stringify(['Banking transaction proof', 'Income tax declarations', 'Original CNIC of actual owner']),
        JSON.stringify(['Buying under an informal nominee name', 'Cash transactions without banking trails']),
        'Federal Benami Adjudicating Authority / Federal Court',
        '2017-02-16',
      ],
      [
        'kb_plra_intiqal',
        'src_lra',
        'Punjab',
        'mutation_registry',
        'Section 42',
        'Mutation (Intiqal) Procedure and Legal Effect',
        'Under Punjab Land Revenue Act 1967, any person acquiring land by inheritance, purchase, gift or mortgage must report the acquisition to the Patwari / Arazi Record Center (ARC) for entering a Mutation (Intiqal). Mutation is a fiscal entry for revenue collection and not a definitive document of title.',
        'انتقال (میوٹیشن) پٹواری یا اراضی ریکارڈ سینٹر کے ریونیو ریکارڈ میں مالیاتی اندراج ہے۔ یہ خود کوئی ٹائٹل ڈیڈ (رجسٹری) نہیں ہوتا بلکہ رجسٹری یا وراثت کے بعد ریونیو ریکارڈ کو اپڈیٹ کرنے کا عمل ہے۔',
        'Any person acquiring by inheritance, purchase, mortgage, or otherwise, any right in an estate as a landowner, shall report his acquisition of the right to the Patwari of the estate.',
        'The Supreme Court of Pakistan has repeatedly ruled that Mutation (Intiqal) does not confer title by itself. An Intiqal without a valid underlying transaction (e.g. Registered Sale Deed or verified inheritance) can be challenged and canceled.',
        JSON.stringify(['Fard Malkiat for Intiqal', 'Biometric ARC slip', 'Registered Sale Deed', 'Wirasat Shajra']),
        JSON.stringify(['Assuming that an Intiqal alone guarantees undisputed ownership without checking original registered deeds']),
        'Punjab Land Records Authority (PLRA) / Arazi Record Center',
        '1967-12-07',
      ],
    ];

    for (const kb of KB_ITEMS) {
      insertKB.run(...kb);
    }

    /* 3. Searchable Real-Estate Legal Terminology (Bilingual + Roman Urdu) */
    const TERMS = [
      [
        'term_intiqal',
        'Mutation',
        'انتقال',
        'Intiqal',
        'revenue',
        'The process of altering land revenue records to show transfer of ownership from seller to buyer.',
        'It updates government tax/revenue registers. While crucial for record keeping, the Supreme Court has ruled that Intiqal alone is not an absolute document of title without a registered underlying deed or lawful succession.',
        'Immediately after purchasing land through a registered sale deed or inheriting property.',
        JSON.stringify(['Registered Sale Deed', 'Fard Malkiat', 'CNIC', 'Biometric Verification']),
        JSON.stringify(['Believing an Intiqal replaces a Registered Deed in urban areas', 'Not verifying whether the mutation has been officially sanctioned (Manzoor Shuda)']),
        'Arazi Record Center (PLRA) / Tehsildar / Revenue Department',
        'Punjab Land Revenue Act 1967, Section 42',
      ],
      [
        'term_fard',
        'Record of Rights / Title Extract',
        'فرد ملکیت',
        'Fard / Fard-e-Malkiat',
        'revenue',
        'An official extract issued by the revenue authority proving ownership, area, and share in land.',
        'It is required for obtaining electricity/gas connections, mortgages, selling land, and verifying whether any stay order or bank encumbrance is marked on the land.',
        'Before paying Bayana, before executing a sale deed, and during due diligence.',
        JSON.stringify(['CNIC', 'Khasra Number', 'Khewat Number']),
        JSON.stringify(['Using an outdated Fard (Fard is generally valid for 30 to 90 days for transaction purposes)', 'Not checking the Remarks column (Kaifiyat) for stay orders or bank charges']),
        'Arazi Record Center (PLRA) / Land Revenue Department / Patwari',
        'Land Revenue Rules, 1968',
      ],
      [
        'term_bayana',
        'Token Money / Earnest Money Agreement',
        'بیعانہ',
        'Bayana',
        'contract',
        'Advance earnest money paid by a buyer to the seller to solidify an agreement to sell.',
        'Bayana creates a binding contractual commitment under the Contract Act 1872. If the seller backs out, the buyer can sue for Specific Performance; if the buyer defaults, the seller may claim forfeiture under contractual terms.',
        'When terms of sale (total price, payment schedule, possession date) have been agreed upon.',
        JSON.stringify(['Agreement to Sell (Iqrar-nama)', 'CNIC copies', 'Crossed Bank Cheque / Pay Order copy', 'Witness signatures']),
        JSON.stringify(['Paying cash Bayana without a formal written receipt and independent witnesses', 'Failing to stipulate consequences of title defects']),
        'Civil Court / Notary Public',
        'Contract Act 1872, Section 73 & Specific Relief Act 1877',
      ],
      [
        'term_registry',
        'Registered Sale Deed',
        'بیع نامہ / رجسٹری',
        'Registry / Baye-Nama',
        'title',
        'A formal legal document transferring property ownership registered before the government Sub-Registrar.',
        'It is the most authoritative document of title in Pakistani urban areas. It provides statutory notice to the world under Section 17 & 49 of the Registration Act 1908.',
        'At the completion of property sale when the full agreed price is paid.',
        JSON.stringify(['Original Title Deed', 'e-Stamp Paper', 'FBR Tax Receipts 236C/236K', 'TMA NOC', 'Biometric slips']),
        JSON.stringify(['Relying on plain paper agreements', 'Not retaining the original Bahi (volume) and registration number for verification']),
        'Sub-Registrar Office (Revenue & Registration Department)',
        'Registration Act 1908, Section 17',
      ],
      [
        'term_poa',
        'Power of Attorney',
        'مختار نامہ',
        'Mukhtar-Nama / Power of Attorney',
        'title',
        'A legal deed authorizing an agent to act on behalf of the owner in property matters.',
        'General Power of Attorney (Mukhtar-e-Aam) authorizes broad management/sale; Special Power of Attorney (Mukhtar-e-Khas) is limited to a single specific act. A POA must be registered with the Sub-Registrar to authorize immovable property transactions.',
        'When the principal resides abroad (overseas Pakistani) or cannot physically appear.',
        JSON.stringify(['Registered POA document', 'Embassy attestation (for overseas Pakistanis)', 'Foreign Affairs Ministry verification', 'Nadra biometric verification']),
        JSON.stringify(['Purchasing property from a POA holder without verifying if the original principal is alive (POA automatically terminates on death of principal)', 'Accepting an unregistered POA']),
        'Sub-Registrar / Ministry of Foreign Affairs (MOFA)',
        'Powers of Attorney Act, 1882 & Registration Act, 1908',
      ],
      [
        'term_khasra',
        'Survey / Parcel Number',
        'خسرہ نمبر',
        'Khasra Number',
        'revenue',
        'A specific plot/parcel number assigned to a piece of land in the official cadastral village map (Aks Shajra).',
        'Identifies the exact physical location and boundaries of rural or un-regularized suburban land on the ground.',
        'When conducting on-site land survey, demarcating boundaries, and verifying agricultural or suburban housing land.',
        JSON.stringify(['Aks Shajra (Map)', 'Fard Malkiat', 'Khasra Girdawari']),
        JSON.stringify(['Purchasing land without physical demarcation (Nishandahi) on the exact Khasra coordinates']),
        'Revenue Patwari / Field Qanungo / Arazi Record Center',
        'Punjab Land Revenue Act 1967',
      ],
      [
        'term_allotment',
        'Allotment Letter / Transfer Letter',
        'ایلاٹمنٹ لیٹر',
        'Allotment Letter',
        'housing_societies',
        'An ownership certificate issued by a statutory housing authority (e.g. DHA, CDA, Bahria) in lieu of traditional Sub-Registrar registry.',
        'Confers proprietary rights within that planned scheme. Property transfers in these societies take place through society Transfer Letters rather than the Sub-Registrar.',
        'When buying plots or developed houses in planned societies like DHA, CDA, or private approved housing schemes.',
        JSON.stringify(['Original Allotment Letter', 'No Demand Certificate (NDC)', 'Transfer Slip', 'Membership Form']),
        JSON.stringify(['Purchasing without in-person NDC verification at the society office', 'Buying an un-balloted file without verifiable land quota']),
        'Society Transfer Branch (e.g. DHA, CDA, LDA Office)',
        'Respective Authority Act (e.g. DHA Ordinance / CDA Ordinance)',
      ],
      [
        'term_benami',
        'Benami Property',
        'بے نامی جائیداد',
        'Benami Property',
        'disputes',
        'Property held by or transferred to one person while the consideration was paid by another for their own benefit.',
        'Illegal and subject to government confiscation with up to 7 years imprisonment under the Benami Act 2017.',
        'Should never be used. All transactions must be in the actual beneficial owner’s name with lawful banking channels.',
        JSON.stringify(['Bank statements', 'Tax returns', 'CNIC']),
        JSON.stringify(['Buying in a servant or distant relative’s name to avoid taxation']),
        'Federal Benami Adjudicating Authority',
        'Benami Transactions (Prohibition) Act 2017',
      ],
    ];

    for (const t of TERMS) {
      insertTerm.run(...t);
    }

    /* 4. Versioned Tax Rates (FBR Section 236C, 236K, Stamp Duty, TMA) */
    const TAXES = [
      ['tax_236c_filer', 'Federal', '236C_seller', 'filer', 3.0, 'Seller Advance Tax for Active Taxpayers (Filer) on Gross Consideration', 'Income Tax Ordinance 2001, Section 236C', '2024-07-01'],
      ['tax_236c_late', 'Federal', '236C_seller', 'late_filer', 6.0, 'Seller Advance Tax for Late Filers', 'Income Tax Ordinance 2001, Section 236C', '2024-07-01'],
      ['tax_236c_nonfiler', 'Federal', '236C_seller', 'non_filer', 10.0, 'Punitive Seller Advance Tax for Non-Filers', 'Income Tax Ordinance 2001, Section 236C', '2024-07-01'],
      ['tax_236k_filer', 'Federal', '236K_buyer', 'filer', 3.0, 'Purchaser Advance Tax for Active Taxpayers (Filer)', 'Income Tax Ordinance 2001, Section 236K', '2024-07-01'],
      ['tax_236k_late', 'Federal', '236K_buyer', 'late_filer', 7.0, 'Purchaser Advance Tax for Late Filers', 'Income Tax Ordinance 2001, Section 236K', '2024-07-01'],
      ['tax_236k_nonfiler', 'Federal', '236K_buyer', 'non_filer', 12.0, 'Punitive Purchaser Advance Tax for Non-Filers (can escalate up to 15%)', 'Income Tax Ordinance 2001, Section 236K', '2024-07-01'],
      ['tax_stamp_punjab', 'Punjab', 'stamp_duty', 'all', 1.0, 'Punjab e-Stamp Duty on registered urban conveyance deeds', 'Punjab Stamp Act & e-Stamping Schedule', '2024-07-01'],
      ['tax_stamp_sindh', 'Sindh', 'stamp_duty', 'all', 2.0, 'Sindh Stamp Duty on registered conveyance deeds', 'Sindh Stamp Act & Board of Revenue', '2024-07-01'],
      ['tax_tma_punjab', 'Punjab', 'tma_fee', 'all', 1.0, 'Tehsil Municipal Administration (TMA) transfer tax on immovable property', 'Punjab Local Government Act', '2024-07-01'],
      ['tax_tma_sindh', 'Sindh', 'tma_fee', 'all', 1.0, 'Town Municipal Corporation transfer fee', 'Sindh Local Government Act', '2024-07-01'],
      ['tax_stamp_ict', 'ICT', 'stamp_duty', 'all', 2.0, 'Stamp duty on conveyance deeds in Islamabad Capital Territory', 'ICT Stamp Schedule', '2024-07-01'],
    ];

    for (const tx of TAXES) {
      insertTax.run(...tx);
    }

    /* 5. Housing Societies & Development Authorities */
    const SOCIETIES = [
      [
        'soc_dha_lahore',
        'Defence Housing Authority (DHA) Lahore',
        'Punjab',
        'Lahore',
        'Statutory Authority',
        'Allotment / Transfer Letter',
        'DHA Lahore Main Office (Phase 6 Complex)',
        1,
        JSON.stringify(['Unverified file verification', 'Fake NOC claims', 'Forged Power of Attorney']),
        JSON.stringify([
          'Apply for NDC (No Demand Certificate) to clear utility, development, and society charges',
          'Verify original Allotment Letter at DHA Transfer & Record branch',
          'Pay transfer fee and FBR Taxes (236C / 236K)',
          'Physical appearance and biometric verification of buyer & seller before DHA Transfer Officer',
          'Collect new Transfer Letter in buyer name',
        ]),
      ],
      [
        'soc_cda_isb',
        'Capital Development Authority (CDA) Islamabad',
        'ICT',
        'Islamabad',
        'Statutory Authority',
        'CDA Transfer Letter / Allotment',
        'CDA One Window Directorate (G-7/2 Islamabad)',
        1,
        JSON.stringify(['Unauthorized building alterations without CDA completion certificate', 'Property in unapproved sector or under CDA litigation', 'Dual allotment']),
        JSON.stringify([
          'Check approved layout plan and sector status at CDA Planning Wing',
          'Obtain CDA Dues Clearance and Property Tax Certificate',
          'Verify Completion Certificate for constructed houses to avoid building violation fines',
          'Submit transfer application via CDA One Window with biometric attendance',
        ]),
      ],
      [
        'soc_lda_lahore',
        'Lahore Development Authority (LDA)',
        'Punjab',
        'Lahore',
        'Statutory Authority',
        'LDA Transfer / Registered Deed',
        'LDA One Window Cell (Johar Town, Lahore)',
        1,
        JSON.stringify(['Forged plot exemptions', 'Properties under commercialization violation notices']),
        JSON.stringify([
          'Verify plot ownership via LDA One Window biometric service',
          'Ensure all LDA commercialization/development charges are paid',
          'Obtain LDA Non-Encumbrance Certificate (NEC)',
          'Complete transfer or registry following LDA prescribed procedure',
        ]),
      ],
      [
        'soc_bahria_khi',
        'Bahria Town Karachi (BTK)',
        'Sindh',
        'Karachi',
        'Private Housing Scheme',
        'Transfer Letter',
        'Bahria Town Head Office Customer Support',
        1,
        JSON.stringify(['Disputed precinct land outside Supreme Court approved boundaries', 'Open file trading with pending surcharges']),
        JSON.stringify([
          'Conduct physical file verification at BTK Customer Support counter',
          'Confirm whether the plot precinct is within the formally approved boundary',
          'Obtain zero-dues clearance and pay transfer surcharge',
          'Both parties present CNIC and biometric verification at Bahria transfer counter',
        ]),
      ],
    ];

    for (const sc of SOCIETIES) {
      insertSociety.run(...sc);
    }
  });

  seedTx();
  console.log('[legalSeed] Pakistani Real Estate legal knowledge base seeded successfully.');
}
