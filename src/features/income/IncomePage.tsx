// Page Revenus : formulaire (ajout/édition) + liste avec actions.

import { useState } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import { IncomeForm } from './IncomeForm';
import { RowActions } from '../../components/RowActions';
import { formatCents, formatDate } from '../../lib/format/money';
import type { Income } from '../../core/models/income';

export function IncomePage() {
  const incomes = useFiscalStore((s) => s.incomes);
  const deleteIncome = useFiscalStore((s) => s.deleteIncome);
  const [editing, setEditing] = useState<Income | null>(null);

  const sorted = [...incomes].sort((a, b) => b.date.localeCompare(a.date));
  const total = incomes.reduce((sum, i) => sum + i.amountCents, 0);

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-5 py-8 lg:grid-cols-[360px_1fr]">
      <div>
        <IncomeForm
          editing={editing}
          onDone={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      </div>
      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="font-display text-2xl text-ardoise-900">Revenus {new Date().getFullYear()}</h1>
          <span className="font-display text-xl text-sapin-700 tabular-nums">{formatCents(total)}</span>
        </div>
        {sorted.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ardoise-200 p-8 text-center text-ardoise-500">
            Aucun revenu pour l'instant. Ajoutez-en un avec le formulaire.
          </p>
        ) : (
          <ul className="space-y-2">
            {sorted.map((i) => (
              <li
                key={i.id}
                className={`flex items-center justify-between rounded-lg border bg-white px-4 py-3 ${
                  editing?.id === i.id ? 'border-sapin-600 ring-1 ring-sapin-600/20' : 'border-ardoise-200'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-ardoise-900">{i.client || 'Revenu'}</p>
                  <p className="truncate text-sm text-ardoise-500">
                    {formatDate(i.date)}
                    {i.description ? ` · ${i.description}` : ''}
                    {i.gstQstCollected ? ' · TPS/TVQ perçue' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 pl-3">
                  <span className="font-medium tabular-nums text-ardoise-900">{formatCents(i.amountCents)}</span>
                  <RowActions onEdit={() => setEditing(i)} onDelete={() => void deleteIncome(i.id)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
