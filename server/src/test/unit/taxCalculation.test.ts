import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaxService } from '../lib/services/taxService';
import { ICompanyTaxSettings, ITaxRate, ITaxCalculationResult, ITaxComponent, ITaxRateThreshold } from '../interfaces/tax.interfaces';
import CompanyTaxSettings from '../lib/models/companyTaxSettings';
import { ISO8601String } from '../types/types.d';

// Mock the CompanyTaxSettings model
vi.mock('../lib/models/companyTaxSettings', () => ({
  default: {
    get: vi.fn(),
    getTaxRate: vi.fn(),
    getCompositeTaxComponents: vi.fn(),
    getTaxRateThresholds: vi.fn(),
    getTaxHolidays: vi.fn(),
  },
}));

describe('TaxService', () => {
  let taxService: TaxService;
  const tenantId = 'test-tenant-id';
  const companyId = 'test-company-id';
  const date: ISO8601String = '2024-01-01T00:00:00Z';

  beforeEach(() => {
    taxService = new TaxService(tenantId);
    vi.resetAllMocks();
  });

  describe('Standard Tax Application', () => {
    it('should correctly apply standard tax rate to a single taxable item', async () => {
        const netAmount = 100;
        const mockTaxSettings = createMockTaxSettings(tenantId, companyId, false);
        const mockTaxRate = createMockTaxRate(15, false);
    
        (CompanyTaxSettings.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockTaxSettings);
        (CompanyTaxSettings.getTaxRate as ReturnType<typeof vi.fn>).mockResolvedValue(mockTaxRate);
        // Mock getTaxRateThresholds to return an empty array
        (CompanyTaxSettings.getTaxRateThresholds as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    
        const result = await taxService.calculateTax(companyId, netAmount, date);
    
        expect(result.taxAmount).toBe(15); // 15% of 100
        expect(result.taxRate).toBe(15);
    
        expect(CompanyTaxSettings.get).toHaveBeenCalledWith(tenantId, companyId);
        expect(CompanyTaxSettings.getTaxRate).toHaveBeenCalledWith('test-tax-rate-id');
      });

      it('should correctly apply standard tax rate to multiple taxable items', async () => {
        const netAmount = 250; // Simulating multiple items: 100 + 150
        const mockTaxSettings = createMockTaxSettings(tenantId, companyId, false);
        const mockTaxRate = createMockTaxRate(15, false);
    
        (CompanyTaxSettings.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockTaxSettings);
        (CompanyTaxSettings.getTaxRate as ReturnType<typeof vi.fn>).mockResolvedValue(mockTaxRate);
        // Mock getTaxRateThresholds to return an empty array
        (CompanyTaxSettings.getTaxRateThresholds as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    
        const result = await taxService.calculateTax(companyId, netAmount, date);
    
        expect(result.taxAmount).toBe(37.5); // 15% of 250
        expect(result.taxRate).toBe(15);
      });

      it('should return zero tax when reverse charge is applicable', async () => {
        const netAmount = 100;
        const mockTaxSettings = createMockTaxSettings(tenantId, companyId, true);
    
        (CompanyTaxSettings.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockTaxSettings);
        // Mock getTaxRateThresholds to return an empty array
        (CompanyTaxSettings.getTaxRateThresholds as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    
        const result = await taxService.calculateTax(companyId, netAmount, date);
    
        expect(result.taxAmount).toBe(0);
        expect(result.taxRate).toBe(0);
      });
  });

  describe('Composite Tax Application', () => {
    it('should correctly apply composite tax rate', async () => {
      const netAmount = 100;
      const mockTaxSettings = createMockTaxSettings(tenantId, companyId, false);
      const mockTaxRate = createMockTaxRate(0, true); // Composite tax
      const mockComponents: ITaxComponent[] = [
        { tax_component_id: 'comp1', tax_rate_id: 'test-tax-rate-id', name: 'Component 1', sequence: 1, rate: 5, is_compound: false },
        { tax_component_id: 'comp2', tax_rate_id: 'test-tax-rate-id', name: 'Component 2', sequence: 2, rate: 10, is_compound: true },
      ];

      (CompanyTaxSettings.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockTaxSettings);
      (CompanyTaxSettings.getTaxRate as ReturnType<typeof vi.fn>).mockResolvedValue(mockTaxRate);
      (CompanyTaxSettings.getCompositeTaxComponents as ReturnType<typeof vi.fn>).mockResolvedValue(mockComponents);
      (CompanyTaxSettings.getTaxHolidays as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await taxService.calculateTax(companyId, netAmount, date);

      // Expected calculation:
      // Component 1: 5% of 100 = 5
      // Component 2: 10% of (100) = 10
      // Total tax: 5 + 10 = 15
      expect(result.taxAmount).toBeCloseTo(15);
      expect(result.taxRate).toBeCloseTo(15);
    });
  });

  describe('Threshold-Based Tax Application', () => {
    it('should correctly apply threshold-based tax rate', async () => {
      const netAmount = 1000;
      const mockTaxSettings = createMockTaxSettings(tenantId, companyId, false);
      const mockTaxRate = createMockTaxRate(0, false); // Simple tax with thresholds
      const mockThresholds: ITaxRateThreshold[] = [
        { tax_rate_threshold_id: 'threshold1', tax_rate_id: 'test-tax-rate-id', min_amount: 0, max_amount: 500, rate: 10 },
        { tax_rate_threshold_id: 'threshold2', tax_rate_id: 'test-tax-rate-id', min_amount: 500, max_amount: undefined, rate: 20 },
      ];

      (CompanyTaxSettings.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockTaxSettings);
      (CompanyTaxSettings.getTaxRate as ReturnType<typeof vi.fn>).mockResolvedValue(mockTaxRate);
      (CompanyTaxSettings.getTaxRateThresholds as ReturnType<typeof vi.fn>).mockResolvedValue(mockThresholds);

      const result = await taxService.calculateTax(companyId, netAmount, date);

      // Expected calculation:
      // First 500: 10% of 500 = 50
      // Remaining 500: 20% of 500 = 100
      // Total tax: 50 + 100 = 150
      expect(result.taxAmount).toBe(150);
      expect(result.taxRate).toBe(15); // (150 / 1000) * 100
    });

    it('should correctly apply tax rates based on defined thresholds', async () => {
      const mockTaxSettings = createMockTaxSettings(tenantId, companyId, false);
      const mockTaxRate = createMockTaxRate(0, false); // Simple tax with thresholds
      const mockThresholds: ITaxRateThreshold[] = [
        { tax_rate_threshold_id: 'threshold1', tax_rate_id: 'test-tax-rate-id', min_amount: 0, max_amount: 1000, rate: 0 },
        { tax_rate_threshold_id: 'threshold2', tax_rate_id: 'test-tax-rate-id', min_amount: 1001, max_amount: 5000, rate: 10 },
        { tax_rate_threshold_id: 'threshold3', tax_rate_id: 'test-tax-rate-id', min_amount: 5001, max_amount: undefined, rate: 15 },
      ];

      (CompanyTaxSettings.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockTaxSettings);
      (CompanyTaxSettings.getTaxRate as ReturnType<typeof vi.fn>).mockResolvedValue(mockTaxRate);
      (CompanyTaxSettings.getTaxRateThresholds as ReturnType<typeof vi.fn>).mockResolvedValue(mockThresholds);

      // Test case 1: Below first threshold
      const result1 = await taxService.calculateTax(companyId, 800, date);
      expect(result1.taxAmount).toBe(0);
      expect(result1.taxRate).toBe(0);

      // Test case 2: Within second threshold
      const result2 = await taxService.calculateTax(companyId, 3000, date);
      expect(result2.taxAmount).toBe(200); // 10% of 3000-1000 = 200
      expect(result2.taxRate).toBeCloseTo(6.67);

      // Test case 3: Above highest threshold
      const result3 = await taxService.calculateTax(companyId, 6000, date);
      expect(result3.taxAmount).toBe(550); // 0% of 1000 + 10% of 4000 + 15% of 1000
      expect(result3.taxRate).toBeCloseTo(9.17);
    });
  });
});

function createMockTaxSettings(tenantId: string, companyId: string, isReverseCharge: boolean): ICompanyTaxSettings {
  return {
    tenant: tenantId,
    company_id: companyId,
    tax_rate_id: 'test-tax-rate-id',
    is_reverse_charge_applicable: isReverseCharge,
  };
}

function createMockTaxRate(percentage: number, isComposite: boolean): ITaxRate {
  return {
    tax_rate_id: 'test-tax-rate-id',
    tax_percentage: percentage,
    is_composite: isComposite,
    tax_type: 'VAT',
    country_code: 'US',
    is_reverse_charge_applicable: false,
    start_date: '2024-01-01',
    is_active: true,
    name: 'Test Tax Rate',
  };
}