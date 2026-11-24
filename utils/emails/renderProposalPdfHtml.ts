import { PROPOSAL_PDF_STYLES } from './proposalPdfStyles';
import type { ProposalPdfDocument } from './buildProposalDocument';

const esc = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Full HTML document matching create-quotation-flow QuotationProposalPdf (3 A4 pages). */
export const renderProposalPdfHtml = (data: ProposalPdfDocument): string => {
  const rateCol = data.showPricingRateColumn;
  const page2Class = data.page2CompactFont
    ? 'proposal-pdf-page proposal-pdf-page-2 proposal-pdf-page-2-compact'
    : 'proposal-pdf-page proposal-pdf-page-2';

  const printOverrides = `
.proposal-pdf-root {
  position: static !important;
  left: auto !important;
  top: auto !important;
  z-index: auto !important;
  pointer-events: auto !important;
}
.proposal-pdf-page {
  box-shadow: none;
  margin: 0;
}
@media print {
  .proposal-pdf-page { page-break-after: always; }
  .proposal-pdf-page:last-child { page-break-after: auto; }
}
`;

  const fieldTable = (rows: Array<{ label: string; value: string }>) => `
    <table class="prop-field-table"><tbody>
      ${rows
        .map(
          (row) => `
        <tr>
          <td class="prop-field-label">${esc(row.label)}</td>
          <td class="prop-field-value">${esc(row.value || '—')}</td>
        </tr>`
        )
        .join('')}
    </tbody></table>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${PROPOSAL_PDF_STYLES}${printOverrides}</style>
</head>
<body>
<div class="proposal-pdf-root">
  <div class="proposal-pdf-page proposal-pdf-page-1">
    <div class="prop-page-top">
      <div class="prop-header">
        ${data.logoDataUri ? `<img src="${data.logoDataUri}" alt="ChairBord Solar" />` : ''}
        <div class="prop-title-block">
          <h1>Solar Installation Proposal</h1>
          <div class="prop-meta">
            <div><strong>Quotation #:</strong> ${esc(data.quotationId)}</div>
            <div><strong>Updated:</strong> ${esc(data.quotationDateLabel)}</div>
            <div><strong>Valid Until:</strong> ${esc(data.validityDateLabel)}</div>
          </div>
        </div>
      </div>
      <hr class="prop-header-rule" />
      <span class="prop-tagline">Green Energy, Bright Future.</span>
      <div class="prop-section-box">
        <div class="prop-bar">■ Proposal Details</div>
        <div class="prop-details-body">
          <div class="prop-details-col">
            <h3>■ Customer Details</h3>
            ${fieldTable([
              { label: 'Name:', value: data.customerName },
              { label: 'Phone:', value: data.customerPhone },
              { label: 'Address:', value: data.customerAddress },
              { label: 'System Type:', value: data.systemTypeLabel }
            ])}
          </div>
          <div class="prop-details-col">
            <h3>■ Dealer Details</h3>
            ${fieldTable([
              { label: 'Dealer Name:', value: data.dealerName },
              { label: 'Contact No.:', value: data.dealerContact },
              { label: 'Email:', value: data.dealerEmail },
              { label: 'GSTIN:', value: data.companyGst }
            ])}
          </div>
        </div>
      </div>
    </div>
    <div class="prop-spec-block">
      <div class="prop-bar">Solar System Specification — ${esc(data.systemKwLabel)}</div>
      <div class="prop-subbar">
        System Size: ${esc(data.systemKwLabel)} | Phase: ${esc(data.phaseLabel)} | Type: ${esc(data.systemTypeLabel)}
      </div>
      <table class="prop-table">
        <thead>
          <tr>
            <th style="width:22%">Component</th>
            <th style="width:32%">Specification</th>
            <th style="width:32%">Brand / Model</th>
            <th class="col-qty">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${data.specRows
            .map(
              (row) => `
            <tr>
              <td class="prop-component-cell">${esc(row.component)}</td>
              <td>${esc(row.specification)}</td>
              <td>${esc(row.brandModel)}</td>
              <td class="col-qty">${esc(row.qty)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="${page2Class}">
    <div class="prop-p2-body">
      ${data.panelNote ? `<div class="prop-p2-intro prop-note-green">${esc(data.panelNote)}</div>` : ''}
      <div class="prop-p2-section">
        <div class="prop-bar">Pricing Breakdown</div>
        <table class="prop-table${rateCol ? '' : ' prop-pricing-table-no-rate'}">
          <thead>
            <tr>
              <th>Description</th>
              ${rateCol ? '<th>Rate</th>' : ''}
              <th>Capacity</th>
              <th class="col-amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.pricingRows
              .map(
                (row) => `
              <tr class="${row.highlight ? 'prop-highlight-row' : ''}">
                <td>${esc(row.description)}</td>
                ${rateCol ? `<td>${esc(row.rate)}</td>` : ''}
                <td>${esc(row.capacity)}</td>
                <td class="col-amount">${esc(row.amount)}</td>
              </tr>`
              )
              .join('')}
            <tr class="prop-total-row">
              <td colspan="${rateCol ? 3 : 2}">${esc(data.pricingTotalLabel)}</td>
              <td class="col-amount">${esc(data.pricingTotalAmountLabel)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="prop-p2-section">
        <div class="prop-bar">Payment Schedule</div>
        <table class="prop-table">
          <thead>
            <tr>
              <th>Stage</th>
              <th>When</th>
              <th>Percentage</th>
              <th class="col-amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.paymentRows
              .map((row) => {
                const cls = [
                  row.highlight ? 'prop-highlight-row' : '',
                  row.isToken ? 'prop-payment-token' : '',
                  row.isTotal ? 'prop-payment-total-row' : ''
                ]
                  .filter(Boolean)
                  .join(' ');
                return `
              <tr class="${cls}">
                <td>${esc(row.stage)}</td>
                <td>${esc(row.when)}</td>
                <td>${esc(row.percentage)}</td>
                <td class="col-amount">${esc(row.amount)}</td>
              </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>

      <div class="prop-p2-section">
        <div class="prop-bar">Bank Details for Payment</div>
        <div class="prop-bank-grid">
          <div class="prop-bank-box sbi">
            <strong>${esc(data.banks.sbi.bankName)}</strong>
            <p><strong>A/C Name:</strong> ${esc(data.banks.sbi.accountName)}</p>
            <p><strong>A/C No:</strong> ${esc(data.banks.sbi.accountNumber)}</p>
            <p><strong>IFSC:</strong> ${esc(data.banks.sbi.ifscCode)}</p>
          </div>
          <div class="prop-bank-box icici">
            <strong>${esc(data.banks.icici.bankName)}</strong>
            <p><strong>A/C Name:</strong> ${esc(data.banks.icici.accountName)}</p>
            <p><strong>A/C No:</strong> ${esc(data.banks.icici.accountNumber)}</p>
            <p><strong>IFSC:</strong> ${esc(data.banks.icici.ifscCode)}</p>
          </div>
        </div>
      </div>

      <div class="prop-p2-section">
        <div class="prop-bar">Warranty &amp; After-Sales Support</div>
        <table class="prop-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Warranty Period</th>
              <th>Coverage</th>
            </tr>
          </thead>
          <tbody>
            ${data.warrantyRows
              .map(
                (row) => `
              <tr>
                <td>${esc(row.component)}</td>
                <td>${esc(row.period)}</td>
                <td>${esc(row.coverage)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
        <p class="prop-support-line">${esc(data.supportLine)}</p>
      </div>
      <div class="prop-p2-spacer" aria-hidden="true"></div>
    </div>
  </div>

  <div class="proposal-pdf-page proposal-pdf-page-3">
    <div class="prop-p3-body">
      <div class="prop-p3-section">
        <div class="prop-bar">Terms &amp; Conditions</div>
        <table class="prop-table">
          <thead>
            <tr>
              <th style="width:22%">Category</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${data.termsRows
              .map(
                (row) => `
              <tr>
                <td><strong>${esc(row.category)}</strong></td>
                <td>${esc(row.detail)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <div class="prop-p3-section">
        <div class="prop-bar">Customer Consent &amp; Acceptance</div>
        <div class="prop-consent">
          <table class="prop-consent-check-table" role="presentation">
            <tbody>
              <tr>
                <td class="prop-consent-check-box-cell"><span class="prop-consent-checkbox" aria-hidden="true"></span></td>
                <td class="prop-consent-check-text-cell">${esc(data.consentText)}</td>
              </tr>
            </tbody>
          </table>
          <table class="prop-consent-fields-table" role="presentation">
            <tbody>
              <tr>
                <td class="prop-consent-field-cell">Name:</td>
                <td class="prop-consent-field-cell">Relation (if any):</td>
                <td class="prop-consent-field-cell">Date:</td>
              </tr>
            </tbody>
          </table>
          <table class="prop-consent-sign-table" role="presentation">
            <tbody>
              <tr>
                <td class="prop-consent-sign-cell">
                  <div class="prop-consent-sign-inner">
                    <div class="prop-consent-sign-head">Customer (Self)</div>
                    <div class="prop-consent-sign-body">
                      <div class="prop-consent-sign-caption">Signature</div>
                    </div>
                  </div>
                </td>
                <td class="prop-consent-sign-cell prop-consent-sign-cell-center">
                  <div class="prop-consent-sign-inner">
                    <div class="prop-consent-sign-head">For, ${esc(data.companyName)}</div>
                    <div class="prop-consent-sign-designation">Designation:</div>
                    <div class="prop-consent-sign-body">
                      <div class="prop-consent-sign-caption">Authorised Signature</div>
                    </div>
                  </div>
                </td>
                <td class="prop-consent-sign-cell">
                  <div class="prop-consent-sign-inner">
                    <div class="prop-consent-sign-head">Office Stamp</div>
                    <div class="prop-consent-sign-body prop-consent-stamp-body"></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="prop-p3-spacer" aria-hidden="true"></div>
    </div>
    <div class="prop-closing">
      <p>Thanking you and assuring you of our best and prompt attention at all times, we remain.</p>
      <p class="sig">Yours faithfully,</p>
      <p class="sig">For, ${esc(data.companyName)}</p>
      <div class="prop-offices">
        ${data.offices
          .map(
            (office) =>
              `<p><strong>${esc(office.label)}:</strong> ${esc(office.address)}</p>`
          )
          .join('')}
        <p><strong>Mobile:</strong> ${esc(data.companyPhone)} | <strong>GSTIN:</strong> ${esc(data.companyGst)}</p>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
};
