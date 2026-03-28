import { useState, useMemo, useRef, useEffect } from 'react';
import type { AppState } from './types';
import { calculateLoanSchedule } from './utils/calculation';
import { PropertyBlock } from './components/PropertyBlock';
import { EquityBlock } from './components/EquityBlock';
import { LoansBlock } from './components/LoansBlock';
import { MetricsHeader } from './components/MetricsHeader';
import { AmortizationChart } from './components/AmortizationChart';
import { APP_VERSION, STATE_VERSION } from './version';
import { ImportedStateSchema } from './utils/schemas';

const INITIAL_STATE: AppState = {
  name: '',
  property: {
    purchasePrice: 0,
    propertyTransferTax: 3.5,
    notaryFees: 2.0,
    agentCommission: 0,
    renovationCosts: 0,
  },
  equityData: { equity: 0 },
  loans: [],
  activeTab: 'input',
};

function exportPlan(state: AppState) {
  const payload = {
    version: STATE_VERSION,
    name: state.name,
    property: state.property,
    equityData: state.equityData,
    loans: state.loans,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const slug = state.name.trim()
    ? state.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    : 'finanzierungsplan';
  a.download = `${slug}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importPlan(file: File, onSuccess: (state: Partial<AppState>) => void, onError: () => void) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target?.result as string);
      if (!parsed.property || !parsed.equityData || !Array.isArray(parsed.loans)) {
        onError();
        return;
      }
      const result = ImportedStateSchema.safeParse(migrateState(parsed));
      if (!result.success) {
        console.warn('Import validation failed:', result.error.flatten());
        onError();
        return;
      }
      onSuccess(result.data);
    } catch {
      onError();
    }
  };
  reader.readAsText(file);
}

const STORAGE_KEY = 'immo-plan';

// ---------------------------------------------------------------------------
// State migrations — add a new case for each STATE_VERSION bump
// ---------------------------------------------------------------------------
function migrateState(parsed: Record<string, unknown>): Record<string, unknown> {
  const version = (parsed.version as number) ?? 0;

  // v0 → v1: add extraPaymentMaxPercent, scheduledExtraPayments, startYear to loans
  if (version < 1) {
    parsed.loans = (parsed.loans as Record<string, unknown>[]).map((l) => ({
      ...l,
      extraPaymentMaxPercent: l.extraPaymentMaxPercent ?? 0,
      scheduledExtraPayments: l.scheduledExtraPayments ?? [],
      startYear: l.startYear ?? 1,
    }));
  }

  // future: if (version < 2) { ... }

  parsed.version = STATE_VERSION;
  return parsed;
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const json = JSON.parse(raw);
    const result = ImportedStateSchema.safeParse(migrateState(json));
    if (!result.success) {
      console.warn('Stored state failed validation, resetting.', result.error.flatten());
      return INITIAL_STATE;
    }
    return { ...INITIAL_STATE, ...result.data };
  } catch {
    return INITIAL_STATE;
  }
}

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [importError, setImportError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const purchaseSideCosts =
    state.property.purchasePrice *
    ((state.property.propertyTransferTax +
      state.property.notaryFees +
      state.property.agentCommission) /
      100);
  const totalRequirement =
    state.property.purchasePrice + purchaseSideCosts + state.property.renovationCosts;
  const financingRequirement = totalRequirement - state.equityData.equity;

  const schedule = useMemo(() => calculateLoanSchedule(state.loans), [state.loans]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-slate-800">
              Immobilien-Finanzierungsrechner
              <span className="ml-2 text-xs font-normal text-slate-400">v{APP_VERSION}</span>
            </h1>
            <input
              type="text"
              value={state.name}
              placeholder="Planname (z.B. Szenario A)"
              onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
              className="w-64 rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600 placeholder-slate-300 focus:border-blue-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            {importError && (
              <span className="text-xs text-red-500">Ungültige Datei</span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportError(false);
                importPlan(
                  file,
                  (parsed) => setState((s) => ({ ...s, ...parsed, activeTab: 'input' })),
                  () => setImportError(true),
                );
                e.target.value = '';
              }}
            />
            <button
              onClick={() => { setImportError(false); fileInputRef.current?.click(); }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Importieren
            </button>
            <button
              onClick={() => exportPlan(state)}
              className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              Exportieren
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4">
          <nav className="flex gap-1">
            {(['input', 'evaluation'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setState((s) => ({ ...s, activeTab: tab }))}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  state.activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'input' ? 'Eingabe' : 'Auswertung'}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {state.activeTab === 'input' ? (
          <div className="flex flex-col gap-6">
            <PropertyBlock
              property={state.property}
              onChange={(property) => setState((s) => ({ ...s, property }))}
            />
            <EquityBlock
              equityData={state.equityData}
              property={state.property}
              onChange={(equityData) => setState((s) => ({ ...s, equityData }))}
            />
            <LoansBlock
              loans={state.loans}
              financingRequirement={financingRequirement}
              schedule={schedule}
              onChange={(loans) => setState((s) => ({ ...s, loans }))}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <MetricsHeader
              property={state.property}
              loans={state.loans}
              schedule={schedule}
            />
            <AmortizationChart schedule={schedule} loans={state.loans} />
          </div>
        )}
      </main>
    </div>
  );
}
