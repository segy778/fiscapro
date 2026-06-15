// Section « Frais de véhicule » : formulaire + liste des frais individuels,
// avec le total et la portion déductible selon le ratio d'usage.

import { useState } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import { VehicleExpenseForm } from './VehicleExpenseForm';
import { AnnualTotalsPanel } from './AnnualTotalsPanel';
import { RowActions } from '../../components/RowActions';
import { formatCents, formatDate } from '../../lib/format/money';
import {
  summarizeKm,
  totalVehicleExpenses,
  deductibleVehicleExpenses,
} from '../../core/tax/vehicleCalc';
import type { VehicleExpense, VehicleExpenseKind } from '../../core/models/vehicle';

const KIND_LABELS: Record<VehicleExpenseKind, string> = {
  essence: 'Essence / carburant',
  entretien: 'Entretien',
  assurance: 'Assurance',
  immatriculation: 'Immatriculation',
  autre: 'Autre',
};

export function VehicleExpensesSection() {
  const vehicle = useFiscalStore((s) => s.vehicle);
  const trips = useFiscalStore((s) => s.trips);
  const deleteVehicleExpense = useFiscalStore((s) => s.deleteVehicleExpense);
  const [editing, setEditing] = useState<VehicleExpense | null>(null);

  const sorted = [...vehicle.expenses].sort((a, b) => b.date.localeCompare(a.date));
  const total = totalVehicleExpenses(vehicle);
  const deductible = deductibleVehicleExpenses(vehicle, trips);
  const ratioPct = (summarizeKm(trips).businessRatio * 100).toFixed(0);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div>
        <VehicleExpenseForm
          editing={editing}
          onDone={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
        <div className="mt-6">
          <AnnualTotalsPanel />
        </div>
      </div>
      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-ardoise-900">Frais de véhicule</h2>
          <div className="text-right">
            <p className="font-display text-xl text-ardoise-900 tabular-nums">{formatCents(total)}</p>
            <p className="text-sm text-sapin-700">
              dont {formatCents(deductible)} déductibles ({ratioPct} %)
            </p>
          </div>
        </div>
        {sorted.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ardoise-200 p-8 text-center text-ardoise-500">
            Aucun frais de véhicule pour l'instant. Ajoutez-en un avec le formulaire.
          </p>
        ) : (
          <ul className="space-y-2">
            {sorted.map((e) => (
              <li
                key={e.id}
                className={`flex items-center justify-between rounded-lg border bg-white px-4 py-3 ${
                  editing?.id === e.id ? 'border-sapin-600 ring-1 ring-sapin-600/20' : 'border-ardoise-200'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-ardoise-900">{KIND_LABELS[e.kind]}</p>
                  <p className="truncate text-sm text-ardoise-500">
                    {formatDate(e.date)}
                    {e.description ? ` · ${e.description}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 pl-3">
                  <span className="font-medium tabular-nums text-ardoise-900">{formatCents(e.amountCents)}</span>
                  <RowActions onEdit={() => setEditing(e)} onDelete={() => void deleteVehicleExpense(e.id)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
