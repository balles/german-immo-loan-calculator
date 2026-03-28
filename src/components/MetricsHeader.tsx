import { useMemo } from 'react';
import type { YearlyData, Loan, PropertyData, EquityData } from '../types';
import { formatEur, computeScenarioMetrics } from '../utils/calculation';
import { CostBreakdownChart } from './CostBreakdownChart';

interface Props {
  property: PropertyData;
  equityData: EquityData;
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

export function MetricsHeader({ property, equityData, loans, schedule }: Props) {
  const metrics = useMemo(
    () => computeScenarioMetrics(property, equityData.equity, loans, schedule),
    [property, equityData, loans, schedule],
  );

  const { totalRequirement, totalMonthlyPaymentYear1: totalMonthlyPayment, totalInterestCosts,
    fullRepaymentYear, fullRepaymentAbsoluteYear } = metrics;

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
          sub={fullRepaymentYear > 0 ? `in ${fullRepaymentYear} Jahr${fullRepaymentYear !== 1 ? 'en' : ''}` : ''}
        />
      </div>

      {/* Cost breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">Aufschlüsselung Gesamtkosten</h3>
        <CostBreakdownChart property={property} metrics={metrics} />
      </div>
    </div>
  );
}
