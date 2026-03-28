export const KFW_GRANT_TABLE: Record<string, number> = {
  '40': 45,
  '55': 20,
  '70': 10,
  '85': 5,
};

export function getKfwGrantPercent(level: string): number {
  return KFW_GRANT_TABLE[level] ?? 0;
}

export function getKfwEffectiveAmount(loanAmount: number, repaymentGrantEur: number): number {
  return Math.max(0, loanAmount - repaymentGrantEur);
}

export function calculateKfwMonthlyPayment(
  loanAmount: number,
  repaymentGrantEur: number,
  interestRate: number,
  laufzeit: number,
): number {
  const effectiveAmount = getKfwEffectiveAmount(loanAmount, repaymentGrantEur);
  const n = laufzeit * 12;
  if (n === 0) return 0;
  const monthlyRate = interestRate / 100 / 12;
  if (monthlyRate === 0) return effectiveAmount / n;
  return (effectiveAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
}

export function isKfwTermComplete(relativeYear: number, laufzeit: number): boolean {
  return relativeYear >= laufzeit;
}
