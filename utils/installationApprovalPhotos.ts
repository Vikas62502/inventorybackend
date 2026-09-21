/**
 * Installation Complete & Mark as Approved — any single site photo is enough.
 * PI-only is NOT enough for full approve (partial may still use PI).
 */

import QuotationInstallationDoc from '../models/QuotationInstallationDoc';
import { listSiteCompletionImagesForQuotation } from './s3Service';

/** Slots that count as a site / installation photo for full approve. */
export const SITE_COMPLETION_PHOTO_SLOTS = [
  'homeFrontPhoto',
  'homeWithPersonPhoto',
  'inverterWithCustomerPhoto',
  'plantWithCustomerPhoto',
  'inverterSerialNumberPhoto',
  'panelSerialNumberPhoto',
  'geoTagPlantPhoto',
  'otherImages',
  'installerCompletionImages',
  'siteCompletionImages'
] as const;

const SITE_SLOT_SET = new Set<string>(SITE_COMPLETION_PHOTO_SLOTS);

/** PI / PO do not count toward full approve. */
const NON_SITE_SLOTS = new Set(['piUpload', 'installerPo', 'installer_pi', 'installer_po']);

const slotFromDocMetadata = (metadata: unknown): string | null => {
  if (!metadata || typeof metadata !== 'object') return null;
  const m = metadata as Record<string, unknown>;
  const raw = m.slot ?? m.field;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed || null;
};

export const isSiteCompletionPhotoSlot = (slot: string | null | undefined): boolean => {
  if (!slot) return false;
  const s = String(slot).trim();
  if (!s || NON_SITE_SLOTS.has(s)) return false;
  if (SITE_SLOT_SET.has(s)) return true;
  return true;
};

export const countSiteCompletionPhotosFromDocs = (
  docs: Array<{ metadata?: unknown; docType?: string | null; fileUrl?: string | null }>
): number => {
  let n = 0;
  for (const doc of docs) {
    if (doc.docType && doc.docType !== 'site_completion_image') continue;
    const slot = slotFromDocMetadata(doc.metadata);
    if (slot && NON_SITE_SLOTS.has(slot)) continue;
    if (doc.fileUrl || !slot || isSiteCompletionPhotoSlot(slot)) n += 1;
  }
  return n;
};

export const countExtraSiteSlots = (extraSlots: Iterable<string>): number => {
  let n = 0;
  for (const raw of extraSlots) {
    const s = String(raw || '').trim();
    if (!s || NON_SITE_SLOTS.has(s)) continue;
    if (SITE_SLOT_SET.has(s) || s === 'files') n += 1;
  }
  return n;
};

export const hasAtLeastOneSiteCompletionPhoto = async (
  quotationId: string,
  existingDocs: Array<{ metadata?: unknown; docType?: string | null; fileUrl?: string | null }>,
  extraSlots: Iterable<string> = []
): Promise<boolean> => {
  if (countSiteCompletionPhotosFromDocs(existingDocs) > 0) return true;
  if (countExtraSiteSlots(extraSlots) > 0) return true;
  try {
    const fromS3 = await listSiteCompletionImagesForQuotation(quotationId);
    if (fromS3.length > 0) return true;
  } catch {
    // ignore
  }
  return false;
};

export const loadHasAtLeastOneSiteCompletionPhoto = async (
  quotationId: string,
  extraSlots: Iterable<string> = []
): Promise<boolean> => {
  const docs = await QuotationInstallationDoc.findAll({
    where: { quotationId, docType: 'site_completion_image' },
    attributes: ['metadata', 'docType', 'fileUrl']
  });
  return hasAtLeastOneSiteCompletionPhoto(quotationId, docs, extraSlots);
};

export const installerApprovalMissingSitePhotoMessage =
  'At least one site completion / installation photo is required before approval. ' +
  'PI alone is not enough. Upload any of: homeFrontPhoto, homeWithPersonPhoto, ' +
  'inverterWithCustomerPhoto, plantWithCustomerPhoto, serial photos, geotag, otherImages, ' +
  'or installerCompletionImages.';

/** @deprecated Prefer loadHasAtLeastOneSiteCompletionPhoto */
export const loadMissingRequiredInstallerApprovalSlots = async (
  quotationId: string,
  extraSlots: Iterable<string> = []
): Promise<string[]> => {
  const ok = await loadHasAtLeastOneSiteCompletionPhoto(quotationId, extraSlots);
  return ok ? [] : ['siteCompletionPhoto'];
};

export const requiredInstallerApprovalMissingMessage = (_missing?: string[]): string =>
  installerApprovalMissingSitePhotoMessage;
