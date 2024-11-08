import { Knex } from 'knex';
import { createTenantKnex } from '@/lib/db';
import {
  IBillingPeriod,
  IBillingResult,
  IBillingCharge,
  ICompanyBillingPlan,
  IBucketPlan,
  IBucketUsage,
  IBucketCharge,
  IDiscount,
  IAdjustment,
  IUsageBasedCharge,
  ITimeBasedCharge,
  IFixedPriceCharge,
  ICompanyBillingCycle
} from '@/interfaces/billing.interfaces';
import {
  differenceInDays,
  differenceInHours,
  differenceInMilliseconds,
  max,
  getDaysInMonth,
  addMilliseconds,
  parseISO,
  toDate,
  startOfDay,
  endOfDay,
  addDays,
  format,
  isValid
} from 'date-fns';
import { ISO8601String } from '@/types/types.d';
import { getCompanyTaxRate } from '@/lib/actions/invoiceActions';
import { ICompany } from '@/interfaces';

export class BillingEngine {
  private knex: Knex;

  constructor() {
    this.knex = null as any;
  }

  private async initKnex() {
    if (!this.knex) {
      this.knex = (await createTenantKnex()).knex;
    }
  }

  async calculateBilling(companyId: string, startDate: ISO8601String, endDate: ISO8601String): Promise<IBillingResult> {
    await this.initKnex();
    console.log(`Calculating billing for company ${companyId} from ${startDate} to ${endDate}`);
    const billingPeriod: IBillingPeriod = { startDate, endDate };

    const { companyBillingPlans, billingCycle } = await this.getCompanyBillingPlansAndCycle(companyId, billingPeriod);
    if (companyBillingPlans.length === 0) {
      throw new Error(`No active billing plans found for company ${companyId} in the given period`);
    }

    console.log(`Found ${companyBillingPlans.length} active billing plan(s) for company ${companyId}`);
    console.log(`Billing cycle: ${billingCycle}`);

    let totalCharges: IBillingCharge[] = [];

    for (const companyBillingPlan of companyBillingPlans) {
      console.log(`Processing billing plan: ${companyBillingPlan.plan_id}`);
      const [fixedPriceCharges, timeBasedCharges, usageBasedCharges, bucketPlanCharges] = await Promise.all([
        this.calculateFixedPriceCharges(companyId, billingPeriod, companyBillingPlan),
        this.calculateTimeBasedCharges(companyId, billingPeriod, companyBillingPlan),
        this.calculateUsageBasedCharges(companyId, billingPeriod, companyBillingPlan),
        this.calculateBucketPlanCharges(companyId, billingPeriod, companyBillingPlan)
      ]);

      console.log(`Fixed price charges: ${fixedPriceCharges.length}`);
      console.log(`Time-based charges: ${timeBasedCharges.length}`);
      console.log(`Usage-based charges: ${usageBasedCharges.length}`);
      console.log(`Bucket plan charges: ${bucketPlanCharges.length}`);

      console.log(`Total fixed charges before proration: ${fixedPriceCharges.reduce((sum, charge) => sum + charge.total, 0)}`);

      // Only prorate fixed price charges
      const proratedFixedCharges = this.applyProrationToPlan(fixedPriceCharges, billingPeriod, companyBillingPlan.start_date, billingCycle);

      console.log(`Total fixed charges after proration: ${proratedFixedCharges.reduce((sum, charge) => sum + charge.total, 0)}`);

      // Combine all charges without prorating time-based or usage-based charges
      totalCharges = totalCharges.concat(proratedFixedCharges, timeBasedCharges, usageBasedCharges, bucketPlanCharges);

      console.log('Total charges breakdown:');
      proratedFixedCharges.forEach(charge => {
        console.log(`fixed - ${charge.serviceName}: $${charge.total}`);
      });
      timeBasedCharges.forEach(charge => {
        console.log(`hourly - ${charge.serviceName}: $${charge.total}`);
      });
      usageBasedCharges.forEach(charge => {
        console.log(`usage - ${charge.serviceName}: $${charge.total}`);
      });
      bucketPlanCharges.forEach(charge => {
        console.log(`bucket - ${charge.serviceName}: $${charge.total}`);
      });

      console.log('Total charges:', totalCharges);
    }

    const totalAmount = totalCharges.reduce((sum, charge) => sum + charge.total, 0);

    const finalCharges = await this.applyDiscountsAndAdjustments(
      {
        charges: totalCharges,
        totalAmount,
        discounts: [],
        adjustments: [],
        finalAmount: totalAmount
      },
      companyId,
      billingPeriod
    );

    console.log(`Discounts applied: ${finalCharges.discounts.length}`);
    console.log(`Adjustments applied: ${finalCharges.adjustments.length}`);
    console.log(`Final amount after discounts and adjustments: $${finalCharges.finalAmount}`);

    return {
      charges: finalCharges.charges,
      totalAmount: finalCharges.totalAmount,
      discounts: finalCharges.discounts,
      adjustments: finalCharges.adjustments,
      finalAmount: finalCharges.finalAmount
    };
  }

  private async getCompanyBillingPlansAndCycle(companyId: string, billingPeriod: IBillingPeriod): Promise<{ companyBillingPlans: ICompanyBillingPlan[], billingCycle: string }> {
    await this.initKnex();
    const companyBillingPlans = await this.knex('company_billing_plans')
      .where({ company_id: companyId, is_active: true })
      .where('start_date', '<=', billingPeriod.endDate)
      .where(function (this: any) {
        this.where('end_date', '>=', billingPeriod.startDate).orWhereNull('end_date');
      })
      .orderBy('start_date', 'desc');

    companyBillingPlans.forEach((plan: any) => {
      plan.start_date = plan.start_date.toISOString();
      plan.end_date = plan.end_date ? plan.end_date.toISOString() : null;
    });

    const billingCycle = await this.getBillingCycle(companyId);

    return { companyBillingPlans, billingCycle };
  }

  private async getBillingCycle(companyId: string): Promise<string> {
    await this.initKnex();
    const result = await this.knex('company_billing_cycles')
      .where({ company_id: companyId })
      .first() as ICompanyBillingCycle | undefined;

    return result ? result.billing_cycle : 'monthly'; // Default to monthly if not set
  }

  private async calculateFixedPriceCharges(companyId: string, billingPeriod: IBillingPeriod, companyBillingPlan: ICompanyBillingPlan): Promise<IFixedPriceCharge[]> {
    await this.initKnex();
    const company = await this.knex('companies').where({ company_id: companyId }).first() as ICompany;
      
    const planServices = await this.knex('company_billing_plans')
      .join('billing_plans', 'company_billing_plans.plan_id', 'billing_plans.plan_id')
      .join('plan_services', 'billing_plans.plan_id', 'plan_services.plan_id')
      .join('service_catalog', 'plan_services.service_id', 'service_catalog.service_id')
      .where({
        'company_billing_plans.company_id': companyId,
        'company_billing_plans.company_billing_plan_id': companyBillingPlan.company_billing_plan_id,
        'service_catalog.service_type': 'Fixed'
        // 'service_catalog.category_id': companyBillingPlan.service_category // TODO - add this back in when we have categories
      })
      .select('service_catalog.*', 'plan_services.quantity', 'plan_services.custom_rate');

    // Calculate charges for each service in the plan
    const fixedCharges: IFixedPriceCharge[] = planServices.map((service: any):IFixedPriceCharge => {
      const charge: IFixedPriceCharge = {
        serviceId: service.service_id,
        serviceName: service.service_name,
        quantity: service.quantity,
        rate: service.custom_rate || service.default_rate,
        total: (service.custom_rate || service.default_rate) * service.quantity,
        type: 'fixed',
        tax_amount: 0,
        tax_rate: 0
      };
  
      if (!company.is_tax_exempt && service.is_taxable !== false) {
        charge.tax_rate = service.tax_rate || 0;
        charge.tax_amount = charge.total * (charge.tax_rate / 100);
      } else {
        charge.tax_rate = 0;
        charge.tax_amount = 0;
      }
  
      return charge;
    });

    console.log(`Fixed price charges for company ${companyId}:`, fixedCharges);
    return fixedCharges;
  }    

  private async calculateTimeBasedCharges(companyId: string, billingPeriod: IBillingPeriod, companyBillingPlan: ICompanyBillingPlan): Promise<ITimeBasedCharge[]> {
    await this.initKnex();
    const timeEntries = await this.knex('time_entries')
      .join('users', 'time_entries.user_id', 'users.user_id')
      .leftJoin('project_ticket_links', 'time_entries.work_item_id', 'project_ticket_links.ticket_id')
      .leftJoin('project_tasks', 'project_ticket_links.task_id', 'project_tasks.task_id')
      .leftJoin('project_phases', 'project_tasks.phase_id', 'project_phases.phase_id')
      .leftJoin('projects', 'project_phases.project_id', 'projects.project_id')
      .leftJoin('tickets', 'time_entries.work_item_id', 'tickets.ticket_id')
      .join('service_catalog', 'time_entries.service_id', 'service_catalog.service_id')
      .join('plan_services', 'service_catalog.service_id', 'plan_services.service_id')
      .andWhere('plan_services.plan_id', companyBillingPlan.plan_id)
      .where('time_entries.start_time', '>=', billingPeriod.startDate)
      .where('time_entries.end_time', '<=', billingPeriod.endDate)
      .where(function (this: Knex.QueryBuilder) {
        this.where(function (this: Knex.QueryBuilder) {
          this.where('time_entries.work_item_type', '=', 'project_task')
            .whereNotNull('project_tasks.task_id')
        }).orWhere(function (this: Knex.QueryBuilder) {
          this.where('time_entries.work_item_type', '=', 'ticket')
            .whereNotNull('tickets.ticket_id')
        })
      })
      .where(function (this: Knex.QueryBuilder) {
        this.where('projects.company_id', companyId)
          .orWhere('tickets.company_id', companyId)
      })
      .where('service_catalog.category_id', companyBillingPlan.service_category)
      .where('time_entries.approval_status', 'APPROVED')
      .select(
        'time_entries.*',
        'service_catalog.service_name',
        'service_catalog.default_rate',
        'plan_services.custom_rate',
        this.knex.raw('COALESCE(project_tasks.task_name, tickets.title) as work_item_name')
      );

    const timeBasedCharges: ITimeBasedCharge[] = timeEntries.map((entry: any):ITimeBasedCharge => {
      const duration = differenceInHours(entry.end_time, entry.start_time);
      const rate = entry.custom_rate || entry.default_rate;
      return {
        serviceId: entry.service_id,
        serviceName: entry.service_name,
        // workItemName: entry.work_item_name,
        userId: entry.user_id,
        duration,
        rate,
        total: duration * rate,
        type: 'time',
        tax_amount: 0,
        tax_rate: 0,
        tax_region: entry.tax_region || entry.company_tax_region, // Use the time entry's tax region if available, otherwise use the company's
      };
    });

    // No proration applied here
    return timeBasedCharges;
  }

  private async calculateUsageBasedCharges(companyId: string, billingPeriod: IBillingPeriod, companyBillingPlan: ICompanyBillingPlan): Promise<IUsageBasedCharge[]> {
    await this.initKnex();
    const usageRecords = await this.knex('usage_tracking')
      .join('service_catalog', 'usage_tracking.service_id', 'service_catalog.service_id')
      .join('plan_services', function (this: Knex.JoinClause) {
        this.on('service_catalog.service_id', '=', 'plan_services.service_id')
      })
      .where('usage_tracking.company_id', companyId)
      .whereBetween('usage_tracking.usage_date', [billingPeriod.startDate, billingPeriod.endDate])
      .where('service_catalog.category_id', companyBillingPlan.service_category)
      .where('plan_services.plan_id', companyBillingPlan.plan_id)
      .select('usage_tracking.*', 'service_catalog.service_name', 'service_catalog.default_rate', 'plan_services.custom_rate');

    const usageBasedCharges: IUsageBasedCharge[] = usageRecords.map((record: any):IUsageBasedCharge => ({
      serviceId: record.service_id,
      serviceName: record.service_name,
      quantity: record.quantity,
      rate: record.custom_rate || record.default_rate,
      total: record.quantity * (record.custom_rate || record.default_rate),
      tax_region: record.tax_region || record.company_tax_region, // Use the usage record's tax region if available, otherwise use the company's
      type: 'usage',
      tax_amount: 0,
      tax_rate: 0
    }));

    // No proration applied here
    return usageBasedCharges;
  }

  private async calculateBucketPlanCharges(companyId: string, period: IBillingPeriod, billingPlan: ICompanyBillingPlan): Promise<IBucketCharge[]> {
    await this.initKnex();
    const bucketPlan = await this.knex('bucket_plans')
      .where('plan_id', billingPlan.plan_id)
      .first();

    if (!bucketPlan) return [];

    const bucketUsage = await this.knex('bucket_usage')
      .where({
        bucket_plan_id: bucketPlan.bucket_plan_id,
        company_id: companyId
      })
      .whereBetween('period_start', [period.startDate, period.endDate])
      .first();

    if (!bucketUsage) return [];

    const company = await this.knex('companies')
      .where({ company_id: companyId })
      .first();

    if (!company) return [];

    const service = await this.knex('service_catalog')
      .where('service_id', bucketUsage.service_catalog_id)
      .first();

    const taxRegion = service.tax_region || company.tax_region;
    const taxRate = await getCompanyTaxRate(taxRegion, period.endDate);


    const charge: IBucketCharge = {
      type: 'bucket',
      service_catalog_id: bucketUsage.service_catalog_id,
      serviceName: service ? service.service_name : 'Bucket Plan Hours',
      rate: bucketPlan.overage_rate,
      total: bucketUsage.overage_hours * bucketPlan.overage_rate,
      hoursUsed: bucketUsage.hours_used,
      overageHours: bucketUsage.overage_hours,
      overageRate: bucketPlan.overage_rate,
      tax_rate: taxRate,
      tax_region: taxRegion,
      serviceId: bucketUsage.service_catalog_id,
      tax_amount: Math.ceil(taxRate * bucketUsage.overage_hours * bucketPlan.overage_rate)
    };

    console.log('Calculated bucket charge:', charge);

    return [charge];
  }

  private applyProrationToPlan(charges: IBillingCharge[], billingPeriod: IBillingPeriod, planStartDate: ISO8601String, billingCycle: string): IBillingCharge[] {
    console.log('Billing period start:', billingPeriod.startDate);
    console.log('Billing period end:', billingPeriod.endDate);
    console.log('Plan start date:', planStartDate);

    // Use the later of plan start and period start
    const effectiveStart = [planStartDate, billingPeriod.startDate].reduce((a, b) => a > b ? a : b);
    console.log('Effective start:', effectiveStart);

    let cycleLength: number;
    switch (billingCycle) {
      case 'weekly':
        cycleLength = 7;
        break;
      case 'bi-weekly':
        cycleLength = 14;
        break;
      case 'monthly':
        cycleLength = getDaysInMonth(parseISO(billingPeriod.startDate));
        break;
      case 'quarterly':
        cycleLength = 91; // Approximation
        break;
      case 'semi-annually':
        cycleLength = 182; // Approximation
        break;
      case 'annually':
        cycleLength = 365; // Approximation
        break;
      default:
        cycleLength = getDaysInMonth(parseISO(billingPeriod.startDate)); // Default to monthly
    }

    // Calculate the number of days in the billing period for this plan
    const actualDays = differenceInDays(billingPeriod.endDate, effectiveStart);
    console.log(`Actual days in plan period: ${actualDays}`);
    console.log(`Cycle length: ${cycleLength}`);

    const prorationFactor = actualDays / cycleLength;
    console.log(`Proration factor: ${prorationFactor.toFixed(4)} (${actualDays} / ${cycleLength})`);

    return charges.map((charge):IBillingCharge => {
      const proratedTotal = charge.total * prorationFactor;
      console.log(`Prorating charge: ${charge.serviceName}`);
      console.log(`  Original total: $${charge.total.toFixed(2)}`);
      console.log(`  Prorated total: $${proratedTotal.toFixed(2)}`);
      return {
        ...charge,
        total: proratedTotal
      };
    });
  }

  private async applyDiscountsAndAdjustments(
    billingResult: IBillingResult,
    companyId: string,
    billingPeriod: IBillingPeriod
  ): Promise<IBillingResult> {
    // Fetch applicable discounts within the billing period
    const discounts = await this.fetchDiscounts(companyId, billingPeriod);

    let discountTotal = 0;
    for (const discount of discounts) {
      if (discount.discount_type === 'percentage') {
        discount.amount = (billingResult.totalAmount * (discount.value / 100));
      } else if (discount.discount_type === 'fixed') {
        discount.amount = discount.value;
      }
      discountTotal += discount.amount || 0;
    }

    const finalAmount = billingResult.totalAmount - discountTotal;

    return {
      ...billingResult,
      discounts,
      adjustments: [], // Implement adjustments if needed
      finalAmount
    };
  }

  private async fetchDiscounts(companyId: string, billingPeriod: IBillingPeriod): Promise<IDiscount[]> {
    await this.initKnex();
    const { startDate, endDate } = billingPeriod;
    const discounts = await this.knex('discounts')
      .join('plan_discounts', 'discounts.discount_id', 'plan_discounts.discount_id')
      .join('company_billing_plans', function (this: Knex.JoinClause) {
        this.on('company_billing_plans.plan_id', '=', 'plan_discounts.plan_id')
          .andOn('company_billing_plans.company_id', '=', 'plan_discounts.company_id');
      })
      .where('company_billing_plans.company_id', companyId)
      .andWhere('discounts.is_active', true)
      .andWhere('discounts.start_date', '<=', endDate)
      .andWhere(function (this: Knex.QueryBuilder) {
        this.whereNull('discounts.end_date')
          .orWhere('discounts.end_date', '>=', startDate);
      })
      .select('discounts.*');

    return discounts;
  }

  private async fetchAdjustments(companyId: string): Promise<IAdjustment[]> {
    await this.initKnex();
    const adjustments = await this.knex('adjustments').where({ company_id: companyId });
    return Array.isArray(adjustments) ? adjustments : [];
  }

  async rolloverUnapprovedTime(companyId: string, currentPeriodEnd: ISO8601String, nextPeriodStart: ISO8601String): Promise<void> {
    await this.initKnex();
    // Fetch unapproved time entries
    const knex = this.knex;
    const unapprovedEntries = await this.knex('time_entries')
      .leftJoin('tickets', function (this: Knex.JoinClause) {
        this.on('time_entries.work_item_id', '=', 'tickets.ticket_id')
          .andOn('time_entries.work_item_type', '=', knex.raw('?', ['ticket']))
      })
      .leftJoin('project_tasks', function (this: Knex.JoinClause) {
        this.on('time_entries.work_item_id', '=', 'project_tasks.task_id')
          .andOn('time_entries.work_item_type', '=', knex.raw('?', ['project_task']))
      })
      .leftJoin('project_phases', 'project_tasks.phase_id', 'project_phases.phase_id')
      .leftJoin('projects', 'project_phases.project_id', 'projects.project_id')
      .where(function (this: Knex.QueryBuilder) {
        this.where('tickets.company_id', companyId)
          .orWhere('projects.company_id', companyId)
      })
      .whereIn('time_entries.approval_status', ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED'])
      .where('time_entries.end_time', '<=', currentPeriodEnd)
      .select('time_entries.*');

    // Update the start and end times of unapproved entries to the next billing period
    for (const entry of unapprovedEntries) {
      const duration = differenceInMilliseconds(parseISO(entry.end_time), parseISO(entry.start_time));
      const newStartTime = parseISO(nextPeriodStart);
      const newEndTime = addMilliseconds(newStartTime, duration);
      await this.knex('time_entries')
        .where({ entry_id: entry.entry_id })
        .update({
          start_time: format(newStartTime, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
          end_time: format(newEndTime, "yyyy-MM-dd'T'HH:mm:ss'Z'")
        });
    }

    console.log(`Rolled over ${unapprovedEntries.length} unapproved time entries for company ${companyId}`);
  }
}
