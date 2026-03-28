import { useMemo, useRef, useState } from 'react';
import type { AppState, ScenarioMetrics, YearlyData } from '../types';
import { calculateLoanSchedule, computeScenarioMetrics, formatEur } from '../utils/calculation';
import { CostBreakdownChart } from './CostBreakdownChart';
import { DebtProgressChart } from './DebtProgressChart';

interface Props {
  currentState: AppState;
  currentSchedule: YearlyData[];
  onAddSnapshot: (name: string) => void;
  onImportScenario: (file: File, onError: () => void) => void;
  onRemoveScenario: (id: string) => void;
}

type Direction = 'lower' | 'higher' | 'neutral';

interface MetricDef {
  label: string;
  key: keyof ScenarioMetrics;
  direction: Direction;
  format: (v: number, m: ScenarioMetrics) => string;
  sub?: (m: ScenarioMetrics) => string | undefined;
  compareKey?: keyof ScenarioMetrics; // key used for % calculation when different from display key
}

const METRICS: MetricDef[] = [
  { label: 'Gesamtbedarf', key: 'totalRequirement', direction: 'neutral', format: (v) => formatEur(v) },
  { label: 'Eigenkapital', key: 'equity', direction: 'neutral', format: (v) => formatEur(v) },
  { label: 'Monatliche Rate (Jahr 1)', key: 'totalMonthlyPaymentYear1', direction: 'lower', format: (v) => formatEur(v) },
  { label: 'Ø Monatliche Rate', key: 'avgMonthlyRate', direction: 'lower', format: (v) => formatEur(v) },
  { label: 'Max. Monatliche Rate', key: 'maxMonthlyRate', direction: 'lower', format: (v) => formatEur(v) },
  { label: 'Gesamte Zinskosten', key: 'totalInterestCosts', direction: 'lower', format: (v) => formatEur(v) },
  {
    label: 'Volltilgung',
    key: 'fullRepaymentAbsoluteYear',
    direction: 'lower',
    compareKey: 'fullRepaymentYear',
    format: (v, m) => (m.fullRepaymentYear > 0 ? `${v}` : '—'),
    sub: (m) =>
      m.fullRepaymentYear > 0
        ? `in ${m.fullRepaymentYear} Jahr${m.fullRepaymentYear !== 1 ? 'en' : ''}`
        : undefined,
  },
  { label: 'KfW-Zuschuss', key: 'kfwGrant', direction: 'higher', format: (v) => formatEur(v) },
];

function PctBadge({ current, other, direction }: { current: number; other: number; direction: Direction }) {
  if (direction === 'neutral' || current === 0 || other === 0) return null;
  const pct = ((other - current) / Math.abs(current)) * 100;
  if (Math.abs(pct) < 0.05) return null;

  const isGood = direction === 'lower' ? pct < 0 : pct > 0;
  const color = isGood ? 'text-green-600' : 'text-red-500';
  const sign = pct > 0 ? '+' : '';

  return (
    <span className={`text-xs font-normal opacity-75 ${color}`}>
      {sign}{pct.toFixed(1)} %
    </span>
  );
}

export function ComparisonTab({
  currentState,
  currentSchedule,
  onAddSnapshot,
  onImportScenario,
  onRemoveScenario,
}: Props) {
  const [draftName, setDraftName] = useState<string | null>(null);
  const [importError, setImportError] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentMetrics = useMemo(
    () =>
      computeScenarioMetrics(
        currentState.property,
        currentState.equityData.equity,
        currentState.loans,
        currentSchedule,
      ),
    [currentState.property, currentState.equityData, currentState.loans, currentSchedule],
  );

  const savedSchedulesAndMetrics = useMemo(
    () =>
      currentState.comparisonScenarios.map((sc) => {
        const schedule = calculateLoanSchedule(sc.loans);
        return { schedule, metrics: computeScenarioMetrics(sc.property, sc.equityData.equity, sc.loans, schedule) };
      }),
    [currentState.comparisonScenarios],
  );
  const savedMetrics = savedSchedulesAndMetrics.map((s) => s.metrics);
  const savedSchedules = savedSchedulesAndMetrics.map((s) => s.schedule);

  function toggleHidden(id: string) {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    if (draftName === null) return;
    onAddSnapshot(draftName);
    setDraftName(null);
  }

  const visibleScenarios = currentState.comparisonScenarios.filter((sc) => !hiddenIds.has(sc.id));
  const visibleMetrics = visibleScenarios.map(
    (sc) => savedMetrics[currentState.comparisonScenarios.indexOf(sc)],
  );
  const visibleSchedules = visibleScenarios.map(
    (sc) => savedSchedules[currentState.comparisonScenarios.indexOf(sc)],
  );

  const anyKfw = [currentMetrics, ...visibleMetrics].some((m) => m.kfwGrant > 0);
  const rows = anyKfw ? METRICS : METRICS.filter((m) => m.key !== 'kfwGrant');

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {draftName === null ? (
          <button
            onClick={() => setDraftName(currentState.name || '')}
            className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            Aktuelles Szenario merken
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Szenarioname"
              autoFocus
              className="rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setDraftName(null);
              }}
            />
            <button
              onClick={handleSave}
              className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              Speichern
            </button>
            <button
              onClick={() => setDraftName(null)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Abbrechen
            </button>
          </div>
        )}

        {draftName === null && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportError(false);
                onImportScenario(file, () => setImportError(true));
                e.target.value = '';
              }}
            />
            <button
              onClick={() => { setImportError(false); fileInputRef.current?.click(); }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Szenario laden
            </button>
          </>
        )}

        {importError && <span className="text-xs text-red-500">Ungültige Datei</span>}
      </div>

      {/* Saved scenario chips */}
      {currentState.comparisonScenarios.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">Szenarien:</span>
          {currentState.comparisonScenarios.map((sc) => {
            const hidden = hiddenIds.has(sc.id);
            return (
              <div
                key={sc.id}
                className={`flex items-center rounded-full border text-xs font-medium transition-colors ${
                  hidden
                    ? 'border-slate-200 bg-white text-slate-400'
                    : 'border-slate-300 bg-slate-100 text-slate-700'
                }`}
              >
                <button
                  onClick={() => toggleHidden(sc.id)}
                  className="pl-3 pr-2 py-1 opacity-60 hover:opacity-100"
                  title={hidden ? 'Einblenden' : 'Ausblenden'}
                >
                  {hidden ? '○' : '●'}
                </button>
                <span className="pr-2 py-1">{sc.name}</span>
                <span className="w-px self-stretch bg-slate-300" />
                <button
                  onClick={() => onRemoveScenario(sc.id)}
                  className="px-2.5 py-1 opacity-40 hover:opacity-80"
                  title="Entfernen"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400 w-40">
                Kennzahl
              </th>
              <th className="px-4 py-3 text-right">
                <div className="flex flex-col items-end gap-1">
                  <span className="break-words font-semibold text-slate-800">
                    {currentState.name || 'Aktuelles Szenario'}
                  </span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Aktuell
                  </span>
                </div>
              </th>
              {visibleScenarios.map((sc) => (
                <th key={sc.id} className="px-4 py-3 text-right">
                  <span className="break-words font-semibold text-slate-800">{sc.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.key} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-4 py-2.5 text-xs text-slate-500">{row.label}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                  {row.format(currentMetrics[row.key] as number, currentMetrics)}
                  {row.sub?.(currentMetrics) && (
                    <div className="text-xs font-normal text-slate-400">{row.sub(currentMetrics)}</div>
                  )}
                </td>
                {visibleMetrics.map((m, j) => {
                  const compareKey = row.compareKey ?? row.key;
                  const currentVal = currentMetrics[compareKey] as number;
                  const otherVal = m[compareKey] as number;
                  return (
                    <td key={visibleScenarios[j].id} className="px-4 py-2.5 text-right font-semibold text-slate-800">
                      <div className="flex flex-col items-end gap-0.5">
                        <span>{row.format(m[row.key] as number, m)}</span>
                        {row.sub?.(m) && (
                          <span className="text-xs font-normal text-slate-400">{row.sub(m)}</span>
                        )}
                        <PctBadge current={currentVal} other={otherVal} direction={row.direction} />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cost breakdown charts */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {currentState.name || 'Aktuelles Szenario'}
            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 normal-case font-medium text-blue-700">Aktuell</span>
          </p>
          <CostBreakdownChart property={currentState.property} metrics={currentMetrics} />
        </div>
        {visibleScenarios.map((sc, i) => (
          <div key={sc.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{sc.name}</p>
            <CostBreakdownChart property={sc.property} metrics={visibleMetrics[i]} />
          </div>
        ))}
      </div>

      {/* Debt progress chart */}
      <DebtProgressChart
        scenarios={[
          { name: currentState.name || 'Aktuelles Szenario', schedule: currentSchedule, isCurrent: true },
          ...visibleScenarios.map((sc, i) => ({ name: sc.name, schedule: visibleSchedules[i] })),
        ]}
      />
    </div>
  );
}
