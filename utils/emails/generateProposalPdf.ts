import puppeteer from 'puppeteer';
import {
  buildProposalDocumentFromQuotationId,
  type ProposalPdfDocument
} from './buildProposalDocument';
import { renderProposalPdfHtml } from './renderProposalPdfHtml';

const htmlToPdfBuffer = async (html: string): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
};

/** Render PDF from an already-loaded proposal document (built from quotation id). */
export const generateQuotationProposalPdfFromDocument = async (
  doc: ProposalPdfDocument
): Promise<Buffer> => htmlToPdfBuffer(renderProposalPdfHtml(doc));

/** Load quotation by id and render the FE-matching Solar Installation Proposal PDF. */
export const generateQuotationProposalPdf = async (
  quotationId: string
): Promise<Buffer> => {
  const doc = await buildProposalDocumentFromQuotationId(quotationId);
  return generateQuotationProposalPdfFromDocument(doc);
};
