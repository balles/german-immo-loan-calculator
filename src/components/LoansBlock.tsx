import { useState } from 'react';
import type { Loan, LoanType, YearlyData } from '../types';
import { LoanCard } from './LoanCard';
import { formatEur, getKfwGrantPercent, generateId } from '../utils/calculation';

interface Props {
  loans: Loan[];
  financingRequirement: number;
  schedule: YearlyData[];
  onChange: (loans: Loan[]) => void;
}

function createLoan(type: LoanType, overrides: Partial<Loan> = {}): Loan {
  const id = generateId();
  const base: Loan = {
    id,
    type,
    name: type === 'kfw261' ? 'KfW 261' : 'Kredit',
    loanAmount: 0,
    interestRate: 0,
    fixedRatePeriod: 10,
    monthlyPayment: 0,
    extraPaymentMaxPercent: 0,
    scheduledExtraPayments: [],
    followUpRate: 0,
    startYear: 1,
    ...overrides,
  };
  if (type === 'kfw261') {
    const level = '55';
    return {
      ...base,
      laufzeit: 20,
      efficiencyLevel: level,
      repaymentGrantPercent: getKfwGrantPercent(level),
      repaymentGrantEur: 0,
    };
  }
  return base;
}

export function LoansBlock({ loans, financingRequirement, schedule, onChange }: Props) {
  const [fillTargetId, setFillTargetId] = useState<string>('');

  const totalLoans = loans.filter((l) => l.startYear <= 1).reduce((s, l) => s + l.loanAmount, 0);
  const difference = totalLoans - financingRequirement;
  const covered = Math.abs(difference) < 1;

  const initialLoans = loans.filter((l) => l.startYear <= 1);

  // Default to first initial loan if selection is empty or stale
  const fillTarget = initialLoans.find((l) => l.id === fillTargetId) ?? initialLoans[0];

  function addLoan(type: LoanType) {
    onChange([...loans, createLoan(type)]);
  }

  function updateLoan(id: string, updated: Loan) {
    onChange(loans.map((l) => (l.id === id ? updated : l)));
  }

  function removeLoan(id: string) {
    onChange(loans.filter((l) => l.id !== id));
  }

  // Adjust chosen loan's amount to exactly cover the financing requirement
  function fillGap() {
    if (!fillTarget) return;
    const otherTotal = loans.filter((l) => l.id !== fillTarget.id).reduce((s, l) => s + l.loanAmount, 0);
    const target = Math.max(0, Math.round(financingRequirement - otherTotal));
    const updated = { ...fillTarget, loanAmount: target };
    if (updated.type === 'kfw261') {
      updated.repaymentGrantEur = target * ((updated.repaymentGrantPercent ?? 0) / 100);
    }
    onChange(loans.map((l) => (l.id === fillTarget.id ? updated : l)));
  }

  function getRestschuld(loanId: string, atYear: number): number {
    const yearData = schedule.find((y) => y.year === atYear);
    const loanData = yearData?.loanData.find((d) => d.loanId === loanId);
    return Math.round(loanData?.remainingDebt ?? 0);
  }

  // Create an Anschlussfinanzierung for a given loan
  function addFollowUp(sourceLoan: Loan) {
    const endYear = sourceLoan.startYear + sourceLoan.fixedRatePeriod - 1;
    const startYear = endYear + 1;
    const restschuld = getRestschuld(sourceLoan.id, endYear);

    const followUp = createLoan('annuity', {
      name: `Anschluss ${sourceLoan.name}`,
      loanAmount: restschuld,
      startYear,
    });

    const updatedSource = { ...sourceLoan, endYear, followUpLoanId: followUp.id };
    onChange(loans.map((l) => (l.id === sourceLoan.id ? updatedSource : l)).concat(followUp));
  }

  // Sync follow-up loan's amount with current restschuld
  function syncFollowUp(sourceLoan: Loan) {
    if (!sourceLoan.followUpLoanId) return;
    const endYear = sourceLoan.endYear ?? sourceLoan.startYear + sourceLoan.fixedRatePeriod - 1;
    const restschuld = getRestschuld(sourceLoan.id, endYear);
    onChange(
      loans.map((l) => {
        if (l.id !== sourceLoan.followUpLoanId) return l;
        const updated = { ...l, loanAmount: restschuld };
        if (updated.type === 'kfw261') {
          updated.repaymentGrantEur = restschuld * ((updated.repaymentGrantPercent ?? 0) / 100);
        }
        return updated;
      }),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-800">Kredite</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => addLoan('annuity')}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 active:bg-blue-200"
          >
            + Annuitätenkredit
          </button>
          <button
            onClick={() => addLoan('kfw261')}
            className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 active:bg-green-200"
          >
            + KfW 261
          </button>
        </div>
      </div>

      {/* Coverage check banner */}
      <div
        className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
          covered
            ? 'border-green-200 bg-green-50 text-green-700'
            : difference < 0
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-blue-200 bg-blue-50 text-blue-700'
        }`}
      >
        <span className="text-lg">{covered ? '✓' : difference < 0 ? '⚠' : 'ℹ'}</span>
        <span>
          {covered
            ? 'Finanzierung gedeckt'
            : difference < 0
              ? `Finanzierungslücke: ${formatEur(Math.abs(difference))}`
              : `Überschuss: ${formatEur(difference)}`}
        </span>
        <span className="text-xs opacity-70">
          Summe: {formatEur(totalLoans)} | Bedarf: {formatEur(financingRequirement)}
        </span>
        {!covered && initialLoans.length > 0 && (
          <div className="ml-auto flex items-center gap-1">
            <select
              value={fillTargetId || initialLoans[0]?.id}
              onChange={(e) => setFillTargetId(e.target.value)}
              className="rounded border border-current bg-transparent py-0.5 pl-1 pr-5 text-xs opacity-80 focus:outline-none"
            >
              {initialLoans.map((l) => (
                <option key={l.id} value={l.id}>{l.name || 'Kredit'}</option>
              ))}
            </select>
            <button
              onClick={fillGap}
              className="rounded border border-current px-2 py-0.5 text-xs opacity-80 hover:opacity-100"
            >
              Ausgleichen
            </button>
          </div>
        )}
      </div>

      {loans.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-slate-400">
          Noch keine Kredite angelegt. Klicke oben, um einen Kredit hinzuzufügen.
        </div>
      )}

      {loans.map((loan) => {
        const hasFollowUp = !!loan.followUpLoanId && loans.some((l) => l.id === loan.followUpLoanId);
        return (
          <LoanCard
            key={loan.id}
            loan={loan}
            onChange={(updated) => updateLoan(loan.id, updated)}
            onRemove={() => removeLoan(loan.id)}
            onAddFollowUp={loan.type === 'annuity' && !hasFollowUp ? () => addFollowUp(loan) : undefined}
            onSyncFollowUp={hasFollowUp ? () => syncFollowUp(loan) : undefined}
          />
        );
      })}
    </div>
  );
}
