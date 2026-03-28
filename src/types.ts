export type LoanType = 'annuity' | 'kfw261';
export type EfficiencyHouseLevel = '40' | '55' | '70' | '85';

export interface ExtraPayment {
  id: string;
  year: number;
  amount: number;
}

export interface Loan {
  id: string;
  type: LoanType;
  name: string;
  loanAmount: number;
  interestRate: number; // p.a. in %
  fixedRatePeriod: number; // years
  monthlyPayment: number;
  extraPaymentMaxPercent: number; // % of loan amount allowed per year
  scheduledExtraPayments: ExtraPayment[];
  followUpRate: number; // % p.a. — only used for annuity loans after fixedRatePeriod
  startYear: number; // absolute year the loan begins (default 1)
  endYear?: number;  // if set, loan is forced to zero after this year (used for Anschlussfinanzierung handoff)
  followUpLoanId?: string; // id of the Anschlussfinanzierung loan, if one was created
  // KfW 261 only
  laufzeit?: number; // total term in years (rate is fixed, loan fully repaid at end)
  efficiencyLevel?: EfficiencyHouseLevel;
  repaymentGrantPercent?: number;
  repaymentGrantEur?: number;
}

export interface PropertyData {
  purchasePrice: number;
  propertyTransferTax: number; // %
  notaryFees: number; // %
  agentCommission: number; // %
  renovationCosts: number;
}

export interface EquityData {
  equity: number;
}

export interface AppState {
  name: string;
  property: PropertyData;
  equityData: EquityData;
  loans: Loan[];
  activeTab: 'input' | 'evaluation';
}

export interface YearlyData {
  year: number;
  loanData: LoanYearlyData[];
  totalInterest: number;
  totalRepayment: number;
  totalExtraPayment: number;
  totalRemainingDebt: number;
  totalPayment: number;
}

export interface LoanYearlyData {
  loanId: string;
  name: string;
  interestPortion: number;
  repaymentPortion: number;
  extraPayment: number;
  remainingDebt: number;
  payment: number;
  fixedRatePeriodEnd: boolean;
  isFullyRepaid: boolean;
}
