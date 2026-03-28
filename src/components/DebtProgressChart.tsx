import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { YearlyData } from '../types';
import { formatEur } from '../utils/calculation';

interface ScenarioSeries {
  name: string;
  schedule: YearlyData[];
  isCurrent?: boolean;
}

interface Props {
  scenarios: ScenarioSeries[];
}

const COLORS = ['#2563eb', '#059669', '#dc2626', '#d97706', '#7c3aed', '#db2777'];

export function DebtProgressChart({ scenarios }: Props) {
  if (scenarios.every((s) => s.schedule.length === 0)) return null;

  const maxYear = Math.max(...scenarios.map((s) => s.schedule.at(-1)?.year ?? 0));

  const chartData: Record<string, number>[] = [];
  for (let y = 1; y <= maxYear; y++) {
    const entry: Record<string, number> = { year: y };
    for (const sc of scenarios) {
      const yearData = sc.schedule.find((d) => d.year === y);
      entry[sc.name] = yearData?.totalRemainingDebt ?? 0;
    }
    chartData.push(entry);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold text-slate-700">Restschuldverlauf</h3>
      <p className="mb-4 text-xs text-slate-400">Gesamte Restschuld aller Kredite pro Jahr</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
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
          {scenarios.map((sc, i) => (
            <Line
              key={sc.name}
              dataKey={sc.name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={sc.isCurrent ? 2.5 : 1.5}
              strokeDasharray={sc.isCurrent ? undefined : '5 3'}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
