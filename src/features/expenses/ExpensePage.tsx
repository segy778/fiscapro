// Page Dépenses : formulaire (ajout/édition) + liste avec actions.

import { useState } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import { ExpenseForm } from './ExpenseForm';
import { ReceiptThumbnail } from './ReceiptThumbnail';
import { RowActions } from '../../components/RowActions';
import { formatCents, formatDate } from '../../lib/format/money';
import { loadFiscalConfig } from '../../core/tax/loadConfig';
import type { Expense } from '../../core/models/income';

const config = loadFiscalConfig(2026);

function categoryLabel(key: string): string {
  return config.expenseCategories[key]?.label ?? key;
}

export function ExpensePage() {
  const expenses = useFiscalStore((s) => s.expenses);
  const deleteExpense = useFiscalStore((s) => s.deleteExpense);
  const [editing, setEditing] = useState<Expense | null>(null);

  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  const total = expenses.reduce((sum, e) => sum + e.amountCents, 0);

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-5 py-8 lg:grid-cols-[360px_1fr]">
      <div>
        <ExpenseForm
          editing={editing}
          onDone={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      </div>
      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="font-display text-2xl text-ardoise-900">Dépenses {new Date().getFullYear()}</h1>
          <span className="font-display text-xl text-ambre-700 tabular-nums">{formatCents(total)}</span>
        </div>
        {sorted.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ardoise-200 p-8 text-center text-ardoise-500">
            Aucune dépense pour l'instant. Ajoutez-en une avec le formulaire.
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
                <div className="flex min-w-0 items-center gap-3">
                  {e.receiptImageId && <ReceiptThumbnail imageId={e.receiptImageId} />}
                  <div className="min-w-0">
                    <p className="font-medium text-ardoise-900">{categoryLabel(e.category)}</p>
                    <p className="truncate text-sm text-ardoise-500">
                      {formatDate(e.date)}
                      {e.description ? ` · ${e.description}` : ''}
                      {` · ${Math.round(e.deductiblePercent * 100)} % déduct.`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-3">
                  <span className="font-medium tabular-nums text-ardoise-900">{formatCents(e.amountCents)}</span>
                  <RowActions onEdit={() => setEditing(e)} onDelete={() => void deleteExpense(e.id)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
