import { resolveAccess, type AccessKey } from './userAccess';
import { workflowPermissionFieldsForApi } from './moduleFieldPermissions';
import {
  nestedAddressFromRow,
  parseAddressPatchFromBody,
  normalizeDealerAddress
} from './userAddress';

export type { NestedAddress } from './userAddress';
export { nestedAddressFromRow, parseAddressPatchFromBody, normalizeDealerAddress };

const trimOrNull = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
};

export type ProfileColumnPatch = {
  gender?: string | null;
  dateOfBirth?: string | null;
  fatherName?: string | null;
  fatherContact?: string | null;
  governmentIdType?: string | null;
  governmentIdNumber?: string | null;
  employeeId?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPincode?: string | null;
};

export const parseProfilePatchFromBody = (body: Record<string, unknown>): ProfileColumnPatch => {
  const patch: ProfileColumnPatch = {};
  const gender = trimOrNull(body.gender);
  if (gender !== undefined) patch.gender = gender;
  const dateOfBirth = trimOrNull(body.dateOfBirth ?? body.date_of_birth);
  if (dateOfBirth !== undefined) patch.dateOfBirth = dateOfBirth;
  const fatherName = trimOrNull(body.fatherName ?? body.father_name);
  if (fatherName !== undefined) patch.fatherName = fatherName;
  const fatherContact = trimOrNull(body.fatherContact ?? body.father_contact);
  if (fatherContact !== undefined) patch.fatherContact = fatherContact;
  const governmentIdType = trimOrNull(body.governmentIdType ?? body.government_id_type);
  if (governmentIdType !== undefined) patch.governmentIdType = governmentIdType;
  const governmentIdNumber = trimOrNull(body.governmentIdNumber ?? body.government_id_number);
  if (governmentIdNumber !== undefined) patch.governmentIdNumber = governmentIdNumber;
  const employeeId = trimOrNull(body.employeeId ?? body.employee_id);
  if (employeeId !== undefined) patch.employeeId = employeeId;

  Object.assign(patch, parseAddressPatchFromBody(body));
  return patch;
};

export const publicStaffProfileFields = (row: Record<string, unknown>) => {
  const access = resolveAccess({
    role: (row.role as string) || undefined,
    access: row.access,
    permissions: row.permissions,
    username: row.username as string
  });
  return {
    gender: row.gender ?? null,
    dateOfBirth: row.dateOfBirth ?? null,
    fatherName: row.fatherName ?? null,
    fatherContact: row.fatherContact ?? null,
    governmentIdType: row.governmentIdType ?? null,
    governmentIdNumber: row.governmentIdNumber ?? null,
    employeeId: row.employeeId ?? null,
    address: nestedAddressFromRow(row),
    access,
    permissions: access,
    ...workflowPermissionFieldsForApi(row)
  };
};

export const publicVisitorForApi = (row: Record<string, unknown>) => {
  const access = resolveAccess({
    role: 'visitor',
    access: row.access,
    permissions: row.permissions,
    username: row.username as string
  });
  const finalAccess: AccessKey[] = access.length ? access : ['visitor'];
  const {
    addressStreet: _s,
    addressCity: _c,
    addressState: _st,
    addressPincode: _p,
    address_street: _ss,
    address_city: _cc,
    address_state: _sst,
    address_pincode: _pp,
    ...rest
  } = row;
  return {
    ...rest,
    role: 'visitor',
    ...publicStaffProfileFields({ ...row, role: 'visitor', access: finalAccess }),
    access: finalAccess,
    permissions: finalAccess
  };
};
