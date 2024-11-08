// server/src/components/QuickAddBillingPlan.tsx
'use client'

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '../ui/Button';
import { createBillingPlan } from '@/lib/actions/billingPlanAction';
import { IBillingPlan } from '@/interfaces/billing.interfaces';
import { useTenant } from '../TenantProvider';

interface QuickAddBillingPlanProps {
  onPlanAdded: () => void
}

export function QuickAddBillingPlan({ onPlanAdded }: QuickAddBillingPlanProps) {
  const [open, setOpen] = useState(false)
  const [planName, setPlanName] = useState('')
  const [billingFrequency, setBillingFrequency] = useState('')
  const [isCustom, setIsCustom] = useState(false);
  const tenant = useTenant()!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createBillingPlan({
        plan_name: planName,
        billing_frequency: billingFrequency,
        is_custom: isCustom,
        plan_type: 'fixed', // TODO: Replaced with actual value
        tenant: tenant
      })
      onPlanAdded()
      setOpen(false)
      // Clear form fields
      setPlanName('')
      setBillingFrequency('')
      setIsCustom(false)
    } catch (error) {
      console.error('Error creating billing plan:', error)
      // Handle error (e.g., show error message to user)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button>Add Billing Plan</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg w-96">
          <Dialog.Title className="text-lg font-bold mb-4">Add New Billing Plan</Dialog.Title>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Plan Name"
              className="w-full p-2 border rounded mb-2"
              required
            />
            <input
              type="text"
              value={billingFrequency}
              onChange={(e) => setBillingFrequency(e.target.value)}
              placeholder="Billing Frequency"
              className="w-full p-2 border rounded mb-2"
              required
            />
            <label className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={isCustom}
                onChange={(e) => setIsCustom(e.target.checked)}
                className="mr-2"
              />
              Is Custom Plan
            </label>
            <Button type="submit">Save Billing Plan</Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
