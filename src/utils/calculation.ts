import type { Loan, YearlyData, LoanYearlyData } from '../types';
import { calculateKfwMonthlyPayment, isKfwTermComplete } from './kfwCalculation';
import { simulateYearPayments, getEffectiveRate, applyExtraPayments } from './annuityCalculation';

export { getKfwGrantPercent, calculateKfwMonthlyPayment } from './kfwCalculation';
export { simulateYearPayments, getEffectiveRate, applyExtraPayments } from './annuityCalculation';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function generateId(): string {
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => {
    const n = parseInt(c);
    return (n ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))).toString(16);
  });
}

export function formatEur(value: number, decimals = 0): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number): string {
  return (
    new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }).format(value) + ' %'
  );
}

// ---------------------------------------------------------------------------
// Schedule helpers
// ---------------------------------------------------------------------------

function makeZeroEntry(loan: Loan, isFullyRepaid: boolean): LoanYearlyData {
  return {
    loanId: loan.id,
    name: loan.name,
    interestPortion: 0,
    repaymentPortion: 0,
    extraPayment: 0,
    remainingDebt: 0,
    payment: 0,
    fixedRatePeriodEnd: false,
    isFullyRepaid,
  };
}

function initializeDebtMap(loans: Loan[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const loan of loans) {
    const grant = loan.type === 'kfw261' ? (loan.repaymentGrantEur ?? 0) : 0;
    map.set(loan.id, Math.max(0, loan.loanAmount - grant));
  }
  return map;
}

function getMonthlyPayment(loan: Loan): number {
  if (loan.type === 'kfw261' && loan.laufzeit !== undefined) {
    return calculateKfwMonthlyPayment(
      loan.loanAmount,
      loan.repaymentGrantEur ?? 0,
      loan.interestRate,
      loan.laufzeit,
    );
  }
  return loan.monthlyPayment;
}

interface ProcessResult {
  entry: LoanYearlyData;
  newDebt: number;
  markRepaid: boolean;
  isActive: boolean;
}

function processLoanYear(loan: Loan, year: number, debt: number): ProcessResult {
  const isKfw = loan.type === 'kfw261' && loan.laufzeit !== undefined;
  const relativeYear = year - loan.startYear + 1;

  const monthlyPayment = getMonthlyPayment(loan);
  const monthlyRate = getEffectiveRate(isKfw ? { ...loan, fixedRatePeriod: Infinity } : loan, relativeYear) / 100 / 12;

  const { yearlyInterest, yearlyRepayment, remainingDebt: debtAfterPayments } =
    simulateYearPayments(debt, monthlyPayment, monthlyRate);

  let rd = debtAfterPayments;

  // KfW: clamp floating-point residual at end of term
  if (isKfw && isKfwTermComplete(relativeYear, loan.laufzeit!)) {
    rd = 0;
  }

  const { effectiveExtraPayment, remainingDebt: debtAfterExtra } = applyExtraPayments(rd, loan, year);
  rd = debtAfterExtra;

  const markRepaid = rd <= 0.01;
  if (markRepaid) rd = 0;

  return {
    entry: {
      loanId: loan.id,
      name: loan.name,
      interestPortion: yearlyInterest,
      repaymentPortion: yearlyRepayment,
      extraPayment: effectiveExtraPayment,
      remainingDebt: rd,
      payment: monthlyPayment,
      fixedRatePeriodEnd: !isKfw && relativeYear === loan.fixedRatePeriod,
      isFullyRepaid: rd === 0 && effectiveExtraPayment + yearlyRepayment > 0,
    },
    newDebt: rd,
    markRepaid,
    isActive: true,
  };
}

function aggregateYearData(year: number, loanData: LoanYearlyData[]): YearlyData {
  return {
    year,
    loanData,
    totalInterest: loanData.reduce((s, d) => s + d.interestPortion, 0),
    totalRepayment: loanData.reduce((s, d) => s + d.repaymentPortion, 0),
    totalExtraPayment: loanData.reduce((s, d) => s + d.extraPayment, 0),
    totalRemainingDebt: loanData.reduce((s, d) => s + d.remainingDebt, 0),
    totalPayment: loanData.reduce((s, d) => s + d.payment, 0),
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function calculateLoanSchedule(loans: Loan[]): YearlyData[] {
  const MAX_YEARS = 50;
  const remainingDebts = initializeDebtMap(loans);
  const fullyRepaid = new Map(loans.map((l) => [l.id, false]));
  const result: YearlyData[] = [];

  for (let year = 1; year <= MAX_YEARS; year++) {
    const loanData: LoanYearlyData[] = [];
    let allRepaid = true;

    for (const loan of loans) {
      if (fullyRepaid.get(loan.id)) {
        loanData.push(makeZeroEntry(loan, true));
        continue;
      }

      if (year < loan.startYear) {
        allRepaid = false;
        loanData.push(makeZeroEntry(loan, false));
        continue;
      }

      if (loan.endYear !== undefined && year > loan.endYear) {
        fullyRepaid.set(loan.id, true);
        remainingDebts.set(loan.id, 0);
        loanData.push(makeZeroEntry(loan, true));
        continue;
      }

      allRepaid = false;
      const { entry, newDebt, markRepaid } = processLoanYear(loan, year, remainingDebts.get(loan.id)!);
      remainingDebts.set(loan.id, newDebt);
      if (markRepaid) fullyRepaid.set(loan.id, true);
      loanData.push(entry);
    }

    result.push(aggregateYearData(year, loanData));
    if (allRepaid) break;
  }

  return result;
}
