// BillingDashboard.tsx
'use client'
import React, { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { ITimePeriod, IService } from '@/interfaces';

// Import all the components including the new TaxRates component
import Overview from './Overview';
import BillingPlans from './BillingPlans';
import TimePeriods from './TimePeriods';
import Invoices from './Invoices';
import InvoiceTemplates from './InvoiceTemplates';
import ServiceCatalog from './ServiceCatalog';
import Reports from './Reports';
import BillingCycles from './BillingCycles';
import TaxRates from './TaxRates';

interface BillingDashboardProps {
  initialTimePeriods: ITimePeriod[];
  initialServices: IService[];
}

const BillingDashboard: React.FC<BillingDashboardProps> = ({
  initialTimePeriods,
  initialServices
}) => {
  const [error] = useState<string | null>(null);

  const tabs = [
    'overview',
    'plans',
    'time-periods',
    'invoices',
    'invoice-templates',
    'billing-cycles',
    'reports',
    'service-catalog',
    'tax-rates'
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Billing Dashboard</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <Tabs.Root defaultValue="overview" className="w-full">
        <Tabs.List className="flex border-b mb-4">
          {tabs.map((tab):JSX.Element => (
            <Tabs.Trigger
              key={tab}
              value={tab}
              className="px-4 py-2 focus:outline-none transition-colors data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 text-gray-500 hover:text-gray-700"
            >
              {tab.split('-').map((word):string => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="overview">
          <Overview />
        </Tabs.Content>

        <Tabs.Content value="plans">
          <BillingPlans initialServices={initialServices} />
        </Tabs.Content>

        <Tabs.Content value="time-periods">
          <TimePeriods initialTimePeriods={initialTimePeriods} />
        </Tabs.Content>

        <Tabs.Content value="invoices">
          <Invoices />
        </Tabs.Content>

        <Tabs.Content value="invoice-templates">
          <InvoiceTemplates />
        </Tabs.Content>

        <Tabs.Content value="service-catalog">
          <ServiceCatalog />
        </Tabs.Content>

        <Tabs.Content value="reports">
          <Reports />
        </Tabs.Content>

        <Tabs.Content value="billing-cycles">
          <BillingCycles />
        </Tabs.Content>

        <Tabs.Content value="tax-rates">
          <TaxRates />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default BillingDashboard;
