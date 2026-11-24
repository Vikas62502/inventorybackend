import nodemailer from 'nodemailer';
import { buildProposalDocumentFromQuotationId } from './buildProposalDocument';
import { generateQuotationProposalPdfFromDocument } from './generateProposalPdf';

export type SendApprovalEmailInput = {
  /** Quotation id (e.g. QT-5MXYEQ) — PDF + email body are built from this quotation. */
  quotationId: string;
  /** Optional override; defaults to customer.email on the quotation. */
  to?: string;
  cc?: string | string[];
  /**
   * `consent` — after file login (proposal + consent PDF).
   * `approved` — after admin approve (default).
   */
  kind?: 'consent' | 'approved';
};

const requireMailEnv = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  if (!user || !pass) {
    throw new Error('EMAIL_USER and EMAIL_PASSWORD are required');
  }
  return { user, pass };
};

const createTransporter = () => {
  const { user, pass } = requireMailEnv();
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
};

/**
 * Sends Solar Quotation & Confirmation email (proposal PDF attached).
 * Loads the quotation by id → builds proposal PDF + body from that row only.
 */
export const sendQuotationApprovalEmail = async (
  input: SendApprovalEmailInput
): Promise<{ messageId?: string; to: string; quotationId: string }> => {
  const quotationId = String(input.quotationId || '').trim();
  if (!quotationId) {
    throw new Error('quotationId is required');
  }

  const doc = await buildProposalDocumentFromQuotationId(quotationId);
  const to = String(input.to || doc.customerEmail || '').trim();
  if (!to || !to.includes('@')) {
    throw new Error(
      `No recipient email for quotation ${quotationId} (pass to, or set customer.email)`
    );
  }

  const { user } = requireMailEnv();
  const pdfBuffer = await generateQuotationProposalPdfFromDocument(doc);
  const fileName = `ChairBord-Quotation-${quotationId}.pdf`;

  // systemKwLabel is e.g. "3.33 kW" — round capacity for email (3.33 → 3)
  const solarCapacityRaw = Number(
    String(doc.systemKwLabel || '')
      .replace(/\s*kW\s*$/i, '')
      .trim()
  );
  const solarCapacity = Number.isFinite(solarCapacityRaw)
    ? String(Math.round(solarCapacityRaw))
    : '—';
  const phase = String(doc.phaseLabel || '1-Phase').trim();
  // subtotalLabel already uses Math.round via formatInr
  const projectCost = String(doc.subtotalLabel || '—').trim();
  const customerName = String(doc.customerName || 'Customer').trim();
  const subject = `ChairBord Solar – Quotation for Your Approval (${quotationId})`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #222; line-height: 1.6; max-width: 640px;">
      <p>Dear ${customerName} Ji,</p>
      <p>Greetings from ChairBord Solar!</p>
      <p>
        Please find attached the quotation for your proposed
        <strong>${solarCapacity} kW On-Grid Solar System</strong>
        (<strong>${phase}</strong>) for your review.
      </p>
      <p>
        <strong>Project cost (subtotal):</strong> ${projectCost}
      </p>
      <p>
        Kindly review the quotation, including the system specifications, components and pricing.
        If everything is as per your requirements, please confirm your approval so that we can
        proceed with the Solar Application &amp; Login Process.
      </p>
      <p>
        In case of any changes or queries, please feel free to contact us before confirmation.
      </p>
      <p style="margin-top: 24px;">
        Regards,<br/>
        <strong>Team ChairBord Solar</strong><br/>
        Email: <a href="mailto:info@chairbord.com">info@chairbord.com</a>
      </p>
      <p style="margin-top: 16px; color: #2f855a; font-style: italic;">
        Green Energy, Bright Future
      </p>
    </div>
  `;
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: `"ChairBord Solar" <${user}>`,
    to,
    cc: input.cc,
    subject,
    html,
    attachments: [
      {
        filename: fileName,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  });

  return { messageId: info.messageId, to, quotationId };
};

export default sendQuotationApprovalEmail;
