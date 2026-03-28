import type { YearlyData, Loan, PropertyData } from '../types';
import { formatEur } from '../utils/calculation';

interface Props {
  property: PropertyData;
  loans: Loan[];
  schedule: YearlyData[];
}

function MetricCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function MetricsHeader({ property, loans, schedule }: Props) {
  const purchaseSideCosts =
    property.purchasePrice *
    ((property.propertyTransferTax + property.notaryFees + property.agentCommission) / 100);
  const totalRequirement = property.purchasePrice + purchaseSideCosts + property.renovationCosts;

  const totalMonthlyPayment = schedule.length > 0 ? schedule[0].totalPayment : 0;
  const totalInterestCosts = schedule.reduce((s, y) => s + y.totalInterest, 0);

  const fullRepaymentYear = schedule.length > 0 ? schedule[schedule.length - 1].year : 0;
  const currentYear = new Date().getFullYear();
  const fullRepaymentAbsoluteYear = currentYear + fullRepaymentYear - 1;

  const kfwGrant = loans
    .filter((l) => l.type === 'kfw261')
    .reduce((s, l) => s + (l.repaymentGrantEur ?? 0), 0);

  const totalCostBase = totalRequirement + totalInterestCosts - kfwGrant;

  return (
    <div className="flex flex-col gap-4">
      {/* Key metric cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Gesamtbedarf" value={formatEur(totalRequirement)} />
        <MetricCard
          title="Monatliche Gesamtrate"
          value={formatEur(totalMonthlyPayment)}
          sub="im 1. Jahr"
        />
        <MetricCard
          title="Gesamte Zinskosten"
          value={formatEur(totalInterestCosts)}
          sub="über alle Kredite"
        />
        <MetricCard
          title="Volltilgung"
          value={fullRepaymentYear > 0 ? `${fullRepaymentAbsoluteYear}` : '—'}
          sub={
            fullRepaymentYear > 0
              ? `in ${fullRepaymentYear} Jahr${fullRepaymentYear !== 1 ? 'en' : ''}`
              : ''
          }
        />
      </div>

      {/* Cost breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Aufschlüsselung Gesamtkosten</h3>
        <div className="flex flex-col gap-2">
          <CostRow label="Kaufpreis" amount={property.purchasePrice} total={totalCostBase} />
          <CostRow label="Kaufnebenkosten" amount={purchaseSideCosts} total={totalCostBase} />
          <CostRow label="Sanierungskosten" amount={property.renovationCosts} total={totalCostBase} />
          <CostRow label="Zinskosten gesamt" amount={totalInterestCosts} total={totalCostBase} highlight />
          {kfwGrant > 0 && (
            <CostRow label="KfW-Zuschuss (Ersparnis)" amount={-kfwGrant} total={totalCostBase} positive />
          )}
          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="text-sm font-semibold text-slate-700">Gesamtkosten (inkl. Zinsen)</span>
            <span className="font-bold text-slate-900">{formatEur(totalCostBase)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CostRow({
  label,
  amount,
  total,
  highlight,
  positive,
}: {
  label: string;
  amount: number;
  total: number;
  highlight?: boolean;
  positive?: boolean;
}) {
  const share = total > 0 ? (Math.abs(amount) / total) * 100 : 0;
  const barColor = positive ? 'bg-green-400' : highlight ? 'bg-amber-400' : 'bg-blue-400';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className={positive ? 'text-green-700' : 'text-slate-600'}>{label}</span>
        <span className={`font-medium ${positive ? 'text-green-700' : 'text-slate-800'}`}>
          {positive && amount < 0 ? '− ' : ''}
          {formatEur(Math.abs(amount))}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, share)}%` }} />
      </div>
    </div>
  );
}
