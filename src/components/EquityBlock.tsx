import type { EquityData, PropertyData } from '../types';
import { formatEur } from '../utils/calculation';

interface Props {
  equityData: EquityData;
  property: PropertyData;
  onChange: (e: EquityData) => void;
}

export function EquityBlock({ equityData, property, onChange }: Props) {
  const purchaseSideCosts =
    property.purchasePrice *
    ((property.propertyTransferTax + property.notaryFees + property.agentCommission) / 100);
  const totalRequirement = property.purchasePrice + purchaseSideCosts + property.renovationCosts;
  const financingRequirement = totalRequirement - equityData.equity;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Eigenkapital</h2>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Eingesetztes Eigenkapital</label>
          <div className="relative flex items-center">
            <input
              type="number"
              value={equityData.equity || ''}
              step={1000}
              onChange={(e) => onChange({ equity: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="absolute right-3 text-sm text-slate-400">€</span>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-sm text-slate-600">Finanzierungsbedarf</span>
          <span
            className={`font-semibold ${financingRequirement < 0 ? 'text-green-600' : 'text-slate-800'}`}
          >
            {formatEur(financingRequirement)}
          </span>
        </div>
      </div>
    </div>
  );
}
