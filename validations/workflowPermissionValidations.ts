import { z } from 'zod';

/** Legacy everyone_except_dealer → everyone (§AK / §AL). */
export const modulePermissionScopeSchema = z.preprocess(
  (val) => (val === 'everyone_except_dealer' ? 'everyone' : val),
  z.enum(['everyone', 'selected_users', 'office_only'])
);

const coerceModuleLevel = (val: unknown): unknown => {
  const key = String(val ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (key === 'readonly' || key === 'read_only' || key === 'view') return 'read';
  if (key === 'edit' || key === 'read_write' || key === 'full') return 'write';
  return val;
};

export const modulePermissionRuleSchema = z.object({
  level: z.preprocess(coerceModuleLevel, z.enum(['none', 'read', 'write'])),
  scope: modulePermissionScopeSchema,
  selectedUserIds: z
    .preprocess((v) => (v == null ? [] : v), z.array(z.string()))
    .optional()
    .default([]),
  selected_user_ids: z.array(z.string()).optional().nullable(),
  userIds: z.array(z.string()).optional().nullable(),
  user_ids: z.array(z.string()).optional().nullable()
});

export const moduleFieldPermissionsSchema = z
  .object({
    accounts: modulePermissionRuleSchema.optional(),
    installation: modulePermissionRuleSchema.optional(),
    metering: modulePermissionRuleSchema.optional(),
    final_confirmation: modulePermissionRuleSchema.optional(),
    finalConfirmation: modulePermissionRuleSchema.optional(),
    visitor_reports: modulePermissionRuleSchema.optional(),
    visitorReports: modulePermissionRuleSchema.optional(),
    calling_reports: modulePermissionRuleSchema.optional(),
    callingReports: modulePermissionRuleSchema.optional()
  })
  .passthrough()
  .optional();

export const workflowPermissionFieldsSchema = {
  officeLocation: z
    .preprocess((v) => (v === '' ? null : v), z.enum(['Jaipur', 'Ajmer', 'Chomu']).nullable())
    .optional(),
  office_location: z
    .preprocess((v) => (v === '' ? null : v), z.enum(['Jaipur', 'Ajmer', 'Chomu']).nullable())
    .optional(),
  moduleFieldPermissions: moduleFieldPermissionsSchema,
  modulePermissions: moduleFieldPermissionsSchema,
  module_permissions: moduleFieldPermissionsSchema
};
