import { TaxService } from '../../lib/services/taxService';
import { ICompanyTaxSettings, ITaxRate, ITaxComponent, ITaxRateThreshold, ITaxHoliday } from '../../interfaces/tax.interfaces';
import CompanyTaxSettings from '../../lib/models/companyTaxSettings';

import { describe, it, expect, vi, beforeEach, beforeAll, afterEach, afterAll, Mocked } from 'vitest';

vi.mock('../../lib/models/companyTaxSettings');

describe('TaxService', () => {
    let taxService: TaxService;
    const mockCompanyTaxSettings = CompanyTaxSettings as Mocked<typeof CompanyTaxSettings>;

    beforeEach(() => {
        taxService = new TaxService('test_tenant');
        jest.clearAllMocks();
    });

    describe('calculateTax', () => {
        it('should calculate simple tax correctly', async () => {
            const mockTaxSettings: ICompanyTaxSettings = {
                tenant: 'test_tenant',
                company_id: 'company1',
                tax_rate_id: 'rate1',
                is_reverse_charge_applicable: false,
            };

            const mockTaxRate: ITaxRate = {
                tax_rate_id: 'rate1',
                tax_type: 'VAT',
                country_code: 'US',
                tax_percentage: 10,
                is_reverse_charge_applicable: false,
                is_composite: false,
                start_date: '2023-01-01',
                is_active: true,
                name: 'Standard VAT',
            };

            mockCompanyTaxSettings.get.mockResolvedValue(mockTaxSettings);
            mockCompanyTaxSettings.getTaxRate.mockResolvedValue(mockTaxRate);
            mockCompanyTaxSettings.getTaxRateThresholds.mockResolvedValue([]);

            const result = await taxService.calculateTax('company1', 100, '2023-06-01');

            expect(result.taxAmount).toBe(10);
            expect(result.taxRate).toBe(10);
        });

        it('should calculate composite tax correctly', async () => {
            const mockTaxSettings: ICompanyTaxSettings = {
                tenant: 'test_tenant',
                company_id: 'company1',
                tax_rate_id: 'rate1',
                is_reverse_charge_applicable: false,
            };

            const mockTaxRate: ITaxRate = {
                tax_rate_id: 'rate1',
                tax_type: 'VAT',
                country_code: 'US',
                tax_percentage: 15,
                is_reverse_charge_applicable: false,
                is_composite: true,
                start_date: '2023-01-01',
                is_active: true,
                name: 'Composite VAT',
            };

            const mockTaxComponents: ITaxComponent[] = [
                {
                    tax_component_id: 'comp1',
                    tax_rate_id: 'rate1',
                    name: 'State Tax',
                    rate: 5,
                    sequence: 1,
                    is_compound: false,
                },
                {
                    tax_component_id: 'comp2',
                    tax_rate_id: 'rate1',
                    name: 'City Tax',
                    rate: 2,
                    sequence: 2,
                    is_compound: true,
                },
            ];

            mockCompanyTaxSettings.get.mockResolvedValue(mockTaxSettings);
            mockCompanyTaxSettings.getTaxRate.mockResolvedValue(mockTaxRate);
            mockCompanyTaxSettings.getCompositeTaxComponents.mockResolvedValue(mockTaxComponents);
            mockCompanyTaxSettings.getTaxHolidays.mockResolvedValue([]);

            const result = await taxService.calculateTax('company1', 100, '2023-06-01');

            // Expected calculation:
            // State Tax: 100 * 5% = 5
            // City Tax: (100 + 5) * 2% = 2.1
            // Total Tax: 5 + 2.1 = 7.1
            expect(result.taxAmount).toBeCloseTo(7.1, 2);
            expect(result.taxRate).toBeCloseTo(7.1, 2);
            expect(result.taxComponents).toEqual(mockTaxComponents);
        });

        it('should apply threshold-based tax correctly', async () => {
            const mockTaxSettings: ICompanyTaxSettings = {
                tenant: 'test_tenant',
                company_id: 'company1',
                tax_rate_id: 'rate1',
                is_reverse_charge_applicable: false,
            };

            const mockTaxRate: ITaxRate = {
                tax_rate_id: 'rate1',
                tax_type: 'VAT',
                country_code: 'US',
                tax_percentage: 0,
                is_reverse_charge_applicable: false,
                is_composite: false,
                start_date: '2023-01-01',
                is_active: true,
                name: 'Threshold VAT',
            };

            const mockThresholds: ITaxRateThreshold[] = [
                {
                    tax_rate_threshold_id: 'threshold1',
                    tax_rate_id: 'rate1',
                    min_amount: 0,
                    max_amount: 100,
                    rate: 5,
                },
                {
                    tax_rate_threshold_id: 'threshold2',
                    tax_rate_id: 'rate1',
                    min_amount: 100,
                    max_amount: 200,
                    rate: 10,
                },
                {
                    tax_rate_threshold_id: 'threshold3',
                    tax_rate_id: 'rate1',
                    min_amount: 200,
                    rate: 15,
                },
            ];

            mockCompanyTaxSettings.get.mockResolvedValue(mockTaxSettings);
            mockCompanyTaxSettings.getTaxRate.mockResolvedValue(mockTaxRate);
            mockCompanyTaxSettings.getTaxRateThresholds.mockResolvedValue(mockThresholds);

            const result = await taxService.calculateTax('company1', 250, '2023-06-01');

            // Expected calculation:
            // 0-100: 100 * 5% = 5
            // 100-200: 100 * 10% = 10
            // 200-250: 50 * 15% = 7.5
            // Total Tax: 5 + 10 + 7.5 = 22.5
            expect(result.taxAmount).toBeCloseTo(22.5, 2);
            expect(result.taxRate).toBeCloseTo(9, 2); // 22.5 / 250 = 9%
            expect(result.appliedThresholds).toEqual(mockThresholds);
        });

        it('should apply tax holiday correctly', async () => {
            const mockTaxSettings: ICompanyTaxSettings = {
                tenant: 'test_tenant',
                company_id: 'company1',
                tax_rate_id: 'rate1',
                is_reverse_charge_applicable: false,
            };

            const mockTaxRate: ITaxRate = {
                tax_rate_id: 'rate1',
                tax_type: 'VAT',
                country_code: 'US',
                tax_percentage: 10,
                is_reverse_charge_applicable: false,
                is_composite: true,
                start_date: '2023-01-01',
                is_active: true,
                name: 'Standard VAT',
            };

            const mockTaxComponents: ITaxComponent[] = [
                {
                    tax_component_id: 'comp1',
                    tax_rate_id: 'rate1',
                    name: 'Standard VAT',
                    rate: 10,
                    sequence: 1,
                    is_compound: false,
                },
            ];

            const mockHolidays: ITaxHoliday[] = [
                {
                    tax_holiday_id: 'holiday1',
                    tax_component_id: 'comp1',
                    start_date: '2023-06-01',
                    end_date: '2023-06-30',
                    description: 'June Tax Holiday',
                },
            ];

            mockCompanyTaxSettings.get.mockResolvedValue(mockTaxSettings);
            mockCompanyTaxSettings.getTaxRate.mockResolvedValue(mockTaxRate);
            mockCompanyTaxSettings.getCompositeTaxComponents.mockResolvedValue(mockTaxComponents);
            mockCompanyTaxSettings.getTaxHolidays.mockResolvedValue(mockHolidays);

            const result = await taxService.calculateTax('company1', 100, '2023-06-15');

            expect(result.taxAmount).toBe(0);
            expect(result.taxRate).toBe(0);
            expect(result.taxComponents).toEqual([]);
        });

        it('should apply reverse charge correctly', async () => {
            const mockTaxSettings: ICompanyTaxSettings = {
                tenant: 'test_tenant',
                company_id: 'company1',
                tax_rate_id: 'rate1',
                is_reverse_charge_applicable: true,
            };

            mockCompanyTaxSettings.get.mockResolvedValue(mockTaxSettings);

            const result = await taxService.calculateTax('company1', 100, '2023-06-01');

            expect(result.taxAmount).toBe(0);
            expect(result.taxRate).toBe(0);
        });
    });

    describe('isReverseChargeApplicable', () => {
        it('should return correct reverse charge applicability', async () => {
            const mockTaxSettings: ICompanyTaxSettings = {
                tenant: 'test_tenant',
                company_id: 'company1',
                tax_rate_id: 'rate1',
                is_reverse_charge_applicable: true,
            };

            mockCompanyTaxSettings.get.mockResolvedValue(mockTaxSettings);

            const result = await taxService.isReverseChargeApplicable('company1');

            expect(result).toBe(true);
        });
    });

    describe('getTaxType', () => {
        it('should return correct tax type', async () => {
            const mockTaxSettings: ICompanyTaxSettings = {
                tenant: 'test_tenant',
                company_id: 'company1',
                tax_rate_id: 'rate1',
                is_reverse_charge_applicable: false,
            };

            const mockTaxRate: ITaxRate = {
                tax_rate_id: 'rate1',
                tax_type: 'VAT',
                country_code: 'US',
                tax_percentage: 10,
                is_reverse_charge_applicable: false,
                is_composite: false,
                start_date: '2023-01-01',
                is_active: true,
                name: 'Standard VAT',
            };

            mockCompanyTaxSettings.get.mockResolvedValue(mockTaxSettings);
            mockCompanyTaxSettings.getTaxRate.mockResolvedValue(mockTaxRate);

            const result = await taxService.getTaxType('company1');

            expect(result).toBe('VAT');
        });
    });

    it('should handle overlapping tax holidays correctly', () => {
        throw new Error('Test not implemented');
    });

    it('should apply the correct tax rate based on the transaction date', () => {
        throw new Error('Test not implemented');
    });

    it('should handle tax exemptions correctly', () => {
        throw new Error('Test not implemented');
    });

    it('should calculate taxes correctly for negative amounts (refunds)', () => {
        throw new Error('Test not implemented');
    });

    it('should handle tax rounding correctly for small amounts', () => {
        throw new Error('Test not implemented');
    });

    it('should apply the correct tax rate for international transactions', () => {
        throw new Error('Test not implemented');
    });

    it('should handle tax calculation for multi-item invoices with different tax rates', () => {
        throw new Error('Test not implemented');
    });

    it('should apply tax caps correctly when present', () => {
        throw new Error('Test not implemented');
    });

    it('should handle tax calculation for different currencies correctly', () => {
        throw new Error('Test not implemented');
    });

    it('should apply reverse charge mechanism correctly for B2B transactions', () => {
        throw new Error('Test not implemented');
    });

    it('should handle tax calculation for subscriptions spanning multiple tax periods', () => {
        throw new Error('Test not implemented');
    });

    it('should apply progressive tax rates correctly', () => {
        throw new Error('Test not implemented');
    });

    it('should handle tax calculation for items with mixed taxable and non-taxable components', () => {
        throw new Error('Test not implemented');
    });
});