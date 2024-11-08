// server/src/interfaces/ticket.interfaces.tsx
import { TenantEntity } from ".";

export interface ITicket extends TenantEntity {
  ticket_id?: string;
  ticket_number: string;
  title: string;
  url: string | null;
  channel_id: string;
  company_id: string;
  contact_name_id: string | null;
  status_id: string;
  category_id: string | null;
  subcategory_id: string | null;
  entered_by: string;
  updated_by: string | null;
  closed_by: string | null;
  assigned_to: string | null;
  entered_at: string | null; // Changed from Date to string
  updated_at: string | null; // Changed from Date to string
  closed_at: string | null;  // Changed from Date to string
  attributes: Record<string, unknown> | null; // Changed from any to unknown
  priority_id: string;
}

export interface ITicketListItem extends Omit<ITicket, 'status_id' | 'priority_id' | 'channel_id' | 'entered_by' | 'category_id' | 'subcategory_id'> {
  status_id: string | null;
  priority_id: string | null;
  channel_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  entered_by: string | null;
  status_name: string;
  priority_name: string;
  channel_name: string;
  category_name: string;
  entered_by_name: string;
}

export interface ITicketListFilters {
  channelId?: string;
  statusId?: string;
  priorityId?: string;
  categoryId?: string;
  searchQuery?: string;
  channelFilterState: 'active' | 'inactive' | 'all';
}

export interface IPriority extends TenantEntity {
  priority_id: string;
  priority_name: string;
  created_by: string;
  created_at: Date;
}

export interface ITicketStatus {
  status_id: string;
  name: string;
}

export interface ITicketCategory extends TenantEntity {
  category_id: string;
  category_name: string;
  parent_category?: string;
  channel_id: string;
  created_by: string;
  created_at?: Date;
}
