type SmsTemplateId = '2FA_AUTH';

type SmsTemplate = {
  message: (message: string, otpNumber: string) => string;
  templateId: string | undefined;
};

const env = (key: string): string => {
  const raw = process.env[key];
  if (raw == null) return '';
  return String(raw).trim().replace(/^['"]|['"]$/g, '');
};

const getSmsConfig = () => ({
  smsUrl: env('SMS_URL'),
  apiKey: env('DLT_API_KEY'),
  senderId: env('DLT_SENDER_ID'),
  templateId2fa: env('DLT_TEMPLATE_ID_2FA_AUTH')
});

const getTemplates = (): Record<SmsTemplateId, SmsTemplate> => {
  const { templateId2fa } = getSmsConfig();
  return {
    '2FA_AUTH': {
      message: (message: string, otpNumber: string) =>
        `Your OTP for ChairBord ${message} is: ${otpNumber} .Please do not share this OTP with anyone.
ChairBord Pvt. Ltd.`,
      templateId: templateId2fa || undefined
    }
  };
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

/** After set: 1-Phase → "1-p", 3-Phase → "3-p" */
export const formatOtpPhase = (phase: string | null | undefined): string => {
  const p = String(phase || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');
  if (
    p === '3' ||
    p === '3p' ||
    p === '3-p' ||
    p === '3phase' ||
    p === '3-phase' ||
    p.startsWith('3')
  ) {
    return '3-p';
  }
  return '1-p';
};

/**
 * DLT template `message` var only (OTP is separate):
 * e.g. "10kw of amt:178000 dcr 1-p"
 * Final SMS: Your OTP for ChairBord 10kw of amt:178000 dcr 1-p is: 2575 .Please do not share...
 */
export const buildOtpContext = (args: {
  systemSize: string;
  amount: string;
  systemSet: string;
  phase?: string;
}): string => {
  const size = String(args.systemSize || '0kw').trim();
  const amount = String(args.amount || '0').trim();
  const set = String(args.systemSet || 'dcr').trim();
  const phase = formatOtpPhase(args.phase);
  return `${size} of amt:${amount} ${set} ${phase}`;
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
  const { smsUrl, apiKey, senderId } = getSmsConfig();
  if (!smsUrl || !apiKey || !senderId) {
    throw new Error('SMS_URL, DLT_API_KEY, and DLT_SENDER_ID are required');
  }

  const template = getTemplates()[msgId];
  if (!template) {
    throw new Error(`Invalid template ID: ${msgId}`);
  }
  if (!template.templateId) {
    throw new Error(`Missing DLT template id for msgId ${msgId}`);
  }

  const body = new URLSearchParams({
    sender_id: senderId,
    mobile_no: mobileNumber,
    message: template.message(message, otpNumber),
    dlt_template_id: template.templateId
  });

  try {
    const response = await fetch(smsUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
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
