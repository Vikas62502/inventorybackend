import { Op } from 'sequelize';
import ApprovalOtp, { type ApprovalOtpRecipient } from '../../models/ApprovalOtp';
import { Quotation, QuotationProduct } from '../../models/index-quotation';
import {
  buildOtpContext,
  formatOtpAmount,
  formatOtpSystemSet,
  formatOtpSystemSize,
  sendSms
} from './sms';
import { computeSystemKwFromProducts } from '../quotationSystemKw';

export const APPROVAL_OTP_RECIPIENTS: Record<
  ApprovalOtpRecipient,
  { label: string; mobileNumber: string }
> = {
  kamlesh: { label: 'Kamlesh Sir', mobileNumber: '9269666646' },
  sunil: { label: 'Sunil Sir', mobileNumber: '9251666646' },
  hr: { label: 'HR', mobileNumber: '9251005610' }
};

const OTP_TTL_MS = 30 * 60 * 1000;

const normalizeRecipient = (raw: unknown): ApprovalOtpRecipient => {
  const key = String(raw || 'kamlesh').trim().toLowerCase();
  if (key === 'sunil') return 'sunil';
  if (key === 'hr') return 'hr';
  return 'kamlesh';
};

const generateFourDigitOtp = (): string => {
  const n = Math.floor(1000 + Math.random() * 9000);
  return String(n);
};

/** Drop expired rows and any existing OTP for this quotation (new OTP replaces old). */
const clearQuotationOtps = async (quotationId: string): Promise<void> => {
  await ApprovalOtp.destroy({ where: { quotationId } });
};

/** Periodic-style cleanup: erase expired OTPs. */
export const purgeExpiredApprovalOtps = async (): Promise<void> => {
  await ApprovalOtp.destroy({
    where: {
      expiresAt: { [Op.lt]: new Date() }
    }
  }).catch(() => undefined);
};

export type SendApprovalOtpResult = {
  quotationId: string;
  recipientKey: ApprovalOtpRecipient;
  recipientLabel: string;
  mobileNumber: string;
  expiresAt: string;
  /** DLT message var (no OTP), e.g. "10kw of amt:178000 dcr" */
  context: string;
  systemSize: string;
  amount: string;
  systemSet: string;
};

/** Resolve size / amount / set from quotation, then merge into one `context` string. */
const resolveOtpSmsPartsFromQuotation = async (quotationId: string) => {
  const quotation = await Quotation.findByPk(quotationId, {
    include: [{ model: QuotationProduct, as: 'products', required: false }]
  });
  if (!quotation) throw new Error(`Quotation ${quotationId} not found`);

  const products = (quotation as any).products;
  const productPlain =
    products && typeof products.get === 'function'
      ? (products.get({ plain: true }) as Record<string, unknown>)
      : (products as Record<string, unknown> | null);

  const systemType = String(
    productPlain?.systemType || quotation.systemType || ''
  ).toLowerCase();

  let systemKw = Number((quotation as any).systemKw);
  if (!Number.isFinite(systemKw) || systemKw <= 0) {
    const customPanels =
      productPlain?.customPanels ?? productPlain?.custom_panels ?? null;
    systemKw =
      computeSystemKwFromProducts(
        productPlain,
        Array.isArray(customPanels) ? customPanels : null,
        quotation.systemType
      ) || 0;
  }

  const subtotal = Number(
    quotation.subtotal ?? productPlain?.subtotal ?? quotation.totalAmount ?? 0
  );

  const systemSize = formatOtpSystemSize(systemKw);
  const amount = formatOtpAmount(subtotal);
  const systemSet = formatOtpSystemSet(systemType);

  return { systemSize, amount, systemSet };
};

export const sendApprovalOtp = async (input: {
  quotationId: string;
  recipient?: string;
}): Promise<SendApprovalOtpResult> => {
  const quotationId = String(input.quotationId || '').trim();
  if (!quotationId) throw new Error('quotationId is required');

  const smsParts = await resolveOtpSmsPartsFromQuotation(quotationId);

  const recipientKey = normalizeRecipient(input.recipient);
  const recipient = APPROVAL_OTP_RECIPIENTS[recipientKey];
  const otp = generateFourDigitOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  // DLT message var: "10kw of amt:178000 dcr" — OTP is the second template var
  const context = buildOtpContext({
    systemSize: smsParts.systemSize,
    amount: smsParts.amount,
    systemSet: smsParts.systemSet
  });

  await clearQuotationOtps(quotationId);
  await purgeExpiredApprovalOtps();

  await ApprovalOtp.create({
    quotationId,
    otp,
    recipientKey,
    mobileNumber: recipient.mobileNumber,
    expiresAt
  });

  // Template: Your OTP for ChairBord ${context} is: ${otp} .Please do not share...
  await sendSms(recipient.mobileNumber, context, otp, '2FA_AUTH');

  return {
    quotationId,
    recipientKey,
    recipientLabel: recipient.label,
    mobileNumber: recipient.mobileNumber,
    expiresAt: expiresAt.toISOString(),
    context,
    systemSize: smsParts.systemSize,
    amount: smsParts.amount,
    systemSet: smsParts.systemSet
  };
};

export type VerifyApprovalOtpResult = {
  quotationId: string;
  verified: true;
  /** Who received the OTP (for status timeline / approve audit). */
  recipientKey: ApprovalOtpRecipient;
  recipientLabel: string;
  mobileNumber: string;
};

export const verifyApprovalOtp = async (input: {
  quotationId: string;
  otp: string;
}): Promise<VerifyApprovalOtpResult> => {
  const quotationId = String(input.quotationId || '').trim();
  const otp = String(input.otp || '').trim();
  if (!quotationId) throw new Error('quotationId is required');
  if (!/^\d{4}$/.test(otp)) throw new Error('OTP must be a 4-digit code');

  await purgeExpiredApprovalOtps();

  const row = await ApprovalOtp.findOne({ where: { quotationId } });
  if (!row) {
    throw new Error('OTP not found or expired. Please send a new OTP.');
  }
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await clearQuotationOtps(quotationId);
    throw new Error('OTP expired. Please send a new OTP.');
  }
  if (row.otp !== otp) {
    throw new Error('Incorrect OTP');
  }

  const recipientKey = normalizeRecipient(row.recipientKey);
  const recipient = APPROVAL_OTP_RECIPIENTS[recipientKey];
  const mobileNumber = row.mobileNumber || recipient.mobileNumber;

  // Correct OTP → erase OTP row; stash verifier on quotation for approve → statusHistory
  await clearQuotationOtps(quotationId);
  try {
    await Quotation.update(
      {
        approvalOtpVerifiedBy: recipientKey,
        approvalOtpVerifiedAt: new Date()
      } as any,
      { where: { id: quotationId } }
    );
  } catch (err) {
    // Columns may not exist yet on older DBs — approve body still carries recipient.
    console.warn('Could not persist approvalOtpVerifiedBy (non-fatal)', err);
  }

  return {
    quotationId,
    verified: true,
    recipientKey,
    recipientLabel: recipient.label,
    mobileNumber
  };
};

/** Resolve display label for OTP verifier stored on status history / approve body. */
export const approvalOtpRecipientLabel = (raw: unknown): string => {
  const key = normalizeRecipient(raw);
  return APPROVAL_OTP_RECIPIENTS[key].label;
};

export { normalizeRecipient };
