/** Mirrors create-quotation-flow quotation-details-dialog company + bank constants. */

export const PROPOSAL_COMPANY = {
  name: 'ChairBord Pvt. Ltd.',
  address:
    'Plot No. 10, Ground Floor, Shri Shyam Vihar, Kalwar Road, Jhotwara, Jaipur, Rajasthan, India - 302012',
  branches: [
    {
      label: 'Ajmer',
      address:
        '2nd Floor, Miraj Cinema Mall, Gaurav Path, Apna Nagar, Vaishali Nagar, Ajmer, Rajasthan 305001'
    },
    {
      label: 'Chomu',
      address: 'Radha Swami Bagh, Jaipur Rd, behind MRF Showroom, Chomu, Rajasthan 303702'
    }
  ],
  phone: '+91 9251666646',
  email: 'info@chairbord.com',
  supportFormUrl: 'https://www.chairbord.com/support',
  gst: '08AAJCC8097M1ZT'
} as const;

export const PROPOSAL_BANKS = {
  sbi: {
    bankName: 'State Bank of India',
    accountName: 'CHAIRBORD PRIVATE LIMITED',
    accountNumber: '44487702699',
    ifscCode: 'SBIN0032365'
  },
  icici: {
    bankName: 'ICICI Bank',
    accountName: 'CHAIRBORD PRIVATE LIMITED',
    accountNumber: '777705926966',
    ifscCode: 'ICIC0004181'
  }
} as const;

export const PROPOSAL_VALIDITY_DAYS = 7;
export const PROPOSAL_SUPPORT_PHONE = '+91 9785230023';
export const PROPOSAL_SUPPORT_EMAIL = 'info@chairbord.com';

export const PROPOSAL_PAYMENT_TERMS_DETAIL = [
  'Token Money (Cash/UPI/Netbanking): 10–20% of total system cost to secure the contract and cover initial costs (design, permits, equipment ordering).',
  'For Cash: 75–85% of the system cost must be cleared in cash before material dispatch, before installation work starts.',
  'For Loan: 70% of the system cost must be cleared before installation work starts, with the remaining 30% payable after installation.',
  'Material Delivery: Once 70% is paid (loan) or 75–85% is paid (cash, before material dispatch), equipment is dispatched to the site and installation must start within 7–10 days.',
  'Metering & Closure: After successful installation, only 5% remains and the rest of the amount must be cleared before metering work and commissioning finalize.'
].join('\n');
