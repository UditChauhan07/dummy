// File: TemplateRenderer.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TemplateRenderer from '@/components/billing-dashboard/TemplateRenderer';
import { IInvoiceTemplate, InvoiceViewModel } from '@/interfaces/invoice.interfaces';
import { describe, it, expect, vi, beforeEach, beforeAll, afterEach, afterAll } from 'vitest';

describe('TemplateRenderer', () => {
  test('renders nested field value correctly', () => {
    const template: IInvoiceTemplate = {
      parsed: {
        sections: [
          {
            type: 'header',
            grid: { columns: 12, minRows: 1 },
            content: [
              {
                type: 'field',
                name: 'company.name',
                position: { column: 1, row: 1 },
                span: { columnSpan: 6, rowSpan: 1 }
              }
            ]
          }
        ], globals: []
      },
      template_id: '',
      name: '',
      version: 0,
      dsl: ''
    };

    const invoiceData: InvoiceViewModel = {
      company: {
        name: 'Acme Corporation',
        logo: '',
        address: ''
      },
      invoice_number: '',
      invoice_date: new Date(),
      due_date: new Date(),
      total: 0,
      status: 'draft',
      invoice_items: [],
      contact: {
        name: '',
        address: ''
      },
      subtotal: 0,
      tax: 0,
      invoice_id: ''
    };

    render(<TemplateRenderer template={template} invoiceData={invoiceData} />);

    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
  });

  test('renders nested non-nested field value correctly', () => {
    const template: IInvoiceTemplate = {
      parsed: {
        sections: [
          {
            type: 'header',
            grid: { columns: 12, minRows: 1 },
            content: [
              {
                type: 'field',
                name: 'status',
                position: { column: 1, row: 1 },
                span: { columnSpan: 6, rowSpan: 1 }
              }
            ],

          },
          {
            type: 'summary',
            grid: { columns: 12, minRows: 1 },
            content: [
              {
                type: 'field',
                name: 'subtotal',
                position: { column: 1, row: 1 },
                span: { columnSpan: 6, rowSpan: 1 }
              }
            ]
          }
        ], globals: []
      },
      template_id: '',
      name: '',
      version: 0,
      dsl: ''
    };

    const invoiceData: InvoiceViewModel = {
      company: {
        name: 'Acme Corporation',
        logo: '',
        address: ''
      },
      invoice_number: '',
      invoice_date: new Date(),
      due_date: new Date(),
      status: 'draft',
      invoice_items: [],
      contact: {
        name: '',
        address: ''
      },
      subtotal: 101,
      tax: 0,
      total: 0,
      invoice_id: ''
    };

    render(<TemplateRenderer template={template} invoiceData={invoiceData} />);
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('101')).toBeInTheDocument();
  });
});

describe('TemplateRenderer - Calculated Fields', () => {
  test('renders a simple calculation field', () => {
    const template: IInvoiceTemplate = {
      parsed: {
        sections: [
          {
            type: 'summary',
            grid: { columns: 12, minRows: 1 },
            content: [
              {
                type: 'calculation',
                name: 'total_items',
                expression: { operation: 'count', field: 'invoice_items' },
                position: { column: 1, row: 1 },
                span: { columnSpan: 6, rowSpan: 1 },
                isGlobal: false,
                listReference: undefined
              }
            ]
          }
        ], globals: []
      },
      template_id: '',
      name: '',
      version: 0,
      dsl: ''
    };

    const invoiceData: InvoiceViewModel = {
      invoice_items: [
        {
          name: 'Item 1', description: 'Desc 1', quantity: 1, unit_price: 10, total_price: 10,
          tax_amount: 0,
          net_amount: 0
        },
        {
          name: 'Item 2', description: 'Desc 2', quantity: 2, unit_price: 20, total_price: 40,
          tax_amount: 0,
          net_amount: 0
        },
      ],
      // ... other required fields
      invoice_number: '',
      company: { name: '', logo: '', address: '' },
      contact: { name: '', address: '' },
      invoice_date: new Date(),
      due_date: new Date(),
      status: 'draft',
      subtotal: 50,
      tax: 0,
      total: 50,
      invoice_id: ''
    };

    render(<TemplateRenderer template={template} invoiceData={invoiceData} />);

    expect(screen.getByText((content, element) => {
      return content.indexOf('2') !== -1;
    })).toBeInTheDocument(); // Count of invoice_items
  });

  test('renders a sum calculation field', () => {
    const template: IInvoiceTemplate = {
      parsed: {
        sections: [
          {
            type: 'summary',
            grid: { columns: 12, minRows: 1 },
            content: [
              {
                type: 'calculation',
                name: 'total_price',
                expression: { operation: 'sum', field: 'total_price' },
                position: { column: 1, row: 1 },
                span: { columnSpan: 6, rowSpan: 1 },
                isGlobal: false,
                listReference: 'invoice_items'
              }
            ]
          }
        ],
        globals: []
      },
      template_id: '',
      name: '',
      version: 0,
      dsl: ''
    };

    const invoiceData: InvoiceViewModel = {
      invoice_items: [
        {
          name: 'Item 1', description: 'Desc 1', quantity: 1, unit_price: 10, total_price: 10,
          tax_amount: 0,
          net_amount: 0
        },
        {
          name: 'Item 2', description: 'Desc 2', quantity: 2, unit_price: 20, total_price: 40,
          tax_amount: 0,
          net_amount: 0
        },
      ],

      invoice_number: '',
      company: { name: '', logo: '', address: '' },
      contact: { name: '', address: '' },
      invoice_date: new Date(),
      due_date: new Date(),
      status: 'draft',
      subtotal: 50,
      tax: 0,
      total: 50,
      invoice_id: ''
    };

    render(<TemplateRenderer template={template} invoiceData={invoiceData} />);

    expect(screen.getByText((content, element) => {
      return content.indexOf('50') !== -1;
    })).toBeInTheDocument(); // Sum of total_price
  });



  // Add this test to your TemplateRenderer.test.tsx file

  test('renders global calculation correctly', () => {
    const template: IInvoiceTemplate = {
        parsed: {
            sections: [
                {
                    type: 'summary',
                    grid: { columns: 12, minRows: 1 },
                    content: [
                        {
                            type: 'field',
                            name: 'global_subtotal',
                            position: { column: 10, row: 1 },
                            span: { columnSpan: 3, rowSpan: 1 }
                        }
                    ]
                }
            ],
            globals: [
                {
                    type: 'calculation',
                    name: 'global_subtotal',
                    expression: { operation: 'sum', field: 'invoice_items' },
                    isGlobal: true
                }
            ]
        },
        template_id: '',
        name: '',
        version: 0,
        dsl: ''
    };

    const invoiceData: InvoiceViewModel = {
      company: {
        name: 'Acme Corporation',
        logo: '',
        address: ''
      },
      invoice_number: 'INV-001',
      invoice_date: new Date('2023-05-01'),
      due_date: new Date('2023-05-15'),
      total: 150,
      status: 'draft',
      subtotal: 150,
      tax: 0,
      invoice_items: [
        {
          name: 'Item 1', description: 'Description 1', quantity: 1, unit_price: 100, total_price: 100,
          tax_amount: 0,
          net_amount: 0
        },
        {
          name: 'Item 2', description: 'Description 2', quantity: 1, unit_price: 50, total_price: 50,
          tax_amount: 0,
          net_amount: 0
        }
      ],
      contact: {
        name: '',
        address: ''
      },
      invoice_id: ''
    };

    render(<TemplateRenderer template={template} invoiceData={invoiceData} />);

    expect(screen.getByText('150')).toBeInTheDocument(); // The sum of total_price from invoice_items
});

});