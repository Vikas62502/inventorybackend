import path from 'path';
import fs from 'fs';
import {
  Quotation,
  QuotationProduct,
  Customer,
  Dealer
} from '../../models/index-quotation';
import {
  PROPOSAL_BANKS,
  PROPOSAL_COMPANY,
  PROPOSAL_PAYMENT_TERMS_DETAIL,
  PROPOSAL_SUPPORT_EMAIL,
  PROPOSAL_SUPPORT_PHONE,
  PROPOSAL_VALIDITY_DAYS
} from './proposalCompany';
import { PDF_PANEL_RANGE_LABELS, type PdfPanelRangeKey } from '../quotationProductPdfDisplay';

export type ProposalPdfDocument = {
  quotationId: string;
  quotationDateLabel: string;
  validityDateLabel: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  customerAddress: string;
  systemTypeLabel: string;
  dealerName: string;
  dealerContact: string;
  dealerEmail: string;
  companyGst: string;
  systemKwLabel: string;
  phaseLabel: string;
  specRows: Array<{ component: string; specification: string; brandModel: string; qty: string }>;
  panelNote: string;
  showPricingRateColumn: boolean;
  pricingRows: Array<{
    description: string;
    rate: string;
    capacity: string;
    amount: string;
    highlight?: boolean;
  }>;
  pricingTotalLabel: string;
  pricingTotalAmountLabel: string;
  /** Quotation subtotal — used as Project cost in email / PDF total. */
  subtotalLabel: string;
  /** Display label: Cash | Loan | Cash + Loan */
  paymentTypeLabel: string;
  paymentRows: Array<{
    stage: string;
    when: string;
    percentage: string;
    amount: string;
    highlight?: boolean;
    isTotal?: boolean;
    isToken?: boolean;
  }>;
  banks: typeof PROPOSAL_BANKS;
  warrantyRows: Array<{ component: string; period: string; coverage: string }>;
  supportLine: string;
  termsRows: Array<{ category: string; detail: string }>;
  consentText: string;
  companyName: string;
  companyPhone: string;
  offices: Array<{ label: string; address: string }>;
  logoDataUri: string;
  page2CompactFont: boolean;
};

const pick = (...values: unknown[]): string => {
  for (const v of values) {
    const t = String(v ?? '').trim();
    if (t) return t;
  }
  return '';
};

const formatInr = (amount: number): string =>
  `₹${Math.round(amount).toLocaleString('en-IN')}`;

const formatProposalDate = (d: Date): string =>
  d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const asPerSet = (value: unknown): boolean =>
  /as\s*per\s*the\s*set/i.test(String(value || '').trim());

const systemTypeLabel = (systemType: string, inverterType?: string): string => {
  if (/hybrid/i.test(String(inverterType || ''))) return 'Hybrid Solar system';
  const map: Record<string, string> = {
    dcr: 'On-Grid DCR Solar System',
    'non-dcr': 'On-Grid Non-DCR Solar System',
    both: 'On-Grid DCR + Non-DCR Solar System',
    customize: 'Customized Solar System'
  };
  return map[String(systemType || '').toLowerCase()] || 'On-Grid Solar System';
};

const phaseLabel = (phase?: string | null): string => {
  const p = String(phase || '').trim();
  if (p === '1-Phase' || p === '3-Phase') return p;
  if (/^1/.test(p)) return '1-Phase';
  if (/^3/.test(p)) return '3-Phase';
  return '1-Phase';
};

/** cash | loan | mix → Cash | Loan | Cash + Loan */
const paymentTypeLabelFromQuotation = (quotation: Quotation): string => {
  const raw = String(
    (quotation as any).paymentType ??
      (quotation as any).payment_type ??
      quotation.paymentMode ??
      (quotation as any).payment_mode ??
      (quotation as any).filePaymentType ??
      (quotation as any).file_payment_type ??
      ''
  )
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (raw === 'cash') return 'Cash';
  if (raw === 'loan') return 'Loan';
  if (
    raw === 'mix' ||
    raw === 'cash_loan' ||
    raw === 'cashloan' ||
    raw === 'cash+loan'
  ) {
    return 'Cash + Loan';
  }
  return '—';
};

const systemKwLabelFromProducts = (p: Record<string, any>, quotation: Quotation): string => {
  const stored = Number((quotation as any).systemKw);
  if (Number.isFinite(stored) && stored > 0) {
    const label = `${stored}`.replace(/\.0+$/, '');
    return `${label} kW`;
  }
  const size = pick(p.panelSize, p.dcrPanelSize, p.nonDcrPanelSize);
  const qty = Number(p.panelQuantity || p.dcrPanelQuantity || p.nonDcrPanelQuantity || 0);
  const watts = Number.parseFloat(size.replace(/[^0-9.]/g, '')) || 0;
  if (watts > 0 && qty > 0) {
    const kw = Math.round((watts * qty) / 100) / 10;
    return `${kw} kW`;
  }
  const inv = pick(p.inverterSize).replace(/[^0-9.]/g, '');
  if (inv) return `${inv} kW`;
  return '—';
};

const loadLogoDataUri = (): string => {
  const logoPath = path.resolve(__dirname, '../../assets/chairbord-solar-logo.png');
  try {
    const buf = fs.readFileSync(logoPath);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return '';
  }
};

const panelSpecText = (
  size: string,
  grade: string,
  rangeKey: string | null | undefined,
  brand: string
): string => {
  if (rangeKey) {
    const rangeLabel =
      PDF_PANEL_RANGE_LABELS[rangeKey as PdfPanelRangeKey] || 'As per the set';
    return `${rangeLabel}, ${grade}`;
  }
  const brandLower = brand.toLowerCase();
  const panelWatts = Number.parseFloat(String(size || '').replace(/[^0-9.]/g, '')) || 0;
  const sizeLabel = String(size || '')
    .trim()
    .replace(/w$/i, 'W');
  if (brandLower.includes('ina')) {
    return `${sizeLabel || '—'} N-Type Topcon Bifacial, ${grade}`;
  }
  if (brandLower.includes('waaree') && panelWatts > 580) {
    return `${sizeLabel} Topcon Bifacial, ${grade}`;
  }
  if (asPerSet(size)) return `As per the set, ${grade}`;
  return `${size || '—'} Mono PERC Bifacial Technology, ${grade}`;
};

const buildSpecRows = (p: Record<string, any>, kwLabel: string) => {
  const systemType = String(p.systemType || '').toLowerCase();
  const grade =
    systemType === 'dcr'
      ? 'DCR Grade'
      : systemType === 'non-dcr'
        ? 'Non-DCR Grade'
        : systemType === 'both'
          ? 'DCR / Non-DCR Grade'
          : 'Non-DCR Grade';
  const primaryBrand = pick(p.panelBrand, p.dcrPanelBrand, p.nonDcrPanelBrand) || '—';
  const primarySize = pick(p.panelSize, p.dcrPanelSize, p.nonDcrPanelSize);
  const primaryQty = Number(p.panelQuantity || p.dcrPanelQuantity || p.nonDcrPanelQuantity || 0);
  const primaryRange = p.pdfPanelRangeKey || null;
  const kwNum = Number.parseFloat(String(kwLabel).replace(/[^0-9.]/g, '')) || 0;
  const useCtBt = kwNum >= 20;
  const phase = phaseLabel(p.phase);

  const panelRows =
    systemType === 'both' && pick(p.dcrPanelBrand)
      ? [
          {
            component: 'DCR Panels',
            specification: panelSpecText(
              pick(p.dcrPanelSize),
              'DCR Grade',
              p.pdfDcrPanelRangeKey,
              pick(p.dcrPanelBrand)
            ),
            brandModel: pick(p.dcrPanelBrand),
            qty: p.pdfDcrPanelRangeKey
              ? 'As Per BOM'
              : p.dcrPanelQuantity
                ? `${p.dcrPanelQuantity} Pcs`
                : 'As Per BOM'
          },
          ...(pick(p.nonDcrPanelBrand)
            ? [
                {
                  component: 'Non-DCR Panels',
                  specification: panelSpecText(
                    pick(p.nonDcrPanelSize),
                    'Non-DCR Grade',
                    p.pdfNonDcrPanelRangeKey,
                    pick(p.nonDcrPanelBrand)
                  ),
                  brandModel: pick(p.nonDcrPanelBrand),
                  qty: p.pdfNonDcrPanelRangeKey
                    ? 'As Per BOM'
                    : p.nonDcrPanelQuantity
                      ? `${p.nonDcrPanelQuantity} Pcs`
                      : 'As Per BOM'
                }
              ]
            : [])
        ]
      : [
          {
            component: 'Solar Panels',
            specification: panelSpecText(primarySize, grade, primaryRange, primaryBrand),
            brandModel: primaryBrand,
            qty: primaryRange ? 'As Per BOM' : primaryQty ? `${primaryQty} Pcs` : 'As Per BOM'
          }
        ];

  const invSize = asPerSet(p.inverterSize) ? 'As per the set' : pick(p.inverterSize) || '—';
  const invBrand = asPerSet(p.inverterBrand)
    ? 'As per the set'
    : pick(p.inverterBrand) || 'Vsole/Xwatt';

  return [
    ...panelRows,
    {
      component: 'Solar Inverter',
      specification: `${invSize} ${pick(p.inverterType) || 'String Inverter'}, ${phase}, MPPT, IP65, Wi-Fi Monitoring`,
      brandModel: invBrand,
      qty: '1 Unit'
    },
    ...(p.includeLithiumBattery
      ? [
          {
            component: 'Lithium Battery',
            specification: pick(p.batteryCapacity) || 'Lithium Battery',
            brandModel: pick(p.hybridInverter) || 'Lithium',
            qty: '1 Set'
          }
        ]
      : []),
    {
      component: 'Mounting Structure',
      specification: pick(p.structureType) || 'Hot Dip Galvanized Structure',
      brandModel: pick(p.structureSize) || 'As per the set',
      qty: 'As Per BOM'
    },
    {
      component: 'DC Cables',
      specification: `${pick(p.dcCableSize) || '4mm²/6mm²'} DC Solar Cable`,
      brandModel: pick(p.dcCableBrand) || 'Polycab / Standard',
      qty: 'As Per BOM'
    },
    {
      component: 'AC Cables',
      specification: `AC Output Cables, ${phase}`,
      brandModel: pick(p.acCableBrand) || 'Polycab / Standard',
      qty: 'As Per BOM'
    },
    {
      component: useCtBt ? 'CT / BT' : 'ACDB / DCDB',
      specification: useCtBt ? 'CT & BT Distribution' : 'AC & DC Distribution Box',
      brandModel: useCtBt
        ? 'As per the set / As per the set'
        : pick(p.acdb) || pick(p.dcdb)
          ? `${pick(p.acdb)} ${pick(p.dcdb)}`.trim()
          : 'Havells+Elmex / Elmex',
      qty: '1 Set'
    },
    {
      component: 'Lightning Arrestor & Earthing',
      specification: (() => {
        const wire = pick(p.earthingWireSize);
        if (!wire || asPerSet(wire)) {
          return 'Copper-bonded lightning protection with green earthing wire (As per the set)';
        }
        return `Copper-bonded lightning protection with green earthing wire (${wire})`;
      })(),
      brandModel: (() => {
        const brand = pick(p.earthingWireBrand);
        const wire = pick(p.earthingWireSize);
        const brandLabel = !brand || asPerSet(brand) || /^jmp$/i.test(brand) ? 'Polycab' : brand;
        if (!wire || asPerSet(wire)) return `${brandLabel} Green Earthing Wire`;
        return `${brandLabel} Green Earthing Wire ${wire}`;
      })(),
      qty: '1 Set'
    },
    {
      component: 'Net Meter',
      specification: 'Bi-Directional Energy Meter',
      brandModel: pick(p.meterBrand) || 'L&T/HPL/Genus/Secure',
      qty: '1 Unit'
    }
  ];
};

/** Load quotation QT-… and build the same proposal document shape the FE PDF uses. */
export const buildProposalDocumentFromQuotationId = async (
  quotationId: string
): Promise<ProposalPdfDocument> => {
  const quotation = await Quotation.findByPk(quotationId, {
    include: [
      { model: Customer, as: 'customer' },
      { model: Dealer, as: 'dealer' },
      { model: QuotationProduct, as: 'products' }
    ]
  });
  if (!quotation) {
    throw new Error(`Quotation not found: ${quotationId}`);
  }

  const customer = (quotation as any).customer as Customer | undefined;
  const dealer = (quotation as any).dealer as Dealer | undefined;
  const productsModel = (quotation as any).products as QuotationProduct | QuotationProduct[] | undefined;
  const productRow = Array.isArray(productsModel) ? productsModel[0] : productsModel;
  const p = (productRow?.get?.({ plain: true }) || productRow || {}) as Record<string, any>;

  const subtotal = Number(
    quotation.subtotal || p.subtotal || quotation.totalAmount || p.totalAmount || 0
  );
  const centralSubsidy = Math.max(
    0,
    Number(p.centralSubsidy ?? (quotation as any).centralSubsidy ?? 0) || 0
  );
  const systemType = String(p.systemType || quotation.systemType || '').toLowerCase();
  const commercial = Boolean(p.pdfCommercialSet);
  const showSubsidy = !commercial && (systemType === 'dcr' || systemType === 'both');
  const kwLabel = systemKwLabelFromProducts(p, quotation);
  const phase = phaseLabel(p.phase);
  const panelBrand = pick(p.panelBrand, p.dcrPanelBrand, p.nonDcrPanelBrand) || 'Selected brand';
  const inverterBrand = asPerSet(p.inverterBrand)
    ? 'As per the set'
    : pick(p.inverterBrand) || 'Vsole/Xwatt';

  const updatedAt = quotation.updatedAt ? new Date(quotation.updatedAt) : new Date();
  const quotationDate = updatedAt;
  const validityDate = quotation.validUntil
    ? new Date(quotation.validUntil)
    : new Date(quotationDate.getTime() + PROPOSAL_VALIDITY_DAYS * 86400000);

  const kwNum = Number.parseFloat(kwLabel.replace(/[^0-9.]/g, '')) || 0;
  const watts = Math.round(kwNum * 1000);
  const ratePerWatt = watts > 0 ? subtotal / watts : 0;
  const showRate = systemType === 'non-dcr';
  // Project cost = quotation subtotal (not after-subsidy).
  const pricingTotalAmount = Math.round(subtotal);
  const pricingTotalLabel = 'TOTAL PROJECT COST (Including GST & All Charges)';
  const subtotalLabel = formatInr(pricingTotalAmount);

  const pricingRows = [
    {
      description: `${kwLabel.replace(/\s*kW/i, ' KW')} Solar System`,
      rate: ratePerWatt > 0 ? `${ratePerWatt.toFixed(2)} per Watt` : 'As quoted',
      capacity: watts > 0 ? `${watts} W` : '—',
      amount: formatInr(subtotal),
      highlight: true
    },
    { description: 'GST & Taxes', rate: 'Included', capacity: 'Included', amount: 'Included' },
    {
      description: 'Transportation & Logistics',
      rate: 'Included',
      capacity: 'Included',
      amount: 'Included'
    },
    {
      description: 'Installation & Commissioning',
      rate: 'Included',
      capacity: 'Included',
      amount: 'Included'
    },
    ...(showSubsidy && centralSubsidy > 0
      ? [
          {
            description: 'Central Subsidy',
            rate: '—',
            capacity: '—',
            amount: `−${formatInr(centralSubsidy)}`
          }
        ]
      : [])
  ];

  const paymentRows = [
    {
      stage: 'Token Money',
      when: 'At Order Confirmation (Cash/UPI/Netbanking)',
      percentage: '10–20%',
      amount: 'As per T&C',
      highlight: true,
      isToken: true
    },
    {
      stage: 'Before Dispatch(Cash)',
      when: 'Before when Material Dispatch',
      percentage: '75–85%',
      amount: 'As per T&C'
    },
    {
      stage: 'Pre-Installation (Loan)',
      when: 'Before Installation Starts',
      percentage: '70%',
      amount: 'As per T&C'
    },
    {
      stage: 'Post-Installation (Loan)',
      when: 'After Installation',
      percentage: '30%',
      amount: 'As per T&C'
    },
    {
      stage: 'Metering & Closure',
      when: 'Before Metering & Commissioning',
      percentage: 'Balance (~5%)',
      amount: 'As per T&C'
    },
    {
      stage: 'TOTAL PROJECT COST',
      when: '',
      percentage: '100%',
      amount: formatInr(subtotal),
      isTotal: true
    }
  ];

  const termsRows: Array<{ category: string; detail: string }> = [
    { category: 'Payment', detail: PROPOSAL_PAYMENT_TERMS_DETAIL },
    {
      category: 'Project Timeline',
      detail:
        '15–20 days from receipt of Solar NOC from DISCOM, commercially clear order, and advance payment.'
    },
    {
      category: 'Validity',
      detail: `${PROPOSAL_VALIDITY_DAYS} days from the date of offer. After this period, confirmation must be obtained.`
    },
    {
      category: 'Client Scope',
      detail:
        'Module cleaning, rooftop access, electricity/water during construction, safe storage, LT panel connection space, and internet for monitoring (if applicable) — client scope.'
    },
    {
      category: 'Transport',
      detail: 'Transportation of BOM to the installation site is included in the quoted price.'
    },
    {
      category: 'Net Meter',
      detail:
        "Net metering application, approval, meter issue, testing, and grid synchronization are processed solely by the DISCOM; timelines and outcomes are outside Chairbord Solar's control and are not part of our project commitment. All DISCOM charges (file charges, demand charges, net-meter testing, electrical inspector report, etc.) shall be paid by the client directly to the DISCOM."
    },
    {
      category: 'On-Grid Operation',
      detail:
        'This is an on-grid solar plant. The system will generate and supply power only when grid electricity is available; during a power cut or grid outage, the plant will not work and will not provide backup power to the premises.'
    }
  ];

  if (showSubsidy) {
    const central = centralSubsidy > 0 ? centralSubsidy : 78000;
    const state = Number(p.stateSubsidy || 0) > 0 ? Number(p.stateSubsidy) : 17000;
    termsRows.push(
      {
        category: 'Central Subsidy',
        detail: `Eligible DCR residential customers may receive up to ${formatInr(central)} Central Government subsidy under normal residential MNRE/state norms.`
      },
      {
        category: 'State Subsidy',
        detail: `Under the Rajasthan 100 Units Free Scheme only, qualifying customers may additionally receive up to ${formatInr(state)} State Government subsidy (combined with ${formatInr(central)} central subsidy = ${formatInr(central + state)} maximum).`
      },
      {
        category: 'Subsidy',
        detail:
          'All benefits depend on MNRE/state eligibility. Subsidy sanction, delay, denial, or disbursement is solely at government discretion. ChairBord Solar is not responsible for subsidy approval or payment; the balance is payable per the payment terms below.'
      }
    );
  }

  termsRows.push(
    {
      category: 'Panels',
      detail: `${panelBrand} bifacial modules with manufacturer performance warranty as per BOM.`
    },
    {
      category: 'Inverter',
      detail: 'Grid-tie inverter as per specification; manufacturer warranty (typically 8–10 years) applies.'
    }
  );

  const customerName = [customer?.firstName, customer?.lastName].filter(Boolean).join(' ').trim() || '—';
  const customerAddress = [
    customer?.streetAddress,
    customer?.city,
    customer?.state,
    customer?.pincode
  ]
    .filter(Boolean)
    .join(', ');

  const dealerName =
    [dealer?.firstName, dealer?.lastName].filter(Boolean).join(' ').trim() || PROPOSAL_COMPANY.name;

  const subsidyClause = commercial ? 'and other clauses' : 'subsidy, and other clauses';

  return {
    quotationId: quotation.id,
    quotationDateLabel: formatProposalDate(quotationDate),
    validityDateLabel: formatProposalDate(validityDate),
    customerName,
    customerEmail: customer?.email ? String(customer.email).trim() : null,
    customerPhone: customer?.mobile || '—',
    customerAddress: customerAddress || '—',
    systemTypeLabel: systemTypeLabel(systemType, p.inverterType),
    dealerName,
    dealerContact: dealer?.mobile || PROPOSAL_COMPANY.phone,
    dealerEmail: dealer?.email || PROPOSAL_COMPANY.email,
    companyGst: PROPOSAL_COMPANY.gst,
    systemKwLabel: kwLabel,
    phaseLabel: phase,
    specRows: buildSpecRows(p, kwLabel),
    panelNote: '',
    showPricingRateColumn: showRate,
    pricingRows,
    pricingTotalLabel,
    pricingTotalAmountLabel: subtotalLabel,
    subtotalLabel,
    paymentTypeLabel: paymentTypeLabelFromQuotation(quotation),
    paymentRows,
    banks: PROPOSAL_BANKS,
    warrantyRows: [
      {
        component: `Solar Panels (${panelBrand})`,
        period: '30 Years',
        coverage: 'Linear Power Output Guarantee'
      },
      {
        component: `GTI Inverter (${inverterBrand})`,
        period: '8–10 Years',
        coverage: 'Manufacturing Defects'
      },
      {
        component: 'Complete System',
        period: '5 Years',
        coverage: 'Comprehensive System Warranty by Chairbord Solar'
      }
    ],
    supportLine: [
      `Support No: ${PROPOSAL_SUPPORT_PHONE}`,
      `Support Email: ${PROPOSAL_SUPPORT_EMAIL}`,
      `Support Form: ${PROPOSAL_COMPANY.supportFormUrl}`
    ].join('  |  '),
    termsRows,
    consentText: `I have read, understood, and agree to all Terms & Conditions stated in this proposal (including payment schedule, project timeline, validity, on-grid operation, net metering, ${subsidyClause}). I authorize ${PROPOSAL_COMPANY.name} to proceed as per this quotation.`,
    companyName: PROPOSAL_COMPANY.name,
    companyPhone: PROPOSAL_COMPANY.phone,
    offices: [
      { label: 'Jaipur (Head Office)', address: PROPOSAL_COMPANY.address },
      ...PROPOSAL_COMPANY.branches.map((b) => ({ label: b.label, address: b.address }))
    ],
    logoDataUri: loadLogoDataUri(),
    page2CompactFont: systemType === 'both'
  };
};
