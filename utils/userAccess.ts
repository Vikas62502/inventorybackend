import {
  parseModuleFieldPermissionsFromBody,
  parseOfficeLocationFromBody,
  workflowPermissionFieldsForApi
} from './moduleFieldPermissions';
import { normalizeDealerAddress, stripFlatAddressFields } from './userAddress';

export { normalizeDealerAddress } from './userAddress';

export const ACCESS_KEYS = [
  'admin',
  'quotation',
  'accounts',
  'installation',
  'metering',
  'final_confirmation',
  'hr',
  'visitor',
  'visitor_reports',
  'calling_reports'
] as const;

export type AccessKey = (typeof ACCESS_KEYS)[number];

const ACCESS_SET = new Set<string>(ACCESS_KEYS);

const ACCESS_TO_ROLE: Record<AccessKey, string> = {
  admin: 'admin',
  quotation: 'dealer',
  accounts: 'account-management',
  installation: 'installer',
  metering: 'metering',
  final_confirmation: 'baldev',
  hr: 'hr',
  visitor: 'visitor',
  // §AW — reports are grants, never a primary role
  visitor_reports: 'dealer',
  calling_reports: 'dealer'
};

/** Role-driving keys only — visitor_reports / calling_reports never pick primary role (§AW). */
const PRIMARY_PRIORITY: AccessKey[] = [
  'admin',
  'accounts',
  'installation',
  'metering',
  'final_confirmation',
  'hr',
  'visitor',
  'quotation'
];

const REPORT_ACCESS_KEYS = new Set<AccessKey>(['visitor_reports', 'calling_reports']);

/** Normalize FE / DB values into canonical access keys. */
export const normalizeAccess = (raw: unknown): AccessKey[] => {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) list = parsed;
      } catch {
        list = trimmed.split(',');
      }
    } else if (trimmed.includes(',')) {
      list = trimmed.split(',');
    } else if (trimmed) {
      list = [trimmed];
    }
  } else if (raw && typeof raw === 'object') {
    list = Object.entries(raw as Record<string, unknown>)
      .filter(([, v]) => v === true || v === 'true' || v === 1 || v === '1')
      .map(([k]) => k);
    if (!list.length) list = Object.keys(raw as Record<string, unknown>);
  }
  const out: AccessKey[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    let key = String(item || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    if (key === 'account_management' || key === 'account' || key === 'payments') key = 'accounts';
    if (key === 'installer' || key === 'install' || key === 'installation_team') key = 'installation';
    if (key === 'baldev' || key === 'final' || key === 'confirmation') key = 'final_confirmation';
    if (key === 'dealer' || key === 'quotations') key = 'quotation';
    if (key === 'visitor_report' || key === 'visitorreports' || key === 'visitor_reports_tab') {
      key = 'visitor_reports';
    }
    if (key === 'calling_report' || key === 'callingreports' || key === 'calling_reports_tab') {
      key = 'calling_reports';
    }
    if (!ACCESS_SET.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key as AccessKey);
  }
  return out;
};

/** Infer access from legacy single role. */
export const accessFromRole = (role?: string | null): AccessKey[] => {
  const r = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  if (!r) return [];
  if (r === 'admin' || r === 'super_admin' || r === 'superadmin' || r === 'super_admin_manager') {
    return ['admin'];
  }
  if (r === 'dealer') return ['quotation'];
  if (r === 'account_management' || r === 'accountmanager' || r === 'account_manager') {
    return ['accounts'];
  }
  if (r === 'installer' || r === 'installation' || r === 'installation_team') return ['installation'];
  if (r === 'metering' || r === 'meter' || r === 'mco' || r === 'metering_team') return ['metering'];
  if (r === 'baldev' || r === 'confirmation') return ['final_confirmation'];
  if (r === 'hr' || r === 'human_resources') return ['hr'];
  if (r === 'visitor') return ['visitor'];
  return [];
};

export const primaryRoleFromAccess = (access: AccessKey[]): string => {
  const list = normalizeAccess(access).filter((key) => !REPORT_ACCESS_KEYS.has(key));
  for (const key of PRIMARY_PRIORITY) {
    if (list.includes(key)) return ACCESS_TO_ROLE[key];
  }
  return 'account-management';
};

export const resolveAccess = (userLike: {
  role?: string | null;
  access?: unknown;
  permissions?: unknown;
  username?: string | null;
}): AccessKey[] => {
  const stored = normalizeAccess(userLike.access);
  const fromPerms = normalizeAccess(userLike.permissions);
  const fromRole = accessFromRole(userLike.role);
  const usernameAdmin =
    String(userLike.username || '').trim().toLowerCase() === 'admin'
      ? (['admin'] as AccessKey[])
      : [];

  // Prefer explicit access/permissions, but never drop role-implied admin
  // (Update User AUTH_004 when stored access omitted "admin" while role is admin).
  const primary =
    stored.length > 0 ? stored : fromPerms.length > 0 ? fromPerms : fromRole.length > 0 ? fromRole : usernameAdmin;

  if (!primary.length) return usernameAdmin;

  if (fromRole.includes('admin') || usernameAdmin.includes('admin')) {
    if (!primary.includes('admin')) return ['admin', ...primary];
  }
  return primary;
};

export const canAccessSection = (
  user: { role?: string | null; access?: unknown; permissions?: unknown; username?: string | null },
  key: AccessKey
): boolean => resolveAccess(user).includes(key);

export const parseAccessFromBody = (body: Record<string, unknown>): {
  access?: AccessKey[];
  error?: string;
} => {
  const raw = body.access ?? body.permissions;
  if (raw === undefined) return {};
  const parsed = normalizeAccess(raw);
  if (!parsed.length) {
    return { error: 'access must be a non-empty array of known dashboard keys' };
  }
  return { access: parsed };
};

export const parseWorkflowPermissionPatchFromBody = (
  body: Record<string, unknown>
): { officeLocation?: string | null; moduleFieldPermissions?: Record<string, unknown> } | { error: string } => {
  const patch: { officeLocation?: string | null; moduleFieldPermissions?: Record<string, unknown> } = {};
  try {
    const office = parseOfficeLocationFromBody(body);
    if (office !== undefined) patch.officeLocation = office;
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Invalid officeLocation' };
  }
  try {
    const perms = parseModuleFieldPermissionsFromBody(body);
    if (perms !== undefined) patch.moduleFieldPermissions = perms as Record<string, unknown>;
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Invalid moduleFieldPermissions' };
  }
  return patch;
};

export const publicUserAccessFields = (userLike: {
  id?: string;
  username?: string;
  role?: string | null;
  access?: unknown;
  permissions?: unknown;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  loginCount?: number;
  lastLogin?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}) => {
  const access = resolveAccess(userLike);
  return {
    access,
    permissions: access
  };
};

export const publicDealerForApi = (dealer: Record<string, unknown>) => {
  const access = resolveAccess({
    role: (dealer.role as string) || 'dealer',
    access: dealer.access,
    permissions: dealer.permissions,
    username: dealer.username as string
  });
  const cleaned = stripFlatAddressFields({ ...dealer });
  return {
    ...cleaned,
    role: dealer.role || 'dealer',
    address: normalizeDealerAddress(dealer),
    access,
    permissions: access,
    ...workflowPermissionFieldsForApi(dealer)
  };
};

export const publicAccountManagerForApi = (row: Record<string, unknown>) => {
  const access = resolveAccess({
    role: row.role as string,
    access: row.access,
    permissions: row.permissions,
    username: row.username as string
  });
  const cleaned = stripFlatAddressFields({ ...row });
  return {
    ...cleaned,
    gender: row.gender ?? null,
    dateOfBirth: row.dateOfBirth ?? null,
    fatherName: row.fatherName ?? null,
    fatherContact: row.fatherContact ?? null,
    governmentIdType: row.governmentIdType ?? null,
    governmentIdNumber: row.governmentIdNumber ?? null,
    employeeId: row.employeeId ?? null,
    address: normalizeDealerAddress(row),
    access,
    permissions: access,
    ...workflowPermissionFieldsForApi(row)
  };
};

/** Admin panel routes (Users tab, dealer directory). */
export const hasAdminPanelAccess = (req: {
  dealer?: { role?: string; access?: unknown; permissions?: unknown; username?: string };
  user?: { role?: string; access?: unknown; permissions?: unknown; username?: string };
  visitor?: { role?: string; access?: unknown; permissions?: unknown; username?: string };
}): boolean => {
  if (req.dealer?.role === 'admin') return true;
  const role = String(req.user?.role || '').trim().toLowerCase();
  if (
    role === 'admin' ||
    role === 'super-admin' ||
    role === 'super-admin-manager' ||
    role === 'superadmin' ||
    role === 'super_admin' ||
    role === 'super_admin_manager'
  ) {
    return true;
  }
  const userLike = {
    role: req.user?.role ?? req.dealer?.role ?? req.visitor?.role,
    access: req.user?.access ?? req.dealer?.access ?? (req.visitor as any)?.access,
    permissions:
      req.user?.permissions ??
      (req.dealer as any)?.permissions ??
      (req.visitor as any)?.permissions,
    username: req.user?.username ?? req.dealer?.username ?? req.visitor?.username
  };
  if (canAccessSection(userLike, 'admin')) return true;
  // Linked dealer from multi-access may carry admin in access[] while JWT role is hr/etc.
  if (
    req.dealer &&
    canAccessSection(
      {
        role: req.dealer.role,
        access: req.dealer.access,
        permissions: (req.dealer as any).permissions,
        username: req.dealer.username
      },
      'admin'
    )
  ) {
    return true;
  }
  return false;
};

/**
 * Express middleware: allow if JWT role implies section OR access[] includes key.
 * Use requireAccess("admin") for Admin Users CRUD (not role === "admin" only).
 */
export const requireAccess = (key: AccessKey) => {
  return (req: any, res: any, next: any): void => {
    if (!req.user && !req.dealer && !req.visitor) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'Unauthorized' }
      });
      return;
    }
    if (key === 'admin' && hasAdminPanelAccess(req)) {
      next();
      return;
    }
    if (
      canAccessSection(
        {
          role: req.user?.role ?? req.dealer?.role ?? req.visitor?.role,
          access: req.user?.access ?? req.dealer?.access ?? req.visitor?.access,
          username: req.user?.username ?? req.dealer?.username ?? req.visitor?.username
        },
        key
      )
    ) {
      next();
      return;
    }
    res.status(403).json({
      success: false,
      error: {
        code: 'AUTH_004',
        message:
          key === 'admin'
            ? 'Insufficient permissions. Admin access required.'
            : `Insufficient permissions: requires access "${key}"`
      }
    });
  };
};

export const requireAdminAccess = () => requireAccess('admin');

/** Allow if any listed access key matches (OR). Used by Calling/Visitor Reports (§AX). */
export const requireAnyAccess = (keys: AccessKey[]) => {
  return (req: any, res: any, next: any): void => {
    if (!req.user && !req.dealer && !req.visitor) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'Unauthorized' }
      });
      return;
    }
    if (keys.includes('admin') && hasAdminPanelAccess(req)) {
      next();
      return;
    }
    const userLike = {
      role: req.user?.role ?? req.dealer?.role ?? req.visitor?.role,
      access: req.user?.access ?? req.dealer?.access ?? req.visitor?.access,
      permissions:
        req.user?.permissions ??
        (req.dealer as any)?.permissions ??
        (req.visitor as any)?.permissions,
      username: req.user?.username ?? req.dealer?.username ?? req.visitor?.username
    };
    if (keys.some((key) => canAccessSection(userLike, key))) {
      next();
      return;
    }
    res.status(403).json({
      success: false,
      error: { code: 'AUTH_004', message: 'Insufficient permissions' }
    });
  };
};

/** True when JWT may open Calling Reports GETs. */
export const hasCallingReportsAccess = (req: {
  dealer?: { role?: string; access?: unknown; permissions?: unknown; username?: string };
  user?: { role?: string; access?: unknown; permissions?: unknown; username?: string };
}): boolean => {
  if (hasAdminPanelAccess(req)) return true;
  const role = String(req.user?.role || '').trim().toLowerCase();
  if (role === 'hr' || role === 'human_resources' || role === 'human-resources') return true;
  const userLike = {
    role: req.user?.role ?? req.dealer?.role,
    access: req.user?.access ?? req.dealer?.access,
    permissions: req.user?.permissions ?? (req.dealer as any)?.permissions,
    username: req.user?.username ?? req.dealer?.username
  };
  return (
    canAccessSection(userLike, 'calling_reports') ||
    canAccessSection(userLike, 'hr') ||
    canAccessSection(userLike, 'admin')
  );
};

/** True when JWT may open Visitor Reports GETs. */
export const hasVisitorReportsAccess = (req: {
  dealer?: { role?: string; access?: unknown; permissions?: unknown; username?: string };
  user?: { role?: string; access?: unknown; permissions?: unknown; username?: string };
}): boolean => {
  if (hasAdminPanelAccess(req)) return true;
  const userLike = {
    role: req.user?.role ?? req.dealer?.role,
    access: req.user?.access ?? req.dealer?.access,
    permissions: req.user?.permissions ?? (req.dealer as any)?.permissions,
    username: req.user?.username ?? req.dealer?.username
  };
  return canAccessSection(userLike, 'visitor_reports') || canAccessSection(userLike, 'admin');
};

/** True when JWT may list dealers for Calling Reports employee filter (read-only). */
export const hasDealerDirectoryReadAccess = (req: {
  dealer?: { role?: string; access?: unknown; permissions?: unknown; username?: string };
  user?: { role?: string; access?: unknown; permissions?: unknown; username?: string };
}): boolean => hasAdminPanelAccess(req) || hasCallingReportsAccess(req);

/** True when this request should use dealer quotation APIs (own data), even if JWT role is hr. */
export const isActingAsQuotationDealer = (req: {
  dealer?: { id?: string; role?: string; access?: unknown; username?: string };
  user?: { role?: string; access?: unknown; permissions?: unknown; username?: string };
}): boolean => {
  if (!req.dealer?.id) return false;
  if (req.dealer.role === 'admin') return false;
  return canAccessSection(
    {
      role: req.user?.role ?? req.dealer.role,
      access: req.user?.access ?? req.dealer.access,
      username: req.user?.username ?? req.dealer.username
    },
    'quotation'
  );
};

/** Account-management approved-list view — not the dealer quotation dashboard. */
export const isOpsAccountManagerView = (req: {
  dealer?: { id?: string; role?: string; access?: unknown; username?: string };
  user?: { role?: string; access?: unknown; permissions?: unknown; username?: string };
}): boolean => {
  const role = req.user?.role;
  if (role !== 'account-management' && role !== 'hr') return false;
  return !isActingAsQuotationDealer(req);
};
