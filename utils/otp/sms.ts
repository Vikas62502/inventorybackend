type SmsTemplateId = '2FA_AUTH';

type SmsTemplate = {
  message: (message: string, otpNumber: string) => string;
  templateId: string | undefined;
};

const SMS_URL = process.env.SMS_URL;
const API_KEY = process.env.DLT_API_KEY;
const SENDER_ID = process.env.DLT_SENDER_ID;

const TEMPLATES: Record<SmsTemplateId, SmsTemplate> = {
  '2FA_AUTH': {
    message: (message: string, otpNumber: string) =>
      `Your OTP for ChairBord ${message} is: ${otpNumber} .Please do not share this OTP with anyone.
ChairBord Pvt. Ltd.`,
    templateId: process.env.DLT_TEMPLATE_ID_2FA_AUTH
  }
};

/** e.g. 10 → "10kw", 5.5 → "5.5kw" */
export const formatOtpSystemSize = (systemKw: number | null | undefined): string => {
  const n = Number(systemKw);
  if (!Number.isFinite(n) || n <= 0) return '0kw';
  const label = Number.isInteger(n)
    ? String(n)
    : String(Math.round(n * 100) / 100).replace(/\.0+$/, '');
  return `${label}kw`;
};

/** Whole-rupee amount for SMS, e.g. 178000 */
export const formatOtpAmount = (amount: number | null | undefined): string =>
  String(Math.max(0, Math.round(Number(amount) || 0)));

/** e.g. dcr | non-dcr | both */
export const formatOtpSystemSet = (systemType: string | null | undefined): string => {
  const t = String(systemType || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');
  if (t === 'nondcr' || t === 'non-dcr') return 'non-dcr';
  if (t === 'both' || t === 'dcr+non-dcr') return 'both';
  if (t === 'dcr') return 'dcr';
  if (t === 'customize' || t === 'custom') return 'customize';
  return t || 'dcr';
};

/**
 * DLT template `message` var only (OTP is separate):
 * e.g. "10kw of amt:178000 dcr"
 * Final SMS: Your OTP for ChairBord 10kw of amt:178000 dcr is: 2575 .Please do not share...
 */
export const buildOtpContext = (args: {
  systemSize: string;
  amount: string;
  systemSet: string;
}): string => {
  const size = String(args.systemSize || '0kw').trim();
  const amount = String(args.amount || '0').trim();
  const set = String(args.systemSet || 'dcr').trim();
  return `${size} of amt:${amount} ${set}`;
};

/**
 * Send DLT SMS using registered template:
 * Your OTP for ChairBord ${message} is: ${otpNumber} .Please do not share this OTP with anyone.
 */
const sendSms = async (
  mobileNumber: string,
  message: string,
  otpNumber: string,
  msgId: SmsTemplateId = '2FA_AUTH'
): Promise<void> => {
  if (!SMS_URL || !API_KEY || !SENDER_ID) {
    throw new Error('SMS_URL, DLT_API_KEY, and DLT_SENDER_ID are required');
  }

  const template = TEMPLATES[msgId];
  if (!template) {
    throw new Error(`Invalid template ID: ${msgId}`);
  }
  if (!template.templateId) {
    throw new Error(`Missing DLT template id for msgId ${msgId}`);
  }

  const body = new URLSearchParams({
    sender_id: SENDER_ID,
    mobile_no: mobileNumber,
    message: template.message(message, otpNumber),
    dlt_template_id: template.templateId
  });

  try {
    const response = await fetch(SMS_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${API_KEY}`,
        'cache-control': 'no-cache',
        'content-type': 'application/x-www-form-urlencoded'
      },
      body
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error('Error sending SMS:', errorBody || response.statusText);
      throw new Error(errorBody || `SMS provider error (${response.status})`);
    }
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error('Error sending SMS:', errMessage);
    throw error instanceof Error ? error : new Error(errMessage);
  }
};

export default sendSms;
export { sendSms, type SmsTemplateId };
