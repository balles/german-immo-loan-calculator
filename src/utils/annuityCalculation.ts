import type { Loan } from '../types';

export interface YearPaymentResult {
  yearlyInterest: number;
  yearlyRepayment: number;
  remainingDebt: number;
}

/** Simulate 12 monthly payments and return yearly totals + remaining debt. */
export function simulateYearPayments(
  startingDebt: number,
  monthlyPayment: number,
  monthlyInterestRate: number,
): YearPaymentResult {
  let debt = startingDebt;
  let yearlyInterest = 0;
  let yearlyRepayment = 0;

  for (let m = 0; m < 12; m++) {
    if (debt <= 0) break;
    const interest = debt * monthlyInterestRate;
    const repayment = Math.max(0, Math.min(monthlyPayment - interest, debt));
    yearlyInterest += interest;
    yearlyRepayment += repayment;
    debt -= repayment;
  }

  return { yearlyInterest, yearlyRepayment, remainingDebt: debt };
}

/** Return the applicable interest rate for a given relative year (handles follow-up rate). */
export function getEffectiveRate(loan: Loan, relativeYear: number): number {
  return relativeYear > loan.fixedRatePeriod ? loan.followUpRate : loan.interestRate;
}

export interface ExtraPaymentResult {
  effectiveExtraPayment: number;
  remainingDebt: number;
}

/** Apply scheduled extra payments for an absolute year, capped by max and remaining debt. */
export function applyExtraPayments(
  debt: number,
  loan: Loan,
  absoluteYear: number,
): ExtraPaymentResult {
  const maxExtraPA = loan.loanAmount * (loan.extraPaymentMaxPercent / 100);
  const scheduled = loan.scheduledExtraPayments
    .filter((ep) => ep.year === absoluteYear)
    .reduce((s, ep) => s + ep.amount, 0);
  const effectiveExtraPayment = Math.min(scheduled, maxExtraPA, Math.max(0, debt));
  return { effectiveExtraPayment, remainingDebt: debt - effectiveExtraPayment };
}
