import type { Loan, YearlyData, LoanYearlyData } from '../types';

export function generateId(): string {
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => {
    const n = parseInt(c);
    return (n ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))).toString(16);
  });
}

const KFW_GRANT_TABLE: Record<string, number> = {
  '40': 45,
  '55': 20,
  '70': 10,
  '85': 5,
};

export function getKfwGrantPercent(level: string): number {
  return KFW_GRANT_TABLE[level] ?? 0;
}

export function calculateKfwMonthlyPayment(
  loanAmount: number,
  repaymentGrantEur: number,
  interestRate: number,
  laufzeit: number,
): number {
  const effectiveAmount = Math.max(0, loanAmount - repaymentGrantEur);
  const n = laufzeit * 12;
  if (n === 0) return 0;
  const monthlyRate = interestRate / 100 / 12;
  if (monthlyRate === 0) return effectiveAmount / n;
  return (effectiveAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
}

export function calculateLoanSchedule(loans: Loan[]): YearlyData[] {
  const MAX_YEARS = 50;
  const result: YearlyData[] = [];

  const remainingDebts = new Map<string, number>();
  const fullyRepaid = new Map<string, boolean>();

  for (const loan of loans) {
    if (loan.type === 'kfw261') {
      const grant = loan.repaymentGrantEur ?? 0;
      remainingDebts.set(loan.id, Math.max(0, loan.loanAmount - grant));
    } else {
      remainingDebts.set(loan.id, loan.loanAmount);
    }
    fullyRepaid.set(loan.id, false);
  }

  for (let year = 1; year <= MAX_YEARS; year++) {
    const loanData: LoanYearlyData[] = [];
    let allRepaid = true;

    for (const loan of loans) {
      const zeroEntry = (isFullyRepaid: boolean): LoanYearlyData => ({
        loanId: loan.id,
        name: loan.name,
        interestPortion: 0,
        repaymentPortion: 0,
        extraPayment: 0,
        remainingDebt: 0,
        payment: 0,
        fixedRatePeriodEnd: false,
        isFullyRepaid,
      });

      if (fullyRepaid.get(loan.id)) {
        loanData.push(zeroEntry(true));
        continue;
      }

      // Loan hasn't started yet
      if (year < loan.startYear) {
        allRepaid = false;
        loanData.push(zeroEntry(false));
        continue;
      }

      // Loan is forced to end at endYear (handoff to Anschlussfinanzierung)
      if (loan.endYear !== undefined && year > loan.endYear) {
        fullyRepaid.set(loan.id, true);
        remainingDebts.set(loan.id, 0);
        loanData.push(zeroEntry(true));
        continue;
      }

      allRepaid = false;
      const debt = remainingDebts.get(loan.id)!;

      // For KfW: fixed rate for entire laufzeit, payment computed from formula
      const isKfw = loan.type === 'kfw261' && loan.laufzeit !== undefined;
      const effectivePayment = isKfw
        ? calculateKfwMonthlyPayment(
            loan.loanAmount,
            loan.repaymentGrantEur ?? 0,
            loan.interestRate,
            loan.laufzeit!,
          )
        : loan.monthlyPayment;

      // Relative year within this loan (accounts for startYear)
      const relativeYear = year - loan.startYear + 1;
      const currentRate =
        !isKfw && relativeYear > loan.fixedRatePeriod ? loan.followUpRate : loan.interestRate;
      const monthlyInterestRate = currentRate / 100 / 12;

      let rd = debt;
      let yearlyInterest = 0;
      let yearlyRepayment = 0;

      for (let m = 0; m < 12; m++) {
        if (rd <= 0) break;
        const monthlyInterest = rd * monthlyInterestRate;
        const monthlyRepayment = Math.max(0, Math.min(effectivePayment - monthlyInterest, rd));
        yearlyInterest += monthlyInterest;
        yearlyRepayment += monthlyRepayment;
        rd -= monthlyRepayment;
      }

      // KfW is fully repaid at end of laufzeit — clamp floating point residual
      if (isKfw && relativeYear >= loan.laufzeit!) rd = 0;

      const maxExtraPA = loan.loanAmount * (loan.extraPaymentMaxPercent / 100);
      const scheduledThisYear = loan.scheduledExtraPayments
        .filter((ep) => ep.year === year)
        .reduce((s, ep) => s + ep.amount, 0);
      const effectiveExtraPayment = Math.min(scheduledThisYear, maxExtraPA, Math.max(0, rd));
      rd -= effectiveExtraPayment;

      if (rd <= 0.01) {
        rd = 0;
        fullyRepaid.set(loan.id, true);
      }

      remainingDebts.set(loan.id, rd);

      loanData.push({
        loanId: loan.id,
        name: loan.name,
        interestPortion: yearlyInterest,
        repaymentPortion: yearlyRepayment,
        extraPayment: effectiveExtraPayment,
        remainingDebt: rd,
        payment: effectivePayment,
        fixedRatePeriodEnd: !isKfw && relativeYear === loan.fixedRatePeriod,
        isFullyRepaid: rd === 0 && effectiveExtraPayment + yearlyRepayment > 0,
      });
    }

    result.push({
      year,
      loanData,
      totalInterest: loanData.reduce((s, d) => s + d.interestPortion, 0),
      totalRepayment: loanData.reduce((s, d) => s + d.repaymentPortion, 0),
      totalExtraPayment: loanData.reduce((s, d) => s + d.extraPayment, 0),
      totalRemainingDebt: loanData.reduce((s, d) => s + d.remainingDebt, 0),
      totalPayment: loanData.reduce((s, d) => s + d.payment, 0),
    });

    if (allRepaid) break;
  }

  return result;
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
