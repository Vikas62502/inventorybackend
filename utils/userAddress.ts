/** Nested address shape echoed on Admin Users GET/PUT. */
export type NestedAddress = {
  street: string;
  city: string;
  state: string;
  pincode: string;
};

/** Address fields: keep '' (not null) so NOT NULL dealer columns stay valid. */
const trimAddressField = (value: unknown): string | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return '';
  return String(value).trim();
};

const firstDefinedAddressField = (
  sources: Array<Record<string, unknown> | null | undefined>,
  keys: string[]
): string | undefined => {
  for (const src of sources) {
    if (!src) continue;
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(src, key) && src[key] !== undefined) {
        return trimAddressField(src[key]);
      }
    }
  }
  return undefined;
};

/**
 * Persist address from nested `address`, flat `address_street` / `addressStreet`,
 * or top-level `street` / `streetAddress` / `city` / `state` / `pincode`.
 */
export const parseAddressPatchFromBody = (
  body: Record<string, unknown>
): {
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressPincode?: string;
} => {
  const patch: {
    addressStreet?: string;
    addressCity?: string;
    addressState?: string;
    addressPincode?: string;
  } = {};
  const nested =
    body.address && typeof body.address === 'object' && !Array.isArray(body.address)
      ? (body.address as Record<string, unknown>)
      : null;

  const hasNested = !!nested;
  const hasFlatPrefix =
    body.address_street !== undefined ||
    body.addressStreet !== undefined ||
    body.address_city !== undefined ||
    body.addressCity !== undefined ||
    body.address_state !== undefined ||
    body.addressState !== undefined ||
    body.address_pincode !== undefined ||
    body.addressPincode !== undefined;
  const hasTopLevel =
    body.street !== undefined ||
    body.streetAddress !== undefined ||
    body.street_address !== undefined ||
    body.city !== undefined ||
    body.state !== undefined ||
    body.pincode !== undefined;

  if (!hasNested && !hasFlatPrefix && !hasTopLevel) return patch;

  const street = firstDefinedAddressField(
    [nested, body],
    ['street', 'streetAddress', 'street_address', 'addressStreet', 'address_street']
  );
  const city = firstDefinedAddressField([nested, body], ['city', 'addressCity', 'address_city']);
  const state = firstDefinedAddressField(
    [nested, body],
    ['state', 'addressState', 'address_state']
  );
  const pincode = firstDefinedAddressField(
    [nested, body],
    ['pincode', 'pinCode', 'pin_code', 'addressPincode', 'address_pincode']
  );

  if (street !== undefined) patch.addressStreet = street;
  if (city !== undefined) patch.addressCity = city;
  if (state !== undefined) patch.addressState = state;
  if (pincode !== undefined) patch.addressPincode = pincode;
  return patch;
};

/** Build nested address for API echo — never `address: null` when flat columns have values. */
export const normalizeDealerAddress = (row: Record<string, unknown>): NestedAddress => {
  const nested =
    row.address && typeof row.address === 'object' && !Array.isArray(row.address)
      ? (row.address as Record<string, unknown>)
      : null;
  const asText = (v: unknown) => (v == null ? '' : String(v).trim());
  return {
    street:
      asText(nested?.street) ||
      asText(nested?.streetAddress) ||
      asText(row.addressStreet) ||
      asText(row.address_street) ||
      '',
    city: asText(nested?.city) || asText(row.addressCity) || asText(row.address_city) || '',
    state: asText(nested?.state) || asText(row.addressState) || asText(row.address_state) || '',
    pincode:
      asText(nested?.pincode) ||
      asText(row.addressPincode) ||
      asText(row.address_pincode) ||
      ''
  };
};

export const nestedAddressFromRow = (row: Record<string, unknown>): NestedAddress =>
  normalizeDealerAddress(row);

/** Drop flat address columns from a public user payload (keep nested `address` only). */
export const stripFlatAddressFields = <T extends Record<string, unknown>>(row: T): T => {
  const out = { ...row };
  delete out.addressStreet;
  delete out.addressCity;
  delete out.addressState;
  delete out.addressPincode;
  delete out.address_street;
  delete out.address_city;
  delete out.address_state;
  delete out.address_pincode;
  return out;
};
