import { z } from 'zod';
import { tenantSchema } from '../utils/validation';

// Project-related schemas
export const itemTypeSchema = z.enum(['project', 'project_task', 'ticket']);

export const standardStatusSchema = tenantSchema.extend({
  standard_status_id: z.string(),
  name: z.string(),
  item_type: itemTypeSchema,
  display_order: z.number(),
  is_closed: z.boolean()
});

export const statusSchema = tenantSchema.extend({
  status_id: z.string(),
  name: z.string(),
  status_type: itemTypeSchema,
  is_closed: z.boolean(),
  order_number: z.number().optional(),
  created_by: z.string().optional()
});

export const projectStatusMappingSchema = tenantSchema.extend({
  project_status_mapping_id: z.string(),
  project_id: z.string(),
  status_id: z.string().optional(),
  standard_status_id: z.string().optional(),
  is_standard: z.boolean(),
  custom_name: z.string().nullable(),
  display_order: z.number(),
  is_visible: z.boolean()
});

export const projectSchema = tenantSchema.extend({
  project_id: z.string(),
  company_id: z.string(),
  project_name: z.string(),
  description: z.string().nullable(),
  start_date: z.date().nullable(),
  end_date: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
  client_name: z.string().optional(),
  wbs_code: z.string(),
  is_inactive: z.boolean(),
  status: z.string()
});

export const projectPhaseSchema = tenantSchema.extend({
  phase_id: z.string(),
  project_id: z.string(),
  phase_name: z.string(),
  description: z.string().nullable(),
  start_date: z.date().nullable(),
  end_date: z.date().nullable(),
  status: z.string(),
  order_number: z.number(),
  created_at: z.date(),
  updated_at: z.date(),
  wbs_code: z.string()
});

export const projectTaskSchema = tenantSchema.extend({
  task_id: z.string(),
  phase_id: z.string(),
  task_name: z.string(),
  description: z.string().nullable(),
  assigned_to: z.string().nullable(),
  estimated_hours: z.number().nullable(),
  actual_hours: z.number().nullable(),
  project_status_mapping_id: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
  wbs_code: z.string(),
  due_date: z.date().nullable(),
  checklist_items: z.array(z.lazy(() => taskChecklistItemSchema)).optional()
});

export const projectTicketLinkSchema = tenantSchema.extend({
  link_id: z.string(),
  project_id: z.string(),
  phase_id: z.string().nullable(),
  task_id: z.string().nullable(),
  ticket_id: z.string(),
  created_at: z.date()
});

export const taskChecklistItemSchema = tenantSchema.extend({
  checklist_item_id: z.string(),
  task_id: z.string(),
  item_name: z.string(),
  description: z.string().nullable(),
  assigned_to: z.string().nullable(),
  completed: z.boolean(),
  due_date: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
  order_number: z.number()
});

// Input schemas (for create/update operations)
export const createProjectSchema = projectSchema.omit({
  project_id: true,
  created_at: true,
  updated_at: true
});

export const updateProjectSchema = projectSchema.partial().omit({
  project_id: true,
  created_at: true,
  updated_at: true
});

export const createPhaseSchema = projectPhaseSchema.omit({
  phase_id: true,
  created_at: true,
  updated_at: true,
  tenant: true
});

export const createTaskSchema = projectTaskSchema.omit({
  task_id: true,
  created_at: true,
  updated_at: true,
  tenant: true
});

export const updateTaskSchema = projectTaskSchema.partial().omit({
  task_id: true,
  created_at: true,
  updated_at: true,
  tenant: true
});

export const createChecklistItemSchema = taskChecklistItemSchema.omit({
  checklist_item_id: true,
  task_id: true,
  created_at: true,
  updated_at: true,
  tenant: true
});

export const updateChecklistItemSchema = taskChecklistItemSchema.partial().omit({
  checklist_item_id: true,
  created_at: true,
  updated_at: true,
  tenant: true
});
