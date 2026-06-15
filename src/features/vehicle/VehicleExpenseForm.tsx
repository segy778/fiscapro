// Formulaire d'ajout OU de modification d'un frais de véhicule individuel.

import { useState, useEffect } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import { Field, TextInput, SelectInput, Button } from '../../components/FormField';
import { parseDollarsToCents } from '../../lib/format/parseMoney';
import { centsToDollars } from '../../lib/format/money';
import type { VehicleExpense, VehicleExpenseKind } from '../../core/models/vehicle';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const KIND_OPTIONS: { value: VehicleExpenseKind; label: string }[] = [
  { value: 'essence', label: 'Essence / carburant' },
  { value: 'entretien', label: 'Entretien' },
  { value: 'assurance', label: 'Assurance' },
  { value: 'immatriculation', label: 'Immatriculation' },
  { value: 'autre', label: 'Autre' },
];

interface VehicleExpenseFormProps {
  editing?: VehicleExpense | null;
  onDone?: () => void;
  onCancel?: () => void;
}

export function VehicleExpenseForm({ editing, onDone, onCancel }: VehicleExpenseFormProps) {
  const addVehicleExpense = useFiscalStore((s) => s.addVehicleExpense);
  const updateVehicleExpense = useFiscalStore((s) => s.updateVehicleExpense);
  const isEdit = !!editing;

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [kind, setKind] = useState<VehicleExpenseKind>('essence');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setAmount(String(centsToDollars(editing.amountCents)).replace('.', ','));
      setDate(editing.date);
      setKind(editing.kind);
      setDescription(editing.description ?? '');
    } else {
      setAmount('');
      setDate(today());
      setKind('essence');
      setDescription('');
    }
    setError(null);
  }, [editing]);

  const handleSave = async () => {
    const cents = parseDollarsToCents(amount);
    if (cents === null || cents <= 0) {
      setError('Entrez un montant valide (ex. 75,00).');
      return;
    }
    setError(null);
    setSaving(true);
    const expense: VehicleExpense = {
      id: editing?.id ?? crypto.randomUUID(),
      date,
      kind,
      amountCents: cents,
      description: description.trim() || undefined,
    };
    if (isEdit) {
      await updateVehicleExpense(expense);
    } else {
      await addVehicleExpense(expense);
    }
    setSaving(false);
    onDone?.();
  };

  return (
    <div className="rounded-xl border border-ardoise-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-display text-xl text-ardoise-900">
        {isEdit ? 'Modifier le frais' : 'Ajouter un frais de véhicule'}
      </h2>

      <Field label="Montant" htmlFor="ve-amount" hint="En dollars, ex. 75,00">
        <TextInput id="ve-amount" value={amount} onChange={setAmount} inputMode="decimal" placeholder="0,00" />
      </Field>

      <Field label="Date" htmlFor="ve-date">
        <TextInput id="ve-date" value={date} onChange={setDate} type="date" />
      </Field>

      <Field label="Type de frais" htmlFor="ve-kind">
        <SelectInput
          id="ve-kind"
          value={kind}
          onChange={(v) => setKind(v as VehicleExpenseKind)}
          options={KIND_OPTIONS}
        />
      </Field>

      <Field label="Description" htmlFor="ve-desc" hint="Optionnel">
        <TextInput id="ve-desc" value={description} onChange={setDescription} placeholder="Détail du frais" />
      </Field>

      <p className="mb-4 rounded-lg bg-ardoise-50 p-3 text-xs text-ardoise-500">
        La portion déductible de ce frais dépend de votre ratio d'usage commercial,
        calculé à partir de vos trajets (km d'affaires ÷ km totaux).
      </p>

      {error && <p className="mb-3 text-sm text-ambre-700">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Enregistrer le frais'}
        </Button>
        {isEdit && (
          <Button onClick={() => onCancel?.()} variant="ghost">
            Annuler
          </Button>
        )}
      </div>
    </div>
  );
}
