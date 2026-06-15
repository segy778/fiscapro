// Panneau de saisie des totaux annuels par type de frais de véhicule.
// Niveau de saisie « raccourci » : un montant global par type, qui s'AJOUTE
// aux frais individuels lors du calcul.

import { useState, useEffect } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import { Field, TextInput, SelectInput, Button } from '../../components/FormField';
import { parseDollarsToCents } from '../../lib/format/parseMoney';
import { centsToDollars, formatCents } from '../../lib/format/money';
import type { VehicleExpenseKind } from '../../core/models/vehicle';

const KIND_OPTIONS: { value: VehicleExpenseKind; label: string }[] = [
  { value: 'essence', label: 'Essence / carburant' },
  { value: 'entretien', label: 'Entretien' },
  { value: 'assurance', label: 'Assurance' },
  { value: 'immatriculation', label: 'Immatriculation' },
  { value: 'autre', label: 'Autre' },
];

function labelFor(kind: VehicleExpenseKind): string {
  return KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;
}

export function AnnualTotalsPanel() {
  const vehicle = useFiscalStore((s) => s.vehicle);
  const setVehicleAnnualTotal = useFiscalStore((s) => s.setVehicleAnnualTotal);

  const [kind, setKind] = useState<VehicleExpenseKind>('essence');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pré-remplir avec le total existant pour le type sélectionné.
  useEffect(() => {
    const existing = vehicle.annualTotals?.[kind];
    setAmount(existing ? String(centsToDollars(existing)).replace('.', ',') : '');
    setError(null);
  }, [kind, vehicle.annualTotals]);

  const handleSave = async () => {
    const cents = parseDollarsToCents(amount);
    if (cents === null || cents < 0) {
      setError('Entrez un montant valide (ex. 1 200,00), ou 0 pour retirer.');
      return;
    }
    setError(null);
    setSaving(true);
    await setVehicleAnnualTotal(kind, cents);
    setSaving(false);
  };

  const handleRemove = async (k: VehicleExpenseKind) => {
    await setVehicleAnnualTotal(k, 0);
  };

  const totals = vehicle.annualTotals ?? {};
  const hasTotals = Object.keys(totals).length > 0;

  return (
    <div className="rounded-xl border border-ardoise-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 font-display text-xl text-ardoise-900">Totaux annuels</h2>
      <p className="mb-4 text-xs text-ardoise-500">
        Raccourci : un montant global par type, si vous ne saisissez pas chaque
        frais un par un. Ce montant <span className="font-medium">s'ajoute</span> aux
        frais individuels — n'inscrivez pas deux fois la même dépense.
      </p>

      <Field label="Type de frais" htmlFor="at-kind">
        <SelectInput
          id="at-kind"
          value={kind}
          onChange={(v) => setKind(v as VehicleExpenseKind)}
          options={KIND_OPTIONS}
        />
      </Field>

      <Field label="Total annuel" htmlFor="at-amount" hint="En dollars. Mettez 0 pour retirer ce total.">
        <TextInput id="at-amount" value={amount} onChange={setAmount} inputMode="decimal" placeholder="0,00" />
      </Field>

      {error && <p className="mb-3 text-sm text-ambre-700">{error}</p>}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Enregistrement…' : 'Enregistrer le total'}
      </Button>

      {hasTotals && (
        <div className="mt-5 border-t border-ardoise-200 pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ardoise-500">
            Totaux annuels enregistrés
          </p>
          <ul className="space-y-1.5 text-sm">
            {(Object.keys(totals) as VehicleExpenseKind[]).map((k) => (
              <li key={k} className="flex items-center justify-between">
                <span className="text-ardoise-700">{labelFor(k)}</span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums text-ardoise-900">{formatCents(totals[k] ?? 0)}</span>
                  <button
                    onClick={() => void handleRemove(k)}
                    className="rounded px-2 py-0.5 text-xs text-ardoise-500 hover:bg-red-50 hover:text-red-700"
                  >
                    Retirer
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
