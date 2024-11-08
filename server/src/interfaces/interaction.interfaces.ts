import { TenantEntity } from ".";

export interface IInteraction extends TenantEntity {
  interaction_id: string;
  type_id: string;
  type_name: string;
  contact_name_id: string | null;
  contact_name: string | null; 
  company_id: string | null;
  company_name: string | null; 
  user_id: string;
  user_name: string; 
  ticket_id: string | null;
  description: string;
  interaction_date: Date;
  duration: number | null;
}

export interface IInteractionType extends TenantEntity {
  type_id: string;
  type_name: string;
  icon?: string;
}
