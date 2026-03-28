import type { Loan, EfficiencyHouseLevel, ExtraPayment } from '../types';
import { formatEur, getKfwGrantPercent, calculateKfwMonthlyPayment, generateId } from '../utils/calculation';

interface Props {
  loan: Loan;
  onChange: (l: Loan) => void;
  onRemove: () => void;
  onAddFollowUp?: () => void;
  onSyncFollowUp?: () => void;
}

function Field({
  label,
  children,
  error,
  info,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  info?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {info && !error && <p className="text-xs text-blue-500">{info}</p>}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  suffix = '€',
  step = 1000,
  readonly = false,
  placeholder,
}: {
  value: number;
  onChange?: (v: number) => void;
  suffix?: string;
  step?: number;
  readonly?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="relative flex items-center">
      <input
        type="number"
        value={value || ''}
        step={step}
        readOnly={readonly}
        placeholder={placeholder}
        onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
        className={`w-full rounded border px-2 py-1.5 pr-8 text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
          readonly
            ? 'border-slate-200 bg-slate-50 text-slate-500'
            : 'border-slate-300 bg-white'
        }`}
      />
      <span className="absolute right-2 text-xs text-slate-400">{suffix}</span>
    </div>
  );
}

export function LoanCard({ loan, onChange, onRemove, onAddFollowUp, onSyncFollowUp }: Props) {
  const isKfw = loan.type === 'kfw261';
  const monthlyInterestRate = loan.interestRate / 100 / 12;
  const monthlyInterest = loan.loanAmount * monthlyInterestRate;
  const paymentTooLow =
    !isKfw && loan.monthlyPayment > 0 && loan.monthlyPayment <= monthlyInterest;

  const kfwComputedPayment = isKfw
    ? calculateKfwMonthlyPayment(
        loan.loanAmount,
        loan.repaymentGrantEur ?? 0,
        loan.interestRate,
        loan.laufzeit ?? 0,
      )
    : 0;

  const maxExtraPA = loan.loanAmount * (loan.extraPaymentMaxPercent / 100);

  // Group scheduled extra payments by year to detect if any year exceeds max
  const totalByYear = new Map<number, number>();
  for (const ep of loan.scheduledExtraPayments) {
    totalByYear.set(ep.year, (totalByYear.get(ep.year) ?? 0) + ep.amount);
  }

  function handleEfficiencyLevelChange(level: EfficiencyHouseLevel) {
    const percent = getKfwGrantPercent(level);
    onChange({ ...loan, efficiencyLevel: level, repaymentGrantPercent: percent, repaymentGrantEur: loan.loanAmount * (percent / 100) });
  }

  function handleGrantPercentChange(percent: number) {
    onChange({ ...loan, repaymentGrantPercent: percent, repaymentGrantEur: loan.loanAmount * (percent / 100) });
  }

  function handleLoanAmountChange(v: number) {
    const updated = { ...loan, loanAmount: v };
    if (loan.type === 'kfw261') {
      updated.repaymentGrantEur = v * ((loan.repaymentGrantPercent ?? 0) / 100);
    }
    onChange(updated);
  }

  function addExtraPayment() {
    const newEp: ExtraPayment = { id: generateId(), year: 1, amount: 0 };
    onChange({ ...loan, scheduledExtraPayments: [...loan.scheduledExtraPayments, newEp] });
  }

  function updateExtraPayment(id: string, patch: Partial<ExtraPayment>) {
    onChange({
      ...loan,
      scheduledExtraPayments: loan.scheduledExtraPayments.map((ep) =>
        ep.id === id ? { ...ep, ...patch } : ep,
      ),
    });
  }

  function removeExtraPayment(id: string) {
    onChange({ ...loan, scheduledExtraPayments: loan.scheduledExtraPayments.filter((ep) => ep.id !== id) });
  }

  const badgeColor =
    loan.type === 'kfw261' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Title row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColor}`}>
            {loan.type === 'kfw261' ? 'KfW 261' : 'Annuität'}
          </span>
          <input
            type="text"
            value={loan.name}
            placeholder="Bezeichnung"
            onChange={(e) => onChange({ ...loan, name: e.target.value })}
            className="rounded border border-slate-200 px-2 py-1 text-sm font-medium text-slate-800 focus:border-blue-400 focus:outline-none"
          />
          {loan.startYear > 1 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              ab Jahr {loan.startYear}
            </span>
          )}
          {loan.endYear !== undefined && (
            <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600">
              endet Jahr {loan.endYear}
              <button
                onClick={() => onChange({ ...loan, endYear: undefined })}
                className="ml-0.5 hover:text-red-500"
                title="Endjahr entfernen"
              >×</button>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onSyncFollowUp && (
            <button
              onClick={onSyncFollowUp}
              className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
              title="Restschuld im Anschlusskredit aktualisieren"
            >
              ↻ Anschlusskredit aktualisieren
            </button>
          )}
          {onAddFollowUp && (
            <button
              onClick={onAddFollowUp}
              className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
              title="Anschlussfinanzierung anlegen"
            >
              + Anschlussfinanzierung
            </button>
          )}
          <button
            onClick={onRemove}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
            title="Kredit entfernen"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main fields */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Darlehensbetrag">
          <NumInput value={loan.loanAmount} onChange={handleLoanAmountChange} />
        </Field>

        <Field label="Zinssatz p.a.">
          <NumInput
            value={loan.interestRate}
            onChange={(v) => onChange({ ...loan, interestRate: v })}
            suffix="%"
            step={0.1}
          />
        </Field>

        {isKfw ? (
          <>
            <Field label="Laufzeit">
              <NumInput
                value={loan.laufzeit ?? 0}
                onChange={(v) => onChange({ ...loan, laufzeit: v })}
                suffix="J"
                step={1}
              />
            </Field>

            <Field label="Monatliche Rate (berechnet)" info="Aus Betrag, Zins und Laufzeit">
              <NumInput value={kfwComputedPayment} readonly />
            </Field>

            <Field label="Effizienzhaus-Stufe">
              <select
                value={loan.efficiencyLevel ?? '55'}
                onChange={(e) => handleEfficiencyLevelChange(e.target.value as EfficiencyHouseLevel)}
                className="rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="40">EH 40</option>
                <option value="55">EH 55</option>
                <option value="70">EH 70</option>
                <option value="85">EH 85</option>
              </select>
            </Field>

            <Field label="Tilgungszuschuss %">
              <NumInput
                value={loan.repaymentGrantPercent ?? 0}
                onChange={handleGrantPercentChange}
                suffix="%"
                step={1}
              />
            </Field>

            <Field label="Tilgungszuschuss €">
              <NumInput value={loan.repaymentGrantEur ?? 0} readonly />
            </Field>
          </>
        ) : (
          <>
            <Field label="Zinsbindung">
              <NumInput
                value={loan.fixedRatePeriod}
                onChange={(v) => onChange({ ...loan, fixedRatePeriod: v })}
                suffix="J"
                step={1}
              />
            </Field>

            <Field
              label="Monatliche Rate"
              error={
                paymentTooLow
                  ? `Rate deckt nicht einmal die Zinsen (mind. ${formatEur(monthlyInterest + 1, 0)})`
                  : undefined
              }
            >
              <NumInput
                value={loan.monthlyPayment}
                onChange={(v) => onChange({ ...loan, monthlyPayment: v })}
                step={50}
              />
            </Field>

            <Field
              label="Anschlusszins (Schätzung)"
              info={
                loan.followUpRate === 0
                  ? 'Bitte Anschlusszins schätzen oder separaten Kredit anlegen'
                  : undefined
              }
            >
              <NumInput
                value={loan.followUpRate}
                onChange={(v) => onChange({ ...loan, followUpRate: v })}
                suffix="%"
                step={0.1}
              />
            </Field>
          </>
        )}

        <Field
          label="Sondertilgung Max p.a."
          info={loan.loanAmount > 0 && loan.extraPaymentMaxPercent > 0
            ? `= ${formatEur(maxExtraPA)} pro Jahr`
            : undefined}
        >
          <NumInput
            value={loan.extraPaymentMaxPercent}
            onChange={(v) => onChange({ ...loan, extraPaymentMaxPercent: v })}
            suffix="%"
            step={0.5}
          />
        </Field>
      </div>

      {/* Scheduled extra payments — not available for KfW */}
      {!isKfw && <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">
            Sondertilgungen
            {loan.extraPaymentMaxPercent > 0 && loan.loanAmount > 0 && (
              <span className="ml-1 font-normal text-slate-400">
                (max. {formatEur(maxExtraPA)}/Jahr)
              </span>
            )}
          </span>
          <button
            onClick={addExtraPayment}
            className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            + Hinzufügen
          </button>
        </div>

        {loan.type === 'kfw261' && loan.scheduledExtraPayments.length > 0 && (
          <p className="mb-2 text-xs text-amber-600">
            ℹ Sondertilgungen bei KfW 261 sind eingeschränkt — bitte Kreditvertrag prüfen.
          </p>
        )}

        {loan.scheduledExtraPayments.length === 0 ? (
          <p className="text-xs text-slate-400">Keine Sondertilgungen geplant.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {loan.scheduledExtraPayments
              .slice()
              .sort((a, b) => a.year - b.year)
              .map((ep) => {
                const yearTotal = totalByYear.get(ep.year) ?? 0;
                const exceedsMax = loan.extraPaymentMaxPercent > 0 && yearTotal > maxExtraPA;
                return (
                  <div key={ep.id} className="flex items-center gap-2">
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        value={ep.year || ''}
                        min={1}
                        step={1}
                        placeholder="Jahr"
                        onChange={(e) => updateExtraPayment(ep.id, { year: parseInt(e.target.value) || 1 })}
                        className="w-20 rounded border border-slate-300 px-2 py-1 pr-8 text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="absolute right-2 text-xs text-slate-400">J</span>
                    </div>
                    <div className="relative flex flex-1 items-center">
                      <input
                        type="number"
                        value={ep.amount || ''}
                        step={500}
                        placeholder="Betrag"
                        onChange={(e) => updateExtraPayment(ep.id, { amount: parseFloat(e.target.value) || 0 })}
                        className={`w-full rounded border px-2 py-1 pr-8 text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          exceedsMax ? 'border-red-300 bg-red-50' : 'border-slate-300'
                        }`}
                      />
                      <span className="absolute right-2 text-xs text-slate-400">€</span>
                    </div>
                    <button
                      onClick={() => removeExtraPayment(ep.id)}
                      className="rounded p-1 text-slate-300 hover:text-red-400"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    {exceedsMax && (
                      <span className="text-xs text-red-500 whitespace-nowrap">
                        Gesamt Jahr {ep.year}: {formatEur(yearTotal)} &gt; Max
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>}

      {isKfw && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
          ℹ Der Tilgungszuschuss reduziert den effektiven Kreditbetrag einmalig zu Beginn. Die monatliche Rate wird daraus berechnet.
        </p>
      )}
    </div>
  );
}
