// Section « Trajets » : formulaire + liste des trajets avec résumé km.

import { useState } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import { TripForm } from './TripForm';
import { RowActions } from '../../components/RowActions';
import { formatDate, formatKm } from '../../lib/format/money';
import { summarizeKm } from '../../core/tax/vehicleCalc';
import type { Trip } from '../../core/models/vehicle';

export function TripsSection() {
  const trips = useFiscalStore((s) => s.trips);
  const deleteTrip = useFiscalStore((s) => s.deleteTrip);
  const [editing, setEditing] = useState<Trip | null>(null);

  const sorted = [...trips].sort((a, b) => b.date.localeCompare(a.date));
  const km = summarizeKm(trips);
  const ratioPct = (km.businessRatio * 100).toFixed(0);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div>
        <TripForm
          editing={editing}
          onDone={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      </div>
      <div>
        <h2 className="mb-4 font-display text-2xl text-ardoise-900">Trajets</h2>
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-ardoise-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-ardoise-500">Affaires</p>
            <p className="mt-1 font-display text-lg text-sapin-700">{formatKm(km.totalBusinessKm)}</p>
          </div>
          <div className="rounded-lg border border-ardoise-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-ardoise-500">Personnel</p>
            <p className="mt-1 font-display text-lg text-ardoise-700">{formatKm(km.totalPersonalKm)}</p>
          </div>
          <div className="rounded-lg border border-ardoise-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-ardoise-500">Ratio affaires</p>
            <p className="mt-1 font-display text-lg text-ardoise-900">{ratioPct} %</p>
          </div>
        </div>
        {sorted.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ardoise-200 p-8 text-center text-ardoise-500">
            Aucun trajet pour l'instant. Ajoutez-en un avec le formulaire.
          </p>
        ) : (
          <ul className="space-y-2">
            {sorted.map((t) => (
              <li
                key={t.id}
                className={`flex items-center justify-between rounded-lg border bg-white px-4 py-3 ${
                  editing?.id === t.id ? 'border-sapin-600 ring-1 ring-sapin-600/20' : 'border-ardoise-200'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-ardoise-900">{t.purpose || 'Trajet'}</p>
                  <p className="text-sm text-ardoise-500">{formatDate(t.date)}</p>
                </div>
                <div className="flex items-center gap-3 pl-3">
                  <div className="text-right text-sm">
                    <span className="font-medium text-sapin-700">{formatKm(t.businessKm)} aff.</span>
                    {t.personalKm ? <span className="text-ardoise-500"> · {formatKm(t.personalKm)} pers.</span> : null}
                  </div>
                  <RowActions onEdit={() => setEditing(t)} onDelete={() => void deleteTrip(t.id)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
