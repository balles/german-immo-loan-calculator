import type { PropertyData } from '../types';
import { formatEur } from '../utils/calculation';

interface Props {
  property: PropertyData;
  onChange: (p: PropertyData) => void;
}

function NumInput({
  label,
  value,
  onChange,
  suffix = '€',
  step = 1000,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative flex items-center">
        <input
          type="number"
          value={value || ''}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="absolute right-3 text-sm text-slate-400">{suffix}</span>
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function ReadonlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

export function PropertyBlock({ property, onChange }: Props) {
  const purchaseSideCosts =
    property.purchasePrice *
    ((property.propertyTransferTax + property.notaryFees + property.agentCommission) / 100);
  const totalRequirement = property.purchasePrice + purchaseSideCosts + property.renovationCosts;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Objekt</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumInput
          label="Kaufpreis"
          value={property.purchasePrice}
          onChange={(v) => onChange({ ...property, purchasePrice: v })}
        />
        <NumInput
          label="Grunderwerbsteuer"
          value={property.propertyTransferTax}
          onChange={(v) => onChange({ ...property, propertyTransferTax: v })}
          suffix="%"
          step={0.1}
          hint="Default: 3,5 % (Bayern)"
        />
        <NumInput
          label="Notar & Grundbuch"
          value={property.notaryFees}
          onChange={(v) => onChange({ ...property, notaryFees: v })}
          suffix="%"
          step={0.1}
          hint="Default: 2,0 %"
        />
        <NumInput
          label="Maklerprovision"
          value={property.agentCommission}
          onChange={(v) => onChange({ ...property, agentCommission: v })}
          suffix="%"
          step={0.1}
          hint="Optional, Default: 0 %"
        />
        <NumInput
          label="Sanierungskosten"
          value={property.renovationCosts}
          onChange={(v) => onChange({ ...property, renovationCosts: v })}
        />
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <ReadonlyRow label="Kaufnebenkosten" value={formatEur(purchaseSideCosts)} />
        <ReadonlyRow label="Gesamtbedarf" value={formatEur(totalRequirement)} />
      </div>
    </div>
  );
}
