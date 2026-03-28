import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { YearlyData, Loan } from '../types';
import { formatEur } from '../utils/calculation';

// Color palette per loan (light = repayment, dark = interest)
const LOAN_COLORS = [
  { repayment: '#93c5fd', interest: '#2563eb' },
  { repayment: '#6ee7b7', interest: '#059669' },
  { repayment: '#fca5a5', interest: '#dc2626' },
  { repayment: '#fcd34d', interest: '#d97706' },
  { repayment: '#c4b5fd', interest: '#7c3aed' },
  { repayment: '#f9a8d4', interest: '#db2777' },
];

interface Props {
  schedule: YearlyData[];
  loans: Loan[];
}

function MonthlyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  const interestTotal = payload
    .filter((p) => p.name?.startsWith('Zins'))
    .reduce((s, p) => s + (p.value || 0), 0);
  const repaymentTotal = payload
    .filter((p) => p.name?.startsWith('Tilgung'))
    .reduce((s, p) => s + (p.value || 0), 0);
  const gesamtbelastung = interestTotal + repaymentTotal;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs">
      <p className="mb-2 font-semibold text-slate-800">Jahr {label}</p>
      <div className="flex flex-col gap-1">
        {payload.map(
          (p, i) =>
            p.value > 0 && (
              <div key={i} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                <span className="text-slate-600">{p.name}:</span>
                <span className="font-medium">{formatEur(p.value)}/Mon</span>
              </div>
            ),
        )}
        <div className="mt-1 flex flex-col gap-0.5 border-t border-slate-100 pt-1">
          <div className="flex justify-between gap-4 text-slate-500">
            <span>Zins gesamt:</span>
            <span>{formatEur(interestTotal)}/Mon</span>
          </div>
          <div className="flex justify-between gap-4 text-slate-500">
            <span>Tilgung gesamt:</span>
            <span>{formatEur(repaymentTotal)}/Mon</span>
          </div>
          <div className="mt-1 flex justify-between gap-4 border-t border-slate-100 pt-1 font-semibold text-slate-800">
            <span>Gesamtbelastung:</span>
            <span>{formatEur(gesamtbelastung)}/Mon</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function YearlyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  const regular = payload.find((p) => p.name === 'Raten')?.value ?? 0;
  const extra = payload.find((p) => p.name === 'Sondertilgung')?.value ?? 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs">
      <p className="mb-2 font-semibold text-slate-800">Jahr {label}</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          <span className="text-slate-600">Raten:</span>
          <span className="font-medium">{formatEur(regular)}</span>
        </div>
        {extra > 0 && (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-slate-600">Sondertilgung:</span>
            <span className="font-medium">{formatEur(extra)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between gap-4 border-t border-slate-100 pt-1 font-semibold text-slate-800">
          <span>Gesamtbelastung:</span>
          <span>{formatEur(regular + extra)}</span>
        </div>
      </div>
    </div>
  );
}

export function AmortizationChart({ schedule, loans }: Props) {
  if (schedule.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">
        Noch keine Daten — bitte Kredite eingeben.
      </div>
    );
  }

  const fixedRatePeriodEnds: { year: number; label: string }[] = [];
  for (const yearData of schedule) {
    for (const ld of yearData.loanData) {
      if (ld.fixedRatePeriodEnd && !ld.isFullyRepaid) {
        fixedRatePeriodEnds.push({ year: yearData.year, label: `Ende Zinsbindung ${ld.name}` });
      }
    }
  }

  // Monthly breakdown chart data
  const monthlyChartData = schedule.map((y) => {
    const entry: Record<string, number> = { year: y.year };
    loans.forEach((loan) => {
      const ld = y.loanData.find((d) => d.loanId === loan.id);
      entry[`Tilgung_${loan.id}`] = (ld?.repaymentPortion ?? 0) / 12;
      entry[`Zins_${loan.id}`] = (ld?.interestPortion ?? 0) / 12;
    });
    return entry;
  });

  // Yearly total burden chart data
  const yearlyChartData = schedule.map((y) => ({
    year: y.year,
    Raten: y.totalInterest + y.totalRepayment,
    Sondertilgung: y.totalExtraPayment,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Chart 1: Monthly breakdown per loan */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-slate-700">Monatliche Belastung nach Jahr</h3>
        <p className="mb-4 text-xs text-slate-400">
          Gestapelt: Zinsanteil (dunkel) + Tilgungsanteil (hell) je Kredit
        </p>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={monthlyChartData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11 }}
              label={{ value: 'Jahr', position: 'insideBottom', offset: -5, fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) => `${Math.round(v).toLocaleString('de-DE')} €`}
              tick={{ fontSize: 10 }}
              width={80}
            />
            <Tooltip content={<MonthlyTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 16 }} />

            {fixedRatePeriodEnds.map((end, i) => (
              <ReferenceLine
                key={i}
                x={end.year}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{
                  value: end.label,
                  angle: -90,
                  position: 'insideTopRight',
                  fontSize: 9,
                  fill: '#64748b',
                }}
              />
            ))}

            {loans.map((loan, idx) => {
              const colors = LOAN_COLORS[idx % LOAN_COLORS.length];
              return [
                <Bar
                  key={`repayment-${loan.id}`}
                  dataKey={`Tilgung_${loan.id}`}
                  name={`Tilgung ${loan.name}`}
                  stackId="a"
                  fill={colors.repayment}
                  isAnimationActive={false}
                />,
                <Bar
                  key={`interest-${loan.id}`}
                  dataKey={`Zins_${loan.id}`}
                  name={`Zins ${loan.name}`}
                  stackId="a"
                  fill={colors.interest}
                  isAnimationActive={false}
                />,
              ];
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: Yearly total burden incl. extra payments */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-slate-700">Jährliche Gesamtbelastung</h3>
        <p className="mb-4 text-xs text-slate-400">
          Raten (Zins + Tilgung) + Sondertilgungen pro Jahr
        </p>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={yearlyChartData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11 }}
              label={{ value: 'Jahr', position: 'insideBottom', offset: -5, fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) => `${Math.round(v).toLocaleString('de-DE')} €`}
              tick={{ fontSize: 10 }}
              width={80}
            />
            <Tooltip content={<YearlyTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 16 }} />

            {fixedRatePeriodEnds.map((end, i) => (
              <ReferenceLine
                key={i}
                x={end.year}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{
                  value: end.label,
                  angle: -90,
                  position: 'insideTopRight',
                  fontSize: 9,
                  fill: '#64748b',
                }}
              />
            ))}

            <Bar dataKey="Raten" stackId="a" fill="#93c5fd" isAnimationActive={false} />
            <Bar dataKey="Sondertilgung" stackId="a" fill="#fbbf24" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Restschuldverlauf line chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-slate-700">Restschuldverlauf</h3>
        <p className="mb-4 text-xs text-slate-400">Restschuld je Kredit und gesamt</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={schedule.map((y) => {
              const entry: Record<string, number> = { year: y.year, Gesamt: y.totalRemainingDebt };
              loans.forEach((l) => {
                const ld = y.loanData.find((d) => d.loanId === l.id);
                entry[l.name] = ld?.remainingDebt ?? 0;
              });
              return entry;
            })}
            margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11 }}
              label={{ value: 'Jahr', position: 'insideBottom', offset: -5, fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) => `${Math.round(v / 1000)}k €`}
              tick={{ fontSize: 10 }}
              width={70}
            />
            <Tooltip
              formatter={(value, name) => [formatEur(value as number), name]}
              labelFormatter={(label) => `Jahr ${label}`}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 16 }} />
            {loans.map((loan, idx) => (
              <Line
                key={loan.id}
                dataKey={loan.name}
                stroke={LOAN_COLORS[idx % LOAN_COLORS.length].interest}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                isAnimationActive={false}
              />
            ))}
            <Line
              dataKey="Gesamt"
              stroke="#475569"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Remaining debt table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <details>
          <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
            Restschuld-Verlauf anzeigen
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-1 text-left text-slate-500">Jahr</th>
                  {loans.map((l) => (
                    <th key={l.id} className="pb-1 text-right text-slate-500">
                      {l.name}
                    </th>
                  ))}
                  <th className="pb-1 text-right font-semibold text-slate-700">Gesamt</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((y) => (
                  <tr key={y.year} className="border-b border-slate-100">
                    <td className="py-0.5 text-slate-600">{y.year}</td>
                    {loans.map((l) => {
                      const ld = y.loanData.find((d) => d.loanId === l.id);
                      return (
                        <td key={l.id} className="py-0.5 text-right text-slate-600">
                          {formatEur(ld?.remainingDebt ?? 0)}
                        </td>
                      );
                    })}
                    <td className="py-0.5 text-right font-medium text-slate-800">
                      {formatEur(y.totalRemainingDebt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}
