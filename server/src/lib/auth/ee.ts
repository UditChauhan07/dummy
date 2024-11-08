import { isEnterprise } from '@/lib/features';
import { IPolicy, ICondition } from '@/interfaces/auth.interfaces';

// Re-export EE components conditionally
export const PolicyManagement = async () => {
  if (isEnterprise) {
    const { default: EEPolicyManagement } = await import('@ee/components/settings/policy/PolicyManagement');
    return EEPolicyManagement;
  }
  const { default: CEPolicyManagement } = await import('@/components/settings/policy/PolicyManagement');
  return CEPolicyManagement;
};

// Re-export other EE policy functionality
export const parsePolicy = async (policyString: string): Promise<IPolicy> => {
  if (isEnterprise) {
    const { parsePolicy } = await import('@ee/lib/auth');
    return parsePolicy(policyString);
  }
  throw new Error('Policy parsing is an Enterprise Edition feature');
};
