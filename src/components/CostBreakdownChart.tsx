import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { PropertyData, ScenarioMetrics } from '../types';
import { formatEur } from '../utils/calculation';

interface Props {
  property: PropertyData;
  metrics: ScenarioMetrics;
}

const SLICES = [
  { key: 'purchasePrice', label: 'Kaufpreis', color: '#93c5fd' },
  { key: 'sideCosts', label: 'Kaufnebenkosten', color: '#94a3b8' },
  { key: 'renovation', label: 'Sanierung', color: '#fbbf24' },
  { key: 'interest', label: 'Zinskosten', color: '#f87171' },
] as const;

export function CostBreakdownChart({ property, metrics }: Props) {
  const sideCosts =
    property.purchasePrice *
    ((property.propertyTransferTax + property.notaryFees + property.agentCommission) / 100);

  const rawData = [
    { key: 'purchasePrice', value: property.purchasePrice },
    { key: 'sideCosts', value: sideCosts },
    { key: 'renovation', value: property.renovationCosts },
    { key: 'interest', value: metrics.totalInterestCosts },
  ] as const;

  const total = rawData.reduce((s, d) => s + d.value, 0) - metrics.kfwGrant;
  const data = rawData
    .map((d) => ({ ...d, color: SLICES.find((s) => s.key === d.key)!.color }))
    .filter((d) => d.value > 0);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="h-44 w-full sm:w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="55%"
              outerRadius="80%"
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatEur(value as number)}
              labelFormatter={(_, payload) =>
                SLICES.find((s) => s.key === payload?.[0]?.payload?.key)?.label ?? ''
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col gap-1.5 flex-1 text-sm">
        {SLICES.filter((s) => rawData.find((d) => d.key === s.key)!.value > 0).map((s) => {
          const value = rawData.find((d) => d.key === s.key)!.value;
          const pct = total > 0 ? (value / total) * 100 : 0;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="flex-1 text-slate-600">{s.label}</span>
              <span className="font-medium text-slate-800">{formatEur(value)}</span>
              <span className="w-10 text-right text-xs text-slate-400">{pct.toFixed(0)} %</span>
            </div>
          );
        })}
        {metrics.kfwGrant > 0 && (
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-green-400" />
            <span className="flex-1 text-green-700">KfW-Zuschuss</span>
            <span className="font-medium text-green-700">− {formatEur(metrics.kfwGrant)}</span>
            <span className="w-10" />
          </div>
        )}
        <div className="mt-1 flex items-center gap-2 border-t border-slate-200 pt-1.5">
          <span className="flex-1 font-semibold text-slate-700">Gesamt</span>
          <span className="font-bold text-slate-900">{formatEur(total)}</span>
          <span className="w-10" />
        </div>
      </div>
    </div>
  );
}
