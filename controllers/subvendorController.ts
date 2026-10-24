import { Request, Response } from 'express';
import { Op, UniqueConstraintError, WhereOptions } from 'sequelize';
import {
  Customer,
  Dealer,
  OfficeOutsideLedger,
  OfficeOutsideRecord,
  Quotation,
  Subvendor,
  SubvendorLedger,
  SubvendorLeaserPayment,
  SubvendorBill
} from '../models/index-quotation';
import { logError } from '../utils/loggerHelper';
import {
  SUBVENDOR_ERROR_CODES,
  isUuid,
  normalizeSubvendorKind,
  parseLedgerAmountPatch,
  parseLeaserPayments,
  parseSubvendorBills,
  publicLeaserPayment,
  publicSubvendorBill,
  BILLS_JSON_MAX_BYTES,
  SubvendorBillInput,
  roundInr,
  parseSubvendorDealerId,
  parseSubvendorRateFields,
  parseSubvendorProfileFields,
  publicLedger,
  publicSubvendor,
  SubvendorKindValue
} from '../utils/subvendorApi';
import { echoAccountsPaidAmount } from '../utils/quotationPaymentPhases';
import {
  officeOutsideLeaserGst,
  officeOutsideLeaserProfit,
  officeOutsideLeaserRemaining
} from '../utils/officeOutsideApi';

const fail = (res: Response, status: number, code: string, message: string): void => {
  res.status(status).json({ success: false, error: { code, message } });
};

const internalError = (res: Response): void => fail(res, 500, 'SYS_001', 'Internal error');

const dealerDisplayName = (dealer: Dealer): string =>
  String((dealer as any).company || '').trim() ||
  `${dealer.firstName || ''} ${dealer.lastName || ''}`.trim() ||
  dealer.username;

const findOfficeInsideDuplicate = (dealerId: string, excludeId?: string) =>
  Subvendor.findOne({
    where: {
      kind: 'office_inside',
      dealerId,
      ...(excludeId ? { id: { [Op.ne]: excludeId } } : {})
    }
  });

/**
 * Resolve the persisted shape for a subvendor after applying body changes.
 * Returns an error tuple instead of throwing so handlers map to the §BD error codes.
 */
const resolveSubvendorWrite = async (
  body: Record<string, unknown>,
  existing: Subvendor | null
): Promise<
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; status: number; code: string; message: string }
> => {
  const kindRaw = body.kind;
  const kind: SubvendorKindValue | null =
    kindRaw !== undefined ? normalizeSubvendorKind(kindRaw) : (existing?.kind ?? null);
  if (!kind) {
    return {
      ok: false,
      status: 400,
      code: SUBVENDOR_ERROR_CODES.VAL_KIND,
      message: 'kind must be office_inside or office_outside'
    };
  }

  const profile = parseSubvendorProfileFields(body);
  const values: Record<string, unknown> = { kind, ...profile, ...parseSubvendorRateFields(body) };

  if (kind === 'office_inside') {
    const dealerIdInput = parseSubvendorDealerId(body);
    const dealerId = dealerIdInput !== undefined ? dealerIdInput : existing?.dealerId || '';
    if (!dealerId) {
      return {
        ok: false,
        status: 400,
        code: SUBVENDOR_ERROR_CODES.VAL_DEALER,
        message: 'dealerId is required for office_inside'
      };
    }
    const dealer = await Dealer.findByPk(dealerId);
    if (!dealer) {
      return {
        ok: false,
        status: 400,
        code: SUBVENDOR_ERROR_CODES.VAL_DEALER,
        message: 'dealerId does not match a dealer'
      };
    }
    const duplicate = await findOfficeInsideDuplicate(dealerId, existing?.id);
    if (duplicate) {
      return {
        ok: false,
        status: 409,
        code: SUBVENDOR_ERROR_CODES.SUBVENDOR_DUP,
        message: 'That dealer is already an office inside vendor'
      };
    }
    values.dealerId = dealerId;
    // Fill blanks from the dealer profile (never overwrite values the admin typed).
    const current = (key: string) =>
      (values[key] as string | undefined) ?? ((existing as any)?.[key] as string | undefined) ?? '';
    if (!current('name')) values.name = dealerDisplayName(dealer);
    if (!current('contactName')) values.contactName = `${dealer.firstName || ''} ${dealer.lastName || ''}`.trim();
    if (!current('mobile')) values.mobile = dealer.mobile || '';
    if (!current('email')) values.email = dealer.email || '';
    if (!current('city')) values.city = (dealer as any).addressCity || '';
  } else {
    values.dealerId = null;
    const name = (values.name as string | undefined) ?? existing?.name ?? '';
    if (!name) {
      return {
        ok: false,
        status: 400,
        code: SUBVENDOR_ERROR_CODES.VAL_NAME,
        message: 'name is required for office_outside'
      };
    }
  }

  return { ok: true, values };
};

/** GET /admin/subvendors?kind=office_inside|office_outside */
export const listSubvendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const where: WhereOptions = {};
    if (req.query.kind !== undefined && String(req.query.kind).trim()) {
      const kind = normalizeSubvendorKind(req.query.kind);
      if (!kind) {
        fail(res, 400, SUBVENDOR_ERROR_CODES.VAL_KIND, 'kind must be office_inside or office_outside');
        return;
      }
      (where as any).kind = kind;
    }
    const rows = await Subvendor.findAll({ where, order: [['name', 'ASC']] });
    res.json({ success: true, data: { subvendors: rows.map((row) => publicSubvendor(row.get({ plain: true }))) } });
  } catch (error) {
    logError('List subvendors error', error);
    internalError(res);
  }
};

/** POST /admin/subvendors */
export const createSubvendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    if (body.kind === undefined) {
      fail(res, 400, SUBVENDOR_ERROR_CODES.VAL_KIND, 'kind is required');
      return;
    }
    const resolved = await resolveSubvendorWrite(body, null);
    if (!resolved.ok) {
      fail(res, resolved.status, resolved.code, resolved.message);
      return;
    }
    const row = await Subvendor.create(resolved.values as any);
    res.status(201).json({ success: true, data: { subvendor: publicSubvendor(row.get({ plain: true })) } });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      fail(res, 409, SUBVENDOR_ERROR_CODES.SUBVENDOR_DUP, 'That dealer is already an office inside vendor');
      return;
    }
    logError('Create subvendor error', error);
    internalError(res);
  }
};

/** PATCH /admin/subvendors/:id */
export const updateSubvendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const row = isUuid(id) ? await Subvendor.findByPk(id) : null;
    if (!row) {
      fail(res, 404, SUBVENDOR_ERROR_CODES.SUBVENDOR_404, 'Subvendor not found');
      return;
    }
    const resolved = await resolveSubvendorWrite((req.body || {}) as Record<string, unknown>, row);
    if (!resolved.ok) {
      fail(res, resolved.status, resolved.code, resolved.message);
      return;
    }
    await row.update(resolved.values as any);
    await row.reload();
    res.json({ success: true, data: { subvendor: publicSubvendor(row.get({ plain: true })) } });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      fail(res, 409, SUBVENDOR_ERROR_CODES.SUBVENDOR_DUP, 'That dealer is already an office inside vendor');
      return;
    }
    logError('Update subvendor error', error, { id: req.params.id });
    internalError(res);
  }
};

/** DELETE /admin/subvendors/:id — ledger rows are kept; vendor_id becomes null. */
export const deleteSubvendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const row = isUuid(id) ? await Subvendor.findByPk(id) : null;
    if (!row) {
      fail(res, 404, SUBVENDOR_ERROR_CODES.SUBVENDOR_404, 'Subvendor not found');
      return;
    }
    await SubvendorLedger.update({ vendorId: null }, { where: { vendorId: row.id } });
    await row.destroy();
    res.json({ success: true, data: { id: row.id, deleted: true } });
  } catch (error) {
    logError('Delete subvendor error', error, { id: req.params.id });
    internalError(res);
  }
};

const ledgerRowForApi = (row: SubvendorLedger) => {
  const plain = row.get({ plain: true }) as Record<string, any>;
  const quotation = plain.quotation || null;
  const vendor = plain.vendor || null;
  const customer = quotation?.customer || null;
  const dealerId = quotation?.dealerId ?? null;
  return {
    ...publicLedger(plain),
    dealerId,
    dealer_id: dealerId,
    vendorName: vendor?.name ?? null,
    vendor_name: vendor?.name ?? null,
    customerName: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : null,
    customer_name: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : null,
    customerMobile: customer?.mobile ?? null,
    customer_mobile: customer?.mobile ?? null
  };
};

/** GET /admin/subvendors/ledger?vendorId=&search= */
export const listSubvendorLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorIdQuery = String(req.query.vendorId ?? req.query.vendor_id ?? '').trim();
    const search = String(req.query.search ?? req.query.q ?? '').trim();

    const and: WhereOptions[] = [];
    if (vendorIdQuery) {
      // FE passes the linked dealer id; also accept a subvendor uuid.
      const vendorOr: WhereOptions[] = [
        { '$vendor.dealer_id$': vendorIdQuery },
        { '$quotation.dealerId$': vendorIdQuery }
      ];
      if (isUuid(vendorIdQuery)) vendorOr.push({ vendorId: vendorIdQuery });
      and.push({ [Op.or]: vendorOr });
    }
    if (search) {
      const like = `%${search}%`;
      and.push({
        [Op.or]: [
          { quotationId: { [Op.iLike]: like } },
          { '$vendor.name$': { [Op.iLike]: like } },
          { '$quotation.customer.firstName$': { [Op.iLike]: like } },
          { '$quotation.customer.lastName$': { [Op.iLike]: like } },
          { '$quotation.customer.mobile$': { [Op.iLike]: like } }
        ]
      });
    }

    const rows = await SubvendorLedger.findAll({
      where: and.length ? { [Op.and]: and } : {},
      include: [
        {
          model: Quotation,
          as: 'quotation',
          attributes: ['id', 'dealerId'],
          required: false,
          include: [
            {
              model: Customer,
              as: 'customer',
              attributes: ['id', 'firstName', 'lastName', 'mobile'],
              required: false
            }
          ]
        },
        { model: Subvendor, as: 'vendor', attributes: ['id', 'name', 'dealerId'], required: false }
      ],
      order: [['updatedAt', 'DESC']]
    });

    res.json({ success: true, data: { items: rows.map(ledgerRowForApi) } });
  } catch (error) {
    logError('List subvendor ledger error', error);
    internalError(res);
  }
};

/** `:id` / `?vendorId=` = subvendor UUID (office_inside or office_outside) or a dealer id → office_inside. */
const resolveLeaserVendor = async (idOrDealerId: string): Promise<Subvendor | null> => {
  const id = String(idOrDealerId || '').trim();
  if (!id) return null;
  if (isUuid(id)) {
    const byId = await Subvendor.findByPk(id);
    if (byId) return byId;
  }
  return Subvendor.findOne({ where: { kind: 'office_inside', dealerId: id } });
};

type OfficeOutsideLeaserTotals = {
  billSum: number;
  paidAmount: number;
  charges: number;
  gst: number;
  profit: number;
};

const sumVendorBillBasic = async (vendorId: string): Promise<number> => {
  const bills = await SubvendorBill.findAll({
    where: { vendorId },
    attributes: ['basicAmount']
  });
  return bills.reduce((sum, row) => sum + roundInr(row.basicAmount), 0);
};

const officeOutsideLeaserTotalsForVendor = async (
  vendorId: string
): Promise<OfficeOutsideLeaserTotals> => {
  const [billSum, records] = await Promise.all([
    sumVendorBillBasic(vendorId),
    OfficeOutsideRecord.findAll({
      where: { vendorId },
      attributes: ['installmentsJson'],
      include: [
        {
          model: OfficeOutsideLedger,
          as: 'ledger',
          attributes: ['fileCharges', 'others'],
          required: false
        }
      ]
    })
  ]);
  let paidAmount = 0;
  let charges = 0;
  for (const rec of records) {
    const plain = rec.get({ plain: true }) as any;
    paidAmount += echoAccountsPaidAmount(plain.installmentsJson);
    charges += roundInr(plain.ledger?.fileCharges) + roundInr(plain.ledger?.others);
  }
  const gst = officeOutsideLeaserGst({ billSum, paidAmount });
  const profit = officeOutsideLeaserProfit({ paidAmount, billSum, charges, gst });
  return { billSum, paidAmount, charges, gst, profit };
};

const sumLeaserAmounts = (rows: Array<{ amount: unknown }>): number =>
  rows.reduce((total, row) => total + roundInr(row.amount), 0);

const leaserVendorPayload = (
  vendor: Subvendor,
  payments: SubvendorLeaserPayment[],
  outside?: OfficeOutsideLeaserTotals
) => {
  const plainVendor = publicSubvendor(vendor.get({ plain: true }));
  const currentBalance = sumLeaserAmounts(payments);
  const storedRemaining = roundInr(plainVendor.leaserRemaining);
  const echoRemaining =
    vendor.kind === 'office_outside' && roundInr(outside?.billSum) <= 0 ? 0 : storedRemaining;
  const base = {
    vendorId: vendor.id,
    vendor_id: vendor.id,
    kind: vendor.kind,
    dealerId: plainVendor.dealerId || null,
    dealer_id: plainVendor.dealerId || null,
    currentBalance,
    current_balance: currentBalance,
    leaserPaid: currentBalance,
    leaser_paid: currentBalance,
    totalPayment: currentBalance,
    total_payment: currentBalance,
    leaserRemaining: echoRemaining,
    leaser_remaining: echoRemaining,
    fileCostPerKw: plainVendor.fileCostPerKw,
    file_cost_per_kw: plainVendor.fileCostPerKw,
    payments: payments.map((row) => publicLeaserPayment(row.get({ plain: true })))
  };
  if (vendor.kind !== 'office_outside') return base;
  const billSum = roundInr(outside?.billSum);
  const gst = billSum <= 0 ? 0 : roundInr(outside?.gst);
  const profit = billSum <= 0 ? 0 : roundInr(outside?.profit);
  return {
    ...base,
    billSum,
    bill_sum: billSum,
    gst,
    gstCharges: gst,
    gst_charges: gst,
    profit,
    vendorProfit: profit,
    vendor_profit: profit
  };
};

const LEASER_ORDER: [string, string][] = [
  ['sortOrder', 'ASC'],
  ['createdAt', 'ASC']
];

/** GET /admin/subvendors/leaser?vendorId= */
export const listLeaserPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorQuery = String(req.query.vendorId ?? req.query.vendor_id ?? '').trim();
    let vendors: Subvendor[];
    if (vendorQuery) {
      const vendor = await resolveLeaserVendor(vendorQuery);
      vendors = vendor ? [vendor] : [];
    } else {
      vendors = await Subvendor.findAll({ order: [['name', 'ASC']] });
    }
    const vendorIds = vendors.map((v) => v.id);
    const payments = vendorIds.length
      ? await SubvendorLeaserPayment.findAll({
          where: { vendorId: { [Op.in]: vendorIds } },
          order: [['vendorId', 'ASC'], ...LEASER_ORDER] as any
        })
      : [];
    const byVendor = new Map<string, SubvendorLeaserPayment[]>();
    for (const row of payments) {
      const list = byVendor.get(row.vendorId) || [];
      list.push(row);
      byVendor.set(row.vendorId, list);
    }
    const balances = await Promise.all(
      vendors.map(async (vendor) => {
        const outside =
          vendor.kind === 'office_outside'
            ? await officeOutsideLeaserTotalsForVendor(vendor.id)
            : undefined;
        const { payments: _omit, ...summary } = leaserVendorPayload(
          vendor,
          byVendor.get(vendor.id) || [],
          outside
        );
        return summary;
      })
    );
    res.json({
      success: true,
      data: {
        payments: payments.map((row) => publicLeaserPayment(row.get({ plain: true }))),
        balances
      }
    });
  } catch (error) {
    logError('List leaser payments error', error);
    internalError(res);
  }
};

/** GET /admin/subvendors/:id/leaser */
export const getVendorLeaser = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await resolveLeaserVendor(req.params.id);
    if (!vendor) {
      fail(res, 404, SUBVENDOR_ERROR_CODES.SUBVENDOR_404, 'Subvendor not found');
      return;
    }
    const payments = await SubvendorLeaserPayment.findAll({
      where: { vendorId: vendor.id },
      order: LEASER_ORDER as any
    });
    const outside =
      vendor.kind === 'office_outside'
        ? await officeOutsideLeaserTotalsForVendor(vendor.id)
        : undefined;
    res.json({ success: true, data: leaserVendorPayload(vendor, payments, outside) });
  } catch (error) {
    logError('Get vendor leaser error', error, { id: req.params.id });
    internalError(res);
  }
};

/** PUT /admin/subvendors/:id/leaser — replace all payments; leaser_paid = SUM(amount). */
export const replaceVendorLeaser = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await resolveLeaserVendor(req.params.id);
    if (!vendor) {
      fail(res, 404, SUBVENDOR_ERROR_CODES.SUBVENDOR_404, 'Subvendor not found');
      return;
    }
    const parsed = parseLeaserPayments(req.body);
    if (!parsed.ok) {
      fail(res, 400, SUBVENDOR_ERROR_CODES.VAL_LEASER, parsed.message);
      return;
    }
    const body = (req.body && !Array.isArray(req.body) ? req.body : {}) as Record<string, unknown>;
    const remainingRaw = body.leaserRemaining !== undefined ? body.leaserRemaining : body.leaser_remaining;
    const updatedBy = req.dealer?.id || req.user?.id || null;
    const leaserPaid = parsed.payments.reduce((total, p) => total + p.amount, 0);
    let remainingPatch: number | undefined;
    if (remainingRaw !== undefined) {
      remainingPatch = roundInr(remainingRaw);
    } else if (vendor.kind === 'office_outside') {
      const totals = await officeOutsideLeaserTotalsForVendor(vendor.id);
      remainingPatch = officeOutsideLeaserRemaining({
        profit: totals.profit,
        leaserPaid,
        billSum: totals.billSum
      });
    }

    await Subvendor.sequelize!.transaction(async (transaction) => {
      await SubvendorLeaserPayment.destroy({ where: { vendorId: vendor.id }, transaction });
      const clientIds = parsed.payments.map((p) => p.id).filter((id): id is string => Boolean(id));
      // A client id still owned by another vendor (e.g. quotation moved) is reassigned to this one.
      const movedFrom = clientIds.length
        ? await SubvendorLeaserPayment.findAll({
            where: { id: { [Op.in]: clientIds }, vendorId: { [Op.ne]: vendor.id } },
            attributes: ['vendorId'],
            transaction
          })
        : [];
      if (parsed.payments.length) {
        await SubvendorLeaserPayment.bulkCreate(
          parsed.payments.map((p) => ({ ...p, vendorId: vendor.id, updatedBy })),
          {
            transaction,
            updateOnDuplicate: [
              'vendorId',
              'date',
              'amount',
              'type',
              'remark',
              'customerIds',
              'sortOrder',
              'updatedBy',
              'updatedAt'
            ]
          }
        );
      }
      for (const otherVendorId of new Set(movedFrom.map((row) => row.vendorId))) {
        const remainingRows = await SubvendorLeaserPayment.findAll({
          where: { vendorId: otherVendorId },
          attributes: ['amount'],
          transaction
        });
        await Subvendor.update(
          { leaserPaid: sumLeaserAmounts(remainingRows) },
          { where: { id: otherVendorId }, transaction }
        );
      }
      await vendor.update(
        {
          leaserPaid,
          ...(remainingPatch !== undefined ? { leaserRemaining: remainingPatch } : {})
        },
        { transaction }
      );
    });

    await vendor.reload();
    const payments = await SubvendorLeaserPayment.findAll({
      where: { vendorId: vendor.id },
      order: LEASER_ORDER as any
    });
    const outside =
      vendor.kind === 'office_outside'
        ? await officeOutsideLeaserTotalsForVendor(vendor.id)
        : undefined;
    res.json({ success: true, data: leaserVendorPayload(vendor, payments, outside) });
  } catch (error) {
    logError('Replace vendor leaser error', error, { id: req.params.id });
    internalError(res);
  }
};

const BILL_ORDER: [string, string][] = [
  ['sortOrder', 'ASC'],
  ['createdAt', 'ASC']
];

const sumBillBasic = (bills: SubvendorBill[]): number =>
  bills.reduce((sum, row) => sum + roundInr(row.basicAmount), 0);

const billsPayload = (vendor: Subvendor, bills: SubvendorBill[]) => {
  const billSum = sumBillBasic(bills);
  return {
    vendorId: vendor.id,
    vendor_id: vendor.id,
    kind: vendor.kind,
    billSum,
    bill_sum: billSum,
    bills: bills.map((row) => publicSubvendorBill(row.get({ plain: true }))),
    items: bills.map((row) => publicSubvendorBill(row.get({ plain: true })))
  };
};

const mergeKeptBillFiles = (incoming: SubvendorBillInput[], existing: SubvendorBill[]) => {
  const byId = new Map(existing.map((row) => [row.id, row]));
  return incoming.map((bill) => {
    const prev = bill.id ? byId.get(bill.id) : undefined;
    if (!prev) return bill;
    const keepData = !bill.billFileData && prev.billFileData;
    const keepUrl = !bill.billFileUrl && prev.billFileUrl;
    const keepName = !bill.billFileName && prev.billFileName;
    if (!keepData && !keepUrl && !keepName) return bill;
    return {
      ...bill,
      billFileName: keepName ? prev.billFileName : bill.billFileName,
      billFileData: keepData ? prev.billFileData : bill.billFileData,
      billFileUrl: keepUrl ? prev.billFileUrl : bill.billFileUrl
    };
  });
};

/** GET /admin/subvendors/bills?vendorId= */
export const listSubvendorBills = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorQuery = String(req.query.vendorId ?? req.query.vendor_id ?? '').trim();
    let vendors: Subvendor[];
    if (vendorQuery) {
      const vendor = await resolveLeaserVendor(vendorQuery);
      vendors = vendor ? [vendor] : [];
    } else {
      vendors = await Subvendor.findAll({ order: [['name', 'ASC']] });
    }
    const vendorIds = vendors.map((v) => v.id);
    const bills = vendorIds.length
      ? await SubvendorBill.findAll({
          where: { vendorId: { [Op.in]: vendorIds } },
          order: [['vendorId', 'ASC'], ...BILL_ORDER] as any
        })
      : [];
    const billSum = sumBillBasic(bills);
    res.json({
      success: true,
      data: {
        billSum,
        bill_sum: billSum,
        bills: bills.map((row) => publicSubvendorBill(row.get({ plain: true }))),
        items: bills.map((row) => publicSubvendorBill(row.get({ plain: true })))
      }
    });
  } catch (error) {
    logError('List subvendor bills error', error);
    internalError(res);
  }
};

/** GET /admin/subvendors/:id/bills */
export const getVendorBills = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await resolveLeaserVendor(req.params.id);
    if (!vendor) {
      fail(res, 404, SUBVENDOR_ERROR_CODES.SUBVENDOR_404, 'Subvendor not found');
      return;
    }
    const bills = await SubvendorBill.findAll({
      where: { vendorId: vendor.id },
      order: BILL_ORDER as any
    });
    res.json({ success: true, data: billsPayload(vendor, bills) });
  } catch (error) {
    logError('Get vendor bills error', error, { id: req.params.id });
    internalError(res);
  }
};

/** PUT /admin/subvendors/:id/bills — full replace. Bills stay off the leaser PUT. */
export const replaceVendorBills = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await resolveLeaserVendor(req.params.id);
    if (!vendor) {
      fail(res, 404, SUBVENDOR_ERROR_CODES.SUBVENDOR_404, 'Subvendor not found');
      return;
    }
    const rawSize = Buffer.byteLength(JSON.stringify(req.body ?? {}), 'utf8');
    if (rawSize > BILLS_JSON_MAX_BYTES) {
      fail(res, 413, SUBVENDOR_ERROR_CODES.VAL_BILL, 'bills body must be 5 MB or smaller');
      return;
    }
    const parsed = parseSubvendorBills(req.body);
    if (!parsed.ok) {
      fail(res, 400, SUBVENDOR_ERROR_CODES.VAL_BILL, parsed.message);
      return;
    }
    const existing = await SubvendorBill.findAll({ where: { vendorId: vendor.id } });
    const bills = mergeKeptBillFiles(parsed.bills, existing);
    const updatedBy = req.dealer?.id || req.user?.id || null;

    await Subvendor.sequelize!.transaction(async (transaction) => {
      await SubvendorBill.destroy({ where: { vendorId: vendor.id }, transaction });
      const clientIds = bills.map((p) => p.id).filter((id): id is string => Boolean(id));
      if (clientIds.length) {
        await SubvendorBill.destroy({
          where: { id: { [Op.in]: clientIds }, vendorId: { [Op.ne]: vendor.id } },
          transaction
        });
      }
      if (bills.length) {
        await SubvendorBill.bulkCreate(
          bills.map((p) => ({ ...p, vendorId: vendor.id, updatedBy })),
          { transaction }
        );
      }
    });

    const saved = await SubvendorBill.findAll({
      where: { vendorId: vendor.id },
      order: BILL_ORDER as any
    });
    res.json({ success: true, data: billsPayload(vendor, saved) });
  } catch (error) {
    logError('Replace vendor bills error', error, { id: req.params.id });
    internalError(res);
  }
};

/** PATCH /admin/subvendors/ledger/:quotationId — partial upsert by quotation_id. */
export const upsertSubvendorLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quotationId } = req.params;
    const quotation = await Quotation.findByPk(quotationId, { attributes: ['id', 'dealerId'] });
    if (!quotation) {
      fail(res, 404, SUBVENDOR_ERROR_CODES.QUOTATION_404, 'Quotation not found');
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const amounts = parseLedgerAmountPatch(body);
    const patch: Record<string, unknown> = {
      ...amounts,
      updatedBy: req.dealer?.id || req.user?.id || null
    };

    const explicitVendorId = body.vendorId !== undefined ? body.vendorId : body.vendor_id;
    if (isUuid(explicitVendorId) && (await Subvendor.findByPk(explicitVendorId))) {
      patch.vendorId = explicitVendorId;
    } else if (quotation.dealerId) {
      const insideVendor = await Subvendor.findOne({
        where: { kind: 'office_inside', dealerId: quotation.dealerId },
        attributes: ['id']
      });
      if (insideVendor) patch.vendorId = insideVendor.id;
    }

    const [row] = await SubvendorLedger.findOrCreate({
      where: { quotationId: quotation.id },
      defaults: { quotationId: quotation.id, ...(patch as any) }
    });
    await row.update(patch as any);
    await row.reload();

    res.json({ success: true, data: { item: publicLedger(row.get({ plain: true })) } });
  } catch (error) {
    logError('Upsert subvendor ledger error', error, { quotationId: req.params.quotationId });
    internalError(res);
  }
};
