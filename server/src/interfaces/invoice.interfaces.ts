import { ISO8601String } from '../types/types.d';
import { TenantEntity } from './index';

export interface IInvoice extends TenantEntity {
  invoice_id: string;
  company_id: string;
  invoice_date: Date | ISO8601String;
  due_date: Date | ISO8601String;
  subtotal: number;
  tax: number;
  total_amount: number;
  status: InvoiceStatus;
  invoice_number: string;
  billing_period_start: ISO8601String;
  billing_period_end: ISO8601String;
  finalized_at?: Date | ISO8601String;
}

export interface IInvoiceItem extends TenantEntity {
  item_id: string;
  invoice_id: string;
  service_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_amount: number;
  net_amount: number;
  tax_region?: string;
  tax_rate?: number;
}


export type BlockType = 'text' | 'dynamic' | 'image';

export interface LayoutBlock {
  block_id: string;
  type: BlockType;
  content: string;
  grid_column: number;
  grid_row: number;
  grid_column_span: number;
  grid_row_span: number;
  styles: Record<string, string>;
}

export type ParsedTemplate = {
  sections: Section[];
  globals: Calculation[];
};

export interface IInvoiceTemplate extends TenantEntity {
  template_id: string;
  name: string;
  version: number;
  dsl: string;
  parsed: {
      sections: Section[];
      globals: GlobalCalculation[];
  };
}

export interface GlobalCalculation {
  type: 'calculation';
  name: string;
  expression: {
      operation: string;
      field: string;
  };
  isGlobal: boolean;
}

export interface Field extends BaseTemplateElement {
  type: 'field';
  name: string;
}

export interface Group {
  type: 'group';
  name: string;
  groupBy: string;
  aggregation?: 'sum' | 'count'; 
  aggregationField?: string;
  showDetails?: boolean;
}

export interface Calculation extends BaseTemplateElement {
  type: 'calculation';
  name: string;
  expression: {
    operation: 'sum' | 'count' | 'avg';
    field: string;
  };
  isGlobal: boolean;
  listReference?: string;
}

export interface Style extends BaseTemplateElement {
  type: 'style';
  elements: string[];
  props: Record<string, string | number>;
}

export interface StaticText extends BaseTemplateElement {
  type: 'staticText';
  id?: string;
  content: string;
}

export interface Conditional extends BaseTemplateElement {
  type: 'conditional';
  condition: {
    field: string;
    op: '==' | '!=' | '>' | '<' | '>=' | '<=';
    value: string | number | boolean;
  };
  content: TemplateElement[];
}

export type TemplateElement = Field | Group | Calculation | Style | Conditional | List | StaticText;

export interface BaseTemplateElement {
  type: string;
  position?: {
    column: number;
    row: number;
  };
  span?: {
    columnSpan: number;
    rowSpan: number;
  };
}

export interface List extends BaseTemplateElement {
  type: 'list';
  name: string;
  groupBy?: string;
  content: TemplateElement[];
}

export interface Section extends TenantEntity {
  type: 'header' | 'items' | 'summary';
  grid: {
    columns: number;
    minRows: number;
  };
  content: TemplateElement[];
}

export interface LayoutSection {
  id: string;
  name: string;
  layout: LayoutBlock[];
  grid_rows: number;
  grid_columns: number;
  order_number: number;
}

export interface DraggableLayoutBlock extends LayoutBlock {
  section: 'header' | 'lists' | 'footer';
}

export interface ICustomField {
  field_id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  default_value?: any;
}

export interface IInvoiceAnnotation {
  annotation_id: string;
  invoice_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: Date;
}

export interface IInvoiceDesignerState {
  currentTemplate: IInvoiceTemplate;
  availableFields: Array<ICustomField | string>;
  conditionalRules: Array<IConditionalRule>;
}

export interface IConditionalRule {
  rule_id: string;
  condition: string; // This could be a complex type for advanced conditions
  action: 'show' | 'hide' | 'format';
  target: string; // Field or section to apply the action to
  format?: any; // Formatting options if action is 'format'
}
export interface IInvoiceAnnotation {
  annotation_id: string;
  invoice_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: Date;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'pending';

export interface InvoiceViewModel {
  invoice_number: string;
  company: {
    name: string;
    logo: string;
    address: string;
  };
  contact: {
    name: string;
    address: string;
  }
  invoice_date: Date;
  invoice_id: string;
  due_date: Date;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  total: number;
  invoice_items: IInvoiceItem[];
  custom_fields?: Record<string, any>;
  finalized_at?: Date;
}
