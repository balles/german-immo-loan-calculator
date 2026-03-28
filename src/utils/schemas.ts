import { z } from 'zod';

const ExtraPaymentSchema = z.object({
  id: z.string(),
  year: z.number().int().positive(),
  amount: z.number().min(0),
});

const LoanSchema = z.object({
  id: z.string(),
  type: z.enum(['annuity', 'kfw261']),
  name: z.string(),
  loanAmount: z.number().min(0),
  interestRate: z.number().min(0),
  fixedRatePeriod: z.number().int().positive(),
  monthlyPayment: z.number().min(0),
  extraPaymentMaxPercent: z.number().min(0),
  scheduledExtraPayments: z.array(ExtraPaymentSchema),
  followUpRate: z.number().min(0),
  startYear: z.number().int().positive(),
  endYear: z.number().int().positive().optional(),
  followUpLoanId: z.string().optional(),
  // KfW 261 only
  laufzeit: z.number().int().positive().optional(),
  efficiencyLevel: z.enum(['40', '55', '70', '85']).optional(),
  repaymentGrantPercent: z.number().min(0).optional(),
  repaymentGrantEur: z.number().min(0).optional(),
});

const PropertyDataSchema = z.object({
  purchasePrice: z.number().min(0),
  propertyTransferTax: z.number().min(0),
  notaryFees: z.number().min(0),
  agentCommission: z.number().min(0),
  renovationCosts: z.number().min(0),
});

const EquityDataSchema = z.object({
  equity: z.number().min(0),
});

const ComparisonScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  property: PropertyDataSchema,
  equityData: EquityDataSchema,
  loans: z.array(LoanSchema),
});

export const ImportedStateSchema = z.object({
  version: z.number().int().optional(),
  name: z.string().optional().default(''),
  property: PropertyDataSchema,
  equityData: EquityDataSchema,
  loans: z.array(LoanSchema),
  comparisonScenarios: z.array(ComparisonScenarioSchema).optional().default([]),
});
