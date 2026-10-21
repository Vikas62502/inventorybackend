import { Request, Response } from 'express';
import { Op, Sequelize, UniqueConstraintError, WhereOptions } from 'sequelize';
import {
  OfficeOutsideLedger,
  OfficeOutsideRecord,
  Subvendor
} from '../models/index-quotation';
import { logError } from '../utils/loggerHelper';
import { isUuid, parseLedgerAmountPatch, roundInr } from '../utils/subvendorApi';
import { normalizePaymentModeInput } from '../utils/paymentMode';
import {
  applyOfficeOutsideLedgerAmounts,
  isTenDigitMobile,
  normalizeOfficeOutsideMobile,
  OFFICE_OUTSIDE_ERROR_CODES,
  normalizeOfficeOutsidePhases,
  parseOfficeOutsidePublicIdPrefix,
  parseOfficeOutsideRecordPatch,
  paymentStatusFromPhases,
  publicOfficeOutsideLedger,
  publicOfficeOutsideRecord
} from '../utils/officeOutsideApi';

const fail = (res: Response, status: number, code: string, message: string): void => {
  res.status(status).json({ success: false, error: { code, message } });
};

const internalError = (res: Response): void => fail(res, 500, 'SYS_001', 'Internal error');

const actorId = (req: Request): string | null =>
  (req.dealer as any)?.id || (req.user as any)?.id || null;

const recordInclude = [
  { model: Subvendor, as: 'vendor', attributes: ['id', 'name', 'kind'], required: false }
];

const findOfficeOutsideVendor = async (vendorId: string | null | undefined) => {
  if (!vendorId) return { ok: true as const, vendor: null };
  if (!isUuid(vendorId)) {
    return {
      ok: false as const,
      status: 400,
      code: OFFICE_OUTSIDE_ERROR_CODES.VAL_VENDOR,
      message: 'vendorId must be an office_outside subvendor'
    };
  }
  const vendor = await Subvendor.findByPk(vendorId);
  if (!vendor || vendor.kind !== 'office_outside') {
    return {
      ok: false as const,
      status: 400,
      code: OFFICE_OUTSIDE_ERROR_CODES.VAL_VENDOR,
      message: 'vendorId must be an office_outside subvendor'
    };
  }
  return { ok: true as const, vendor };
};

const loadRecord = async (id: string) => {
  const raw = String(id || '').trim();
  if (!raw) return null;
  if (isUuid(raw)) return OfficeOutsideRecord.findByPk(raw, { include: recordInclude });
  const prefix = parseOfficeOutsidePublicIdPrefix(raw);
  if (!prefix) return null;
  return OfficeOutsideRecord.findOne({
    where: Sequelize.where(
      Sequelize.cast(Sequelize.col('OfficeOutsideRecord.id'), 'text'),
      { [Op.iLike]: `${prefix}-%` }
    ),
    include: recordInclude
  });
};

const sentStatusWhere = (raw: string): string | null => {
  const key = raw.replace(/[\s-]+/g, '_');
  if (key === 'draft') return 'draft';
  if (key === 'sent' || key === 'sent_to_accounts' || key === 'accounts') return 'sent_to_accounts';
  return null;
};

const recordPayload = (row: OfficeOutsideRecord) =>
  publicOfficeOutsideRecord(row.get({ plain: true }));

const ensureLedger = async (record: OfficeOutsideRecord, updatedBy: string | null) => {
  const [row] = await OfficeOutsideLedger.findOrCreate({
    where: { recordId: record.id },
    defaults: {
      recordId: record.id,
      vendorId: record.vendorId,
      updatedBy
    } as any
  });
  return row;
};

const ledgerPayload = (row: Record<string, unknown>) => publicOfficeOutsideLedger(row);

const findByTenDigitMobile = async (mobile: string) => {
  if (!isTenDigitMobile(mobile)) return null;
  return OfficeOutsideRecord.findOne({
    where: { customerMobile: normalizeOfficeOutsideMobile(mobile) },
    include: recordInclude
  });
};

const isMobileUniqueError = (error: unknown): boolean => {
  if (!(error instanceof UniqueConstraintError)) return false;
  const constraint = String((error as any).parent?.constraint || (error as any).index || '');
  if (constraint.includes('office_outside_mobile_unique')) return true;
  const fields = (error.fields || {}) as Record<string, unknown>;
  return 'customerMobile' in fields || 'customer_mobile' in fields;
};

const duplicateCustomer = (res: Response, existing: OfficeOutsideRecord): void => {
  const record = recordPayload(existing);
  res.status(409).json({
    success: false,
    error: {
      code: OFFICE_OUTSIDE_ERROR_CODES.OO_DUPLICATE_CUSTOMER,
      message: 'A record already exists for this mobile',
      existingId: existing.id,
      existing_id: existing.id,
      publicId: record.publicId,
      public_id: record.publicId
    },
    data: { existingId: existing.id, existing_id: existing.id, record, item: record }
  });
};

const persistRecordPatch = async (
  row: OfficeOutsideRecord,
  patch: Record<string, unknown>,
  actor: string | null
) => {
  await row.update({ ...patch, updatedBy: actor } as any);
  if (patch.vendorId !== undefined) {
    await OfficeOutsideLedger.update(
      { vendorId: patch.vendorId as string | null },
      { where: { recordId: row.id } }
    );
  }
  await ensureLedger(row, actor);
  await row.reload({ include: recordInclude });
};

const listPayload = (records: ReturnType<typeof recordPayload>[]) => ({
  success: true,
  data: { records, items: records, officeOutside: records }
});

/** GET /admin/office-outside */
export const listOfficeOutside = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = String(req.query.vendorId ?? req.query.vendor_id ?? '').trim();
    const search = String(req.query.search ?? req.query.q ?? '').trim();
    const status = String(req.query.status ?? '').trim().toLowerCase();
    const mobile = normalizeOfficeOutsideMobile(
      req.query.mobile ?? req.query.customerMobile ?? req.query.customer_mobile
    );

    const and: WhereOptions[] = [];
    if (vendorId) and.push({ vendorId });
    const statusKey = sentStatusWhere(status);
    if (statusKey) and.push({ status: statusKey });
    if (mobile) and.push({ customerMobile: mobile });
    if (search && !mobile) {
      const like = `%${search}%`;
      and.push({
        [Op.or]: [
          { customerName: { [Op.iLike]: like } },
          { customerMobile: { [Op.iLike]: like } },
          { city: { [Op.iLike]: like } },
          { '$vendor.name$': { [Op.iLike]: like } }
        ]
      });
    }

    const rows = await OfficeOutsideRecord.findAll({
      where: and.length ? { [Op.and]: and } : {},
      include: recordInclude,
      order: [['updatedAt', 'DESC'], ['createdAt', 'DESC']]
    });
    const records = rows.map(recordPayload);
    res.status(200).json(listPayload(records));
  } catch (error) {
    logError('List office-outside error', error);
    internalError(res);
  }
};

/** GET /admin/office-outside/:id */
export const getOfficeOutside = async (req: Request, res: Response): Promise<void> => {
  try {
    const row = await loadRecord(req.params.id);
    if (!row) {
      fail(res, 404, OFFICE_OUTSIDE_ERROR_CODES.RECORD_404, 'Office outside record not found');
      return;
    }
    const record = recordPayload(row);
    res.status(200).json({ success: true, data: { record, item: record } });
  } catch (error) {
    logError('Get office-outside error', error, { id: req.params.id });
    internalError(res);
  }
};

/** POST /admin/office-outside — upsert by last-10 mobile; never mint a second OO-* for that customer. */
export const createOfficeOutside = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const patch = parseOfficeOutsideRecordPatch(body);
    const customerName = patch.customerName || '';
    if (!customerName) {
      fail(res, 400, OFFICE_OUTSIDE_ERROR_CODES.VAL_CUSTOMER, 'customerName is required');
      return;
    }
    const vendorCheck = await findOfficeOutsideVendor(patch.vendorId);
    if (!vendorCheck.ok) {
      fail(res, vendorCheck.status, vendorCheck.code, vendorCheck.message);
      return;
    }

    const actor = actorId(req);
    const mobile = patch.customerMobile || '';
    const respond = (row: OfficeOutsideRecord, created: boolean) => {
      const record = recordPayload(row);
      res.status(created ? 201 : 200).json({ success: true, data: { record, item: record } });
    };

    const upsertExisting = async (existing: OfficeOutsideRecord) => {
      await persistRecordPatch(existing, patch as Record<string, unknown>, actor);
      respond(existing, false);
    };

    if (isTenDigitMobile(mobile)) {
      const existing = await findByTenDigitMobile(mobile);
      if (existing) {
        await upsertExisting(existing);
        return;
      }
    }

    try {
      const row = await OfficeOutsideRecord.create({
        vendorId: patch.vendorId ?? null,
        customerName,
        customerMobile: mobile,
        address: patch.address || '',
        city: patch.city || '',
        systemKw: patch.systemKw ?? 0,
        subtotal: patch.subtotal ?? 0,
        fileType: patch.fileType ?? null,
        notes: patch.notes || '',
        slipItems: patch.slipItems ?? [],
        slipNotes: patch.slipNotes || '',
        createdBy: actor,
        updatedBy: actor
      } as any);
      await ensureLedger(row, actor);
      const loaded = await loadRecord(row.id);
      respond(loaded || row, true);
    } catch (error) {
      if (!isMobileUniqueError(error)) throw error;
      const existing = await findByTenDigitMobile(mobile);
      if (existing) {
        await upsertExisting(existing);
        return;
      }
      fail(
        res,
        409,
        OFFICE_OUTSIDE_ERROR_CODES.OO_DUPLICATE_CUSTOMER,
        'A record already exists for this mobile'
      );
    }
  } catch (error) {
    logError('Create office-outside error', error);
    internalError(res);
  }
};

/** PATCH /admin/office-outside/:id */
export const updateOfficeOutside = async (req: Request, res: Response): Promise<void> => {
  try {
    const row = await loadRecord(req.params.id);
    if (!row) {
      fail(res, 404, OFFICE_OUTSIDE_ERROR_CODES.RECORD_404, 'Office outside record not found');
      return;
    }
    const patch = parseOfficeOutsideRecordPatch((req.body || {}) as Record<string, unknown>);
    if (patch.vendorId !== undefined) {
      const vendorCheck = await findOfficeOutsideVendor(patch.vendorId);
      if (!vendorCheck.ok) {
        fail(res, vendorCheck.status, vendorCheck.code, vendorCheck.message);
        return;
      }
    }
    if (patch.customerMobile !== undefined && isTenDigitMobile(patch.customerMobile)) {
      const other = await findByTenDigitMobile(patch.customerMobile);
      if (other && other.id !== row.id) {
        duplicateCustomer(res, other);
        return;
      }
    }
    // Sent rows stay editable for vendor + fileType — never OO_ALREADY_SENT.
    try {
      await persistRecordPatch(row, patch as Record<string, unknown>, actorId(req));
    } catch (error) {
      if (!isMobileUniqueError(error)) throw error;
      const other = await findByTenDigitMobile(String(patch.customerMobile || ''));
      if (other && other.id !== row.id) {
        duplicateCustomer(res, other);
        return;
      }
      fail(
        res,
        409,
        OFFICE_OUTSIDE_ERROR_CODES.OO_DUPLICATE_CUSTOMER,
        'A record already exists for this mobile'
      );
      return;
    }
    const record = recordPayload(row);
    res.status(200).json({ success: true, data: { record, item: record } });
  } catch (error) {
    logError('Update office-outside error', error, { id: req.params.id });
    internalError(res);
  }
};

/** DELETE /admin/office-outside/:id — ledger row cascades. */
export const deleteOfficeOutside = async (req: Request, res: Response): Promise<void> => {
  try {
    const row = await loadRecord(req.params.id);
    if (!row) {
      fail(res, 404, OFFICE_OUTSIDE_ERROR_CODES.RECORD_404, 'Office outside record not found');
      return;
    }
    await row.destroy();
    res.json({ success: true, data: { id: row.id, deleted: true } });
  } catch (error) {
    logError('Delete office-outside error', error, { id: req.params.id });
    internalError(res);
  }
};

/** POST /admin/office-outside/:id/send-to-accounts — does not create a quotation. */
export const sendOfficeOutsideToAccounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const row = await loadRecord(req.params.id);
    if (!row) {
      fail(res, 404, OFFICE_OUTSIDE_ERROR_CODES.RECORD_404, 'Office outside record not found');
      return;
    }
    if (row.status !== 'sent_to_accounts') {
      await row.update({
        status: 'sent_to_accounts',
        sentToAccountsAt: new Date(),
        sentToAccountsBy: actorId(req),
        updatedBy: actorId(req)
      } as any);
      await row.reload({ include: recordInclude });
    }
    const record = recordPayload(row);
    res.json({ success: true, data: { record, item: record } });
  } catch (error) {
    logError('Send office-outside to accounts error', error, { id: req.params.id });
    internalError(res);
  }
};

/** PATCH /admin/office-outside/:id/slip — 1-page requirement slip (no Chairbord branding). */
export const saveOfficeOutsideSlip = async (req: Request, res: Response): Promise<void> => {
  try {
    const row = await loadRecord(req.params.id);
    if (!row) {
      fail(res, 404, OFFICE_OUTSIDE_ERROR_CODES.RECORD_404, 'Office outside record not found');
      return;
    }
    const body = (req.body || {}) as Record<string, unknown>;
    const patch = parseOfficeOutsideRecordPatch(body);
    const values: Record<string, unknown> = { updatedBy: actorId(req) };
    if (patch.slipItems !== undefined) values.slipItems = patch.slipItems;
    const slipNotes =
      patch.slipNotes !== undefined
        ? patch.slipNotes
        : body.notes !== undefined
          ? String(body.notes ?? '').trim()
          : undefined;
    if (slipNotes !== undefined) values.slipNotes = slipNotes;
    await row.update(values as any);
    await row.reload({ include: recordInclude });
    const record = recordPayload(row);
    res.json({ success: true, data: { record, item: record } });
  } catch (error) {
    logError('Save office-outside slip error', error, { id: req.params.id });
    internalError(res);
  }
};

/** GET /admin/office-outside/ledger */
export const listOfficeOutsideLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = String(req.query.vendorId ?? req.query.vendor_id ?? '').trim();
    const where: WhereOptions = vendorId ? { vendorId } : {};
    const rows = await OfficeOutsideLedger.findAll({
      where,
      include: [
        {
          model: OfficeOutsideRecord,
          as: 'record',
          attributes: ['id', 'customerName', 'customerMobile', 'subtotal', 'fileType', 'status'],
          required: false
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    const items = rows.map((row) => {
      const plain = row.get({ plain: true }) as Record<string, any>;
      const record = plain.record || null;
      return {
        ...publicOfficeOutsideLedger({ ...plain, subtotal: record?.subtotal }),
        customerName: record?.customerName ?? null,
        customer_name: record?.customerName ?? null,
        customerMobile: record?.customerMobile ?? null,
        customer_mobile: record?.customerMobile ?? null,
        subtotal: record ? Number(record.subtotal) || 0 : null,
        fileType: record?.fileType ?? null,
        file_type: record?.fileType ?? null,
        status: record?.status ?? null
      };
    });
    res.json({ success: true, data: { items, ledgers: items } });
  } catch (error) {
    logError('List office-outside ledger error', error);
    internalError(res);
  }
};

/** GET /admin/office-outside/ledger/:id */
export const getOfficeOutsideLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    const record = await loadRecord(req.params.id);
    if (!record) {
      fail(res, 404, OFFICE_OUTSIDE_ERROR_CODES.RECORD_404, 'Office outside record not found');
      return;
    }
    const row = await ensureLedger(record, actorId(req));
    const item = ledgerPayload({
      ...(row.get({ plain: true }) as any),
      subtotal: record.subtotal
    });
    res.json({ success: true, data: { item, ledger: item } });
  } catch (error) {
    logError('Get office-outside ledger error', error, { id: req.params.id });
    internalError(res);
  }
};

/** PATCH /admin/office-outside/ledger/:id — partial upsert by record id. */
export const updateOfficeOutsideLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    const record = await loadRecord(req.params.id);
    if (!record) {
      fail(res, 404, OFFICE_OUTSIDE_ERROR_CODES.RECORD_404, 'Office outside record not found');
      return;
    }
    const body = (req.body || {}) as Record<string, unknown>;
    const amounts = parseLedgerAmountPatch(body);
    const cashRaw = body.cashAmount ?? body.cash_amount;
    if (cashRaw !== undefined && cashRaw !== null) {
      (amounts as any).cashAmount = roundInr(cashRaw);
    }
    const vendorRaw = body.vendorId !== undefined ? body.vendorId : body.vendor_id;
    let vendorId = record.vendorId;
    if (vendorRaw !== undefined) {
      const vendorCheck = await findOfficeOutsideVendor(vendorRaw ? String(vendorRaw) : null);
      if (!vendorCheck.ok) {
        fail(res, vendorCheck.status, vendorCheck.code, vendorCheck.message);
        return;
      }
      vendorId = vendorCheck.vendor?.id ?? null;
    }
    const row = await ensureLedger(record, actorId(req));
    const computed = applyOfficeOutsideLedgerAmounts(row.get({ plain: true }) as any, amounts as any);
    await row.update({
      ...computed,
      vendorId,
      updatedBy: actorId(req)
    } as any);
    await row.reload();
    const item = ledgerPayload({
      ...(row.get({ plain: true }) as any),
      subtotal: record.subtotal
    });
    res.json({ success: true, data: { item, ledger: item } });
  } catch (error) {
    logError('Update office-outside ledger error', error, { id: req.params.id });
    internalError(res);
  }
};

/** PATCH /admin/office-outside/:id/payment-details — same installment body as quotations; not written to quotations. */
export const updateOfficeOutsidePaymentDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const row = await loadRecord(req.params.id);
    if (!row) {
      fail(res, 404, OFFICE_OUTSIDE_ERROR_CODES.RECORD_404, 'Office outside record not found');
      return;
    }
    const body = (req.body || {}) as Record<string, unknown>;
    const phasePayload = body.phases ?? body.installments ?? body.paymentPhases ?? body.installments_json;
    const actor = actorId(req);
    const values: Record<string, unknown> = { updatedBy: actor };

    if (Array.isArray(phasePayload)) {
      const phases = normalizeOfficeOutsidePhases(phasePayload, actor);
      values.installmentsJson = phases;
      values.paymentStatus = paymentStatusFromPhases(phases);
      const modeFromPhase = phases.map((p) => p.paymentMode).find(Boolean);
      if (modeFromPhase) values.paymentMode = modeFromPhase;
    }

    const paymentMode = normalizePaymentModeInput(body.paymentMode ?? body.payment_mode);
    if (paymentMode) values.paymentMode = paymentMode;

    const statusRaw = body.paymentStatus ?? body.payment_status;
    if (statusRaw !== undefined && ['pending', 'partial', 'completed'].includes(String(statusRaw))) {
      values.paymentStatus = String(statusRaw);
    }

    const fileTypePatch = parseOfficeOutsideRecordPatch(body);
    if (fileTypePatch.fileType) values.fileType = fileTypePatch.fileType;

    await row.update(values as any);
    await row.reload({ include: recordInclude });
    const record = recordPayload(row);
    res.json({
      success: true,
      data: {
        record,
        item: record,
        installments: record.installments,
        paymentPhases: record.installments
      }
    });
  } catch (error) {
    logError('Update office-outside payment details error', error, { id: req.params.id });
    internalError(res);
  }
};
