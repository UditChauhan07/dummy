import { z } from 'zod';
import { iso8601Schema, tenantSchema } from '@/lib/utils/validation';

export const timeSheetStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED']);
export const workItemTypeSchema = z.enum(['ticket', 'project_task', 'non_billable_category'] as const);

// Core schemas
export const timePeriodSchema = tenantSchema.extend({
  period_id: z.string(),
  start_date: iso8601Schema,
  end_date: iso8601Schema
});

export const timePeriodSettingsSchema = tenantSchema.extend({
  time_period_settings_id: z.string(),
  frequency: z.number().positive(),
  frequency_unit: z.enum(['day', 'week', 'month', 'year']),
  is_active: z.boolean(),
  effective_from: iso8601Schema,
  effective_to: iso8601Schema.optional(),
  created_at: iso8601Schema,
  updated_at: iso8601Schema,
  tenant_id: z.string(),
  start_day: z.number().min(1).max(31).optional(),
  end_day: z.number().min(0).max(31).optional(),
  start_month: z.number().min(1).max(12).optional(),
  start_day_of_month: z.number().min(1).max(31).optional(),
  end_month: z.number().min(1).max(12).optional(),
  end_day_of_month: z.number().min(0).max(31).optional()
});

export const timeSheetCommentSchema = tenantSchema.extend({
  comment_id: z.string(),
  time_sheet_id: z.string(),
  user_id: z.string(),
  comment: z.string(),
  created_at: iso8601Schema,
  is_approver: z.boolean(),
  user_name: z.string().optional()
});

export const timeSheetSchema = tenantSchema.extend({
  id: z.string(),
  period_id: z.string(),
  user_id: z.string(),
  approval_status: timeSheetStatusSchema,
  submitted_at: iso8601Schema.optional(),
  approved_at: iso8601Schema.optional(),
  approved_by: z.string().optional(),
  time_period: timePeriodSchema.optional()
});

export const timeSheetApprovalSchema = timeSheetSchema.extend({
  employee_name: z.string(),
  employee_email: z.string(),
  comments: z.array(timeSheetCommentSchema)
});

export const timeEntrySchema = tenantSchema.extend({
  entry_id: z.string().nullable().optional(),
  work_item_id: z.string(),
  work_item_type: workItemTypeSchema,
  start_time: iso8601Schema,
  end_time: iso8601Schema,
  created_at: iso8601Schema,
  updated_at: iso8601Schema,
  billable_duration: z.number(),
  notes: z.string(),
  user_id: z.string(),
  time_sheet_id: z.string().optional(),
  approval_status: timeSheetStatusSchema,
  service_id: z.string().optional(),
  tax_region: z.string().optional()
});
